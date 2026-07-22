/**
 * Deploy 100 slash commands to Discord API
 * Run: node scripts/deploy-commands.js
 */
import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import 'dotenv/config';

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!TOKEN || !CLIENT_ID) {
  console.error('❌ DISCORD_TOKEN and CLIENT_ID required in .env');
  process.exit(1);
}

// ── Helpers ──
const input = (cmd, required = true) =>
  cmd.addStringOption(o => o.setName('input').setDescription('Input text').setRequired(required));

const extra = (cmd, name = 'extra', desc = 'Extra context') =>
  cmd.addStringOption(o => o.setName(name).setDescription(desc).setRequired(false));

// Enable User Install + all contexts for every command
const userInstall = (cmd) => cmd
  .setIntegrationTypes([0, 1])   // 0=Guild, 1=User
  .setContexts([0, 1, 2]);       // 0=Guild, 1=DM, 2=Private

// ── 1. 💬 Chat (10) ──
const chat = new SlashCommandBuilder()
  .setName('chat').setDescription('💬 Chat & conversation')
  .addSubcommand(s => input(s.setName('chat').setDescription('Free conversation')))
  .addSubcommand(s => input(s.setName('summarize').setDescription('Summarize text')))
  .addSubcommand(s => input(s.setName('explain').setDescription('Explain simply')))
  .addSubcommand(s => input(s.setName('rewrite').setDescription('Rewrite text')))
  .addSubcommand(s => input(s.setName('tone').setDescription('Analyze tone')))
  .addSubcommand(s => input(s.setName('suggest').setDescription('Suggest replies')))
  .addSubcommand(s => input(s.setName('expand').setDescription('Expand text')))
  .addSubcommand(s => input(s.setName('react').setDescription('Generate a reaction/reply')))
  .addSubcommand(s => input(s.setName('paraphrase').setDescription('Paraphrase text')))
  .addSubcommand(s => input(s.setName('discuss').setDescription('Discuss a topic')));

// ── 2. ✍️ Generate (12) ──
const generate = new SlashCommandBuilder()
  .setName('generate').setDescription('✍️ Content generation')
  .addSubcommand(s => input(s.setName('essay').setDescription('Write an essay')))
  .addSubcommand(s => input(s.setName('story').setDescription('Write a story')))
  .addSubcommand(s => input(s.setName('poem').setDescription('Create a poem')))
  .addSubcommand(s => input(s.setName('email').setDescription('Draft an email')))
  .addSubcommand(s => input(s.setName('blog').setDescription('Write a blog post')))
  .addSubcommand(s => input(s.setName('headline').setDescription('Generate headlines')))
  .addSubcommand(s => input(s.setName('slogan').setDescription('Create slogans')))
  .addSubcommand(s => input(s.setName('tweet').setDescription('Generate social posts')))
  .addSubcommand(s => input(s.setName('caption').setDescription('Create captions')))
  .addSubcommand(s => input(s.setName('letter').setDescription('Write a letter')))
  .addSubcommand(s => input(s.setName('outline').setDescription('Create an outline')))
  .addSubcommand(s => input(s.setName('bio').setDescription('Write a bio')));

// ── 3. 💻 Code (12) ──
const code = new SlashCommandBuilder()
  .setName('code').setDescription('💻 Code features')
  .addSubcommand(s => input(s.setName('generate').setDescription('Generate code')))
  .addSubcommand(s => input(s.setName('explain').setDescription('Explain code')))
  .addSubcommand(s => input(s.setName('review').setDescription('Review code')))
  .addSubcommand(s => input(extra(s.setName('debug').setDescription('Debug code'), 'error', 'Error message'), false))
  .addSubcommand(s => input(s.setName('refactor').setDescription('Refactor code')))
  .addSubcommand(s => input(s.setName('docs').setDescription('Generate docs')))
  .addSubcommand(s => input(extra(s.setName('convert').setDescription('Convert language'), 'language', 'Target language'), false))
  .addSubcommand(s => input(s.setName('find-bugs').setDescription('Find bugs')))
  .addSubcommand(s => input(s.setName('optimize').setDescription('Optimize code')))
  .addSubcommand(s => input(s.setName('test').setDescription('Generate tests')))
  .addSubcommand(s => input(s.setName('comment').setDescription('Add comments to code')))
  .addSubcommand(s => input(s.setName('fix').setDescription('Fix code issues')));

// ── 4. 📊 Analyze (12) ──
const analyze = new SlashCommandBuilder()
  .setName('analyze').setDescription('📊 Analysis')
  .addSubcommand(s => input(s.setName('sentiment').setDescription('Analyze sentiment')))
  .addSubcommand(s => input(s.setName('keywords').setDescription('Extract keywords')))
  .addSubcommand(s => input(s.setName('entities').setDescription('Identify entities')))
  .addSubcommand(s => input(s.setName('language').setDescription('Detect language')))
  .addSubcommand(s => input(extra(s.setName('compare').setDescription('Compare two texts'), 'text2', 'Second text'), false))
  .addSubcommand(s => input(extra(s.setName('diff').setDescription('Diff two texts'), 'text2', 'Second text'), false))
  .addSubcommand(s => input(s.setName('classify').setDescription('Classify text')))
  .addSubcommand(s => input(s.setName('extract-emails').setDescription('Extract emails')))
  .addSubcommand(s => input(s.setName('extract-phones').setDescription('Extract phones')))
  .addSubcommand(s => input(s.setName('extract-dates').setDescription('Extract dates')))
  .addSubcommand(s => input(s.setName('summary').setDescription('Summarize text')))
  .addSubcommand(s => input(s.setName('readability').setDescription('Analyze readability')));

// ── 5. 🎨 Creative (12) ──
const creative = new SlashCommandBuilder()
  .setName('creative').setDescription('🎨 Creative')
  .addSubcommand(s => input(s.setName('names').setDescription('Generate names')))
  .addSubcommand(s => input(s.setName('ideas').setDescription('Generate ideas')))
  .addSubcommand(s => input(s.setName('usernames').setDescription('Generate usernames')))
  .addSubcommand(s => input(s.setName('nicknames').setDescription('Generate nicknames')))
  .addSubcommand(s => input(s.setName('colors').setDescription('Color palettes')))
  .addSubcommand(s => input(s.setName('taglines').setDescription('Generate taglines')))
  .addSubcommand(s => input(s.setName('fake-data').setDescription('Generate fake data')))
  .addSubcommand(s => input(s.setName('roast').setDescription('Playful roast')))
  .addSubcommand(s => input(s.setName('compliment').setDescription('Give compliment')))
  .addSubcommand(s => input(s.setName('trivia').setDescription('Trivia questions')))
  .addSubcommand(s => input(s.setName('hashtags').setDescription('Generate hashtags')))
  .addSubcommand(s => input(false, s.setName('joke').setDescription('Tell a joke').addStringOption(o => o.setName('input').setDescription('Topic (optional)').setRequired(false))));

// ── 6. 📚 Learn (12) ──
const learn = new SlashCommandBuilder()
  .setName('learn').setDescription('📚 Learning')
  .addSubcommand(s => input(s.setName('define').setDescription('Define a term')))
  .addSubcommand(s => input(s.setName('synonyms').setDescription('Find synonyms')))
  .addSubcommand(s => input(s.setName('antonyms').setDescription('Find antonyms')))
  .addSubcommand(s => input(extra(s.setName('translate').setDescription('Translate text'), 'language', 'Target language'), false))
  .addSubcommand(s => input(s.setName('grammar').setDescription('Check grammar')))
  .addSubcommand(s => input(s.setName('etymology').setDescription('Word etymology')))
  .addSubcommand(s => input(s.setName('math').setDescription('Solve math')))
  .addSubcommand(s => input(s.setName('history').setDescription('Explain history')))
  .addSubcommand(s => input(s.setName('science').setDescription('Explain science')))
  .addSubcommand(s => input(s.setName('quiz').setDescription('Generate quiz')))
  .addSubcommand(s => input(false, s.setName('fact').setDescription('Share an interesting fact').addStringOption(o => o.setName('input').setDescription('Topic (optional)').setRequired(false))))
  .addSubcommand(s => input(s.setName('how-to').setDescription('Step-by-step instructions')));

// ── 7. 🔧 Utility (12) ──
const utility = new SlashCommandBuilder()
  .setName('utility').setDescription('🔧 Utility')
  .addSubcommand(s => input(s.setName('format-json').setDescription('Format JSON')))
  .addSubcommand(s => input(s.setName('format-markdown').setDescription('Apply Markdown')))
  .addSubcommand(s => input(s.setName('format-csv').setDescription('Format CSV')))
  .addSubcommand(s => input(s.setName('minify').setDescription('Minify code')))
  .addSubcommand(s => input(extra(s.setName('escape').setDescription('Escape text'), 'type', 'html/url/json'), false))
  .addSubcommand(s => input(s.setName('unescape').setDescription('Unescape text')))
  .addSubcommand(s => input(s.setName('encode').setDescription('Base64 encode')))
  .addSubcommand(s => input(s.setName('decode').setDescription('Base64 decode')))
  .addSubcommand(s => input(s.setName('hash').setDescription('Compute hashes (MD5, SHA-1, SHA-256)')))
  .addSubcommand(s => input(s.setName('case').setDescription('Convert text case')))
  .addSubcommand(s => input(s.setName('color').setDescription('Analyze or convert hex colors')))
  .addSubcommand(s => input(s.setName('count').setDescription('Count chars/words/sentences')));

// ── 8. 🎭 Special (10) ──
const special = new SlashCommandBuilder()
  .setName('special').setDescription('🎭 Special')
  .addSubcommand(s => input(extra(s.setName('roleplay').setDescription('Roleplay character'), 'character', 'Character name'), false))
  .addSubcommand(s => input(s.setName('interview').setDescription('Mock interview')))
  .addSubcommand(s => input(extra(s.setName('debate').setDescription('Debate topic'), 'stance', 'Your stance'), false))
  .addSubcommand(s => input(s.setName('brainstorm').setDescription('Brainstorm ideas')))
  .addSubcommand(s => input(s.setName('advice').setDescription('Get advice')))
  .addSubcommand(s => input(s.setName('adventure').setDescription('Text adventure')))
  .addSubcommand(s => input(extra(s.setName('persona').setDescription('Talk to persona'), 'persona', 'Persona name'), false))
  .addSubcommand(s => input(s.setName('meditate').setDescription('Guided meditation')))
  .addSubcommand(s => input(s.setName('journal').setDescription('Journal prompts')))
  .addSubcommand(s => input(s.setName('coach').setDescription('Life coaching')));

// ── 9. 📖 Bible (7) ──
const bible = new SlashCommandBuilder()
  .setName('bible').setDescription('📖 Bible study tools')
  .addSubcommand(s => input(s.setName('lookup').setDescription('Fetch a verse (e.g. John 3:16, 1 Corinthians 14:34-35)')))
  .addSubcommand(s => s.setName('random').setDescription('Get a random Bible verse'))
  .addSubcommand(s => input(s.setName('search').setDescription('Search verses by keyword')))
  .addSubcommand(s => input(s.setName('passage').setDescription('Read a full chapter (e.g. Psalm 23)')))
  .addSubcommand(s => input(extra(s.setName('compare').setDescription('Compare translations'), 'extra', 'Translations (e.g. web,kjv,almeida)'), false))
  .addSubcommand(s => s.setName('daily').setDescription('Verse of the day'))
  .addSubcommand(s => input(s.setName('book').setDescription('Overview of a Bible book')));

// ── 10. ❓ Help ──
const help = new SlashCommandBuilder()
  .setName('help').setDescription('❓ Show all available commands and features')
  .addStringOption(o => o
    .setName('category')
    .setDescription('Filter by category')
    .setRequired(false)
    .addChoices(
      { name: '💬 Chat & Conversation', value: 'chat' },
      { name: '✍️ Content Generation', value: 'generate' },
      { name: '💻 Code & Development', value: 'code' },
      { name: '📊 Analysis', value: 'analyze' },
      { name: '🎨 Creative', value: 'creative' },
      { name: '📚 Learning', value: 'learn' },
      { name: '🔧 Utility', value: 'utility' },
      { name: '🎭 Special', value: 'special' },
      { name: '📖 Bible', value: 'bible' },
    ));

// ── Deploy ──
const commands = [help, chat, generate, code, analyze, creative, learn, utility, special, bible]
  .map(c => userInstall(c).toJSON());
const rest = new REST({ version: '10' }).setToken(TOKEN);
const target = process.env.GUILD_ID
  ? Routes.applicationGuildCommands(CLIENT_ID, process.env.GUILD_ID)
  : Routes.applicationCommands(CLIENT_ID);

try {
  console.log(`📦 Registering ${commands.length} commands...`);
  const data = await rest.put(target, { body: commands });
  console.log(`✅ ${data.length} slash commands deployed!`);
  console.log(`   ❓ help: 1`);
  console.log(`   💬 chat: 10`);
  console.log(`   ✍️ generate: 12`);
  console.log(`   💻 code: 12`);
  console.log(`   📊 analyze: 12`);
  console.log(`   🎨 creative: 12`);
  console.log(`   📚 learn: 12`);
  console.log(`   🔧 utility: 12`);
  console.log(`   🎭 special: 10`);
  console.log(`   📖 bible: 7`);
  console.log(`   ─────────────────`);
  console.log(`   🧠 Total: 100 commands`);
} catch (err) {
  console.error('❌ Failed:', err.message);
}
