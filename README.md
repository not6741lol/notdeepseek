# DeepBot — Discord Bot with 75 LLM Features (DeepSeek)

[![version](https://img.shields.io/badge/version-3.0.0-blue)](package.json)
[![Made with JavaScript](https://img.shields.io/badge/Made%20with-JavaScript-yellow?logo=javascript&logoColor=white)](https://developer.mozilla.org/docs/Web/JavaScript)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![license](https://img.shields.io/github/license/not6741lol/notdeepseek?color=blue)](LICENSE)

> [!NOTE]
> This project was made by **not6741** with the help of **DeepSeek**, written in **JavaScript**.
> It uses the **MIT license** and is **fully FOSS** (free and open-source software).

Hey! not6741 here, just wanted to say that all of this is ai generated and vibecoded, this is just a fun project i made for fun because idk i always wanted to build ai into discord but here is the code!

## 🚀 Quick Start

```bash
npm install
cp .env.example .env   # Edit with your token and API key
npm run deploy          # Register commands (one-time)
npm start
```

## 📋 Requirements
- Node.js 18+
- Discord Bot Token ([Discord Developer Portal](https://discord.com/developers/applications))
- DeepSeek API Key ([platform.deepseek.com](https://platform.deepseek.com/))

## ⚙️ Configuration

```env
DISCORD_TOKEN=your_token
DEEPSEEK_API_KEY=your_api_key
CLIENT_ID=your_app_id
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

## 🧠 75 LLM Features

### 💬 Chat & Conversation (7)
`/chat chat` · `/chat summarize` · `/chat explain` · `/chat rewrite` · `/chat tone` · `/chat suggest` · `/chat expand`

### ✍️ Content Generation (10)
`/generate essay` · `/generate story` · `/generate poem` · `/generate email` · `/generate blog` · `/generate headline` · `/generate slogan` · `/generate tweet` · `/generate caption` · `/generate letter`

### 💻 Code & Development (10)
`/code generate` · `/code explain` · `/code review` · `/code debug` · `/code refactor` · `/code docs` · `/code convert` · `/code find-bugs` · `/code optimize` · `/code test`

### 📊 Analysis (10)
`/analyze sentiment` · `/analyze keywords` · `/analyze entities` · `/analyze language` · `/analyze compare` · `/analyze diff` · `/analyze classify` · `/analyze extract-emails` · `/analyze extract-phones` · `/analyze extract-dates`

### 🎨 Creative (10)
`/creative names` · `/creative ideas` · `/creative usernames` · `/creative nicknames` · `/creative colors` · `/creative taglines` · `/creative fake-data` · `/creative roast` · `/creative compliment` · `/creative trivia`

### 📚 Learning (10)
`/learn define` · `/learn synonyms` · `/learn antonyms` · `/learn translate` · `/learn grammar` · `/learn etymology` · `/learn math` · `/learn history` · `/learn science` · `/learn quiz`

### 🔧 Utility (8)
`/utility format-json` · `/utility format-markdown` · `/utility format-csv` · `/utility minify` · `/utility escape` · `/utility unescape` · `/utility encode` · `/utility decode`

### 🎭 Special (10)
`/special roleplay` · `/special interview` · `/special debate` · `/special brainstorm` · `/special advice` · `/special adventure` · `/special persona` · `/special meditate` · `/special journal` · `/special coach`

## 📊 Dashboard

When the bot starts, a web dashboard is available at **http://localhost:3000**

- Real-time bot stats (servers, commands, tokens)
- Category usage chart
- API call history
- Live activity log

## 📁 Project Structure

```
├── index.js              # Entry point
├── config.js             # Configuration
├── commands/index.js     # 75 command handlers
├── utils/
│   ├── deepseek.js       # DeepSeek API client
│   ├── stats.js          # Stats tracker
│   └── i18n.js           # English strings
├── dashboard/
│   ├── server.js         # Express + Socket.IO server
│   └── public/
│       └── index.html    # Dashboard UI
├── scripts/
│   └── deploy-commands.js # Register 76 commands
└── .env                  # Your tokens
```

---

<sub>Made by **not**. More projects and build notes: **[not6741.lol](https://not6741.lol/)**</sub>
