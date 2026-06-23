import { upsertUser } from "../db";
import { checkUserSubscription, getForceSubLink, sendOrEdit } from "../telegram";
import type { BotContext, TelegramMessage } from "../types";
import {
  FORCE_SUB_TEXT,
  HELP_TEXT,
  HOME_TEXT,
  backToMenuKeyboard,
  forceSubscribeKeyboard,
  mainMenu,
} from "../ui";
import { handleSubmitStart } from "./submit";
import { sendBrandBanner } from "./banners";

export async function handleStart(ctx: BotContext, message: TelegramMessage): Promise<void> {
  if (message.from) {
    await upsertUser(ctx.env, message.from);

    if (startParameter(message.text) === "submit") {
      const subscription = ctx.adminIds.has(message.from.id)
        ? { subscribed: true as const }
        : await checkUserSubscription(ctx.env, ctx.telegram, message.from.id);

      if (subscription.subscribed) {
        await handleSubmitStart(ctx, message.chat.id, message.from.id);
        return;
      }
    }

    await showHome(ctx, message.chat.id, message.from.id);
  }
}

export async function showHome(
  ctx: BotContext,
  chatId: number,
  userId: number,
  messageId?: number,
): Promise<void> {
  // Admins can manage the bot even if they have not joined the force-sub channel.
  const subscription = ctx.adminIds.has(userId)
    ? { subscribed: true as const }
    : await checkUserSubscription(ctx.env, ctx.telegram, userId);

  if (!subscription.subscribed) {
    const text = subscription.error
      ? "❌ Could not verify subscription. Please make sure you joined @Nex_bots and try again."
      : FORCE_SUB_TEXT;
    await sendOrEdit(ctx.telegram, chatId, messageId, text, {
      reply_markup: forceSubscribeKeyboard(getForceSubLink(ctx.env)),
      disable_web_page_preview: true,
    });
    return;
  }

  // Send welcome banner only on fresh /start (no messageId = not a callback edit)
  if (!messageId) {
    await sendBrandBanner(ctx, chatId, "welcome");
  }

  await sendOrEdit(ctx.telegram, chatId, messageId, HOME_TEXT, {
    reply_markup: mainMenu(ctx.adminIds.has(userId)),
    disable_web_page_preview: true,
  });
}

export async function handleHelp(
  ctx: BotContext,
  chatId: number,
  messageId?: number,
): Promise<void> {
  await sendOrEdit(ctx.telegram, chatId, messageId, HELP_TEXT, {
    reply_markup: backToMenuKeyboard(),
  });
}

function startParameter(text?: string): string {
  const match = /^\/start(?:@\w+)?(?:\s+([^\s]+))?/i.exec(text?.trim() ?? "");
  return match?.[1]?.toLowerCase() ?? "";
}
