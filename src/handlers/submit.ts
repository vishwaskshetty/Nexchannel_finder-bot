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
  submitConfirmKeyboard,
  submissionPreviewText,
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
  message?: TelegramMessage,
): Promise<void> {
  const { editOrSendPage } = await import("./banners");
  await editOrSendPage(
    ctx,
    chatId,
    messageId,
    message,
    SUBMIT_INTRO_TEXT,
    submitStartKeyboard(),
    "add_channel",
  );
}


export async function handleSubmitStart(
  ctx: BotContext,
  chatId: number,
  userId: number,
  messageId?: number,
  message?: TelegramMessage,
): Promise<void> {
  const { isYouTubeVerified, showYouTubeRequiredForSubmit } = await import("./youtube");
  const verified = await isYouTubeVerified(ctx.env, userId);
  if (!verified) {
    await showYouTubeRequiredForSubmit(chatId, userId, ctx.env);
    return;
  }

  await startSubmissionDraft(ctx.env, userId);

  await handleSubmitHelp(ctx, chatId, messageId, message);
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

export function generateVerificationCode(): string {
  return `NEX-${Math.floor(10000 + Math.random() * 90000)}`;
}

export async function handleSubmitCallback(
  ctx: BotContext,
  data: string,
  chatId: number,
  messageId: number | undefined,
  userId: number,
): Promise<void> {
  if (data === "submit_channel" || data === "submit") {
    await handleSubmitStart(ctx, chatId, userId, messageId);
    return;
  }

  if (data === "submit_cancel") {
    data = "s:x";
  } else if (data === "submit_type:public") {
    data = "s:t:p";
  } else if (data === "submit_type:private") {
    data = "s:t:r";
  } else if (data === "submit_type:bot") {
    data = "s:t:b";
  } else if (data === "submit_confirm") {
    await handleSubmitConfirm(ctx, chatId, messageId, userId);
    return;
  } else if (data === "submit_edit") {
    await handleSubmitBack(ctx, chatId, messageId, userId);
    return;
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

  if (data === "s:t:b") {
    await handleChannelTypeStep(ctx, chatId, messageId, userId, "bot");
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

  let prompt = "";
  if (type === "private") {
    prompt = PRIVATE_CHANNEL_RULE_TEXT;
  } else if (type === "bot") {
    prompt = botChannelPromptText();
  } else {
    prompt = publicChannelPromptText();
  }

  await sendOrEdit(
    ctx.telegram,
    chatId,
    messageId,
    prompt,
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
    channelType === "private" ? normalizePrivateInviteLink(value) : (channelType === "bot" ? normalizeBotUsername(value) : normalizePublicIdentifier(value));

  if (!normalized) {
    let invalidText = invalidPublicText();
    if (channelType === "private") invalidText = invalidPrivateText();
    if (channelType === "bot") invalidText = invalidBotText();
    
    await ctx.telegram.sendMessage(
      chatId,
      invalidText,
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
  if (!message.from) return;

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

  const verificationCode = generateVerificationCode();

  await updateSubmissionDraft(ctx.env, message.from.id, {
    step: "preview",
    admin_username: safeAdminUsername,
    verification_code: verificationCode,
  });

  const preview = submissionPreviewText(
    { ...finalDraft, admin_username: safeAdminUsername },
    verificationCode
  );

  await ctx.telegram.sendMessage(message.chat.id, preview, {
    reply_markup: submitConfirmKeyboard(),
    disable_web_page_preview: true,
    parse_mode: "HTML",
  });
}

async function handleSubmitConfirm(
  ctx: BotContext,
  chatId: number,
  messageId: number | undefined,
  userId: number
): Promise<void> {
  const finalDraft = await getSubmissionDraft(ctx.env, userId);
  if (!finalDraft || finalDraft.step !== "preview") {
    await handleSubmitStart(ctx, chatId, userId);
    return;
  }

  const isPrivate = finalDraft.channel_type === "private";
  const inviteLink = (finalDraft.invite_link ?? finalDraft.channel_username)?.trim() ?? "";
  const publicIdentifier = (finalDraft.channel_username ?? finalDraft.channel_link)?.trim() ?? "";

  const safeChannelUsername = isPrivate ? "" : publicIdentifier;
  const safeChannelLink = isPrivate
    ? ""
    : finalDraft.channel_link?.trim() || `https://t.me/${publicIdentifier.replace("@", "")}`;
  const safeInviteLink = isPrivate ? inviteLink : "";

  const submissionId = await createSubmission(ctx.env, {
    userId: userId,
    channelIdentifier: isPrivate ? safeInviteLink : safeChannelUsername,
    channelUsername: safeChannelUsername,
    channelLink: safeChannelLink,
    inviteLink: safeInviteLink,
    channelType: finalDraft.channel_type as ChannelType,
    categorySlug: finalDraft.category!,
    language: finalDraft.language!,
    description: finalDraft.description!,
    tags: finalDraft.tags!,
    adminUsername: finalDraft.admin_username!,
  });

  const verificationCode = finalDraft.verification_code || generateVerificationCode();
  
  await ctx.env.DB.prepare(
    `
    UPDATE channels
    SET verification_code = ?,
      verification_status = 'pending',
      verification_created_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND owner_telegram_id = ?
    `
  ).bind(verificationCode, submissionId, userId).run();

  await ctx.env.DB.prepare(
    `
    INSERT INTO ownership_verifications (
      telegram_id,
      channel_id,
      verification_code,
      status,
      method,
      created_at
    )
    VALUES (?, ?, ?, 'pending', 'auto', CURRENT_TIMESTAMP)
    `
  ).bind(userId, submissionId, verificationCode).run();

  await clearSubmissionDraft(ctx.env, userId);

  const category = await findCategoryBySlug(ctx.env, finalDraft.category!);
  let titleStr = "Unknown";
  if (isPrivate) {
    titleStr = "Private Channel";
  } else {
    titleStr = safeChannelUsername.replace(/^@/, "").replace(/_/g, " ").trim() || safeChannelUsername;
  }
  
  if (finalDraft.channel_type === "bot") titleStr = "Bot: " + titleStr;

  const reviewResult = await sendAdminReviewNotification(
    ctx.env,
    ctx.telegram,
    adminSubmissionNotificationText({
      id: submissionId,
      title: titleStr,
      channel: isPrivate ? safeInviteLink : safeChannelUsername,
      channelType: finalDraft.channel_type as ChannelType,
      category: category?.name ?? finalDraft.category!,
      language: finalDraft.language!,
      description: finalDraft.description!,
      tags: finalDraft.tags!,
      adminUsername: finalDraft.admin_username!,
      verificationCode,
    }),
    adminReviewNotificationKeyboard(submissionId, isPrivate ? safeInviteLink : safeChannelLink),
  );

  if (reviewResult.ok) {
    await sendOrEdit(ctx.telegram, chatId, messageId, channelSubmittedText(submissionId), {
      reply_markup: backHomeKeyboard("menu"),
      disable_web_page_preview: true,
    });
    return;
  }

  await sendOrEdit(ctx.telegram, chatId, messageId, channelSubmittedAdminNotifyFailedText(), {
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
    let prompt = publicChannelPromptText();
    if (draft.channel_type === "private") prompt = PRIVATE_CHANNEL_RULE_TEXT;
    if (draft.channel_type === "bot") prompt = botChannelPromptText();
    
    await sendOrEdit(
      ctx.telegram,
      chatId,
      messageId,
      prompt,
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

function botChannelPromptText(): string {
  return [
    "🤖 Telegram Bot",
    "",
    "Send your bot username or link.",
    "",
    "@examplebot",
    "https://t.me/examplebot",
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

function normalizeBotUsername(value: string): string | null {
  const norm = normalizePublicIdentifier(value);
  if (norm && norm.toLowerCase().endsWith("bot")) {
    return norm;
  }
  return null;
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

function invalidBotText(): string {
  return [
    "❌ Invalid bot username.",
    "",
    "Must end with 'bot'.",
    "Example: @examplebot",
  ].join("\n");
}
