import type {
  AdminStats,
  Category,
  Channel,
  Report,
  SearchSort,
  Submission,
  TelegramInlineKeyboardButton,
  TelegramInlineKeyboardMarkup,
} from "./types";
import { categoryKeyFromSlug, CATEGORIES } from "./config/categories";
import { LANGUAGES } from "./config/languages";

export function escapeHtml(text = ""): string {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export const TEXT = {
  English: {
    mainMenu: "Main Menu",
    search: "🔍 Search Channels",
    categories: "📂 Browse Categories",
    languageFilter: "🌐 Channel Language Filter",
    trending: "🔥 Trending Channels",
    recommendations: "🧠 Smart Recommendations",
    saved: "💾 My Saved Channels",
    submit: "➕ Submit Channel",
    botLanguage: "🌍 Bot Language",
    botsZone: "🤖 Bots Zone",
    earningBots: "💰 Earning Bots",
    help: "ℹ️ Help",
    weeklyLeaderboard: "🏆 Weekly Leaderboard",
    submitterLeaderboard: "🎁 Submitter Leaderboard",
  },
  Hindi: {
    mainMenu: "मुख्य मेनू",
    search: "🔍 चैनल खोजें",
    categories: "📂 कैटेगरी देखें",
    languageFilter: "🌐 भाषा फ़िल्टर",
    trending: "🔥 ट्रेंडिंग चैनल",
    recommendations: "🧠 स्मार्ट सिफारिशें",
    saved: "💾 सेव किए गए चैनल",
    submit: "➕ चैनल सबमिट करें",
    botLanguage: "🌍 बॉट भाषा",
    botsZone: "🤖 बॉट्स ज़ोन",
    earningBots: "💰 अर्निंग बॉट्स",
    help: "ℹ️ मदद",
    weeklyLeaderboard: "🏆 Weekly Leaderboard",
    submitterLeaderboard: "🎁 Submitter Leaderboard",
  },
  Kannada: {
    mainMenu: "ಮುಖ್ಯ ಮೆನು",
    search: "🔍 ಚಾನೆಲ್ ಹುಡುಕಿ",
    categories: "📂 ವರ್ಗಗಳನ್ನು ನೋಡಿ",
    languageFilter: "🌐 ಭಾಷೆ ಫಿಲ್ಟರ್",
    trending: "🔥 ಟ್ರೆಂಡಿಂಗ್ ಚಾನೆಲ್ಗಳು",
    recommendations: "🧠 ಸ್ಮಾರ್ಟ್ ಶಿಫಾರಸುಗಳು",
    saved: "💾 ಉಳಿಸಿದ ಚಾನೆಲ್ಗಳು",
    submit: "➕ ಚಾನೆಲ್ ಸಲ್ಲಿಸಿ",
    botLanguage: "🌍 ಬಾಟ್ ಭಾಷೆ",
    botsZone: "🤖 ಬಾಟ್ಸ್ ವಲಯ",
    earningBots: "💰 ಗಳಿಸುವ ಬಾಟ್‌ಗಳು",
    help: "ℹ️ ಸಹಾಯ",
    weeklyLeaderboard: "🏆 Weekly Leaderboard",
    submitterLeaderboard: "🎁 Submitter Leaderboard",
  },
  Tamil: {
    mainMenu: "முக்கிய மெனு",
    search: "🔍 சேனல்கள் தேடு",
    categories: "📂 வகைகள் பார்க்க",
    languageFilter: "🌐 மொழி வடிகட்டி",
    trending: "🔥 பிரபல சேனல்கள்",
    recommendations: "🧠 புத்திசாலி பரிந்துரைகள்",
    saved: "💾 சேமித்த சேனல்கள்",
    submit: "➕ சேனல் சமர்ப்பிக்க",
    botLanguage: "🌍 பாட் மொழி",
    botsZone: "🤖 பாட்ஸ் மண்டலம்",
    earningBots: "💰 வருமானம் தரும் பாட்ஸ்",
    help: "ℹ️ உதவி",
    weeklyLeaderboard: "🏆 Weekly Leaderboard",
    submitterLeaderboard: "🎁 Submitter Leaderboard",
  },
  Telugu: {
    mainMenu: "ప్రధాన మెనూ",
    search: "🔍 చానెల్స్ వెతకండి",
    categories: "📂 కేటగిరీలు చూడండి",
    languageFilter: "🌐 భాష ఫిల్టర్",
    trending: "🔥 ట్రెండింగ్ చానెల్స్",
    recommendations: "🧠 స్మార్ట్ సిఫార్సులు",
    saved: "💾 సేవ్ చేసిన చానెల్స్",
    submit: "➕ చానెల్ సమర్పించండి",
    botLanguage: "🌍 బాట్ భాష",
    botsZone: "🤖 బాట్స్ జోన్",
    earningBots: "💰 ఎర్నింగ్ బాట్స్",
    help: "ℹ️ సహాయం",
    weeklyLeaderboard: "🏆 Weekly Leaderboard",
    submitterLeaderboard: "🎁 Submitter Leaderboard",
  },
  Malayalam: {
    mainMenu: "പ്രധാന മെനു",
    search: "🔍 ചാനലുകൾ തിരയുക",
    categories: "📂 വിഭാഗങ്ങൾ കാണുക",
    languageFilter: "🌐 ഭാഷ ഫിൽട്ടർ",
    trending: "🔥 ട്രെൻഡിംഗ് ചാനലുകൾ",
    recommendations: "🧠 സ്മാർട്ട് ശുപാർശകൾ",
    saved: "💾 സേവ് ചെയ്ത ചാനലുകൾ",
    submit: "➕ ചാനൽ സമർപ്പിക്കുക",
    botLanguage: "🌍 ബോട്ട് ഭാഷ",
    botsZone: "🤖 ബോട്ടുകൾ",
    earningBots: "💰 വരുമാന ബോട്ടുകൾ",
    help: "ℹ️ സഹായം",
    weeklyLeaderboard: "🏆 Weekly Leaderboard",
    submitterLeaderboard: "🎁 Submitter Leaderboard",
  },
  Marathi: { mainMenu: "Main Menu", search: "🔍 Search Channels", categories: "📂 Browse Categories", languageFilter: "🌐 Channel Language Filter", trending: "🔥 Trending Channels", recommendations: "🧠 Smart Recommendations", saved: "💾 My Saved Channels", submit: "➕ Submit Channel", botLanguage: "🌍 Bot Language", botsZone: "🤖 Bots Zone", earningBots: "💰 Earning Bots", help: "ℹ️ Help", weeklyLeaderboard: "🏆 Weekly Leaderboard", submitterLeaderboard: "🎁 Submitter Leaderboard" },
  Gujarati: { mainMenu: "Main Menu", search: "🔍 Search Channels", categories: "📂 Browse Categories", languageFilter: "🌐 Channel Language Filter", trending: "🔥 Trending Channels", recommendations: "🧠 Smart Recommendations", saved: "💾 My Saved Channels", submit: "➕ Submit Channel", botLanguage: "🌍 Bot Language", botsZone: "🤖 Bots Zone", earningBots: "💰 Earning Bots", help: "ℹ️ Help", weeklyLeaderboard: "🏆 Weekly Leaderboard", submitterLeaderboard: "🎁 Submitter Leaderboard" },
  Bengali: { mainMenu: "Main Menu", search: "🔍 Search Channels", categories: "📂 Browse Categories", languageFilter: "🌐 Channel Language Filter", trending: "🔥 Trending Channels", recommendations: "🧠 Smart Recommendations", saved: "💾 My Saved Channels", submit: "➕ Submit Channel", botLanguage: "🌍 Bot Language", botsZone: "🤖 Bots Zone", earningBots: "💰 Earning Bots", help: "ℹ️ Help", weeklyLeaderboard: "🏆 Weekly Leaderboard", submitterLeaderboard: "🎁 Submitter Leaderboard" },
  Urdu: { mainMenu: "Main Menu", search: "🔍 Search Channels", categories: "📂 Browse Categories", languageFilter: "🌐 Channel Language Filter", trending: "🔥 Trending Channels", recommendations: "🧠 Smart Recommendations", saved: "💾 My Saved Channels", submit: "➕ Submit Channel", botLanguage: "🌍 Bot Language", botsZone: "🤖 Bots Zone", earningBots: "💰 Earning Bots", help: "ℹ️ Help", weeklyLeaderboard: "🏆 Weekly Leaderboard", submitterLeaderboard: "🎁 Submitter Leaderboard" },
  Arabic: { mainMenu: "Main Menu", search: "🔍 Search Channels", categories: "📂 Browse Categories", languageFilter: "🌐 Channel Language Filter", trending: "🔥 Trending Channels", recommendations: "🧠 Smart Recommendations", saved: "💾 My Saved Channels", submit: "➕ Submit Channel", botLanguage: "🌍 Bot Language", botsZone: "🤖 Bots Zone", earningBots: "💰 Earning Bots", help: "ℹ️ Help", weeklyLeaderboard: "🏆 Weekly Leaderboard", submitterLeaderboard: "🎁 Submitter Leaderboard" },
  Spanish: { mainMenu: "Main Menu", search: "🔍 Search Channels", categories: "📂 Browse Categories", languageFilter: "🌐 Channel Language Filter", trending: "🔥 Trending Channels", recommendations: "🧠 Smart Recommendations", saved: "💾 My Saved Channels", submit: "➕ Submit Channel", botLanguage: "🌍 Bot Language", botsZone: "🤖 Bots Zone", earningBots: "💰 Earning Bots", help: "ℹ️ Help", weeklyLeaderboard: "🏆 Weekly Leaderboard", submitterLeaderboard: "🎁 Submitter Leaderboard" },
  French: { mainMenu: "Main Menu", search: "🔍 Search Channels", categories: "📂 Browse Categories", languageFilter: "🌐 Channel Language Filter", trending: "🔥 Trending Channels", recommendations: "🧠 Smart Recommendations", saved: "💾 My Saved Channels", submit: "➕ Submit Channel", botLanguage: "🌍 Bot Language", botsZone: "🤖 Bots Zone", earningBots: "💰 Earning Bots", help: "ℹ️ Help", weeklyLeaderboard: "🏆 Weekly Leaderboard", submitterLeaderboard: "🎁 Submitter Leaderboard" },
  German: { mainMenu: "Main Menu", search: "🔍 Search Channels", categories: "📂 Browse Categories", languageFilter: "🌐 Channel Language Filter", trending: "🔥 Trending Channels", recommendations: "🧠 Smart Recommendations", saved: "💾 My Saved Channels", submit: "➕ Submit Channel", botLanguage: "🌍 Bot Language", botsZone: "🤖 Bots Zone", earningBots: "💰 Earning Bots", help: "ℹ️ Help", weeklyLeaderboard: "🏆 Weekly Leaderboard", submitterLeaderboard: "🎁 Submitter Leaderboard" },
  Indonesian: { mainMenu: "Main Menu", search: "🔍 Search Channels", categories: "📂 Browse Categories", languageFilter: "🌐 Channel Language Filter", trending: "🔥 Trending Channels", recommendations: "🧠 Smart Recommendations", saved: "💾 My Saved Channels", submit: "➕ Submit Channel", botLanguage: "🌍 Bot Language", botsZone: "🤖 Bots Zone", earningBots: "💰 Earning Bots", help: "ℹ️ Help", weeklyLeaderboard: "🏆 Weekly Leaderboard", submitterLeaderboard: "🎁 Submitter Leaderboard" },
  Turkish: { mainMenu: "Main Menu", search: "🔍 Search Channels", categories: "📂 Browse Categories", languageFilter: "🌐 Channel Language Filter", trending: "🔥 Trending Channels", recommendations: "🧠 Smart Recommendations", saved: "💾 My Saved Channels", submit: "➕ Submit Channel", botLanguage: "🌍 Bot Language", botsZone: "🤖 Bots Zone", earningBots: "💰 Earning Bots", help: "ℹ️ Help", weeklyLeaderboard: "🏆 Weekly Leaderboard", submitterLeaderboard: "🎁 Submitter Leaderboard" },
  Russian: { mainMenu: "Main Menu", search: "🔍 Search Channels", categories: "📂 Browse Categories", languageFilter: "🌐 Channel Language Filter", trending: "🔥 Trending Channels", recommendations: "🧠 Smart Recommendations", saved: "💾 My Saved Channels", submit: "➕ Submit Channel", botLanguage: "🌍 Bot Language", botsZone: "🤖 Bots Zone", earningBots: "💰 Earning Bots", help: "ℹ️ Help", weeklyLeaderboard: "🏆 Weekly Leaderboard", submitterLeaderboard: "🎁 Submitter Leaderboard" }
} as const;

type KeyboardRows = TelegramInlineKeyboardMarkup["inline_keyboard"];

interface PaginationOptions {
  previousCallback?: string;
  nextCallback?: string;
  backCallback?: string;
  homeCallback?: string;
}

type ChannelCardInput = Channel & {
  channel_username?: string | null;
  category?: string | null;
  language?: string | null;
  join_clicks?: number | null;
  clicks?: number | null;
  views?: number | null;
  trending_score?: number | null;
  rating_average?: number | null;
  rating?: number | null;
  rating_count?: number | null;
  ownership_verified?: number | boolean | null;
  owner_verified?: number | boolean | null;
  verification_code?: string | null;
};

interface SearchViewState {
  query: string;
  sort: SearchSort;
  language?: string | null;
  verifiedOnly?: boolean;
}

interface ChannelActionKeyboardOptions {
  backCallback?: string;
  homeCallback?: string;
  isSaved?: boolean;
  hideReport?: boolean;
  hideBack?: boolean;
}

export interface LeaderboardSections {
  top: Channel[];
  rated: Channel[];
  clicked: Channel[];
  newChannels: Channel[];
  fallback: boolean;
}

export const PAGE_SIZE = 5;
export const MY_CHANNELS_PAGE_SIZE = 3;
export const ADMIN_PAGE_SIZE = 5;

const SECTION_DIVIDER = "━━━━━━━━━━━━━━";
const KEYCAP_NUMBERS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

export const HOME_TEXT = [
  "⚡ 𝗡𝗘𝗫𝗖𝗛𝗔𝗡𝗡𝗘𝗟 𝗙𝗜𝗡𝗗𝗘𝗥",
  "",
  "Discover trusted Telegram channels, rate your favorites, and grow your own community.",
  "",
  "━━━━━━━━━━━━━━",
  "",
  "Choose an option below.",
].join("\n");


export const HELP_TEXT = [
  "<b>ℹ️ NexChannel Finder Help</b>",
  "",
  "Find trusted Telegram channels by search, category, language, rating, and trending score.",
  "",
  "<b>⭐ Features</b>",
  "🔍 Direct search by typing any keyword",
  "📂 Browse channels by category",
  "🌐 Filter channels by language",
  "🔥 Trending channels by smart score",
  "🧠 Smart recommendations",
  "💾 Save favorite channels",
  "⭐ Rate channels",
  "🔎 Find similar channels",
  "🔐 Ownership verified channels",
  "🚫 Report bad channels",
  "",
  "<b>User Commands</b>",
  "/start - Open main menu",
  "/help - Show help",
  "/search - Search channels",
  "/submit - Submit your channel",
  "/mysaved - View saved channels",
  "/weeklyleaderboard - Top channels of the week",
  "/submitterleaderboard - Top submitters",
  "",
  "<b>Admin Commands</b>",
  "/addchannel - Add one channel",
  "/bulkadd - Add many channels",
  "/pending - View pending channels",
  "/stats - View bot database stats",
  "/export - Export approved channels",
  "/postleaderboard - Post weekly leaderboard"
].join("\n");


export const FORCE_SUB_TEXT = [
  "🔒 Join Required",
  "",
  "Join our official channel to use NexChannel Finder.",
  "",
  "After joining, tap ✅ I Joined.",
].join("\n");

export const EMPTY_STATE_TEXT = [
  "📭 Nothing to show yet.",
  "Try another section or submit a useful channel.",
].join("\n");

export const LOADING_TEXT = "⏳ Checking, please wait...";
export const SUCCESS_TEXT = "✅ Done successfully!";
export const ERROR_TEXT = "❌ Something went wrong. Please try again.";

export const SUBMIT_INTRO_TEXT = [
  "<b>➕ Submit Channel</b>",
  "",
  "What type of listing do you want to submit?",
].join("\n");


export const PRIVATE_CHANNEL_RULE_TEXT = [
  "🔐 Private Channel",
  "",
  "Send a working auto-join / auto-approve invite link.",
  "",
  "Request-to-join private links are not allowed.",
].join("\n");

export function mainMenuKeyboard(isAdmin = false, uiLanguage: string = 'English'): TelegramInlineKeyboardMarkup {
  const langKey = (TEXT as any)[uiLanguage] ? uiLanguage : 'English';
  const t = (TEXT as any)[langKey];

  const rows: KeyboardRows = [
    [
      { text: t.search, callback_data: "search" },
    ],
    [
      { text: t.categories, callback_data: "categories" },
      { text: t.languageFilter, callback_data: "languages_page" },
    ],
    [
      { text: t.trending, callback_data: "top" },
      { text: t.weeklyLeaderboard, callback_data: "weeklyleaderboard" },
    ],
    [
      { text: t.submitterLeaderboard, callback_data: "submitterleaderboard" },
      { text: t.recommendations, callback_data: "recommend:user" },
    ],
    [
      { text: t.saved, callback_data: "saved" },
      { text: t.submit, callback_data: "submit" },
    ],
    [
      { text: t.botLanguage, callback_data: "bot_language" },
      { text: t.botsZone, callback_data: "bots_section" },
    ],
    [
      { text: t.earningBots, callback_data: "bots_earning" },
      { text: t.help, callback_data: "help" },
    ],
  ];

  if (isAdmin) {
    rows.push([{ text: "🛠 Admin Panel", callback_data: "admin" }]);
  }

  return { inline_keyboard: rows };
}

export function botLanguageKeyboard(): TelegramInlineKeyboardMarkup {
  const languages = Object.keys(TEXT);
  const rows: KeyboardRows = [];
  
  for (let i = 0; i < languages.length; i += 2) {
    const row = [
      { text: languages[i], callback_data: `set_ui_lang:${languages[i]}` }
    ];
    if (languages[i + 1]) {
      row.push({ text: languages[i + 1], callback_data: `set_ui_lang:${languages[i + 1]}` });
    }
    rows.push(row);
  }

  rows.push([{ text: "⬅️ Back", callback_data: "home" }]);
  return { inline_keyboard: rows };
}


export function backHomeKeyboard(backCallback = "home", homeCallback = "home"): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [backHomeRow(backCallback, homeCallback)],
  };
}

export function forceSubKeyboard(link?: string): TelegramInlineKeyboardMarkup {
  const rows: KeyboardRows = [];

  if (link) {
    rows.push([{ text: "📢 Join Channel", url: link }]);
  }

  rows.push([{ text: "✅ I Joined", callback_data: "check_force_sub" }]);

  return { inline_keyboard: rows };
}

export function submitStartKeyboard(): TelegramInlineKeyboardMarkup {
  return submitTypeKeyboard();
}

export function submitTypeKeyboard(): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "📢 Public Channel / Group", callback_data: "submit_type:public" },
      ],
      [
        { text: "🔒 Private Invite Link", callback_data: "submit_type:private" },
      ],
      [
        { text: "🤖 Telegram Bot", callback_data: "submit_type:bot" },
      ],
      ...submitNavKeyboard("home").inline_keyboard,
    ],
  };
}

export function submitCategoriesKeyboard(categories?: Category[]): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [
      ...buttonRows(
        CATEGORIES.map((category) => ({
          text: `${category.emoji} ${category.label}`,
          callback_data: `submit_category:${category.key}`,
        })),
      ),
      ...submitNavKeyboard("s:b").inline_keyboard,
    ],
  };
}

export function submitLanguageKeyboard(): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [
      ...buttonRows(LANGUAGES.map((language) => ({ text: language, callback_data: `submit_language:${language}` }))),
      ...submitNavKeyboard("s:b").inline_keyboard,
    ],
  };
}

export function submitNavKeyboard(backCallback = "s:b"): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: "❌ Cancel", callback_data: "submit_cancel" }],
      backHomeRow(backCallback),
    ],
  };
}

export function submitConfirmKeyboard(): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: "✅ Submit Now", callback_data: "submit_confirm" }],
      [{ text: "✏️ Edit", callback_data: "submit_edit" }],
      [{ text: "❌ Cancel", callback_data: "submit_cancel" }]
    ]
  };
}

export function submissionPreviewText(draft: any, verificationCode: string): string {
  const isPrivate = draft.channel_type === "private";
  const link = isPrivate ? (draft.invite_link || draft.channel_username) : (draft.channel_username || draft.channel_link);
  return [
    "<b>📋 Submission Preview</b>",
    "",
    `📢 <b>Title:</b> ${escapeHtml(draft.channel_username || draft.channel_link || "Pending")}`,
    `🔗 <b>Link:</b> ${escapeHtml(link)}`,
    `📌 <b>Type:</b> ${escapeHtml(draft.channel_type)}`,
    `📂 <b>Category:</b> ${escapeHtml(draft.category)}`,
    `🌐 <b>Language:</b> ${escapeHtml(draft.language)}`,
    `📝 <b>Description:</b> ${escapeHtml(draft.description)}`,
    `🏷 <b>Tags:</b> ${escapeHtml(draft.tags)}`,
    `👤 <b>Owner/Admin:</b> ${escapeHtml(draft.admin_username)}`,
    "",
    `<b>🔐 Verification:</b> <code>${verificationCode}</code>`,
    "",
    "This code will be used if admin asks for ownership verification."
  ].join("\n");
}

export function categoriesText(categories: Category[]): string {
  if (categories.length === 0) {
    return ["📂 𝗖𝗔𝗧𝗘𝗚𝗢𝗥𝗜𝗘𝗦", "", EMPTY_STATE_TEXT].join("\n");
  }

  return ["📂 𝗖𝗔𝗧𝗘𝗚𝗢𝗥𝗜𝗘𝗦", "", "Choose a category below."].join("\n");
}


export function categoriesKeyboard(
  categories?: Category[],
  backCallback = "home",
): TelegramInlineKeyboardMarkup {
  const rows = buttonRows(
    CATEGORIES.map((category) => ({
      text: `${category.emoji} ${category.label}`,
      callback_data: `category:${category.key}`,
    })),
  );

  rows.push([{ text: "🌍 Languages", callback_data: "languages_page" }]);
  rows.push(backHomeRow(backCallback));

  return { inline_keyboard: rows };
}

export function languagesText(): string {
  return ["🌍 Browse by Language", "", "Choose a language below."].join("\n");
}

export function languagesKeyboard(backCallback = "categories"): TelegramInlineKeyboardMarkup {
  const rows = buttonRows(
    LANGUAGES.map((language) => ({
      text: language,
      callback_data: `language:${language}`,
    })),
  );
  
  rows.push(backHomeRow(backCallback));
  
  return { inline_keyboard: rows };
}

export function channelListText(
  category: Category,
  channels: Channel[],
  page: number,
  hasNext: boolean,
): string {
  if (channels.length === 0) {
    return [
      "📭 𝗡𝗼 𝗖𝗵𝗮𝗻𝗻𝗲𝗹𝘀 𝗙𝗼𝘂𝗻𝗱",
      "",
      "No approved channels are available in this category yet.",
    ].join("\n");
  }

  return formatChannelList(
    channels,
    `📂 ${category.name} • Page ${page + 1}${hasNext ? "" : " • Last page"}`,
  );
}

export function formatChannelList(channels: Channel[], title: string): string {
  if (channels.length === 0) {
    return [unicodeBold(title), "", EMPTY_STATE_TEXT].join("\n");
  }

  return [
    unicodeBold(title),
    "",
    SECTION_DIVIDER,
    "",
    ...channels.flatMap((channel, index) => [channelListLine(channel, index + 1), ""]),
    SECTION_DIVIDER,
    "",
    "Choose a channel below.",
  ].join("\n");
}

export function channelListKeyboard(
  slug: string,
  channels: Channel[],
  page: number,
  hasNext: boolean,
): TelegramInlineKeyboardMarkup {
  if (channels.length === 0) {
    return {
      inline_keyboard: [
        [
          { text: "📂 Categories", callback_data: "categories" },
          { text: "🏠 Home", callback_data: "home" },
        ],
      ],
    };
  }

  const categoryKey = categoryKeyFromSlug(slug) ?? "tech";
  const rows: KeyboardRows = buttonRows(
    channels.map((channel, index) => ({
      text: channelButtonText(channel, index),
      callback_data: `channel:${channel.id}`,
    })),
  );

  rows.push(
    ...paginationKeyboard({
      previousCallback: page > 0 ? `page:category:${categoryKey}:${page - 1}` : undefined,
      nextCallback: hasNext ? `page:category:${categoryKey}:${page + 1}` : undefined,
      backCallback: "categories",
    }).inline_keyboard,
  );

  return { inline_keyboard: rows };
}

export function formatChannelDetails(channel: ChannelCardInput, options?: { hideSearchHeader?: boolean }): string {
  const category = escapeHtml(channel.category_name || categoryLabel(channel) || "Unknown");
  const language = escapeHtml(channel.language || "Mixed");
  const ratingAvg = channel.rating || channel.rating_average || 0;
  const rating = formatRating(ratingAvg);
  const clicks = channel.clicks ?? channel.join_clicks ?? 0;
  const views = channel.views ?? 0;
  const description = escapeHtml(channel.description?.trim() || "No description added yet.");
  
  const verifiedIcon = (channel.verified === 1) ? " ✅" : "";
  const ownershipIcon = (channel.ownership_verified === 1 || channel.owner_verified === 1) ? " 🔐" : "";
  const badges = verifiedIcon + ownershipIcon;
  
  const usernameLine = channel.channel_username 
    ? `🔗 <b>Username/Link:</b> @${escapeHtml(channel.channel_username.replace(/^@/, ''))}` 
    : `🔗 <b>Username/Link:</b> ${escapeHtml(channel.channel_link || channel.invite_link || 'Private')}`;

  const lines: Array<string | null> = [
    options?.hideSearchHeader ? null : "<b>🔍 Search Result</b>",
    options?.hideSearchHeader ? null : "",
    `📢 <b>Channel:</b> ${escapeHtml(channel.title || "Unknown")}${badges}`,
    usernameLine,
    `📂 <b>Category:</b> ${category}`,
    `🌐 <b>Language:</b> ${language}`,
    `⭐ <b>Rating:</b> ${rating}/5`,
    `👁 <b>Views:</b> ${formatNumber(views)}`,
    `🖱 <b>Clicks:</b> ${formatNumber(clicks)}`,
    `📝 <b>About:</b> ${description}`,
  ];

  return lines.filter((line): line is string => line !== null).join("\n");
}

export function channelCard(channel: ChannelCardInput): string {
  return formatChannelDetails(channel);
}

export function channelDetailsText(channel: Channel): string {
  return formatChannelDetails(channel);
}

export function channelActionKeyboard(
  channel: Channel,
  options: ChannelActionKeyboardOptions = {},
): TelegramInlineKeyboardMarkup {
  const rows: KeyboardRows = [];
  const joinLink = channelJoinLink(channel);
  const backCallback = options.backCallback ?? "home";
  const homeCallback = options.homeCallback ?? "home";

  const btnLabel = (channel.channel_type === "private") 
    ? "🔗 Open Private Link" 
    : (channel.channel_type === "bot") ? "🤖 Open Bot" : "🔗 Open Channel";
  if (channel.id) {
    rows.push([{ text: btnLabel, callback_data: `open:${channel.id}` }]);
  } else if (joinLink) {
    rows.push([{ text: btnLabel, url: joinLink }]);
  }

  rows.push(
    [
      {
        text: options.isSaved ? "✅ Saved" : "💾 Save",
        callback_data: options.isSaved ? `unsave:${channel.id}` : `save:${channel.id}`,
      },
      { text: "⭐ Rate", callback_data: `rate:${channel.id}` },
      { text: "🔎 Similar", callback_data: `similar:${channel.id}` },
    ]
  );
  
  if (options.hideReport) {
    rows.push([
      { text: "📊 Analytics", callback_data: `analytics:${channel.id}` }
    ]);
  } else {
    rows.push([
      { text: "📊 Analytics", callback_data: `analytics:${channel.id}` },
      { text: "🚫 Report", callback_data: `report:${channel.id}` },
    ]);
  }
  
  if (options.hideBack) {
    rows.push([{ text: "🏠 Home", callback_data: homeCallback }]);
  } else {
    rows.push(backHomeRow(backCallback, homeCallback));
  }

  return { inline_keyboard: rows };
}


export function channelDetailsKeyboard(
  channel: Channel,
  backCallback = "categories",
  isSaved = false,
): TelegramInlineKeyboardMarkup {
  return channelActionKeyboard(channel, { backCallback, isSaved });
}

export function publicPostKeyboard(
  channel: Channel,
  botUsername?: string,
): TelegramInlineKeyboardMarkup | undefined {
  const rows: KeyboardRows = [];
  const joinLink = channelJoinLink(channel);
  const botLink = botUrl(botUsername);

  if (joinLink) {
    rows.push([{ text: "📥 Join Channel", url: joinLink }]);
  }
  if (botLink) {
    rows.push([{ text: "🤖 Open Bot", url: botLink }]);
  }

  return rows.length > 0 ? { inline_keyboard: rows } : undefined;
}

export function formatApprovedChannelPost(channel: ChannelCardInput): string {
  const rating = channel.rating_average && channel.rating_average > 0
    ? formatRating(channel.rating_average)
    : "New";
  const description = channel.description?.trim() || "No description added yet.";

  return [
    "✅ 𝗡𝗲𝘄 𝗖𝗵𝗮𝗻𝗻𝗲𝗹 𝗔𝗽𝗽𝗿𝗼𝘃𝗲𝗱",
    "",
    SECTION_DIVIDER,
    "",
    `📢 𝗖𝗵𝗮𝗻𝗻𝗲𝗹: ${channel.title}${verifiedBadge(channel)}`,
    `🆔 𝗜𝗗: ${channel.id}`,
    `📂 𝗖𝗮𝘁𝗲𝗴𝗼𝗿𝘆: ${categoryLabel(channel)}`,
    `🌍 𝗟𝗮𝗻𝗴𝘂𝗮𝗴𝗲: ${channel.language ?? "Mixed"}`,
    "",
    `⭐ 𝗥𝗮𝘁𝗶𝗻𝗴: ${rating}${rating === "New" ? "" : " / 5"}`,
    `👀 𝗖𝗹𝗶𝗰𝗸𝘀: ${formatNumber(channel.join_clicks ?? channel.clicks ?? 0)}`,
    "",
    SECTION_DIVIDER,
    "",
    "📝 𝗗𝗲𝘀𝗰𝗿𝗶𝗽𝘁𝗶𝗼𝗻:",
    description,
    "",
    SECTION_DIVIDER,
    "",
    "📌 Discover more useful Telegram channels with NexChannel Finder.",
  ].join("\n");
}

export function ratingText(channel: Channel): string {
  return [
    `⭐ Rate Channel #${channel.id}`,
    "",
    `📢 ${channel.title}${verifiedBadge(channel)}`,
    `Current: ${formatRating(channel.rating_average ?? 0)} / 5 from ${formatNumber(channel.rating_count ?? 0)} ratings`,
    "",
    "Choose your rating.",
  ].join("\n");
}

export function ratingKeyboard(channelId: number): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "⭐ 1", callback_data: `rating:${channelId}:1` },
        { text: "⭐⭐ 2", callback_data: `rating:${channelId}:2` },
      ],
      [
        { text: "⭐⭐⭐ 3", callback_data: `rating:${channelId}:3` },
        { text: "⭐⭐⭐⭐ 4", callback_data: `rating:${channelId}:4` },
      ],
      [{ text: "⭐⭐⭐⭐⭐ 5", callback_data: `rating:${channelId}:5` }],
      backHomeRow(`channel:${channelId}`, "home"),
    ],
  };
}

export function searchHelpText(): string {
  return ["🔎 Search Channels", "", "Send a keyword, category, language, or channel username."].join("\n");
}

export function searchPromptKeyboard(): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [...searchFilterRows(), backHomeRow("home", "home")],
  };
}

export function searchResultsText(
  state: SearchViewState,
  channels: Channel[],
  page: number,
  hasNext: boolean,
): string {
  if (channels.length === 0) {
    return [
      "<b>😕 No channels found</b>",
      "",
      "Try another keyword or browse categories."
    ].join("\n");
  }

  const queryLabel = state.query.trim() || "All approved channels";
  const pageInfo = `Page ${page + 1}${hasNext ? "" : " • Last page"}`;

  return [
    `<b>🔍 Search Results for:</b> ${queryLabel}`,
    `📄 ${pageInfo}`,
    "",
    ...channels.map((channel, index) => channelListLine(channel, index + 1)),
    "",
    "Choose a channel below.",
  ].join("\n");
}

export function searchResultsKeyboard(
  channels: Channel[],
  page: number,
  hasNext: boolean,
): TelegramInlineKeyboardMarkup {
  const rows: KeyboardRows = buttonRows(
    channels.map((channel, index) => ({
      text: channelButtonText(channel, index),
      callback_data: `channel:${channel.id}`,
    })),
  );

  const pager = [];
  if (page > 0) {
    pager.push({ text: "⬅️ Previous", callback_data: `sr:p:${page - 1}` });
  }

  if (hasNext) {
    pager.push({ text: "Next ➡️", callback_data: `sr:p:${page + 1}` });
  }

  if (pager.length > 0) {
    rows.push(pager);
  }

  rows.push(...searchFilterRows());
  rows.push(backHomeRow("search", "home"));

  return { inline_keyboard: rows };
}

export function searchLanguageKeyboard(): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [
      ...buttonRows(LANGUAGES.map(lang => ({ text: lang, callback_data: `sr:lg:${lang.substring(0, 2).toLowerCase()}` }))),
      backHomeRow("sr:p:0", "home"),
    ],
  };
}

export function searchLanguageText(): string {
  return ["🌍 Language", "", "Choose a language filter."].join("\n");
}

export function channelResultsText(title: string, channels: Channel[]): string {
  if (channels.length === 0) {
    return [title, "", EMPTY_STATE_TEXT].join("\n");
  }

  return formatChannelList(channels, title);
}

export function channelResultsKeyboard(
  channels: Channel[],
  backCallback = "home",
  section?: "top" | "featured" | "new",
  page = 0,
  hasNext = false,
): TelegramInlineKeyboardMarkup {
  const rows = buttonRows(
    channels.map((channel, index) => ({
      text: channelButtonText(channel, index),
      callback_data: `channel:${channel.id}`,
    })),
  );
  if (section) {
    const pager: TelegramInlineKeyboardButton[] = [];
    if (page > 0) {
      pager.push({ text: "⬅️ Previous", callback_data: `page:${section}:${page - 1}` });
    }
    if (hasNext) {
      pager.push({ text: "Next ➡️", callback_data: `page:${section}:${page + 1}` });
    }
    if (pager.length > 0) {
      rows.push(pager);
    }
  }
  rows.push(backHomeRow(backCallback));
  return { inline_keyboard: rows };
}

export function savedChannelsText(channels: Channel[], page: number, hasNext: boolean): string {
  if (channels.length === 0) {
    return [
      "💾 Saved Channels",
      "",
      "📭 No saved channels yet.",
      "",
      "Explore channels and tap 💾 Save Channel to keep them here.",
    ].join("\n");
  }

  return [
    "💾 Saved Channels",
    "",
    "Here are your saved channels.",
    `Page ${page + 1}${hasNext ? "" : " • Last page"}`,
    "",
    ...channels.map(savedChannelLine),
  ].join("\n\n");
}

export function savedChannelsKeyboard(
  channels: Channel[],
  page: number,
  hasNext: boolean,
): TelegramInlineKeyboardMarkup {
  const rows: KeyboardRows = [];

  for (const channel of channels) {
    rows.push([
      { text: `🔎 ${truncateButtonText(channel.title)}`, callback_data: `channel:${channel.id}` },
      { text: "❌ Remove", callback_data: `unsave:${channel.id}` },
    ]);
  }

  const pager = [];
  if (page > 0) {
    pager.push({ text: "⬅️ Previous", callback_data: `saved_page:${page - 1}` });
  }

  if (hasNext) {
    pager.push({ text: "Next ➡️", callback_data: `saved_page:${page + 1}` });
  }

  if (pager.length > 0) {
    rows.push(pager);
  }

  rows.push(backHomeRow("home", "home"));
  return { inline_keyboard: rows };
}

export function leaderboardText(sections: LeaderboardSections): string {
  const hasChannels = [
    ...sections.top,
    ...sections.rated,
    ...sections.clicked,
    ...sections.newChannels,
  ].length > 0;

  if (!hasChannels) {
    return ["🏆 Weekly Leaderboard", "", "No approved channels are ready for the leaderboard yet."].join("\n");
  }

  const fallbackNote = sections.fallback
    ? ["No weekly movement yet, so showing top approved channels.", ""]
    : [];

  return [
    "🏆 𝗪𝗲𝗲𝗸𝗹𝘆 𝗟𝗲𝗮𝗱𝗲𝗿𝗯𝗼𝗮𝗿𝗱",
    "",
    "The most active and trusted channels this week.",
    "",
    SECTION_DIVIDER,
    "",
    ...fallbackNote,
    ...leaderboardSectionLines("🔥 Top This Week", sections.top),
    ...leaderboardSectionLines("⭐ Highest Rated", sections.rated),
    ...leaderboardSectionLines("👀 Most Clicked", sections.clicked),
    ...leaderboardSectionLines("🆕 Best New Channels", sections.newChannels),
    "Choose a channel below.",
  ].join("\n");
}

export function leaderboardKeyboard(channels: Channel[]): TelegramInlineKeyboardMarkup {
  const uniqueChannels = uniqueById(channels).slice(0, 6);
  const rows: KeyboardRows = uniqueChannels.map((channel, index) => [
    { text: channelButtonText(channel, index), callback_data: `channel:${channel.id}` },
  ]);

  rows.push(backHomeRow("home", "home"));
  return { inline_keyboard: rows };
}

export function weeklyLeaderboardPostText(channels: Channel[]): string {
  return formatWeeklyLeaderboard(channels);
}

export function formatWeeklyLeaderboard(channels: Channel[]): string {
  const approvedChannels = channels.filter((channel) => channel.status === "approved").slice(0, 10);

  return [
    "🏆 𝗡𝗲𝘅𝗖𝗵𝗮𝗻𝗻𝗲𝗹 𝗪𝗲𝗲𝗸𝗹𝘆 𝗟𝗲𝗮𝗱𝗲𝗿𝗯𝗼𝗮𝗿𝗱",
    "",
    "Discover the most active and trusted Telegram channels this week.",
    "",
    SECTION_DIVIDER,
    "",
    ...approvedChannels.flatMap((channel, index) => [
      weeklyPostChannelBlock(channel, index + 1),
      "",
      SECTION_DIVIDER,
      "",
    ]),
    "",
    "🔎 Find more useful channels with NexChannel Finder.",
    "📢 Submit your channel and grow your audience.",
  ].join("\n");
}

export function weeklyLeaderboardPostKeyboard(botUsername?: string): TelegramInlineKeyboardMarkup | undefined {
  const openBotUrl = botUrl(botUsername);
  if (!openBotUrl) {
    return undefined;
  }

  return {
    inline_keyboard: [
      [{ text: "🤖 Open Bot", url: openBotUrl }],
      [{ text: "📢 Submit Channel", url: `${openBotUrl}?start=submit` }],
    ],
  };
}

export function ownershipVerificationText(data: {
  channelId: number;
  verificationCode: string;
  channelType: "public" | "private";
}): string {
  const privateNote =
    data.channelType === "private"
      ? ["", "Private channels need bot-admin access for automatic verification or manual admin review."]
      : [];

  return [
    "🔐 Channel Ownership Verification",
    "",
    "To prove this channel belongs to you, complete one verification step.",
    "",
    "Your verification code:",
    data.verificationCode,
    "",
    "Choose one method:",
    "1. Add this bot as admin in your channel temporarily.",
    "2. Post the verification code in your channel.",
    "3. Send proof to admin for manual review.",
    ...privateNote,
  ].join("\n");
}

export function ownershipVerificationKeyboard(channelId: number): TelegramInlineKeyboardMarkup {
  void channelId;
  return {
    inline_keyboard: [
      [{ text: "✅ I Added Bot as Admin", callback_data: "verify_added_bot" }],
      [{ text: "📩 Send Manual Proof", callback_data: "verify_manual_proof" }],
      [{ text: "❌ Cancel", callback_data: "submit_cancel" }],
      backHomeRow("submit", "home"),
    ],
  };
}

export function myChannelsText(channels: Channel[], page: number, hasNext: boolean): string {
  if (channels.length === 0) {
    return ["📭 You have not submitted any channels yet.", "", "Submit a useful channel to start tracking stats."].join("\n");
  }

  return [
    "📊 My Channels",
    `Page ${page + 1}${hasNext ? "" : " • Last page"}`,
    "",
    ...channels.map((channel) => myChannelSummary(channel)),
    "",
    "Choose a Channel ID below.",
  ].join("\n\n");
}

export function myChannelsKeyboard(
  channels: Channel[],
  page: number,
  hasNext: boolean,
): TelegramInlineKeyboardMarkup {
  const rows: KeyboardRows = buttonRows(
    channels.map((channel) => ({ text: `🆔 ${channel.id}`, callback_data: `my_channel:${channel.id}` })),
  );

  rows.push([{ text: "📢 Submit New Channel", callback_data: "submit" }]);

  const pager = [];
  if (page > 0) {
    pager.push({ text: "⬅️ Previous", callback_data: `page:my_channels:${page - 1}` });
  }

  if (hasNext) {
    pager.push({ text: "Next ➡️", callback_data: `page:my_channels:${page + 1}` });
  }

  if (pager.length > 0) {
    rows.push(pager);
  }

  rows.push(backHomeRow("home", "home"));
  return { inline_keyboard: rows };
}

export function myChannelDetailsText(channel: Channel): string {
  return myChannelSummary(channel);
}

export function myChannelStatsText(channel: Channel): string {
  return [
    "📈 Channel Stats",
    "",
    myChannelSummary(channel),
  ].join("\n");
}

export function myChannelDetailsKeyboard(channelId: number): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: "📈 View Stats", callback_data: `my_channel_stats:${channelId}` }],
      [
        { text: "✏️ Edit Channel", callback_data: `my_channel_edit:${channelId}` },
        { text: "🗑 Remove Channel", callback_data: `my_channel_remove:${channelId}` },
      ],
      backHomeRow("my_channels", "home"),
    ],
  };
}

export function myChannelRemoveConfirmText(channel: Channel): string {
  return [
    "🗑 Remove Channel",
    "",
    `Hide ${channel.title} from NexChannel Finder?`,
    "You can ask an admin to restore it later.",
  ].join("\n");
}

export function myChannelRemoveConfirmKeyboard(channelId: number): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: "✅ Confirm Remove", callback_data: `my_channel_confirm_remove:${channelId}` }],
      backHomeRow(`my_channel:${channelId}`, "home"),
    ],
  };
}

export function myChannelEditText(channel: Channel): string {
  return [
    "✏️ Edit Channel",
    "",
    `🆔 Channel ID: ${channel.id}`,
    `📢 ${channel.title}${verifiedBadge(channel)}`,
    "",
    "Choose a field to update.",
  ].join("\n");
}

export function myChannelEditKeyboard(channelId: number): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "📝 Description", callback_data: `mc:ef:${channelId}:d` },
        { text: "🏷 Tags", callback_data: `mc:ef:${channelId}:t` },
      ],
      [
        { text: "📂 Category", callback_data: `mc:ef:${channelId}:c` },
        { text: "🌍 Language", callback_data: `mc:ef:${channelId}:l` },
      ],
      backHomeRow(`my_channel:${channelId}`, "home"),
    ],
  };
}

export function myChannelEditPromptText(channel: Channel, field: "description" | "tags"): string {
  const label = field === "description" ? "description" : "tags";
  return [
    `✏️ Edit ${label}`,
    "",
    `🆔 Channel ID: ${channel.id}`,
    "",
    field === "description" ? "Send a short updated description." : "Send tags separated by commas.",
  ].join("\n");
}

export function myChannelCategoryKeyboard(channelId: number, categories?: Category[]): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [
      ...buttonRows(
        CATEGORIES.map((category) => ({
          text: `${category.emoji} ${category.label}`,
          callback_data: `mc:ec:${channelId}:${category.key}`,
        })),
      ),
      backHomeRow(`my_channel_edit:${channelId}`, "home"),
    ],
  };
}

export function myChannelLanguageKeyboard(channelId: number): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [
      ...buttonRows(LANGUAGES.map((language) => ({ text: language, callback_data: `mc:el:${channelId}:${language}` }))),
      backHomeRow(`my_channel_edit:${channelId}`, "home"),
    ],
  };
}

export function submitHelpText(categories: Category[]): string {
  const categoryLines = categories.map((category) => `• ${category.name} (${category.slug})`);

  return [
    "📢 Submit Channel",
    "",
    "Tap Submit in the menu to use the guided flow.",
    "",
    "Categories:",
    ...categoryLines,
  ].join("\n");
}

export function reportHelpText(): string {
  return [
    "🚨 Report",
    "",
    "Use this format:",
    "/report channel_id reason",
    "",
    "Example:",
    "/report 12 Broken link",
  ].join("\n");
}

export function reportChannelPromptText(channelId: number): string {
  return [`🚨 Report channel #${channelId}`, "", "Choose a reason below."].join("\n");
}

export function reportReasonKeyboard(channelId: number): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "🚫 Spam", callback_data: `report_reason:${channelId}:spam` },
        { text: "🔞 Adult", callback_data: `report_reason:${channelId}:adult` },
      ],
      [
        { text: "⚠️ Scam", callback_data: `report_reason:${channelId}:scam` },
        { text: "©️ Copyright", callback_data: `report_reason:${channelId}:copyright` },
      ],
      [{ text: "❓ Other", callback_data: `report_reason:${channelId}:other` }],
      backHomeRow(`channel:${channelId}`, "home"),
    ],
  };
}

export function adminPanelText(): string {
  return [
    "🛠 𝗔𝗱𝗺𝗶𝗻 𝗣𝗮𝗻𝗲𝗹",
    "",
    SECTION_DIVIDER,
    "",
    "📊 Manage channel submissions, approvals, hidden channels, reports, and verification.",
    "",
    SECTION_DIVIDER,
  ].join("\n");
}

export function adminStatsText(stats: AdminStats & { ownershipVerifiedChannels?: number; scamChannels?: number; totalViews?: number }): string {
  return [
    "📊 𝗕𝗼𝘁 𝗦𝘁𝗮𝘁𝘀",
    "",
    SECTION_DIVIDER,
    "",
    `📢 Total Channels: ${formatNumber(stats.totalChannels)}`,
    `⏳ Pending: ${formatNumber(stats.pendingChannels)}`,
    `✅ Approved: ${formatNumber(stats.approvedChannels)}`,
    `🚫 Hidden: ${formatNumber(stats.hiddenChannels)}`,
    `⭐ Quality Verified: ${formatNumber(stats.verifiedChannels)}`,
    `🔐 Ownership Verified: ${formatNumber(stats.ownershipVerifiedChannels ?? 0)}`,
    `🤬 Scam Flagged: ${formatNumber(stats.scamChannels ?? 0)}`,
    `👥 Users: ${formatNumber(stats.totalUsers)}`,
    `💾 Saved: ${formatNumber(stats.totalSaved)}`,
    `⭐ Ratings: ${formatNumber(stats.totalRatings)}`,
    `👁 Total Views: ${formatNumber(stats.totalViews ?? 0)}`,
    `🖱 Total Clicks: ${formatNumber(stats.totalClicks)}`,
    `🚨 Reports: ${formatNumber(stats.totalReports)}`,
    "",
    SECTION_DIVIDER,
  ].join("\n");
}

export function formatChannelAnalytics(channel: Channel): string {
  const rating = formatRating(channel.rating_average ?? 0);
  return [
    `<b>📊 Analytics for ${channel.title}</b>`,
    "",
    `👁 <b>Total Views:</b> ${formatNumber(channel.views ?? 0)}`,
    `🖱 <b>Total Clicks:</b> ${formatNumber(channel.join_clicks ?? channel.clicks ?? 0)}`,
    `⭐ <b>Average Rating:</b> ${rating} / 5 (${formatNumber(channel.rating_count ?? 0)} ratings)`,
    `🔥 <b>Trending Score:</b> ${formatNumber(channel.trending_score ?? 0)}`,
  ].join("\n");
}

export function formatRecommendationText(channel: Channel): string {
  return [
    `<b>🧠 Smart Recommendation for you!</b>`,
    "",
    `Based on your recent activity, you might like this channel:`,
    "",
    formatChannelDetails(channel, { hideSearchHeader: true })
  ].join("\n");
}

export function adminKeyboard(backCallback = "home"): TelegramInlineKeyboardMarkup {
  void backCallback;

  return {
    inline_keyboard: [
      [
        { text: "📊 Stats", callback_data: "admin_stats" },
        { text: "⏳ Pending", callback_data: "admin_pending" },
      ],
      [
        { text: "✅ Approved", callback_data: "admin_approved" },
        { text: "🚫 Hidden", callback_data: "admin_hidden" },
      ],
      [
        { text: "🔎 Search", callback_data: "a:q" },
        { text: "🚨 Reports", callback_data: "a:rp" },
      ],
      [
        { text: "📢 Broadcast", callback_data: "a:b" },
        { text: "⭐ Verified", callback_data: "a:v" },
      ],
      [{ text: "🏆 Post Leaderboard", callback_data: "admin_post_leaderboard" }],
      [{ text: "🏠 Home", callback_data: "home" }],
    ],
  };
}

export function adminBackKeyboard(): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [backHomeRow("admin_back", "home")],
  };
}

export function adminEmptyText(title: string): string {
  return [title, "", "No channels found here right now."].join("\n");
}

export function adminStatusListText(
  title: string,
  channels: Channel[],
  page: number,
  hasNext: boolean,
): string {
  if (channels.length === 0) {
    return adminEmptyText(title);
  }

  return [
    title,
    `Page ${page + 1}${hasNext ? "" : " • Last page"}`,
    "",
    ...channels.map(adminListLine),
    "",
    "Choose a Channel ID below.",
  ].join("\n");
}

export function adminStatusListKeyboard(
  status: "pending" | "approved" | "hidden",
  channels: Channel[],
  page: number,
  hasNext: boolean,
): TelegramInlineKeyboardMarkup {
  const rows = buttonRows(
    channels.map((channel) => ({ text: `🆔 ${channel.id}`, callback_data: `admin_channel:${channel.id}` })),
  );
  const pager: TelegramInlineKeyboardButton[] = [];
  if (page > 0) {
    pager.push({ text: "⬅️ Previous", callback_data: `page:admin_${status}:${page - 1}` });
  }
  if (hasNext) {
    pager.push({ text: "Next ➡️", callback_data: `page:admin_${status}:${page + 1}` });
  }
  if (pager.length > 0) {
    rows.push(pager);
  }
  rows.push(backHomeRow("admin_back", "home"));
  return { inline_keyboard: rows };
}

export function adminChannelText(title: string, channel: Channel): string {
  const category = categoryLabel(channel);
  const channelType = isPrivateChannel(channel) ? "Private" : "Public";
  const channelLink = isPrivateChannel(channel)
    ? "Private Channel"
    : (channelUsername(channel) || channel.channel_link || "Unknown");
  const description = channel.description?.trim() || "No description added yet.";
  const verCode = channel.verification_code ?? "—";
  const ownerStatus = channel.owner_verified ? "✅ Verified" : verificationStatusLabel(channel);

  return [
    "📢 𝗖𝗵𝗮𝗻𝗻𝗲𝗹 𝗥𝗲𝘃𝗶𝗲𝘄",
    "",
    SECTION_DIVIDER,
    "",
    `🆔 𝗜𝗗: ${channel.id}`,
    `📌 𝗡𝗮𝗺𝗲: ${channel.title}${verifiedBadge(channel)}`,
    `🔐 𝗧𝘆𝗽𝗲: ${channelType}`,
    `🔗 𝗖𝗵𝗮𝗻𝗻𝗲𝗹: ${channelLink}`,
    `📂 𝗖𝗮𝘁𝗲𝗴𝗼𝗿𝘆: ${category}`,
    `🌍 𝗟𝗮𝗻𝗴𝘂𝗮𝗴𝗲: ${channel.language ?? "Mixed"}`,
    `✅ 𝗦𝘁𝗮𝘁𝘂𝘀: ${capitalize(channel.status)}`,
    "",
    `👤 𝗢𝘄𝗻𝗲𝗿: ${channel.owner_telegram_id ?? "Unknown"}`,
    channel.admin_username ? `👤 𝗔𝗱𝗺𝗶𝗻 𝗨𝘀𝗲𝗿𝗻𝗮𝗺𝗲: ${channel.admin_username}` : null,
    `🔐 𝗩𝗲𝗿𝗶𝗳𝗶𝗰𝗮𝘁𝗶𝗼𝗻: ${verCode}`,
    `🔐 𝗢𝘄𝗻𝗲𝗿 𝗦𝘁𝗮𝘁𝘂𝘀: ${ownerStatus}`,
    "",
    SECTION_DIVIDER,
    "",
    `📝 𝗗𝗲𝘀𝗰𝗿𝗶𝗽𝘁𝗶𝗼𝗻: ${description}`,
    "",
    channel.tags ? `🏷 𝗧𝗮𝗴𝘀: ${channel.tags}` : null,
    "",
    SECTION_DIVIDER,
    "",
    `⭐ Rating: ${formatRating(channel.rating_average ?? 0)} / 5 (👥 ${formatNumber(channel.rating_count ?? 0)})`,
    `👀 Views: ${formatNumber(channel.views ?? 0)}`,
    `🖱 Clicks: ${formatNumber(channel.join_clicks ?? channel.clicks ?? 0)}`,
    `🚨 Reports: ${formatNumber(channel.reports ?? channel.reports_count ?? 0)}`,
    `🔥 Trending Score: ${formatNumber(channel.trending_score ?? 0)}`,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

export function pendingChannelKeyboard(channelId: number): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "✅ Approve", callback_data: `admin_approve:${channelId}` },
        { text: "❌ Reject", callback_data: `admin_reject:${channelId}` },
      ],
      [
        { text: "🚫 Hide", callback_data: `admin_hide:${channelId}` },
        { text: "⭐ Verify Channel", callback_data: `admin_verify:${channelId}` },
      ],
      [{ text: "🔐 Mark Owner Verified", callback_data: `admin_owner_verify:${channelId}` }],
      backHomeRow("admin_back", "home"),
    ],
  };
}

export function approvedChannelKeyboard(channelId: number): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "🚫 Hide", callback_data: `admin_hide:${channelId}` },
        { text: "⭐ Verify Channel", callback_data: `admin_verify:${channelId}` },
      ],
      [{ text: "🔐 Mark Owner Verified", callback_data: `admin_owner_verify:${channelId}` }],
      [{ text: "☆ Remove Verification", callback_data: `admin_unverify:${channelId}` }],
      backHomeRow("admin_back", "home"),
    ],
  };
}

export function hiddenChannelKeyboard(channelId: number): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: "✅ Approve Again", callback_data: `admin_approve:${channelId}` }],
      [{ text: "🔐 Mark Owner Verified", callback_data: `admin_owner_verify:${channelId}` }],
      [{ text: "🗑 Remove", callback_data: `a:rm:${channelId}` }],
      backHomeRow("admin_back", "home"),
    ],
  };
}

export function rejectedChannelKeyboard(channelId: number): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: "✅ Approve", callback_data: `admin_approve:${channelId}` }],
      [{ text: "🔐 Mark Owner Verified", callback_data: `admin_owner_verify:${channelId}` }],
      [{ text: "🗑 Remove", callback_data: `a:rm:${channelId}` }],
      backHomeRow("admin_back", "home"),
    ],
  };
}

export function adminSearchPromptText(): string {
  return ["🔎 Search Channel", "", "Send a channel ID, title, username, category, language, tag, or admin username."].join("\n");
}

export function adminSearchResultsText(query: string, channels: Channel[]): string {
  if (channels.length === 0) {
    return [`🔎 Search Channel: ${query}`, "", "No matching channels found."].join("\n");
  }

  return [
    `🔎 Search Channel: ${query}`,
    "",
    ...channels.map((channel, index) => `${index + 1}. ${adminListLine(channel)}`),
    "",
    "Choose a Channel ID below.",
  ].join("\n");
}

export function adminSearchResultsKeyboard(channels: Channel[]): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [
      ...buttonRows(channels.map((channel) => ({ text: `🆔 ${channel.id}`, callback_data: `admin_channel:${channel.id}` }))),
      backHomeRow("admin_back", "home"),
    ],
  };
}

export function broadcastPromptText(): string {
  return ["📢 Broadcast", "", "Send the message you want to broadcast to all users."].join("\n");
}

export function broadcastConfirmText(message: string): string {
  return ["Send this broadcast?", "", message].join("\n");
}

export function broadcastConfirmKeyboard(): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "✅ Send", callback_data: "a:bs" },
        { text: "❌ Cancel", callback_data: "a:bx" },
      ],
      backHomeRow("admin_back", "home"),
    ],
  };
}

export function paginationKeyboard(options: PaginationOptions): TelegramInlineKeyboardMarkup {
  const rows: KeyboardRows = [];
  const pager = [];

  if (options.previousCallback) {
    pager.push({ text: "⬅️ Previous", callback_data: options.previousCallback });
  }

  if (options.nextCallback) {
    pager.push({ text: "Next ➡️", callback_data: options.nextCallback });
  }

  if (pager.length > 0) {
    rows.push(pager);
  }

  rows.push(backHomeRow(options.backCallback ?? "home", options.homeCallback ?? "home"));

  return { inline_keyboard: rows };
}

export function pendingSubmissionsText(submissions: Submission[]): string {
  if (submissions.length === 0) {
    return ["⏳ Pending Submissions", "", "No pending submissions."].join("\n");
  }

  return [
    "⏳ Pending Submissions",
    "",
    ...submissions.map((submission) => `🆔 ${submission.id} • ${submission.title} • ${submission.category_slug}`),
  ].join("\n");
}

export function pendingSubmissionsKeyboard(submissions: Submission[]): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [
      ...buttonRows(submissions.map((submission) => ({ text: `🆔 ${submission.id}`, callback_data: `admin_channel:${submission.id}` }))),
      backHomeRow("admin_back", "home"),
    ],
  };
}

export function submissionDetailsText(submission: Submission): string {
  const channelLabel =
    submission.channel_type === "private" ? "Private Channel" : submission.username ?? "Public channel";

  return [
    "📢 New Channel Submission",
    "",
    `🆔 Channel ID: ${submission.id}`,
    `📨 Channel: ${channelLabel}`,
    `🔐 Type: ${submission.channel_type === "private" ? "Private" : "Public"}`,
    `📂 Category: ${submission.category_slug}`,
    submission.language ? `🌍 Language: ${submission.language}` : "",
    submission.description ? `📝 Description: ${submission.description}` : "",
    submission.tags ? `🏷 Tags: ${submission.tags}` : "",
    `👤 Submitted by: ${submission.user_id}`,
    submission.admin_username ? `🛠 Admin Username: ${submission.admin_username}` : "",
    "",
    "<b>Quality Checklist:</b>",
    `✅ Has Description: ${submission.description ? "Yes" : "No"}`,
    `✅ Has Avatar: Pending`,
    `✅ 100+ Subs: Pending`,
    `✅ Safe Content: Pending`,
    "",
    "🔐 Ownership Verification",
    `Status: ${verificationStatusLabel(submission)}`,
    `✅ Status: ${capitalize(submission.status)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function adminReviewNotificationKeyboard(channelId: number, link?: string): TelegramInlineKeyboardMarkup {
  const keyboard: TelegramInlineKeyboardMarkup = {
    inline_keyboard: [
      [
        { text: "✅ Approve", callback_data: `admin_approve:${channelId}` },
        { text: "❌ Reject", callback_data: `admin_reject:${channelId}` },
      ],
      [
        { text: "🚫 Mark Scam", callback_data: `admin_scam:${channelId}` },
        { text: "⭐ Ask Verify", callback_data: `admin_verify:${channelId}` },
      ],
    ],
  };
  
  if (link) {
    keyboard.inline_keyboard.unshift([{ text: "🔗 Open Submitted Link", url: link }]);
  }
  
  return keyboard;
}

export function submissionReviewKeyboard(submissionId: number, link?: string): TelegramInlineKeyboardMarkup {
  return adminReviewNotificationKeyboard(submissionId, link);
}

export function adminSubmissionNotificationText(data: {
  id: number;
  title: string;
  channel: string;
  channelType: "public" | "private" | "bot";
  category: string;
  language: string;
  description: string;
  tags: string;
  adminUsername: string;
  verificationCode: string;
}): string {
  const channelLabel = data.channelType === "private" ? "Private Channel" : data.channel;
  const typeLabel = data.channelType === "private" ? "Private" : "Public";

  return [
    "📢 𝗡𝗲𝘄 𝗖𝗵𝗮𝗻𝗻𝗲𝗹 𝗦𝘂𝗯𝗺𝗶𝘀𝘀𝗶𝗼𝗻",
    "",
    SECTION_DIVIDER,
    "",
    `🆔 𝗖𝗵𝗮𝗻𝗻𝗲𝗹 𝗜𝗗: ${data.id}`,
    `📌 𝗡𝗮𝗺𝗲: ${data.title}`,
    `🔐 𝗧𝘆𝗽𝗲: ${typeLabel}`,
    `🔗 𝗖𝗵𝗮𝗻𝗻𝗲𝗹: ${channelLabel}`,
    `📂 𝗖𝗮𝘁𝗲𝗴𝗼𝗿𝘆: ${data.category}`,
    `🌍 𝗟𝗮𝗻𝗴𝘂𝗮𝗴𝗲: ${data.language}`,
    "",
    `👤 𝗔𝗱𝗺𝗶𝗻 𝗨𝘀𝗲𝗿𝗻𝗮𝗺𝗲: ${data.adminUsername}`,
    `🔐 𝗩𝗲𝗿𝗶𝗳𝗶𝗰𝗮𝘁𝗶𝗼𝗻: ${data.verificationCode}`,
    "",
    SECTION_DIVIDER,
    "",
    `📝 𝗗𝗲𝘀𝗰𝗿𝗶𝗽𝘁𝗶𝗼𝗻: ${data.description}`,
    "",
    `🏷 𝗧𝗮𝗴𝘀: ${data.tags}`,
  ].join("\n");
}

export function channelSubmittedText(channelId: number): string {
  return [
    "✅ 𝗬𝗼𝘂𝗿 𝗰𝗵𝗮𝗻𝗻𝗲𝗹 𝗵𝗮𝘀 𝗯𝗲𝗲𝗻 𝘀𝘂𝗯𝗺𝗶𝘁𝘁𝗲𝗱!",
    "",
    `🆔 Channel ID: ${channelId}`,
    "Status: ⏳ Waiting for admin approval",
    "",
    "Our admin will review your channel soon.",
  ].join("\n");
}

export function channelSubmittedAdminNotifyFailedText(): string {
  return [
    "✅ Submitted successfully.",
    "⚠️ Admin notification failed, but admin can review from Admin Panel.",
  ].join("\n");
}

export function openReportsText(reports: Report[]): string {
  if (reports.length === 0) {
    return ["🚨 Open Reports", "", "No open reports."].join("\n");
  }

  return [
    "🚨 Open Reports",
    "",
    ...reports.map((report) => {
      const channel = report.channel_id ? `channel #${report.channel_id}` : "general report";
      return `#${report.id} • ${channel}: ${report.reason}`;
    }),
  ].join("\n");
}

export function openReportsKeyboard(reports: Report[]): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [
      ...reports.map((report) => [
        { text: `✅ Resolve #${report.id}`, callback_data: `a:rr:${report.id}` },
      ]),
      backHomeRow("admin_back", "home"),
    ],
  };
}

export function mainMenu(isAdmin: boolean, uiLanguage?: string): TelegramInlineKeyboardMarkup {
  return mainMenuKeyboard(isAdmin, uiLanguage);
}

export function forceSubscribeKeyboard(link?: string): TelegramInlineKeyboardMarkup {
  return forceSubKeyboard(link);
}

export function backToMenuKeyboard(): TelegramInlineKeyboardMarkup {
  return backHomeKeyboard("home");
}

export function adminMenuKeyboard(): TelegramInlineKeyboardMarkup {
  return adminKeyboard();
}

function searchFilterRows(): KeyboardRows {
  return [
    [
      { text: "🔥 Trending", callback_data: "sr:o:t" },
      { text: "⭐ Top Rated", callback_data: "sr:o:r" },
    ],
    [
      { text: "👀 Most Clicked", callback_data: "sr:o:c" },
      { text: "🆕 Newest", callback_data: "sr:o:n" },
    ],
    [
      { text: "✅ Verified", callback_data: "sr:f:v" },
      { text: "🌍 Language", callback_data: "sr:l" },
    ],
  ];
}

function searchFilterSummary(state: SearchViewState): string {
  const labels = [searchSortLabel(state.sort)];

  if (state.verifiedOnly) {
    labels.push("Verified");
  }

  if (state.language) {
    labels.push(state.language);
  }

  return labels.join(" / ");
}

function searchSortLabel(sort: SearchSort): string {
  switch (sort) {
    case "votes":
      return "Most Voted";
    case "clicks":
      return "Most Clicked";
    case "newest":
      return "Newest";
    case "trending":
    default:
      return "Trending";
  }
}

function myChannelSummary(channel: Channel): string {
  return [
    `📢 <b>${escapeHtml(channel.title)}</b>${verifiedBadge(channel)}`,
    `🆔 Channel ID: ${channel.id}`,
    `🔗 ${escapeHtml(channelDisplayLabel(channel))}`,
    `📂 Category: ${escapeHtml(categoryLabel(channel))}`,
    `🌍 Language: ${escapeHtml(channel.language ?? "Mixed")}`,
    `✅ Status: ${capitalize(channel.status)}`,
    `⭐ Rating: ${formatRating(channel.rating_average ?? 0)} / 5`,
    `👥 Total Ratings: ${formatNumber(channel.rating_count ?? 0)}`,
    `👀 Clicks: ${formatNumber(channel.join_clicks ?? channel.clicks ?? 0)}`,
    `🔥 Score: ${formatNumber(channel.trending_score ?? 0)}`,
  ].join("\n");
}

function channelListLine(channel: Channel, number: number): string {
  return [
    `${KEYCAP_NUMBERS[number - 1] ?? `${number}.`} <b>${escapeHtml(channel.title)}</b>${verifiedBadge(channel)}`,
    `🆔 ID: ${channel.id}`,
    `📂 ${escapeHtml(categoryLabel(channel))} • 🌍 ${escapeHtml(channel.language ?? "Mixed")}`,
    `⭐ ${formatRating(channel.rating_average ?? 0)} / 5 • 👀 ${formatNumber(channel.join_clicks ?? channel.clicks ?? 0)} clicks`,
  ].join("\n");
}

function savedChannelLine(channel: Channel): string {
  return [
    `📢 <b>${escapeHtml(channel.title)}</b>${verifiedBadge(channel)}`,
    `🆔 ID: ${channel.id}`,
    `📂 ${escapeHtml(categoryLabel(channel))} • 🌍 ${escapeHtml(channel.language ?? "Mixed")}`,
    `⭐ ${formatRating(channel.rating_average ?? 0)} / 5 • 👀 ${formatNumber(channel.join_clicks ?? channel.clicks ?? 0)} clicks`,
  ].join("\n");
}

function leaderboardSectionLines(title: string, channels: Channel[]): string[] {
  if (channels.length === 0) {
    return [unicodeBold(title), "No channels yet.", "", SECTION_DIVIDER, ""];
  }

  return [
    unicodeBold(title),
    ...channels.slice(0, 3).map((channel, index) => leaderboardChannelLine(channel, index + 1)),
    "",
    SECTION_DIVIDER,
    "",
  ];
}

function leaderboardChannelLine(channel: Channel, rank: number): string {
  const medal = rank === 1 ? "🏆" : rank === 2 ? "🏅" : rank === 3 ? "🥉" : `${rank}.`;
  const weeklyClicks = channel.weekly_clicks ?? channel.join_clicks ?? channel.clicks ?? 0;
  const rating = channel.weekly_rating_average && channel.weekly_rating_average > 0
    ? channel.weekly_rating_average
    : channel.rating_average ?? 0;

  return [
    `${medal} <b>${escapeHtml(channel.title)}</b>${verifiedBadge(channel)}`,
    `🆔 ID: ${channel.id}`,
    `⭐ ${formatRating(rating)} / 5 • 👀 ${formatNumber(weeklyClicks)} clicks`,
  ].join("\n");
}

function weeklyPostChannelBlock(channel: Channel & { saves?: number, trending_score?: number }, rank: number): string {
  const medals = ["🥇", "🥈", "🥉"];
  const score = channel.trending_score ?? 0;
  const saves = channel.saves ?? 0;
  const rating = channel.rating_average ?? 0;
  return [
    `${medals[rank - 1] ?? "🏅"} <b>${escapeHtml(channel.title)}</b> (${escapeHtml(channelDisplayLabel(channel))})`,
    `🆔 ID: ${channel.id}`,
    `📂 ${escapeHtml(categoryLabel(channel))} • 🌍 ${escapeHtml(channel.language ?? "Mixed")}`,
    `💾 Saves: ${formatNumber(saves)} • ⭐ Rating: ${formatRating(rating)}/5`,
    `🔥 Trending Score: ${formatNumber(score)}`,
  ].join("\n");
}

export function submitterLeaderboardText(submitters: any[]): string {
  const medals = ["🥇", "🥈", "🥉"];
  return [
    "🎁 𝗧𝗼𝗽 𝗖𝗵𝗮𝗻𝗻𝗲𝗹 𝗦𝘂𝗯𝗺𝗶𝘁𝘁𝗲𝗿𝘀",
    "",
    "Thank you to our top contributors!",
    "",
    ...submitters.map((user, index) => {
      const rank = index + 1;
      const medal = medals[rank - 1] ?? "🏅";
      return `${medal} User ID: ${user.submitted_by} • ${user.approved_count} channels approved`;
    }),
  ].join("\n");
}

function adminListLine(channel: Channel): string {
  return `🆔 ${channel.id} • <b>${escapeHtml(channel.title)}</b>${verifiedBadge(channel)} • ${capitalize(channel.status)} • ${escapeHtml(categoryLabel(channel))}`;
}

function backHomeRow(backCallback = "home", homeCallback = "home"): KeyboardRows[number] {
  return [
    { text: "⬅️ Back", callback_data: backCallback },
    { text: "🏠 Home", callback_data: homeCallback },
  ];
}

function buttonRows(buttons: TelegramInlineKeyboardButton[], perRow = 2): KeyboardRows {
  const rows: KeyboardRows = [];

  for (let index = 0; index < buttons.length; index += perRow) {
    rows.push(buttons.slice(index, index + perRow));
  }

  return rows;
}

function categoryLabel(channel: ChannelCardInput): string {
  return channel.category_name ?? channel.category ?? channel.category_slug ?? "General";
}

function channelUsername(channel: ChannelCardInput): string {
  if (isPrivateChannel(channel)) {
    return "";
  }

  return channel.channel_username ?? channel.username ?? "";
}

function isPrivateChannel(channel: ChannelCardInput): boolean {
  return channel.channel_type === "private";
}

function channelDisplayLabel(channel: ChannelCardInput): string {
  if (isPrivateChannel(channel)) {
    return "Private Channel";
  }

  return channel.channel_username ?? channel.username ?? "";
}

function channelJoinLink(channel: ChannelCardInput): string | undefined {
  if (isPrivateChannel(channel)) {
    return nonEmpty(channel.invite_link);
  }

  const directLink = nonEmpty(channel.channel_link) ?? nonEmpty(channel.link);
  if (directLink) {
    return directLink;
  }

  const username = nonEmpty(channel.channel_username) ?? nonEmpty(channel.username);
  return username ? `https://t.me/${username.replace(/^@/, "")}` : undefined;
}

function botUrl(botUsername?: string): string | undefined {
  const username = botUsername?.trim().replace(/^@/, "");
  return username ? `https://t.me/${username}` : undefined;
}

function channelButtonText(channel: ChannelCardInput, index: number): string {
  const prefix = KEYCAP_NUMBERS[index] ?? `${index + 1}.`;
  return `${prefix} ${truncateButtonText(channel.title)}`;
}

function truncateButtonText(value: string, maxLength = 32): string {
  const text = value.trim();
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1)}…`;
}

function nonEmpty(value: string | null | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

function unicodeBold(value: string): string {
  return Array.from(value, (character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint >= 65 && codePoint <= 90) {
      return String.fromCodePoint(0x1d5d4 + codePoint - 65);
    }
    if (codePoint >= 97 && codePoint <= 122) {
      return String.fromCodePoint(0x1d5ee + codePoint - 97);
    }
    if (codePoint >= 48 && codePoint <= 57) {
      return String.fromCodePoint(0x1d7ec + codePoint - 48);
    }
    return character;
  }).join("");
}

function verifiedBadge(channel: Pick<Channel, "status" | "verified">): string {
  return channel.status === "approved" && Boolean(channel.verified) ? " ✅" : "";
}

function verificationStatusLabel(
  value: Partial<Pick<Channel, "owner_verified" | "verification_status">> | Pick<Submission, "owner_verified" | "verification_status">,
): string {
  if (value.owner_verified) {
    return "✅ Verified";
  }

  switch (value.verification_status) {
    case "verified":
      return "✅ Verified";
    case "manual_review":
      return "⚠️ Manual Review";
    case "failed":
      return "❌ Failed";
    case "pending":
    default:
      return "⏳ Pending";
  }
}

function uniqueById(channels: Channel[]): Channel[] {
  const seen = new Set<number>();
  const result: Channel[] = [];

  for (const channel of channels) {
    if (seen.has(channel.id)) {
      continue;
    }

    seen.add(channel.id);
    result.push(channel);
  }

  return result;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

function formatRating(value: number): string {
  return value > 0 ? formatNumber(value) : "0";
}

function compactCategoryName(value: string): string {
  return value
    .replace("Movies & Entertainment", "Movies")
    .replace("Jobs & Internships", "Jobs")
    .replace("Earning & Freelance", "Earning")
    .replace("Deals & Offers", "Deals")
    .replace("Editing / Creators", "Creators")
    .replace("Tech / Telegram", "Tech");
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// ─── YouTube Verification UI ──────────────────────────────────────────────────

export function youtubeLockText(): string {
  return [
    "🔒 𝗬𝗼𝘂𝗧𝘂𝗯𝗲 𝗦𝘂𝗯𝘀𝗰𝗿𝗶𝗽𝘁𝗶𝗼𝗻 𝗥𝗲𝗾𝘂𝗶𝗿𝗲𝗱",
    "",
    SECTION_DIVIDER,
    "",
    "To use 𝗡𝗲𝘅𝗖𝗵𝗮𝗻𝗻𝗲𝗹 𝗙𝗶𝗻𝗱𝗲𝗿, please subscribe to our YouTube channel.",
    "",
    SECTION_DIVIDER,
    "",
    "1️⃣ Tap ▶️ Subscribe YouTube",
    "2️⃣ Subscribe to the channel",
    "3️⃣ Come back after 30 seconds",
    "4️⃣ Tap ✅ I Subscribed",
    "5️⃣ Send screenshot proof",
    "",
    SECTION_DIVIDER,
    "",
    "⚠️ Fake clicks will not unlock access.",
  ].join("\n");
}

export function youtubeLockKeyboard(youtubeLink: string): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: "▶️ Subscribe YouTube", url: youtubeLink }],
      [{ text: "✅ I Subscribed", callback_data: "youtube_subscribed_check" }],
      [{ text: "🔄 Check Status", callback_data: "youtube_status" }],
    ],
  };
}

export function youtubeWaitText(): string {
  return [
    "⏳ 𝗪𝗮𝗶𝘁 𝟯𝟬 𝗦𝗲𝗰𝗼𝗻𝗱𝘀",
    "",
    "Please subscribe to our YouTube channel first.",
    "",
    "After 30 seconds, click ✅ I Subscribed again.",
  ].join("\n");
}

export function youtubeSendPhotoText(): string {
  return [
    "📸 𝗦𝗲𝗻𝗱 𝗦𝗰𝗿𝗲𝗲𝗻𝘀𝗵𝗼𝘁 𝗣𝗿𝗼𝗼𝗳",
    "",
    "Please send a screenshot showing that you subscribed to our YouTube channel.",
    "",
    "Make sure the screenshot clearly shows:",
    "✅ Subscribed button",
    "▶️ Our YouTube channel",
  ].join("\n");
}

export function youtubeProofPendingText(): string {
  return [
    "⏳ 𝗣𝗿𝗼𝗼𝗳 𝗦𝘂𝗯𝗺𝗶𝘁𝘁𝗲𝗱",
    "",
    "Your YouTube subscription proof has been sent for admin review.",
    "",
    "Please wait for approval.",
  ].join("\n");
}

export function youtubeApprovedText(): string {
  return [
    "✅ 𝗬𝗼𝘂𝗧𝘂𝗯𝗲 𝗩𝗲𝗿𝗶𝗳𝗶𝗲𝗱",
    "",
    "Your YouTube subscription has been approved.",
    "",
    "You can now use NexChannel Finder Bot.",
  ].join("\n");
}

export function youtubeRejectedText(): string {
  return [
    "❌ 𝗣𝗿𝗼𝗼𝗳 𝗥𝗲𝗷𝗲𝗰𝘁𝗲𝗱",
    "",
    "Please subscribe to our YouTube channel and send a clear screenshot proof again.",
  ].join("\n");
}

export function youtubeStatusApprovedText(): string {
  return [
    "✅ 𝗬𝗼𝘂𝗧𝘂𝗯𝗲 𝗩𝗲𝗿𝗶𝗳𝗶𝗲𝗱",
    "",
    "You can use the bot now.",
  ].join("\n");
}

export function youtubeStatusPendingText(): string {
  return [
    "⏳ 𝗣𝗿𝗼𝗼𝗳 𝗨𝗻𝗱𝗲𝗿 𝗥𝗲𝘃𝗶𝗲𝘄",
    "",
    "Please wait for admin approval.",
  ].join("\n");
}

export function youtubeStatusRejectedText(): string {
  return [
    "❌ 𝗣𝗿𝗼𝗼𝗳 𝗥𝗲𝗷𝗲𝗰𝘁𝗲𝗱",
    "",
    "Please send a clearer screenshot.",
  ].join("\n");
}

export function youtubeAdminReviewCaption(telegramId: number): string {
  return [
    "▶️ 𝗬𝗼𝘂𝗧𝘂𝗯𝗲 𝗦𝘂𝗯𝘀𝗰𝗿𝗶𝗽𝘁𝗶𝗼𝗻 𝗣𝗿𝗼𝗼𝗳",
    "",
    SECTION_DIVIDER,
    "",
    `👤 𝗨𝘀𝗲𝗿 𝗜𝗗: ${telegramId}`,
    "🧾 𝗦𝘁𝗮𝘁𝘂𝘀: Pending Review",
    "",
    SECTION_DIVIDER,
    "",
    "Approve only if the screenshot clearly shows the user subscribed.",
  ].join("\n");
}

export function youtubeAdminReviewKeyboard(telegramId: number): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "✅ Approve", callback_data: `yt_approve:${telegramId}` },
        { text: "❌ Reject", callback_data: `yt_reject:${telegramId}` },
      ],
    ],
  };
}

export function youtubeAdminApprovedCaption(telegramId: number): string {
  return [
    "▶️ 𝗬𝗼𝘂𝗧𝘂𝗯𝗲 𝗦𝘂𝗯𝘀𝗰𝗿𝗶𝗽𝘁𝗶𝗼𝗻 𝗣𝗿𝗼𝗼𝗳",
    "",
    SECTION_DIVIDER,
    "",
    `👤 𝗨𝘀𝗲𝗿 𝗜𝗗: ${telegramId}`,
    "🧾 𝗦𝘁𝗮𝘁𝘂𝘀: ✅ Approved",
  ].join("\n");
}

export function youtubeAdminRejectedCaption(telegramId: number): string {
  return [
    "▶️ 𝗬𝗼𝘂𝗧𝘂𝗯𝗲 𝗦𝘂𝗯𝘀𝗰𝗿𝗶𝗽𝘁𝗶𝗼𝗻 𝗣𝗿𝗼𝗼𝗳",
    "",
    SECTION_DIVIDER,
    "",
    `👤 𝗨𝘀𝗲𝗿 𝗜𝗗: ${telegramId}`,
    "🧾 𝗦𝘁𝗮𝘁𝘂𝘀: ❌ Rejected",
  ].join("\n");
}

export function youtubeHomeKeyboard(): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [[{ text: "🏠 Open Bot", callback_data: "home" }]],
  };
}

export function youtubeRetryKeyboard(youtubeLink: string): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: "▶️ Try Again", callback_data: "youtube_retry" }],
    ],
  };
}
