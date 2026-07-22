/**
 * Bible verse lookup via bible-api.com (free, no API key required).
 * Supports references like "Ezekiel 23:20", "John 3:16", "Genesis 1:1-5".
 * Also supports search, random verses, daily verses, and multi-translation comparison.
 */

const BASE = 'https://bible-api.com';

// Common Bible book name variations → canonical names bible-api.com understands
const BOOK_ALIASES = {
  gen: 'Genesis', ge: 'Genesis', gn: 'Genesis',
  ex: 'Exodus', exod: 'Exodus', exo: 'Exodus',
  lev: 'Leviticus', lv: 'Leviticus',
  num: 'Numbers', nm: 'Numbers', nu: 'Numbers',
  deut: 'Deuteronomy', dt: 'Deuteronomy', de: 'Deuteronomy',
  josh: 'Joshua', jos: 'Joshua', jsh: 'Joshua',
  judg: 'Judges', jdg: 'Judges', jgs: 'Judges',
  ruth: 'Ruth', rth: 'Ruth', ru: 'Ruth',
  '1sam': '1 Samuel', '1sm': '1 Samuel', '1s': '1 Samuel',
  '2sam': '2 Samuel', '2sm': '2 Samuel', '2s': '2 Samuel',
  '1kings': '1 Kings', '1kgs': '1 Kings', '1ki': '1 Kings',
  '2kings': '2 Kings', '2kgs': '2 Kings', '2ki': '2 Kings',
  '1chron': '1 Chronicles', '1chr': '1 Chronicles', '1ch': '1 Chronicles',
  '2chron': '2 Chronicles', '2chr': '2 Chronicles', '2ch': '2 Chronicles',
  ezra: 'Ezra', ezr: 'Ezra', ez: 'Ezra',
  neh: 'Nehemiah', ne: 'Nehemiah',
  esth: 'Esther', est: 'Esther', es: 'Esther',
  job: 'Job', jb: 'Job',
  ps: 'Psalms', psa: 'Psalms', psalm: 'Psalms',
  prov: 'Proverbs', pr: 'Proverbs', prv: 'Proverbs',
  eccl: 'Ecclesiastes', ecc: 'Ecclesiastes', ec: 'Ecclesiastes',
  song: 'Song of Solomon', sos: 'Song of Solomon', ss: 'Song of Solomon', 'song of songs': 'Song of Solomon',
  isa: 'Isaiah', is: 'Isaiah',
  jer: 'Jeremiah', je: 'Jeremiah', jr: 'Jeremiah',
  lam: 'Lamentations', la: 'Lamentations', lm: 'Lamentations',
  ezek: 'Ezekiel', eze: 'Ezekiel', ez: 'Ezekiel',
  dan: 'Daniel', da: 'Daniel', dn: 'Daniel',
  hos: 'Hosea', ho: 'Hosea',
  joel: 'Joel', jl: 'Joel',
  amos: 'Amos', am: 'Amos',
  obad: 'Obadiah', ob: 'Obadiah',
  jonah: 'Jonah', jon: 'Jonah', jnh: 'Jonah',
  mic: 'Micah', mc: 'Micah',
  nah: 'Nahum', na: 'Nahum',
  hab: 'Habakkuk', hb: 'Habakkuk',
  zeph: 'Zephaniah', zep: 'Zephaniah', zp: 'Zephaniah',
  hag: 'Haggai', hg: 'Haggai',
  zech: 'Zechariah', zec: 'Zechariah', zc: 'Zechariah',
  mal: 'Malachi', ml: 'Malachi',
  matt: 'Matthew', mt: 'Matthew', mat: 'Matthew',
  mark: 'Mark', mk: 'Mark', mrk: 'Mark',
  luke: 'Luke', lk: 'Luke', lu: 'Luke',
  john: 'John', jn: 'John', jhn: 'John',
  acts: 'Acts', ac: 'Acts', act: 'Acts',
  rom: 'Romans', rm: 'Romans', ro: 'Romans',
  '1cor': '1 Corinthians', '1co': '1 Corinthians',
  '2cor': '2 Corinthians', '2co': '2 Corinthians',
  gal: 'Galatians', ga: 'Galatians',
  eph: 'Ephesians', ep: 'Ephesians',
  phil: 'Philippians', php: 'Philippians', pp: 'Philippians',
  col: 'Colossians', co: 'Colossians',
  '1thess': '1 Thessalonians', '1th': '1 Thessalonians',
  '2thess': '2 Thessalonians', '2th': '2 Thessalonians',
  '1tim': '1 Timothy', '1ti': '1 Timothy',
  '2tim': '2 Timothy', '2ti': '2 Timothy',
  titus: 'Titus', tit: 'Titus', tt: 'Titus',
  philem: 'Philemon', phm: 'Philemon', pm: 'Philemon',
  heb: 'Hebrews', he: 'Hebrews',
  jas: 'James', jm: 'James', jam: 'James',
  '1pet': '1 Peter', '1pe': '1 Peter', '1pt': '1 Peter',
  '2pet': '2 Peter', '2pe': '2 Peter', '2pt': '2 Peter',
  '1john': '1 John', '1jn': '1 John',
  '2john': '2 John', '2jn': '2 John',
  '3john': '3 John', '3jn': '3 John',
  jude: 'Jude', jd: 'Jude',
  rev: 'Revelation', rv: 'Revelation', re: 'Revelation',
};

// Regex patterns to detect Bible verse references in text
// Matches: "Ezekiel 23:20", "John 3:16", "Genesis 1:1-5", "1 Kings 19:11"
const COLON_PATTERN = /\b((?:1|2|3)\s*)?([A-Za-z]+(?:\s+of\s+[A-Za-z]+)?)\s+(\d+)(?::(\d+)(?:[–\-](\d+))?)?\b/i;
// Matches: "Ezekiel chapter 23 verse 20", "John chapter 3", "1 Kings chapter 19 verse 11"
const VERBOSE_PATTERN = /\b((?:1|2|3)\s*)?([A-Za-z]+(?:\s+of\s+[A-Za-z]+)?)\s+chapter\s+(\d+)(?:\s+verse\s+(\d+)(?:[–\-](\d+))?)?\b/i;

// Words that are NOT book names when found by the regex
const NON_BOOK_WORDS = new Set(['chapter', 'verse', 'book', 'testament', 'bible', 'scripture', 'passage', 'text', 'reading']);

function resolveBook(prefix, bookRaw) {
  let bookKey = (prefix + bookRaw).toLowerCase().replace(/\s+/g, '');
  let book = BOOK_ALIASES[bookKey];
  if (!book && prefix) {
    bookKey = bookRaw.toLowerCase().replace(/\s+/g, '');
    book = BOOK_ALIASES[bookKey];
  }
  if (!book) {
    const titleCase = bookRaw.charAt(0).toUpperCase() + bookRaw.slice(1).toLowerCase();
    book = BOOK_ALIASES[titleCase.toLowerCase().replace(/\s+/g, '')];
    if (!book) {
      // Re-attach numeric prefix (e.g. "1" + "Corinthians" → "1 Corinthians")
      book = prefix ? `${prefix} ${titleCase}` : titleCase;
    }
  }
  // Reject if the resolved book is a non-book word
  if (book && NON_BOOK_WORDS.has(book.toLowerCase())) return null;
  return book;
}

/**
 * Try to parse a Bible verse reference from user input.
 * Supports: "Ezekiel 23:20", "John 3:16", "Genesis 1:1-5",
 *           "Ezekiel chapter 23 verse 20", "John chapter 3 verse 16"
 * Returns { book, chapter, verse, verseEnd } or null.
 */
export function parseVerseRef(input) {
  const cleaned = input.trim();

  // Try verbose format first (more specific, won't false-match "chapter 23")
  let match = cleaned.match(VERBOSE_PATTERN);

  if (match) {
    const prefix = (match[1] || '').trim();
    const bookRaw = (match[2] || '').trim();
    const chapter = parseInt(match[3]);
    const verse = match[4] ? parseInt(match[4]) : null;
    const verseEnd = match[5] ? parseInt(match[5]) : null;
    if (chapter >= 1 && chapter <= 150 && (verse === null || (verse >= 1 && verse <= 176))) {
      const book = resolveBook(prefix, bookRaw);
      if (book) return { book, chapter, verse, verseEnd };
    }
  }

  // Try colon format: "Ezekiel 23:20", "John 3:16"
  match = cleaned.match(COLON_PATTERN);
  if (match) {
    const prefix = (match[1] || '').trim();
    const bookRaw = (match[2] || '').trim();
    const chapter = parseInt(match[3]);
    const verse = match[4] ? parseInt(match[4]) : null;
    const verseEnd = match[5] ? parseInt(match[5]) : null;
    if (chapter >= 1 && chapter <= 150 && (verse === null || (verse >= 1 && verse <= 176))) {
      const book = resolveBook(prefix, bookRaw);
      if (book) return { book, chapter, verse, verseEnd };
    }
  }

  return null;
}

/**
 * Fetch a Bible verse from bible-api.com.
 * @param {string} book - Book name (e.g. "Ezekiel")
 * @param {number} chapter
 * @param {number|null} verse
 * @param {number|null} verseEnd
 * @param {string} translation - e.g. "kjv", "web", "almeida"
 * @returns {object} { text, reference, verses, translation }
 */
export async function fetchVerse(book, chapter, verse, verseEnd, translation = 'web') {
  let ref;
  if (verse && verseEnd && verseEnd > verse) {
    ref = `${encodeURIComponent(book)}+${chapter}:${verse}-${verseEnd}`;
  } else if (verse) {
    ref = `${encodeURIComponent(book)}+${chapter}:${verse}`;
  } else {
    ref = `${encodeURIComponent(book)}+${chapter}`;
  }

  const url = `${BASE}/${ref}?translation=${translation}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    if (resp.status === 404) return null; // verse not found
    throw new Error(`Bible API returned ${resp.status}`);
  }

  const data = await resp.json();
  return {
    text: data.text?.trim() || '',
    reference: data.reference || `${book} ${chapter}:${verse || ''}`,
    verses: data.verses || [],
    translation: data.translation_name || translation,
  };
}

/**
 * Format verse data into a Discord-friendly message.
 */
export function formatVerse(data) {
  if (!data) return null;
  const cleanText = data.text
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return {
    reference: data.reference,
    translation: data.translation,
    text: cleanText,
    verseCount: data.verses?.length || 1,
  };
}

/**
 * Check if user input looks like a Bible verse request and try to fetch it.
 * Returns formatted verse data, or null if not a verse request or not found.
 */
export async function tryBibleLookup(input) {
  const ref = parseVerseRef(input);
  if (!ref || !ref.verse) return null; // require at least book+chapter+verse

  try {
    const data = await fetchVerse(ref.book, ref.chapter, ref.verse, ref.verseEnd);
    return formatVerse(data);
  } catch {
    return null;
  }
}

// ── Curated memorable verses for random/daily features ──
const MEMORABLE_VERSES = [
  { book: 'John', chapter: 3, verse: 16 },
  { book: 'Psalm', chapter: 23, verse: 1 },
  { book: 'Psalm', chapter: 23, verse: 4 },
  { book: 'Psalm', chapter: 119, verse: 105 },
  { book: 'Psalm', chapter: 46, verse: 10 },
  { book: 'Psalm', chapter: 121, verse: 1 },
  { book: 'Psalm', chapter: 91, verse: 1 },
  { book: 'Psalm', chapter: 27, verse: 1 },
  { book: 'Psalm', chapter: 37, verse: 4 },
  { book: 'Proverbs', chapter: 3, verse: 5 },
  { book: 'Proverbs', chapter: 3, verse: 6 },
  { book: 'Proverbs', chapter: 27, verse: 17 },
  { book: 'Proverbs', chapter: 22, verse: 6 },
  { book: 'Isaiah', chapter: 40, verse: 31 },
  { book: 'Isaiah', chapter: 41, verse: 10 },
  { book: 'Isaiah', chapter: 55, verse: 8 },
  { book: 'Jeremiah', chapter: 29, verse: 11 },
  { book: 'Matthew', chapter: 5, verse: 14 },
  { book: 'Matthew', chapter: 6, verse: 33 },
  { book: 'Matthew', chapter: 11, verse: 28 },
  { book: 'Matthew', chapter: 22, verse: 39 },
  { book: 'Matthew', chapter: 28, verse: 19 },
  { book: 'Luke', chapter: 2, verse: 10 },
  { book: 'John', chapter: 1, verse: 1 },
  { book: 'John', chapter: 1, verse: 14 },
  { book: 'John', chapter: 8, verse: 32 },
  { book: 'John', chapter: 10, verse: 10 },
  { book: 'John', chapter: 11, verse: 25 },
  { book: 'John', chapter: 14, verse: 6 },
  { book: 'John', chapter: 14, verse: 27 },
  { book: 'John', chapter: 15, verse: 13 },
  { book: 'John', chapter: 16, verse: 33 },
  { book: 'Romans', chapter: 3, verse: 23 },
  { book: 'Romans', chapter: 6, verse: 23 },
  { book: 'Romans', chapter: 8, verse: 28 },
  { book: 'Romans', chapter: 8, verse: 38 },
  { book: 'Romans', chapter: 12, verse: 2 },
  { book: '1 Corinthians', chapter: 13, verse: 4 },
  { book: '1 Corinthians', chapter: 13, verse: 13 },
  { book: '1 Corinthians', chapter: 16, verse: 14 },
  { book: '2 Corinthians', chapter: 5, verse: 17 },
  { book: '2 Corinthians', chapter: 9, verse: 7 },
  { book: 'Galatians', chapter: 5, verse: 22 },
  { book: 'Ephesians', chapter: 2, verse: 8 },
  { book: 'Ephesians', chapter: 2, verse: 9 },
  { book: 'Ephesians', chapter: 3, verse: 20 },
  { book: 'Ephesians', chapter: 6, verse: 11 },
  { book: 'Philippians', chapter: 4, verse: 6 },
  { book: 'Philippians', chapter: 4, verse: 13 },
  { book: 'Colossians', chapter: 3, verse: 23 },
  { book: '1 Thessalonians', chapter: 5, verse: 16 },
  { book: '1 Thessalonians', chapter: 5, verse: 18 },
  { book: '2 Timothy', chapter: 1, verse: 7 },
  { book: '2 Timothy', chapter: 3, verse: 16 },
  { book: 'Hebrews', chapter: 11, verse: 1 },
  { book: 'Hebrews', chapter: 13, verse: 8 },
  { book: 'James', chapter: 1, verse: 2 },
  { book: 'James', chapter: 1, verse: 22 },
  { book: '1 Peter', chapter: 5, verse: 7 },
  { book: '1 John', chapter: 4, verse: 8 },
  { book: '1 John', chapter: 4, verse: 19 },
  { book: 'Revelation', chapter: 21, verse: 4 },
  { book: 'Revelation', chapter: 22, verse: 20 },
  { book: 'Genesis', chapter: 1, verse: 1 },
  { book: 'Exodus', chapter: 20, verse: 12 },
  { book: 'Joshua', chapter: 1, verse: 9 },
  { book: '1 Samuel', chapter: 15, verse: 22 },
  { book: 'Job', chapter: 1, verse: 21 },
  { book: 'Psalm', chapter: 1, verse: 1 },
  { book: 'Psalm', chapter: 19, verse: 1 },
  { book: 'Psalm', chapter: 34, verse: 8 },
  { book: 'Psalm', chapter: 51, verse: 10 },
  { book: 'Psalm', chapter: 100, verse: 1 },
  { book: 'Psalm', chapter: 139, verse: 14 },
  { book: 'Psalm', chapter: 150, verse: 6 },
  { book: 'Ecclesiastes', chapter: 3, verse: 1 },
  { book: 'Ecclesiastes', chapter: 12, verse: 13 },
  { book: 'Isaiah', chapter: 9, verse: 6 },
  { book: 'Isaiah', chapter: 53, verse: 5 },
  { book: 'Lamentations', chapter: 3, verse: 22 },
  { book: 'Daniel', chapter: 3, verse: 17 },
  { book: 'Micah', chapter: 6, verse: 8 },
  { book: 'Matthew', chapter: 5, verse: 16 },
  { book: 'Matthew', chapter: 7, verse: 7 },
  { book: 'Matthew', chapter: 6, verse: 34 },
  { book: 'Luke', chapter: 1, verse: 37 },
  { book: 'Romans', chapter: 5, verse: 8 },
  { book: 'Romans', chapter: 12, verse: 21 },
  { book: 'Romans', chapter: 15, verse: 13 },
  { book: '1 Corinthians', chapter: 10, verse: 13 },
  { book: '1 Corinthians', chapter: 15, verse: 57 },
  { book: 'Philippians', chapter: 4, verse: 19 },
  { book: '2 Timothy', chapter: 4, verse: 7 },
  { book: 'James', chapter: 5, verse: 16 },
  { book: '1 Peter', chapter: 3, verse: 15 },
  { book: '1 John', chapter: 1, verse: 9 },
  { book: 'Revelation', chapter: 3, verse: 20 },
];

const TRANSLATION_NAMES = {
  web: 'World English Bible',
  kjv: 'King James Version',
  almeida: 'Almeida (Portuguese)',
  rccv: 'Romanian Corrected Cornilescu Version',
  bbe: 'Bible in Basic English',
  oeb: 'Open English Bible (US)',
};

const TRANSLATION_KEYS = Object.keys(TRANSLATION_NAMES);

/**
 * Fetch a random Bible verse from a curated collection of memorable verses.
 * @param {string} translation - e.g. "web", "kjv"
 * @returns {object|null} Verse data or null
 */
export async function fetchRandomVerse(translation = 'web') {
  const ref = MEMORABLE_VERSES[Math.floor(Math.random() * MEMORABLE_VERSES.length)];
  return fetchVerse(ref.book, ref.chapter, ref.verse, null, translation);
}

/**
 * Fetch a daily verse seeded by today's date.
 * @param {string} translation - e.g. "web", "kjv"
 * @returns {object|null} Verse data or null
 */
export async function fetchDailyVerse(translation = 'web') {
  const now = new Date();
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  const index = dayOfYear % MEMORABLE_VERSES.length;
  const ref = MEMORABLE_VERSES[index];
  return fetchVerse(ref.book, ref.chapter, ref.verse, null, translation);
}

/**
 * Search Bible for verses containing a keyword or phrase.
 * @param {string} keyword - Word or phrase to search for
 * @param {string} translation - e.g. "web", "kjv"
 * @returns {object|null} { results: [...], total: number } or null
 */
export async function searchVerses(keyword, translation = 'web') {
  const url = `${BASE}/?search=${encodeURIComponent(keyword)}&translation=${translation}`;
  const resp = await fetch(url);
  if (!resp.ok) return null;
  const data = await resp.json();
  if (!data.results || data.results.length === 0) return null;
  return {
    results: data.results.slice(0, 20), // cap at 20 results
    total: data.total || data.results.length,
    keyword,
    translation,
  };
}

/**
 * Format search results into a readable text block.
 */
export function formatSearchResults(data) {
  if (!data || !data.results) return null;
  const lines = data.results.map((v, i) =>
    `**${v.book} ${v.chapter}:${v.verse}** — ${v.text.trim()}`
  );
  return {
    text: lines.slice(0, 15).join('\n\n') + (data.total > 15 ? `\n\n_… and ${data.total - 15} more results_` : ''),
    total: data.total,
    keyword: data.keyword,
    translation: data.translation,
  };
}

/**
 * Fetch the same passage in up to 3 translations for comparison.
 * @returns {object|null} { reference, verses: [{ translation, name, text }], ... }
 */
export async function fetchCompareVerses(book, chapter, verse, verseEnd, translations = ['web', 'kjv']) {
  const ref = (verse && verseEnd && verseEnd > verse)
    ? `${encodeURIComponent(book)}+${chapter}:${verse}-${verseEnd}`
    : `${encodeURIComponent(book)}+${chapter}:${verse || 1}`;

  const results = await Promise.allSettled(
    translations.slice(0, 3).map(async (t) => {
      const url = `${BASE}/${ref}?translation=${t}`;
      const resp = await fetch(url);
      if (!resp.ok) return null;
      const data = await resp.json();
      return {
        translation: t,
        name: TRANSLATION_NAMES[t] || t,
        text: (data.text || '').trim(),
        reference: data.reference || ref,
      };
    })
  );

  const verses = results
    .filter(r => r.status === 'fulfilled' && r.value)
    .map(r => r.value);

  if (verses.length === 0) return null;

  return {
    reference: verses[0].reference,
    verses,
    count: verses.length,
    translations: verses.map(v => v.name).join(', '),
  };
}

export { TRANSLATION_NAMES, TRANSLATION_KEYS };
