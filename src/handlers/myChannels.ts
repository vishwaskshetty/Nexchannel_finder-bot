import {
  clearOwnerState,
  findCategoryBySlug,
  getOwnerState,
  getUserChannel,
  hideUserChannel,
  listCategories,
  listUserChannels,
  setOwnerState,
  updateUserChannelDetails,
} from "../db";
import { findBlockedContent, blockedContentText, sanitizeUserText } from "../moderation";
import { sendOrEdit } from "../telegram";
import type { BotContext, TelegramMessage } from "../types";
import {
  MY_CHANNELS_PAGE_SIZE,
  backHomeKeyboard,
  myChannelCategoryKeyboard,
  myChannelDetailsKeyboard,
  myChannelDetailsText,
  myChannelEditKeyboard,
  myChannelEditPromptText,
  myChannelEditText,
  myChannelLanguageKeyboard,
  myChannelRemoveConfirmKeyboard,
  myChannelRemoveConfirmText,
  myChannelStatsText,
  myChannelsKeyboard,
  myChannelsText,
} from "../ui";
import { categorySlugFromKey } from "../categoryKeys";

const ALLOWED_LANGUAGES = new Set([
  "English",
  "Hindi",
  "Kannada",
  "Tamil",
  "Telugu",
  "Malayalam",
  "Other",
]);

export function isMyChannelsCallbackData(data: string): boolean {
  return data === "my" || data === "my_channels" || data.startsWith("my_channel:") ||
    data.startsWith("my_channel_stats:") || data.startsWith("my_channel_edit:") ||
    data.startsWith("my_channel_remove:") || data.startsWith("my_channel_confirm_remove:") ||
    data.startsWith("mc:");
}

export async function handleMyChannels(
  ctx: BotContext,
  chatId: number,
  messageId: number | undefined,
  userId: number,
  page = 0,
): Promise<void> {
  const safePage = Math.max(0, page);
  const rows = await listUserChannels(
    ctx.env,
    userId,
    safePage * MY_CHANNELS_PAGE_SIZE,
    MY_CHANNELS_PAGE_SIZE + 1,
  );
  const channels = rows.slice(0, MY_CHANNELS_PAGE_SIZE);
  const hasNext = rows.length > MY_CHANNELS_PAGE_SIZE;

  await sendOrEdit(ctx.telegram, chatId, messageId, myChannelsText(channels, safePage, hasNext), {
    reply_markup: myChannelsKeyboard(channels, safePage, hasNext),
    disable_web_page_preview: true,
  });
}

export async function handleMyChannelsCallback(
  ctx: BotContext,
  data: string,
  chatId: number,
  messageId: number | undefined,
  userId: number,
): Promise<void> {
  if (data === "my" || data === "my_channels") {
    await handleMyChannels(ctx, chatId, messageId, userId);
    return;
  }

  const canonicalMatch = /^my_channel(?:_(stats|edit|remove|confirm_remove))?:(\d+)$/.exec(data);
  if (canonicalMatch) {
    const actionByName: Record<string, string> = {
      stats: "st",
      edit: "e",
      remove: "rm",
      confirm_remove: "crm",
    };
    const action = canonicalMatch[1] ? actionByName[canonicalMatch[1]] : "v";
    await handleMyChannelAction(ctx, chatId, messageId, userId, action, Number(canonicalMatch[2]));
    return;
  }

  const pageMatch = /^mc:p:(\d+)$/.exec(data);
  if (pageMatch) {
    await handleMyChannels(ctx, chatId, messageId, userId, Number(pageMatch[1]));
    return;
  }

  const viewMatch = /^mc:(v|st|e|rm):(\d+)$/.exec(data);
  if (viewMatch) {
    const channelId = Number(viewMatch[2]);
    await handleMyChannelAction(ctx, chatId, messageId, userId, viewMatch[1], channelId);
    return;
  }

  const editFieldMatch = /^mc:ef:(\d+):(d|t|c|l)$/.exec(data);
  if (editFieldMatch) {
    await handleEditField(ctx, chatId, messageId, userId, Number(editFieldMatch[1]), editFieldMatch[2]);
    return;
  }

  const categoryMatch = /^mc:ec:(\d+):(.+)$/.exec(data);
  if (categoryMatch) {
    await handleCategoryUpdate(ctx, chatId, messageId, userId, Number(categoryMatch[1]), categoryMatch[2]);
    return;
  }

  const languageMatch = /^mc:el:(\d+):(.+)$/.exec(data);
  if (languageMatch) {
    await handleLanguageUpdate(ctx, chatId, messageId, userId, Number(languageMatch[1]), languageMatch[2]);
    return;
  }

  await handleMyChannels(ctx, chatId, messageId, userId);
}

export async function handleMyChannelText(
  ctx: BotContext,
  message: TelegramMessage,
  text: string,
): Promise<boolean> {
  const userId = message.from?.id;
  if (!userId) {
    return false;
  }

  const state = await getOwnerState(ctx.env, userId);
  if (!state) {
    return false;
  }

  const channel = await getUserChannel(ctx.env, userId, state.channel_id);
  if (!channel) {
    await clearOwnerState(ctx.env, userId);
    await ctx.telegram.sendMessage(message.chat.id, "Channel not found.", {
      reply_markup: backHomeKeyboard("my"),
    });
    return true;
  }

  if (state.mode === "edit_description") {
    const description = sanitizeUserText(text, 700);
    if (description.length < 10 || description.length > 500) {
      await ctx.telegram.sendMessage(message.chat.id, "Description must be 10 to 500 characters.", {
        reply_markup: backHomeKeyboard(`mc:e:${channel.id}`, "menu"),
      });
      return true;
    }

    const blockedReason = findBlockedContent(description);
    if (blockedReason) {
      await ctx.telegram.sendMessage(message.chat.id, blockedContentText(blockedReason), {
        reply_markup: backHomeKeyboard(`mc:e:${channel.id}`, "menu"),
        disable_web_page_preview: true,
      });
      return true;
    }

    await updateUserChannelDetails(ctx.env, userId, channel.id, { description });
    await clearOwnerState(ctx.env, userId);
    await showUpdatedChannel(ctx, message.chat.id, undefined, userId, channel.id);
    return true;
  }

  const tags = sanitizeUserText(text, 160);
  if (tags.length < 2 || tags.length > 120) {
    await ctx.telegram.sendMessage(message.chat.id, "Tags must be 2 to 120 characters.", {
      reply_markup: backHomeKeyboard(`mc:e:${channel.id}`, "menu"),
    });
    return true;
  }

  const blockedReason = findBlockedContent(tags);
  if (blockedReason) {
    await ctx.telegram.sendMessage(message.chat.id, blockedContentText(blockedReason), {
      reply_markup: backHomeKeyboard(`mc:e:${channel.id}`, "menu"),
      disable_web_page_preview: true,
    });
    return true;
  }

  await updateUserChannelDetails(ctx.env, userId, channel.id, { tags });
  await clearOwnerState(ctx.env, userId);
  await showUpdatedChannel(ctx, message.chat.id, undefined, userId, channel.id);
  return true;
}

async function handleMyChannelAction(
  ctx: BotContext,
  chatId: number,
  messageId: number | undefined,
  userId: number,
  action: string,
  channelId: number,
): Promise<void> {
  const channel = await getUserChannel(ctx.env, userId, channelId);
  if (!channel) {
    await sendOrEdit(ctx.telegram, chatId, messageId, "Channel not found.", {
      reply_markup: backHomeKeyboard("my"),
    });
    return;
  }

  if (action === "st") {
    await sendOrEdit(ctx.telegram, chatId, messageId, myChannelStatsText(channel), {
      reply_markup: backHomeKeyboard(`mc:v:${channel.id}`, "menu"),
      disable_web_page_preview: true,
    });
    return;
  }

  if (action === "e") {
    await sendOrEdit(ctx.telegram, chatId, messageId, myChannelEditText(channel), {
      reply_markup: myChannelEditKeyboard(channel.id),
      disable_web_page_preview: true,
    });
    return;
  }

  if (action === "rm") {
    await sendOrEdit(ctx.telegram, chatId, messageId, myChannelRemoveConfirmText(channel), {
      reply_markup: myChannelRemoveConfirmKeyboard(channel.id),
    });
    return;
  }

  if (action === "crm") {
    const updated = await hideUserChannel(ctx.env, userId, channel.id);
    await sendOrEdit(ctx.telegram, chatId, messageId, updated ? myChannelDetailsText(updated) : "Channel not found.", {
      reply_markup: updated ? myChannelDetailsKeyboard(updated.id) : backHomeKeyboard("my"),
      disable_web_page_preview: true,
    });
    return;
  }

  await sendOrEdit(ctx.telegram, chatId, messageId, myChannelDetailsText(channel), {
    reply_markup: myChannelDetailsKeyboard(channel.id),
    disable_web_page_preview: true,
  });
}

async function handleEditField(
  ctx: BotContext,
  chatId: number,
  messageId: number | undefined,
  userId: number,
  channelId: number,
  field: string,
): Promise<void> {
  const channel = await getUserChannel(ctx.env, userId, channelId);
  if (!channel) {
    await sendOrEdit(ctx.telegram, chatId, messageId, "Channel not found.", {
      reply_markup: backHomeKeyboard("my"),
    });
    return;
  }

  if (field === "d") {
    await setOwnerState(ctx.env, userId, channel.id, "edit_description");
    await sendOrEdit(ctx.telegram, chatId, messageId, myChannelEditPromptText(channel, "description"), {
      reply_markup: backHomeKeyboard(`mc:e:${channel.id}`, "menu"),
    });
    return;
  }

  if (field === "t") {
    await setOwnerState(ctx.env, userId, channel.id, "edit_tags");
    await sendOrEdit(ctx.telegram, chatId, messageId, myChannelEditPromptText(channel, "tags"), {
      reply_markup: backHomeKeyboard(`mc:e:${channel.id}`, "menu"),
    });
    return;
  }

  if (field === "c") {
    const categories = await listCategories(ctx.env);
    await sendOrEdit(ctx.telegram, chatId, messageId, "📂 Category\nChoose a new category.", {
      reply_markup: myChannelCategoryKeyboard(channel.id, categories),
    });
    return;
  }

  await sendOrEdit(ctx.telegram, chatId, messageId, "🌍 Language\nChoose a new language.", {
    reply_markup: myChannelLanguageKeyboard(channel.id),
  });
}

async function handleCategoryUpdate(
  ctx: BotContext,
  chatId: number,
  messageId: number | undefined,
  userId: number,
  channelId: number,
  categorySlug: string,
): Promise<void> {
  const category = await findCategoryBySlug(ctx.env, categorySlugFromKey(categorySlug) ?? categorySlug);
  if (!category) {
    await sendOrEdit(ctx.telegram, chatId, messageId, "Category not found.", {
      reply_markup: backHomeKeyboard(`mc:e:${channelId}`, "menu"),
    });
    return;
  }

  await updateUserChannelDetails(ctx.env, userId, channelId, { category: category.slug });
  await showUpdatedChannel(ctx, chatId, messageId, userId, channelId);
}

async function handleLanguageUpdate(
  ctx: BotContext,
  chatId: number,
  messageId: number | undefined,
  userId: number,
  channelId: number,
  language: string,
): Promise<void> {
  if (!ALLOWED_LANGUAGES.has(language)) {
    await sendOrEdit(ctx.telegram, chatId, messageId, "Language not found.", {
      reply_markup: backHomeKeyboard(`mc:e:${channelId}`, "menu"),
    });
    return;
  }

  await updateUserChannelDetails(ctx.env, userId, channelId, { language });
  await showUpdatedChannel(ctx, chatId, messageId, userId, channelId);
}

async function showUpdatedChannel(
  ctx: BotContext,
  chatId: number,
  messageId: number | undefined,
  userId: number,
  channelId: number,
): Promise<void> {
  const updated = await getUserChannel(ctx.env, userId, channelId);
  await sendOrEdit(ctx.telegram, chatId, messageId, updated ? myChannelDetailsText(updated) : "Channel not found.", {
    reply_markup: updated ? myChannelDetailsKeyboard(updated.id) : backHomeKeyboard("my"),
    disable_web_page_preview: true,
  });
}
