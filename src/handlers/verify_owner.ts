import { sendOrEdit } from "../telegram";
import type { BotContext, TelegramMessage } from "../types";

export async function handleVerifyForwardedMessage(
  ctx: BotContext,
  message: TelegramMessage
): Promise<boolean> {
  const userId = message.from?.id;
  if (!userId) return false;

  const forwardedChatId = message.forward_from_chat?.id;
  const forwardedUsername = message.forward_from_chat?.username;
  if (!forwardedChatId && !forwardedUsername) {
    return false; // not a forwarded message from a chat/channel
  }

  const text = message.text || message.caption;
  if (!text || !text.includes("NEX-")) {
    return false; // Not a verification message
  }

  // Find the channel the code belongs to
  const channel = await ctx.env.DB.prepare(`
    SELECT * FROM channels 
    WHERE owner_telegram_id = ? AND verification_code = ?
  `).bind(userId, text.trim()).first<any>();

  if (!channel) {
    await ctx.telegram.sendMessage(message.chat.id, "❌ Verification code not recognized or you don't own this channel.");
    return true;
  }

  let matched = false;
  if (message.forward_from_chat?.type === "channel") {
    matched = true;
  }

  if (matched) {
    await ctx.env.DB.prepare(`
      UPDATE channels SET ownership_verified = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(channel.id).run();

    await ctx.telegram.sendMessage(message.chat.id, "✅ Success! Your channel is now Ownership Verified.");
  } else {
    await ctx.telegram.sendMessage(message.chat.id, "❌ Forwarded message does not appear to be from your channel.");
  }

  return true;
}

export async function handleVerifyCommand(ctx: BotContext, message: TelegramMessage): Promise<void> {
  const userId = message.from?.id;
  if (!userId) return;

  const channels = await ctx.env.DB.prepare(`
    SELECT id, title, channel_username, verification_code, ownership_verified 
    FROM channels WHERE owner_telegram_id = ? AND status = 'approved'
  `).bind(userId).all<any>();

  if (!channels.results || channels.results.length === 0) {
    await ctx.telegram.sendMessage(message.chat.id, "You don't have any approved channels to verify.");
    return;
  }

  const unverified = channels.results.filter(c => !c.ownership_verified);

  if (unverified.length === 0) {
    await ctx.telegram.sendMessage(message.chat.id, "✅ All your channels are already ownership verified.");
    return;
  }

  let text = "<b>🔐 Ownership Verification</b>\n\nTo verify your channels, post the unique code below into your channel, then forward that message from your channel back to me here.\n\n";
  for (const ch of unverified) {
    let code = ch.verification_code;
    if (!code) {
      code = `NEX-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      await ctx.env.DB.prepare(`UPDATE channels SET verification_code = ? WHERE id = ?`)
        .bind(code, ch.id).run();
    }
    text += `📢 <b>${ch.title}</b>\n`;
    text += `Code: <code>${code}</code>\n\n`;
  }

  await ctx.telegram.sendMessage(message.chat.id, text, { parse_mode: "HTML" });
}
