import type {
  ChatId,
  Env,
  TelegramApiResponse,
  TelegramChat,
  TelegramChatMember,
  TelegramInlineKeyboardMarkup,
  TelegramMessage,
  TelegramUser,
} from "./types";

export interface MessageOptions {
  reply_markup?: TelegramInlineKeyboardMarkup;
  disable_web_page_preview?: boolean;
  parse_mode?: "HTML" | "Markdown" | "MarkdownV2";
}

export class TelegramClient {
  private readonly answeredCallbackIds = new Set<string>();

  constructor(private readonly token: string) {}

  private endpoint(method: string): string {
    return `https://api.telegram.org/bot${this.token}/${method}`;
  }

  async call<T>(method: string, payload: Record<string, unknown>): Promise<TelegramApiResponse<T>> {
    try {
      const keyboardError = validateInlineKeyboard(payload.reply_markup);
      if (keyboardError) {
        const result = { ok: false, description: keyboardError } satisfies TelegramApiResponse<T>;
        console.error(`Telegram API ${method} blocked invalid keyboard:`, result);
        return result;
      }

      const response = await fetch(this.endpoint(method), {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const body = (await response.json()) as TelegramApiResponse<T>;
      if (!body.ok && !body.description) {
        body.description = `HTTP ${response.status}`;
      }
      if (!body.ok) {
        console.error(`Telegram API ${method} failed:`, body);
      }
      return body;
    } catch (error) {
      const description = error instanceof Error ? error.message : String(error);
      return { ok: false, description: `Network error: ${description}` };
    }
  }

  async sendMessage(
    chatId: ChatId,
    text: string,
    options: MessageOptions = {},
  ): Promise<TelegramApiResponse<TelegramMessage>> {
    const payload = {
      chat_id: String(chatId),
      text,
      ...options,
    };
    const response = await this.call<TelegramMessage>("sendMessage", payload);

    if (!response.ok && options.parse_mode && isFormattingError(response.description)) {
      console.error("Telegram formatting failed; retrying sendMessage without parse_mode:", {
        chatId: String(chatId),
        parseMode: options.parse_mode,
        description: response.description,
      });
      const { parse_mode: _parseMode, ...plainOptions } = options;
      return this.call<TelegramMessage>("sendMessage", {
        chat_id: String(chatId),
        text,
        ...plainOptions,
      });
    }

    return response;
  }

  async editMessageText(
    chatId: ChatId,
    messageId: number,
    text: string,
    options: MessageOptions = {},
  ): Promise<TelegramApiResponse<TelegramMessage | true>> {
    return this.call<TelegramMessage | true>("editMessageText", {
      chat_id: String(chatId),
      message_id: messageId,
      text,
      ...options,
    });
  }

  async answerCallbackQuery(
    callbackQueryId: string,
    text?: string,
    showAlert = false,
    url?: string,
  ): Promise<TelegramApiResponse<true>> {
    const response = await this.call<true>("answerCallbackQuery", {
      callback_query_id: callbackQueryId,
      text,
      show_alert: showAlert,
      url,
    });

    if (response.ok) {
      this.answeredCallbackIds.add(callbackQueryId);
    }
    return response;
  }

  hasAnsweredCallbackQuery(callbackQueryId: string): boolean {
    return this.answeredCallbackIds.has(callbackQueryId);
  }

  async ensureCallbackAnswered(callbackQueryId: string): Promise<void> {
    if (!this.hasAnsweredCallbackQuery(callbackQueryId)) {
      await this.answerCallbackQuery(callbackQueryId);
    }
  }

  async sendMessageToChannel(
    channel: string,
    text: string,
    options: MessageOptions = {},
  ): Promise<TelegramApiResponse<TelegramMessage>> {
    return this.sendMessage(channel, text, options);
  }

  async getChatMember(
    chatId: ChatId,
    userId: number,
  ): Promise<TelegramApiResponse<TelegramChatMember>> {
    return this.call<TelegramChatMember>("getChatMember", {
      chat_id: String(chatId),
      user_id: userId,
    });
  }

  getChat(chatId: ChatId): Promise<TelegramApiResponse<TelegramChat>> {
    return this.call<TelegramChat>("getChat", { chat_id: String(chatId) });
  }

  getMe(): Promise<TelegramApiResponse<TelegramUser>> {
    return this.call<TelegramUser>("getMe", {});
  }

  async sendPhoto(
    chatId: ChatId,
    photo: string,
    options: {
      caption?: string;
      reply_markup?: TelegramInlineKeyboardMarkup;
    } = {},
  ): Promise<TelegramApiResponse<TelegramMessage>> {
    return this.call<TelegramMessage>("sendPhoto", {
      chat_id: String(chatId),
      photo,
      ...options,
    });
  }
}

function isFormattingError(description?: string): boolean {
  const message = description?.toLowerCase() ?? "";
  return message.includes("can't parse entities") ||
    message.includes("cant parse entities") ||
    message.includes("unsupported start tag") ||
    message.includes("can't find end tag") ||
    message.includes("entity") && message.includes("offset");
}

function validateInlineKeyboard(value: unknown): string | null {
  if (value === undefined) {
    return null;
  }
  if (!value || typeof value !== "object" || !("inline_keyboard" in value)) {
    return "Invalid reply_markup: inline_keyboard is required.";
  }

  const rows = (value as TelegramInlineKeyboardMarkup).inline_keyboard;
  if (!Array.isArray(rows)) {
    return "Invalid reply_markup: inline_keyboard must be an array.";
  }

  for (const row of rows) {
    if (!Array.isArray(row) || row.length === 0) {
      return "Invalid reply_markup: keyboard rows cannot be empty.";
    }
    for (const button of row) {
      const callbackData = button.callback_data;
      const url = button.url;
      if ((callbackData ? 1 : 0) + (url ? 1 : 0) !== 1) {
        return `Invalid button "${button.text}": exactly one callback_data or url is required.`;
      }
      if (callbackData) {
        const byteLength = new TextEncoder().encode(callbackData).byteLength;
        if (byteLength < 1 || byteLength > 64) {
          return `Invalid button "${button.text}": callback_data must be 1-64 bytes.`;
        }
      }
    }
  }

  return null;
}

export async function sendOrEdit(
  telegram: TelegramClient,
  chatId: ChatId,
  messageId: number | undefined,
  text: string,
  options: MessageOptions = {},
): Promise<TelegramApiResponse<TelegramMessage | true>> {
  // Telegram can refuse edits when the original message is too old or unchanged.
  // Falling back to sendMessage keeps the bot friendly instead of failing silently.
  if (messageId) {
    const edited = await telegram.editMessageText(chatId, messageId, text, options);
    if (edited.ok) {
      return edited;
    }

    if (edited.description?.toLowerCase().includes("message is not modified")) {
      return { ok: true, result: true };
    }

    console.warn("Could not edit message, sending a new one instead.", edited);
  }

  const sent = await telegram.sendMessage(chatId, text, options);
  if (!sent.ok) {
    console.error("Telegram API sendMessage failed:", sent);
  }
  return sent;
}

export async function safeEditOrSend(
  chatId: ChatId,
  messageId: number | undefined,
  text: string,
  keyboard: TelegramInlineKeyboardMarkup | undefined,
  env: Env,
): Promise<TelegramApiResponse<TelegramMessage | true>> {
  return sendOrEdit(new TelegramClient(env.BOT_TOKEN), chatId, messageId, text, {
    reply_markup: keyboard,
  });
}

export function parseAdminIds(rawValue = ""): Set<number> {
  const ids = rawValue
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0);

  return new Set(ids);
}

export function readCommand(text: string): { name: string; args: string } | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("/")) {
    return null;
  }

  const [rawCommand] = trimmed.split(/\s+/, 1);
  const name = rawCommand.slice(1).split("@", 1)[0].toLowerCase();
  const args = trimmed.slice(rawCommand.length).trim();

  return { name, args };
}

export async function isUserSubscribed(
  env: Env,
  telegram: TelegramClient,
  userId: number,
): Promise<boolean> {
  const channel = getForceSubChannel(env);
  if (!channel) {
    return true;
  }

  return (await checkUserSubscription(env, telegram, userId)).subscribed;
}

export type SubscriptionCheck =
  | { subscribed: true }
  | { subscribed: false; error?: string };

export async function checkUserSubscription(
  env: Env,
  telegram: TelegramClient,
  userId: number,
): Promise<SubscriptionCheck> {
  const channel = getForceSubChannel(env);
  if (!channel) {
    return { subscribed: true };
  }

  const response = await telegram.getChatMember(channel, userId);
  if (!response.ok || !response.result) {
    const error = response.description ?? "Unknown Telegram API error";
    console.error("Force-subscription getChatMember failed:", {
      channel,
      userId,
      error,
    });
    return { subscribed: false, error };
  }

  return {
    subscribed: ["creator", "administrator", "member"].includes(response.result.status),
  };
}

export function getForceSubChannel(env: Env): string {
  return env.FORCE_SUB_CHANNEL?.trim() || "@Nex_bots";
}

export function getForceSubLink(env: Env): string {
  return env.FORCE_SUB_LINK?.trim() || "https://t.me/Nex_bots";
}

export function getAdminReviewChannelId(env: Env): string | null {
  const reviewChatId = env.ADMIN_REVIEW_CHANNEL_ID?.trim();
  return reviewChatId || null;
}

export async function sendAdminReviewNotification(
  env: Env,
  telegram: TelegramClient,
  text: string,
  keyboard?: TelegramInlineKeyboardMarkup,
): Promise<TelegramApiResponse<TelegramMessage>> {
  const reviewChatId = getAdminReviewChannelId(env);
  if (!reviewChatId) {
    const result = {
      ok: false as const,
      description: "ADMIN_REVIEW_CHANNEL_ID is not configured.",
    };
    console.error("Admin review notification failed:", result);
    return result;
  }

  console.log("Sending admin review to:", reviewChatId);
  console.log("Admin review channel id type:", typeof reviewChatId);

  const result = await telegram.sendMessage(reviewChatId, text, {
    ...(keyboard ? { reply_markup: keyboard } : {}),
    disable_web_page_preview: true,
  });

  if (!result.ok) {
    console.error("Admin review notification failed:", result);
  }

  return result;
}

export function canSendReviewChannelMessages(member: {
  status: string;
  can_post_messages?: boolean;
  can_send_messages?: boolean;
}): boolean {
  if (member.status === "creator") {
    return true;
  }

  if (member.status === "administrator") {
    return member.can_post_messages === true || member.can_send_messages === true;
  }

  return member.status === "member";
}

export function getYoutubeChannelLink(env: Env): string {
  return env.YOUTUBE_CHANNEL_LINK?.trim() ||
    "https://www.youtube.com/channel/UCjq-Zx6uTK1h8skXd8MoOHg?sub_confirmation=1";
}
