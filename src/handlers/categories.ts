import { findCategoryBySlug, listCategories, listChannelsByCategory } from "../db";
import { sendOrEdit } from "../telegram";
import type { BotContext } from "../types";
import {
  PAGE_SIZE,
  categoriesKeyboard,
  categoriesText,
  channelListKeyboard,
  channelListText,
} from "../ui";

export async function handleCategories(
  ctx: BotContext,
  chatId: number,
  messageId?: number,
): Promise<void> {
  const categories = await listCategories(ctx.env);

  await sendOrEdit(ctx.telegram, chatId, messageId, categoriesText(categories), {
    reply_markup: categoriesKeyboard(categories),
  });
}

export async function handleCategoryChannels(
  ctx: BotContext,
  chatId: number,
  messageId: number | undefined,
  slug: string,
  page: number,
): Promise<void> {
  const safePage = Math.max(0, page);
  const category = await findCategoryBySlug(ctx.env, slug);

  if (!category) {
    await handleCategories(ctx, chatId, messageId);
    return;
  }

  // Fetch one extra row so we know whether a Next button is needed.
  const rows = await listChannelsByCategory(ctx.env, slug, safePage * PAGE_SIZE, PAGE_SIZE + 1);
  const channels = rows.slice(0, PAGE_SIZE);
  const hasNext = rows.length > PAGE_SIZE;

  await sendOrEdit(
    ctx.telegram,
    chatId,
    messageId,
    channelListText(category, channels, safePage, hasNext),
    {
      reply_markup: channelListKeyboard(slug, channels, safePage, hasNext),
      disable_web_page_preview: true,
    },
  );
}
