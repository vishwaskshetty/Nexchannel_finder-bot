-- More channels for NexChannel Finder Bot
-- Safe categories only. Replace demo/private links with real working Telegram links.
-- Public channels use channel_username + channel_link.
-- Private channels use invite_link only. Do not show invite links in public text.

INSERT OR IGNORE INTO channels (
owner_telegram_id,
channel_type,
channel_username,
channel_link,
invite_link,
title,
description,
category,
language,
tags,
status,
featured,
verified,
join_clicks,
reports,
rating_total,
rating_count,
rating_average,
trending_score,
created_at,
updated_at
) VALUES

-- 🤖 AI TOOLS
(6059191947, 'public', '@Best_AI_tools', 'https://t.me/Best_AI_tools', NULL, 'Best AI Tools', 'AI tools, prompts, automation and productivity resources.', 'ai', 'English', 'ai,tools,prompts,automation,productivity', 'approved', 1, 0, 0, 0, 0, 0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6059191947, 'public', '@AiIndiaJobs', 'https://t.me/AiIndiaJobs', NULL, 'AI India Jobs', 'AI, Python, data science and automation job updates.', 'jobs', 'English', 'ai,jobs,python,data science,india', 'approved', 1, 0, 0, 0, 0, 0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- 📚 EDUCATION
(6059191947, 'public', '@ksgindia', 'https://t.me/ksgindia', NULL, 'KSG India', 'UPSC, current affairs and education updates.', 'education', 'English', 'education,upsc,current affairs,students', 'approved', 1, 0, 0, 0, 0, 0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6059191947, 'public', '@education_updates_india', 'https://t.me/education_updates_india', NULL, 'Education Updates India', 'Student updates, exams, results and education news.', 'education', 'English / Hindi', 'education,students,exam,results', 'approved', 1, 0, 0, 0, 0, 0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6059191947, 'public', '@study_material_hub', 'https://t.me/study_material_hub', NULL, 'Study Material Hub', 'Study resources, notes and learning updates.', 'education', 'English', 'study,notes,learning,students', 'approved', 1, 0, 0, 0, 0, 0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- 💼 JOBS
(6059191947, 'public', '@jobs_and_internships_updates', 'https://t.me/jobs_and_internships_updates', NULL, 'Jobs and Internships Updates', 'Jobs, internships, fresher hiring and career updates.', 'jobs', 'English', 'jobs,internships,freshers,hiring', 'approved', 1, 0, 0, 0, 0, 0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6059191947, 'public', '@freshers_jobs_india', 'https://t.me/freshers_jobs_india', NULL, 'Freshers Jobs India', 'Freshers jobs, walk-ins and hiring alerts.', 'jobs', 'English / Hindi', 'freshers,jobs,hiring,career', 'approved', 1, 0, 0, 0, 0, 0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6059191947, 'public', '@internship_alerts', 'https://t.me/internship_alerts', NULL, 'Internship Alerts', 'Internship updates for students and freshers.', 'jobs', 'English', 'internship,students,freshers,career', 'approved', 1, 0, 0, 0, 0, 0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- 🛒 DEALS
(6059191947, 'public', '@Loot_Dealsx', 'https://t.me/Loot_Dealsx', NULL, 'Loot Deals', 'Shopping deals, coupons and price-drop alerts.', 'deals', 'English / Hindi', 'deals,offers,coupons,shopping', 'approved', 1, 0, 0, 0, 0, 0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6059191947, 'public', '@realshoppingdeals', 'https://t.me/realshoppingdeals', NULL, 'Real Shopping Deals', 'Online shopping deals and discount alerts.', 'deals', 'English / Hindi', 'shopping,deals,offers,discounts', 'approved', 1, 0, 0, 0, 0, 0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6059191947, 'public', '@dealdost', 'https://t.me/dealdost', NULL, 'Deal Dost', 'Real-time deal alerts and online offers.', 'deals', 'English / Hindi', 'deals,shopping,price drop,offers', 'approved', 1, 0, 0, 0, 0, 0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- 🏏 SPORTS
(6059191947, 'public', '@indian_cricket', 'https://t.me/indian_cricket', NULL, 'Indian Cricket', 'Cricket news, match updates and fan posts.', 'sports', 'English / Malayalam', 'cricket,sports,india,match updates', 'approved', 1, 0, 0, 0, 0, 0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6059191947, 'public', '@cricketkidiwaniTG', 'https://t.me/cricketkidiwaniTG', NULL, 'Cricket Ki Diwani', 'Cricket updates, fan content and sports posts.', 'sports', 'Hindi', 'cricket,sports,hindi,fan', 'approved', 1, 0, 0, 0, 0, 0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6059191947, 'public', '@sports_updates_daily', 'https://t.me/sports_updates_daily', NULL, 'Sports Updates Daily', 'Sports updates, scores and match highlights.', 'sports', 'English', 'sports,score,updates,match', 'approved', 1, 0, 0, 0, 0, 0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- 🎮 GAMING
(6059191947, 'public', '@gamingdiscovery', 'https://t.me/gamingdiscovery', NULL, 'Gaming Discovery', 'Gaming news, updates and game discovery.', 'gaming', 'English / Hindi', 'gaming,games,updates,news', 'approved', 1, 0, 0, 0, 0, 0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6059191947, 'public', '@cinderellagaming321', 'https://t.me/cinderellagaming321', NULL, 'Cinderella Gaming', 'Gaming updates and creator content.', 'gaming', 'Hindi', 'gaming,creator,hindi,updates', 'approved', 1, 0, 0, 0, 0, 0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6059191947, 'public', '@mobile_gaming_updates', 'https://t.me/mobile_gaming_updates', NULL, 'Mobile Gaming Updates', 'Mobile game news, updates and gaming content.', 'gaming', 'English', 'mobile gaming,games,updates', 'approved', 1, 0, 0, 0, 0, 0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- 🎨 EDITING / CREATORS
(6059191947, 'public', '@ezedit', 'https://t.me/ezedit', NULL, 'EZ Edit', 'Editing resources, presets and creator tools.', 'creators', 'English', 'editing,presets,creator,video', 'approved', 1, 0, 0, 0, 0, 0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6059191947, 'public', '@tipseditor_official', 'https://t.me/tipseditor_official', NULL, 'Tips Editor Official', 'Editing tips, AI prompts and creator resources.', 'creators', 'Hindi / English', 'editing,tips,ai prompts,creator', 'approved', 1, 0, 0, 0, 0, 0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6059191947, 'public', '@tamizhantechofficial', 'https://t.me/tamizhantechofficial', NULL, 'Tamizhan Tech Official', 'Video editing tutorials, VN presets and creator tips.', 'creators', 'Tamil', 'editing,tamil,vn presets,creator', 'approved', 1, 0, 0, 0, 0, 0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6059191947, 'public', '@creator_tools_hub', 'https://t.me/creator_tools_hub', NULL, 'Creator Tools Hub', 'Creator tools, editing apps, resources and templates.', 'creators', 'English', 'creator,editing,tools,templates', 'approved', 1, 0, 0, 0, 0, 0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- 📱 TECH / TELEGRAM
(6059191947, 'public', '@telegram', 'https://t.me/telegram', NULL, 'Telegram', 'Official Telegram updates and product news.', 'tech', 'English', 'telegram,official,updates,news', 'approved', 1, 1, 0, 0, 0, 0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6059191947, 'public', '@botnews', 'https://t.me/botnews', NULL, 'Telegram Bot News', 'Official Telegram Bot API updates and bot platform news.', 'tech', 'English', 'telegram,bots,api,official', 'approved', 1, 1, 0, 0, 0, 0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6059191947, 'public', '@durov', 'https://t.me/durov', NULL, 'Durov', 'Updates and posts from Telegram founder Pavel Durov.', 'tech', 'English', 'telegram,durov,founder,updates', 'approved', 1, 1, 0, 0, 0, 0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6059191947, 'public', '@telegram_tips_hub', 'https://t.me/telegram_tips_hub', NULL, 'Telegram Tips Hub', 'Telegram tips, bot ideas and app updates.', 'tech', 'English', 'telegram,tips,bots,tech', 'approved', 1, 0, 0, 0, 0, 0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- 📰 NEWS
(6059191947, 'public', '@daily_news_updates_india', 'https://t.me/daily_news_updates_india', NULL, 'Daily News Updates India', 'Daily news updates and current affairs.', 'news', 'English / Hindi', 'news,current affairs,india,updates', 'approved', 1, 0, 0, 0, 0, 0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6059191947, 'public', '@tech_news_daily', 'https://t.me/tech_news_daily', NULL, 'Tech News Daily', 'Technology news, startup updates and digital trends.', 'news', 'English', 'tech news,startups,digital,updates', 'approved', 1, 0, 0, 0, 0, 0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- 🏢 BUSINESS
(6059191947, 'public', '@business_growth_tips', 'https://t.me/business_growth_tips', NULL, 'Business Growth Tips', 'Business ideas, startup tips and growth content.', 'business', 'English', 'business,startup,growth,marketing', 'approved', 1, 0, 0, 0, 0, 0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6059191947, 'public', '@startup_ideas_daily', 'https://t.me/startup_ideas_daily', NULL, 'Startup Ideas Daily', 'Startup ideas, product ideas and business tips.', 'business', 'English', 'startup,ideas,business,product', 'approved', 1, 0, 0, 0, 0, 0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- 💰 EARNING / FREELANCE
(6059191947, 'public', '@freelance_tips_hub', 'https://t.me/freelance_tips_hub', NULL, 'Freelance Tips Hub', 'Freelancing tips, online work guidance and creator earning tips.', 'earning', 'English', 'freelance,online work,earning,tips', 'approved', 1, 0, 0, 0, 0, 0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6059191947, 'public', '@remote_work_updates', 'https://t.me/remote_work_updates', NULL, 'Remote Work Updates', 'Remote jobs, freelance updates and online work opportunities.', 'earning', 'English', 'remote work,freelance,jobs,earning', 'approved', 1, 0, 0, 0, 0, 0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- 🔐 PRIVATE CHANNELS
-- Replace these private invite links with your real auto-join invite links.
-- Do not use request-to-join links.

(6059191947, 'private', NULL, NULL, 'https://t.me/+REPLACE_PRIVATE_STUDY_LINK', 'Private Study Hub', 'Private education channel for notes and study updates.', 'education', 'English', 'private,study,education,notes', 'approved', 1, 0, 0, 0, 0, 0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

(6059191947, 'private', NULL, NULL, 'https://t.me/+REPLACE_PRIVATE_AI_LINK', 'Private AI Tools Hub', 'Private AI tools, prompts and automation resources.', 'ai', 'English', 'private,ai,tools,prompts', 'approved', 1, 0, 0, 0, 0, 0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

(6059191947, 'private', NULL, NULL, 'https://t.me/+REPLACE_PRIVATE_JOBS_LINK', 'Private Job Alerts Hub', 'Private jobs and internship update channel.', 'jobs', 'English / Hindi', 'private,jobs,internships,hiring', 'approved', 1, 0, 0, 0, 0, 0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

(6059191947, 'private', NULL, NULL, 'https://t.me/+REPLACE_PRIVATE_CREATORS_LINK', 'Private Creator Resources', 'Private creator tools, editing resources and templates.', 'creators', 'English', 'private,creator,editing,templates', 'approved', 1, 0, 0, 0, 0, 0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
