const MAX_SAFE_TEXT_LENGTH = 900;

const BLOCKED_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: "piracy", pattern: /\b(piracy|pirated|torrent|movie\s*rip|leaked\s*movie)\b/i },
  { label: "adult content", pattern: /\b(adult|porn|porno|xxx|nsfw|sex)\b/i },
  { label: "gambling", pattern: /\b(gambling|casino|betting|sportsbook|satta)\b/i },
  { label: "scam", pattern: /\b(scam|fraud|fake\s*earning|guaranteed\s*income|double\s*money)\b/i },
  { label: "exam leaks", pattern: /\b(exam\s*leak|paper\s*leak|leaked\s*paper|answer\s*key\s*leak)\b/i },
  { label: "copyrighted PDFs", pattern: /\b(copyrighted\s*pdf|paid\s*pdf|pdf\s*leak|book\s*pdf\s*free)\b/i },
];

export function sanitizeUserText(value: string, maxLength = MAX_SAFE_TEXT_LENGTH): string {
  return value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, "")
    .trim()
    .slice(0, maxLength);
}

export function findBlockedContent(...values: Array<string | null | undefined>): string | null {
  const combined = values
    .filter((value): value is string => Boolean(value))
    .map((value) => sanitizeUserText(value))
    .join(" ");

  for (const item of BLOCKED_PATTERNS) {
    if (item.pattern.test(combined)) {
      return item.label;
    }
  }

  return null;
}

export function blockedContentText(reason: string): string {
  return [
    "❌ This channel cannot be submitted.",
    "",
    `Blocked content: ${reason}`,
    "",
    "NexChannel Finder does not allow piracy, adult content, gambling, scams, exam leaks, or copyrighted PDFs.",
  ].join("\n");
}
