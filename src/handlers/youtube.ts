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
import { getAdminReviewChannelId, getYoutubeChannelLink, sendOrEdit } from "../telegram";
import type { BotContext, TelegramCallbackQuery, TelegramMessage } from "../types";
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

/**
 * Handle the "🔄 Check Status" callback (youtube_status).
 */
export async function handleYoutubeStatus(
  ctx: BotContext,
  query: TelegramCallbackQuery,
  chatId: number,
  messageId: number | undefined,
): Promise<void> {
  const telegramId = query.from.id;
  console.log("YouTube callback:", "youtube_status");

  await ctx.telegram.answerCallbackQuery(query.id);

  try {
    const record = await getYoutubeVerification(ctx.env, telegramId);
    const status = record?.status ?? "not_started";
    console.log("YouTube verification status:", status);

    switch (status) {
      case "approved": {
        await sendOrEdit(ctx.telegram, chatId, messageId, youtubeStatusApprovedText(), {
          reply_markup: youtubeHomeKeyboard(),
          disable_web_page_preview: true,
        });
        break;
      }
      case "pending":
      case "pending_photo": {
        await sendOrEdit(ctx.telegram, chatId, messageId, youtubeStatusPendingText(), {
          reply_markup: backToMenuKeyboard(),
          disable_web_page_preview: true,
        });
        break;
      }
      case "rejected": {
        await sendOrEdit(ctx.telegram, chatId, messageId, youtubeStatusRejectedText(), {
          reply_markup: youtubeRetryKeyboard(getYoutubeChannelLink(ctx.env)),
          disable_web_page_preview: true,
        });
        break;
      }
      default: {
        await showYoutubeLockPage(ctx, chatId, telegramId, messageId);
        break;
      }
    }
  } catch (error) {
    console.error("YouTube verification error:", error);
    await sendOrEdit(ctx.telegram, chatId, messageId, "❌ Something went wrong. Please try again.", {
      reply_markup: backToMenuKeyboard(),
    });
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
    await ctx.telegram.sendMessage(message.chat.id, "Usage: /checkyt <telegram_id>");
    return;
  }

  const record = await getYoutubeVerification(ctx.env, targetId);
  const verified = await isUserYoutubeVerified(ctx.env, targetId);

  await ctx.telegram.sendMessage(
    message.chat.id,
    [
      "▶️ YouTube Verification Status",
      "",
      `User ID: ${targetId}`,
      `Status: ${record?.status ?? "not_started"}`,
      `YouTube Verified: ${verified ? "yes" : "no"}`,
      `Clicked At: ${record?.clicked_at ?? "—"}`,
      `Submitted At: ${record?.submitted_at ?? "—"}`,
      `Approved At: ${record?.approved_at ?? "—"}`,
      `Rejected At: ${record?.rejected_at ?? "—"}`,
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

/**
 * Command handler for /youtubestatus (user's own status).
 */
export async function handleYoutubeStatusCommand(
  ctx: BotContext,
  message: TelegramMessage,
): Promise<void> {
  const telegramId = message.from?.id;
  if (!telegramId) {
    return;
  }

  const record = await getYoutubeVerification(ctx.env, telegramId);
  const status = record?.status ?? "not_started";
  console.log("YouTube verification status:", status);

  switch (status) {
    case "approved": {
      await ctx.telegram.sendMessage(message.chat.id, youtubeStatusApprovedText(), {
        reply_markup: youtubeHomeKeyboard(),
      });
      break;
    }
    case "pending":
    case "pending_photo": {
      await ctx.telegram.sendMessage(message.chat.id, youtubeStatusPendingText());
      break;
    }
    case "rejected": {
      await ctx.telegram.sendMessage(message.chat.id, youtubeStatusRejectedText(), {
        reply_markup: youtubeRetryKeyboard(getYoutubeChannelLink(ctx.env)),
      });
      break;
    }
    default: {
      await showYoutubeLockPage(ctx, message.chat.id, telegramId);
      break;
    }
  }
}
