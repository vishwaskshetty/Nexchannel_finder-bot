/**
 * YouTube verification handler for NexChannel Finder Bot.
 *
 * Flow:
 *  1. User sees YouTube lock page → clicks "▶️ Subscribe YouTube" (URL button)
 *  2. User clicks "✅ I Subscribed" → bot records clicked_at, sets status=clicked
 *     - If < 30s since clicked_at → alert "wait 30 seconds"
 *     - If >= 30s → set status=pending_photo, ask for screenshot
 *  3. User sends photo → bot saves proof, sets status=pending, sends to admin review channel
 *  4. Admin clicks ✅ Approve / ❌ Reject → user is notified and status updated
 */

import {
  getYoutubeVerification,
  isUserYoutubeVerified,
  resetYoutubeVerification,
  setYoutubeApproved,
  setYoutubeClicked,
  setYoutubePendingPhoto,
  setYoutubeProofSubmitted,
  setYoutubeRejected,
  setYoutubeRetry,
  upsertYoutubeVerification,
} from "../db";
import { getAdminReviewChannelId, getYoutubeChannelLink, sendOrEdit, isAdmin } from "../telegram";
import type { BotContext, Env, TelegramCallbackQuery, TelegramMessage } from "../types";
import {
  backToMenuKeyboard,
  youtubeAdminApprovedCaption,
  youtubeAdminRejectedCaption,
  youtubeAdminReviewCaption,
  youtubeAdminReviewKeyboard,
  youtubeApprovedText,
  youtubeHomeKeyboard,
  youtubeLockKeyboard,
  youtubeLockText,
  youtubeProofPendingText,
  youtubeRejectedText,
  youtubeRetryKeyboard,
  youtubeSendPhotoText,
  youtubeStatusApprovedText,
  youtubeStatusPendingText,
  youtubeStatusRejectedText,
  youtubeWaitText,
} from "../ui";

/** 30 seconds in milliseconds */
const WAIT_MS = 30_000;

/** Show the YouTube lock / subscription required page. */
export async function showYoutubeLockPage(
  ctx: BotContext,
  chatId: number,
  telegramId: number,
  messageId?: number,
): Promise<void> {
  console.log("YouTube verification status: show_lock_page");

  // Create the verification record if it doesn't exist yet
  try {
    await upsertYoutubeVerification(ctx.env, telegramId);
  } catch (error) {
    console.error("YouTube verification error:", error);
  }

  const youtubeLink = getYoutubeChannelLink(ctx.env);
  await sendOrEdit(ctx.telegram, chatId, messageId, youtubeLockText(), {
    reply_markup: youtubeLockKeyboard(youtubeLink),
    disable_web_page_preview: true,
  });
}

/**
 * Check whether the user has completed YouTube verification.
 * Admins always bypass this check.
 * Returns true if the user may proceed.
 */
export async function checkYoutubeVerification(
  ctx: BotContext,
  chatId: number,
  telegramId: number,
  messageId?: number,
): Promise<boolean> {
  if (ctx.adminIds.has(telegramId)) {
    return true;
  }

  try {
    const verified = await isUserYoutubeVerified(ctx.env, telegramId);
    if (verified) {
      return true;
    }

    await showYoutubeLockPage(ctx, chatId, telegramId, messageId);
    return false;
  } catch (error) {
    console.error("YouTube verification error:", error);
    // On DB error, allow access to prevent total lockout
    return true;
  }
}

export async function isYouTubeVerified(env: Env, telegramId: number): Promise<boolean> {
  if (isAdmin(telegramId, env)) return true;

  try {
    const userRow = await env.DB.prepare("SELECT youtube_verified FROM users WHERE telegram_id = ?").bind(telegramId).first();
    if (userRow && (userRow as any).youtube_verified === 1) return true;
  } catch (e) {
    // Ignore error if column missing
  }

  try {
    const ytRow = await env.DB.prepare("SELECT status FROM youtube_verifications WHERE telegram_id = ?").bind(telegramId).first();
    if (ytRow && (ytRow as any).status === "approved") return true;
  } catch (e) {
    // Ignore error
  }

  return false;
}

export async function showYouTubeRequiredForSubmit(chatId: number, telegramId: number, env: Env): Promise<void> {
  const text = "🔒 𝗬𝗼𝘂𝗧𝘂𝗯𝗲 𝗩𝗲𝗿𝗶𝗳𝗶𝗰𝗮𝘁𝗶𝗼𝗻 𝗥𝗲𝗾𝘂𝗶𝗿𝗲𝗱\n\n━━━━━━━━━━━━━━\n\nTo add your Telegram channel in NexChannel Finder, please subscribe to our YouTube channel first.\n\nAfter subscribing:\n1️⃣ Click the YouTube button\n2️⃣ Subscribe to the channel\n3️⃣ Come back and click \"✅ I Subscribed\"\n4️⃣ Send screenshot proof\n5️⃣ Wait for admin approval\n\n━━━━━━━━━━━━━━\n\nAfter approval, you can submit your channel.";
  const buttons = [
    [{ text: "▶️ Subscribe YouTube", url: env.YOUTUBE_CHANNEL_LINK }],
    [{ text: "✅ I Subscribed", callback_data: "youtube_subscribed_check" }],
    [{ text: "🔄 Check Status", callback_data: "youtube_status" }],
    [{ text: "🏠 Home", callback_data: "home" }]
  ];

  try {
    // We also make sure the user exists in youtube_verifications
    await upsertYoutubeVerification(env, telegramId);
  } catch (e) {
    console.error("Failed to upsert youtube verification:", e);
  }

  const { TelegramClient } = await import("../telegram");
  const telegram = new TelegramClient(env.BOT_TOKEN);
  await telegram.sendMessage(chatId, text, {
    reply_markup: { inline_keyboard: buttons },
    disable_web_page_preview: true,
  });
}

/**
 * Handle the "✅ I Subscribed" callback (youtube_subscribed_check).
 */
export async function handleYoutubeSubscribedCheck(
  ctx: BotContext,
  query: TelegramCallbackQuery,
  chatId: number,
  messageId: number | undefined,
): Promise<void> {
  const telegramId = query.from.id;
  console.log("YouTube callback:", "youtube_subscribed_check");

  try {
    const record = await getYoutubeVerification(ctx.env, telegramId);

    // If already approved
    if (record?.status === "approved") {
      await ctx.telegram.answerCallbackQuery(query.id, "✅ Already verified!", true);
      return;
    }

    // If proof already submitted and pending
    if (record?.status === "pending") {
      await ctx.telegram.answerCallbackQuery(query.id, "⏳ Your proof is under review. Please wait.", true);
      return;
    }

    // If pending photo — just show the prompt again
    if (record?.status === "pending_photo") {
      await ctx.telegram.answerCallbackQuery(query.id);
      await sendOrEdit(ctx.telegram, chatId, messageId, youtubeSendPhotoText(), {
        reply_markup: backToMenuKeyboard(),
        disable_web_page_preview: true,
      });
      return;
    }

    // Not clicked yet — record the click time
    if (!record?.clicked_at) {
      await setYoutubeClicked(ctx.env, telegramId);
      await ctx.telegram.answerCallbackQuery(query.id, "⏳ Please subscribe first and wait 30 seconds.", true);
      await sendOrEdit(ctx.telegram, chatId, messageId, youtubeWaitText(), {
        reply_markup: youtubeLockKeyboard(getYoutubeChannelLink(ctx.env)),
        disable_web_page_preview: true,
      });
      return;
    }

    // Check 30-second wait
    const clickedAt = new Date(record.clicked_at).getTime();
    const elapsedMs = Date.now() - clickedAt;

    if (elapsedMs < WAIT_MS) {
      const secondsLeft = Math.ceil((WAIT_MS - elapsedMs) / 1000);
      await ctx.telegram.answerCallbackQuery(
        query.id,
        `⏳ Please wait ${secondsLeft} more second(s) before continuing.`,
        true,
      );
      return;
    }

    // 30 seconds passed — ask for screenshot
    await setYoutubePendingPhoto(ctx.env, telegramId);
    await ctx.telegram.answerCallbackQuery(query.id);
    await sendOrEdit(ctx.telegram, chatId, messageId, youtubeSendPhotoText(), {
      reply_markup: backToMenuKeyboard(),
      disable_web_page_preview: true,
    });
  } catch (error) {
    console.error("YouTube verification error:", error);
    await ctx.telegram.answerCallbackQuery(query.id, "❌ Something went wrong. Please try again.", true);
  }
}

export async function handleYoutubeStatus(
  ctx: BotContext,
  query: TelegramCallbackQuery,
  chatId: number,
  messageId: number | undefined,
): Promise<void> {
  const telegramId = query.from.id;
  await ctx.telegram.answerCallbackQuery(query.id);
  await showYouTubeStatus(chatId, telegramId, ctx.env, messageId, ctx);
}

export async function showYouTubeStatus(
  chatId: number,
  telegramId: number,
  env: Env,
  messageId?: number,
  ctx?: BotContext,
): Promise<void> {
  console.log("YouTube status command:", telegramId);

  try {
    const { results } = await env.DB.prepare(
      "SELECT status, clicked_at, submitted_at, approved_at, rejected_at FROM youtube_verifications WHERE telegram_id = ?"
    ).bind(telegramId).all();
    const row = results[0] as any;
    console.log("YouTube status row:", row);

    let isUserVerified = false;
    try {
      const userRes = await env.DB.prepare("SELECT youtube_verified FROM users WHERE telegram_id = ?").bind(telegramId).first();
      if (userRes && (userRes as any).youtube_verified) {
        isUserVerified = true;
      }
    } catch (e) {
      // Ignore if users table doesn't have the column
    }

    let status = "not_started";
    if (row && row.status) {
      status = row.status;
    } else if (isUserVerified) {
      status = "approved";
    }

    let text = "";
    let buttons: any[][] = [];
    const youtubeLink = env.YOUTUBE_CHANNEL_LINK;

    if (ctx && ctx.adminIds.has(telegramId)) {
      text = "🛠 Admin account detected.\nYouTube verification is bypassed for admin.";
      buttons = [[{ text: "🏠 Home", callback_data: "home" }]];
    } else if (status === "approved") {
      text = "✅ 𝗬𝗼𝘂𝗧𝘂𝗯𝗲 𝗩𝗲𝗿𝗶𝗳𝗶𝗲𝗱\n\nYour YouTube subscription is approved.\n\nYou can now use NexChannel Finder Bot.";
      buttons = [[{ text: "🏠 Home", callback_data: "home" }]];
    } else if (status === "pending") {
      text = "⏳ 𝗣𝗿𝗼𝗼𝗳 𝗨𝗻𝗱𝗲𝗿 𝗥𝗲𝘃𝗶𝗲𝘄\n\nYour screenshot proof has been sent to admin.\n\nPlease wait for approval.";
      buttons = [
        [{ text: "🔄 Check Status", callback_data: "youtube_status" }],
        [{ text: "🏠 Home", callback_data: "home" }]
      ];
    } else if (status === "rejected") {
      text = "❌ 𝗣𝗿𝗼𝗼𝗳 𝗥𝗲𝗷𝗲𝗰𝘁𝗲𝗱\n\nPlease subscribe again and send a clear screenshot proof.";
      buttons = [
        [{ text: "▶️ Try Again", callback_data: "youtube_retry" }],
        [{ text: "🏠 Home", callback_data: "home" }]
      ];
    } else if (status === "clicked" || status === "pending_photo") {
      text = "📸 𝗣𝗿𝗼𝗼𝗳 𝗥𝗲𝗾𝘂𝗶𝗿𝗲𝗱\n\nPlease send a screenshot showing you subscribed to our YouTube channel.";
      buttons = [
        [{ text: "▶️ Subscribe YouTube", url: youtubeLink }],
        [{ text: "🔄 Check Status", callback_data: "youtube_status" }],
        [{ text: "🏠 Home", callback_data: "home" }]
      ];
    } else {
      text = "▶️ 𝗬𝗼𝘂𝗧𝘂𝗯𝗲 𝗦𝘁𝗮𝘁𝘂𝘀\n\n━━━━━━━━━━━━━━\n\n🧾 Status: Not Started\n\nPlease subscribe to our YouTube channel and submit proof.";
      buttons = [
        [{ text: "▶️ Subscribe YouTube", url: youtubeLink }],
        [{ text: "✅ I Subscribed", callback_data: "youtube_subscribed_check" }],
        [{ text: "🏠 Home", callback_data: "home" }]
      ];
    }

    if (messageId && ctx) {
      await ctx.telegram.editMessageText(chatId, messageId, text, {
        reply_markup: { inline_keyboard: buttons },
        disable_web_page_preview: true,
      });
    } else if (ctx) {
      await ctx.telegram.sendMessage(chatId, text, {
        reply_markup: { inline_keyboard: buttons },
        disable_web_page_preview: true,
      });
    }
  } catch (error) {
    console.error("YouTube status error:", error);
    if (ctx) {
      await ctx.telegram.sendMessage(chatId, "❌ YouTube status check failed. Please try again.");
    }
  }
}

/**
 * Handle the "▶️ Try Again" callback (youtube_retry).
 */
export async function handleYoutubeRetry(
  ctx: BotContext,
  query: TelegramCallbackQuery,
  chatId: number,
  messageId: number | undefined,
): Promise<void> {
  const telegramId = query.from.id;
  console.log("YouTube callback:", "youtube_retry");
  await ctx.telegram.answerCallbackQuery(query.id);

  try {
    await setYoutubeRetry(ctx.env, telegramId);
    await showYoutubeLockPage(ctx, chatId, telegramId, messageId);
  } catch (error) {
    console.error("YouTube verification error:", error);
    await sendOrEdit(ctx.telegram, chatId, messageId, "❌ Something went wrong. Please try again.", {
      reply_markup: backToMenuKeyboard(),
    });
  }
}

/**
 * Handle admin approve: yt_approve:<telegram_id>
 */
export async function handleYoutubeApprove(
  ctx: BotContext,
  query: TelegramCallbackQuery,
  targetUserId: number,
): Promise<void> {
  const adminId = query.from.id;
  console.log("YouTube callback:", `yt_approve:${targetUserId}`);
  console.log("Admin user:", adminId);

  if (!ctx.adminIds.has(adminId)) {
    await ctx.telegram.answerCallbackQuery(query.id, "❌ Admin access only.", true);
    return;
  }

  try {
    await setYoutubeApproved(ctx.env, targetUserId);
    await ctx.telegram.answerCallbackQuery(query.id, "✅ Approved");

    // Edit the admin review message caption to show approved
    if (query.message?.message_id && query.message.chat.id) {
      try {
        await ctx.telegram.call("editMessageCaption", {
          chat_id: String(query.message.chat.id),
          message_id: query.message.message_id,
          caption: youtubeAdminApprovedCaption(targetUserId),
        });
      } catch (editError) {
        console.warn("Could not edit admin review message:", editError);
      }
    }

    // Notify the user
    try {
      await ctx.telegram.sendMessage(targetUserId, youtubeApprovedText(), {
        reply_markup: youtubeHomeKeyboard(),
      });
    } catch (notifyError) {
      console.warn("Could not notify user of YouTube approval:", notifyError);
    }
  } catch (error) {
    console.error("YouTube verification error:", error);
    await ctx.telegram.answerCallbackQuery(query.id, "❌ Failed to approve. Check logs.", true);
  }
}

/**
 * Handle admin reject: yt_reject:<telegram_id>
 */
export async function handleYoutubeReject(
  ctx: BotContext,
  query: TelegramCallbackQuery,
  targetUserId: number,
): Promise<void> {
  const adminId = query.from.id;
  console.log("YouTube callback:", `yt_reject:${targetUserId}`);
  console.log("Admin user:", adminId);

  if (!ctx.adminIds.has(adminId)) {
    await ctx.telegram.answerCallbackQuery(query.id, "❌ Admin access only.", true);
    return;
  }

  try {
    await setYoutubeRejected(ctx.env, targetUserId);
    await ctx.telegram.answerCallbackQuery(query.id, "❌ Rejected");

    // Edit the admin review message caption to show rejected
    if (query.message?.message_id && query.message.chat.id) {
      try {
        await ctx.telegram.call("editMessageCaption", {
          chat_id: String(query.message.chat.id),
          message_id: query.message.message_id,
          caption: youtubeAdminRejectedCaption(targetUserId),
        });
      } catch (editError) {
        console.warn("Could not edit admin review message:", editError);
      }
    }

    // Notify the user
    try {
      await ctx.telegram.sendMessage(targetUserId, youtubeRejectedText(), {
        reply_markup: youtubeRetryKeyboard(getYoutubeChannelLink(ctx.env)),
      });
    } catch (notifyError) {
      console.warn("Could not notify user of YouTube rejection:", notifyError);
    }
  } catch (error) {
    console.error("YouTube verification error:", error);
    await ctx.telegram.answerCallbackQuery(query.id, "❌ Failed to reject. Check logs.", true);
  }
}

/**
 * Handle incoming photo messages for YouTube proof submission.
 * Called from message handler when user sends a photo.
 */
export async function handleYoutubePhotoProof(
  ctx: BotContext,
  message: TelegramMessage,
): Promise<boolean> {
  const telegramId = message.from?.id;
  if (!telegramId || !message.photo || message.photo.length === 0) {
    return false;
  }

  try {
    const record = await getYoutubeVerification(ctx.env, telegramId);
    if (record?.status !== "pending_photo") {
      return false;
    }

    console.log("YouTube proof photo received from:", telegramId);

    // Get the highest resolution photo (last in array)
    const photos = message.photo;
    const bestPhoto = photos[photos.length - 1];
    const fileId = bestPhoto.file_id;

    // Save proof and set status to pending
    await setYoutubeProofSubmitted(ctx.env, telegramId, fileId);

    // Confirm to the user
    await ctx.telegram.sendMessage(message.chat.id, youtubeProofPendingText(), {
      reply_markup: { inline_keyboard: [[{ text: "🔄 Check Status", callback_data: "youtube_status" }]] },
    });

    // Send proof to admin review channel
    const reviewChannelId = getAdminReviewChannelId(ctx.env);
    if (!reviewChannelId) {
      console.error("YouTube proof send failed: ADMIN_REVIEW_CHANNEL_ID not configured.");
      return true;
    }

    console.log("Sending YouTube proof to admin review:", reviewChannelId);

    const result = await ctx.telegram.sendPhoto(reviewChannelId, fileId, {
      caption: youtubeAdminReviewCaption(telegramId),
      reply_markup: youtubeAdminReviewKeyboard(telegramId),
    });

    if (!result.ok) {
      console.error("YouTube proof send failed:", result);
    }

    return true;
  } catch (error) {
    console.error("YouTube verification error:", error);
    return false;
  }
}

/**
 * Admin command: /checkyt <telegram_id>
 */
export async function handleCheckYtCommand(
  ctx: BotContext,
  message: TelegramMessage,
  args: string,
): Promise<void> {
  const adminId = message.from?.id;
  if (!adminId || !ctx.adminIds.has(adminId)) {
    await ctx.telegram.sendMessage(message.chat.id, "❌ Admin access only.");
    return;
  }

  const targetId = Number(args.trim());
  if (!Number.isInteger(targetId) || targetId <= 0) {
    await ctx.telegram.sendMessage(message.chat.id, "Usage: /checkyoutube <telegram_id>");
    return;
  }

  const record = await getYoutubeVerification(ctx.env, targetId);
  const verified = await isUserYoutubeVerified(ctx.env, targetId);

  await ctx.telegram.sendMessage(
    message.chat.id,
    [
      `User ID: ${targetId}`,
      `users.youtube_verified: ${verified ? 1 : 0}`,
      `youtube_verifications.status: ${record?.status ?? "not_started"}`,
      `clicked_at: ${record?.clicked_at ?? "—"}`,
      `submitted_at: ${record?.submitted_at ?? "—"}`,
      `approved_at: ${record?.approved_at ?? "—"}`,
      `rejected_at: ${record?.rejected_at ?? "—"}`,
    ].join("\n"),
  );
}

/**
 * Admin command: /resetyoutubeverify <telegram_id>
 */
export async function handleResetYoutubeVerifyCommand(
  ctx: BotContext,
  message: TelegramMessage,
  args: string,
): Promise<void> {
  const adminId = message.from?.id;
  if (!adminId || !ctx.adminIds.has(adminId)) {
    await ctx.telegram.sendMessage(message.chat.id, "❌ Admin access only.");
    return;
  }

  const targetId = Number(args.trim());
  if (!Number.isInteger(targetId) || targetId <= 0) {
    await ctx.telegram.sendMessage(message.chat.id, "Usage: /resetyoutubeverify <telegram_id>");
    return;
  }

  await resetYoutubeVerification(ctx.env, targetId);
  await ctx.telegram.sendMessage(
    message.chat.id,
    `✅ YouTube verification reset for ${targetId}`,
  );
}

export async function handleYoutubeStatusCommand(
  ctx: BotContext,
  message: TelegramMessage,
): Promise<void> {
  const telegramId = message.from?.id;
  if (!telegramId) {
    return;
  }
  await showYouTubeStatus(message.chat.id, telegramId, ctx.env, undefined, ctx);
}
