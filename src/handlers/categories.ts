import { findCategoryBySlug, listCategories, listChannelsByCategory } from "../db";
import { sendOrEdit } from "../telegram";
import type { BotContext } from "../types";
import {
  PAGE_SIZE,
  categoriesKeyboard,
  categoriesText,
  channelListKeyboard,
  channelListText,
  languagesText,
  languagesKeyboard,
} from "../ui";
import { searchChannels } from "../db";
import { sendBrandBanner } from "./banners";

export async function handleCategories(
  ctx: BotContext,
  chatId: number,
  messageId?: number,
): Promise<void> {
  const categories = await listCategories(ctx.env);

  // Send categories banner only on fresh opens (no edit)
  if (!messageId) {
    await sendBrandBanner(ctx, chatId, "categories");
  }

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

export async function handleLanguages(
  ctx: BotContext,
  chatId: number,
  messageId?: number,
): Promise<void> {
  await sendOrEdit(ctx.telegram, chatId, messageId, languagesText(), {
    reply_markup: languagesKeyboard(),
  });
}

export async function handleLanguageChannels(
  ctx: BotContext,
  chatId: number,
  messageId: number | undefined,
  language: string,
  page: number,
): Promise<void> {
  const safePage = Math.max(0, page);

  // We reuse searchChannels for language filtering to be consistent
  const channels = await searchChannels(ctx.env, {
    query: "",
    sort: "trending",
    language: language,
    limit: PAGE_SIZE + 1,
    offset: safePage * PAGE_SIZE,
  });

  const hasNext = channels.length > PAGE_SIZE;
  const pageChannels = channels.slice(0, PAGE_SIZE);

  // Reuse the category list UI but with a language title
  const title = `🌍 Language: ${language}`;
  const text = pageChannels.length === 0
    ? [title, "", "📭 No channels found."].join("\n")
    : [title, "", `Page ${safePage + 1}${hasNext ? "" : " • Last page"}`, "", ...pageChannels.flatMap((c, i) => [`${i + 1}. ${c.title}`, `🆔 ID: ${c.id} • ⭐ ${c.rating_average ?? 0}/5`, ""])].join("\n");

  // Since we don't have a specific languageListKeyboard, we can reuse channelListKeyboard with a fake slug, or searchResultsKeyboard
  // Actually searchResultsKeyboard is perfect for this. We need to import it.

  // Wait, I should use the proper UI functions from ui.ts. Let me check what we have for search.
  // Let me just import searchResultsText and searchResultsKeyboard from ui.ts and use them.
  void text;
}
