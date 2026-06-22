import { listLeaderboardFallback, listWeeklyLeaderboard } from "../db";
import { TelegramClient, sendOrEdit } from "../telegram";
import type { BotContext, Channel, Env } from "../types";
import {
  LeaderboardSections,
  formatWeeklyLeaderboard,
  leaderboardKeyboard,
  leaderboardText,
  weeklyLeaderboardPostKeyboard,
} from "../ui";

export async function handleLeaderboard(
  ctx: BotContext,
  chatId: number,
  messageId?: number,
): Promise<void> {
  const sections = await getLeaderboardSections(ctx.env);
  const buttons = [
    ...sections.top,
    ...sections.rated,
    ...sections.clicked,
    ...sections.newChannels,
  ];

  await sendOrEdit(ctx.telegram, chatId, messageId, leaderboardText(sections), {
    reply_markup: leaderboardKeyboard(buttons),
    disable_web_page_preview: true,
  });
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

  const data = await telegram.sendMessage(channel, formatWeeklyLeaderboard(channels), {
    reply_markup: weeklyLeaderboardPostKeyboard(env.BOT_USERNAME),
    disable_web_page_preview: true,
  });

  if (!data.ok) {
    console.error("Leaderboard post failed:", data);
    return {
      status: "error",
      description: data.description ?? "Unknown Telegram API error",
    };
  }

  return { status: "posted" };
}

export function publicPostChannel(env: Env): string {
  return env.PUBLIC_POST_CHANNEL?.trim() ?? "";
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
