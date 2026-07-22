import { Client, GatewayIntentBits, Collection, Events, MessageFlags } from 'discord.js';
import config from './config.js';
import { commandHandlers } from './commands/index.js';
import { startDashboard } from './dashboard/server.js';
import { trackCommand } from './utils/stats.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();

// Map (commandName, subcommand) → handler key for proper routing
const subcommandFeatures = {
  chat:     { chat: 'chat', summarize: 'summarize', explain: 'explain', rewrite: 'rewrite', tone: 'tone', suggest: 'suggest', expand: 'expand' },
  generate: { essay: 'essay', story: 'story', poem: 'poem', email: 'email', blog: 'blog', headline: 'headline', slogan: 'slogan', tweet: 'tweet', caption: 'caption', letter: 'letter' },
  code:     { generate: 'code', explain: 'explain-code', review: 'review', debug: 'debug', refactor: 'refactor', docs: 'docs', convert: 'convert', 'find-bugs': 'find-bugs', optimize: 'optimize', test: 'test' },
  analyze:  { sentiment: 'sentiment', keywords: 'keywords', entities: 'entities', language: 'language', compare: 'compare', diff: 'diff', classify: 'classify', 'extract-emails': 'extract-emails', 'extract-phones': 'extract-phones', 'extract-dates': 'extract-dates' },
  creative: { names: 'names', ideas: 'ideas', usernames: 'usernames', nicknames: 'nicknames', colors: 'colors', taglines: 'taglines', 'fake-data': 'fake-data', roast: 'roast', compliment: 'compliment', trivia: 'trivia' },
  learn:    { define: 'define', synonyms: 'synonyms', antonyms: 'antonyms', translate: 'translate', grammar: 'grammar', etymology: 'etymology', math: 'math', history: 'history', science: 'science', quiz: 'quiz' },
  utility:  { 'format-json': 'format-json', 'format-markdown': 'format-markdown', 'format-csv': 'format-csv', minify: 'minify', escape: 'escape', unescape: 'unescape', encode: 'encode', decode: 'decode' },
  special:  { roleplay: 'roleplay', interview: 'interview', debate: 'debate', brainstorm: 'brainstorm', advice: 'advice', adventure: 'adventure', persona: 'persona', meditate: 'meditate', journal: 'journal', coach: 'coach' },
  bible:    { lookup: 'bible', random: 'bible-random', search: 'bible-search', passage: 'bible-passage', compare: 'bible-compare', daily: 'bible-daily', book: 'bible-book' },
};

// Map every handler key to its category for stats tracking
const handlerCategory = {
  help: 'help',
  chat: 'chat', summarize: 'chat', explain: 'chat', rewrite: 'chat',
  tone: 'chat', suggest: 'chat', expand: 'chat',
  react: 'chat', paraphrase: 'chat', discuss: 'chat',
  essay: 'generate', story: 'generate', poem: 'generate', email: 'generate',
  blog: 'generate', headline: 'generate', slogan: 'generate', tweet: 'generate',
  caption: 'generate', letter: 'generate', outline: 'generate', bio: 'generate',
  code: 'code', 'explain-code': 'code', review: 'code', debug: 'code',
  refactor: 'code', docs: 'code', convert: 'code', 'find-bugs': 'code',
  optimize: 'code', test: 'code', comment: 'code', fix: 'code',
  sentiment: 'analyze', keywords: 'analyze', entities: 'analyze', language: 'analyze',
  compare: 'analyze', diff: 'analyze', classify: 'analyze',
  'extract-emails': 'analyze', 'extract-phones': 'analyze', 'extract-dates': 'analyze',
  summary: 'analyze', readability: 'analyze',
  names: 'creative', ideas: 'creative', usernames: 'creative', nicknames: 'creative',
  colors: 'creative', taglines: 'creative', 'fake-data': 'creative',
  roast: 'creative', compliment: 'creative', trivia: 'creative',
  hashtags: 'creative', joke: 'creative',
  define: 'learn', synonyms: 'learn', antonyms: 'learn', translate: 'learn',
  grammar: 'learn', etymology: 'learn', math: 'learn', history: 'learn',
  science: 'learn', quiz: 'learn', fact: 'learn', 'how-to': 'learn',
  'format-json': 'utility', 'format-markdown': 'utility', 'format-csv': 'utility',
  minify: 'utility', escape: 'utility', unescape: 'utility',
  encode: 'utility', decode: 'utility',
  hash: 'utility', case: 'utility', color: 'utility', count: 'utility',
  roleplay: 'special', interview: 'special', debate: 'special',
  brainstorm: 'special', advice: 'special', adventure: 'special',
  persona: 'special', meditate: 'special', journal: 'special', coach: 'special',
  bible: 'bible', 'bible-random': 'bible', 'bible-search': 'bible',
  'bible-passage': 'bible', 'bible-compare': 'bible', 'bible-daily': 'bible',
  'bible-book': 'bible',
};

client.once(Events.ClientReady, async () => {
  console.log(`\n╔══════════════════════════════════╗`);
  console.log(`║  🤖 DeepBot v3.0 — Online!      ║`);
  console.log(`║  User: ${client.user.tag.padEnd(22)} ║`);
  console.log(`║  Servers: ${client.guilds.cache.size.toString().padEnd(20)} ║`);
  console.log(`║  Features: 100 LLM + Bible  ║`);
  console.log(`╚══════════════════════════════════╝\n`);

  client.user.setPresence({
    activities: [{ name: '🧠 100 features + Bible', type: 3 }],
    status: 'online',
  });

  startDashboard(client);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, options } = interaction;
  const subcommand = options.getSubcommand(false);

  // Resolve the correct handler key: subcommand takes priority, mapped through subcommandFeatures
  const featureKey = subcommand
    ? (subcommandFeatures[commandName]?.[subcommand] || commandName)
    : commandName;

  const handler = commandHandlers[featureKey];
  if (!handler) {
    return interaction.reply({
      content: `❌ Unknown command: \`/${commandName}${subcommand ? ' ' + subcommand : ''}\``,
      flags: MessageFlags.Ephemeral,
    });
  }

  // Track it
  const category = handlerCategory[featureKey] || 'unknown';
  trackCommand(category, featureKey);

  await interaction.deferReply();

  try {
    const input = options.getString('input') || options.getString('text') || '';
    const extra = options.getString('extra') || options.getString('language') || options.getString('style') || '';
    const prompt = options.getString('prompt') || '';

    const result = await handler({
      input: input || prompt,
      extra,
      feature: featureKey,
      interaction,
    });

    if (result) await interaction.editReply(result);
  } catch (err) {
    console.error(`Error in /${commandName} ${subcommand || ''}:`, err.message);
    await interaction.editReply({
      content: `❌ Error: ${err.message}`,
    });
  }
});

client.login(config.discord.token).catch(err => {
  console.error('Failed to login:', err.message);
  process.exit(1);
});
