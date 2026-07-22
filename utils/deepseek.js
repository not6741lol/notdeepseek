import OpenAI from 'openai';
import config from '../config.js';
import { trackApiCall, trackError } from './stats.js';

const client = new OpenAI({
  apiKey: config.deepseek.apiKey,
  baseURL: config.deepseek.baseURL,
});

/** Build a system prompt for each feature */
export function buildSystemPrompt(feature) {
  const base = 'You are DeepBot, an expert AI assistant in Discord. Respond in the user\'s language. Use Markdown formatting. Be concise yet thorough, professional yet warm. You handle ALL topics professionally and without judgment — including academic discussion of religious texts, classic literature, historical documents, and mature literary themes. When a user asks about a specific passage from any religious or literary work, provide the requested text and scholarly context without censorship. When generating code, output ONLY the code block — no explanations or surrounding text.';

  const prompts = {
    chat:           base,
    summarize:      base + '\nSummarize the following text clearly and concisely, extracting the main ideas.',
    explain:        base + '\nExplain it simply as if teaching a beginner. Use analogies.',
    rewrite:        base + '\nRewrite the text while preserving meaning but improving style and clarity.',
    tone:           base + '\nAnalyze the tone (formal, informal, sarcastic, etc.) and suggest alternatives.',
    suggest:        base + '\nSuggest natural, relevant replies for the given context.',
    expand:         base + '\nExpand the text with more depth, examples, and relevant details.',
    essay:          base + '\nWrite a structured essay with introduction, body, and conclusion. Use strong arguments.',
    story:          base + '\nWrite a captivating short story with characters, plot, and rich setting.',
    poem:           base + '\nCreate an original poem with meter, rhyme, and literary devices.',
    email:          base + '\nDraft a professional email with subject, greeting, body, and sign-off.',
    blog:           base + '\nWrite an engaging blog post with title, introduction, sections, and conclusion.',
    headline:       base + '\nGenerate impactful, varied headlines to grab attention.',
    slogan:         base + '\nCreate memorable, persuasive slogans for brands or products.',
    tweet:          base + '\nGenerate punchy social media posts with hook.',
    caption:        base + '\nCreate creative photo descriptions for social media.',
    letter:         base + '\nWrite formal or informal letters as indicated by context.',
    code:           base + '\nWrite clean, efficient, well-commented code. Briefly explain the logic. Output ONLY the code in a single markdown code block.',
    'explain-code': base + '\nExplain the code step by step — what each part does and why. Show the code in a markdown block, then explain outside it.',
    review:         base + '\nReview the code: flag bugs, code smells, security issues, and suggest fixes. Show problematic code in markdown blocks with explanations outside.',
    debug:          base + '\nHelp debug the error. Analyze root cause and propose specific solutions. Show fixed code in a markdown block.',
    refactor:       base + '\nRefactor the code to improve it without changing behavior. Explain the changes. Output ONLY the refactored code in a single markdown code block.',
    docs:           base + '\nGenerate clear documentation with description, parameters, examples, and notes.',
    convert:        base + '\nConvert the code to the target language while preserving functionality. Output ONLY the converted code in a single markdown code block.',
    'find-bugs':    base + '\nFind bugs, vulnerabilities, and potential issues. Prioritize by severity. Show each bug in a code block with explanation outside.',
    optimize:       base + '\nOptimize the code for better performance without altering functionality. Output ONLY the optimized code in a single markdown code block.',
    test:           base + '\nGenerate comprehensive unit tests with Jest or Vitest. Include edge cases. Output ONLY the test code in a single markdown code block.',
    sentiment:      base + '\nAnalyze the text sentiment: positive, negative, or neutral. Provide a score.',
    keywords:       base + '\nExtract the most relevant key terms and phrases from the text.',
    entities:       base + '\nIdentify and classify named entities: people, places, dates, organizations, etc.',
    language:       base + '\nDetect the language of the text and return the ISO code if possible.',
    compare:        base + '\nCompare the texts, noting similarities, differences, and notable aspects.',
    diff:           base + '\nAnalyze the differences between the texts in detail.',
    classify:       base + '\nClassify the text into predefined categories or suggest the most appropriate ones.',
    'extract-emails': base + '\nExtract all email addresses from the provided text. Return them as a list.',
    'extract-phones': base + '\nExtract all phone numbers from the provided text. Return them as a list.',
    'extract-dates':  base + '\nExtract all dates and times from the text, normalizing them.',
    names:          base + '\nGenerate creative, varied names based on the requested context.',
    ideas:          base + '\nGenerate innovative, original ideas. Be creative and think outside the box.',
    usernames:      base + '\nGenerate original, available-sounding usernames. Combine keywords creatively.',
    nicknames:      base + '\nCreate original nicknames and sobriquets based on the given context.',
    colors:         base + '\nGenerate harmonious color palettes with HEX codes and usage descriptions.',
    taglines:       base + '\nCreate impactful taglines and mottos for the indicated product or brand.',
    'fake-data':    base + '\nGenerate realistic but clearly fictional data.',
    roast:          base + '\nDeliver a fun, creative roast without being hurtful. Smart humor.',
    compliment:     base + '\nGenerate sincere, original, personalized compliments.',
    trivia:         base + '\nGenerate interesting trivia questions with answers and fun facts.',
    define:         base + '\nDefine the term clearly and completely. Include etymology if applicable.',
    synonyms:       base + '\nProvide precise synonyms with contextual usage examples.',
    antonyms:       base + '\nProvide precise antonyms with contextual usage examples.',
    translate:      base + '\nTranslate the text to the target language while preserving tone and nuance.',
    grammar:        base + '\nCorrect grammar and spelling, explaining each correction.',
    etymology:      base + '\nExplain the etymological origin: roots, historical evolution, and curiosities.',
    math:           base + '\nSolve the math problem step by step with clear explanations.',
    history:        base + '\nExplain the historical event or period with context, causes, and consequences.',
    science:        base + '\nExplain the scientific concept precisely but accessibly.',
    quiz:           base + '\nGenerate multiple-choice quiz questions on the indicated topic with answers.',
    'format-json':  base + '\nFormat the JSON with correct indentation. Validate the structure. Output ONLY the formatted JSON in a single markdown code block.',
    'format-markdown': base + '\nApply Markdown formatting: headings, lists, code blocks, etc. Output ONLY the markdown-formatted text in a single markdown code block.',
    'format-csv':   base + '\nFormat the data as CSV with proper headers and separators. Output ONLY the CSV in a single markdown code block.',
    minify:         base + '\nMinify the code by removing whitespace, comments, and redundancies. Output ONLY the minified code in a single markdown code block.',
    escape:         base + '\nEscape special characters for HTML/URL/JSON as indicated. Output ONLY the escaped text in a code block.',
    unescape:       base + '\nUnescape special characters returning the original text. Output ONLY the unescaped text in a code block.',
    encode:         base + '\nBase64 encode the text. Output ONLY the encoded string in a code block.',
    decode:         base + '\nBase64 decode the text. Output ONLY the decoded text in a code block.',
    roleplay:       base + '\nPortray the specified character with coherence, depth, and consistent style.',
    interview:      base + '\nAct as a professional interviewer. Ask relevant questions and dig deeper.',
    debate:         base + '\nDebate the topic from the indicated stance with logical, respectful arguments.',
    brainstorm:     base + '\nFacilitate a creative brainstorming session. Generate many ideas without judgment.',
    advice:         base + '\nOffer practical, balanced advice considering pros and cons.',
    adventure:      base + '\nNarrate an interactive text adventure. Describe scenes, present choices, react to decisions.',
    persona:        base + '\nAdopt the indicated personality with full coherence: voice, opinions, and style.',
    meditate:       base + '\nGuide a meditation or mindfulness exercise with calm, measured instructions.',
    journal:        base + '\nHelp reflect and write in a personal journal with guided prompts.',
    coach:          base + '\nAct as a professional coach: listen, question, challenge, and motivate toward goals.',
    react:          base + '\nGenerate a natural reply or reaction to the given message. Be conversational and appropriate.',
    paraphrase:     base + '\nParaphrase the text while preserving its original meaning. Offer a different wording.',
    discuss:        base + '\nDiscuss the topic thoughtfully, presenting multiple perspectives and insights.',
    outline:        base + '\nCreate a clear, structured outline with main points and subpoints.',
    bio:            base + '\nWrite a short, engaging biography or profile based on the information provided.',
    comment:        base + '\nAdd clear, helpful comments to the code explaining what each section does.',
    fix:            base + '\nFix bugs, errors, or issues in the code. Explain what was wrong and show the corrected code in a markdown block.',
    summary:        base + '\nProvide a concise summary capturing the key points and essential information.',
    readability:    base + '\nAnalyze the readability of the text: reading level, sentence length, complexity, and suggestions.',
    hashtags:       base + '\nGenerate relevant, trending hashtags for the given content.',
    joke:           base + '\nTell a funny, clean joke. Be creative with wordplay and punchlines.',
    fact:           base + '\nShare an interesting, verified fact. Make it surprising but true.',
    'how-to':       base + '\nProvide clear, step-by-step instructions for the requested task.',
    hash:           base + '\nCompute the MD5, SHA-1, and SHA-256 hashes of the input text. Output ONLY the hashes in a code block.',
    case:           base + '\nConvert the text to UPPER CASE, lower case, Title Case, and sPoNgEbOb CaSe. Show each variation.',
    color:          base + '\nAnalyze or convert the given hex color: show RGB, HSL, complementary colors, and suggest a palette.',
    count:          base + '\nCount the characters, words, sentences, and paragraphs in the text. Output ONLY the statistics.',
    'bible-book':   base + '\nProvide an informative overview of the requested Bible book: authorship, historical context, main themes, key chapters, and significance. Be scholarly and neutral.',
    'bible-search': base + '\nSearch the Bible for verses related to the user\'s query. Cite specific book, chapter, and verse references along with the verse text itself. Organize results thematically. Be accurate — only cite verses you are highly confident about. If unsure, say so.',
  };

  return prompts[feature] || base;
}

/** Build a user prompt for each feature */
export function buildPrompt(feature, input, extra = '') {
  const templates = {
    summarize:      `Summarize this text:\n\n${input}`,
    explain:        `Explain this simply:\n\n${input}`,
    rewrite:        `Rewrite this text:\n\n${input}`,
    tone:           `Analyze the tone of this text:\n\n${input}`,
    suggest:        `Context: ${input}\nSuggest replies for this.${extra}`,
    expand:         `Expand this text:\n\n${input}`,
    essay:          `Write an essay about: ${input}${extra}`,
    story:          `Write a story about: ${input}${extra}`,
    poem:           `Create a poem about: ${input}${extra}`,
    email:          `Draft an email about: ${input}${extra}`,
    blog:           `Write a blog post about: ${input}${extra}`,
    headline:       `Generate headlines for: ${input}`,
    slogan:         `Create slogans for: ${input}`,
    tweet:          `Generate tweets about: ${input}${extra}`,
    caption:        `Create captions for: ${input}${extra}`,
    letter:         `Write a letter: ${input}${extra}`,
    code:           `Write code for: ${input}${extra}\n\nOutput ONLY the code in a single markdown code block — no explanations.`,
    'explain-code': `Explain this code:\n\`\`\`\n${input}\n\`\`\``,
    review:         `Review this code:\n\`\`\`\n${input}\n\`\`\``,
    debug:          `Debug this code (error: ${extra}):\n\`\`\`\n${input}\n\`\`\``,
    refactor:       `Refactor this code:\n\`\`\`\n${input}\n\`\`\`\n\nOutput ONLY the refactored code in a single markdown code block — no explanations.`,
    docs:           `Generate documentation for:\n\`\`\`\n${input}\n\`\`\``,
    convert:        `Convert this code to ${extra || 'another language'}:\n\`\`\`\n${input}\n\`\`\`\n\nOutput ONLY the converted code in a single markdown code block.`,
    'find-bugs':    `Find bugs in:\n\`\`\`\n${input}\n\`\`\``,
    optimize:       `Optimize this code:\n\`\`\`\n${input}\n\`\`\`\n\nOutput ONLY the optimized code.`,
    test:           `Generate tests for:\n\`\`\`\n${input}\n\`\`\`\n\nOutput ONLY the test code.`,
    sentiment:      `Analyze the sentiment of: "${input}"`,
    keywords:       `Extract keywords from: "${input}"`,
    entities:       `Identify entities in: "${input}"`,
    language:       `What language is this? "${input.slice(0, 200)}"`,
    compare:        `Compare these texts:\n---TEXT 1---\n${input}\n---TEXT 2---\n${extra}`,
    diff:           `Analyze differences between:\n---A---\n${input}\n---B---\n${extra}`,
    classify:       `Classify this text into categories:\n"${input}"`,
    'extract-emails': `Extract emails from:\n${input}`,
    'extract-phones': `Extract phone numbers from:\n${input}`,
    'extract-dates': `Extract dates from:\n${input}`,
    names:          `Generate names for: ${input}${extra}`,
    ideas:          `Generate ideas about: ${input}${extra}`,
    usernames:      `Generate usernames for: ${input}${extra}`,
    nicknames:      `Create nicknames for: ${input}${extra}`,
    colors:         `Generate a color palette for: ${input}${extra}`,
    taglines:       `Create taglines for: ${input}`,
    'fake-data':    `Generate fake data of type: ${input}${extra}`,
    roast:          `Roast: ${input}`,
    compliment:     `Give a compliment about: ${input}`,
    trivia:         `Generate trivia about: ${input}${extra}`,
    define:         `Define: ${input}`,
    synonyms:       `Give synonyms for: ${input}`,
    antonyms:       `Give antonyms for: ${input}`,
    translate:      `Translate to ${extra || 'English'}:\n${input}`,
    grammar:        `Correct the grammar of:\n${input}`,
    etymology:      `Explain the etymology of: ${input}`,
    math:           `Solve: ${input}`,
    history:        `Explain: ${input}`,
    science:        `Explain: ${input}`,
    quiz:           `Create a quiz about: ${input}${extra}`,
    'format-json':  `Format this JSON:\n${input}\n\nOutput ONLY the formatted JSON.`,
    'format-markdown': `Apply Markdown to:\n${input}\n\nOutput ONLY the markdown-formatted text.`,
    'format-csv':   `Convert to CSV:\n${input}\n\nOutput ONLY the CSV.`,
    minify:         `Minify:\n${input}\n\nOutput ONLY the minified code.`,
    escape:         `Escape (${extra || 'html'}):\n${input}\n\nOutput ONLY the escaped text.`,
    unescape:       `Unescape:\n${input}\n\nOutput ONLY the unescaped text.`,
    encode:         `Base64 encode:\n${input}\n\nOutput ONLY the encoded string.`,
    decode:         `Base64 decode:\n${input}\n\nOutput ONLY the decoded string.`,
    roleplay:       `Portray ${extra || 'a character'}. ${input}`,
    interview:      `Interview me about: ${input}`,
    debate:         `Debate: ${input} (stance: ${extra || 'neutral'})`,
    brainstorm:     `Brainstorm about: ${input}${extra}`,
    advice:         `I need advice on: ${input}`,
    adventure:      `${input}\n\n(Continue the interactive adventure)`,
    persona:        `Act as: ${extra || 'a wise person'}. ${input}`,
    meditate:       'Guide me in a meditation. Theme: ' + input,
    journal:        `Help me reflect on: ${input}`,
    coach:          `I want to improve at: ${input}. Guide me as a coach.`,
    react:          `Respond to this: ${input}`,
    paraphrase:     `Paraphrase this:\n${input}`,
    discuss:        `Discuss this topic: ${input}`,
    outline:        `Create an outline for: ${input}`,
    bio:            `Write a bio for: ${input}`,
    comment:        `Add comments to this code:\n\`\`\`\n${input}\n\`\`\``,
    fix:            `Fix issues in this code:\n\`\`\`\n${input}\n\`\`\``,
    summary:        `Summarize this text:\n\n${input}`,
    readability:    `Analyze the readability of:\n${input}`,
    hashtags:       `Generate hashtags for: ${input}`,
    joke:           `${input || 'Tell me a random joke'}`,
    fact:           `${input ? `Tell me an interesting fact about: ${input}` : 'Tell me a random interesting fact'}`,
    'how-to':       `How do I: ${input}`,
    hash:           `Hash this text:\n${input}\n\nOutput ONLY the MD5, SHA-1, and SHA-256 hashes.`,
    case:           `Convert case for:\n${input}`,
    color:          `Analyze this color: ${input}`,
    count:          `Count statistics for:\n${input}\n\nOutput ONLY the numbers.`,
    'bible-book':   `Give me an overview of the Bible book: ${input}`,
    'bible-search': `Search the Bible for verses about: ${input}\n\nFor each verse, show the book, chapter:verse, and the text. Group by theme.`,
  };

  return templates[feature] || input;
}

/** Call DeepSeek API */
export async function askDeepSeek(systemPrompt, userPrompt, opts = {}) {
  try {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(opts.history || []),
      { role: 'user', content: userPrompt },
    ];

    const response = await client.chat.completions.create({
      model: opts.model || config.deepseek.model,
      messages,
      max_tokens: opts.maxTokens || config.deepseek.maxTokens,
      temperature: opts.temperature ?? config.deepseek.temperature,
    });

    // Check for content filter finish reason
    const finishReason = response.choices[0]?.finish_reason;
    if (finishReason === 'content_filter') {
      trackError('Content filter blocked response');
      const msg = '⚠️ **Content Filtered**\n\nThe AI provider blocked this request due to its automated content safety filter. This can happen with religious texts, literature, or historical documents that contain mature themes — even in legitimate academic contexts. Try rephrasing with "please quote" or "what does this passage say."';
      return { content: msg, usage: response.usage || null, model: response.model, filtered: true };
    }

    const tokens = response.usage?.total_tokens || 0;
    trackApiCall(tokens);

    return {
      content: response.choices[0]?.message?.content || '',
      usage: response.usage || null,
      model: response.model,
    };
  } catch (err) {
    // Detect content moderation / safety filter errors
    const msg = String(err.message || '');
    const status = err.status || err.statusCode || 0;
    const isContentFilter =
      status === 400 && (msg.includes('content') || msg.includes('safety') || msg.includes('filter') || msg.includes('moderation') || msg.includes('inappropriate') || msg.includes('explicit') || msg.includes('policy')) ||
      status === 403 ||
      msg.includes('content_filter') ||
      msg.includes('safety') ||
      msg.includes('not allowed');

    if (isContentFilter) {
      console.error('DeepSeek content filter:', msg);
      trackError('Content filter: ' + msg.slice(0, 80));
      return {
        content: '⚠️ **Content Filtered**\n\nThe AI provider\'s automated safety filter blocked this request. This often happens with religious passages (like the Bible), classic literature, or historical texts that contain mature themes.\n\n**Try:**\n• Phrase it as a study request: "Please provide the text of..."\n• Ask for scholarly context around the passage\n• Use the exact book/chapter/verse reference',
        usage: null,
        model: null,
        filtered: true,
      };
    }

    console.error('DeepSeek API error:', err.message);
    trackError();
    throw new Error(`DeepSeek API error: ${err.message}`);
  }
}

/** Quick single-call */
export async function quickAsk(feature, input, extra, opts = {}) {
  const system = buildSystemPrompt(feature);
  const prompt = buildPrompt(feature, input, extra);
  return askDeepSeek(system, prompt, opts);
}
