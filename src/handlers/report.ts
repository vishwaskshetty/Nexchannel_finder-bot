import { createReport, getChannel } from "../db";
import { sendOrEdit } from "../telegram";
import type { BotContext, TelegramCallbackQuery, TelegramMessage } from "../types";
import {
  backToMenuKeyboard,
  reportChannelPromptText,
  reportHelpText,
  reportReasonKeyboard,
} from "../ui";

const REPORT_REASONS: Record<string, string> = {
  spam: "Spam or misleading content",
  adult: "Adult content",
  scam: "Scam or fraud",
  copyright: "Copyright infringement",
  other: "Other",
};

export async function handleReportHelp(
  ctx: BotContext,
  chatId: number,
  messageId?: number,
): Promise<void> {
  await sendOrEdit(ctx.telegram, chatId, messageId, reportHelpText(), {
    reply_markup: backToMenuKeyboard(),
  });
}

export async function handleReportChannelPrompt(
  ctx: BotContext,
  chatId: number,
  messageId: number | undefined,
  channelId: number,
): Promise<void> {
  console.log("Channel action: report_prompt");
  console.log("Channel ID:", channelId);

  try {
    const channel = await getChannel(ctx.env, channelId);
    if (!channel) {
      await sendOrEdit(ctx.telegram, chatId, messageId, "❌ That channel is not available anymore.", {
        reply_markup: backToMenuKeyboard(),
      });
      return;
    }

    await sendOrEdit(ctx.telegram, chatId, messageId, reportChannelPromptText(channelId), {
      reply_markup: reportReasonKeyboard(channelId),
    });
  } catch (error) {
    console.error("Error in handleReportChannelPrompt:", error);
    await sendOrEdit(ctx.telegram, chatId, messageId, "❌ Something went wrong. Please try again.", {
      reply_markup: backToMenuKeyboard(),
    });
  }
}

export async function handleReportReasonCallback(
  ctx: BotContext,
  query: TelegramCallbackQuery,
  chatId: number,
  messageId: number | undefined,
): Promise<void> {
  const match = /^report_reason:(\d+):(spam|adult|scam|copyright|other)$/.exec(query.data ?? "");
  if (!match) {
    await ctx.telegram.answerCallbackQuery(query.id, "❌ Invalid report reason.", true);
    return;
  }

  const channelId = Number(match[1]);
  const reasonKey = match[2];
  const reason = REPORT_REASONS[reasonKey] ?? reasonKey;

  console.log("Channel action: submit_report");
  console.log("Channel ID:", channelId);

  try {
    const channel = await getChannel(ctx.env, channelId);
    if (!channel) {
      await ctx.telegram.answerCallbackQuery(query.id, "❌ Channel not found.", true);
      return;
    }

    const result = await createReport(ctx.env, query.from.id, channelId, reason);

    if (result.status === "exists") {
      await ctx.telegram.answerCallbackQuery(query.id, "✅ You already reported this channel.", true);
      return;
    }

    await ctx.telegram.answerCallbackQuery(query.id, "✅ Report submitted. Thank you.", true);

    const hiddenNote = result.channelHidden ? "\n⚠️ The channel was hidden for admin review." : "";
    await sendOrEdit(
      ctx.telegram,
      chatId,
      messageId,
      `✅ Report submitted. Thank you.\n\n🆔 Report ID: ${result.id}${hiddenNote}`,
      { reply_markup: backToMenuKeyboard() },
    );

    await notifyAdmins(ctx, result.id, channelId, reason);
  } catch (error) {
    console.error("Error in handleReportReasonCallback:", error);
    await ctx.telegram.answerCallbackQuery(query.id, "❌ Something went wrong. Please try again.", true);
  }
}

export async function handleReportCommand(
  ctx: BotContext,
  message: TelegramMessage,
  args: string,
): Promise<void> {
  const trimmed = args.trim();
  if (!trimmed) {
    await handleReportHelp(ctx, message.chat.id);
    return;
  }

  const [firstWord, ...rest] = trimmed.split(/\s+/);
  const hasChannelId = /^\d+$/.test(firstWord);
  const channelId = hasChannelId ? Number(firstWord) : null;
  const reason = hasChannelId ? rest.join(" ").trim() : trimmed;

  if (!channelId) {
    await handleReportHelp(ctx, message.chat.id);
    return;
  }

  if (reason.length < 5) {
    await ctx.telegram.sendMessage(message.chat.id, "Please add a clear reason with at least 5 characters.");
    return;
  }

  const channel = await getChannel(ctx.env, channelId);
  if (!channel) {
    await ctx.telegram.sendMessage(message.chat.id, "I could not find that approved channel listing.");
    return;
  }

  try {
    const result = await createReport(ctx.env, message.from?.id ?? null, channelId, reason);
    if (result.status === "exists") {
      await ctx.telegram.sendMessage(message.chat.id, "✅ You already reported this channel.", {
        reply_markup: backToMenuKeyboard(),
      });
      return;
    }

    const hiddenNote = result.channelHidden ? "\n⚠️ The channel was hidden for admin review." : "";
    await ctx.telegram.sendMessage(
      message.chat.id,
      `✅ Report submitted. Thank you.\n\n🆔 Report ID: ${result.id}${hiddenNote}`,
      { reply_markup: backToMenuKeyboard() },
    );

    await notifyAdmins(ctx, result.id, channelId, reason);
  } catch (error) {
    console.error("Error in handleReportCommand:", error);
    await ctx.telegram.sendMessage(message.chat.id, "❌ Something went wrong. Please try again.");
  }
}

async function notifyAdmins(
  ctx: BotContext,
  reportId: number,
  channelId: number | null,
  reason: string,
): Promise<void> {
  const text = [
    `🚨 New report #${reportId}`,
    channelId ? `🆔 Channel ID: ${channelId}` : "General report",
    `📋 Reason: ${reason}`,
  ].join("\n");

  await Promise.all(
    [...ctx.adminIds].map(async (adminId) => {
      try {
        await ctx.telegram.sendMessage(adminId, text);
      } catch (error) {
        console.warn(`Could not notify admin ${adminId}.`, error);
      }
    }),
  );
}
