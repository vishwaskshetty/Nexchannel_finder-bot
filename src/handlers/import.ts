import {
  createImportBatch,
  getImportStats,
  importChannel,
  logImportSkip,
  updateImportBatchStats,
} from "../db";
import { CATEGORIES, mapExternalCategory } from "../config/categories";
import { parseLanguage, LANGUAGES } from "../config/languages";
import { checkChannelSafety } from "../utils/safety";
import type { BotContext, ChannelType, TelegramMessage } from "../types";

function generateShortId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// ─── ADMIN STATS ────────────────────────────────────────────────────────────

export async function handleImportStatsCommand(
  ctx: BotContext,
  message: TelegramMessage,
): Promise<void> {
  const adminId = message.from?.id;
  if (adminId !== 6059191947) {
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
  if (adminId !== 6059191947) {
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
    console.log("[Importer] Creating batch in D1 database, batchId:", batchId);
    await createImportBatch(ctx.env, batchId, "telegramchannels.me", url, adminId);
    console.log("[Importer] Batch created successfully");

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
      console.log(`[Importer] Fetching page ${page}: ${pageUrl}`);

      const response = await fetch(pageUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Referer": "https://telegramchannels.me/",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "same-origin",
          "Sec-Fetch-User": "?1",
          "Upgrade-Insecure-Requests": "1"
        },
      });
      console.log(`[Importer] Response status for page ${page}:`, response.status);

      if (!response.ok) {
        if (page === 1) {
          throw new Error(`HTTP Error: ${response.status}`);
        } else {
          break; // Stop crawling if subsequent pages return non-OK
        }
      }

      const html = await response.text();

      // Extract rows of class is-vcentered
      const rowRegex = /<tr[^>]*class="is-vcentered[^"]*"[^>]*>([\s\S]*?)<\/tr>/g;
      let match;
      let pageRowsCount = 0;

      while ((match = rowRegex.exec(html)) !== null) {
        const row = match[1];
        pageRowsCount++;
        totalFound++;

        // 1. Group / Bot Skip
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

        // 2. Extract rank
        const rankMatch = row.match(/<td class="is-narrow py-2">\s*#([\d,]+)/);
        const rank = rankMatch ? parseInt(rankMatch[1].replace(/,/g, ''), 10) : 0;

        // 3. Extract details, username, title
        const linkMatch = row.match(/<a href="([^"]*\/channels\/([^"/]+))"[^>]*>([\s\S]*?)<\/a>/);
        if (!linkMatch) {
          totalSkipped++;
          continue;
        }
        const username = `@${linkMatch[2]}`;
        const title = decodeHtmlEntities(linkMatch[3].replace(/<[^>]+>/g, '').trim());

        // 4. Extract Category
        const catMatch = row.match(/href="[^"]*category=\d+[^"]*"[^>]*>\s*<span class="has-text-grey">\s*([\s\S]*?)\s*<\/span>/);
        const categoryRaw = catMatch ? decodeHtmlEntities(catMatch[1].trim()) : 'other';
        const botCategory = mapExternalCategory(categoryRaw);

        // 5. Extract Subscribers
        const tds = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g);
        let subs = "";
        if (tds && tds.length >= 6) {
          const rawSubs = tds[5].replace(/<[^>]+>/g, '').trim();
          subs = rawSubs.split(/\s+/)[0] || "";
        }

        // 6. Safety checks
        const safety = checkChannelSafety(title, username, categoryRaw);
        if (!safety.isSafe) {
          await logImportSkip(ctx.env, batchId, title, username, categoryRaw, safety.reason ?? "Unsafe");
          totalSkipped++;
          continue;
        }

        // 7. Insert/Upsert into DB
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

        if (isInserted) {
          totalImported++;
        } else {
          totalUpdated++;
        }
      }

      if (pageRowsCount === 0) {
        break; // Stop crawl if page returns no rows at all
      }
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
      "",
      "Use /debugcategories to check category counts.",
      "Use /debugrecentchannels to check recent channels."
    ].join("\n"));

  } catch (err) {
    console.error("Import error:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    if (errorMessage.includes("403")) {
      const fallbackText = [
        "⚠️ 𝗦𝗼𝘂𝗿𝗰𝗲 𝗕𝗹𝗼𝗰𝗸𝗲𝗱 𝗔𝘂𝘁𝗼 𝗙𝗲𝘁𝗰𝗵",
        "",
        "TelegramChannels blocked the automatic import request.",
        "",
        "Use manual import instead:",
        "",
        "1️⃣ Open the ranking page in browser",
        "2️⃣ Select all channel ranking text",
        "3️⃣ Copy it",
        "4️⃣ Send /importpaste",
        "5️⃣ Paste the copied text here",
        "",
        "This method imports channels safely without website fetch blocking."
      ].join("\n");

      await ctx.telegram.sendMessage(message.chat.id, fallbackText, {
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
  if (adminId !== 6059191947) {
    await ctx.telegram.sendMessage(message.chat.id, "❌ Admin access only.");
    return;
  }

  // Use admin states to wait for paste
  await ctx.env.DB.prepare(
    `INSERT INTO admin_states (telegram_id, mode, payload) VALUES (?, 'import_paste_wait', NULL)
     ON CONFLICT(telegram_id) DO UPDATE SET mode = 'import_paste_wait', payload = NULL`
  ).bind(adminId).run();

  const text = [
    "📥 𝗣𝗮𝘀𝘁𝗲 𝗜𝗺𝗽𝗼𝗿𝘁 𝗠𝗼𝗱𝗲",
    "",
    "Paste the TelegramChannels ranking text now.",
    "",
    "I will extract:",
    "• Channel name",
    "• Username",
    "• Language",
    "• Category",
    "• Subscribers",
    "",
    "Unsafe channels will be skipped automatically."
  ].join("\n");

  await ctx.telegram.sendMessage(message.chat.id, text, {
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
  if (adminId !== 6059191947) {
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
      "private,Study Hub,,,https://t.me/+xyz,education,Hindi,Study,,approved"
    ].join("\n")
  );
}


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

  // Assume lines look like: "1. Title @username Category Language Subscribers"
  const lines = text.split('\n').filter(l => l.trim().length > 0);

  for (const line of lines) {
    // Regex to find @username
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

    if (isInserted) {
      totalImported++;
    } else {
      totalUpdated++;
    }
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
    "",
    "Use /debugcategories to check category counts.",
    "Use /debugrecentchannels to check recent channels."
  ].join("\n"));
}

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
  
  // Skip header if exists
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
