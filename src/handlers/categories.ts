import {
  findCategoryBySlug,
  listCategories,
  listChannelsByCategory,
  listChannelsByLanguage,
  countChannelsByLanguage,
} from "../db";
import { sendOrEdit } from "../telegram";
import type { BotContext } from "../types";
import {
  PAGE_SIZE,
  categoriesKeyboard,
  categoriesText,
  channelListKeyboard,
  channelListText,
  channelResultsKeyboard,
  channelResultsText,
  languagesText,
  languagesKeyboard,
} from "../ui";
import { editOrSendPage } from "./banners";
import type { TelegramMessage } from "../types";

export async function handleCategories(
  ctx: BotContext,
  chatId: number,
  messageId?: number,
  message?: TelegramMessage,
): Promise<void> {
  const categories = await listCategories(ctx.env);

  await editOrSendPage(
    ctx,
    chatId,
    messageId,
    message,
    categoriesText(categories),
    categoriesKeyboard(categories),
    "categories",
  );
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

  const rows = await listChannelsByLanguage(ctx.env, language, safePage * PAGE_SIZE, PAGE_SIZE + 1);
  const channels = rows.slice(0, PAGE_SIZE);
  const hasNext = rows.length > PAGE_SIZE;

  const title = `🌍 Language: ${language} • Page ${safePage + 1}${hasNext ? "" : " • Last page"}`;

  const pagerRows: { text: string; callback_data: string }[] = [];
  if (safePage > 0) pagerRows.push({ text: "⬅️ Previous", callback_data: `lang_page:${language}:${safePage - 1}` });
  if (hasNext) pagerRows.push({ text: "Next ➡️", callback_data: `lang_page:${language}:${safePage + 1}` });

  const keyboard = channelResultsKeyboard(channels, "languages_page");
  if (pagerRows.length > 0) {
    keyboard.inline_keyboard.unshift(pagerRows);
  }

  await sendOrEdit(
    ctx.telegram,
    chatId,
    messageId,
    channelResultsText(title, channels),
    {
      reply_markup: keyboard,
      disable_web_page_preview: true,
    },
  );
}
