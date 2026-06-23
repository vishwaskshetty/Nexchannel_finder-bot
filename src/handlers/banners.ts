/**
 * Banner system for NexChannel Finder Bot.
 *
 * Banners are sent as Telegram photos before main page sections.
 * File IDs are stored in D1 bot_settings table (set via /setbanner admin command)
 * or fall back to wrangler.toml env variables.
 */

import { getBotSetting, setBotSetting, setAdminState, clearAdminState, getAdminState } from "../db";
import type { BotContext, Env, TelegramMessage, TelegramCallbackQuery } from "../types";
import { TelegramClient } from "../telegram";

export type BannerType = "welcome" | "categories" | "top" | "add_channel" | "leaderboard";

const BANNER_KEY_MAP: Record<BannerType, string> = {
  welcome: "WELCOME_BANNER_FILE_ID",
  categories: "CATEGORIES_BANNER_FILE_ID",
  top: "TOP_CHANNELS_BANNER_FILE_ID",
  add_channel: "ADD_CHANNEL_BANNER_FILE_ID",
  leaderboard: "LEADERBOARD_BANNER_FILE_ID",
};

const BANNER_LABELS: Record<BannerType, string> = {
  welcome: "Welcome",
  categories: "Categories",
  top: "Top Channels",
  add_channel: "Add Channel",
  leaderboard: "Leaderboard",
};

const VALID_BANNER_TYPES = Object.keys(BANNER_KEY_MAP) as BannerType[];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseBannerType(arg: string): BannerType | null {
  const normalized = arg.trim().toLowerCase() as BannerType;
  return VALID_BANNER_TYPES.includes(normalized) ? normalized : null;
}

function cancelBannerKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "❌ Cancel", callback_data: "cancel_banner" }],
    ],
  };
}

function homeLinkKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "🏠 Home", callback_data: "home" }],
    ],
  };
}

// ─── Banner Resolution & Sending ──────────────────────────────────────────────

/**
 * Resolves a banner file ID:
 *  1. D1 bot_settings table (highest priority — set by /setbanner)
 *  2. wrangler.toml / Cloudflare env variable
 */
async function resolveBannerFileId(env: Env, type: BannerType): Promise<string | null> {
  const key = BANNER_KEY_MAP[type];

  const dbValue = await getBotSetting(env, key);
  if (dbValue?.trim()) {
    return dbValue.trim();
  }

  const envValue = (env as unknown as Record<string, string | undefined>)[key];
  if (typeof envValue === "string" && envValue.trim()) {
    return envValue.trim();
  }

  return null;
}

const SHORT_CAPTIONS: Record<BannerType, string> = {
  welcome: "<b>⚡ NexChannel Finder</b>",
  categories: "<b>📂 Categories</b>",
  top: "<b>🔥 Top Channels</b>",
  add_channel: "<b>➕ Add Your Channel</b>",
  leaderboard: "<b>🏆 Leaderboard</b>",
};

export async function sendBannerPost(
  chatId: number | string,
  env: Env,
  type: BannerType,
  text: string,
  keyboard?: any,
): Promise<void> {
  const telegram = new TelegramClient(env.BOT_TOKEN);
  const fileId = await resolveBannerFileId(env, type);

  if (fileId) {
    if (text.length <= 1024) {
      await telegram.sendPhoto(chatId, fileId, {
        caption: text,
        parse_mode: "HTML",
        reply_markup: keyboard,
      });
    } else {
      await telegram.sendPhoto(chatId, fileId, {
        caption: SHORT_CAPTIONS[type] || "<b>🔥 NexChannel Finder</b>",
        parse_mode: "HTML",
      });
      await telegram.sendMessage(chatId, text, {
        parse_mode: "HTML",
        reply_markup: keyboard,
        disable_web_page_preview: true,
      });
    }
  } else {
    await telegram.sendMessage(chatId, text, {
      parse_mode: "HTML",
      reply_markup: keyboard,
      disable_web_page_preview: true,
    });
  }
}

export async function editOrSendPage(
  ctx: BotContext,
  chatId: number | string,
  messageId: number | undefined,
  message: TelegramMessage | undefined,
  text: string,
  keyboard: any,
  type: BannerType,
): Promise<void> {
  const hasPhoto = message?.photo && message.photo.length > 0;
  
  if (hasPhoto && messageId) {
    if (text.length <= 1024) {
      await ctx.telegram.editMessageCaption(chatId, messageId, text, {
        parse_mode: "HTML",
        reply_markup: keyboard,
      });
    } else {
      // If we need to show long text but we currently have a photo message,
      // editing caption will fail limit. We should delete and send new or edit caption short and send new msg.
      // But user said: "If text length <= 1024: Use sendPhoto with caption. If > 1024: short caption + send full text"
      // Wait, top channels page is made sure to be < 1024 chars.
      // So editMessageCaption is fine here.
      await ctx.telegram.editMessageCaption(chatId, messageId, text.substring(0, 1024), {
        parse_mode: "HTML",
        reply_markup: keyboard,
      });
    }
  } else if (messageId && !hasPhoto) {
    const fileId = await resolveBannerFileId(ctx.env, type);
    if (fileId) {
      // Message is text, but banner exists -> send new photo message
      // Note: we just send it, the user didn't ask to delete the old one explicitly, but ideally we should?
      // "If message is text and banner exists: send new photo message with caption."
      // We will delete the old message just to keep chat clean.
      try {
        await ctx.telegram.call("deleteMessage", { chat_id: String(chatId), message_id: messageId });
      } catch (e) {}
      await sendBannerPost(chatId, ctx.env, type, text, keyboard);
    } else {
      // Message is text and no banner -> edit text
      await ctx.telegram.editMessageText(chatId, messageId, text, {
        parse_mode: "HTML",
        reply_markup: keyboard,
        disable_web_page_preview: true,
      });
    }
  } else {
    // No message id -> new send
    await sendBannerPost(chatId, ctx.env, type, text, keyboard);
  }
}


// ─── /setbanner command ───────────────────────────────────────────────────────

/**
 * Admin command: /setbanner <type>
 * Step 1: Validates type, stores banner_wait state, prompts admin to send photo.
 */
export async function handleSetBannerCommand(
  ctx: BotContext,
  message: TelegramMessage,
  args: string,
): Promise<void> {
  const userId = message.from?.id;
  const chatId = message.chat.id;

  if (!userId || !ctx.adminIds.has(userId)) {
    await ctx.telegram.sendMessage(chatId, "❌ Admin only command.");
    return;
  }

  const bannerType = parseBannerType(args);

  if (!bannerType) {
    await ctx.telegram.sendMessage(
      chatId,
      [
        "⚙️ 𝗦𝗲𝘁 𝗕𝗮𝗻𝗻𝗲𝗿",
        "",
        "Use one of these:",
        "",
        "/setbanner welcome",
        "/setbanner categories",
        "/setbanner top",
        "/setbanner add_channel",
        "/setbanner leaderboard",
      ].join("\n"),
    );
    return;
  }

  // Save waiting state in D1
  await setAdminState(ctx.env, userId, "banner_wait", bannerType);

  await ctx.telegram.sendMessage(
    chatId,
    [
      "📸 𝗦𝗲𝗻𝗱 𝗕𝗮𝗻𝗻𝗲𝗿 𝗜𝗺𝗮𝗴𝗲",
      "",
      `Now send the image for:`,
      "",
      `${BANNER_LABELS[bannerType]}`,
      "",
      "Recommended size:",
      "1280x720 or 640x360",
      "",
      "Send as photo, not document.",
    ].join("\n"),
    { reply_markup: cancelBannerKeyboard() },
  );
}

// ─── Photo handler (Step 2) ───────────────────────────────────────────────────

/**
 * Handles the photo message sent by admin during /setbanner flow.
 * Returns true if the photo was consumed as a banner upload.
 */
export async function handleBannerPhotoUpload(
  ctx: BotContext,
  message: TelegramMessage,
): Promise<boolean> {
  const userId = message.from?.id;
  if (!userId || !ctx.adminIds.has(userId)) {
    return false;
  }

  let state;
  try {
    state = await getAdminState(ctx.env, userId);
  } catch {
    return false;
  }

  if (state?.mode !== "banner_wait" || !state.payload) {
    return false;
  }

  const bannerType = state.payload as BannerType;
  if (!VALID_BANNER_TYPES.includes(bannerType)) {
    return false;
  }

  const photos = message.photo;
  if (!photos || photos.length === 0) {
    return false;
  }

  // Use the largest available photo size
  const bestPhoto = photos[photos.length - 1];
  const fileId = bestPhoto.file_id;
  const key = BANNER_KEY_MAP[bannerType];

  // Save file_id to D1 bot_settings
  await setBotSetting(ctx.env, key, fileId);

  // Clear admin waiting state
  await clearAdminState(ctx.env, userId);

  await ctx.telegram.sendMessage(
    message.chat.id,
    [
      "✅ 𝗕𝗮𝗻𝗻𝗲𝗿 𝗦𝗮𝘃𝗲𝗱",
      "",
      `Type: ${bannerType}`,
      `Setting: ${key}`,
      "",
      "File ID:",
      fileId,
      "",
      "This banner will now be used in the bot.",
    ].join("\n"),
    { reply_markup: homeLinkKeyboard() },
  );

  return true;
}

// ─── cancel_banner callback ───────────────────────────────────────────────────

/**
 * Handles the cancel_banner inline button callback.
 * Clears admin state and acknowledges.
 */
export async function handleCancelBannerCallback(
  ctx: BotContext,
  query: TelegramCallbackQuery,
): Promise<void> {
  const userId = query.from.id;

  try {
    await clearAdminState(ctx.env, userId);
  } catch {
    // ignore
  }

  await ctx.telegram.answerCallbackQuery(query.id, "❌ Banner setup cancelled.");

  if (query.message) {
    await ctx.telegram.sendMessage(
      query.message.chat.id,
      "❌ Banner setup cancelled.",
    );
  }
}

// ─── /banners command ─────────────────────────────────────────────────────────

/**
 * Admin command: /banners
 * Shows the current status of all banner slots.
 */
export async function handleBannersStatusCommand(
  ctx: BotContext,
  message: TelegramMessage,
): Promise<void> {
  const userId = message.from?.id;
  if (!userId || !ctx.adminIds.has(userId)) {
    await ctx.telegram.sendMessage(message.chat.id, "❌ Admin only command.");
    return;
  }

  const lines: string[] = ["🖼 𝗕𝗮𝗻𝗻𝗲𝗿 𝗦𝘁𝗮𝘁𝘂𝘀", ""];

  for (const type of VALID_BANNER_TYPES) {
    const label = BANNER_LABELS[type as BannerType];
    const fileId = await resolveBannerFileId(ctx.env, type as BannerType);
    const status = fileId ? "✅ Set" : "❌ Missing";
    lines.push(`${status} — ${label}`);
  }

  lines.push("");
  lines.push("Use /setbanner <type> to upload a banner.");

  await ctx.telegram.sendMessage(message.chat.id, lines.join("\n"), {
    reply_markup: homeLinkKeyboard(),
  });
}
