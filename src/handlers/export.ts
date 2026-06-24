import { getAdminStats, listAllApprovedChannels } from "../db";
import type { BotContext, TelegramMessage } from "../types";

// ─── /stats — Bot Database Stats ────────────────────────────────────────────

export async function handleStatsCommand(
  ctx: BotContext,
  message: TelegramMessage,
): Promise<void> {
  const userId = message.from?.id;
  if (!userId || !ctx.adminIds.has(userId)) {
    await ctx.telegram.sendMessage(message.chat.id, "❌ Admin access only.");
    return;
  }

  try {
    const stats = await getAdminStats(ctx.env);

    const text = [
      "📊 <b>Bot Database Stats</b>",
      "",
      `📢 Total channels: <b>${stats.totalChannels}</b>`,
      `✅ Approved: <b>${stats.approvedChannels}</b>`,
      `⏳ Pending: <b>${stats.pendingChannels}</b>`,
      `🚫 Hidden: <b>${stats.hiddenChannels}</b>`,
      `⭐ Verified: <b>${stats.verifiedChannels}</b>`,
      "",
      `👥 Total users: <b>${stats.totalUsers}</b>`,
      `🖱 Total clicks: <b>${stats.totalClicks}</b>`,
      `⭐ Total ratings: <b>${stats.totalRatings}</b>`,
      `💾 Total saves: <b>${stats.totalSaved}</b>`,
      `🚨 Total reports: <b>${stats.totalReports}</b>`,
    ].join("\n");

    await ctx.telegram.sendMessage(message.chat.id, text, { parse_mode: "HTML" });
  } catch (err) {
    console.error("Stats command error:", err);
    await ctx.telegram.sendMessage(message.chat.id, "❌ Failed to fetch stats.");
  }
}

// ─── /export — Export All Approved Channels ──────────────────────────────────

export async function handleExportCommand(
  ctx: BotContext,
  message: TelegramMessage,
): Promise<void> {
  const userId = message.from?.id;
  if (!userId || !ctx.adminIds.has(userId)) {
    await ctx.telegram.sendMessage(message.chat.id, "❌ Admin access only.");
    return;
  }

  try {
    await ctx.telegram.sendMessage(message.chat.id, "⏳ Generating export...");

    const channels = await listAllApprovedChannels(ctx.env, 5000);

    if (channels.length === 0) {
      await ctx.telegram.sendMessage(message.chat.id, "📭 No approved public channels found.");
      return;
    }

    // Format: @username | Category | Language | Description | Tags
    const lines = channels.map(ch => {
      const username = ch.channel_username ?? ch.username ?? "";
      const category = ch.category_name ?? ch.category ?? "other";
      const language = ch.language ?? "Mixed";
      const description = (ch.description ?? "").replace(/[\r\n|]/g, " ").slice(0, 80);
      const tags = (ch.tags ?? "").replace(/[\r\n|]/g, " ").slice(0, 60);
      return `${username} | ${category} | ${language} | ${description} | ${tags}`;
    });

    const header = `# NexChannel Finder Export\n# Total: ${channels.length} channels\n# Format: @username | Category | Language | Description | Tags\n\n`;
    const fullText = header + lines.join("\n");

    // Telegram message limit is 4096 chars. Send in chunks.
    const chunkSize = 3800;
    if (fullText.length <= chunkSize) {
      await ctx.telegram.sendMessage(message.chat.id, `<pre>${escapeHtml(fullText)}</pre>`, { parse_mode: "HTML" });
    } else {
      const chunks = chunkText(lines, chunkSize);
      await ctx.telegram.sendMessage(
        message.chat.id,
        `✅ Export: ${channels.length} channels. Sending in ${chunks.length} parts...`,
      );
      for (let i = 0; i < chunks.length; i++) {
        const chunkHeader = i === 0 ? header : `# Part ${i + 1}/${chunks.length}\n`;
        await ctx.telegram.sendMessage(
          message.chat.id,
          `<pre>${escapeHtml(chunkHeader + chunks[i])}</pre>`,
          { parse_mode: "HTML" },
        );
        // Avoid rate limits
        if (i < chunks.length - 1) {
          await new Promise(r => setTimeout(r, 500));
        }
      }
    }
  } catch (err) {
    console.error("Export command error:", err);
    await ctx.telegram.sendMessage(message.chat.id, "❌ Failed to generate export.");
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function chunkText(lines: string[], maxChars: number): string[] {
  const chunks: string[] = [];
  let current = "";

  for (const line of lines) {
    const addition = (current ? "\n" : "") + line;
    if ((current + addition).length > maxChars && current.length > 0) {
      chunks.push(current);
      current = line;
    } else {
      current += addition;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}
