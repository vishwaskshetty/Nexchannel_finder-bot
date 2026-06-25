import {
  clearAdminState,
  getAdminChannel,
  getAdminState,
  getAdminStats,
  listAdminChannelsByStatus,
  listAdminVerifiedChannels,
  listBroadcastUsers,
  listOpenReports,
  markChannelOwnerVerified,
  markChannelVerified,
  markChannelUnverified,
  removeChannel,
  resolveReport,
  searchAdminChannels,
  setAdminState,
  setChannelStatus,
} from "../db";
import { postWeeklyLeaderboard, publicPostChannel } from "./leaderboard";
import {
  canSendReviewChannelMessages,
  getAdminReviewChannelId,
  sendAdminReviewNotification,
  sendOrEdit,
} from "../telegram";
import type {
  AdminState,
  BotContext,
  Channel,
  TelegramCallbackQuery,
  TelegramInlineKeyboardMarkup,
  TelegramMessage,
} from "../types";
import {
  adminBackKeyboard,
  adminChannelText,
  adminEmptyText,
  adminMenuKeyboard,
  adminPanelText,
  adminSearchPromptText,
  adminSearchResultsKeyboard,
  adminSearchResultsText,
  adminStatsText,
  adminStatusListKeyboard,
  adminStatusListText,
  ADMIN_PAGE_SIZE,
  approvedChannelKeyboard,
  broadcastConfirmKeyboard,
  broadcastConfirmText,
  broadcastPromptText,
  formatApprovedChannelPost,
  hiddenChannelKeyboard,
  openReportsKeyboard,
  openReportsText,
  pendingChannelKeyboard,
  publicPostKeyboard,
  rejectedChannelKeyboard,
} from "../ui";
import { processPasteRanking, processCsvImport, processBulkAdd, processAddChannelLine } from "./import";


type AdminAction =
  | { kind: "menu" }
  | { kind: "stats" }
  | { kind: "pending" }
  | { kind: "approved" }
  | { kind: "hidden" }
  | { kind: "verified" }
  | { kind: "broadcast" }
  | { kind: "broadcast_send" }
  | { kind: "broadcast_cancel" }
  | { kind: "search" }
  | { kind: "channel"; id: number }
  | { kind: "approve"; id: number }
  | { kind: "reject"; id: number }
  | { kind: "hide"; id: number }
  | { kind: "scam"; id: number }
  | { kind: "verify"; id: number }
  | { kind: "unverify"; id: number }
  | { kind: "owner_verify"; id: number }
  | { kind: "remove"; id: number }
  | { kind: "reports" }
  | { kind: "resolve_report"; id: number }
  | { kind: "page"; status: "pending" | "approved" | "hidden"; page: number }
  | { kind: "post_leaderboard" };

const ADMIN_ONLY_TEXT = "❌ Admin access only.";
const ADMIN_ERROR_TEXT = "❌ Admin action failed. Check logs.";
const APPROVED_OWNER_TEXT = "✅ Your channel has been approved!";
const REJECTED_OWNER_TEXT = "❌ Your channel submission was rejected.";

export function isAdminCallbackData(data: string): boolean {
  return data === "admin" || data === "postleaderboard_now" || data.startsWith("admin:") ||
    data.startsWith("admin_") || data.startsWith("a:") || data.startsWith("page:admin_");
}

export async function handleAdminCallback(
  ctx: BotContext,
  query: TelegramCallbackQuery,
  chatId: number,
  messageId: number | undefined,
): Promise<void> {
  const userId = query.from.id;
  const data = query.data ?? "";

  console.log("Admin callback:", data);
  console.log("Admin user:", userId);

  // Always check admin access first
  if (!isAdmin(ctx, userId)) {
    await ctx.telegram.answerCallbackQuery(query.id, ADMIN_ONLY_TEXT, true);
    return;
  }

  const action = parseAdminAction(data);
  if (!action) {
    await ctx.telegram.answerCallbackQuery(query.id, "❌ Unknown admin action.", true);
    return;
  }

  try {
    // Dispatch each action; action handlers answer the callback with appropriate text
    switch (action.kind) {
      case "menu":
        await ctx.telegram.answerCallbackQuery(query.id);
        await handleAdminPanel(ctx, chatId, messageId, userId);
        break;

      case "stats":
        await ctx.telegram.answerCallbackQuery(query.id);
        await handleBotStats(ctx, chatId, messageId, userId);
        break;

      case "pending":
        await ctx.telegram.answerCallbackQuery(query.id);
        await handlePendingSubmissions(ctx, chatId, messageId, userId);
        break;

      case "approved":
        await ctx.telegram.answerCallbackQuery(query.id);
        await handleApprovedChannels(ctx, chatId, messageId, userId);
        break;

      case "hidden":
        await ctx.telegram.answerCallbackQuery(query.id);
        await handleHiddenChannels(ctx, chatId, messageId, userId);
        break;

      case "verified":
        await ctx.telegram.answerCallbackQuery(query.id);
        await handleVerifiedChannels(ctx, chatId, messageId, userId);
        break;

      case "broadcast":
        await ctx.telegram.answerCallbackQuery(query.id);
        await handleBroadcastPrompt(ctx, chatId, messageId, userId);
        break;

      case "broadcast_send":
        await ctx.telegram.answerCallbackQuery(query.id);
        await handleBroadcastSend(ctx, chatId, messageId, userId);
        break;

      case "broadcast_cancel":
        await ctx.telegram.answerCallbackQuery(query.id);
        await handleBroadcastCancel(ctx, chatId, messageId, userId);
        break;

      case "search":
        await ctx.telegram.answerCallbackQuery(query.id);
        await handleAdminSearchPrompt(ctx, chatId, messageId, userId);
        break;

      case "channel":
        console.log("Admin channel id:", action.id);
        await ctx.telegram.answerCallbackQuery(query.id);
        await handleSubmissionDetails(ctx, chatId, messageId, userId, action.id);
        break;

      case "approve":
        console.log("Admin channel id:", action.id);
        await handleApproveSubmission(ctx, query, chatId, messageId, userId, action.id);
        break;

      case "reject":
        console.log("Admin channel id:", action.id);
        await handleRejectSubmission(ctx, query, chatId, messageId, userId, action.id);
        break;

      case "hide":
        console.log("Admin channel id:", action.id);
        await handleHideSubmission(ctx, query, chatId, messageId, userId, action.id);
        break;

      case "scam":
        console.log("Admin channel scam id:", action.id);
        await handleMarkScam(ctx, query, chatId, messageId, userId, action.id);
        break;

      case "verify":
        console.log("Admin channel verify id:", action.id);
        await handleAskVerify(ctx, query, chatId, messageId, userId, action.id);
        break;

      case "unverify":
        console.log("Admin channel id:", action.id);
        await handleMarkUnverified(ctx, query, chatId, messageId, userId, action.id);
        break;

      case "owner_verify":
        console.log("Admin channel id:", action.id);
        await handleMarkOwnerVerified(ctx, query, chatId, messageId, userId, action.id);
        break;

      case "remove":
        console.log("Admin channel id:", action.id);
        await ctx.telegram.answerCallbackQuery(query.id);
        await handleRemoveChannel(ctx, chatId, messageId, userId, action.id);
        break;

      case "reports":
        await ctx.telegram.answerCallbackQuery(query.id);
        await handleOpenReports(ctx, chatId, messageId, userId);
        break;

      case "resolve_report":
        await ctx.telegram.answerCallbackQuery(query.id, "✅ Report resolved.");
        await handleResolveReport(ctx, chatId, messageId, userId, action.id);
        break;

      case "page":
        await ctx.telegram.answerCallbackQuery(query.id);
        await showStatusPage(ctx, chatId, messageId, userId, action.status, action.page);
        break;

      case "post_leaderboard":
        await ctx.telegram.answerCallbackQuery(query.id);
        await handleAdminPostLeaderboard(ctx, chatId, messageId, userId);
        break;
    }
  } catch (error) {
    console.error("Admin callback error:", error, { data, userId });
    await ctx.telegram.answerCallbackQuery(query.id, ADMIN_ERROR_TEXT, true);
    try {
      await sendOrEdit(ctx.telegram, chatId, messageId, ADMIN_ERROR_TEXT, {
        reply_markup: adminBackKeyboard(),
      });
    } catch (sendError) {
      console.error("Admin error recovery also failed:", sendError);
    }
  }
}

export async function handleAdminText(
  ctx: BotContext,
  message: TelegramMessage,
  text: string,
): Promise<boolean> {
  const userId = message.from?.id;
  if (!userId || !isAdmin(ctx, userId)) {
    return false;
  }

  let state: AdminState | null;
  try {
    state = await getAdminState(ctx.env, userId);
  } catch (error) {
    console.warn("Could not load admin state.", error);
    return false;
  }

  if (!state) {
    return false;
  }

  if (state.mode === "broadcast_wait") {
    if (text.length > 4096) {
      await ctx.telegram.sendMessage(
        message.chat.id,
        "Broadcast message is too long. Please keep it under 4096 characters.",
        { reply_markup: adminBackKeyboard() },
      );
      return true;
    }

    await setAdminState(ctx.env, userId, "broadcast_confirm", text);
    await ctx.telegram.sendMessage(message.chat.id, broadcastConfirmText(text), {
      reply_markup: broadcastConfirmKeyboard(),
      disable_web_page_preview: true,
    });
    return true;
  }

  if (state.mode === "search_wait") {
    await clearAdminState(ctx.env, userId);

    const results = await searchAdminChannels(ctx.env, text, 10);
    await ctx.telegram.sendMessage(message.chat.id, adminSearchResultsText(text, results), {
      reply_markup: adminSearchResultsKeyboard(results),
      disable_web_page_preview: true,
    });
    return true;
  }

  if (state.mode === "import_paste_wait") {
    await clearAdminState(ctx.env, userId);
    await processPasteRanking(ctx, message.chat.id, userId, text);
    return true;
  }

  if (state.mode === "import_csv_wait") {
    await clearAdminState(ctx.env, userId);
    await processCsvImport(ctx, message.chat.id, userId, text);
    return true;
  }

  if (state.mode === "broadcast_confirm") {
    await ctx.telegram.sendMessage(message.chat.id, "Use ✅ Send or ❌ Cancel to finish the broadcast.", {
      reply_markup: broadcastConfirmKeyboard(),
    });
    return true;
  }

  if (state.mode === "bulkadd_wait") {
    await clearAdminState(ctx.env, userId);
    await processBulkAdd(ctx, message.chat.id, userId, text);
    return true;
  }

  if (state.mode === "addchannel_wait") {
    await clearAdminState(ctx.env, userId);
    const result = await processAddChannelLine(ctx, message.chat.id, userId, text);
    if (result.status === "added") {
      await ctx.telegram.sendMessage(
        message.chat.id,
        `✅ <b>Channel Added</b>\n\n📢 ${result.username}\n📂 ${result.category ?? ""}\n🌐 ${result.language ?? ""}`,
        { parse_mode: "HTML" },
      );
    } else if (result.status === "duplicate") {
      await ctx.telegram.sendMessage(message.chat.id, `⚠️ Channel ${result.username} already exists in the database.`);
    } else {
      await ctx.telegram.sendMessage(message.chat.id, `❌ ${result.reason ?? "Invalid channel or format."}`);
    }
    return true;
  }

  if (state.mode === "banner_wait") {
    await ctx.telegram.sendMessage(
      message.chat.id,
      "📸 Please send a photo (not text) to set the banner.",
    );
    return true;
  }

  return false;
}



export async function handleAdminPanel(
  ctx: BotContext,
  chatId: number,
  messageId: number | undefined,
  userId: number,
): Promise<void> {
  if (!(await ensureAdmin(ctx, chatId, messageId, userId))) {
    return;
  }

  await safeClearAdminState(ctx, userId);
  await sendOrEdit(ctx.telegram, chatId, messageId, adminPanelText(), {
    reply_markup: adminMenuKeyboard(),
  });
}

export async function handleBotStats(
  ctx: BotContext,
  chatId: number,
  messageId: number | undefined,
  userId: number,
): Promise<void> {
  if (!(await ensureAdmin(ctx, chatId, messageId, userId))) {
    return;
  }

  const stats = await getAdminStats(ctx.env);

  await sendOrEdit(ctx.telegram, chatId, messageId, adminStatsText(stats), {
    reply_markup: adminBackKeyboard(),
  });
}

export async function handlePendingSubmissions(
  ctx: BotContext,
  chatId: number,
  messageId: number | undefined,
  userId: number,
): Promise<void> {
  await showStatusPage(ctx, chatId, messageId, userId, "pending", 0);
}

export async function handlePendingCommand(
  ctx: BotContext,
  chatId: number,
): Promise<void> {
  const pendingChannels = await listAdminChannelsByStatus(ctx.env, "pending", 0, 50);

  if (pendingChannels.length === 0) {
    await ctx.telegram.sendMessage(chatId, adminEmptyText("⏳ Pending Channels"));
    return;
  }

  await ctx.telegram.sendMessage(chatId, `⏳ Found ${pendingChannels.length} pending channels. Sending details...`);

  for (const channel of pendingChannels) {
    const text = [
      "<b>⏳ Pending Channel</b>",
      "",
      `📢 Title: ${channel.title}`,
      `🔗 Username: ${channel.channel_username ?? channel.username ?? ""}`,
      `📂 Category: ${channel.category ?? "other"}`,
      `🌐 Language: ${channel.language ?? "Mixed"}`,
      `📝 Description: ${channel.description ?? ""}`,
      `🏷 Tags: ${channel.tags ?? ""}`,
      "",
      "<b>Quality Checklist:</b>",
      `✅ Has Description: ${channel.description ? "Yes" : "No"}`,
      `✅ Has Avatar: Pending`,
      `✅ 100+ Subs: Pending`,
      `✅ Safe Content: Pending`,
    ].join("\n");

    await ctx.telegram.sendMessage(chatId, text, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Approve", callback_data: `admin_approve:${channel.id}` },
            { text: "❌ Reject", callback_data: `admin_reject:${channel.id}` }
          ]
        ]
      }
    });

    // small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 100));
  }
}


export async function handleApprovedChannels(
  ctx: BotContext,
  chatId: number,
  messageId: number | undefined,
  userId: number,
): Promise<void> {
  await showStatusPage(ctx, chatId, messageId, userId, "approved", 0);
}

export async function handleHiddenChannels(
  ctx: BotContext,
  chatId: number,
  messageId: number | undefined,
  userId: number,
): Promise<void> {
  await showStatusPage(ctx, chatId, messageId, userId, "hidden", 0);
}

export async function handleVerifiedChannels(
  ctx: BotContext,
  chatId: number,
  messageId: number | undefined,
  userId: number,
): Promise<void> {
  if (!(await ensureAdmin(ctx, chatId, messageId, userId))) {
    return;
  }

  const [channel] = await listAdminVerifiedChannels(ctx.env, 1);
  if (!channel) {
    await sendOrEdit(ctx.telegram, chatId, messageId, adminEmptyText("⭐ Verified Channels"), {
      reply_markup: adminBackKeyboard(),
    });
    return;
  }

  await showAdminChannel(ctx, chatId, messageId, channel);
}

export async function handleSubmissionDetails(
  ctx: BotContext,
  chatId: number,
  messageId: number | undefined,
  userId: number,
  channelId: number,
): Promise<void> {
  if (!(await ensureAdmin(ctx, chatId, messageId, userId))) {
    return;
  }

  console.log("Admin channel id:", channelId);
  const channel = await getAdminChannel(ctx.env, channelId);
  if (!channel) {
    await sendOrEdit(ctx.telegram, chatId, messageId, "❌ Channel not found.", {
      reply_markup: adminBackKeyboard(),
    });
    return;
  }

  await showAdminChannel(ctx, chatId, messageId, channel);
}

export async function handleApproveSubmission(
  ctx: BotContext,
  query: TelegramCallbackQuery,
  chatId: number,
  messageId: number | undefined,
  userId: number,
  channelId: number,
): Promise<void> {
  if (!(await ensureAdmin(ctx, chatId, messageId, userId))) {
    await ctx.telegram.answerCallbackQuery(query.id, ADMIN_ONLY_TEXT, true);
    return;
  }

  console.log("Admin channel id:", channelId);
  const previous = await setChannelStatus(ctx.env, channelId, "approved");
  if (!previous) {
    await ctx.telegram.answerCallbackQuery(query.id, "❌ Channel not found.", true);
    await sendOrEdit(ctx.telegram, chatId, messageId, "❌ Channel not found.", {
      reply_markup: adminBackKeyboard(),
    });
    return;
  }

  await ctx.telegram.answerCallbackQuery(query.id, "✅ Channel approved.");

  if (previous.status !== "approved") {
    await notifyOwner(ctx, previous.owner_telegram_id, APPROVED_OWNER_TEXT);
    const approved = await getAdminChannel(ctx.env, channelId);
    if (approved) {
      await announceApprovedChannel(ctx, approved, chatId);
    }
  }

  // Show the refreshed channel after action
  const updated = await getAdminChannel(ctx.env, channelId);
  if (updated) {
    await showAdminChannel(ctx, chatId, messageId, updated);
  } else {
    await showNextAfterAction(ctx, chatId, messageId, userId, previous.status);
  }
}

export async function handleRejectSubmission(
  ctx: BotContext,
  query: TelegramCallbackQuery,
  chatId: number,
  messageId: number | undefined,
  userId: number,
  channelId: number,
): Promise<void> {
  if (!(await ensureAdmin(ctx, chatId, messageId, userId))) {
    await ctx.telegram.answerCallbackQuery(query.id, ADMIN_ONLY_TEXT, true);
    return;
  }

  console.log("Admin channel id:", channelId);
  const previous = await setChannelStatus(ctx.env, channelId, "rejected");
  if (!previous) {
    await ctx.telegram.answerCallbackQuery(query.id, "❌ Channel not found.", true);
    await sendOrEdit(ctx.telegram, chatId, messageId, "❌ Channel not found.", {
      reply_markup: adminBackKeyboard(),
    });
    return;
  }

  await ctx.telegram.answerCallbackQuery(query.id, "❌ Channel rejected.");

  if (previous.status !== "rejected") {
    await notifyOwner(ctx, previous.owner_telegram_id, REJECTED_OWNER_TEXT);
  }

  const updated = await getAdminChannel(ctx.env, channelId);
  if (updated) {
    await showAdminChannel(ctx, chatId, messageId, updated);
  } else {
    await showNextAfterAction(ctx, chatId, messageId, userId, previous.status);
  }
}

export async function handleHideSubmission(
  ctx: BotContext,
  query: TelegramCallbackQuery,
  chatId: number,
  messageId: number | undefined,
  userId: number,
  channelId: number,
): Promise<void> {
  if (!(await ensureAdmin(ctx, chatId, messageId, userId))) {
    await ctx.telegram.answerCallbackQuery(query.id, ADMIN_ONLY_TEXT, true);
    return;
  }

  console.log("Admin channel id:", channelId);
  const previous = await setChannelStatus(ctx.env, channelId, "hidden");
  if (!previous) {
    await ctx.telegram.answerCallbackQuery(query.id, "❌ Channel not found.", true);
    await sendOrEdit(ctx.telegram, chatId, messageId, "❌ Channel not found.", {
      reply_markup: adminBackKeyboard(),
    });
    return;
  }

  await ctx.telegram.answerCallbackQuery(query.id, "🚫 Channel hidden.");

  const updated = await getAdminChannel(ctx.env, channelId);
  if (updated) {
    await showAdminChannel(ctx, chatId, messageId, updated);
  } else {
    await showNextAfterAction(ctx, chatId, messageId, userId, previous.status);
  }
}

export async function handleMarkScam(
  ctx: BotContext,
  query: TelegramCallbackQuery,
  chatId: number,
  messageId: number | undefined,
  userId: number,
  channelId: number,
): Promise<void> {
  if (!(await ensureAdmin(ctx, chatId, messageId, userId))) {
    await ctx.telegram.answerCallbackQuery(query.id, ADMIN_ONLY_TEXT, true);
    return;
  }

  const previous = await setChannelStatus(ctx.env, channelId, "rejected");
  if (!previous) {
    await ctx.telegram.answerCallbackQuery(query.id, "❌ Channel not found.", true);
    return;
  }
  
  await ctx.env.DB.prepare("UPDATE channels SET is_scam = 1 WHERE id = ?").bind(channelId).run();

  await ctx.telegram.answerCallbackQuery(query.id, "🚫 Channel marked as SCAM and rejected.");

  const updated = await getAdminChannel(ctx.env, channelId);
  if (updated) {
    await showAdminChannel(ctx, chatId, messageId, updated);
  } else {
    await showNextAfterAction(ctx, chatId, messageId, userId, previous.status);
  }
}

export async function handleAskVerify(
  ctx: BotContext,
  query: TelegramCallbackQuery,
  chatId: number,
  messageId: number | undefined,
  userId: number,
  channelId: number,
): Promise<void> {
  if (!(await ensureAdmin(ctx, chatId, messageId, userId))) {
    await ctx.telegram.answerCallbackQuery(query.id, ADMIN_ONLY_TEXT, true);
    return;
  }

  const channel = await getAdminChannel(ctx.env, channelId);
  if (!channel) {
    await ctx.telegram.answerCallbackQuery(query.id, "❌ Channel not found.", true);
    return;
  }

  const verificationCode = channel.verification_code;
  if (!verificationCode) {
    await ctx.telegram.answerCallbackQuery(query.id, "❌ No verification code found.", true);
    return;
  }

  const submitterId = channel.submitted_by || channel.owner_telegram_id || channel.owner_user_id;
  if (!submitterId) {
    await ctx.telegram.answerCallbackQuery(query.id, "❌ No submitter found to ask.", true);
    return;
  }

  const msg = [
    "🔐 <b>Ownership Verification Required</b>",
    "",
    `Your channel <b>${channel.title || channel.channel_username}</b> requires ownership verification.`,
    "",
    "Please add this exact code to your channel's description / about section:",
    `<b>🔐 Verification:</b> <code>${verificationCode}</code>`,
    "",
    "After adding it, click the button below to verify.",
  ].join("\n");

  try {
    await ctx.telegram.sendMessage(submitterId, msg, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "✅ Verify Now", callback_data: `verify_now:${channelId}` }]],
      },
    });
    await ctx.telegram.answerCallbackQuery(query.id, "✅ Verification request sent.", true);
  } catch (err) {
    console.error("Failed to send verify request:", err);
    await ctx.telegram.answerCallbackQuery(query.id, "❌ Failed to send request to user.", true);
  }
}

export async function handleMarkUnverified(
  ctx: BotContext,
  query: TelegramCallbackQuery,
  chatId: number,
  messageId: number | undefined,
  userId: number,
  channelId: number,
): Promise<void> {
  if (!(await ensureAdmin(ctx, chatId, messageId, userId))) {
    await ctx.telegram.answerCallbackQuery(query.id, ADMIN_ONLY_TEXT, true);
    return;
  }

  console.log("Admin channel id:", channelId);
  const channel = await markChannelUnverified(ctx.env, channelId);
  if (!channel) {
    await ctx.telegram.answerCallbackQuery(query.id, "❌ Channel not found.", true);
    await sendOrEdit(ctx.telegram, chatId, messageId, "❌ Channel not found.", {
      reply_markup: adminBackKeyboard(),
    });
    return;
  }

  await ctx.telegram.answerCallbackQuery(query.id, "☆ Verification removed.");
  await showAdminChannel(ctx, chatId, messageId, channel);
}

export async function handleMarkOwnerVerified(
  ctx: BotContext,
  query: TelegramCallbackQuery,
  chatId: number,
  messageId: number | undefined,
  userId: number,
  channelId: number,
): Promise<void> {
  if (!(await ensureAdmin(ctx, chatId, messageId, userId))) {
    await ctx.telegram.answerCallbackQuery(query.id, ADMIN_ONLY_TEXT, true);
    return;
  }

  console.log("Admin channel id:", channelId);
  const channel = await markChannelOwnerVerified(ctx.env, channelId);
  if (!channel) {
    await ctx.telegram.answerCallbackQuery(query.id, "❌ Channel not found.", true);
    await sendOrEdit(ctx.telegram, chatId, messageId, "❌ Channel not found.", {
      reply_markup: adminBackKeyboard(),
    });
    return;
  }

  await ctx.telegram.answerCallbackQuery(query.id, "🔐 Owner verified.");
  await showAdminChannel(ctx, chatId, messageId, channel);
}

export async function handleRemoveChannel(
  ctx: BotContext,
  chatId: number,
  messageId: number | undefined,
  userId: number,
  channelId: number,
): Promise<void> {
  if (!(await ensureAdmin(ctx, chatId, messageId, userId))) {
    return;
  }

  console.log("Admin channel id:", channelId);
  const previous = await removeChannel(ctx.env, channelId);
  if (!previous) {
    await sendOrEdit(ctx.telegram, chatId, messageId, "❌ Channel not found.", {
      reply_markup: adminBackKeyboard(),
    });
    return;
  }

  await showNextAfterAction(ctx, chatId, messageId, userId, previous.status);
}

export async function handleAdminSearchPrompt(
  ctx: BotContext,
  chatId: number,
  messageId: number | undefined,
  userId: number,
): Promise<void> {
  if (!(await ensureAdmin(ctx, chatId, messageId, userId))) {
    return;
  }

  await setAdminState(ctx.env, userId, "search_wait");
  await sendOrEdit(ctx.telegram, chatId, messageId, adminSearchPromptText(), {
    reply_markup: adminBackKeyboard(),
  });
}

export async function handleBroadcastPrompt(
  ctx: BotContext,
  chatId: number,
  messageId: number | undefined,
  userId: number,
): Promise<void> {
  if (!(await ensureAdmin(ctx, chatId, messageId, userId))) {
    return;
  }

  await setAdminState(ctx.env, userId, "broadcast_wait");
  await sendOrEdit(ctx.telegram, chatId, messageId, broadcastPromptText(), {
    reply_markup: adminBackKeyboard(),
  });
}

export async function handleBroadcastSend(
  ctx: BotContext,
  chatId: number,
  messageId: number | undefined,
  userId: number,
): Promise<void> {
  if (!(await ensureAdmin(ctx, chatId, messageId, userId))) {
    return;
  }

  const state = await getAdminState(ctx.env, userId);
  if (state?.mode !== "broadcast_confirm" || !state.payload) {
    await sendOrEdit(ctx.telegram, chatId, messageId, "No broadcast message is waiting to be sent.", {
      reply_markup: adminBackKeyboard(),
    });
    return;
  }

  const recipients = await listBroadcastUsers(ctx.env);
  await sendOrEdit(ctx.telegram, chatId, messageId, `📢 Broadcasting to ${recipients.length} users...`);

  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    try {
      await ctx.telegram.sendMessage(recipient, state.payload, {
        disable_web_page_preview: true,
      });
      sent += 1;
    } catch (error) {
      failed += 1;
      console.warn("Broadcast message failed.", { recipient, error });
    }
  }

  await clearAdminState(ctx.env, userId);
  await sendOrEdit(
    ctx.telegram,
    chatId,
    messageId,
    ["📢 Broadcast complete.", "", `✅ Sent: ${sent}`, `❌ Failed: ${failed}`].join("\n"),
    { reply_markup: adminMenuKeyboard() },
  );
}

export async function handleBroadcastCancel(
  ctx: BotContext,
  chatId: number,
  messageId: number | undefined,
  userId: number,
): Promise<void> {
  if (!(await ensureAdmin(ctx, chatId, messageId, userId))) {
    return;
  }

  await clearAdminState(ctx.env, userId);
  await sendOrEdit(ctx.telegram, chatId, messageId, "❌ Broadcast cancelled.", {
    reply_markup: adminMenuKeyboard(),
  });
}

export async function handleOpenReports(
  ctx: BotContext,
  chatId: number,
  messageId: number | undefined,
  userId: number,
): Promise<void> {
  if (!(await ensureAdmin(ctx, chatId, messageId, userId))) {
    return;
  }

  const reports = await listOpenReports(ctx.env, 10);

  await sendOrEdit(ctx.telegram, chatId, messageId, openReportsText(reports), {
    reply_markup: openReportsKeyboard(reports),
  });
}

export async function handleResolveReport(
  ctx: BotContext,
  chatId: number,
  messageId: number | undefined,
  userId: number,
  reportId: number,
): Promise<void> {
  if (!(await ensureAdmin(ctx, chatId, messageId, userId))) {
    return;
  }

  await resolveReport(ctx.env, reportId);
  await handleOpenReports(ctx, chatId, messageId, userId);
}

export async function handleAdminPostLeaderboard(
  ctx: BotContext,
  chatId: number,
  messageId: number | undefined,
  userId: number,
): Promise<void> {
  if (!(await ensureAdmin(ctx, chatId, messageId, userId))) {
    return;
  }

  const result = await postWeeklyLeaderboard(ctx.env);
  const text = result.status === "posted"
    ? `✅ Leaderboard posted to ${publicPostChannel(ctx.env)}.`
    : result.status === "empty"
      ? "No approved channels available for leaderboard."
      : `❌ Failed to post leaderboard.\nReason: ${result.description}`;

  await sendOrEdit(ctx.telegram, chatId, messageId, text, {
    reply_markup: adminBackKeyboard(),
  });
}

async function showStatusPage(
  ctx: BotContext,
  chatId: number,
  messageId: number | undefined,
  userId: number,
  status: Channel["status"],
  page: number,
): Promise<void> {
  if (!(await ensureAdmin(ctx, chatId, messageId, userId))) {
    return;
  }

  if (status !== "pending" && status !== "approved" && status !== "hidden") {
    await handleAdminPanel(ctx, chatId, messageId, userId);
    return;
  }

  const safePage = Math.max(0, page);
  const rows = await listAdminChannelsByStatus(
    ctx.env,
    status,
    ADMIN_PAGE_SIZE + 1,
    safePage * ADMIN_PAGE_SIZE,
  );
  const channels = rows.slice(0, ADMIN_PAGE_SIZE);
  const hasNext = rows.length > ADMIN_PAGE_SIZE;
  const title = status === "pending"
    ? "⏳ 𝗣𝗲𝗻𝗱𝗶𝗻𝗴 𝗖𝗵𝗮𝗻𝗻𝗲𝗹𝘀"
    : status === "approved"
      ? "✅ 𝗔𝗽𝗽𝗿𝗼𝘃𝗲𝗱 𝗖𝗵𝗮𝗻𝗻𝗲𝗹𝘀"
      : "🚫 𝗛𝗶𝗱𝗱𝗲𝗻 𝗖𝗵𝗮𝗻𝗻𝗲𝗹𝘀";

  await sendOrEdit(ctx.telegram, chatId, messageId, adminStatusListText(title, channels, safePage, hasNext), {
    reply_markup: adminStatusListKeyboard(status, channels, safePage, hasNext),
  });
}

async function showAdminChannel(
  ctx: BotContext,
  chatId: number,
  messageId: number | undefined,
  channel: Channel,
): Promise<void> {
  await sendOrEdit(ctx.telegram, chatId, messageId, adminChannelText("", channel), {
    reply_markup: keyboardForChannel(channel),
    disable_web_page_preview: true,
  });
}

function keyboardForChannel(channel: Channel): TelegramInlineKeyboardMarkup {
  if (channel.status === "pending") {
    return pendingChannelKeyboard(channel.id);
  }

  if (channel.status === "approved") {
    return approvedChannelKeyboard(channel.id);
  }

  if (channel.status === "hidden") {
    return hiddenChannelKeyboard(channel.id);
  }

  return rejectedChannelKeyboard(channel.id);
}

async function showNextAfterAction(
  ctx: BotContext,
  chatId: number,
  messageId: number | undefined,
  userId: number,
  previousStatus: Channel["status"],
): Promise<void> {
  if (previousStatus === "pending") {
    await handlePendingSubmissions(ctx, chatId, messageId, userId);
    return;
  }

  if (previousStatus === "hidden") {
    await handleHiddenChannels(ctx, chatId, messageId, userId);
    return;
  }

  if (previousStatus === "approved") {
    await handleApprovedChannels(ctx, chatId, messageId, userId);
    return;
  }

  await handleAdminPanel(ctx, chatId, messageId, userId);
}

async function notifyOwner(
  ctx: BotContext,
  ownerId: number | null | undefined,
  text: string,
): Promise<void> {
  if (!ownerId) {
    return;
  }

  try {
    await ctx.telegram.sendMessage(ownerId, text);
  } catch (error) {
    console.warn("Could not notify channel owner.", { ownerId, error });
  }
}

async function announceApprovedChannel(
  ctx: BotContext,
  channel: Channel,
  adminChatId: number,
): Promise<void> {
  const destination = publicPostChannel(ctx.env);
  if (!destination) {
    console.warn("Approved channel announcement skipped: PUBLIC_POST_CHANNEL is not configured.");
    return;
  }

  const result = await ctx.telegram.sendMessage(destination, formatApprovedChannelPost(channel), {
    reply_markup: publicPostKeyboard(channel, ctx.env.BOT_USERNAME),
    disable_web_page_preview: true,
  });

  if (!result.ok) {
    const description = result.description ?? "Unknown Telegram API error";
    console.error("Approved channel announcement failed:", { channelId: channel.id, description });
    try {
      await ctx.telegram.sendMessage(
        adminChatId,
        `⚠️ Channel approved, but the public announcement failed.\nReason: ${description}`,
      );
    } catch (notifyError) {
      console.warn("Could not notify admin of announcement failure.", notifyError);
    }
  }
}

async function ensureAdmin(
  ctx: BotContext,
  chatId: number,
  messageId: number | undefined,
  userId: number,
): Promise<boolean> {
  if (isAdmin(ctx, userId)) {
    return true;
  }

  await sendOrEdit(ctx.telegram, chatId, messageId, ADMIN_ONLY_TEXT);
  return false;
}

async function safeClearAdminState(ctx: BotContext, userId: number): Promise<void> {
  try {
    await clearAdminState(ctx.env, userId);
  } catch (error) {
    console.warn("Could not clear admin state.", error);
  }
}

function isAdmin(ctx: BotContext, userId: number): boolean {
  return ctx.adminIds.has(userId);
}

function parseAdminAction(data: string): AdminAction | null {
  switch (data) {
    case "admin":
    case "admin_back":
    case "a:m":
      return { kind: "menu" };
    case "admin_stats":
    case "a:s":
      return { kind: "stats" };
    case "admin_pending":
    case "a:p":
    case "admin:pending":
      return { kind: "pending" };
    case "admin_approved":
    case "a:a":
      return { kind: "approved" };
    case "admin_hidden":
    case "a:h":
      return { kind: "hidden" };
    case "a:v":
      return { kind: "verified" };
    case "a:b":
      return { kind: "broadcast" };
    case "a:bs":
      return { kind: "broadcast_send" };
    case "a:bx":
      return { kind: "broadcast_cancel" };
    case "a:q":
      return { kind: "search" };
    case "a:rp":
    case "admin:reports":
      return { kind: "reports" };
    case "admin_post_leaderboard":
    case "postleaderboard_now":
      return { kind: "post_leaderboard" };
    default:
      break;
  }

  const pageMatch = /^page:admin_(pending|approved|hidden):(\d+)$/.exec(data);
  if (pageMatch) {
    return {
      kind: "page",
      status: pageMatch[1] as "pending" | "approved" | "hidden",
      page: Number(pageMatch[2]),
    };
  }

  const canonicalMatch = /^admin_(channel|approve|reject|hide|scam|verify|unverify|owner_verify):(\d+)$/.exec(data);
  if (canonicalMatch) {
    const id = positiveId(canonicalMatch[2]);
    if (!id) {
      return null;
    }

    const kindByAction = {
      channel: "channel",
      approve: "approve",
      reject: "reject",
      hide: "hide",
      scam: "scam",
      verify: "verify",
      unverify: "unverify",
      owner_verify: "owner_verify",
    } as const;
    return { kind: kindByAction[canonicalMatch[1] as keyof typeof kindByAction], id };
  }

  const shortMatch = /^a:(ap|rj|hd|mv|ov|rm|ch|rr):(\d+)$/.exec(data);
  if (shortMatch) {
    const id = positiveId(shortMatch[2]);
    if (!id) {
      return null;
    }

    switch (shortMatch[1]) {
      case "ap":
        return { kind: "approve", id };
      case "rj":
        return { kind: "reject", id };
      case "hd":
        return { kind: "hide", id };
      case "mv":
        return { kind: "verify", id };
      case "ov":
        return { kind: "owner_verify", id };
      case "rm":
        return { kind: "remove", id };
      case "ch":
        return { kind: "channel", id };
      case "rr":
        return { kind: "resolve_report", id };
    }
  }

  const legacyMatch = /^admin:(sub|approve|reject|hide|resolve_report):(\d+)$/.exec(data);
  if (!legacyMatch) {
    return null;
  }

  const id = positiveId(legacyMatch[2]);
  if (!id) {
    return null;
  }

  switch (legacyMatch[1]) {
    case "sub":
      return { kind: "channel", id };
    case "approve":
      return { kind: "approve", id };
    case "reject":
      return { kind: "reject", id };
    case "hide":
      return { kind: "hide", id };
    case "resolve_report":
      return { kind: "resolve_report", id };
    default:
      return null;
  }
}

function positiveId(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function handleTestReviewChannelCommand(
  ctx: BotContext,
  message: TelegramMessage,
): Promise<void> {
  const userId = message.from?.id;
  if (!userId || !isAdmin(ctx, userId)) {
    await ctx.telegram.sendMessage(message.chat.id, ADMIN_ONLY_TEXT);
    return;
  }

  const reviewChatId = getAdminReviewChannelId(ctx.env);
  if (!reviewChatId) {
    await ctx.telegram.sendMessage(
      message.chat.id,
      "❌ Failed to send to admin review channel.\nReason: ADMIN_REVIEW_CHANNEL_ID is not configured.",
    );
    return;
  }

  const result = await sendAdminReviewNotification(
    ctx.env,
    ctx.telegram,
    "✅ NexChannel Finder admin review channel test successful.",
  );

  if (!result.ok) {
    await ctx.telegram.sendMessage(
      message.chat.id,
      `❌ Failed to send to admin review channel.\nReason: ${result.description ?? "Unknown Telegram API error"}`,
    );
    return;
  }

  await ctx.telegram.sendMessage(message.chat.id, "✅ Test message sent to admin review channel.");
}

export async function handleCheckReviewChannelCommand(
  ctx: BotContext,
  message: TelegramMessage,
): Promise<void> {
  const userId = message.from?.id;
  if (!userId || !isAdmin(ctx, userId)) {
    await ctx.telegram.sendMessage(message.chat.id, ADMIN_ONLY_TEXT);
    return;
  }

  const reviewChatId = getAdminReviewChannelId(ctx.env);
  if (!reviewChatId) {
    await ctx.telegram.sendMessage(message.chat.id, [
      "Admin Review Channel Check",
      "",
      "Channel ID: not configured",
      "Channel title: Unknown",
      "Bot username: Unknown",
      "Bot status: unknown",
      "Can send messages: no",
      "Error: ADMIN_REVIEW_CHANNEL_ID is not configured.",
    ].join("\n"));
    return;
  }

  let error = "";
  let channelTitle = "Unknown";
  let botUsername = "Unknown";
  let botStatus = "unknown";
  let canSendMessages = "no";

  const botData = await ctx.telegram.getMe();
  if (!botData.ok || !botData.result) {
    error = botData.description ?? "getMe failed";
  } else {
    botUsername = botData.result.username ? `@${botData.result.username}` : "Unknown";

    const chatData = await ctx.telegram.getChat(reviewChatId);
    if (!chatData.ok || !chatData.result) {
      error = chatData.description ?? "getChat failed";
    } else {
      channelTitle = chatData.result.title ?? "Unknown";

      const memberData = await ctx.telegram.getChatMember(reviewChatId, botData.result.id);
      if (!memberData.ok || !memberData.result) {
        error = memberData.description ?? "getChatMember failed";
      } else {
        botStatus = memberData.result.status;
        canSendMessages = canSendReviewChannelMessages(memberData.result) ? "yes" : "no";
      }
    }
  }

  await ctx.telegram.sendMessage(message.chat.id, [
    "Admin Review Channel Check",
    "",
    `Channel ID: ${reviewChatId}`,
    `Channel title: ${channelTitle}`,
    `Bot username: ${botUsername}`,
    `Bot status: ${botStatus}`,
    `Can send messages: ${canSendMessages}`,
    error ? `Error: ${error}` : "Error: none",
  ].join("\n"));
}

export async function handleSelfTestCommand(ctx: BotContext, message: TelegramMessage): Promise<void> {
  const userId = message.from?.id;
  if (!userId || !(await ensureAdmin(ctx, message.chat.id, undefined, userId))) {
    return;
  }
  const { ensureSchema } = await import("../db");
  await ensureSchema(ctx.env);
  await ctx.telegram.sendMessage(message.chat.id, "✅ Self-test completed. Schema self-healing triggered.");
}

export async function handleDebugLastErrorCommand(ctx: BotContext, message: TelegramMessage): Promise<void> {
  const userId = message.from?.id;
  if (!userId || !(await ensureAdmin(ctx, message.chat.id, undefined, userId))) {
    return;
  }
  const { getLastError } = await import("../db");
  const err = getLastError();
  await ctx.telegram.sendMessage(message.chat.id, `🐛 <b>Last Error:</b>\n\n<pre>${err}</pre>`, { parse_mode: "HTML" });
}
