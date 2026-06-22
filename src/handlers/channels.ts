import { getChannel, incrementChannelClicks, isChannelSaved } from "../db";
import { sendOrEdit } from "../telegram";
import type { BotContext } from "../types";
import {
  backToMenuKeyboard,
  channelActionKeyboard,
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
        // Non-fatal: continue showing channel details even if click tracking fails
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
