import {
  handleAdminCallback as handleAdminCallbackQuery,
  handleAdminPanel,
  handleAdminText,
  handleCheckReviewChannelCommand,
  handleTestReviewChannelCommand,
  isAdminCallbackData,
} from "./handlers/admin";
import { handleCategories, handleCategoryChannels } from "./handlers/categories";
import { handleChannelDetails, handleRatingPrompt } from "./handlers/channels";
import { handleLeaderboard, postWeeklyLeaderboard, publicPostChannel } from "./handlers/leaderboard";
import {
  handleMyChannelText,
  handleMyChannels,
  handleMyChannelsCallback,
  isMyChannelsCallbackData,
} from "./handlers/myChannels";
import {
  handleReportChannelPrompt,
  handleReportCommand,
  handleReportHelp,
  handleReportReasonCallback,
} from "./handlers/report";
import { handleSavedCallback, handleSavedChannels, isSavedCallbackData } from "./handlers/saved";
import {
  handleSearchCallback,
  handleSearchCommand,
  handleSearchHelp,
  isSearchCallbackData,
} from "./handlers/search";
import { handleHelp, handleStart, showHome } from "./handlers/start";
import {
  handleSubmitCallback,
  handleSubmitCommand,
  handleSubmitStart,
  handleSubmitText,
} from "./handlers/submit";
import {
  handleOwnershipVerificationCallback,
  isOwnershipVerificationCallbackData,
} from "./handlers/verify";
import {
  checkYoutubeVerification,
  handleCheckYtCommand,
  handleResetYoutubeVerifyCommand,
  handleYoutubeApprove,
  handleYoutubePhotoProof,
  handleYoutubeReject,
  handleYoutubeRetry,
  handleYoutubeStatus,
  handleYoutubeStatusCommand,
  handleYoutubeSubscribedCheck,
} from "./handlers/youtube";
import {
  handleImportTelegramChannelsCommand,
  handleImportPasteCommand,
  handleImportCsvCommand,
  handleImportStatsCommand,
} from "./handlers/import";
import {
  getChannel,
  incrementChannelClicks,
  listFeaturedChannels,
  listNewChannels,
  listTopChannels,
  rateChannel,
  upsertUser,
} from "./db";
import {
  TelegramClient,
  checkUserSubscription,
  getForceSubChannel,
  getForceSubLink,
  parseAdminIds,
  readCommand,
  sendOrEdit,
} from "./telegram";
import type {
  BotContext,
  Env,
  TelegramCallbackQuery,
  TelegramMessage,
  TelegramUpdate,
} from "./types";
import {
  ERROR_TEXT,
  FORCE_SUB_TEXT,
  channelResultsKeyboard,
  channelResultsText,
  forceSubscribeKeyboard,
} from "./ui";
import { categorySlugFromKey } from "./categoryKeys";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET") {
      if (url.pathname === "/") {
        return new Response("NexChannel Finder Bot is running ✅", {
          headers: {
            "content-type": "text/plain; charset=utf-8",
          },
        });
      }

      return new Response("Not found", { status: 404 });
    }

    if (request.method === "POST") {
      return handleWebhookRequest(request, env);
    }

    return new Response("Method not allowed", { status: 405 });
  },

  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    void controller;
    ctx.waitUntil(postScheduledWeeklyLeaderboard(env));
  },
};

async function handleWebhookRequest(request: Request, env: Env): Promise<Response> {
  try {
    console.log("Webhook received");

    const secretHeader = request.headers.get("x-telegram-bot-api-secret-token");
    if (env.WEBHOOK_SECRET && !(await secretsEqual(secretHeader ?? "", env.WEBHOOK_SECRET))) {
      return new Response("Unauthorized", { status: 401 });
    }

    const update = await request.json() as TelegramUpdate;
    console.log("Update type:", getUpdateType(update));

    await handleUpdate(env, update);

    return jsonResponse({ ok: true });
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false });
  }
}

async function postScheduledWeeklyLeaderboard(env: Env): Promise<void> {
  try {
    const result = await postWeeklyLeaderboard(env);
    if (result.status === "empty") {
      console.log("Weekly leaderboard skipped: no approved channels.");
    } else if (result.status === "error") {
      console.error("Scheduled weekly leaderboard post failed:", result.description);
    }
  } catch (error) {
    console.error("Scheduled weekly leaderboard post failed.", error);
  }
}

async function handleUpdate(env: Env, update: TelegramUpdate): Promise<void> {
  if (update.message) {
    const ctx = createBotContext(env);
    await handleMessage(ctx, update.message);
    return;
  }

  if (update.callback_query) {
    await handleCallback(update.callback_query, env);
  }
}

function createBotContext(env: Env): BotContext {
  return {
    env,
    telegram: new TelegramClient(env.BOT_TOKEN),
    adminIds: parseAdminIds(env.ADMIN_IDS?.trim() ? env.ADMIN_IDS : env.ADMIN_ID),
  };
}

async function handlePostLeaderboardCommand(
  ctx: BotContext,
  message: TelegramMessage,
): Promise<void> {
  const userId = message.from?.id;
  if (!userId || !ctx.adminIds.has(userId)) {
    await ctx.telegram.sendMessage(message.chat.id, "This command is only for admins.");
    return;
  }

  const result = await postWeeklyLeaderboard(ctx.env);
  if (result.status === "empty") {
    await ctx.telegram.sendMessage(message.chat.id, "No approved channels available for leaderboard.");
    return;
  }

  if (result.status === "error") {
    await ctx.telegram.sendMessage(
      message.chat.id,
      `❌ Failed to post leaderboard.\nReason: ${result.description}`,
    );
    return;
  }

  await ctx.telegram.sendMessage(
    message.chat.id,
    `✅ Leaderboard posted to ${publicPostChannel(ctx.env)}.`,
  );
}

async function handleTestPostCommand(ctx: BotContext, message: TelegramMessage): Promise<void> {
  const userId = message.from?.id;
  if (!userId || !ctx.adminIds.has(userId)) {
    await ctx.telegram.sendMessage(message.chat.id, "❌ Admin access only.");
    return;
  }

  const data = await ctx.telegram.sendMessage(
    publicPostChannel(ctx.env),
    "✅ NexChannel Finder test post successful.",
  );

  if (!data.ok) {
    console.error("Test post failed:", data);
    await ctx.telegram.sendMessage(
      message.chat.id,
      `❌ Failed to send test post.\nReason: ${data.description ?? "Unknown Telegram API error"}`,
    );
    return;
  }

  await ctx.telegram.sendMessage(message.chat.id, "✅ Test post sent successfully.");
}

async function handleCheckPostChannelCommand(ctx: BotContext, message: TelegramMessage): Promise<void> {
  const userId = message.from?.id;
  if (!userId || !ctx.adminIds.has(userId)) {
    await ctx.telegram.sendMessage(message.chat.id, "❌ Admin access only.");
    return;
  }

  const channelId = publicPostChannel(ctx.env);
  const botData = await ctx.telegram.getMe();
  if (!botData.ok || !botData.result) {
    await sendPostChannelCheckError(ctx, message, "getMe", botData.description);
    return;
  }

  const chatData = await ctx.telegram.getChat(channelId);
  if (!chatData.ok || !chatData.result) {
    await sendPostChannelCheckError(ctx, message, "getChat", chatData.description);
    return;
  }

  const memberData = await ctx.telegram.getChatMember(channelId, botData.result.id);
  if (!memberData.ok || !memberData.result) {
    await sendPostChannelCheckError(ctx, message, "getChatMember", memberData.description);
    return;
  }

  const lines = [
    "✅ Public post channel check",
    `Channel ID: ${chatData.result.id}`,
    `Channel title: ${chatData.result.title ?? "Unknown"}`,
    `Bot status: ${memberData.result.status}`,
    `Can post messages: ${canPostMessages(memberData.result) ? "Yes" : "No"}`,
  ];

  await ctx.telegram.sendMessage(message.chat.id, lines.join("\n"));
}

async function sendPostChannelCheckError(
  ctx: BotContext,
  message: TelegramMessage,
  step: string,
  description?: string,
): Promise<void> {
  const reason = description ?? "Unknown Telegram API error";
  console.error(`Post channel ${step} failed:`, reason);
  await ctx.telegram.sendMessage(
    message.chat.id,
    `❌ Post channel check failed at ${step}.\nReason: ${reason}`,
  );
}

function canPostMessages(member: { status: string; can_post_messages?: boolean }): boolean {
  return member.status === "creator" ||
    (member.status === "administrator" && member.can_post_messages === true);
}

async function handleMessage(ctx: BotContext, message: TelegramMessage): Promise<void> {
  const text = message.text?.trim();
  const hasPhoto = message.photo && message.photo.length > 0;

  if (!text && !hasPhoto) {
    return;
  }

  if (text) {
    console.log("Message received:", text);
  } else {
    console.log("Photo message received from:", message.from?.id);
  }

  if (message.from) {
    await upsertUser(ctx.env, message.from);
  }

  // Handle photo messages for YouTube proof (no command parsing needed)
  if (hasPhoto && message.from) {
    const handled = await handleYoutubePhotoProof(ctx, message);
    if (handled) {
      return;
    }
    // Fall through if not a YouTube proof photo
  }

  if (!text) {
    return;
  }

  const command = readCommand(text);

  if (command?.name === "start") {
    await handleStart(ctx, message);
    return;
  }

  if (command?.name === "debugcategories") {
    await handleDebugCategoriesCommand(ctx, message);
    return;
  }

  if (command?.name === "debugrecentchannels") {
    await handleDebugRecentChannelsCommand(ctx, message);
    return;
  }

  if (command?.name === "postleaderboard") {
    await handlePostLeaderboardCommand(ctx, message);
    return;
  }

  if (command?.name === "testpost") {
    await handleTestPostCommand(ctx, message);
    return;
  }

  if (command?.name === "checkpostchannel") {
    await handleCheckPostChannelCommand(ctx, message);
    return;
  }

  if (command?.name === "testreviewchannel") {
    await handleTestReviewChannelCommand(ctx, message);
    return;
  }

  if (command?.name === "checkreviewchannel") {
    await handleCheckReviewChannelCommand(ctx, message);
    return;
  }

  if (command?.name === "admin") {
    await handleAdminPanel(ctx, message.chat.id, undefined, message.from?.id ?? 0);
    return;
  }

  // Admin-only YouTube management commands
  if (command?.name === "checkyoutube" || command?.name === "checkyt") {
    await handleCheckYtCommand(ctx, message, command.args);
    return;
  }

  if (command?.name === "resetyoutubeverify") {
    await handleResetYoutubeVerifyCommand(ctx, message, command.args);
    return;
  }

  if (command?.name === "youtubestatus") {
    await handleYoutubeStatusCommand(ctx, message);
    return;
  }

  // --- Import Commands ---
  if (command?.name === "importtelegramchannels") {
    await handleImportTelegramChannelsCommand(ctx, message, command.args);
    return;
  }
  if (command?.name === "importpaste") {
    await handleImportPasteCommand(ctx, message);
    return;
  }
  if (command?.name === "importcsv") {
    await handleImportCsvCommand(ctx, message);
    return;
  }
  if (command?.name === "importstats") {
    await handleImportStatsCommand(ctx, message);
    return;
  }

  if (await handleAdminText(ctx, message, text)) {
    return;
  }

  if (!(await ensureSubscribed(ctx, message))) {
    return;
  }

  if (command?.name === "submit" || command?.name === "addchannel" || command?.name === "add") {
    await handleSubmitCommand(ctx, message, command.args);
    return;
  }

  if (!command && (await handleSubmitText(ctx, message, text))) {
    return;
  }

  if (!command && (await handleMyChannelText(ctx, message, text))) {
    return;
  }

  if (!command) {
    await handleSearchCommand(ctx, message, text);
    return;
  }

  switch (command.name) {
    case "help":
      await handleHelp(ctx, message.chat.id);
      break;
    case "categories":
      await handleCategories(ctx, message.chat.id);
      break;
    case "saved":
      await handleSavedChannels(ctx, message.chat.id, undefined, message.from?.id ?? 0);
      break;
    case "leaderboard":
      await handleLeaderboard(ctx, message.chat.id);
      break;
    case "mychannels":
    case "mine":
      await handleMyChannels(ctx, message.chat.id, undefined, message.from?.id ?? 0);
      break;
    case "search":
      await handleSearchCommand(ctx, message, command.args);
      break;
    case "report":
      await handleReportCommand(ctx, message, command.args);
      break;
    default:
      await ctx.telegram.sendMessage(
        message.chat.id,
        "I do not know that command yet. Try /help or send a search keyword.",
      );
  }
}

async function handleCallback(callbackQuery: TelegramCallbackQuery, env: Env): Promise<void> {
  const callbackId = callbackQuery.id;
  const callbackData = callbackQuery.data ?? "";
  const userId = callbackQuery.from.id;
  const chatId = callbackQuery.message?.chat.id;
  const messageId = callbackQuery.message?.message_id;
  void userId;
  void chatId;
  void messageId;

  console.log("Callback received:", callbackData);

  const ctx = createBotContext(env);
  try {
    await handleCallbackQuery(ctx, callbackQuery);
  } catch (error) {
    console.error(error);
    await ctx.telegram.answerCallbackQuery(callbackId, ERROR_TEXT, true);
  } finally {
    await ctx.telegram.ensureCallbackAnswered(callbackId);
  }
}

async function handleCallbackQuery(ctx: BotContext, query: TelegramCallbackQuery): Promise<void> {
  const data = query.data ?? "";
  const chatId = query.message?.chat.id;
  const messageId = query.message?.message_id;
  const userId = query.from.id;
  const routeName = callbackRouteName(data);

  if (routeName) {
    console.log("Route handled:", routeName);
  }

  await upsertUser(ctx.env, query.from);

  if (!chatId) {
    await ctx.telegram.answerCallbackQuery(query.id);
    return;
  }

  if (data === "check_force_sub" || data === "check_sub") {
    await handleSubscriptionCheck(ctx, query, chatId, messageId);
    return;
  }

  // YouTube verification callbacks — handled before admin check and subscription check
  if (data === "youtube_subscribed_check") {
    await handleYoutubeSubscribedCheck(ctx, query, chatId, messageId);
    return;
  }

  if (data === "youtube_status") {
    await handleYoutubeStatus(ctx, query, chatId, messageId);
    return;
  }

  if (data === "youtube_retry") {
    await handleYoutubeRetry(ctx, query, chatId, messageId);
    return;
  }

  if (data.startsWith("yt_approve:")) {
    const targetId = Number(data.slice("yt_approve:".length));
    await handleYoutubeApprove(ctx, query, targetId);
    return;
  }

  if (data.startsWith("yt_reject:")) {
    const targetId = Number(data.slice("yt_reject:".length));
    await handleYoutubeReject(ctx, query, targetId);
    return;
  }

  if (isAdminCallbackData(data)) {
    await handleAdminCallbackQuery(ctx, query, chatId, messageId);
    return;
  }

  const subscription = ctx.adminIds.has(userId)
    ? { subscribed: true as const }
    : await checkUserSubscription(ctx.env, ctx.telegram, userId);

  if (!subscription.subscribed) {
    if (subscription.error) {
      await ctx.telegram.answerCallbackQuery(
        query.id,
        "❌ Could not verify subscription. Please make sure you joined @Nex_bots and try again.",
        true,
      );
      return;
    }
    await ctx.telegram.answerCallbackQuery(
      query.id,
      `❌ You have not joined yet. Please join ${getForceSubChannel(ctx.env)} first.`,
      true,
    );
    await sendOrEdit(ctx.telegram, chatId, messageId, FORCE_SUB_TEXT, {
      reply_markup: forceSubscribeKeyboard(getForceSubLink(ctx.env)),
      disable_web_page_preview: true,
    });
    return;
  }

  // YouTube verification gate for callbacks
  if (!ctx.adminIds.has(userId)) {
    const ytOk = await checkYoutubeVerification(ctx, chatId, userId, messageId);
    if (!ytOk) {
      await ctx.telegram.answerCallbackQuery(
        query.id,
        "🔒 Please complete YouTube verification to use the bot.",
        true,
      );
      return;
    }
  }

  if (data.startsWith("j:") || data.startsWith("join:")) {
    const prefix = data.startsWith("j:") ? "j:" : "join:";
    await handleJoinCallback(ctx, query, userId, numberAfterPrefix(data, prefix));
    return;
  }

  if (data.startsWith("rate:") || data.startsWith("v:") || data.startsWith("vote:")) {
    await ctx.telegram.answerCallbackQuery(query.id);
    const prefix = data.startsWith("rate:") ? "rate:" : data.startsWith("v:") ? "v:" : "vote:";
    const channelId = numberAfterPrefix(data, prefix);
    console.log("Channel action: rate_prompt");
    console.log("Channel ID:", channelId);
    await handleRatingPrompt(ctx, chatId, messageId, channelId);
    return;
  }

  if (data.startsWith("rating:") || data.startsWith("rt:")) {
    await handleRatingCallback(ctx, query, chatId, messageId, userId, data);
    return;
  }

  if (isMyChannelsCallbackData(data)) {
    await ctx.telegram.answerCallbackQuery(query.id);
    await handleMyChannelsCallback(ctx, data, chatId, messageId, userId);
    return;
  }

  if (isSavedCallbackData(data)) {
    await handleSavedCallback(ctx, query, chatId, messageId);
    return;
  }

  if (data === "import_paste_start") {
    await ctx.telegram.answerCallbackQuery(query.id);
    if (query.message) {
      await handleImportPasteCommand(ctx, {
        from: query.from,
        chat: query.message.chat,
      } as TelegramMessage);
    }
    return;
  }

  if (data === "import_cancel") {
    await ctx.telegram.answerCallbackQuery(query.id, "Import cancelled.");
    await ctx.env.DB.prepare("DELETE FROM admin_states WHERE telegram_id = ?").bind(userId).run();
    if (chatId && messageId) {
      await ctx.telegram.editMessageText(
        chatId,
        messageId,
        "❌ Import cancelled."
      );
    }
    return;
  }

  if (data.startsWith("report_reason:")) {
    await handleReportReasonCallback(ctx, query, chatId, messageId);
    return;
  }

  if (isOwnershipVerificationCallbackData(data)) {
    await handleOwnershipVerificationCallback(ctx, query, chatId, messageId);
    return;
  }

  if (routeName) {
    await ctx.telegram.answerCallbackQuery(query.id);
  }

  if (isSearchCallbackData(data)) {
    await handleSearchCallback(ctx, data, chatId, messageId, userId);
    return;
  }

  if (data.startsWith("s:") || data.startsWith("submit_")) {
    await handleSubmitCallback(ctx, data, chatId, messageId, userId);
    return;
  }

  if (data === "home" || data === "menu" || data === "back:home") {
    await showHome(ctx, chatId, userId, messageId);
    return;
  }

  if (data === "help") {
    await handleHelp(ctx, chatId, messageId);
    return;
  }

  if (data === "categories" || data === "back:categories") {
    await handleCategories(ctx, chatId, messageId);
    return;
  }

  if (data === "saved" || data === "back:saved") {
    await handleSavedChannels(ctx, chatId, messageId, userId);
    return;
  }

  if (data === "leaderboard" || data === "back:leaderboard") {
    await handleLeaderboard(ctx, chatId, messageId);
    return;
  }

  if (data === "my_channels" || data === "my" || data === "back:my_channels") {
    await handleMyChannels(ctx, chatId, messageId, userId);
    return;
  }

  if (data === "top" || data === "back:top") {
    await showSectionPage(ctx, chatId, messageId, "top", 0);
    return;
  }

  if (data === "new" || data === "back:new") {
    await showSectionPage(ctx, chatId, messageId, "new", 0);
    return;
  }

  if (data === "featured" || data === "back:featured") {
    await showSectionPage(ctx, chatId, messageId, "featured", 0);
    return;
  }

  if (data.startsWith("category:") || data.startsWith("c:") || data.startsWith("cat:")) {
    const [, categoryKey, pageText = "0"] = data.split(":");
    const slug = categorySlugFromKey(categoryKey) ?? categoryKey;
    await handleCategoryChannels(ctx, chatId, messageId, slug, Number(pageText));
    return;
  }

  if (data.startsWith("page:")) {
    const parts = data.split(":");
    const section = parts[1];
    const pageText = parts.at(-1) ?? "0";
    const page = Math.max(0, Number(pageText) || 0);
    if (section === "saved") {
      await handleSavedChannels(ctx, chatId, messageId, userId, page);
    } else if (section === "my_channels") {
      await handleMyChannels(ctx, chatId, messageId, userId, page);
    } else if (section === "leaderboard") {
      await handleLeaderboard(ctx, chatId, messageId);
    } else if (section === "top" || section === "featured" || section === "new") {
      await showSectionPage(ctx, chatId, messageId, section, page);
    } else if (section === "category" && parts.length >= 4) {
      await handleCategoryChannels(
        ctx,
        chatId,
        messageId,
        categorySlugFromKey(parts[2]) ?? parts[2],
        page,
      );
    } else {
      await handleCategoryChannels(ctx, chatId, messageId, categorySlugFromKey(section) ?? section, page);
    }
    return;
  }

  if (data.startsWith("ch:") || data.startsWith("channel:")) {
    const prefix = data.startsWith("ch:") ? "ch:" : "channel:";
    const channelId = numberAfterPrefix(data, prefix);
    console.log("Channel action: open_channel_details");
    console.log("Channel ID:", channelId);
    // Track click when user opens channel details
    await handleChannelDetails(ctx, chatId, messageId, channelId, userId, true, "home");
    return;
  }

  if (data === "search") {
    await handleSearchHelp(ctx, chatId, messageId, userId);
    return;
  }

  if (data === "submit" || data === "submit_channel" || data === "add_channel" || data === "start_submit") {
    await handleSubmitStart(ctx, chatId, userId, messageId);
    return;
  }

  if (data === "report") {
    await handleReportHelp(ctx, chatId, messageId);
    return;
  }

  if (data.startsWith("r:") || data.startsWith("report:")) {
    const prefix = data.startsWith("r:") ? "r:" : "report:";
    const channelId = numberAfterPrefix(data, prefix);
    console.log("Channel action: report_prompt");
    console.log("Channel ID:", channelId);
    await handleReportChannelPrompt(ctx, chatId, messageId, channelId);
    return;
  }

  console.warn("Unknown callback:", data);
  await ctx.telegram.answerCallbackQuery(query.id, "❌ Button not connected yet.", true);
}

async function handleSubscriptionCheck(
  ctx: BotContext,
  query: TelegramCallbackQuery,
  chatId: number,
  messageId: number | undefined,
): Promise<void> {
  const subscription = ctx.adminIds.has(query.from.id)
    ? { subscribed: true as const }
    : await checkUserSubscription(ctx.env, ctx.telegram, query.from.id);

  if (!subscription.subscribed) {
    if (subscription.error) {
      await ctx.telegram.answerCallbackQuery(
        query.id,
        "❌ Could not verify subscription. Please make sure you joined @Nex_bots and try again.",
        true,
      );
      return;
    }
    await ctx.telegram.answerCallbackQuery(
      query.id,
      `❌ You have not joined yet. Please join ${getForceSubChannel(ctx.env)} first.`,
      true,
    );
    return;
  }

  await ctx.telegram.answerCallbackQuery(query.id, "Thanks. You are all set.");
  await showHome(ctx, chatId, query.from.id, messageId);
}

async function handleRatingCallback(
  ctx: BotContext,
  query: TelegramCallbackQuery,
  chatId: number,
  messageId: number | undefined,
  userId: number,
  data: string,
): Promise<void> {
  const match = /^(?:rt|rating):(\d+):([1-5])$/.exec(data);
  if (!match) {
    await ctx.telegram.answerCallbackQuery(query.id, ERROR_TEXT, true);
    return;
  }

  const channelId = Number(match[1]);
  const rating = Number(match[2]);

  console.log("Channel action: submit_rating");
  console.log("Channel ID:", channelId);

  try {
    const result = await rateChannel(ctx.env, userId, channelId, rating);

    if (result === "missing" || result === "invalid") {
      await ctx.telegram.answerCallbackQuery(query.id, ERROR_TEXT, true);
      return;
    }

    if (result === "exists") {
      await ctx.telegram.answerCallbackQuery(query.id, "⭐ You already rated this channel.", true);
      // Still navigate back to channel details
      await handleChannelDetails(ctx, chatId, messageId, channelId, userId, false);
      return;
    }

    await ctx.telegram.answerCallbackQuery(query.id, "⭐ Thanks for rating!");
    await handleChannelDetails(ctx, chatId, messageId, channelId, userId, false);
  } catch (error) {
    console.error("Error in handleRatingCallback:", error);
    await ctx.telegram.answerCallbackQuery(query.id, ERROR_TEXT, true);
  }
}

async function handleJoinCallback(
  ctx: BotContext,
  query: TelegramCallbackQuery,
  userId: number,
  channelId: number,
): Promise<void> {
  const channel = await getChannel(ctx.env, channelId);

  if (!channel?.link) {
    await ctx.telegram.answerCallbackQuery(query.id, ERROR_TEXT, true);
    return;
  }

  await incrementChannelClicks(ctx.env, channel.id, userId);
  await ctx.telegram.answerCallbackQuery(query.id, "Opening channel...", false, channel.link);
}

async function showSectionPage(
  ctx: BotContext,
  chatId: number,
  messageId: number | undefined,
  section: "top" | "featured" | "new",
  page: number,
): Promise<void> {
  const pageSize = 5;
  const safePage = Math.max(0, page);
  const offset = safePage * pageSize;
  const rows = section === "top"
    ? await listTopChannels(ctx.env, pageSize + 1, offset)
    : section === "featured"
      ? await listFeaturedChannels(ctx.env, pageSize + 1, offset)
      : await listNewChannels(ctx.env, pageSize + 1, offset);
  const channels = rows.slice(0, pageSize);
  const hasNext = rows.length > pageSize;
  const title = section === "top"
    ? "🔥 Top Channels"
    : section === "featured"
      ? "⭐ Featured Channels"
      : "🆕 New Channels";

  await sendOrEdit(ctx.telegram, chatId, messageId, channelResultsText(title, channels), {
    reply_markup: channelResultsKeyboard(channels, "home", section, safePage, hasNext),
    disable_web_page_preview: true,
  });
}

async function ensureSubscribed(ctx: BotContext, message: TelegramMessage): Promise<boolean> {
  if (!message.from) {
    return false;
  }

  if (ctx.adminIds.has(message.from.id)) {
    return true;
  }

  // Step 1: Check Telegram force subscribe
  const subscription = await checkUserSubscription(ctx.env, ctx.telegram, message.from.id);
  if (!subscription.subscribed) {
    if (subscription.error) {
      await ctx.telegram.sendMessage(
        message.chat.id,
        "❌ Could not verify subscription. Please make sure you joined @Nex_bots and try again.",
        {
          reply_markup: forceSubscribeKeyboard(getForceSubLink(ctx.env)),
          disable_web_page_preview: true,
        },
      );
      return false;
    }

    await ctx.telegram.sendMessage(message.chat.id, FORCE_SUB_TEXT, {
      reply_markup: forceSubscribeKeyboard(getForceSubLink(ctx.env)),
      disable_web_page_preview: true,
    });

    return false;
  }

  // Step 2: Check YouTube verification
  const ytOk = await checkYoutubeVerification(ctx, message.chat.id, message.from.id);
  if (!ytOk) {
    return false;
  }

  return true;
}

function numberAfterPrefix(value: string, prefix: string): number {
  return Number(value.slice(prefix.length));
}

const TELEGRAM_UPDATE_TYPES = [
  "message",
  "edited_message",
  "channel_post",
  "edited_channel_post",
  "business_connection",
  "business_message",
  "edited_business_message",
  "deleted_business_messages",
  "message_reaction",
  "message_reaction_count",
  "inline_query",
  "chosen_inline_result",
  "callback_query",
  "shipping_query",
  "pre_checkout_query",
  "poll",
  "poll_answer",
  "my_chat_member",
  "chat_member",
  "chat_join_request",
] as const;

type TelegramUpdateType = (typeof TELEGRAM_UPDATE_TYPES)[number];

function getUpdateType(update: TelegramUpdate): string {
  const updateRecord = update as TelegramUpdate & Partial<Record<TelegramUpdateType, unknown>>;

  for (const updateType of TELEGRAM_UPDATE_TYPES) {
    if (updateRecord[updateType]) {
      return updateType;
    }
  }

  return "unknown";
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
}

function callbackRouteName(data: string): string | null {
  const exactRoutes = new Set([
    "home", "menu", "help", "top", "featured", "new", "categories", "search", "submit",
    "saved", "leaderboard", "my", "my_channels", "check_force_sub", "check_sub", "report",
    "verify_added_bot", "verify_manual_proof", "submit_cancel",
    "back:home", "back:categories", "back:top", "back:featured", "back:new", "back:saved",
    "back:leaderboard", "back:my_channels",
  ]);
  if (exactRoutes.has(data)) {
    return data;
  }
  if (isAdminCallbackData(data)) {
    return "admin";
  }
  if (isMyChannelsCallbackData(data)) {
    return "my_channels";
  }
  if (isSavedCallbackData(data)) {
    return "saved";
  }
  if (isSearchCallbackData(data)) {
    return "search";
  }
  if (isOwnershipVerificationCallbackData(data)) {
    return "ownership_verification";
  }

  const prefixes: Array<[string, string]> = [
    ["category:", "category"], ["c:", "category"], ["cat:", "category"],
    ["page:", "pagination"], ["channel:", "channel"], ["ch:", "channel"],
    ["join:", "join"], ["j:", "join"], ["rate:", "rate"], ["rating:", "rating"],
    ["rt:", "rating"], ["v:", "rate"], ["vote:", "rate"],
    ["save:", "save"], ["unsave:", "unsave"],
    ["report:", "report"], ["r:", "report"], ["report_reason:", "report_reason"],
    ["submit_", "submit"], ["s:", "submit"],
  ];
  return prefixes.find(([prefix]) => data.startsWith(prefix))?.[1] ?? null;
}

async function secretsEqual(provided: string, expected: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(provided)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  return crypto.subtle.timingSafeEqual(providedHash, expectedHash);
}

async function handleDebugCategoriesCommand(
  ctx: BotContext,
  message: TelegramMessage,
): Promise<void> {
  const userId = message.from?.id;
  if (userId !== 6059191947) {
    await ctx.telegram.sendMessage(message.chat.id, "❌ Admin access only.");
    return;
  }

  try {
    const categories = [
      "education",
      "jobs",
      "ai",
      "tech",
      "news",
      "deals",
      "sports",
      "gaming",
      "creators",
      "business",
      "earning",
      "movies",
      "books",
      "motivation",
      "entertainment",
      "music",
      "tools",
      "apps",
      "other",
    ];

    const counts: string[] = [];
    for (const cat of categories) {
      const countRes = await ctx.env.DB.prepare(
        "SELECT COUNT(*) AS count FROM channels WHERE category = ? AND status = 'approved'",
      )
        .bind(cat)
        .first<{ count: number }>();
      const count = countRes?.count ?? 0;
      counts.push(`${cat}: ${count}`);
    }

    const replyText = [
      "📊 Category Counts",
      "",
      ...counts,
    ].join("\n");

    await ctx.telegram.sendMessage(message.chat.id, replyText);
  } catch (error) {
    console.error("Error in debugcategories:", error);
    await ctx.telegram.sendMessage(
      message.chat.id,
      `❌ Error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function handleDebugRecentChannelsCommand(
  ctx: BotContext,
  message: TelegramMessage,
): Promise<void> {
  const userId = message.from?.id;
  if (userId !== 6059191947) {
    await ctx.telegram.sendMessage(message.chat.id, "❌ Admin access only.");
    return;
  }

  try {
    const result = await ctx.env.DB.prepare(
      "SELECT id, title, category, language, status FROM channels WHERE status = 'approved' ORDER BY id DESC LIMIT 20",
    ).all<{ id: number; title: string; category: string; language: string; status: string }>();

    const rows = result.results ?? [];
    if (rows.length === 0) {
      await ctx.telegram.sendMessage(message.chat.id, "No approved channels found.");
      return;
    }

    const lines = rows.map((r) => `${r.id}, ${r.title}, ${r.category}, ${r.language}, ${r.status}`);
    await ctx.telegram.sendMessage(message.chat.id, lines.join("\n"));
  } catch (error) {
    console.error("Error in debugrecentchannels:", error);
    await ctx.telegram.sendMessage(
      message.chat.id,
      `❌ Error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
