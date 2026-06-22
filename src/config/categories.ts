export interface CategoryConfig {
  key: string;
  emoji: string;
  label: string;
  description: string;
  externalMappings: string[];
}

export const CATEGORIES: CategoryConfig[] = [
  {
    key: "education",
    emoji: "📚",
    label: "Education",
    description: "Educational channels and study materials.",
    externalMappings: ["Education", "Books & Magazine", "Science", "Competitive Exams", "Study", "UPSC", "SSC", "NEET", "JEE"],
  },
  {
    key: "jobs",
    emoji: "💼",
    label: "Jobs & Internships",
    description: "Career opportunities and internships.",
    externalMappings: ["Jobs", "Careers", "Internships", "Remote Jobs", "Government Jobs"],
  },
  {
    key: "ai",
    emoji: "🤖",
    label: "AI",
    description: "Artificial Intelligence and tools.",
    externalMappings: ["AI", "Artificial Intelligence", "ChatGPT", "AI Tools", "Automation"],
  },
  {
    key: "tech",
    emoji: "📱",
    label: "Tech / Telegram",
    description: "Technology news and Telegram bots.",
    externalMappings: ["Technology", "Telegram", "Bots", "Apps", "Utilities & Tools", "Tech"],
  },
  {
    key: "news",
    emoji: "📰",
    label: "News",
    description: "Current affairs and world news.",
    externalMappings: ["News & Media", "Current Affairs", "Politics", "Countries", "News"],
  },
  {
    key: "deals",
    emoji: "🛒",
    label: "Deals",
    description: "Shopping deals and offers.",
    externalMappings: ["Shop", "Deals", "Marketing", "Offers", "Coupons"],
  },
  {
    key: "sports",
    emoji: "🏏",
    label: "Sports",
    description: "Sports news and updates.",
    externalMappings: ["Sports", "Cricket", "Football"],
  },
  {
    key: "gaming",
    emoji: "🎮",
    label: "Gaming",
    description: "Games and gaming communities.",
    externalMappings: ["Games & Apps", "Gaming", "Telegram Miniapps & Games"],
  },
  {
    key: "creators",
    emoji: "🎨",
    label: "Creators",
    description: "Content creation and editing.",
    externalMappings: ["Art & Design", "Content Creation", "Editing", "YouTube", "Instagram", "Creator Tools"],
  },
  {
    key: "business",
    emoji: "🏢",
    label: "Business",
    description: "Startups and entrepreneurship.",
    externalMappings: ["Business & Startups", "Marketing", "Entrepreneurship", "Business"],
  },
  {
    key: "earning",
    emoji: "💰",
    label: "Earning",
    description: "Freelance and remote work.",
    externalMappings: ["Economics & Finance", "Freelance", "Online Work", "Remote Work"],
  },
  {
    key: "movies",
    emoji: "🎬",
    label: "Movies",
    description: "Movie news and entertainment.",
    externalMappings: ["Movies & Videos", "Entertainment", "Movies"],
  },
  {
    key: "books",
    emoji: "📖",
    label: "Books",
    description: "Literature and reading.",
    externalMappings: ["Books & Magazine", "Literature", "Reading", "Books"],
  },
  {
    key: "motivation",
    emoji: "💬",
    label: "Motivation",
    description: "Self development and quotes.",
    externalMappings: ["Self Development", "Motivation", "Quotes"],
  },
  {
    key: "entertainment",
    emoji: "🎭",
    label: "Entertainment",
    description: "Entertainment and fun.",
    externalMappings: ["Entertainment", "Memes", "Jokes"],
  },
  {
    key: "music",
    emoji: "🎵",
    label: "Music",
    description: "Music and songs.",
    externalMappings: ["Music", "Songs"],
  },
  {
    key: "tools",
    emoji: "🧰",
    label: "Tools",
    description: "Utilities and productivity.",
    externalMappings: ["Utilities & Tools", "Productivity", "Tools"],
  },
  {
    key: "apps",
    emoji: "📱",
    label: "Apps",
    description: "Mobile applications.",
    externalMappings: ["Games & Apps", "Mobile Apps", "Apps"],
  },
  {
    key: "other",
    emoji: "🌐",
    label: "Other",
    description: "Other categories.",
    externalMappings: ["Other", "General"],
  },
];

export function mapExternalCategory(externalStr: string): string {
  const lower = externalStr.toLowerCase().trim();
  for (const cat of CATEGORIES) {
    if (cat.externalMappings.some(m => {
      if (m.toLowerCase() === lower) return true;
      const regex = new RegExp(`\\b${m.toLowerCase()}\\b`);
      return regex.test(lower);
    })) {
      return cat.key;
    }
  }
  return "other";
}

export function getCategoryDetails(keyOrSlug: string): CategoryConfig | undefined {
  return CATEGORIES.find(c => c.key === keyOrSlug || c.label === keyOrSlug);
}

// Keep backward compatibility for old slugs mapped to new keys
const SLUG_BY_KEY: Record<string, string> = {
  movies: "movies",
  jobs: "jobs",
  education: "education",
  earning: "earning",
  deals: "deals",
  news: "news",
  ai: "ai",
  gaming: "gaming",
  sports: "sports",
  creators: "creators",
  business: "business",
  tech: "tech",
  books: "books",
  motivation: "motivation",
  entertainment: "entertainment",
  music: "music",
  tools: "tools",
  apps: "apps",
  other: "other",
  // Old Slugs
  "movies-entertainment": "movies",
  "jobs-internships": "jobs",
  "earning-freelance": "earning",
  "deals-offers": "deals",
  "ai-tools": "ai",
  "editing-creators": "creators",
  "tech-telegram": "tech",
};

export function categorySlugFromKey(key: string): string {
  return SLUG_BY_KEY[key] ?? key;
}

export function categoryKeyFromSlug(slug: string): string | null {
  for (const [key, value] of Object.entries(SLUG_BY_KEY)) {
    if (value === slug) return key;
  }
  // Try to find direct match
  const direct = CATEGORIES.find(c => c.key === slug);
  if (direct) return direct.key;
  return null;
}
