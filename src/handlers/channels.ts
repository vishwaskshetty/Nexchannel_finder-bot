import { getChannel, incrementChannelClicks, isChannelSaved, listSimilarChannels } from "../db";
import { sendOrEdit, safeEditOrSend } from "../telegram";
import { escapeHtml } from "../ui";
import type { BotContext } from "../types";
import {
  backToMenuKeyboard,
  channelActionKeyboard,
  channelResultsKeyboard,
  channelResultsText,
  formatChannelDetails,
  ratingKeyboard,
  ratingText,
} from "../ui";

export async function handleChannelDetails(
  ctx: BotContext,
  chatId: number,
  messageId: number | undefined,
  channelId: number,
  userId?: number,
  trackClick = false,
  backCallback = "home",
): Promise<void> {
  console.log("Channel action: open_channel_details");
  console.log("Channel ID:", channelId);

  try {
    const channel = await getChannel(ctx.env, channelId);

    if (!channel) {
      console.log("Channel not found:", channelId);
      await sendOrEdit(ctx.telegram, chatId, messageId, "❌ That channel is not available anymore.", {
        reply_markup: backToMenuKeyboard(),
        disable_web_page_preview: true,
      });
      return;
    }

    if (trackClick) {
      try {
        await incrementChannelClicks(ctx.env, channel.id, userId);
        console.log("Click tracked for channel:", channelId, "user:", userId);
      } catch (clickError) {
        console.error("Error tracking click for channel:", channelId, clickError);
      }
    }

    const saved = userId ? await isChannelSaved(ctx.env, userId, channel.id) : false;

    await sendOrEdit(ctx.telegram, chatId, messageId, formatChannelDetails(channel), {
      reply_markup: channelActionKeyboard(channel, { backCallback, homeCallback: "home", isSaved: saved }),
      disable_web_page_preview: true,
    });
  } catch (error) {
    console.error("Error in handleChannelDetails:", error);
    await sendOrEdit(ctx.telegram, chatId, messageId, "❌ Something went wrong. Please try again.", {
      reply_markup: backToMenuKeyboard(),
      disable_web_page_preview: true,
    });
  }
}

export async function handleRatingPrompt(
  ctx: BotContext,
  chatId: number,
  messageId: number | undefined,
  channelId: number,
): Promise<void> {
  console.log("Channel action: rate_prompt");
  console.log("Channel ID:", channelId);

  try {
    const channel = await getChannel(ctx.env, channelId);

    if (!channel) {
      console.log("Channel not found for rating:", channelId);
      await sendOrEdit(ctx.telegram, chatId, messageId, "❌ That channel is not available anymore.", {
        reply_markup: backToMenuKeyboard(),
        disable_web_page_preview: true,
      });
      return;
    }

    await sendOrEdit(ctx.telegram, chatId, messageId, ratingText(channel), {
      reply_markup: ratingKeyboard(channel.id),
      disable_web_page_preview: true,
    });
  } catch (error) {
    console.error("Error in handleRatingPrompt:", error);
    await sendOrEdit(ctx.telegram, chatId, messageId, "❌ Something went wrong. Please try again.", {
      reply_markup: backToMenuKeyboard(),
      disable_web_page_preview: true,
    });
  }
}

export async function handleSimilarChannels(
  ctx: BotContext,
  chatId: number,
  messageId: number | undefined,
  channelId: number,
): Promise<void> {
  console.log("Channel action: similar_channels", channelId);

  try {
    const channel = await getChannel(ctx.env, channelId);

    if (!channel) {
      await sendOrEdit(ctx.telegram, chatId, messageId, "❌ Channel not found.", {
        reply_markup: backToMenuKeyboard(),
        disable_web_page_preview: true,
      });
      return;
    }

    const category = channel.category ?? channel.category_slug ?? "other";
    const language = channel.language ?? "Mixed";

    const similar = await listSimilarChannels(ctx.env, channelId, category, language, 5);

    const title = similar.length > 0
      ? `🔎 Similar to "${channel.title}"`
      : `🔎 Similar Channels`;

    await sendOrEdit(
      ctx.telegram,
      chatId,
      messageId,
      channelResultsText(title, similar),
      {
        reply_markup: channelResultsKeyboard(similar, `channel:${channelId}`),
        disable_web_page_preview: true,
      },
    );
  } catch (error) {
    console.error("Error in handleSimilarChannels:", error);
    await sendOrEdit(ctx.telegram, chatId, messageId, "❌ Something went wrong. Please try again.", {
      reply_markup: backToMenuKeyboard(),
      disable_web_page_preview: true,
    });
  }
}

export async function handleOpenChannelPage(
  ctx: BotContext,
  chatId: number | string,
  messageId: number | undefined,
  channelId: number,
  userId: number
): Promise<void> {
  const { getChannel, safeIncrementChannelClick } = await import("../db");
  const channel = await getChannel(ctx.env, channelId);
  if (!channel) {
    const { safeEditOrSend } = await import("../telegram");
    await safeEditOrSend(ctx.telegram, chatId, messageId, "❌ Channel not found.");
    return;
  }

  await safeIncrementChannelClick(ctx.env, channelId, userId);

  const joinLink = channel.channel_link || channel.invite_link || (channel.channel_username ? `https://t.me/${channel.channel_username.replace(/^@/, '')}` : null);
  
  const text = [
    "<b>🔗 Open Link</b>",
    "",
    "Click below to open this listing:",
    `📢 <b>Channel:</b> ${escapeHtml(channel.title)}`,
    `🔗 <b>Link:</b> ${escapeHtml(joinLink || "N/A")}`
  ].join("\n");

  const buttons = [];
  if (joinLink) {
    let btnText = "🔗 Open Channel";
    if (channel.channel_type === "private") btnText = "🔗 Open Private Link";
    if (channel.channel_type === "bot") btnText = "🔗 Open Bot";
    buttons.push([{ text: btnText, url: joinLink }]);
  }

  buttons.push([
    { text: "⬅️ Back", callback_data: `channel:${channelId}` },
    { text: "🏠 Home", callback_data: "home" }
  ]);

  const { safeEditOrSend } = await import("../telegram");
  await safeEditOrSend(ctx.telegram, chatId, messageId, text, {
    reply_markup: { inline_keyboard: buttons },
    disable_web_page_preview: true
  });
}
