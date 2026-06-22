const SLUG_BY_KEY = {
  movies: "movies-entertainment",
  jobs: "jobs-internships",
  education: "education",
  earning: "earning-freelance",
  deals: "deals-offers",
  news: "news",
  ai: "ai-tools",
  gaming: "gaming",
  sports: "sports",
  creators: "editing-creators",
  business: "business",
  tech: "tech-telegram",
} as const;

export type CategoryKey = keyof typeof SLUG_BY_KEY;

export function categorySlugFromKey(key: string): string | null {
  return SLUG_BY_KEY[key as CategoryKey] ?? null;
}

export function categoryKeyFromSlug(slug: string): CategoryKey | null {
  for (const [key, value] of Object.entries(SLUG_BY_KEY)) {
    if (value === slug) {
      return key as CategoryKey;
    }
  }
  return null;
}
