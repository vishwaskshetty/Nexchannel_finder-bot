import { listLeaderboardFallback, listWeeklyLeaderboard } from "../db";
import { TelegramClient, sendOrEdit } from "../telegram";
import type { BotContext, Channel, Env, TelegramMessage } from "../types";
import {
  LeaderboardSections,
  formatWeeklyLeaderboard,
  leaderboardKeyboard,
  leaderboardText,
  weeklyLeaderboardPostKeyboard,
} from "../ui";
import { getBotSetting } from "../db";

export async function handleLeaderboard(
  ctx: BotContext,
  chatId: number,
  messageId?: number,
  message?: TelegramMessage,
): Promise<void> {
  const sections = await getLeaderboardSections(ctx.env);
  const buttons = [
    ...sections.top,
    ...sections.rated,
    ...sections.clicked,
    ...sections.newChannels,
  ];

  const { editOrSendPage } = await import("./banners");
  await editOrSendPage(
    ctx,
    chatId,
    messageId,
    message,
    leaderboardText(sections),
    leaderboardKeyboard(buttons),
    "leaderboard",
  );
}

export type LeaderboardPostResult =
  | { status: "posted" }
  | { status: "empty" }
  | { status: "error"; description: string };

export async function postWeeklyLeaderboard(env: Env): Promise<LeaderboardPostResult> {
  const telegram = new TelegramClient(env.BOT_TOKEN);
  const channel = publicPostChannel(env);
  const channels = await getPostChannels(env);

  if (channels.length === 0) {
    return { status: "empty" };
  }

  const { sendBannerPost } = await import("./banners");
  await sendBannerPost(
    channel,
    env,
    "leaderboard",
    formatWeeklyLeaderboard(channels),
    weeklyLeaderboardPostKeyboard(env.BOT_USERNAME)
  );



  return { status: "posted" };
}

export function publicPostChannel(env: Env): string {
  return env.PUBLIC_POST_CHANNEL?.trim() ?? "";
}

async function resolveLeaderboardBannerFileId(env: Env): Promise<string | null> {
  // Check D1 first
  const dbValue = await getBotSetting(env, "LEADERBOARD_BANNER_FILE_ID");
  if (dbValue?.trim()) {
    return dbValue.trim();
  }
  // Fallback to env var
  const envValue = env.LEADERBOARD_BANNER_FILE_ID;
  if (envValue?.trim()) {
    return envValue.trim();
  }
  return null;
}

async function getLeaderboardSections(env: Env): Promise<LeaderboardSections> {
  const top = await listWeeklyLeaderboard(env, 3, "score");

  if (!hasWeeklyData(top)) {
    const fallback = await listLeaderboardFallback(env, 3);
    return {
      top: fallback,
      rated: [],
      clicked: [],
      newChannels: [],
      fallback: fallback.length > 0,
    };
  }

  const [rated, clicked, newChannels] = await Promise.all([
    listWeeklyLeaderboard(env, 3, "rating"),
    listWeeklyLeaderboard(env, 3, "clicks"),
    listWeeklyLeaderboard(env, 3, "new"),
  ]);

  return {
    top,
    rated,
    clicked,
    newChannels,
    fallback: false,
  };
}

async function getPostChannels(env: Env): Promise<Channel[]> {
  const weekly = await listWeeklyLeaderboard(env, 3, "score");
  if (hasWeeklyData(weekly)) {
    return weekly;
  }

  return listLeaderboardFallback(env, 3);
}

function hasWeeklyData(channels: Channel[]): boolean {
  return channels.some((channel) => (channel.weekly_clicks ?? 0) > 0 || (channel.weekly_rating_count ?? 0) > 0);
}
