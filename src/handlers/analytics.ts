import { getChannel } from "../db";
import { sendOrEdit } from "../telegram";
import type { BotContext } from "../types";
import { formatChannelAnalytics } from "../ui";

export async function handleAnalyticsCallback(
  ctx: BotContext,
  chatId: number,
  messageId: number | undefined,
  channelId: number
): Promise<void> {
  const channel = await getChannel(ctx.env, channelId);
  if (!channel) {
    return;
  }

  await sendOrEdit(
    ctx.telegram,
    chatId,
    messageId,
    formatChannelAnalytics(channel),
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "⬅️ Back", callback_data: `channel:${channelId}` }]
        ]
      }
    }
  );
}
