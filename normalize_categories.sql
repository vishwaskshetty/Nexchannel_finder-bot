-- First, insert all 19 correct categories into the categories table
INSERT OR REPLACE INTO categories (slug, name, sort_order) VALUES
  ('education', '📚 Education', 10),
  ('jobs', '💼 Jobs & Internships', 20),
  ('ai', '🤖 AI', 30),
  ('tech', '📱 Tech / Telegram', 40),
  ('news', '📰 News', 50),
  ('deals', '🛒 Deals', 60),
  ('sports', '🏏 Sports', 70),
  ('gaming', '🎮 Gaming', 80),
  ('creators', '🎨 Creators', 90),
  ('business', '🏢 Business', 100),
  ('earning', '💰 Earning', 110),
  ('movies', '🎬 Movies', 120),
  ('books', '📖 Books', 130),
  ('motivation', '💬 Motivation', 140),
  ('entertainment', '🎭 Entertainment', 150),
  ('music', '🎵 Music', 160),
  ('tools', '🧰 Tools', 170),
  ('apps', '📱 Apps', 180),
  ('other', '🌐 Other', 190);

-- Update channels categories to match the correct keys
UPDATE channels SET category='tech' WHERE category IN ('tech-telegram', 'telegram', 'technology', 'bots');
UPDATE channels SET category='ai' WHERE category IN ('ai-tools', 'artificial-intelligence', 'chatgpt', 'automation');
UPDATE channels SET category='jobs' WHERE category IN ('jobs-internships', 'internships', 'career', 'careers', 'government-jobs');
UPDATE channels SET category='deals' WHERE category IN ('deals-offers', 'offers', 'shop', 'shopping', 'marketing');
UPDATE channels SET category='movies' WHERE category IN ('movies-videos', 'movies & videos', 'movie', 'films', 'movies-entertainment');
UPDATE channels SET category='books' WHERE category IN ('books-magazine', 'books & magazine', 'literature');
UPDATE channels SET category='motivation' WHERE category IN ('self-development', 'quotes', 'motivational', 'self development');
UPDATE channels SET category='business' WHERE category IN ('business-startups', 'business & startups', 'startup', 'startups');
UPDATE channels SET category='tools' WHERE category IN ('utilities-tools', 'utilities & tools', 'utilities');
UPDATE channels SET category='creators' WHERE category IN ('art-design', 'art & design', 'editing', 'creator', 'content-creation', 'editing-creators');
UPDATE channels SET category='gaming' WHERE category IN ('games-apps', 'games & apps', 'telegram-miniapps-games', 'telegram miniapps & games');
UPDATE channels SET category='news' WHERE category IN ('news-media', 'news & media', 'current-affairs', 'current affairs');
UPDATE channels SET category='earning' WHERE category IN ('earning-freelance', 'economics-finance', 'economics & finance', 'freelance', 'remote-work', 'online-work');
UPDATE channels SET category='entertainment' WHERE category IN ('memes', 'jokes', 'fun', 'comedy');
UPDATE channels SET category='music' WHERE category IN ('songs', 'music-channel');
UPDATE channels SET category='apps' WHERE category IN ('mobile-apps', 'apps-tools');

-- Default any null, empty, or unrecognized channel categories to 'other'
UPDATE channels SET category='other' WHERE category IS NULL OR category='' OR category NOT IN (
  'education', 'jobs', 'ai', 'tech', 'news', 'deals', 'sports', 'gaming', 'creators', 'business',
  'earning', 'movies', 'books', 'motivation', 'entertainment', 'music', 'tools', 'apps', 'other'
);

-- Update submissions table categories to match the correct keys
UPDATE submissions SET category='tech' WHERE category IN ('tech-telegram', 'telegram', 'technology', 'bots');
UPDATE submissions SET category='ai' WHERE category IN ('ai-tools', 'artificial-intelligence', 'chatgpt', 'automation');
UPDATE submissions SET category='jobs' WHERE category IN ('jobs-internships', 'internships', 'career', 'careers', 'government-jobs');
UPDATE submissions SET category='deals' WHERE category IN ('deals-offers', 'offers', 'shop', 'shopping', 'marketing');
UPDATE submissions SET category='movies' WHERE category IN ('movies-videos', 'movies & videos', 'movie', 'films', 'movies-entertainment');
UPDATE submissions SET category='books' WHERE category IN ('books-magazine', 'books & magazine', 'literature');
UPDATE submissions SET category='motivation' WHERE category IN ('self-development', 'quotes', 'motivational', 'self development');
UPDATE submissions SET category='business' WHERE category IN ('business-startups', 'business & startups', 'startup', 'startups');
UPDATE submissions SET category='tools' WHERE category IN ('utilities-tools', 'utilities & tools', 'utilities');
UPDATE submissions SET category='creators' WHERE category IN ('art-design', 'art & design', 'editing', 'creator', 'content-creation', 'editing-creators');
UPDATE submissions SET category='gaming' WHERE category IN ('games-apps', 'games & apps', 'telegram-miniapps-games', 'telegram miniapps & games');
UPDATE submissions SET category='news' WHERE category IN ('news-media', 'news & media', 'current-affairs', 'current affairs');
UPDATE submissions SET category='earning' WHERE category IN ('earning-freelance', 'economics-finance', 'economics & finance', 'freelance', 'remote-work', 'online-work');
UPDATE submissions SET category='entertainment' WHERE category IN ('memes', 'jokes', 'fun', 'comedy');
UPDATE submissions SET category='music' WHERE category IN ('songs', 'music-channel');
UPDATE submissions SET category='apps' WHERE category IN ('mobile-apps', 'apps-tools');

UPDATE submissions SET category='other' WHERE category IS NULL OR category='' OR category NOT IN (
  'education', 'jobs', 'ai', 'tech', 'news', 'deals', 'sports', 'gaming', 'creators', 'business',
  'earning', 'movies', 'books', 'motivation', 'entertainment', 'music', 'tools', 'apps', 'other'
);

-- Clean up old unused categories from categories table
DELETE FROM categories WHERE slug IN (
  'movies-entertainment',
  'jobs-internships',
  'earning-freelance',
  'deals-offers',
  'ai-tools',
  'editing-creators',
  'tech-telegram'
);

-- Update language values to match bot language filters
UPDATE channels SET language='English' WHERE LOWER(language) IN ('english', 'en');
UPDATE channels SET language='Hindi' WHERE LOWER(language) IN ('hindi', 'hi', 'हिन्दी');
UPDATE channels SET language='Kannada' WHERE LOWER(language) IN ('kannada', 'kn');
UPDATE channels SET language='Tamil' WHERE LOWER(language) IN ('tamil', 'ta');
UPDATE channels SET language='Telugu' WHERE LOWER(language) IN ('telugu', 'te');
UPDATE channels SET language='Malayalam' WHERE LOWER(language) IN ('malayalam', 'ml');
UPDATE channels SET language='Marathi' WHERE LOWER(language) IN ('marathi', 'mr');
UPDATE channels SET language='Bengali' WHERE LOWER(language) IN ('bengali', 'bn');
UPDATE channels SET language='Gujarati' WHERE LOWER(language) IN ('gujarati', 'gu');
UPDATE channels SET language='Punjabi' WHERE LOWER(language) IN ('punjabi', 'pa');
UPDATE channels SET language='Urdu' WHERE LOWER(language) IN ('urdu', 'ur');
UPDATE channels SET language='Mixed' WHERE language IS NULL OR language='' OR LOWER(language)='mixed';

-- Handle remaining languages that don't match the bot's supported languages (except Other/Spanish/Arabic/etc which are already correct)
UPDATE channels SET language='Other' WHERE language NOT IN (
  'English', 'Hindi', 'Kannada', 'Tamil', 'Telugu', 'Malayalam', 'Marathi', 'Bengali', 'Gujarati', 'Punjabi', 'Urdu',
  'Spanish', 'Arabic', 'Russian', 'French', 'German', 'Portuguese', 'Indonesian', 'Turkish', 'Mixed', 'Other'
);

-- Approve imported channels
UPDATE channels
SET status='approved', updated_at=CURRENT_TIMESTAMP
WHERE status IN ('pending_import_review', 'pending');
