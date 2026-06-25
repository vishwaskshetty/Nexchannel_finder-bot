import { sendOrEdit } from "../telegram";
import type { BotContext, Channel } from "../types";
import { formatRecommendationText, channelActionKeyboard } from "../ui";

export async function handleRecommendationsCallback(
  ctx: BotContext,
  chatId: number,
  messageId: number | undefined,
  userId: number
): Promise<void> {
  const { CHANNEL_SELECT } = await import("../db");
  const result = await ctx.env.DB.prepare(`
    SELECT ${CHANNEL_SELECT}
    FROM channels ch
    LEFT JOIN categories cat ON cat.slug = ch.category
    WHERE ch.status = 'approved' AND (ch.is_scam IS NULL OR ch.is_scam = 0)
    AND ch.id NOT IN (SELECT channel_id FROM saved_channels WHERE telegram_id = ?)
    ORDER BY COALESCE(ch.trending_score, 0) DESC
    LIMIT 1
  `).bind(userId).first<Channel>();

  if (!result) {
    await sendOrEdit(ctx.telegram, chatId, messageId, "Sorry, no new recommendations found for you right now.", {
      reply_markup: {
        inline_keyboard: [[{ text: "🏠 Home", callback_data: "home" }]]
      }
    });
    return;
  }

  const isSavedResult = await ctx.env.DB.prepare(
    "SELECT id FROM saved_channels WHERE telegram_id = ? AND channel_id = ? LIMIT 1",
  )
    .bind(userId, result.id)
    .first<{ id: number }>();
    
  const isSaved = Boolean(isSavedResult);

  await sendOrEdit(
    ctx.telegram,
    chatId,
    messageId,
    formatRecommendationText(result),
    {
      parse_mode: "HTML",
      reply_markup: channelActionKeyboard(result, {
        isSaved,
        backCallback: "home",
        homeCallback: "home",
        hideReport: true,
        hideBack: true
      }),
      disable_web_page_preview: true
    }
  );
}
