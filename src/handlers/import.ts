import {
  channelExistsByUsername,
  createImportBatch,
  findChannelByIdentifier,
  getImportStats,
  importChannel,
  logBulkAddResult,
  logImportSkip,
  updateImportBatchStats,
} from "../db";
import { CATEGORIES, mapExternalCategory } from "../config/categories";
import { parseLanguage, LANGUAGES } from "../config/languages";
import { checkChannelSafety } from "../utils/safety";
import type { BotContext, TelegramMessage } from "../types";
import { getChatInfo } from "../telegram";

function generateShortId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/** Delay helper to avoid Telegram rate limits during bulk ops */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── ADMIN STATS ────────────────────────────────────────────────────────────

export async function handleImportStatsCommand(
  ctx: BotContext,
  message: TelegramMessage,
): Promise<void> {
  const adminId = message.from?.id;
  if (!adminId || !ctx.adminIds.has(adminId)) {
    await ctx.telegram.sendMessage(message.chat.id, "❌ Admin access only.");
    return;
  }

  const stats = await getImportStats(ctx.env);

  let lastBatchText = "None";
  if (stats.lastBatch) {
    lastBatchText = [
      `Found: ${stats.lastBatch.total_found}`,
      `Imported: ${stats.lastBatch.total_imported}`,
      `Skipped: ${stats.lastBatch.total_skipped}`,
      `Date: ${stats.lastBatch.created_at}`
    ].join(", ");
  }

  const text = [
    "📊 𝗜𝗺𝗽𝗼𝗿𝘁 𝗦𝘁𝗮𝘁𝘀",
    "",
    `𝗧𝗼𝘁𝗮𝗹 𝗖𝗵𝗮𝗻𝗻𝗲𝗹𝘀: ${stats.total}`,
    `🌍 𝗣𝘂𝗯𝗹𝗶𝗰: ${stats.public}`,
    `🔐 𝗣𝗿𝗶𝘃𝗮𝘁𝗲: ${stats.private}`,
    `✅ 𝗔𝗽𝗽𝗿𝗼𝘃𝗲𝗱: ${stats.approved}`,
    `⏳ 𝗣𝗲𝗻𝗱𝗶𝗻𝗴: ${stats.pending}`,
    "",
    `📂 𝗖𝗮𝘁𝗲𝗴𝗼𝗿𝗶𝗲𝘀: ${CATEGORIES.length}`,
    `🗣 𝗟𝗮𝗻𝗴𝘂𝗮𝗴𝗲𝘀: ${LANGUAGES.length}`,
    "",
    `🚫 𝗦𝗸𝗶𝗽𝗽𝗲𝗱/𝗨𝗻𝘀𝗮𝗳𝗲 (Total Skips): ${stats.skips}`,
    `🕒 𝗟𝗮𝘀𝘁 𝗜𝗺𝗽𝗼𝗿𝘁: ${lastBatchText}`,
  ].join("\n");

  await ctx.telegram.sendMessage(message.chat.id, text);
}

// ─── TELEGRAMCHANNELS.ME IMPORT ──────────────────────────────────────────────

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'");
}

export async function handleImportTelegramChannelsCommand(
  ctx: BotContext,
  message: TelegramMessage,
  args: string,
): Promise<void> {
  const adminId = message.from?.id;
  if (!adminId || !ctx.adminIds.has(adminId)) {
    await ctx.telegram.sendMessage(message.chat.id, "❌ Admin access only.");
    return;
  }

  const url = args.trim();
  if (!url || !url.includes("telegramchannels.me")) {
    await ctx.telegram.sendMessage(message.chat.id, "❌ Provide a valid telegramchannels.me ranking URL.");
    return;
  }

  await ctx.telegram.sendMessage(message.chat.id, "⏳ Fetching and crawling up to 20 pages. This may take a moment...");

  try {
    const batchId = generateShortId();
    await createImportBatch(ctx.env, batchId, "telegramchannels.me", url, adminId);

    const parsedUrl = new URL(url);
    const langParam = parsedUrl.searchParams.get("language") || "hi";
    const botLang = parseLanguage(langParam);

    let totalFound = 0;
    let totalImported = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;

    for (let page = 1; page <= 20; page++) {
      parsedUrl.searchParams.set("page", page.toString());
      const pageUrl = parsedUrl.toString();

      const response = await fetch(pageUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Referer": "https://telegramchannels.me/",
        },
      });

      if (!response.ok) {
        if (page === 1) throw new Error(`HTTP Error: ${response.status}`);
        break;
      }

      const html = await response.text();
      const rowRegex = /<tr[^>]*class="is-vcentered[^"]*"[^>]*>([\s\S]*?)<\/tr>/g;
      let match;
      let pageRowsCount = 0;

      while ((match = rowRegex.exec(html)) !== null) {
        const row = match[1];
        pageRowsCount++;
        totalFound++;

        if (row.includes('/groups/') || row.includes('/bots/')) {
          const type = row.includes('/groups/') ? "Group" : "Bot";
          const titleMatch = row.match(/<a href="[^"]*\/(?:groups|bots)\/([^"/]+)"[^>]*>([\s\S]*?)<\/a>/);
          const username = titleMatch ? `@${titleMatch[1]}` : "";
          const titleRaw = titleMatch ? titleMatch[2] : "Unknown";
          const title = decodeHtmlEntities(titleRaw.replace(/<[^>]+>/g, '').trim());
          await logImportSkip(ctx.env, batchId, title, username, type, `Skipped: ${type}`);
          totalSkipped++;
          continue;
        }

        const rankMatch = row.match(/<td class="is-narrow py-2">\s*#([\d,]+)/);
        const rank = rankMatch ? parseInt(rankMatch[1].replace(/,/g, ''), 10) : 0;

        const linkMatch = row.match(/<a href="([^"]*\/channels\/([^"/]+))"[^>]*>([\s\S]*?)<\/a>/);
        if (!linkMatch) { totalSkipped++; continue; }
        const username = `@${linkMatch[2]}`;
        const title = decodeHtmlEntities(linkMatch[3].replace(/<[^>]+>/g, '').trim());

        const catMatch = row.match(/href="[^"]*category=\d+[^"]*"[^>]*>\s*<span class="has-text-grey">\s*([\s\S]*?)\s*<\/span>/);
        const categoryRaw = catMatch ? decodeHtmlEntities(catMatch[1].trim()) : 'other';
        const botCategory = mapExternalCategory(categoryRaw);

        const tds = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g);
        let subs = "";
        if (tds && tds.length >= 6) {
          const rawSubs = tds[5].replace(/<[^>]+>/g, '').trim();
          subs = rawSubs.split(/\s+/)[0] || "";
        }

        const safety = checkChannelSafety(title, username, categoryRaw);
        if (!safety.isSafe) {
          await logImportSkip(ctx.env, batchId, title, username, categoryRaw, safety.reason ?? "Unsafe");
          totalSkipped++;
          continue;
        }

        const desc = `${title} is a ${botLang} Telegram channel in ${categoryRaw} category.`;
        const isInserted = await importChannel(ctx.env, {
          owner_telegram_id: adminId,
          channel_type: "public",
          channel_username: username,
          channel_link: `https://t.me/${username.replace('@', '')}`,
          invite_link: "",
          title,
          description: desc,
          category: botCategory,
          language: botLang,
          tags: `${botCategory}, ${botLang}, imported`,
          admin_username: "",
          status: "approved",
          source_name: "telegramchannels.me",
          source_url: pageUrl,
          source_rank: rank,
          subscribers_text: subs,
          import_batch_id: batchId
        });

        if (isInserted) totalImported++;
        else totalUpdated++;
      }

      if (pageRowsCount === 0) break;
    }

    await updateImportBatchStats(ctx.env, batchId, totalFound, totalImported + totalUpdated, totalSkipped);

    await ctx.telegram.sendMessage(message.chat.id, [
      "✅ 𝗜𝗺𝗽𝗼𝗿𝘁 𝗖𝗼𝗺𝗽𝗹𝗲𝘁𝗲",
      "",
      "━━━━━━━━━━━━━━",
      "",
      `🔎 Found: ${totalFound}`,
      `✅ Imported: ${totalImported}`,
      `♻️ Updated: ${totalUpdated}`,
      `⏭ Skipped: ${totalSkipped}`,
      "",
      "━━━━━━━━━━━━━━",
    ].join("\n"));

  } catch (err) {
    console.error("Import error:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    if (errorMessage.includes("403")) {
      await ctx.telegram.sendMessage(message.chat.id, [
        "⚠️ 𝗦𝗼𝘂𝗿𝗰𝗲 𝗕𝗹𝗼𝗰𝗸𝗲𝗱 𝗔𝘂𝘁𝗼 𝗙𝗲𝘁𝗰𝗵",
        "",
        "Use manual import instead:",
        "1️⃣ Open the ranking page in browser",
        "2️⃣ Copy all channel text",
        "3️⃣ Send /importpaste",
        "4️⃣ Paste the copied text",
      ].join("\n"), {
        reply_markup: {
          inline_keyboard: [
            [{ text: "📥 Import by Paste", callback_data: "import_paste_start" }],
            [{ text: "🏠 Home", callback_data: "home" }]
          ]
        }
      });
    } else {
      await ctx.telegram.sendMessage(message.chat.id, `❌ Error: ${errorMessage}`);
    }
  }
}

// ─── PASTE IMPORT ────────────────────────────────────────────────────────────

export async function handleImportPasteCommand(
  ctx: BotContext,
  message: TelegramMessage,
): Promise<void> {
  const adminId = message.from?.id;
  if (!adminId || !ctx.adminIds.has(adminId)) {
    await ctx.telegram.sendMessage(message.chat.id, "❌ Admin access only.");
    return;
  }

  await ctx.env.DB.prepare(
    `INSERT INTO admin_states (telegram_id, mode, payload) VALUES (?, 'import_paste_wait', NULL)
     ON CONFLICT(telegram_id) DO UPDATE SET mode = 'import_paste_wait', payload = NULL`
  ).bind(adminId).run();

  await ctx.telegram.sendMessage(message.chat.id, [
    "📥 𝗣𝗮𝘀𝘁𝗲 𝗜𝗺𝗽𝗼𝗿𝘁 𝗠𝗼𝗱𝗲",
    "",
    "Paste the TelegramChannels ranking text now.",
    "",
    "Unsafe channels will be skipped automatically.",
  ].join("\n"), {
    reply_markup: {
      inline_keyboard: [
        [{ text: "❌ Cancel", callback_data: "import_cancel" }]
      ]
    }
  });
}

// ─── CSV IMPORT ──────────────────────────────────────────────────────────────

export async function handleImportCsvCommand(
  ctx: BotContext,
  message: TelegramMessage,
): Promise<void> {
  const adminId = message.from?.id;
  if (!adminId || !ctx.adminIds.has(adminId)) {
    await ctx.telegram.sendMessage(message.chat.id, "❌ Admin access only.");
    return;
  }

  await ctx.env.DB.prepare(
    `INSERT INTO admin_states (telegram_id, mode, payload) VALUES (?, 'import_csv_wait', NULL)
     ON CONFLICT(telegram_id) DO UPDATE SET mode = 'import_csv_wait', payload = NULL`
  ).bind(adminId).run();

  await ctx.telegram.sendMessage(
    message.chat.id,
    [
      "📄 Send me the CSV text or file.",
      "Format: type,title,username,channel_link,invite_link,category,language,description,tags,status",
      "Example:",
      "public,AI Tools Daily,@aitoolsdaily,, ,ai,English,Best tools,,approved",
    ].join("\n")
  );
}

// ─── BULK ADD (/bulkadd) ──────────────────────────────────────────────────────

export async function handleBulkAddCommand(
  ctx: BotContext,
  message: TelegramMessage,
): Promise<void> {
  const adminId = message.from?.id;
  if (!adminId || !ctx.adminIds.has(adminId)) {
    await ctx.telegram.sendMessage(message.chat.id, "❌ Admin access only.");
    return;
  }

  await ctx.env.DB.prepare(
    `INSERT INTO admin_states (telegram_id, mode, payload) VALUES (?, 'bulkadd_wait', NULL)
     ON CONFLICT(telegram_id) DO UPDATE SET mode = 'bulkadd_wait', payload = NULL`
  ).bind(adminId).run();

  await ctx.telegram.sendMessage(message.chat.id, [
    "📥 <b>Bulk Add Channels</b>",
    "",
    "Send channels one per line in this format:",
    "<code>@username | Category | Language | Description | Tags</code>",
    "",
    "Example:",
    "<code>@technews | Tech | English | Latest tech updates | tech,news,apps</code>",
    "<code>@jobsdaily | Jobs | Hindi | Daily job alerts | jobs,career,india</code>",
    "<code>@kannadanews | News | Kannada | Kannada news updates | kannada,news</code>",
    "",
    "⚠️ Max 50 channels per request.",
    "⚠️ Only public channels (@username format) allowed.",
    "⚠️ Each channel will be verified via Telegram API.",
    "",
    "Categories: Tech, Jobs, Education, AI, News, Movies, Gaming, Music, Earning, Tools, Other",
    "Languages: English, Hindi, Kannada, Tamil, Telugu, Malayalam, Other",
  ].join("\n"), {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "❌ Cancel", callback_data: "import_cancel" }]
      ]
    }
  });
}

// ─── SINGLE ADD CHANNEL LINE (/addchannel) ────────────────────────────────────

export async function handleAddChannelCommand(
  ctx: BotContext,
  message: TelegramMessage,
  args: string,
): Promise<void> {
  const adminId = message.from?.id;
  if (!adminId || !ctx.adminIds.has(adminId)) {
    await ctx.telegram.sendMessage(message.chat.id, "❌ Admin access only.");
    return;
  }

  if (args.trim()) {
    // Inline format: /addchannel @username | Category | Language | Description | Tags
    const result = await processAddChannelLine(ctx, message.chat.id, adminId, args.trim());
    if (result.status === "added") {
      await ctx.telegram.sendMessage(message.chat.id,
        `✅ <b>Channel Added Successfully</b>\n\n📢 ${result.username}\n📂 ${result.category}\n🌐 ${result.language}`,
        { parse_mode: "HTML" }
      );
    } else if (result.status === "duplicate") {
      await ctx.telegram.sendMessage(message.chat.id, `⚠️ Channel ${result.username} is already in the database.`);
    } else if (result.status === "invalid") {
      await ctx.telegram.sendMessage(message.chat.id, `❌ ${result.reason ?? "Invalid channel or format."}`);
    }
    return;
  }

  // No args — prompt for channel data
  await ctx.env.DB.prepare(
    `INSERT INTO admin_states (telegram_id, mode, payload) VALUES (?, 'addchannel_wait', NULL)
     ON CONFLICT(telegram_id) DO UPDATE SET mode = 'addchannel_wait', payload = NULL`
  ).bind(adminId).run();

  await ctx.telegram.sendMessage(message.chat.id, [
    "➕ <b>Add Single Channel</b>",
    "",
    "Send channel in this format:",
    "<code>@username | Category | Language | Description | Tags</code>",
    "",
    "Example:",
    "<code>@technews | Tech | English | Latest tech news | tech,news</code>",
  ].join("\n"), {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "❌ Cancel", callback_data: "import_cancel" }]
      ]
    }
  });
}

// ─── PROCESS BULK ADD ─────────────────────────────────────────────────────────

export async function processBulkAdd(
  ctx: BotContext,
  chatId: number,
  adminId: number,
  text: string,
): Promise<void> {
  const lines = text.split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0 && l.startsWith('@'));

  if (lines.length === 0) {
    await ctx.telegram.sendMessage(chatId,
      "❌ No valid lines found. Each line must start with @username.\n\nFormat: @username | Category | Language | Description | Tags"
    );
    return;
  }

  const capped = lines.slice(0, 50);
  if (lines.length > 50) {
    await ctx.telegram.sendMessage(chatId, `⚠️ Capped at 50 channels. Got ${lines.length} lines.`);
  }

  await ctx.telegram.sendMessage(chatId, `⏳ Processing ${capped.length} channels...`);

  let added = 0;
  let duplicate = 0;
  let invalid = 0;
  const invalidList: string[] = [];

  for (const line of capped) {
    try {
      const result = await processAddChannelLine(ctx, chatId, adminId, line);
      if (result.status === "added") added++;
      else if (result.status === "duplicate") duplicate++;
      else {
        invalid++;
        invalidList.push(`${result.username}: ${result.reason ?? "Invalid"}`);
      }
    } catch (err) {
      invalid++;
      console.error("Bulk add line error:", err);
    }
    // Rate limit: 200ms between Telegram API calls
    await delay(200);
  }

  await logBulkAddResult(ctx.env, adminId, capped.length, added, duplicate, invalid);

  const report = [
    "✅ <b>Bulk Import Completed</b>",
    "",
    `📥 Total: ${capped.length}`,
    `✅ Added: ${added}`,
    `⚠️ Duplicate: ${duplicate}`,
    `❌ Invalid: ${invalid}`,
  ];

  if (invalidList.length > 0) {
    report.push("", "Invalid channels:");
    invalidList.slice(0, 10).forEach(l => report.push(`• ${l}`));
    if (invalidList.length > 10) report.push(`...and ${invalidList.length - 10} more`);
  }

  await ctx.telegram.sendMessage(chatId, report.join("\n"), { parse_mode: "HTML" });
}

// ─── PROCESS SINGLE ADD CHANNEL LINE ─────────────────────────────────────────

interface AddChannelResult {
  status: "added" | "duplicate" | "invalid";
  username: string;
  category?: string;
  language?: string;
  reason?: string;
}

export async function processAddChannelLine(
  ctx: BotContext,
  _chatId: number,
  adminId: number,
  line: string,
): Promise<AddChannelResult> {
  const parts = line.split('|').map(p => p.trim());
  const rawUsername = parts[0] ?? "";

  if (!rawUsername.startsWith('@') || rawUsername.length < 2) {
    return { status: "invalid", username: rawUsername, reason: "Username must start with @" };
  }

  // Validate username characters
  const usernameOnly = rawUsername.slice(1);
  if (!/^[a-zA-Z0-9_]{5,32}$/.test(usernameOnly)) {
    return { status: "invalid", username: rawUsername, reason: "Invalid Telegram username format" };
  }

  // Check for duplicates in DB
  const isDuplicate = await channelExistsByUsername(ctx.env, rawUsername);
  if (isDuplicate) {
    return { status: "duplicate", username: rawUsername };
  }

  // Verify channel exists on Telegram via getChatInfo
  const chatData = await getChatInfo(ctx.env, rawUsername);
  if (!chatData) {
    return {
      status: "invalid",
      username: rawUsername,
      reason: "Channel not found on Telegram or is private/deleted",
    };
  }

  const telegramTitle = chatData.title ?? usernameOnly.replace(/_/g, ' ');

  // Parse fields
  const categoryRaw = parts[1] || "Other";
  const language = parseLanguage(parts[2] || "English");
  const description = parts[3] || `${telegramTitle} — Telegram channel.`;
  const tags = parts[4] || `${mapExternalCategory(categoryRaw)}, ${language.toLowerCase()}`;
  const category = mapExternalCategory(categoryRaw);

  // Safety check
  const safety = checkChannelSafety(telegramTitle, rawUsername, categoryRaw, tags, description);
  if (!safety.isSafe) {
    return { status: "invalid", username: rawUsername, reason: safety.reason ?? "Failed safety check" };
  }

  // Insert channel
  await importChannel(ctx.env, {
    owner_telegram_id: adminId,
    channel_type: "public",
    channel_username: rawUsername,
    channel_link: `https://t.me/${usernameOnly}`,
    invite_link: "",
    title: telegramTitle,
    description,
    category,
    language,
    tags,
    admin_username: "",
    status: "approved",
    verified: 1,
    ownership_verified: 1,
    source_name: "admin_add",
    source_url: "",
    source_rank: 0,
    subscribers_text: "",
    import_batch_id: "direct",
  });

  return { status: "added", username: rawUsername, category, language };
}

// ─── PASTE IMPORT PROCESSOR ────────────────────────────────────────────────────

export async function processPasteRanking(
  ctx: BotContext,
  chatId: number,
  adminId: number,
  text: string
) {
  const batchId = generateShortId();
  await createImportBatch(ctx.env, batchId, "Pasted Text", "", adminId);

  let totalFound = 0;
  let totalImported = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;

  const lines = text.split('\n').filter(l => l.trim().length > 0);

  for (const line of lines) {
    const userMatch = line.match(/@([a-zA-Z0-9_]+)/);
    if (!userMatch) continue;

    const username = userMatch[0];
    const parts = line.split(username);
    const title = parts[0].replace(/^\d+[\.\)]\s*/, '').trim() || username;
    const rest = parts[1] || "";

    totalFound++;

    const safety = checkChannelSafety(title, username, rest);
    if (!safety.isSafe) {
      await logImportSkip(ctx.env, batchId, title, username, "Pasted", safety.reason ?? "Unsafe");
      totalSkipped++;
      continue;
    }

    const botCategory = mapExternalCategory(rest);
    const botLang = parseLanguage(rest);
    const desc = `${title} is a ${botLang} Telegram channel in ${botCategory} category.`;

    const isInserted = await importChannel(ctx.env, {
      owner_telegram_id: adminId,
      channel_type: "public",
      channel_username: username,
      channel_link: `https://t.me/${username.replace('@', '')}`,
      invite_link: "",
      title,
      description: desc,
      category: botCategory,
      language: botLang,
      tags: `${botCategory}, ${botLang}`,
      admin_username: "",
      status: "approved",
      source_name: "Pasted Text",
      source_url: "",
      source_rank: 0,
      subscribers_text: "",
      import_batch_id: batchId
    });

    if (isInserted) totalImported++;
    else totalUpdated++;
  }

  await updateImportBatchStats(ctx.env, batchId, totalFound, totalImported + totalUpdated, totalSkipped);

  await ctx.telegram.sendMessage(chatId, [
    "✅ 𝗜𝗺𝗽𝗼𝗿𝘁 𝗖𝗼𝗺𝗽𝗹𝗲𝘁𝗲",
    "",
    "━━━━━━━━━━━━━━",
    "",
    `🔎 Found: ${totalFound}`,
    `✅ Imported: ${totalImported}`,
    `♻️ Updated: ${totalUpdated}`,
    `⏭ Skipped: ${totalSkipped}`,
    "",
    "━━━━━━━━━━━━━━",
  ].join("\n"));
}

// ─── CSV IMPORT PROCESSOR ─────────────────────────────────────────────────────

export async function processCsvImport(
  ctx: BotContext,
  chatId: number,
  adminId: number,
  text: string
) {
  const batchId = generateShortId();
  await createImportBatch(ctx.env, batchId, "CSV Import", "", adminId);

  let totalFound = 0;
  let totalImported = 0;
  let totalSkipped = 0;

  const lines = text.split('\n').filter(l => l.trim().length > 0);

  if (lines[0].toLowerCase().includes("type,title")) {
    lines.shift();
  }

  for (const line of lines) {
    const cols = line.split(',').map(c => c.trim());
    if (cols.length < 3) continue;

    totalFound++;
    const type = cols[0].toLowerCase() === 'private' ? 'private' : 'public';
    const title = cols[1];
    let username = cols[2] || "";
    let channelLink = cols[3] || "";
    let inviteLink = cols[4] || "";
    const categoryRaw = cols[5] || "other";
    const langRaw = cols[6] || "Mixed";
    const desc = cols[7] || "";
    const tags = cols[8] || "";
    const statusRaw = cols[9] || "approved";

    if (type === 'public') {
      if (!username.startsWith('@')) username = `@${username}`;
      if (!channelLink) channelLink = `https://t.me/${username.replace('@', '')}`;
      inviteLink = "";
    } else {
      username = "";
      channelLink = "";
      if (!inviteLink.startsWith("https://t.me/+")) {
        await logImportSkip(ctx.env, batchId, title, username, categoryRaw, "Invalid private invite link");
        totalSkipped++;
        continue;
      }
    }

    const botCategory = mapExternalCategory(categoryRaw);
    const botLang = parseLanguage(langRaw);

    const safety = checkChannelSafety(title, username, categoryRaw, tags, desc);
    if (!safety.isSafe) {
      await logImportSkip(ctx.env, batchId, title, username, categoryRaw, safety.reason ?? "Unsafe");
      totalSkipped++;
      continue;
    }

    await importChannel(ctx.env, {
      owner_telegram_id: adminId,
      channel_type: type,
      channel_username: username,
      channel_link: channelLink,
      invite_link: inviteLink,
      title,
      description: desc || `${title} is a ${botLang} Telegram channel.`,
      category: botCategory,
      language: botLang,
      tags,
      admin_username: "",
      status: (statusRaw as any),
      source_name: "CSV",
      source_url: "",
      source_rank: 0,
      subscribers_text: "",
      import_batch_id: batchId
    });

    totalImported++;
  }

  await updateImportBatchStats(ctx.env, batchId, totalFound, totalImported, totalSkipped);

  await ctx.telegram.sendMessage(chatId, [
    "✅ 𝗜𝗺𝗽𝗼𝗿𝘁 𝗖𝗼𝗺𝗽𝗹𝗲𝘁𝗲",
    "",
    `Source: CSV`,
    `Found: ${totalFound}`,
    `Imported: ${totalImported}`,
    `Skipped: ${totalSkipped}`
  ].join("\n"));
}
