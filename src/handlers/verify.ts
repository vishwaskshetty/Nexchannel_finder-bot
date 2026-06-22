import {
  getAdminChannel,
  getLatestOwnershipVerificationChannelId,
  markOwnershipVerificationStatus,
} from "../db";
import { sendOrEdit } from "../telegram";
import type { BotContext, TelegramCallbackQuery } from "../types";
import { backHomeKeyboard } from "../ui";

export function isOwnershipVerificationCallbackData(data: string): boolean {
  return data.startsWith("ov:") || data === "verify_added_bot" || data === "verify_manual_proof";
}

export async function handleOwnershipVerificationCallback(
  ctx: BotContext,
  query: TelegramCallbackQuery,
  chatId: number,
  messageId: number | undefined,
): Promise<void> {
  let data = query.data ?? "";
  if (data === "verify_added_bot" || data === "verify_manual_proof") {
    const channelId = await getLatestOwnershipVerificationChannelId(ctx.env, query.from.id);
    if (!channelId) {
      await ctx.telegram.answerCallbackQuery(query.id, "This verification is not available.", true);
      return;
    }
    data = `ov:${data === "verify_added_bot" ? "a" : "m"}:${channelId}`;
  }
  const match = /^ov:(a|m|x):(\d+)$/.exec(data);

  if (!match) {
    await ctx.telegram.answerCallbackQuery(query.id, "Verification action is not available.", true);
    return;
  }

  const action = match[1];
  const channelId = Number(match[2]);

  if (action === "a") {
    await handleAutomaticVerification(ctx, query, chatId, messageId, channelId);
    return;
  }

  if (action === "m") {
    await markOwnershipVerificationStatus(ctx.env, query.from.id, channelId, "manual_review", "manual");
    await ctx.telegram.answerCallbackQuery(query.id, "Manual review requested.", true);
    await sendOrEdit(
      ctx.telegram,
      chatId,
      messageId,
      [
        "📩 Manual Proof Requested",
        "",
        "Your channel is queued for admin review.",
        "Send proof to the admin username you submitted if an admin asks for it.",
      ].join("\n"),
      { reply_markup: backHomeKeyboard("menu") },
    );
    return;
  }

  await markOwnershipVerificationStatus(ctx.env, query.from.id, channelId, "failed", "cancelled");
  await ctx.telegram.answerCallbackQuery(query.id, "Verification cancelled.");
  await sendOrEdit(ctx.telegram, chatId, messageId, "❌ Ownership verification cancelled.", {
    reply_markup: backHomeKeyboard("menu"),
  });
}

async function handleAutomaticVerification(
  ctx: BotContext,
  query: TelegramCallbackQuery,
  chatId: number,
  messageId: number | undefined,
  channelId: number,
): Promise<void> {
  const channel = await getAdminChannel(ctx.env, channelId);

  if (!channel || channel.owner_telegram_id !== query.from.id) {
    await ctx.telegram.answerCallbackQuery(query.id, "This verification is not available.", true);
    return;
  }

  if (channel.channel_type !== "public" || !channel.channel_username) {
    await markOwnershipVerificationStatus(ctx.env, query.from.id, channelId, "manual_review", "manual");
    await ctx.telegram.answerCallbackQuery(query.id, "Private channels need manual review.", true);
    await sendManualFallback(ctx, chatId, messageId);
    return;
  }

  try {
    const botData = await ctx.telegram.getMe();
    if (!botData.ok || !botData.result) {
      throw new Error(botData.description ?? "Telegram getMe failed");
    }
    const memberData = await ctx.telegram.getChatMember(channel.channel_username, botData.result.id);
    if (!memberData.ok || !memberData.result) {
      throw new Error(memberData.description ?? "Telegram getChatMember failed");
    }
    const verified = memberData.result.status === "administrator" || memberData.result.status === "creator";

    if (!verified) {
      await markOwnershipVerificationStatus(ctx.env, query.from.id, channelId, "manual_review", "auto");
      await ctx.telegram.answerCallbackQuery(query.id, "Bot admin access not found.", true);
      await sendManualFallback(ctx, chatId, messageId);
      return;
    }

    await markOwnershipVerificationStatus(ctx.env, query.from.id, channelId, "verified", "auto");
    await ctx.telegram.answerCallbackQuery(query.id, "✅ Ownership verified.", true);
    await sendOrEdit(
      ctx.telegram,
      chatId,
      messageId,
      ["✅ Ownership Verified", "", "Status: ⏳ Waiting for admin approval"].join("\n"),
      { reply_markup: backHomeKeyboard("menu") },
    );
  } catch (error) {
    console.warn("Automatic ownership verification failed.", { channelId, error });
    await markOwnershipVerificationStatus(ctx.env, query.from.id, channelId, "manual_review", "auto");
    await ctx.telegram.answerCallbackQuery(query.id, "Automatic check failed. Manual review requested.", true);
    await sendManualFallback(ctx, chatId, messageId);
  }
}

async function sendManualFallback(
  ctx: BotContext,
  chatId: number,
  messageId: number | undefined,
): Promise<void> {
  await sendOrEdit(
    ctx.telegram,
    chatId,
    messageId,
    [
      "⚠️ Manual Review Needed",
      "",
      "I could not confirm bot-admin access automatically.",
      "Admins can still approve after reviewing ownership proof.",
    ].join("\n"),
    { reply_markup: backHomeKeyboard("menu") },
  );
}
