import { listSavedChannels, removeSavedChannel, saveChannel } from "../db";
import { sendOrEdit } from "../telegram";
import type { BotContext, TelegramCallbackQuery } from "../types";
import { ERROR_TEXT, PAGE_SIZE, backToMenuKeyboard, savedChannelsKeyboard, savedChannelsText } from "../ui";
import { handleChannelDetails } from "./channels";

export function isSavedCallbackData(data: string): boolean {
  return data.startsWith("sv:") || data.startsWith("save:") ||
    data.startsWith("unsave:") || data.startsWith("saved_page:");
}

export async function handleSavedChannels(
  ctx: BotContext,
  chatId: number,
  messageId: number | undefined,
  userId: number,
  page = 0,
): Promise<void> {
  const safePage = Math.max(0, page);
  const rows = await listSavedChannels(ctx.env, userId, safePage * PAGE_SIZE, PAGE_SIZE + 1);
  const channels = rows.slice(0, PAGE_SIZE);
  const hasNext = rows.length > PAGE_SIZE;

  await sendOrEdit(ctx.telegram, chatId, messageId, savedChannelsText(channels, safePage, hasNext), {
    reply_markup: savedChannelsKeyboard(channels, safePage, hasNext),
    disable_web_page_preview: true,
  });
}

export async function handleSavedCallback(
  ctx: BotContext,
  query: TelegramCallbackQuery,
  chatId: number,
  messageId: number | undefined,
): Promise<void> {
  const data = query.data ?? "";
  const userId = query.from.id;

  console.log("Channel action: saved_callback", data);

  // save:<channelId>
  const addMatch = /^(?:sv:add|save):(\d+)$/.exec(data);
  if (addMatch) {
    await handleSaveChannel(ctx, query, chatId, messageId, Number(addMatch[1]));
    return;
  }

  // saved_page:<page>
  const pageMatch = /^(?:sv:p|saved_page):(\d+)$/.exec(data);
  if (pageMatch) {
    await ctx.telegram.answerCallbackQuery(query.id);
    await handleSavedChannels(ctx, chatId, messageId, userId, Number(pageMatch[1]));
    return;
  }

  // unsave:<channelId> — called from the saved channels list (removes and refreshes list)
  const canonicalRemoveMatch = /^unsave:(\d+)$/.exec(data);
  if (canonicalRemoveMatch) {
    const channelId = Number(canonicalRemoveMatch[1]);
    console.log("Channel action: unsave_from_list");
    console.log("Channel ID:", channelId);

    try {
      await removeSavedChannel(ctx.env, userId, channelId);
      await ctx.telegram.answerCallbackQuery(query.id, "✅ Removed from saved channels.");
      // Refresh the saved list after removal
      await handleSavedChannels(ctx, chatId, messageId, userId, 0);
    } catch (error) {
      console.error("Error in unsave:", error);
      await ctx.telegram.answerCallbackQuery(query.id, "❌ Something went wrong. Please try again.", true);
    }
    return;
  }

  // sv:r:<channelId>:<page> (legacy pattern)
  const removeMatch = /^sv:r:(\d+):(\d+)$/.exec(data);
  if (removeMatch) {
    const channelId = Number(removeMatch[1]);
    const page = Number(removeMatch[2]);
    try {
      await removeSavedChannel(ctx.env, userId, channelId);
      await ctx.telegram.answerCallbackQuery(query.id, "✅ Removed from saved channels.");
      await handleSavedChannels(ctx, chatId, messageId, userId, page);
    } catch (error) {
      console.error("Error in sv:r unsave:", error);
      await ctx.telegram.answerCallbackQuery(query.id, "❌ Something went wrong. Please try again.", true);
    }
    return;
  }

  await ctx.telegram.answerCallbackQuery(query.id);
  await sendOrEdit(ctx.telegram, chatId, messageId, "Saved channels action is not available.", {
    reply_markup: backToMenuKeyboard(),
  });
}

async function handleSaveChannel(
  ctx: BotContext,
  query: TelegramCallbackQuery,
  chatId: number,
  messageId: number | undefined,
  channelId: number,
): Promise<void> {
  console.log("Channel action: save_channel");
  console.log("Channel ID:", channelId);

  try {
    const result = await saveChannel(ctx.env, query.from.id, channelId);

    if (result === "missing") {
      await ctx.telegram.answerCallbackQuery(query.id, "❌ This channel is not available anymore.", true);
      return;
    }

    if (result === "exists") {
      await ctx.telegram.answerCallbackQuery(query.id, "✅ Already saved.", true);
      // Re-render channel details with isSaved=true
      await handleChannelDetails(ctx, chatId, messageId, channelId, query.from.id, false);
      return;
    }

    // Created successfully
    await ctx.telegram.answerCallbackQuery(query.id, "✅ Channel saved.");
    // Re-render channel details with isSaved=true (so button changes to ✅ Saved)
    await handleChannelDetails(ctx, chatId, messageId, channelId, query.from.id, false);
  } catch (error) {
    console.error("Error saving channel:", channelId, error);
    await ctx.telegram.answerCallbackQuery(query.id, ERROR_TEXT, true);
  }
}
