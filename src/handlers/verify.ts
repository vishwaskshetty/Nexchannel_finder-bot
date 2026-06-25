import {
  getAdminChannel,
  getLatestOwnershipVerificationChannelId,
  markOwnershipVerificationStatus,
} from "../db";
import { sendOrEdit } from "../telegram";
import type { BotContext, TelegramCallbackQuery } from "../types";
import { backHomeKeyboard } from "../ui";

export function isOwnershipVerificationCallbackData(data: string): boolean {
  return data.startsWith("verify_now:");
}

export async function handleOwnershipVerificationCallback(
  ctx: BotContext,
  query: TelegramCallbackQuery,
  chatId: number,
  messageId: number | undefined,
): Promise<void> {
  const data = query.data ?? "";
  
  if (data.startsWith("verify_now:")) {
    const channelId = Number(data.replace("verify_now:", ""));
    if (isNaN(channelId)) {
      await ctx.telegram.answerCallbackQuery(query.id, "Invalid verification request.", true);
      return;
    }
    await handleVerifyNow(ctx, query, chatId, messageId, channelId);
  }
}

async function handleVerifyNow(
  ctx: BotContext,
  query: TelegramCallbackQuery,
  chatId: number,
  messageId: number | undefined,
  channelId: number,
): Promise<void> {
  const channel = await getAdminChannel(ctx.env, channelId);

  if (!channel) {
    await ctx.telegram.answerCallbackQuery(query.id, "Channel not found.", true);
    return;
  }
  
  const submitterId = channel.submitted_by || channel.owner_telegram_id || channel.owner_user_id;
  if (submitterId !== query.from.id) {
    await ctx.telegram.answerCallbackQuery(query.id, "You are not authorized to verify this channel.", true);
    return;
  }
  
  const verificationCode = channel.verification_code;
  if (!verificationCode) {
    await ctx.telegram.answerCallbackQuery(query.id, "No verification code exists for this channel.", true);
    return;
  }

  try {
    // Try to get chat details. Use username if available and public, otherwise use ID (requires bot to be in the channel)
    const targetChatId = (channel.channel_type === "public" && channel.channel_username) 
      ? channel.channel_username 
      : channel.id;
      
    const chatData = await ctx.telegram.getChat(targetChatId);
    
    if (!chatData.ok || !chatData.result) {
      if (channel.channel_type === "private") {
        await ctx.telegram.answerCallbackQuery(query.id, "Failed to read channel. Make sure the bot is an admin in the private channel.", true);
      } else {
        await ctx.telegram.answerCallbackQuery(query.id, `Failed to fetch channel details: ${chatData.description}`, true);
      }
      return;
    }
    
    const description = chatData.result.description ?? "";
    
    if (!description.includes(verificationCode)) {
      await ctx.telegram.answerCallbackQuery(query.id, `Code ${verificationCode} not found in channel description.`, true);
      await sendOrEdit(
        ctx.telegram,
        chatId,
        messageId,
        [
          "❌ Verification Failed",
          "",
          `The verification code <code>${verificationCode}</code> was not found in your channel's description.`,
          "",
          "Please add it to the description and try again.",
        ].join("\n"),
        { 
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [[{ text: "🔄 Try Again", callback_data: `verify_now:${channelId}` }]]
          }
        }
      );
      return;
    }

    // Success
    await markOwnershipVerificationStatus(ctx.env, query.from.id, channelId, "verified", "auto");
    await ctx.telegram.answerCallbackQuery(query.id, "✅ Ownership verified successfully!", true);
    await sendOrEdit(
      ctx.telegram,
      chatId,
      messageId,
      [
        "✅ <b>Ownership Verified</b>",
        "",
        "Your channel ownership has been successfully verified.",
        "You can now remove the code from your channel description.",
        "",
        "Status: ⏳ Waiting for admin approval (if not already approved)."
      ].join("\n"),
      { parse_mode: "HTML" }
    );
  } catch (error) {
    console.error("Ownership verification check failed.", { channelId, error });
    await ctx.telegram.answerCallbackQuery(query.id, "An error occurred while checking. Please try again.", true);
  }
}
