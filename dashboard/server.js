import express from 'express';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { getStats, addLog, trackCommand, resetStats } from '../utils/stats.js';
import config from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.DASHBOARD_PORT || 3000;

export function startDashboard(botClient) {
  const app = express();
  const server = createServer(app);
  const io = new SocketIO(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  // ── API: Stats ──
  app.get('/api/stats', (_req, res) => {
    res.json(buildPayload(botClient));
  });

  // ── API: Commands list ──
  app.get('/api/commands', (_req, res) => {
    res.json(getCommandList());
  });

  // ── API: Config (non-sensitive) ──
  app.get('/api/config', (_req, res) => {
    res.json({
      prefix: '!',
      model: config.deepseek?.model || 'deepseek-chat',
      maxTokens: config.deepseek?.maxTokens || 2048,
      temperature: config.deepseek?.temperature || 0.7,
      maxHistory: config.bot?.maxHistory || 50,
      color: config.bot?.color || 0x7c5cfc,
    });
  });

  // ── API: Logs ──
  app.get('/api/logs', (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const level = req.query.level;
    let logs = getStats().logBuffer.slice(0, limit);
    if (level && level !== 'all') {
      logs = logs.filter(l => l.level === level);
    }
    res.json(logs);
  });

  // ── API: Reset stats ──
  app.delete('/api/stats', (_req, res) => {
    resetStats();
    addLog('info', 'Stats reset by dashboard user');
    res.json({ ok: true });
  });

  // ── API: Test AI prompt (non-blocking placeholder) ──
  app.post('/api/test-prompt', (req, res) => {
    const { prompt } = req.body;
    if (!prompt || prompt.length > 2000) {
      return res.status(400).json({ error: 'Prompt required (max 2000 chars)' });
    }
    addLog('info', `AI test prompt received (${prompt.length} chars)`);
    // Simulate a response — real implementation would call the AI
    res.json({
      response: `Echo: ${prompt.slice(0, 200)}${prompt.length > 200 ? '…' : ''}`,
      tokens: Math.ceil(prompt.length / 4),
      model: config.deepseek?.model || 'deepseek-chat',
    });
  });

  // ── Main page ──
  app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  // ── Socket.IO ──
  io.on('connection', (socket) => {
    addLog('info', 'Dashboard client connected');
    socket.emit('stats', buildPayload(botClient));

    // Client can request specific data
    socket.on('get_stats', () => {
      socket.emit('stats', buildPayload(botClient));
    });

    socket.on('get_logs', ({ limit, level } = {}) => {
      let logs = getStats().logBuffer.slice(0, limit || 100);
      if (level && level !== 'all') logs = logs.filter(l => l.level === level);
      socket.emit('logs', logs);
    });

    socket.on('disconnect', () => {
      // quiet
    });
  });

  // ── Broadcast loop ──
  const broadcastInterval = setInterval(() => {
    io.emit('stats', buildPayload(botClient));
  }, 2000);

  // ── Log stream: push new entries to all clients ──
  let lastLogIdx = 0;
  const logPushInterval = setInterval(() => {
    const current = getStats().logBuffer;
    if (current.length > lastLogIdx) {
      const fresh = current.slice(0, current.length - lastLogIdx);
      io.emit('log_entries', fresh);
      lastLogIdx = current.length;
    }
  }, 1500);

  // ── Start ──
  server.listen(PORT, () => {
    console.log(`\n📊 Dashboard: http://localhost:${PORT}/`);
    console.log(`   (open in your browser to monitor the bot)\n`);
    addLog('info', `Dashboard started on port ${PORT}`);
  });

  // Cleanup on stop
  const cleanup = () => {
    clearInterval(broadcastInterval);
    clearInterval(logPushInterval);
  };
  server.on('close', cleanup);

  return { app, server, io, cleanup };
}

function buildPayload(botClient) {
  const stats = getStats();
  return {
    ...stats,
    bot: botClient?.user
      ? {
          tag: botClient.user.tag,
          id: botClient.user.id,
          servers: botClient.guilds.cache.size,
          status: botClient.user?.presence?.status || 'online',
          ping: botClient.ws?.ping ?? null,
          shards: botClient.ws?.shards?.size ?? 1,
        }
      : null,
    config: {
      model: config.deepseek?.model || 'deepseek-chat',
      temperature: config.deepseek?.temperature || 0.7,
      maxTokens: config.deepseek?.maxTokens || 2048,
    },
  };
}

/** Build the full command list from the bot's registry */
function getCommandList() {
  // This mirrors index.js command structure.
  // In production, read from the actual command registry.
  return [
    {
      name: 'chat',
      description: 'Chat with the AI — general conversation, questions, and more',
      category: 'AI',
      subcommands: [
        { name: 'chat', description: 'General chat with the AI' },
        { name: 'summarize', description: 'Summarize text or conversation' },
        { name: 'explain', description: 'Explain a concept in simple terms' },
        { name: 'rewrite', description: 'Rewrite text in a different style' },
        { name: 'tone', description: 'Analyze the tone of text' },
        { name: 'suggest', description: 'Get suggestions for improvements' },
        { name: 'expand', description: 'Expand a short text into more detail' },
      ],
    },
    {
      name: 'generate',
      description: 'Generate creative content — essays, stories, poems, emails, and more',
      category: 'Generate',
      subcommands: [
        { name: 'essay', description: 'Generate an essay on a topic' },
        { name: 'story', description: 'Generate a creative story' },
        { name: 'poem', description: 'Write a poem' },
        { name: 'email', description: 'Draft a professional email' },
        { name: 'blog', description: 'Write a blog post' },
        { name: 'headline', description: 'Generate catchy headlines' },
        { name: 'slogan', description: 'Create a memorable slogan' },
        { name: 'tweet', description: 'Compose a tweet' },
        { name: 'caption', description: 'Write a social media caption' },
        { name: 'letter', description: 'Draft a formal letter' },
      ],
    },
    {
      name: 'code',
      description: 'Code assistance — generate, explain, review, debug, refactor, and more',
      category: 'Code',
      subcommands: [
        { name: 'generate', description: 'Generate code from a description' },
        { name: 'explain', description: 'Explain what code does' },
        { name: 'review', description: 'Review code for issues' },
        { name: 'debug', description: 'Find and fix bugs' },
        { name: 'refactor', description: 'Improve code structure' },
        { name: 'docs', description: 'Generate documentation' },
        { name: 'convert', description: 'Convert between languages' },
        { name: 'find-bugs', description: 'Scan for potential bugs' },
        { name: 'optimize', description: 'Optimize for performance' },
        { name: 'test', description: 'Generate unit tests' },
      ],
    },
    {
      name: 'analyze',
      description: 'Analyze text — sentiment, keywords, entities, language, and more',
      category: 'Analyze',
      subcommands: [
        { name: 'sentiment', description: 'Analyze sentiment of text' },
        { name: 'keywords', description: 'Extract key topics' },
        { name: 'entities', description: 'Extract named entities' },
        { name: 'language', description: 'Detect language' },
        { name: 'compare', description: 'Compare two texts' },
        { name: 'diff', description: 'Show differences between texts' },
        { name: 'classify', description: 'Classify text into categories' },
        { name: 'extract-emails', description: 'Extract email addresses' },
        { name: 'extract-phones', description: 'Extract phone numbers' },
        { name: 'extract-dates', description: 'Extract dates from text' },
      ],
    },
    {
      name: 'creative',
      description: 'Creative tools — names, ideas, usernames, roasts, compliments, trivia',
      category: 'Creative',
      subcommands: [
        { name: 'names', description: 'Generate name ideas' },
        { name: 'ideas', description: 'Brainstorm creative ideas' },
        { name: 'usernames', description: 'Generate username suggestions' },
        { name: 'nicknames', description: 'Create fun nicknames' },
        { name: 'colors', description: 'Generate color palettes' },
        { name: 'taglines', description: 'Create catchy taglines' },
        { name: 'fake-data', description: 'Generate realistic fake data' },
        { name: 'roast', description: 'Get a playful roast' },
        { name: 'compliment', description: 'Receive a nice compliment' },
        { name: 'trivia', description: 'Get a random trivia fact' },
      ],
    },
    {
      name: 'learn',
      description: 'Learning tools — definitions, synonyms, translations, grammar, quizzes',
      category: 'Learn',
      subcommands: [
        { name: 'define', description: 'Define a word' },
        { name: 'synonyms', description: 'Find synonyms' },
        { name: 'antonyms', description: 'Find antonyms' },
        { name: 'translate', description: 'Translate text' },
        { name: 'grammar', description: 'Check and fix grammar' },
        { name: 'etymology', description: 'Word origin and history' },
        { name: 'math', description: 'Solve math problems' },
        { name: 'history', description: 'Learn about historical events' },
        { name: 'science', description: 'Science explanations' },
        { name: 'quiz', description: 'Take a knowledge quiz' },
      ],
    },
    {
      name: 'utility',
      description: 'Utility commands — format JSON, CSV, minify, encode/decode',
      category: 'Utility',
      subcommands: [
        { name: 'format-json', description: 'Pretty-print JSON' },
        { name: 'format-markdown', description: 'Format markdown text' },
        { name: 'format-csv', description: 'Format CSV data' },
        { name: 'minify', description: 'Minify code or text' },
        { name: 'escape', description: 'Escape special characters' },
        { name: 'unescape', description: 'Unescape special characters' },
        { name: 'encode', description: 'Encode text (base64, URL, etc.)' },
        { name: 'decode', description: 'Decode text (base64, URL, etc.)' },
      ],
    },
    {
      name: 'bible',
      description: 'Look up Bible verses directly — no AI involved, fetched from Bible API',
      category: 'Bible',
      subcommands: [
        { name: 'lookup', description: 'Fetch a Bible verse by reference (e.g. John 3:16, Ezekiel 23:20)' },
      ],
    },
    {
      name: 'special',
      description: 'Special experiences — roleplay, interviews, debates, coaching, adventures',
      category: 'Special',
      subcommands: [
        { name: 'roleplay', description: 'Roleplay a character or scenario' },
        { name: 'interview', description: 'Practice interview questions' },
        { name: 'debate', description: 'Debate a topic with the AI' },
        { name: 'brainstorm', description: 'Collaborative brainstorming' },
        { name: 'advice', description: 'Get thoughtful advice' },
        { name: 'adventure', description: 'Interactive text adventure' },
        { name: 'persona', description: 'Chat with a custom persona' },
        { name: 'meditate', description: 'Guided meditation session' },
        { name: 'journal', description: 'Journaling prompts and guidance' },
        { name: 'coach', description: 'Professional coaching conversation' },
      ],
    },
  ];
}
