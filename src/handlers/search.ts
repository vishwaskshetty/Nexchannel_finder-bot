import { getSearchState, searchChannels, setSearchState } from "../db";
import { sendOrEdit } from "../telegram";
import type { BotContext, SearchSort, SearchState, TelegramMessage } from "../types";
import {
  PAGE_SIZE,
  searchHelpText,
  searchLanguageKeyboard,
  searchLanguageText,
  searchPromptKeyboard,
  searchResultsKeyboard,
  searchResultsText,
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

async function saveSearchState(
  ctx: BotContext,
  userId: number,
  state: SearchViewState,
): Promise<void> {
  await setSearchState(ctx.env, userId, {
    query: state.query,
    sort: state.sort,
    language: state.language,
    verifiedOnly: state.verifiedOnly,
  });
}

function stateFromRow(row: SearchState): SearchViewState {
  return {
    query: row.query,
    sort: row.sort,
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
    const sortByCode: Record<string, SearchSort> = {
      t: "trending",
      r: "rating",
      v: "rating",
      c: "clicks",
      n: "newest",
    };

    return { kind: "sort", sort: sortByCode[sortMatch[1]] };
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
