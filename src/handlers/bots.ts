import { TelegramClient } from "../telegram";
import type { BotContext, TelegramMessage } from "../types";
import { editOrSendPage } from "./banners";

// --- Text Messages ---

function botsSectionText(): string {
  return [
    "🤖 <b>𝗕𝗢𝗧 𝗗𝗜𝗥𝗘𝗖𝗧𝗢𝗥𝗬 𝗖𝗢𝗠𝗜𝗡𝗚 𝗦𝗢𝗢𝗡</b>",
    "",
    "━━━━━━━━━━━━━━",
    "",
    "🚀 <b>We are preparing a new section where you can discover the best Telegram bots.</b>",
    "",
    "<b>Soon you will be able to explore:</b>",
    "",
    "🛠 <b>Utility Bots</b>",
    "📥 <b>File Bots</b>",
    "🎬 <b>Movie Bots</b>",
    "📚 <b>Study Bots</b>",
    "🤖 <b>AI Bots</b>",
    "🎮 <b>Game Bots</b>",
    "💼 <b>Business Bots</b>",
    "💰 <b>Earning Bots</b>",
    "📢 <b>Promotion Bots</b>",
    "",
    "━━━━━━━━━━━━━━",
    "",
    "✨ <b>𝗪𝗛𝗔𝗧 𝗜𝗦 𝗖𝗢𝗠𝗜𝗡𝗚?</b>",
    "",
    "✅ <b>Bot listing</b>",
    "✅ <b>Bot categories</b>",
    "✅ <b>Bot search</b>",
    "✅ <b>Bot ratings</b>",
    "✅ <b>Verified bot badge</b>",
    "✅ <b>Submit your bot</b>",
    "✅ <b>Admin approval system</b>",
    "",
    "━━━━━━━━━━━━━━",
    "",
    "⚠️ <b>𝗦𝗔𝗙𝗘𝗧𝗬 𝗡𝗢𝗧𝗘</b>",
    "",
    "<b>We will not allow scam, betting, gambling, fake earning, crypto signal, forex signal, adult, or unsafe bots.</b>",
    "",
    "<b>Only useful and trusted bots will be approved.</b>",
    "",
    "━━━━━━━━━━━━━━",
    "",
    "⏳ <b>This feature is getting ready.</b>",
    "",
    "<b>Stay connected with NexChannel Finder.</b>",
  ].join("\n");
}

function earningBotsText(): string {
  return [
    "💰 <b>𝗘𝗔𝗥𝗡𝗜𝗡𝗚 𝗕𝗢𝗧𝗦 𝗖𝗢𝗠𝗜𝗡𝗚 𝗦𝗢𝗢𝗡</b>",
    "",
    "━━━━━━━━━━━━━━",
    "",
    "🚀 <b>We are preparing a safe section for trusted earning-related Telegram bots.</b>",
    "",
    "<b>You will soon find bots for:</b>",
    "",
    "💼 <b>Freelance tasks</b>",
    "📢 <b>Job alerts</b>",
    "🎁 <b>Rewards and points</b>",
    "📊 <b>Affiliate tools</b>",
    "🧾 <b>Survey and task listings</b>",
    "🤖 <b>Business automation</b>",
    "🎬 <b>Creator monetization</b>",
    "",
    "━━━━━━━━━━━━━━",
    "",
    "⚠️ <b>𝗦𝗔𝗙𝗘𝗧𝗬 𝗙𝗜𝗥𝗦𝗧</b>",
    "",
    "<b>We will not approve:</b>",
    "",
    "❌ <b>Betting bots</b>",
    "❌ <b>Satta bots</b>",
    "❌ <b>Casino bots</b>",
    "❌ <b>Fake earning bots</b>",
    "❌ <b>Crypto signal bots</b>",
    "❌ <b>Forex signal bots</b>",
    "❌ <b>Investment scam bots</b>",
    "❌ <b>Adult or NSFW bots</b>",
    "",
    "━━━━━━━━━━━━━━",
    "",
    "⏳ <b>Coming Soon.</b>",
  ].join("\n");
}

function notifySavedText(): string {
  return [
    "🔔 <b>𝗡𝗢𝗧𝗜𝗙𝗜𝗖𝗔𝗧𝗜𝗢𝗡 𝗦𝗔𝗩𝗘𝗗</b>",
    "",
    "━━━━━━━━━━━━━━",
    "",
    "✅ <b>You will be notified when the Bots section goes live.</b>",
    "",
    "🚀 <b>Thanks for supporting NexChannel Finder.</b>",
  ].join("\n");
}

function submitBotSoonText(): string {
  return [
    "➕ <b>𝗦𝗨𝗕𝗠𝗜𝗧 𝗕𝗢𝗧 𝗖𝗢𝗠𝗜𝗡𝗚 𝗦𝗢𝗢𝗡</b>",
    "",
    "━━━━━━━━━━━━━━",
    "",
    "🚀 <b>Soon you can submit your Telegram bot for free promotion.</b>",
    "",
    "<b>Supported bot types will include:</b>",
    "",
    "🛠 <b>Utility Bots</b>",
    "📥 <b>File Bots</b>",
    "📚 <b>Study Bots</b>",
    "🤖 <b>AI Bots</b>",
    "💰 <b>Earning Bots</b>",
    "💼 <b>Business Bots</b>",
    "📢 <b>Promotion Bots</b>",
    "",
    "━━━━━━━━━━━━━━",
    "",
    "⏳ <b>For now, please wait until the Bots section is launched.</b>",
  ].join("\n");
}

// --- Keyboards ---

function botsSectionKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "💰 Earning Bots", callback_data: "bots_earning" }],
      [{ text: "🔔 Notify Me", callback_data: "bots_notify" }],
      [{ text: "➕ Submit Bot", callback_data: "submit_bot_soon" }],
      [{ text: "🏠 Home", callback_data: "home" }],
    ],
  };
}

function earningBotsKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "🔔 Notify Me", callback_data: "bots_notify" }],
      [{ text: "🤖 Back to Bots", callback_data: "bots_section" }],
      [{ text: "🏠 Home", callback_data: "home" }],
    ],
  };
}

function botsNotifyKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "🤖 Bots", callback_data: "bots_section" }],
      [{ text: "🏠 Home", callback_data: "home" }],
    ],
  };
}

function submitBotSoonKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "🤖 Bots", callback_data: "bots_section" }],
      [{ text: "🏠 Home", callback_data: "home" }],
    ],
  };
}

// --- Handlers ---

export async function handleBotsSection(
  ctx: BotContext,
  chatId: number | string,
  messageId: number | undefined,
  message: TelegramMessage | undefined,
): Promise<void> {
  await editOrSendPage(
    ctx,
    chatId,
    messageId,
    message,
    botsSectionText(),
    botsSectionKeyboard(),
    "bots"
  );
}

export async function handleEarningBots(
  ctx: BotContext,
  chatId: number | string,
  messageId: number | undefined,
  message: TelegramMessage | undefined,
): Promise<void> {
  await editOrSendPage(
    ctx,
    chatId,
    messageId,
    message,
    earningBotsText(),
    earningBotsKeyboard(),
    "bots"
  );
}

export async function handleBotsNotify(
  ctx: BotContext,
  chatId: number | string,
  userId: number,
  messageId: number | undefined,
  message: TelegramMessage | undefined,
): Promise<void> {
  // Save user in table bot_interest_users
  await ctx.env.DB.prepare(
    `INSERT INTO bot_interest_users (telegram_id) VALUES (?) ON CONFLICT(telegram_id) DO NOTHING`
  )
    .bind(userId)
    .run();

  await editOrSendPage(
    ctx,
    chatId,
    messageId,
    message,
    notifySavedText(),
    botsNotifyKeyboard(),
    "bots"
  );
}

export async function handleSubmitBotSoon(
  ctx: BotContext,
  chatId: number | string,
  messageId: number | undefined,
  message: TelegramMessage | undefined,
): Promise<void> {
  await editOrSendPage(
    ctx,
    chatId,
    messageId,
    message,
    submitBotSoonText(),
    submitBotSoonKeyboard(),
    "bots"
  );
}

export async function handleDebugBotsCommand(
  ctx: BotContext,
  message: TelegramMessage,
): Promise<void> {
  const userId = message.from?.id;
  if (!userId || !ctx.adminIds.has(userId)) {
    await ctx.telegram.sendMessage(message.chat.id, "❌ Admin only command.");
    return;
  }

  // Check tables and counts
  let tableExists = false;
  let totalBots = 0;
  let approvedBots = 0;
  let pendingBots = 0;
  let earningBots = 0;
  let interestedUsers = 0;

  try {
    const tableCheck = await ctx.env.DB.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='bots'`
    ).first();
    tableExists = !!tableCheck;

    if (tableExists) {
      totalBots = (await ctx.env.DB.prepare(`SELECT count(*) as c FROM bots`).first<{c: number}>())?.c || 0;
      approvedBots = (await ctx.env.DB.prepare(`SELECT count(*) as c FROM bots WHERE status = 'approved'`).first<{c: number}>())?.c || 0;
      pendingBots = (await ctx.env.DB.prepare(`SELECT count(*) as c FROM bots WHERE status = 'pending'`).first<{c: number}>())?.c || 0;
      earningBots = (await ctx.env.DB.prepare(`SELECT count(*) as c FROM bots WHERE category = 'earning'`).first<{c: number}>())?.c || 0;
    }

    interestedUsers = (await ctx.env.DB.prepare(`SELECT count(*) as c FROM bot_interest_users`).first<{c: number}>())?.c || 0;
  } catch (e) {
    // ignore
  }

  const lines = [
    "🤖 <b>𝗕𝗢𝗧𝗦 𝗦𝗘𝗖𝗧𝗜𝗢𝗡 𝗗𝗘𝗕𝗨𝗚</b>",
    "",
    "━━━━━━━━━━━━━━",
    "",
    `<b>Bots table:</b> ${tableExists ? "✅ Exists" : "❌ Missing"}`,
    `<b>Total bots:</b> ${totalBots}`,
    `<b>Approved bots:</b> ${approvedBots}`,
    `<b>Pending bots:</b> ${pendingBots}`,
    `<b>Earning bots:</b> ${earningBots}`,
    `<b>Interested users:</b> ${interestedUsers}`,
  ];

  await ctx.telegram.sendMessage(message.chat.id, lines.join("\n"), {
    parse_mode: "HTML",
  });
}
