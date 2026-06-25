import { getSearchState, searchChannels, setSearchState } from "../db";
import { sendOrEdit } from "../telegram";
import type { BotContext, SearchSort, SearchState, TelegramMessage, TelegramInlineQuery } from "../types";
import {
  PAGE_SIZE,
  searchHelpText,
  searchLanguageKeyboard,
  searchLanguageText,
  searchPromptKeyboard,
  searchResultsKeyboard,
  searchResultsText,
  backToMenuKeyboard,
} from "../ui";

interface SearchViewState {
  query: string;
  sort: SearchSort;
  language: string | null;
  verifiedOnly: boolean;
}

const DEFAULT_SEARCH_STATE: SearchViewState = {
  query: "",
  sort: "trending",
  language: null,
  verifiedOnly: false,
};

const LANGUAGE_BY_CODE: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  kn: "Kannada",
  ta: "Tamil",
  te: "Telugu",
  ml: "Malayalam",
  ot: "Other",
};

export function isSearchCallbackData(data: string): boolean {
  return data.startsWith("sr:");
}

export async function handleSearchHelp(
  ctx: BotContext,
  chatId: number,
  messageId?: number,
  userId?: number,
): Promise<void> {
  if (userId) {
    await saveSearchState(ctx, userId, DEFAULT_SEARCH_STATE);
  }

  await sendOrEdit(ctx.telegram, chatId, messageId, searchHelpText(), {
    reply_markup: searchPromptKeyboard(),
  });
}

export async function handleSearchCommand(
  ctx: BotContext,
  message: TelegramMessage,
  query: string,
): Promise<void> {
  const normalizedQuery = query.trim();

  if (normalizedQuery.length < 2) {
    await handleSearchHelp(ctx, message.chat.id, undefined, message.from?.id);
    return;
  }

  const userId = message.from?.id;
  const state: SearchViewState = {
    ...DEFAULT_SEARCH_STATE,
    query: normalizedQuery,
  };

  if (userId) {
    await saveSearchState(ctx, userId, state);
  }

  await showSearchPage(ctx, message.chat.id, undefined, state, 0);
}

export async function handleSearchCallback(
  ctx: BotContext,
  data: string,
  chatId: number,
  messageId: number | undefined,
  userId: number,
): Promise<void> {
  const action = parseSearchAction(data);
  if (!action) {
    await handleSearchHelp(ctx, chatId, messageId, userId);
    return;
  }

  if (action.kind === "language_menu") {
    await sendOrEdit(ctx.telegram, chatId, messageId, searchLanguageText(), {
      reply_markup: searchLanguageKeyboard(),
    });
    return;
  }

  const state = await loadSearchState(ctx, userId);

  if (action.kind === "page") {
    await showSearchPage(ctx, chatId, messageId, state, action.page);
    return;
  }

  if (action.kind === "sort") {
    const next = { ...state, sort: action.sort };
    await saveSearchState(ctx, userId, next);
    await showSearchPage(ctx, chatId, messageId, next, 0);
    return;
  }

  if (action.kind === "verified") {
    const next = { ...state, verifiedOnly: !state.verifiedOnly };
    await saveSearchState(ctx, userId, next);
    await showSearchPage(ctx, chatId, messageId, next, 0);
    return;
  }

  const next = { ...state, language: action.language };
  await saveSearchState(ctx, userId, next);
  await showSearchPage(ctx, chatId, messageId, next, 0);
}

async function showSearchPage(
  ctx: BotContext,
  chatId: number,
  messageId: number | undefined,
  state: SearchViewState,
  page: number,
): Promise<void> {
  const safePage = Math.max(0, page);
  const channels = await searchChannels(ctx.env, {
    query: state.query,
    sort: state.sort,
    language: state.language,
    verifiedOnly: state.verifiedOnly,
    limit: PAGE_SIZE + 1,
    offset: safePage * PAGE_SIZE,
  });

  if (channels.length === 0 && safePage === 0) {
    await sendOrEdit(
      ctx.telegram,
      chatId,
      messageId,
      "<b>😕 No channels found</b>\n\nTry another keyword or browse categories.",
      {
        reply_markup: backToMenuKeyboard(),
        parse_mode: "HTML",
      },
    );
    return;
  }

  const visibleChannels = channels.slice(0, PAGE_SIZE);
  const hasNext = channels.length > PAGE_SIZE;

  await sendOrEdit(ctx.telegram, chatId, messageId, searchResultsText(state, visibleChannels, safePage, hasNext), {
    reply_markup: searchResultsKeyboard(visibleChannels, safePage, hasNext),
    disable_web_page_preview: true,
  });
}

async function loadSearchState(ctx: BotContext, userId: number): Promise<SearchViewState> {
  const stored = await getSearchState(ctx.env, userId);
  return stored ? stateFromRow(stored) : DEFAULT_SEARCH_STATE;
}

export function normalizeSort(value: string | undefined | null): SearchSort {
  const map: Record<string, SearchSort> = {
    t: "trending",
    r: "votes",
    c: "clicks",
    n: "newest",
    trending: "trending",
    votes: "votes",
    rating: "votes",
    clicks: "clicks",
    newest: "newest"
  };
  return map[value ?? ""] || "trending";
}

async function saveSearchState(
  ctx: BotContext,
  userId: number,
  state: SearchViewState,
): Promise<void> {
  await setSearchState(ctx.env, userId, {
    query: state.query,
    sort: normalizeSort(state.sort),
    language: state.language,
    verifiedOnly: state.verifiedOnly,
  });
}

function stateFromRow(row: SearchState): SearchViewState {
  return {
    query: row.query,
    sort: normalizeSort(row.sort),
    language: row.language,
    verifiedOnly: row.verified_only === 1,
  };
}

function parseSearchAction(
  data: string,
):
  | { kind: "page"; page: number }
  | { kind: "sort"; sort: SearchSort }
  | { kind: "verified" }
  | { kind: "language_menu" }
  | { kind: "language"; language: string }
  | null {
  if (data === "sr:l") {
    return { kind: "language_menu" };
  }

  if (data === "sr:f:v") {
    return { kind: "verified" };
  }

  const sortMatch = /^sr:o:(t|r|v|c|n)$/.exec(data);
  if (sortMatch) {
    return { kind: "sort", sort: normalizeSort(sortMatch[1]) };
  }

  const pageMatch = /^sr:p:(\d+)$/.exec(data);
  if (pageMatch) {
    return { kind: "page", page: Number(pageMatch[1]) };
  }

  const languageMatch = /^sr:lg:(en|hi|kn|ta|te|ml|ot)$/.exec(data);
  if (languageMatch) {
    return { kind: "language", language: LANGUAGE_BY_CODE[languageMatch[1]] };
  }

  return null;
}

export async function handleInlineQuery(
  ctx: BotContext,
  query: TelegramInlineQuery
): Promise<void> {
  try {
    const searchTerm = query.query.trim();
    let channels = [];
    
    if (searchTerm.length >= 2) {
      channels = await searchChannels(ctx.env, {
        query: searchTerm,
        sort: "trending",
        language: null,
        verifiedOnly: false,
        limit: 10,
        offset: 0,
      });
    } else {
      const { listTopChannels } = await import("../db");
      channels = await listTopChannels(ctx.env, 10);
    }

    const { escapeHtml } = await import("../ui");
    const results = channels.map((channel) => {
      const verified = channel.verified ? "✅" : "";
      const safeTitle = escapeHtml(channel.title || "");
      return {
        type: "article",
        id: String(channel.id),
        title: `${channel.title} ${verified}`.trim(),
        description: `${channel.category} • ⭐ ${channel.rating_average ?? 0}/5 • 👀 ${channel.clicks ?? 0} clicks`,
        input_message_content: {
          message_text: `📢 <b>${safeTitle}</b> ${verified}\n\n🆔 ID: ${channel.id}\n📂 Category: ${channel.category}\n🌍 Language: ${channel.language ?? "Mixed"}\n⭐ Rating: ${channel.rating_average ?? 0}/5\n👀 Clicks: ${channel.clicks ?? 0}\n\n🔗 ${channel.username ? `@${channel.username}` : "Private Channel"}\n\n🔎 Found via @NexChannelFinderBot`,
          parse_mode: "HTML",
        },
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🔗 Join Channel", url: channel.username ? `https://t.me/${channel.username}` : `https://t.me/${ctx.env.BOT_USERNAME || 'NexChannelFinderBot'}?start=${channel.id}` }
            ]
          ]
        }
      };
    });

    await ctx.telegram.answerInlineQuery(query.id, results, { cache_time: 300 });
  } catch (error) {
    console.error("handleInlineQuery error:", error);
  }
}
