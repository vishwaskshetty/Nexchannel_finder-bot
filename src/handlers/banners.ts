/**
 * Banner system for NexChannel Finder Bot.
 *
 * Banners are sent as Telegram photos before main page sections.
 * File IDs are stored in wrangler.toml env vars (fallback) or in the
 * bot_settings D1 table (set via /setbanner admin command).
 */

import { getBotSetting, setBotSetting } from "../db";
import { setAdminState, clearAdminState, getAdminState } from "../db";
import type { BotContext, Env, TelegramMessage } from "../types";

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

/**
 * Resolves a banner file ID by checking the D1 bot_settings table first,
 * then falling back to the wrangler.toml env variable.
 */
async function resolveBannerFileId(env: Env, type: BannerType): Promise<string | null> {
  const key = BANNER_KEY_MAP[type];

  // 1. Check D1 table first (highest priority — set by /setbanner)
  const dbValue = await getBotSetting(env, key);
  if (dbValue?.trim()) {
    return dbValue.trim();
  }

  // 2. Fall back to wrangler.toml / Cloudflare env var
  const envValue = (env as Record<string, string | undefined>)[key];
  if (typeof envValue === "string" && envValue.trim()) {
    return envValue.trim();
  }

  return null;
}

/**
 * Sends a brand banner photo before a section if a file ID is configured.
 * Silently skips if no file ID is available — never crashes.
 */
export async function sendBrandBanner(
  ctx: BotContext,
  chatId: number | string,
  type: BannerType,
): Promise<void> {
  try {
    const fileId = await resolveBannerFileId(ctx.env, type);
    if (!fileId) {
      return;
    }
    await ctx.telegram.sendPhoto(chatId, fileId);
  } catch (error) {
    // Never crash — banners are decorative
    console.warn(`Banner send failed for ${type}:`, error);
  }
}

// ─── /setbanner command ───────────────────────────────────────────────────────

const VALID_BANNER_TYPES = Object.keys(BANNER_KEY_MAP) as BannerType[];

function parseBannerType(arg: string): BannerType | null {
  const normalized = arg.trim().toLowerCase() as BannerType;
  return VALID_BANNER_TYPES.includes(normalized) ? normalized : null;
}

/**
 * Admin command: /setbanner <type>
 * Starts a two-step flow: admin sends the command, then sends a photo.
 */
export async function handleSetBannerCommand(
  ctx: BotContext,
  message: TelegramMessage,
  args: string,
): Promise<void> {
  const userId = message.from?.id;
  if (!userId || !ctx.adminIds.has(userId)) {
    await ctx.telegram.sendMessage(message.chat.id, "❌ Admin access only.");
    return;
  }

  const bannerType = parseBannerType(args);
  if (!bannerType) {
    await ctx.telegram.sendMessage(
      message.chat.id,
      [
        "❌ Invalid banner type.",
        "",
        "Usage: /setbanner <type>",
        "",
        "Valid types:",
        "• welcome",
        "• categories",
        "• top",
        "• add_channel",
        "• leaderboard",
      ].join("\n"),
    );
    return;
  }

  // Store which banner type admin is uploading in admin_states payload
  await setAdminState(ctx.env, userId, "banner_wait", bannerType);

  await ctx.telegram.sendMessage(
    message.chat.id,
    [
      `📸 Send the banner image for: 𝗔${BANNER_LABELS[bannerType].toUpperCase()}`,
      "",
      "Send the photo now.",
    ].join("\n"),
  );
}

/**
 * Handles the photo message sent by admin during /setbanner flow.
 * Returns true if the photo was handled as a banner upload.
 */
export async function handleBannerPhotoUpload(
  ctx: BotContext,
  message: TelegramMessage,
): Promise<boolean> {
  const userId = message.from?.id;
  if (!userId || !ctx.adminIds.has(userId)) {
    return false;
  }

  // Check if admin is in banner_wait state
  const state = await getAdminState(ctx.env, userId);
  if (state?.mode !== "banner_wait" || !state.payload) {
    return false;
  }

  const bannerType = state.payload as BannerType;
  if (!VALID_BANNER_TYPES.includes(bannerType)) {
    return false;
  }

  // Get the largest photo size file_id
  const photos = message.photo;
  if (!photos || photos.length === 0) {
    return false;
  }

  const bestPhoto = photos[photos.length - 1];
  const fileId = bestPhoto.file_id;
  const key = BANNER_KEY_MAP[bannerType];

  // Save to D1
  await setBotSetting(ctx.env, key, fileId);

  // Clear admin state
  await clearAdminState(ctx.env, userId);

  await ctx.telegram.sendMessage(
    message.chat.id,
    [
      `✅ Banner saved for: 𝗔${BANNER_LABELS[bannerType].toUpperCase()}`,
      "",
      `File ID: \`${fileId}\``,
      "",
      "You can also copy this file_id to wrangler.toml:",
      `${key} = "${fileId}"`,
    ].join("\n"),
  );

  return true;
}

// ─── /banners command ─────────────────────────────────────────────────────────

/**
 * Admin command: /banners
 * Shows the status of all configured banners.
 */
export async function handleBannersStatusCommand(
  ctx: BotContext,
  message: TelegramMessage,
): Promise<void> {
  const userId = message.from?.id;
  if (!userId || !ctx.adminIds.has(userId)) {
    await ctx.telegram.sendMessage(message.chat.id, "❌ Admin access only.");
    return;
  }

  const lines: string[] = ["🖼 𝗕𝗮𝗻𝗻𝗲𝗿 𝗦𝘁𝗮𝘁𝘂𝘀", ""];

  for (const [type, label] of Object.entries(BANNER_LABELS) as [BannerType, string][]) {
    const fileId = await resolveBannerFileId(ctx.env, type as BannerType);
    const status = fileId ? "✅ Set" : "❌ Missing";
    lines.push(`${status} — ${label}`);
  }

  lines.push("");
  lines.push("Use /setbanner <type> to upload a banner.");

  await ctx.telegram.sendMessage(message.chat.id, lines.join("\n"));
}
