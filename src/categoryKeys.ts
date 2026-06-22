const SLUG_BY_KEY = {
  education: "education",
  jobs: "jobs",
  ai: "ai",
  tech: "tech",
  news: "news",
  deals: "deals",
  sports: "sports",
  gaming: "gaming",
  creators: "creators",
  business: "business",
  earning: "earning",
  movies: "movies",
  books: "books",
  motivation: "motivation",
  entertainment: "entertainment",
  music: "music",
  tools: "tools",
  apps: "apps",
  other: "other",
} as const;

export type CategoryKey = keyof typeof SLUG_BY_KEY;

export function categorySlugFromKey(key: string): string | null {
  return SLUG_BY_KEY[key as CategoryKey] ?? key;
}

export function categoryKeyFromSlug(slug: string): CategoryKey | null {
  for (const [key, value] of Object.entries(SLUG_BY_KEY)) {
    if (value === slug) {
      return key as CategoryKey;
    }
  }
  return slug as CategoryKey;
}
