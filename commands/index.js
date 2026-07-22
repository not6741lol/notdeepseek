import { quickAsk } from '../utils/deepseek.js';
import { getThinkingMessage } from '../utils/i18n.js';
import {
  tryBibleLookup, fetchVerse, parseVerseRef, formatVerse,
  fetchCompareVerses,
  fetchRandomVerse, fetchDailyVerse, TRANSLATION_KEYS, TRANSLATION_NAMES,
} from '../utils/bible.js';
import { EmbedBuilder, AttachmentBuilder } from 'discord.js';

/** Map command names to categories for stats tracking */
export const CATEGORIES = {
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

/** Language tag → file extension map */
const LANG_EXT = {
  html: 'html', htm: 'html', css: 'css', js: 'js', javascript: 'js', jsx: 'jsx',
  ts: 'ts', typescript: 'ts', tsx: 'tsx', py: 'python', python: 'py',
  rb: 'rb', ruby: 'rb', rs: 'rs', rust: 'rs', go: 'go', golang: 'go',
  java: 'java', kt: 'kt', kotlin: 'kt', swift: 'swift', c: 'c', cpp: 'cpp',
  'c++': 'cpp', cs: 'cs', 'c#': 'cs', php: 'php', r: 'r', scala: 'scala',
  sh: 'sh', bash: 'sh', zsh: 'sh', powershell: 'ps1', ps1: 'ps1',
  sql: 'sql', json: 'json', xml: 'xml', yaml: 'yaml', yml: 'yaml',
  toml: 'toml', md: 'md', markdown: 'md', txt: 'txt', csv: 'csv',
  env: 'env', gitignore: 'gitignore', dockerfile: 'Dockerfile',
  makefile: 'Makefile', svelte: 'svelte', vue: 'vue',
};

/** Extract code blocks from AI response — returns { code, lang, ext } or null */
function extractCodeBlocks(content) {
  const blockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  const blocks = [];
  let match;

  while ((match = blockRegex.exec(content)) !== null) {
    const lang = match[1].toLowerCase() || 'txt';
    const code = match[2].trim();
    if (code) blocks.push({ lang, code });
  }

  if (blocks.length > 0) {
    const lang = blocks[0].lang;
    const ext = LANG_EXT[lang] || 'txt';
    const code = blocks.map(b => b.code).join('\n\n');
    return { code, lang, ext };
  }

  // Fallback: content starts with ``` but has no closing fence
  const startsWithFence = /^```(\w*)\n?([\s\S]*)/.exec(content.trimStart());
  if (startsWithFence) {
    const lang = startsWithFence[1].toLowerCase() || 'txt';
    let code = startsWithFence[2].trim();
    // Strip trailing ``` if present
    code = code.replace(/```\s*$/, '').trim();
    if (code) {
      const ext = LANG_EXT[lang] || 'txt';
      return { code, lang, ext };
    }
  }

  return null;
}

/** Check if a feature is code-heavy */
function isCodeFeature(f) {
  return ['code','explain-code','review','debug','refactor','docs','convert',
          'find-bugs','optimize','test','comment','fix','format-json','format-markdown',
          'format-csv','minify'].includes(f);
}

/** Respond — sends code blocks as files, short text as embeds */
async function respond(opts) {
  const { input, extra, feature, interaction } = opts;
  await interaction.editReply(getThinkingMessage());

  // ── Bible verse detection: bypass AI, fetch directly ──
  if (feature === 'chat' || feature === 'explain' || feature === 'history') {
    const bibleData = await tryBibleLookup(input);
    if (bibleData) {
      const embed = new EmbedBuilder()
        .setColor(0x7c5cfc)
        .setTitle(`📖 ${bibleData.reference}`)
        .setDescription(bibleData.text.length > 4000 ? bibleData.text.slice(0, 3997) + '…' : bibleData.text)
        .setFooter({ text: `🕊 ${bibleData.translation} · ${bibleData.verseCount} verse${bibleData.verseCount > 1 ? 's' : ''}` })
        .setTimestamp();
      return { embeds: [embed] };
    }
  }

  const result = await quickAsk(feature, input, extra, {
    maxTokens: isCodeFeature(feature) ? 4096 : 2048,
  });
  const content = result.content;

  // Handle content-filtered responses
  if (result.filtered) {
    return { embeds: [new EmbedBuilder().setColor(0xff6b9d).setDescription(content).setTimestamp()] };
  }

  // Try to extract code blocks first
  const extracted = extractCodeBlocks(content);

  if (extracted) {
    const filename = `${feature.replace(/-/g, '_')}.${extracted.ext}`;
    const attachment = new AttachmentBuilder(Buffer.from(extracted.code, 'utf-8'), { name: filename });
    const desc = `\`${filename}\` — ${(extracted.code.length / 1024).toFixed(1)} KB, \`${extracted.lang}\``;
    const embed = new EmbedBuilder()
      .setColor(0x7c5cfc)
      .setTitle(`📄 ${feature.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`)
      .setDescription(desc)
      .setTimestamp();
    if (result.usage) embed.setFooter({ text: `⚡ ${result.model} · ${result.usage.total_tokens} tokens` });
    return { embeds: [embed], files: [attachment] };
  }

  // No code blocks — strip stray fences and save as .txt if long
  if (content.length > 1800) {
    // Aggressive cleanup: remove any remaining markdown code fences
    let cleaned = content.replace(/^```\w*\n?|```$/gm, '').trim();
    const filename = `${feature.replace(/-/g, '_')}.txt`;
    const attachment = new AttachmentBuilder(Buffer.from(cleaned, 'utf-8'), { name: filename });
    const embed = new EmbedBuilder()
      .setColor(0x7c5cfc)
      .setTitle(`📄 ${feature.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`)
      .setDescription(`Saved to \`${filename}\` (${cleaned.length.toLocaleString()} chars)`)
      .setTimestamp();
    if (result.usage) embed.setFooter({ text: `⚡ ${result.model} · ${result.usage.total_tokens} tokens` });
    return { embeds: [embed], files: [attachment] };
  }

  // Short text → embed
  const embed = new EmbedBuilder()
    .setColor(0x7c5cfc)
    .setTitle(feature.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))
    .setDescription(content)
    .setTimestamp();
  if (result.usage) embed.setFooter({ text: `⚡ ${result.model} · ${result.usage.total_tokens} tokens` });
  return { embeds: [embed] };
}

/** Simple response — file if long */
async function simpleRespond(opts) {
  const { input, extra, feature, interaction } = opts;
  await interaction.editReply(getThinkingMessage());
  const result = await quickAsk(feature, input, extra);
  const content = result.content;

  if (result.filtered) return content;

  const extracted = extractCodeBlocks(content);
  if (extracted) {
    const filename = `${feature.replace(/-/g, '_')}.${extracted.ext}`;
    const attachment = new AttachmentBuilder(Buffer.from(extracted.code, 'utf-8'), { name: filename });
    return { files: [attachment], content: `📄 \`${filename}\` — ${(extracted.code.length / 1024).toFixed(1)} KB` };
  }

  if (content.length > 1800) {
    const cleaned = content.replace(/^```\w*\n?|```$/gm, '').trim();
    const attachment = new AttachmentBuilder(Buffer.from(cleaned, 'utf-8'), { name: `${feature}.txt` });
    return { files: [attachment], content: `📄 Saved to \`${feature}.txt\` (${cleaned.length.toLocaleString()} chars)` };
  }

  return content.replace(/^```\w*\n?|```$/gm, '').trim().slice(0, 1900);
}

/** Short creative responses */
async function shortRespond(opts) {
  const { input, extra, feature, interaction } = opts;
  await interaction.editReply(getThinkingMessage());
  const result = await quickAsk(feature, input, extra, { maxTokens: 512, temperature: 0.9 });
  if (result.filtered) return result.content;
  return result.content.replace(/^```\w*\n?|```$/gm, '').trim().slice(0, 1900);
}

const embed = (f) => (o) => respond({ ...o, feature: f });
const simple = (f) => (o) => simpleRespond({ ...o, feature: f });
const short = (f) => (o) => shortRespond({ ...o, feature: f });

/** Help command */
async function helpHandler(opts) {
  const { interaction } = opts;
  const category = interaction.options.getString('category');

  const cats = {
    chat:     { emoji: '💬', name: 'Chat & Conversation', features: ['chat','summarize','explain','rewrite','tone','suggest','expand','react','paraphrase','discuss'] },
    generate: { emoji: '✍️', name: 'Content Generation',  features: ['essay','story','poem','email','blog','headline','slogan','tweet','caption','letter','outline','bio'] },
    code:     { emoji: '💻', name: 'Code & Development',  features: ['generate','explain','review','debug','refactor','docs','convert','find-bugs','optimize','test','comment','fix'] },
    analyze:  { emoji: '📊', name: 'Analysis',            features: ['sentiment','keywords','entities','language','compare','diff','classify','extract-emails','extract-phones','extract-dates','summary','readability'] },
    creative: { emoji: '🎨', name: 'Creative',            features: ['names','ideas','usernames','nicknames','colors','taglines','fake-data','roast','compliment','trivia','hashtags','joke'] },
    learn:    { emoji: '📚', name: 'Learning',            features: ['define','synonyms','antonyms','translate','grammar','etymology','math','history','science','quiz','fact','how-to'] },
    utility:  { emoji: '🔧', name: 'Utility',             features: ['format-json','format-markdown','format-csv','minify','escape','unescape','encode','decode','hash','case','color','count'] },
    special:  { emoji: '🎭', name: 'Special',             features: ['roleplay','interview','debate','brainstorm','advice','adventure','persona','meditate','journal','coach'] },
    bible:    { emoji: '📖', name: 'Bible',               features: ['lookup','random','search','passage','compare','daily','book'] },
  };

  const embed = new EmbedBuilder()
    .setColor(0x7c5cfc)
    .setTitle('🤖 DeepBot — Commands')
    .setDescription('**100 features** powered by DeepSeek + Bible lookup. Use `/help category:` to filter.')
    .setFooter({ text: 'Use /<category> <feature> to run any command' })
    .setTimestamp();

  if (category && cats[category]) {
    const c = cats[category];
    embed.addFields({ name: `${c.emoji} ${c.name} (${c.features.length})`, value: c.features.map(f => `\`${f}\``).join(' · ') });
  } else {
    for (const c of Object.values(cats)) {
      embed.addFields({ name: `${c.emoji} ${c.name} (${c.features.length})`, value: c.features.map(f => `\`${f}\``).join(' · '), inline: true });
    }
  }

  return { embeds: [embed] };
}

// ── Handlers ──
export const commandHandlers = {
  help: helpHandler,

  chat:           embed('chat'),
  summarize:      embed('summarize'),
  explain:        embed('explain'),
  rewrite:        embed('rewrite'),
  tone:           embed('tone'),
  suggest:        embed('suggest'),
  expand:         embed('expand'),
  react:          embed('react'),
  paraphrase:     embed('paraphrase'),
  discuss:        embed('discuss'),

  essay:          embed('essay'),
  story:          embed('story'),
  poem:           embed('poem'),
  email:          embed('email'),
  blog:           embed('blog'),
  headline:       short('headline'),
  slogan:         short('slogan'),
  tweet:          short('tweet'),
  caption:        short('caption'),
  letter:         embed('letter'),
  outline:        embed('outline'),
  bio:            short('bio'),

  code:           embed('code'),
  'explain-code': embed('explain-code'),
  review:         embed('review'),
  debug:          embed('debug'),
  refactor:       embed('refactor'),
  docs:           embed('docs'),
  convert:        embed('convert'),
  'find-bugs':    embed('find-bugs'),
  optimize:       embed('optimize'),
  test:           embed('test'),
  comment:        embed('comment'),
  fix:            embed('fix'),

  sentiment:      embed('sentiment'),
  keywords:       embed('keywords'),
  entities:       embed('entities'),
  language:       simple('language'),
  compare:        embed('compare'),
  diff:           embed('diff'),
  classify:       embed('classify'),
  'extract-emails': simple('extract-emails'),
  'extract-phones': simple('extract-phones'),
  'extract-dates': simple('extract-dates'),
  summary:        embed('summary'),
  readability:    embed('readability'),

  names:          short('names'),
  ideas:          embed('ideas'),
  usernames:      short('usernames'),
  nicknames:      short('nicknames'),
  colors:         short('colors'),
  taglines:       short('taglines'),
  'fake-data':    embed('fake-data'),
  roast:          short('roast'),
  compliment:     short('compliment'),
  trivia:         embed('trivia'),
  hashtags:       short('hashtags'),
  joke:           short('joke'),

  define:         embed('define'),
  synonyms:       simple('synonyms'),
  antonyms:       simple('antonyms'),
  translate:      simple('translate'),
  grammar:        embed('grammar'),
  etymology:      embed('etymology'),
  math:           embed('math'),
  history:        embed('history'),
  science:        embed('science'),
  quiz:           embed('quiz'),
  fact:           short('fact'),
  'how-to':       embed('how-to'),

  'format-json':  embed('format-json'),
  'format-markdown': embed('format-markdown'),
  'format-csv':   embed('format-csv'),
  minify:         simple('minify'),
  escape:         simple('escape'),
  unescape:       simple('unescape'),
  encode:         simple('encode'),
  decode:         simple('decode'),
  hash:           simple('hash'),
  case:           simple('case'),
  color:          embed('color'),
  count:          simple('count'),

  roleplay:       embed('roleplay'),
  interview:      embed('interview'),
  debate:         embed('debate'),
  brainstorm:     embed('brainstorm'),
  advice:         embed('advice'),
  adventure:      embed('adventure'),
  persona:        embed('persona'),
  meditate:       embed('meditate'),
  journal:        embed('journal'),
  coach:          embed('coach'),

  // ── Bible — fetches directly from Bible API, no AI involved ──

  // /bible lookup ⟨reference⟩
  bible: async (opts) => {
    const { input, interaction } = opts;
    await interaction.editReply(getThinkingMessage());

    const ref = parseVerseRef(input);
    if (!ref) {
      return { embeds: [new EmbedBuilder()
        .setColor(0xff6b9d)
        .setTitle('⚠ Invalid Reference')
        .setDescription(`Could not parse a Bible verse reference from: \`${input.slice(0, 200)}\`\n\nTry: \`John 3:16\`, \`Genesis 1:1\`, \`Ezekiel 23:20\``)
        .setTimestamp()
      ]};
    }

    try {
      const data = await fetchVerse(ref.book, ref.chapter, ref.verse, ref.verseEnd, 'web');
      const formatted = formatVerse(data);
      if (!formatted) {
        return { embeds: [new EmbedBuilder()
          .setColor(0xff6b9d)
          .setTitle('📖 Not Found')
          .setDescription(`Could not find \`${ref.book} ${ref.chapter}:${ref.verse || ''}\`. Check the book name, chapter, and verse number.`)
          .setTimestamp()
        ]};
      }

      const embed = new EmbedBuilder()
        .setColor(0x7c5cfc)
        .setTitle(`📖 ${formatted.reference}`)
        .setDescription(formatted.text.length > 4000 ? formatted.text.slice(0, 3997) + '…' : formatted.text)
        .setFooter({ text: `🕊 ${formatted.translation}${formatted.verseCount > 1 ? ` · ${formatted.verseCount} verses` : ''}` })
        .setTimestamp();
      return { embeds: [embed] };
    } catch (err) {
      return { embeds: [new EmbedBuilder()
        .setColor(0xff6b9d)
        .setTitle('⚠ Error')
        .setDescription(`Failed to fetch verse: ${err.message}`)
        .setTimestamp()
      ]};
    }
  },

  // /bible random
  'bible-random': async (opts) => {
    const { interaction } = opts;
    await interaction.editReply(getThinkingMessage());
    try {
      const data = await fetchRandomVerse('web');
      const formatted = formatVerse(data);
      if (!formatted) return { embeds: [new EmbedBuilder().setColor(0xff6b9d).setTitle('📖 Not Found').setDescription('Could not fetch a random verse.').setTimestamp()] };

      return { embeds: [new EmbedBuilder()
        .setColor(0x7c5cfc).setTitle(`📖 ${formatted.reference}`)
        .setDescription(formatted.text.length > 4000 ? formatted.text.slice(0, 3997) + '…' : formatted.text)
        .setFooter({ text: `🕊 ${formatted.translation} · Random verse` }).setTimestamp()
      ]};
    } catch (err) {
      return { embeds: [new EmbedBuilder().setColor(0xff6b9d).setTitle('⚠ Error').setDescription(err.message).setTimestamp()] };
    }
  },

  // /bible search ⟨keyword⟩ — AI-powered topic search across the Bible
  'bible-search': async (opts) => {
    const { input, interaction } = opts;
    await interaction.editReply(getThinkingMessage());
    if (!input || input.length < 2) {
      return { embeds: [new EmbedBuilder().setColor(0xff6b9d).setTitle('⚠ Need a keyword').setDescription('Enter at least 2 characters to search for Bible verses on a topic.').setTimestamp()] };
    }
    try {
      const result = await quickAsk('bible-search', input, '', { maxTokens: 2048 });
      if (result.filtered) return { content: result.content };

      const embed = new EmbedBuilder()
        .setColor(0x7c5cfc)
        .setTitle(`🔍 "${input}" — Bible Search`)
        .setDescription(result.content.length > 4000 ? result.content.slice(0, 3997) + '…' : result.content)
        .setFooter({ text: '🤖 AI-generated · Verify references with /bible lookup' }).setTimestamp();
      if (result.usage) embed.setFooter({ text: `⚡ ${result.model} · Verify with /bible lookup` });
      return { embeds: [embed] };
    } catch (err) {
      return { embeds: [new EmbedBuilder().setColor(0xff6b9d).setTitle('⚠ Error').setDescription(err.message).setTimestamp()] };
    }
  },

  // /bible passage ⟨reference⟩ — fetch a full chapter
  'bible-passage': async (opts) => {
    const { input, interaction } = opts;
    await interaction.editReply(getThinkingMessage());

    const ref = parseVerseRef(input);
    if (!ref || !ref.chapter) {
      return { embeds: [new EmbedBuilder().setColor(0xff6b9d).setTitle('⚠ Invalid Reference').setDescription(`Use \`Book Chapter\` (e.g. \`Psalm 23\`, \`John 3\`).`).setTimestamp()] };
    }

    try {
      const data = await fetchVerse(ref.book, ref.chapter, null, null, 'web');
      const formatted = formatVerse(data);
      if (!formatted) {
        return { embeds: [new EmbedBuilder().setColor(0xff6b9d).setTitle('📖 Not Found').setDescription(`Could not find \`${ref.book} ${ref.chapter}\`.`).setTimestamp()] };
      }

      const embed = new EmbedBuilder()
        .setColor(0x7c5cfc)
        .setTitle(`📖 ${formatted.reference}`)
        .setDescription(formatted.text.length > 4000 ? formatted.text.slice(0, 3997) + '…' : formatted.text)
        .setFooter({ text: `🕊 ${formatted.translation} · ${formatted.verseCount} verses` }).setTimestamp();
      return { embeds: [embed] };
    } catch (err) {
      return { embeds: [new EmbedBuilder().setColor(0xff6b9d).setTitle('⚠ Error').setDescription(err.message).setTimestamp()] };
    }
  },

  // /bible compare ⟨reference⟩ — compare translations
  'bible-compare': async (opts) => {
    const { input, interaction, extra } = opts;
    await interaction.editReply(getThinkingMessage());

    const ref = parseVerseRef(input);
    if (!ref || !ref.verse) {
      return { embeds: [new EmbedBuilder().setColor(0xff6b9d).setTitle('⚠ Invalid Reference').setDescription('Use \`Book Chapter:Verse\` (e.g. \`John 3:16\`, \`Psalm 23:1\`).').setTimestamp()] };
    }

    const translations = (extra || 'web,kjv').split(',').map(t => t.trim()).filter(t => t && TRANSLATION_KEYS.includes(t));
    if (translations.length < 1) translations.push('web', 'kjv');

    try {
      const data = await fetchCompareVerses(ref.book, ref.chapter, ref.verse, ref.verseEnd, translations);
      if (!data || data.verses.length === 0) {
        return { embeds: [new EmbedBuilder().setColor(0xff6b9d).setTitle('📖 Not Found').setDescription(`Could not find \`${ref.book} ${ref.chapter}:${ref.verse}\` in any translation.`).setTimestamp()] };
      }

      const embed = new EmbedBuilder()
        .setColor(0x7c5cfc)
        .setTitle(`📖 ${data.reference} — Translation Comparison`)
        .setTimestamp();

      for (const v of data.verses) {
        const text = v.text.length > 1000 ? v.text.slice(0, 997) + '…' : v.text;
        embed.addFields({ name: `🕊 ${v.name}`, value: text });
      }

      embed.setFooter({ text: `${data.count} translation${data.count > 1 ? 's' : ''} compared` });
      return { embeds: [embed] };
    } catch (err) {
      return { embeds: [new EmbedBuilder().setColor(0xff6b9d).setTitle('⚠ Error').setDescription(err.message).setTimestamp()] };
    }
  },

  // /bible daily
  'bible-daily': async (opts) => {
    const { interaction } = opts;
    await interaction.editReply(getThinkingMessage());
    try {
      const data = await fetchDailyVerse('web');
      const formatted = formatVerse(data);
      if (!formatted) return { embeds: [new EmbedBuilder().setColor(0xff6b9d).setTitle('📖 Not Found').setDescription('Could not fetch daily verse.').setTimestamp()] };

      return { embeds: [new EmbedBuilder()
        .setColor(0x7c5cfc).setTitle(`📖 ${formatted.reference} — Daily Verse`)
        .setDescription(formatted.text.length > 4000 ? formatted.text.slice(0, 3997) + '…' : formatted.text)
        .setFooter({ text: `🕊 ${formatted.translation}` }).setTimestamp()
      ]};
    } catch (err) {
      return { embeds: [new EmbedBuilder().setColor(0xff6b9d).setTitle('⚠ Error').setDescription(err.message).setTimestamp()] };
    }
  },

  // /bible book ⟨name⟩ — AI-powered overview of a Bible book
  'bible-book': async (opts) => {
    const { input, interaction } = opts;
    // Check if it looks like a verse reference first (e.g. "Ezekiel 23") → use passage handler intent
    const ref = parseVerseRef(input);
    const bookName = ref ? ref.book : input.trim();
    if (!bookName) {
      return { embeds: [new EmbedBuilder().setColor(0xff6b9d).setTitle('⚠ Enter a book name').setDescription('e.g. \`Genesis\`, \`John\`, \`Romans\`, \`1 Corinthians\`').setTimestamp()] };
    }

    const result = await quickAsk('bible-book', bookName, '', { maxTokens: 1024 });
    if (result.filtered) {
      return { content: result.content };
    }
    const embed = new EmbedBuilder()
      .setColor(0x7c5cfc)
      .setTitle(`📖 ${bookName} — Overview`)
      .setDescription(result.content.length > 4000 ? result.content.slice(0, 3997) + '…' : result.content)
      .setTimestamp();
    if (result.usage) embed.setFooter({ text: `⚡ ${result.model}` });
    return { embeds: [embed] };
  },
};
