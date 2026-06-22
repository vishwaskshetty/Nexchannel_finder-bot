# 🚀 NexChannel Finder Bot

<p align="center">
  <b>Discover • Submit • Rate • Save • Grow Telegram Channels</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Telegram-Bot-blue?style=for-the-badge&logo=telegram" />
  <img src="https://img.shields.io/badge/Cloudflare-Workers-orange?style=for-the-badge&logo=cloudflare" />
  <img src="https://img.shields.io/badge/TypeScript-Project-blue?style=for-the-badge&logo=typescript" />
  <img src="https://img.shields.io/badge/D1-Database-black?style=for-the-badge" />
</p>

---

## 📌 About

**NexChannel Finder Bot** is a modern Telegram channel discovery bot that helps users find useful Telegram channels by category, language, rating, clicks, and popularity.

Channel owners can submit their public or private channels for free promotion after admin approval.

---

## ✨ Main Features

* 🔎 Discover useful Telegram channels
* 📂 Browse channels by category
* 🌍 Browse channels by language
* 📢 Submit public and private channels
* ✅ Admin approval system
* 🛠 Admin review channel notifications
* ⭐ Rate channels from 1 to 5 stars
* 💾 Save favorite channels
* 🚨 Report unsafe channels
* 📊 My Channels dashboard
* 🏆 Weekly leaderboard support
* 🔐 Telegram force subscribe support
* ▶️ YouTube verification support
* 🔗 Clean Join Channel buttons

---

## 🧩 Categories Supported

| Category      | Description                       |
| ------------- | --------------------------------- |
| 📚 Education  | Study, exams, notes, learning     |
| 💼 Jobs       | Jobs, internships, career updates |
| 🤖 AI         | AI tools, prompts, automation     |
| 📱 Tech       | Telegram, bots, technology        |
| 📰 News       | News and current affairs          |
| 🛒 Deals      | Shopping deals and offers         |
| 🏏 Sports     | Cricket and sports updates        |
| 🎮 Gaming     | Gaming channels and updates       |
| 🎨 Creators   | Editing, design, creator tools    |
| 🏢 Business   | Startup and business channels     |
| 💰 Earning    | Freelance and remote work         |
| 🎬 Movies     | Movie news and entertainment      |
| 📖 Books      | Books and reading channels        |
| 💬 Motivation | Quotes and self-development       |
| 🎵 Music      | Songs and music channels          |
| 🧰 Tools      | Useful tools and utilities        |
| 📱 Apps       | Apps and mini apps                |
| 🌐 Other      | Other useful channels             |

---

## 🛠 Tech Stack

* **Cloudflare Workers**
* **TypeScript**
* **Telegram Bot API**
* **Cloudflare D1 Database**
* **Wrangler CLI**

---

## 🔐 Environment Variables

Keep these values safe. Do not upload secrets to GitHub.

```env
BOT_TOKEN=
WEBHOOK_SECRET=
ADMIN_IDS=
ADMIN_REVIEW_CHANNEL_ID=
FORCE_SUB_CHANNEL=
FORCE_SUB_LINK=
PUBLIC_POST_CHANNEL=
BOT_USERNAME=
YOUTUBE_CHANNEL_LINK=
```

---

## 🚀 Deploy

```bash
npx wrangler deploy
```

---

## 🗄 Database Setup

Run SQL schema on Cloudflare D1:

```bash
npx wrangler d1 execute nexchannel_finder_db --remote --file=./schema.sql
```

---

## 🧪 Useful Commands

```bash
npx wrangler deploy
npx wrangler tail
npx wrangler d1 execute nexchannel_finder_db --remote --command "PRAGMA table_info(channels);"
```

---

## 🤖 Bot Admin Features

* View pending submissions
* Approve or reject channels
* Hide reported channels
* Verify trusted channels
* Review YouTube subscription proof
* Import public/private channels
* Manage categories and languages

---

## 📢 Channel Submission Flow

1. User clicks **Submit Channel**
2. Chooses public or private channel
3. Sends channel link
4. Selects category and language
5. Sends description and tags
6. Sends admin username
7. Admin reviews submission
8. Approved channel appears in bot listings

---

## ⚠️ Safety Rules

The bot should not allow:

* Adult or NSFW content
* Scam earning channels
* Betting, satta, lottery, casino
* Crypto or forex signal channels
* Exam paper leak channels
* Piracy or illegal download channels
* Broken or fake channel links

---

## 📌 Project Status

✅ Active development
✅ Cloudflare Workers supported
✅ D1 database connected
✅ Telegram webhook supported
✅ Admin approval system supported

---

## 👨‍💻 Author

Built by **Vishwas Shetty**

---

<p align="center">
  <b>⭐ NexChannel Finder Bot — Find Better Telegram Channels Faster</b>
</p>
﻿# Nexchannel_finder-bot
