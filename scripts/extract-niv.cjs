/**
 * Extract text from NIV Bible PDF → structured verse-by-verse JSON.
 * Run: node scripts/extract-niv.cjs
 *
 * Uses Mozilla pdfjs-dist for reliable text extraction.
 */
const fs = require('fs');
const path = require('path');

const PDF_PATH = path.join(__dirname, '..', 'bible_data', 'niv.pdf');
const OUT_JSON = path.join(__dirname, '..', 'bible_data', 'niv.json');
const OUT_TEXT = path.join(__dirname, '..', 'bible_data', 'niv_raw.txt');

async function main() {
  // Set up pdfjs worker
  const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
  pdfjsLib.GlobalWorkerOptions.workerSrc = null; // disable worker

  console.log('📖 Loading PDF...');
  const data = new Uint8Array(fs.readFileSync(PDF_PATH));
  const doc = await pdfjsLib.getDocument({ data, disableAutoFetch: false }).promise;

  const totalPages = doc.numPages;
  console.log(`   ${totalPages} pages`);

  let fullText = '';

  for (let i = 1; i <= totalPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();

    // Build text from text items, preserving layout order
    const items = content.items.map(it => ({
      y: Math.round(it.transform[5]),
      x: Math.round(it.transform[4]),
      str: it.str + (it.hasEOL ? '\n' : ''),
    }));

    // Sort: y desc (top to bottom), x asc (left to right)
    items.sort((a, b) => b.y - a.y || a.x - b.x);

    let prevY = items[0]?.y;
    const lines = [];
    let currentLine = '';

    for (const item of items) {
      if (item.y !== prevY && currentLine) {
        lines.push(currentLine.trimEnd());
        currentLine = '';
      }
      currentLine += item.str;
      prevY = item.y;
    }
    if (currentLine) lines.push(currentLine.trimEnd());

    fullText += lines.join('\n') + '\n';

    if (i % 200 === 0) console.log(`   Page ${i}/${totalPages}...`);
  }

  console.log(`   Extracted ${fullText.length.toLocaleString()} chars`);

  // Save first chunk for debugging format
  fs.writeFileSync(OUT_TEXT, fullText);
  console.log(`   Raw text → ${OUT_TEXT}`);

  // Parse into verse-indexed JSON
  const books = parseNIV(fullText);
  fs.writeFileSync(OUT_JSON, JSON.stringify(books));
  console.log(`📦 ${books.length} books written → ${OUT_JSON}`);
}

// ── Parser: NIV Bible text → [{abbrev, name, chapters: [[v1,v2,...],...]}] ──
function parseNIV(text) {
  const books = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Common patterns in Bible PDF text:
  //   "Ezekiel 23" → new chapter
  //   "20 There she lusted..." → verse 20

  // But some books have the book name on one line, then chapter numbers
  // We'll use a state-machine approach

  let currentBook = null;      // { abbrev, name, chapters: [] }
  let currentChapter = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // ── Detect "BOOKNAME ChapterNumber" pattern ──
    // e.g., "Genesis 1", "1 Samuel 15", "Song of Songs 3"
    let bookMatch = line.match(/^([1-3]?\s?[A-Z][a-zA-Z]+(?:\s+(?:of\s+)?[A-Z][a-zA-Z]+)*)\s+(\d{1,3})$/);
    if (bookMatch) {
      const potentialBook = bookMatch[1].trim();
      const chapterNum = parseInt(bookMatch[2]);

      // Check if this looks like a real book name
      if (chapterNum > 0 && chapterNum <= 150 && BOOK_ORDER[potentialBook]) {
        if (!currentBook || currentBook.name !== potentialBook) {
          currentBook = {
            abbrev: BOOK_ORDER[potentialBook],
            name: potentialBook,
            chapters: [],
          };
          books.push(currentBook);
        }
        currentChapter = chapterNum;
        // Ensure chapter array
        while (currentBook.chapters.length < currentChapter) {
          currentBook.chapters.push([]);
        }
        continue;
      }
    }

    // ── Detect "Chapter N" on its own line ──
    let chapMatch = line.match(/^Chapter\s+(\d+)$/i);
    if (chapMatch && currentBook) {
      currentChapter = parseInt(chapMatch[1]);
      while (currentBook.chapters.length < currentChapter) {
        currentBook.chapters.push([]);
      }
      continue;
    }

    // ── Detect verse line: "N Text..." ──
    let verseMatch = line.match(/^(\d{1,3})\s+(.*)$/);
    if (verseMatch && currentBook && currentChapter > 0) {
      const vs = parseInt(verseMatch[1]);
      const txt = verseMatch[2].trim();
      const chIdx = currentChapter - 1;
      if (currentBook.chapters[chIdx] && vs >= 1 && vs <= 200) {
        // 0-indexed verses in array
        while (currentBook.chapters[chIdx].length < vs - 1) {
          currentBook.chapters[chIdx].push(''); // gap filler
        }
        currentBook.chapters[chIdx][vs - 1] = txt;
        continue;
      }
    }
  }

  // Clean: remove empty trailing chapters
  for (const book of books) {
    while (book.chapters.length > 0 && (!book.chapters[book.chapters.length - 1] || book.chapters[book.chapters.length - 1].length === 0)) {
      book.chapters.pop();
    }
    // Remove empty leading chapters if any
    book.chapters = book.chapters.filter(ch => ch && ch.length > 0);

    // Count verses
    book.verses = book.chapters.reduce((sum, ch) => sum + (ch || []).length, 0);
  }

  return books.filter(b => b.verses > 0);
}

// ── Canonical book order map: Name → abbrev ──
const BOOK_ORDER = {
  'Genesis': 'gen', 'Exodus': 'exo', 'Leviticus': 'lev', 'Numbers': 'num',
  'Deuteronomy': 'deu', 'Joshua': 'jos', 'Judges': 'jdg', 'Ruth': 'rut',
  '1 Samuel': '1sa', '2 Samuel': '2sa', '1 Kings': '1ki', '2 Kings': '2ki',
  '1 Chronicles': '1ch', '2 Chronicles': '2ch', 'Ezra': 'ezr', 'Nehemiah': 'neh',
  'Esther': 'est', 'Job': 'job', 'Psalms': 'psa', 'Psalm': 'psa',
  'Proverbs': 'pro', 'Ecclesiastes': 'ecc', 'Song of Songs': 'sng', 'Song of Solomon': 'sng',
  'Isaiah': 'isa', 'Jeremiah': 'jer', 'Lamentations': 'lam',
  'Ezekiel': 'ezk', 'Daniel': 'dan', 'Hosea': 'hos', 'Joel': 'jol',
  'Amos': 'amo', 'Obadiah': 'oba', 'Jonah': 'jon', 'Micah': 'mic',
  'Nahum': 'nah', 'Habakkuk': 'hab', 'Zephaniah': 'zep', 'Haggai': 'hag',
  'Zechariah': 'zec', 'Malachi': 'mal',
  'Matthew': 'mat', 'Mark': 'mrk', 'Luke': 'luk', 'John': 'jhn',
  'Acts': 'act', 'Romans': 'rom', '1 Corinthians': '1co', '2 Corinthians': '2co',
  'Galatians': 'gal', 'Ephesians': 'eph', 'Philippians': 'php', 'Colossians': 'col',
  '1 Thessalonians': '1th', '2 Thessalonians': '2th',
  '1 Timothy': '1ti', '2 Timothy': '2ti',
  'Titus': 'tit', 'Philemon': 'phm', 'Hebrews': 'heb',
  'James': 'jas', '1 Peter': '1pe', '2 Peter': '2pe',
  '1 John': '1jn', '2 John': '2jn', '3 John': '3jn',
  'Jude': 'jud', 'Revelation': 'rev',
};

main().catch(e => {
  console.error('❌', e.message);
  console.error(e.stack);
  process.exit(1);
});
