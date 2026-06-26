import type { BotContext, TelegramMessage, ImportBatch, Channel } from "../types";
import { getImportPreview, getImportBatchInfo, approveImportBatch, rejectImportBatch, saveImportedChannel, logImportEvent, saveImportBatch, channelExistsByUsername } from "../db";
import { fetchWebsite, isUnsafeContent, normalizeTelegramLink, parseBestOfTelegram, parseKannadaGroups } from "../utils/importer";
import { sendOrEdit, isAdmin } from "../telegram";
import { escapeHtml } from "../ui";

function generateShortId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function handleImportSourceCommand(ctx: BotContext, message: TelegramMessage): Promise<void> {
  if (!message.from || !isAdmin(message.from.id, ctx.env)) {
    await ctx.telegram.sendMessage(message.chat.id, "❌ Admin access only.");
    return;
  }

  const parts = message.text?.split("|").map(p => p.trim());
  if (!parts || parts.length < 5) {
    await ctx.telegram.sendMessage(message.chat.id, "❌ Usage: /importsource source_name | source_url | default_category | default_language | limit");
    return;
  }

  const [rawCommandName, sourceUrl, defaultCategory, defaultLanguage, limitStr] = parts;
  const sourceName = rawCommandName.replace(/^\/importsource\s*/i, "").trim();
  const limit = parseInt(limitStr || "", 10) || 50;

  await ctx.telegram.sendMessage(message.chat.id, `⏳ Fetching ${escapeHtml(sourceName)} from ${escapeHtml(sourceUrl)}...`);

  const fetchRes = await fetchWebsite(sourceUrl);
  if (!fetchRes.ok) {
    const errorText = [
      "<b>⚠️ Website Import Failed</b>",
      "",
      "I could not fetch this website directly.",
      "",
      "Possible reasons:",
      "• Website blocks bot/server requests",
      "• Website uses JavaScript loading",
      "• Website blocks Cloudflare Workers",
      "• Website is temporarily down",
      "",
      `Status: ${fetchRes.status} ${fetchRes.statusText}`,
      "",
      "Use one of these fallback methods:",
      `<code>/importlinks ${escapeHtml(sourceName)} | ${escapeHtml(defaultCategory)} | ${escapeHtml(defaultLanguage)}`,
      "https://t.me/examplechannel",
      "https://t.me/+invite",
      "@channelusername</code>"
    ].join("\n");
    await ctx.telegram.sendMessage(message.chat.id, errorText, { parse_mode: "HTML", disable_web_page_preview: true });
    return;
  }
  
  const html = fetchRes.html;

  let items: any[] = [];
  if (sourceName.toLowerCase() === "bestoftelegram") {
    items = parseBestOfTelegram(html, defaultCategory, defaultLanguage);
  } else if (sourceName.toLowerCase() === "kannadagroups") {
    items = parseKannadaGroups(html, defaultCategory, defaultLanguage);
  } else {
    // Custom parser fallback
    items = parseBestOfTelegram(html, defaultCategory, defaultLanguage);
  }
  
  if (items.length === 0) {
    await ctx.telegram.sendMessage(message.chat.id, "❌ No Telegram links found in fetched HTML. The site may load links with JavaScript or block bot requests.");
    return;
  }

  items = items.slice(0, limit);

  const batchId = generateShortId();
  const batch: ImportBatch = {
    id: batchId,
    source_name: sourceName,
    source_url: sourceUrl,
    default_category: defaultCategory,
    default_language: defaultLanguage,
    total_found: items.length,
    imported: 0,
    duplicate: 0,
    skipped: 0,
    invalid: 0,
    created_by: message.from.id,
    created_at: new Date().toISOString().replace('T', ' ').split('.')[0]
  };

  for (const item of items) {
    if (!item.title) {
      batch.skipped++;
      continue;
    }
    
    const parsed = normalizeTelegramLink(item.link);
    if (!parsed.valid) {
      batch.invalid++;
      await logImportEvent(ctx.env, { batch_id: batchId, source_name: sourceName, source_url: sourceUrl, telegram_link: item.link, status: 'invalid', reason: 'Invalid telegram link format' });
      continue;
    }

    if (isUnsafeContent(item.title, item.description || "", item.link)) {
      batch.skipped++;
      await logImportEvent(ctx.env, { batch_id: batchId, source_name: sourceName, source_url: sourceUrl, telegram_link: item.link, status: 'skipped', reason: 'Unsafe content detected' });
      continue;
    }

    if (parsed.type === 'public' && parsed.username) {
      const exists = await channelExistsByUsername(ctx.env, parsed.username);
      if (exists) {
        batch.duplicate++;
        await logImportEvent(ctx.env, { batch_id: batchId, source_name: sourceName, source_url: sourceUrl, telegram_link: item.link, status: 'duplicate', reason: 'Username already exists' });
        continue;
      }
    }

    // Attempt to save as pending
    await saveImportedChannel(ctx.env, {
      title: item.title,
      description: item.description,
      category: item.category,
      language: item.language,
      channel_type: parsed.type,
      channel_username: parsed.username || null,
      channel_link: parsed.channel_link || null,
      invite_link: parsed.invite_link || null,
      source_name: sourceName,
      source_url: sourceUrl,
      subscribers_text: item.subscribers || "",
      import_batch_id: batchId,
      status: "pending",
      quality_status: "imported",
      verified: 0,
      ownership_verified: 0,
      last_imported_at: new Date().toISOString()
    });

    batch.imported++;
    await logImportEvent(ctx.env, { batch_id: batchId, source_name: sourceName, source_url: sourceUrl, telegram_link: item.link, status: 'imported', reason: 'Saved as pending' });
    await delay(100);
  }

  await saveImportBatch(ctx.env, batch);

  const report = [
    "<b>📥 Import Completed</b>",
    "",
    `🌐 <b>Source:</b> ${escapeHtml(sourceName)}`,
    `🔗 <b>URL:</b> ${escapeHtml(sourceUrl)}`,
    `🆔 <b>Batch:</b> ${batchId}`,
    "",
    `📌 Found: ${batch.total_found}`,
    `✅ Imported as Pending: ${batch.imported}`,
    `⚠️ Duplicate: ${batch.duplicate}`,
    `❌ Invalid: ${batch.invalid}`,
    `🚫 Skipped Unsafe: ${batch.skipped}`,
    "",
    "Use:",
    `/importpreview ${batchId}`,
    `/importapprove ${batchId}`,
    `/importreject ${batchId}`
  ].join("\n");

  await ctx.telegram.sendMessage(message.chat.id, report, { parse_mode: "HTML", disable_web_page_preview: true });

  const adminChannel = ctx.env.ADMIN_REVIEW_CHANNEL_ID;
  if (adminChannel) {
    const adminReport = [
      "<b>📥 New Website Import</b>",
      "",
      `Source: ${escapeHtml(sourceName)}`,
      `Batch: ${batchId}`,
      `Imported Pending: ${batch.imported}`,
      `Duplicates: ${batch.duplicate}`,
      `Skipped: ${batch.skipped + batch.invalid}`,
    ].join("\n");
    await ctx.telegram.sendMessage(adminChannel, adminReport, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "📋 Preview Batch", callback_data: `import_preview:${batchId}` }],
          [
            { text: "✅ Approve Batch", callback_data: `import_approve:${batchId}` },
            { text: "❌ Reject Batch", callback_data: `import_reject:${batchId}` }
          ]
        ]
      }
    });
  }
}

export async function handleImportPreviewCommand(ctx: BotContext, message: TelegramMessage): Promise<void> {
  if (!message.from || !isAdmin(message.from.id, ctx.env)) return;
  const batchId = message.text?.split(" ")[1]?.trim();
  if (!batchId) {
    await ctx.telegram.sendMessage(message.chat.id, "❌ Usage: /importpreview batch_id");
    return;
  }
  await sendImportPreview(ctx, message.chat.id, batchId);
}

export async function sendImportPreview(ctx: BotContext, chatId: number | string, batchId: string): Promise<void> {
  const batch = await getImportBatchInfo(ctx.env, batchId);
  if (!batch) {
    await ctx.telegram.sendMessage(chatId, "❌ Batch not found.");
    return;
  }
  
  const items = await getImportPreview(ctx.env, batchId);
  if (!items || items.length === 0) {
    await ctx.telegram.sendMessage(chatId, "❌ No pending items found for this batch.");
    return;
  }

  let text = "<b>📋 Import Preview (First 10)</b>\n\n";
  items.forEach((item, index) => {
    text += `${index + 1}. ${escapeHtml(item.title)}\n`;
    text += `   🔗 ${item.channel_username || item.invite_link}\n`;
    text += `   📂 ${escapeHtml(item.category || "Unknown")}\n`;
    text += `   🌐 ${escapeHtml(item.language || "Unknown")}\n`;
    text += `   📌 ${item.channel_type}\n`;
    text += `   📊 Source: ${escapeHtml(item.source_name || "Unknown")}\n\n`;
  });

  await ctx.telegram.sendMessage(chatId, text, { parse_mode: "HTML", disable_web_page_preview: true });
}

export async function handleImportApproveCommand(ctx: BotContext, message: TelegramMessage): Promise<void> {
  if (!message.from || !isAdmin(message.from.id, ctx.env)) return;
  const batchId = message.text?.split(" ")[1]?.trim();
  if (!batchId) {
    await ctx.telegram.sendMessage(message.chat.id, "❌ Usage: /importapprove batch_id");
    return;
  }
  await approveBatchUI(ctx, message.chat.id, batchId);
}

export async function approveBatchUI(ctx: BotContext, chatId: number | string, batchId: string): Promise<void> {
  const { approved, rejected } = await approveImportBatch(ctx.env, batchId);
  const text = [
    "<b>✅ Batch Approved</b>",
    "",
    `Approved: ${approved}`,
    `Rejected/Skipped (Validation failed): ${rejected}`
  ].join("\n");
  await ctx.telegram.sendMessage(chatId, text, { parse_mode: "HTML" });
}

export async function handleImportRejectCommand(ctx: BotContext, message: TelegramMessage): Promise<void> {
  if (!message.from || !isAdmin(message.from.id, ctx.env)) return;
  const batchId = message.text?.split(" ")[1]?.trim();
  if (!batchId) {
    await ctx.telegram.sendMessage(message.chat.id, "❌ Usage: /importreject batch_id");
    return;
  }
  await rejectBatchUI(ctx, message.chat.id, batchId);
}

export async function rejectBatchUI(ctx: BotContext, chatId: number | string, batchId: string): Promise<void> {
  const rejected = await rejectImportBatch(ctx.env, batchId);
  await ctx.telegram.sendMessage(chatId, `❌ Batch Rejected. ${rejected} pending items marked as rejected.`, { parse_mode: "HTML" });
}

export async function handleImportLinksCommand(ctx: BotContext, message: TelegramMessage): Promise<void> {
  if (!message.from || !isAdmin(message.from.id, ctx.env)) return;
  
  const text = message.text || "";
  const lines = text.split("\n").map(l => l.trim()).filter(l => l);
  if (lines.length < 2) {
    await ctx.telegram.sendMessage(message.chat.id, "❌ Usage:\n/importlinks source_name | default_category | default_language\nhttps://t.me/channel1\n@channel2");
    return;
  }
  
  const configLine = lines[0].replace("/importlinks", "").trim();
  const [sourceName = "Manual", defaultCategory = "General", defaultLanguage = "English"] = configLine.split("|").map(p => p.trim());
  
  const links = lines.slice(1);
  const batchId = generateShortId();
  const batch: ImportBatch = {
    id: batchId,
    source_name: sourceName,
    source_url: "manual",
    default_category: defaultCategory,
    default_language: defaultLanguage,
    total_found: links.length,
    imported: 0,
    duplicate: 0,
    skipped: 0,
    invalid: 0,
    created_by: message.from.id,
    created_at: new Date().toISOString().replace('T', ' ').split('.')[0]
  };

  await ctx.telegram.sendMessage(message.chat.id, `⏳ Processing ${links.length} links...`);

  for (const link of links) {
    const parsed = normalizeTelegramLink(link);
    if (!parsed.valid) {
      batch.invalid++;
      continue;
    }

    if (parsed.type === 'public' && parsed.username) {
      const exists = await channelExistsByUsername(ctx.env, parsed.username);
      if (exists) {
        batch.duplicate++;
        continue;
      }
    }

    await saveImportedChannel(ctx.env, {
      title: parsed.username || "Unknown Channel",
      description: "",
      category: defaultCategory,
      language: defaultLanguage,
      channel_type: parsed.type,
      channel_username: parsed.username || null,
      channel_link: parsed.channel_link || null,
      invite_link: parsed.invite_link || null,
      source_name: sourceName,
      source_url: "manual",
      subscribers_text: "",
      import_batch_id: batchId,
      status: "pending",
      quality_status: "imported",
      verified: 0,
      ownership_verified: 0,
      last_imported_at: new Date().toISOString()
    });

    batch.imported++;
  }

  await saveImportBatch(ctx.env, batch);

  const report = [
    "<b>📥 Import Completed</b>",
    "",
    `🌐 <b>Source:</b> ${escapeHtml(sourceName)}`,
    `🔗 <b>URL:</b> manual`,
    `🆔 <b>Batch:</b> ${batchId}`,
    "",
    `📌 Found: ${batch.total_found}`,
    `✅ Imported as Pending: ${batch.imported}`,
    `⚠️ Duplicate: ${batch.duplicate}`,
    `❌ Invalid: ${batch.invalid}`,
    `🚫 Skipped Unsafe: ${batch.skipped}`,
    "",
    "Use:",
    `/importpreview ${batchId}`,
    `/importapprove ${batchId}`,
    `/importreject ${batchId}`
  ].join("\n");

  await ctx.telegram.sendMessage(message.chat.id, report, { parse_mode: "HTML" });
}

export async function handleInlineImportCsvCommand(ctx: BotContext, message: TelegramMessage): Promise<void> {
  if (!message.from || !isAdmin(message.from.id, ctx.env)) return;
  
  const text = message.text || "";
  const lines = text.split("\n").map(l => l.trim()).filter(l => l);
  if (lines.length < 2) {
    await ctx.telegram.sendMessage(message.chat.id, "❌ Usage:\n/importcsv\n@channel | Category | Language | Description | tags");
    return;
  }
  
  const csvLines = lines.slice(1);
  const batchId = generateShortId();
  const batch: ImportBatch = {
    id: batchId,
    source_name: "CSV",
    source_url: "manual",
    default_category: "General",
    default_language: "English",
    total_found: csvLines.length,
    imported: 0,
    duplicate: 0,
    skipped: 0,
    invalid: 0,
    created_by: message.from.id,
    created_at: new Date().toISOString().replace('T', ' ').split('.')[0]
  };

  for (const line of csvLines) {
    const [rawLink, category = "General", language = "English", description = "", tags = ""] = line.split("|").map(p => p.trim());
    if (!rawLink) continue;

    const parsed = normalizeTelegramLink(rawLink);
    if (!parsed.valid) {
      batch.invalid++;
      continue;
    }

    if (parsed.type === 'public' && parsed.username) {
      const exists = await channelExistsByUsername(ctx.env, parsed.username);
      if (exists) {
        batch.duplicate++;
        continue;
      }
    }

    await saveImportedChannel(ctx.env, {
      title: parsed.username || "CSV Channel",
      description: description,
      category: category,
      language: language,
      tags: tags,
      channel_type: parsed.type,
      channel_username: parsed.username || null,
      channel_link: parsed.channel_link || null,
      invite_link: parsed.invite_link || null,
      source_name: "CSV",
      source_url: "manual",
      subscribers_text: "",
      import_batch_id: batchId,
      status: "pending",
      quality_status: "imported",
      verified: 0,
      ownership_verified: 0,
      last_imported_at: new Date().toISOString()
    });

    batch.imported++;
  }

  await saveImportBatch(ctx.env, batch);
  await ctx.telegram.sendMessage(message.chat.id, `✅ Saved ${batch.imported} items to pending batch ${batchId}. Use /importpreview ${batchId} to check.`);
}

export async function handleImportTestCommand(ctx: BotContext, message: TelegramMessage): Promise<void> {
  if (!message.from || !isAdmin(message.from.id, ctx.env)) return;
  const url = message.text?.split(" ")[1]?.trim();
  if (!url) {
    await ctx.telegram.sendMessage(message.chat.id, "❌ Usage: /importtest URL");
    return;
  }

  await ctx.telegram.sendMessage(message.chat.id, `⏳ Testing fetch for ${escapeHtml(url)}...`);

  const fetchRes = await fetchWebsite(url);
  
  let parserUsed = "None";
  let linksFound = 0;
  
  if (fetchRes.ok && fetchRes.html) {
    if (url.includes("telegram-groups.com")) {
      parserUsed = "KannadaGroups (Regex)";
      linksFound = parseKannadaGroups(fetchRes.html, "Test", "Test").length;
    } else if (url.includes("bestoftelegram.com")) {
      parserUsed = "BestOfTelegram (Regex)";
      linksFound = parseBestOfTelegram(fetchRes.html, "Test", "Test").length;
    } else {
      parserUsed = "Default/BestOfTelegram";
      linksFound = parseBestOfTelegram(fetchRes.html, "Test", "Test").length;
    }
  }

  const report = [
    "<b>🧪 Import Fetch Test</b>",
    "",
    `URL: ${escapeHtml(url)}`,
    `Status: ${fetchRes.status} ${fetchRes.statusText}`,
    `HTML length: ${fetchRes.html.length} bytes`,
    `Telegram links found: ${linksFound}`,
    `Blocked: ${fetchRes.ok ? "No" : "Yes"}`,
    `Parser used: ${parserUsed}`
  ].join("\n");

  await ctx.telegram.sendMessage(message.chat.id, report, { parse_mode: "HTML", disable_web_page_preview: true });
}
