const BANNED_KEYWORDS = [
  "nsfw", "adult", "18+", "porn", "betting", "satta", "lottery",
  "casino", "gambling", "crypto signal", "forex signal", "binary trading",
  "exam leak", "paper leak", "movie download", "anime download",
  "pirated movie", "mod apk", "crack", "hack", "scam", "fake earning"
];

const BANNED_CATEGORIES = [
  "NSFW & Adults",
  "Betting",
  "Crypto & FX Trading",
  "Cryptocurrencies",
  "Gambling"
];

/**
 * Validates a channel against safety rules.
 * Returns { isSafe: boolean, reason?: string }
 */
export function checkChannelSafety(
  title: string,
  username: string,
  externalCategory: string,
  tags: string = "",
  description: string = ""
): { isSafe: boolean, reason?: string } {
  const searchStr = `${title} ${username} ${tags} ${description}`.toLowerCase();

  for (const keyword of BANNED_KEYWORDS) {
    if (searchStr.includes(keyword)) {
      return { isSafe: false, reason: `Contains banned keyword: ${keyword}` };
    }
  }

  for (const cat of BANNED_CATEGORIES) {
    if (externalCategory.toLowerCase() === cat.toLowerCase()) {
      return { isSafe: false, reason: `Banned external category: ${cat}` };
    }
  }

  return { isSafe: true };
}
