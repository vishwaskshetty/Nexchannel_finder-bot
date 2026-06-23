import type { TelegramClient } from "./telegram";

export interface Env {
  DB: D1Database;
  BOT_TOKEN: string;
  ADMIN_ID?: string;
  ADMIN_IDS?: string;
  ADMIN_REVIEW_CHANNEL_ID?: string;
  FORCE_SUB_CHANNEL?: string;
  FORCE_SUB_LINK?: string;
  WEBHOOK_SECRET?: string;
  PUBLIC_POST_CHANNEL?: string;
  BOT_USERNAME?: string;
  YOUTUBE_CHANNEL_LINK?: string;
  // Banner file IDs (can be set in wrangler.toml or via /setbanner command)
  WELCOME_BANNER_FILE_ID?: string;
  CATEGORIES_BANNER_FILE_ID?: string;
  TOP_CHANNELS_BANNER_FILE_ID?: string;
  ADD_CHANNEL_BANNER_FILE_ID?: string;
  LEADERBOARD_BANNER_FILE_ID?: string;
  BOTS_BANNER_FILE_ID?: string;
}

export type ChatId = number | string;

export interface TelegramUser {
  id: number;
  is_bot?: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramChat {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface TelegramPhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date?: number;
  text?: string;
  photo?: TelegramPhotoSize[];
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export interface TelegramInlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface TelegramInlineKeyboardMarkup {
  inline_keyboard: TelegramInlineKeyboardButton[][];
}

export interface TelegramApiResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

export interface TelegramChatMember {
  status: "creator" | "administrator" | "member" | "restricted" | "left" | "kicked";
  is_member?: boolean;
  can_post_messages?: boolean;
}

export interface BotContext {
  env: Env;
  telegram: TelegramClient;
  adminIds: Set<number>;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  sort_order: number;
  created_at: string;
}

export type ChannelStatus = "pending" | "approved" | "rejected" | "hidden";
export type ChannelType = "public" | "private";
export type VerificationStatus = "pending" | "verified" | "failed" | "manual_review";

export interface Channel {
  id: number;
  category_id?: number | null;
  category_name?: string | null;
  category_slug?: string | null;
  title: string;
  username?: string | null;
  link?: string | null;
  description: string | null;
  tags: string | null;
  status: ChannelStatus;
  clicks?: number | null;
  reports_count?: number | null;
  owner_telegram_id?: number | null;
  channel_type?: ChannelType;
  channel_username?: string | null;
  channel_link?: string | null;
  invite_link?: string | null;
  category?: string;
  language?: string;
  admin_username?: string | null;
  featured?: number | boolean;
  verified?: number | boolean;
  owner_verified?: number | boolean;
  verification_code?: string | null;
  verification_status?: VerificationStatus | null;
  verification_created_at?: string | null;
  join_clicks?: number;
  reports?: number;
  rating_total?: number;
  rating_count?: number;
  rating_average?: number;
  trending_score?: number;
  weekly_clicks?: number;
  weekly_rating_average?: number;
  weekly_rating_count?: number;
  weekly_score?: number;
  source_name?: string;
  source_url?: string;
  source_rank?: number;
  subscribers_text?: string;
  import_batch_id?: string;
  last_imported_at?: string;
  is_public_listing?: number | boolean;
  created_at: string;
  updated_at: string;
}

export interface ChannelImportBatch {
  id: string;
  source_name: string;
  source_url: string;
  imported_by: number;
  total_found: number;
  total_imported: number;
  total_skipped: number;
  status: string;
  created_at: string;
}

export interface ChannelImportSkip {
  id: number;
  batch_id: string;
  title: string;
  username: string;
  external_category: string;
  reason: string;
  created_at: string;
}

export interface Submission {
  id: number;
  user_id: number;
  category_slug: string;
  title: string;
  username: string | null;
  link: string | null;
  channel_type: ChannelType;
  language?: string | null;
  tags?: string | null;
  description: string | null;
  admin_username: string | null;
  owner_verified?: number | boolean;
  verification_code?: string | null;
  verification_status?: VerificationStatus | null;
  status: ChannelStatus;
  reviewed_by: number | null;
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export interface SubmissionDraft {
  telegram_id: number;
  step: string;
  channel_type: ChannelType | null;
  channel_username: string | null;
  channel_link?: string | null;
  invite_link?: string | null;
  category: string | null;
  language: string | null;
  description: string | null;
  tags: string | null;
  admin_username: string | null;
  updated_at: string;
}

export interface Report {
  id: number;
  user_id: number | null;
  channel_id: number | null;
  reason: string;
  status: "open" | "resolved";
  created_at: string;
  resolved_at: string | null;
}

export interface SubmitChannelInput {
  userId: number;
  categorySlug: string;
  channelIdentifier: string;
  channelUsername?: string;
  channelLink?: string;
  inviteLink?: string;
  channelType: ChannelType;
  language: string;
  description: string;
  tags: string;
  adminUsername: string;
}

export interface OwnershipVerification {
  id: number;
  telegram_id: number;
  channel_id: number;
  verification_code: string;
  status: VerificationStatus;
  method: string;
  created_at: string;
  verified_at: string | null;
}

export interface AdminStats {
  totalUsers: number;
  totalChannels: number;
  pendingChannels: number;
  approvedChannels: number;
  hiddenChannels: number;
  verifiedChannels: number;
  totalSaved: number;
  totalRatings: number;
  totalClicks: number;
  totalReports: number;
}

export type AdminStateMode =
  | "broadcast_wait"
  | "broadcast_confirm"
  | "search_wait"
  | "import_paste_wait"
  | "import_csv_wait"
  | "add_public_wait"
  | "add_private_wait"
  | "banner_wait";

export interface AdminState {
  telegram_id: number;
  mode: AdminStateMode;
  payload: string | null;
  updated_at: string;
}

export type OwnerStateMode = "edit_description" | "edit_tags";

export interface OwnerState {
  telegram_id: number;
  channel_id: number;
  mode: OwnerStateMode;
  updated_at: string;
}

export type SearchSort = "trending" | "rating" | "clicks" | "newest";

export interface SearchState {
  telegram_id: number;
  query: string;
  sort: SearchSort;
  language: string | null;
  verified_only: number;
  updated_at: string;
}

export interface ChannelSearchOptions {
  query: string;
  sort: SearchSort;
  language?: string | null;
  verifiedOnly?: boolean;
  limit: number;
  offset: number;
}

export type YoutubeVerificationStatus =
  | "not_started"
  | "clicked"
  | "pending_photo"
  | "pending"
  | "approved"
  | "rejected";

export interface YoutubeVerification {
  telegram_id: number;
  status: YoutubeVerificationStatus;
  proof_file_id: string | null;
  clicked_at: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  updated_at: string;
}
