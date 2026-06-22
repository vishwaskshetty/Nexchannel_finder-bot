import {
  clearSubmissionDraft,
  createOwnershipVerification,
  createSubmission,
  findChannelByIdentifier,
  findCategoryBySlug,
  getSubmissionDraft,
  listCategories,
  startSubmissionDraft,
  updateSubmissionDraft,
} from "../db";
import { blockedContentText, findBlockedContent, sanitizeUserText } from "../moderation";
import { sendAdminReviewNotification, sendOrEdit } from "../telegram";
import type { BotContext, ChannelType, SubmissionDraft, TelegramMessage } from "../types";
import {
  PRIVATE_CHANNEL_RULE_TEXT,
  SUBMIT_INTRO_TEXT,
  adminReviewNotificationKeyboard,
  adminSubmissionNotificationText,
  backHomeKeyboard,
  channelSubmittedAdminNotifyFailedText,
  channelSubmittedText,
  submitCategoriesKeyboard,
  submitLanguageKeyboard,
  submitNavKeyboard,
  submitStartKeyboard,
  submitTypeKeyboard,
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

export async function handleSubmitHelp(
  ctx: BotContext,
  chatId: number,
  messageId?: number,
): Promise<void> {
  await sendOrEdit(ctx.telegram, chatId, messageId, SUBMIT_INTRO_TEXT, {
    reply_markup: submitStartKeyboard(),
    disable_web_page_preview: true,
  });
}

export async function handleSubmitStart(
  ctx: BotContext,
  chatId: number,
  userId: number,
  messageId?: number,
): Promise<void> {
  await startSubmissionDraft(ctx.env, userId);
  await handleSubmitHelp(ctx, chatId, messageId);
}

export async function handleSubmitCommand(
  ctx: BotContext,
  message: TelegramMessage,
  _args: string,
): Promise<void> {
  if (!message.from) {
    return;
  }

  await handleSubmitStart(ctx, message.chat.id, message.from.id);
}

export async function handleSubmitText(
  ctx: BotContext,
  message: TelegramMessage,
  text: string,
): Promise<boolean> {
  if (!message.from) {
    return false;
  }

  const draft = await getSubmissionDraft(ctx.env, message.from.id);
  if (!draft) {
    return false;
  }

  const value = cleanInput(text);

  if (value.toLowerCase() === "/cancel" || value === "❌ Cancel") {
    await cancelSubmission(ctx, message.chat.id, message.from.id);
    return true;
  }

  switch (draft.step) {
    case "type":
      await ctx.telegram.sendMessage(message.chat.id, "Choose the channel type below.", {
        reply_markup: submitTypeKeyboard(),
      });
      return true;
    case "channel_input":
      await handleChannelInputStep(ctx, message.chat.id, message.from.id, draft, value);
      return true;
    case "description":
      await handleDescriptionStep(ctx, message.chat.id, message.from.id, value);
      return true;
    case "tags":
      await handleTagsStep(ctx, message.chat.id, message.from.id, value);
      return true;
    case "admin_username":
      await handleAdminUsernameStep(ctx, message, draft, value);
      return true;
    default:
      await handleSubmitHelp(ctx, message.chat.id);
      return true;
  }
}

export async function handleSubmitCallback(
  ctx: BotContext,
  data: string,
  chatId: number,
  messageId: number | undefined,
  userId: number,
): Promise<void> {
  if (data === "submit_cancel") {
    data = "s:x";
  } else if (data === "submit_type:public") {
    data = "s:t:p";
  } else if (data === "submit_type:private") {
    data = "s:t:r";
  } else if (data.startsWith("submit_category:")) {
    data = `s:c:${data.slice("submit_category:".length)}`;
  } else if (data.startsWith("submit_language:")) {
    data = `s:l:${data.slice("submit_language:".length)}`;
  }

  if (data === "s:x") {
    await clearSubmissionDraft(ctx.env, userId);
    await sendOrEdit(ctx.telegram, chatId, messageId, "❌ Submission cancelled.", {
      reply_markup: backHomeKeyboard("menu"),
    });
    return;
  }

  if (data === "s:b") {
    await handleSubmitBack(ctx, chatId, messageId, userId);
    return;
  }

  if (data === "s:t:p") {
    await handleChannelTypeStep(ctx, chatId, messageId, userId, "public");
    return;
  }

  if (data === "s:t:r") {
    await handleChannelTypeStep(ctx, chatId, messageId, userId, "private");
    return;
  }

  if (data.startsWith("s:c:")) {
    await handleCategoryStep(ctx, chatId, messageId, userId, data.slice("s:c:".length));
    return;
  }

  if (data.startsWith("s:l:")) {
    await handleLanguageStep(ctx, chatId, messageId, userId, data.slice("s:l:".length));
  }
}

async function handleChannelTypeStep(
  ctx: BotContext,
  chatId: number,
  messageId: number | undefined,
  userId: number,
  type: ChannelType,
): Promise<void> {
  await updateSubmissionDraft(ctx.env, userId, {
    step: "channel_input",
    channel_type: type,
  });

  await sendOrEdit(
    ctx.telegram,
    chatId,
    messageId,
    type === "private" ? PRIVATE_CHANNEL_RULE_TEXT : publicChannelPromptText(),
    {
      reply_markup: submitNavKeyboard("s:b"),
      disable_web_page_preview: true,
    },
  );
}

async function handleChannelInputStep(
  ctx: BotContext,
  chatId: number,
  userId: number,
  draft: SubmissionDraft,
  value: string,
): Promise<void> {
  const channelType = draft.channel_type;
  if (!channelType) {
    await handleSubmitStart(ctx, chatId, userId);
    return;
  }

  const normalized =
    channelType === "private" ? normalizePrivateInviteLink(value) : normalizePublicIdentifier(value);

  if (!normalized) {
    await ctx.telegram.sendMessage(
      chatId,
      channelType === "private" ? invalidPrivateText() : invalidPublicText(),
      {
        reply_markup: submitNavKeyboard("s:b"),
        disable_web_page_preview: true,
      },
    );
    return;
  }

  const blockedReason = findBlockedContent(normalized);
  if (blockedReason) {
    await ctx.telegram.sendMessage(chatId, blockedContentText(blockedReason), {
      reply_markup: submitNavKeyboard("s:b"),
      disable_web_page_preview: true,
    });
    return;
  }

  if (await isDuplicate(ctx, normalized)) {
    await duplicateMessage(ctx, chatId);
    return;
  }

  await updateSubmissionDraft(ctx.env, userId, {
    step: "category",
    channel_username: normalized,
  });

  await askCategory(ctx, chatId);
}

async function handleCategoryStep(
  ctx: BotContext,
  chatId: number,
  messageId: number | undefined,
  userId: number,
  categorySlug: string,
): Promise<void> {
  const category = await findCategoryBySlug(ctx.env, categorySlugFromKey(categorySlug) ?? categorySlug);
  if (!category) {
    await askCategory(ctx, chatId, messageId);
    return;
  }

  await updateSubmissionDraft(ctx.env, userId, {
    step: "language",
    category: category.slug,
  });

  await sendOrEdit(ctx.telegram, chatId, messageId, "🌍 Language\nChoose a language below.", {
    reply_markup: submitLanguageKeyboard(),
  });
}

async function handleLanguageStep(
  ctx: BotContext,
  chatId: number,
  messageId: number | undefined,
  userId: number,
  language: string,
): Promise<void> {
  if (!ALLOWED_LANGUAGES.has(language)) {
    await sendOrEdit(ctx.telegram, chatId, messageId, "🌍 Language\nChoose a language below.", {
      reply_markup: submitLanguageKeyboard(),
    });
    return;
  }

  await updateSubmissionDraft(ctx.env, userId, {
    step: "description",
    language,
  });

  await sendOrEdit(ctx.telegram, chatId, messageId, "📝 Description\nSend a short channel description.", {
    reply_markup: submitNavKeyboard("s:b"),
  });
}

async function handleDescriptionStep(
  ctx: BotContext,
  chatId: number,
  userId: number,
  description: string,
): Promise<void> {
  const safeDescription = sanitizeUserText(description, 700);

  if (safeDescription.length < 10 || safeDescription.length > 500) {
    await ctx.telegram.sendMessage(chatId, "📝 Description must be 10 to 500 characters.", {
      reply_markup: submitNavKeyboard("s:b"),
    });
    return;
  }

  const blockedReason = findBlockedContent(safeDescription);
  if (blockedReason) {
    await ctx.telegram.sendMessage(chatId, blockedContentText(blockedReason), {
      reply_markup: submitNavKeyboard("s:b"),
      disable_web_page_preview: true,
    });
    return;
  }

  await updateSubmissionDraft(ctx.env, userId, {
    step: "tags",
    description: safeDescription,
  });

  await ctx.telegram.sendMessage(chatId, "🏷 Tags\nSend tags separated by commas.", {
    reply_markup: submitNavKeyboard("s:b"),
  });
}

async function handleTagsStep(
  ctx: BotContext,
  chatId: number,
  userId: number,
  tags: string,
): Promise<void> {
  const safeTags = sanitizeUserText(tags, 160);

  if (safeTags.length < 2 || safeTags.length > 120) {
    await ctx.telegram.sendMessage(chatId, "🏷 Tags must be 2 to 120 characters.", {
      reply_markup: submitNavKeyboard("s:b"),
    });
    return;
  }

  const blockedReason = findBlockedContent(safeTags);
  if (blockedReason) {
    await ctx.telegram.sendMessage(chatId, blockedContentText(blockedReason), {
      reply_markup: submitNavKeyboard("s:b"),
      disable_web_page_preview: true,
    });
    return;
  }

  await updateSubmissionDraft(ctx.env, userId, {
    step: "admin_username",
    tags: safeTags,
  });

  await ctx.telegram.sendMessage(
    chatId,
    [
      "🛠 Channel Admin Username",
      "",
      "Send the admin username for review.",
      "",
      "Example: @channeladmin",
      "",
      "This is visible only to admins.",
    ].join("\n"),
    {
      reply_markup: submitNavKeyboard("s:b"),
    },
  );
}

async function handleAdminUsernameStep(
  ctx: BotContext,
  message: TelegramMessage,
  draft: SubmissionDraft,
  adminUsername: string,
): Promise<void> {
  if (!message.from) {
    return;
  }

  const safeAdminUsername = normalizeAdminUsername(adminUsername);
  if (!safeAdminUsername) {
    await ctx.telegram.sendMessage(message.chat.id, "Send a valid admin username, for example @channeladmin.", {
      reply_markup: submitNavKeyboard("s:b"),
    });
    return;
  }

  const currentDraft = await getSubmissionDraft(ctx.env, message.from.id);
  const finalDraft = currentDraft ?? draft;

  if (
    !finalDraft.channel_type ||
    !finalDraft.category ||
    !finalDraft.language ||
    !finalDraft.description ||
    !finalDraft.tags
  ) {
    await handleSubmitStart(ctx, message.chat.id, message.from.id);
    return;
  }

  const isPrivate = finalDraft.channel_type === "private";
  const inviteLink = (finalDraft.invite_link ?? finalDraft.channel_username)?.trim() ?? "";
  const publicIdentifier = (finalDraft.channel_username ?? finalDraft.channel_link)?.trim() ?? "";

  if (isPrivate) {
    if (!inviteLink) {
      await updateSubmissionDraft(ctx.env, message.from.id, { step: "channel_input" });
      await ctx.telegram.sendMessage(message.chat.id, PRIVATE_CHANNEL_RULE_TEXT, {
        reply_markup: submitNavKeyboard("s:b"),
        disable_web_page_preview: true,
      });
      return;
    }
  } else if (!publicIdentifier) {
    await updateSubmissionDraft(ctx.env, message.from.id, { step: "channel_input" });
    await ctx.telegram.sendMessage(message.chat.id, publicChannelPromptText(), {
      reply_markup: submitNavKeyboard("s:b"),
      disable_web_page_preview: true,
    });
    return;
  }

  const safeChannelUsername = isPrivate ? "" : publicIdentifier;
  const safeChannelLink = isPrivate
    ? ""
    : finalDraft.channel_link?.trim() || `https://t.me/${publicIdentifier.replace("@", "")}`;
  const safeInviteLink = isPrivate ? inviteLink : "";

  const submissionId = await createSubmission(ctx.env, {
    userId: message.from.id,
    channelIdentifier: isPrivate ? safeInviteLink : safeChannelUsername,
    channelUsername: safeChannelUsername,
    channelLink: safeChannelLink,
    inviteLink: safeInviteLink,
    channelType: finalDraft.channel_type,
    categorySlug: finalDraft.category,
    language: finalDraft.language,
    description: finalDraft.description,
    tags: finalDraft.tags,
    adminUsername: safeAdminUsername,
  });
  const verificationCode = await createOwnershipVerification(ctx.env, message.from.id, submissionId);

  await clearSubmissionDraft(ctx.env, message.from.id);

  const category = await findCategoryBySlug(ctx.env, finalDraft.category);
  const submissionTitle = isPrivate
    ? "Private Channel"
    : safeChannelUsername.replace(/^@/, "").replace(/_/g, " ").trim() || safeChannelUsername;

  const reviewResult = await sendAdminReviewNotification(
    ctx.env,
    ctx.telegram,
    adminSubmissionNotificationText({
      id: submissionId,
      title: submissionTitle,
      channel: safeChannelUsername,
      channelType: finalDraft.channel_type,
      category: category?.name ?? finalDraft.category,
      language: finalDraft.language,
      description: finalDraft.description,
      tags: finalDraft.tags,
      adminUsername: safeAdminUsername,
      verificationCode,
    }),
    adminReviewNotificationKeyboard(submissionId),
  );

  if (reviewResult.ok) {
    await ctx.telegram.sendMessage(message.chat.id, channelSubmittedText(submissionId), {
      reply_markup: backHomeKeyboard("menu"),
      disable_web_page_preview: true,
    });
    return;
  }

  await ctx.telegram.sendMessage(message.chat.id, channelSubmittedAdminNotifyFailedText(), {
    reply_markup: backHomeKeyboard("menu"),
    disable_web_page_preview: true,
  });
}

async function handleSubmitBack(
  ctx: BotContext,
  chatId: number,
  messageId: number | undefined,
  userId: number,
): Promise<void> {
  const draft = await getSubmissionDraft(ctx.env, userId);

  if (!draft || draft.step === "type") {
    await handleSubmitHelp(ctx, chatId, messageId);
    return;
  }

  if (draft.step === "channel_input") {
    await updateSubmissionDraft(ctx.env, userId, { step: "type" });
    await handleSubmitHelp(ctx, chatId, messageId);
    return;
  }

  if (draft.step === "category") {
    await updateSubmissionDraft(ctx.env, userId, { step: "channel_input" });
    await sendOrEdit(
      ctx.telegram,
      chatId,
      messageId,
      draft.channel_type === "private" ? PRIVATE_CHANNEL_RULE_TEXT : publicChannelPromptText(),
      {
        reply_markup: submitNavKeyboard("s:b"),
        disable_web_page_preview: true,
      },
    );
    return;
  }

  if (draft.step === "language") {
    await updateSubmissionDraft(ctx.env, userId, { step: "category" });
    await askCategory(ctx, chatId, messageId);
    return;
  }

  if (draft.step === "description") {
    await updateSubmissionDraft(ctx.env, userId, { step: "language" });
    await sendOrEdit(ctx.telegram, chatId, messageId, "🌍 Language\nChoose a language below.", {
      reply_markup: submitLanguageKeyboard(),
    });
    return;
  }

  if (draft.step === "tags") {
    await updateSubmissionDraft(ctx.env, userId, { step: "description" });
    await sendOrEdit(ctx.telegram, chatId, messageId, "📝 Description\nSend a short channel description.", {
      reply_markup: submitNavKeyboard("s:b"),
    });
    return;
  }

  await updateSubmissionDraft(ctx.env, userId, { step: "tags" });
  await sendOrEdit(ctx.telegram, chatId, messageId, "🏷 Tags\nSend tags separated by commas.", {
    reply_markup: submitNavKeyboard("s:b"),
  });
}

async function askCategory(ctx: BotContext, chatId: number, messageId?: number): Promise<void> {
  const categories = await listCategories(ctx.env);
  await sendOrEdit(ctx.telegram, chatId, messageId, "📂 Category\nChoose a category below.", {
    reply_markup: submitCategoriesKeyboard(categories),
  });
}

async function cancelSubmission(ctx: BotContext, chatId: number, userId: number): Promise<void> {
  await clearSubmissionDraft(ctx.env, userId);
  await ctx.telegram.sendMessage(chatId, "❌ Submission cancelled.", {
    reply_markup: backHomeKeyboard("menu"),
  });
}

async function isDuplicate(ctx: BotContext, identifier: string): Promise<boolean> {
  return (await findChannelByIdentifier(ctx.env, identifier)) !== null;
}

async function duplicateMessage(ctx: BotContext, chatId: number): Promise<void> {
  await ctx.telegram.sendMessage(chatId, "❌ This channel is already submitted or listed.", {
    reply_markup: submitNavKeyboard("s:b"),
  });
}

function publicChannelPromptText(): string {
  return [
    "🌍 Public Channel",
    "",
    "Send your channel username or link.",
    "",
    "@examplechannel",
    "https://t.me/examplechannel",
  ].join("\n");
}

function normalizePublicIdentifier(value: string): string | null {
  if (isPublicUsername(value)) {
    return value;
  }

  const trimmed = value.trim();
  const withoutProtocol = trimmed.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  if (!/^t\.me\//i.test(withoutProtocol) && !/^telegram\.me\//i.test(withoutProtocol)) {
    return null;
  }

  const path = withoutProtocol
    .replace(/^t\.me\//i, "")
    .replace(/^telegram\.me\//i, "")
    .split(/[/?#]/, 1)[0];

  if (path.startsWith("+") || path === "joinchat") {
    return null;
  }

  return isTelegramUsername(path) ? `@${path}` : null;
}

function normalizePrivateInviteLink(value: string): string | null {
  const trimmed = value.trim();
  if (!isPrivateInviteLink(trimmed)) {
    return null;
  }

  if (trimmed.includes("?") || /request|approve/i.test(trimmed)) {
    return null;
  }

  return trimmed;
}

function normalizeAdminUsername(value: string): string | null {
  const trimmed = value.trim();
  return isPublicUsername(trimmed) ? trimmed : null;
}

function isPublicUsername(value: string): boolean {
  return value.startsWith("@") && isTelegramUsername(value.slice(1));
}

function isTelegramUsername(value: string): boolean {
  return /^[a-zA-Z0-9_]{5,32}$/.test(value);
}

function isPrivateInviteLink(value: string): boolean {
  return /^https:\/\/t\.me\/\+[a-zA-Z0-9_-]+$/i.test(value) || /^https:\/\/t\.me\/joinchat\/[a-zA-Z0-9_-]+$/i.test(value);
}

function cleanInput(value: string): string {
  const trimmed = value.trim();
  const markdownLink = trimmed.match(/^\[.+?\]\((https:\/\/t\.me\/.+?)\)$/i);
  return markdownLink?.[1]?.trim() ?? trimmed;
}

function invalidPublicText(): string {
  return [
    "❌ Public channels must use:",
    "@examplechannel",
    "or",
    "https://t.me/examplechannel",
  ].join("\n");
}

function invalidPrivateText(): string {
  return [
    "❌ Private invite link is not allowed.",
    "",
    "Use a working auto-join / auto-approve link:",
    "https://t.me/+privateInviteCode",
    "https://t.me/joinchat/privateInviteCode",
    "",
    "Do not send request-to-join links.",
  ].join("\n");
}
