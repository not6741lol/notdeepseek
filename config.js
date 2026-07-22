import 'dotenv/config';

export default {
  discord: {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID || null,
    guildId: process.env.GUILD_ID || null,
  },
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    model: process.env.MODEL || 'deepseek-chat',
    maxTokens: parseInt(process.env.MAX_TOKENS || '2048'),
    temperature: parseFloat(process.env.TEMPERATURE || '0.7'),
  },
  bot: {
    maxHistory: parseInt(process.env.MAX_HISTORY || '50'),
    color: 0x7c5cfc,
  },
};
