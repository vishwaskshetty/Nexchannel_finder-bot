import type { ChannelType } from "../types";

export function normalizeTelegramLink(input: string): {
  type: ChannelType;
  username: string;
  channel_link: string;
  invite_link: string;
  valid: boolean;
} {
  let cleaned = input.trim();
  
  const result = {
    type: "public" as ChannelType,
    username: "",
    channel_link: "",
    invite_link: "",
    valid: false
  };

  if (!cleaned) return result;

  // Extract from URLs
  if (cleaned.includes("t.me/") || cleaned.includes("telegram.me/")) {
    const parts = cleaned.split("t.me/");
    const path = parts.length > 1 ? parts[1] : cleaned.split("telegram.me/")[1];
    if (path) {
      const idPart = path.split("?")[0].split("/")[0].trim();
      if (idPart.startsWith("+") || idPart === "joinchat") {
        result.type = "private";
        result.invite_link = `https://t.me/${path.split("?")[0]}`;
        result.valid = true;
      } else {
        result.type = "public";
        result.username = `@${idPart}`;
        result.channel_link = `https://t.me/${idPart}`;
        result.valid = true;
      }
    }
  } else if (cleaned.startsWith("@")) {
    result.type = "public";
    result.username = cleaned;
    result.channel_link = `https://t.me/${cleaned.substring(1)}`;
    result.valid = true;
  }

  // Detect bots
  if (result.type === "public" && result.username.toLowerCase().endsWith("bot")) {
    result.type = "bot";
  }

  return result;
}

export function isUnsafeContent(title: string, description: string, url: string): boolean {
  const text = `${title} ${description} ${url}`.toLowerCase();
  
  const unsafeKeywords = [
    "adult", "18+", "porn", "nude", "sex", "dating", "gambling", "casino",
    "betting", "hack", "crack", "fake earning", "free money", "movie leak",
    "pirated", "leaked movie", "illegal", "drugs", "weapon", "scam"
  ];

  return unsafeKeywords.some(keyword => text.includes(keyword));
}

export async function fetchWebsite(url: string) {
  try {
    const headers = {
      "User-Agent": "Mozilla/5.0 (compatible; NexChannelFinderBot/1.0; +https://t.me/NexChannelFinderBot)",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "no-cache"
    };
    
    const res = await fetch(url, { headers });
    const text = await res.text();
    
    return {
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      html: text,
      finalUrl: res.url
    };
  } catch (error: any) {
    return {
      ok: false,
      status: 0,
      statusText: error.message || "Network Error",
      html: "",
      finalUrl: url
    };
  }
}

// Basic regex-based parser since we don't have DOMParser in Cloudflare Workers easily.
export function parseBestOfTelegram(html: string, defaultCategory: string, defaultLanguage: string) {
  const items: any[] = [];
  
  // They usually have elements with hrefs to telegram.
  // E.g. <a href="https://t.me/something"...>Title</a>
  const linkRegex = /href=["'](https?:\/\/(?:t\.me|telegram\.me)\/[^"']+)["'][^>]*>(.*?)<\/a>/gi;
  let match;
  
  while ((match = linkRegex.exec(html)) !== null) {
    const link = match[1];
    let title = match[2].replace(/<[^>]+>/g, '').trim();
    if (!title || title.toLowerCase() === 'join') continue;

    let category = defaultCategory;
    const lowerTitle = title.toLowerCase();
    if (/movie|film|cinema|netflix|series/.test(lowerTitle)) category = "Movies";
    else if (/music|song|audio|mp3/.test(lowerTitle)) category = "Music";
    else if (/book|pdf|novel|library/.test(lowerTitle)) category = "Books";
    else if (/crypto|bitcoin|trading|forex/.test(lowerTitle)) category = "Crypto";
    else if (/news|update|newspaper/.test(lowerTitle)) category = "News";

    items.push({
      title,
      link,
      category: category,
      language: defaultLanguage,
      description: "" // Hard to extract reliably without full DOM parsing
    });
  }
  
  // Deduplicate on exact link
  const uniqueItems = new Map();
  for (const item of items) {
    if (!uniqueItems.has(item.link)) {
      uniqueItems.set(item.link, item);
    }
  }
  return Array.from(uniqueItems.values());
}

export function parseKannadaGroups(html: string, defaultCategory: string, defaultLanguage: string) {
  const items: any[] = [];
  
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let match;
  
  while ((match = rowRegex.exec(html)) !== null) {
    const row = match[1];
    const linkMatch = /href=["'](https?:\/\/(?:t\.me|telegram\.me)\/[^"']+)["']/i.exec(row);
    if (!linkMatch) continue;
    
    const link = linkMatch[1];
    const tds = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
    if (!tds || tds.length < 2) continue;
    
    let title = tds[0].replace(/<[^>]+>/g, '').trim();
    let subscribers = tds.length > 1 ? tds[1].replace(/<[^>]+>/g, '').trim() : '';
    
    if (!title) continue;

    // Detect specific sub-categories based on title
    let category = defaultCategory;
    const lowerTitle = title.toLowerCase();
    if (/jobs|kpsc|ksp|police|exam|coaching|academy|study|classes|teacher|quiz|gk|ias|kas/.test(lowerTitle)) {
      category = 'Education or Jobs';
    } else if (/news|updates|orders/.test(lowerTitle)) {
      category = 'News';
    } else if (/matrimony|vadhu|varara/.test(lowerTitle)) {
      category = 'Community';
    }

    items.push({
      title,
      link,
      category,
      language: defaultLanguage,
      subscribers,
      description: ""
    });
  }
  
  if (items.length === 0) {
    const fallbackRegex = /href=["'](https?:\/\/(?:t\.me|telegram\.me)\/[^"']+)["'][^>]*>(.*?)<\/a>/gi;
    let fm;
    while ((fm = fallbackRegex.exec(html)) !== null) {
      const link = fm[1];
      let title = fm[2].replace(/<[^>]+>/g, '').trim();
      if (!title || title.toLowerCase() === 'join') continue;

      items.push({
        title,
        link,
        category: defaultCategory,
        language: defaultLanguage,
        subscribers: "",
        description: ""
      });
    }
  }

  const uniqueItems = new Map();
  for (const item of items) {
    if (!uniqueItems.has(item.link)) {
      uniqueItems.set(item.link, item);
    }
  }
  return Array.from(uniqueItems.values());
}
