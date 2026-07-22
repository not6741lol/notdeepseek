/**
 * Extract text from NIV Bible PDF → structured verse-by-verse JSON.
 * Handles two-column PDF layout by splitting on X coordinate.
 * Run: node scripts/extract-niv.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PDF_PATH = path.join(__dirname, '..', 'bible_data', 'niv.pdf');
const OUT_JSON = path.join(__dirname, '..', 'bible_data', 'niv.json');
const OUT_TEXT = path.join(__dirname, '..', 'bible_data', 'niv_raw.txt');

// --- Canonical book order: Name → abbrev, with chapter counts ---
const BOOKS = [
  ['Genesis','gen',50],['Exodus','exo',40],['Leviticus','lev',27],['Numbers','num',36],
  ['Deuteronomy','deu',34],['Joshua','jos',24],['Judges','jdg',21],['Ruth','rut',4],
  ['1 Samuel','1sa',31],['2 Samuel','2sa',24],['1 Kings','1ki',22],['2 Kings','2ki',25],
  ['1 Chronicles','1ch',29],['2 Chronicles','2ch',36],['Ezra','ezr',10],['Nehemiah','neh',13],
  ['Esther','est',10],['Job','job',42],['Psalms','psa',150],['Proverbs','pro',31],
  ['Ecclesiastes','ecc',12],['Song of Songs','sng',8],['Isaiah','isa',66],['Jeremiah','jer',52],
  ['Lamentations','lam',5],['Ezekiel','ezk',48],['Daniel','dan',12],['Hosea','hos',14],
  ['Joel','jol',3],['Amos','amo',9],['Obadiah','oba',1],['Jonah','jon',4],['Micah','mic',7],
  ['Nahum','nah',3],['Habakkuk','hab',3],['Zephaniah','zep',3],['Haggai','hag',2],
  ['Zechariah','zec',14],['Malachi','mal',4],
  ['Matthew','mat',28],['Mark','mrk',16],['Luke','luk',24],['John','jhn',21],
  ['Acts','act',28],['Romans','rom',16],['1 Corinthians','1co',16],['2 Corinthians','2co',13],
  ['Galatians','gal',6],['Ephesians','eph',6],['Philippians','php',4],['Colossians','col',4],
  ['1 Thessalonians','1th',5],['2 Thessalonians','2th',3],['1 Timothy','1ti',6],['2 Timothy','2ti',4],
  ['Titus','tit',3],['Philemon','phm',1],['Hebrews','heb',13],['James','jas',5],
  ['1 Peter','1pe',5],['2 Peter','2pe',3],['1 John','1jn',5],['2 John','2jn',1],
  ['3 John','3jn',1],['Jude','jud',1],['Revelation','rev',22],
];
const BOOK_ORDER = {};
for (const [name, abbr] of BOOKS) BOOK_ORDER[name] = abbr;

// Also handle alternate names from the PDF
BOOK_ORDER['1st Samuel'] = '1sa'; BOOK_ORDER['2nd Samuel'] = '2sa';
BOOK_ORDER['1st Kings'] = '1ki'; BOOK_ORDER['2nd Kings'] = '2ki';
BOOK_ORDER['1st Chronicles'] = '1ch'; BOOK_ORDER['2nd Chronicles'] = '2ch';
BOOK_ORDER['1st Corinthians'] = '1co'; BOOK_ORDER['2nd Corinthians'] = '2co';
BOOK_ORDER['1st Thessalonians'] = '1th'; BOOK_ORDER['2nd Thessalonians'] = '2th';
BOOK_ORDER['1st Timothy'] = '1ti'; BOOK_ORDER['2nd Timothy'] = '2ti';
BOOK_ORDER['1st Peter'] = '1pe'; BOOK_ORDER['2nd Peter'] = '2pe';
BOOK_ORDER['1st John'] = '1jn'; BOOK_ORDER['2nd John'] = '2jn'; BOOK_ORDER['3rd John'] = '3jn';

async function main() {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

  console.log('📖 Loading PDF...');
  const data = new Uint8Array(fs.readFileSync(PDF_PATH));
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const totalPages = doc.numPages;
  console.log(`   ${totalPages} pages`);

  let fullText = '';

  for (let i = 1; i <= totalPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();

    if (content.items.length === 0) continue;

    // Detect columns: find the X midpoint of all text
    const xs = content.items.map(it => it.transform[4]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const midX = (minX + maxX) / 2;

    // Separate left and right column items
    const leftItems = content.items.filter(it => it.transform[4] < midX);
    const rightItems = content.items.filter(it => it.transform[4] >= midX);

    // If >60% of items are on one side, it's single-column
    const ratio = leftItems.length / content.items.length;
    const isTwoCol = ratio > 0.25 && ratio < 0.75;

    if (isTwoCol) {
      fullText += columnToText(leftItems) + '\n';
      fullText += columnToText(rightItems) + '\n';
    } else {
      fullText += columnToText(content.items) + '\n';
    }

    if (i % 200 === 0) console.log(`   Page ${i}/${totalPages}...`);
  }

  console.log(`   Extracted ${fullText.length.toLocaleString()} chars`);
  fs.writeFileSync(OUT_TEXT, fullText);
  console.log(`   Raw text → ${OUT_TEXT}`);

  // Parse
  const books = parseNIV(fullText);
  fs.writeFileSync(OUT_JSON, JSON.stringify(books));
  console.log(`📦 ${books.length} books → ${OUT_JSON}`);

  const totalVerses = books.reduce((s, b) => s + b.verses, 0);
  console.log(`   Total verses: ${totalVerses.toLocaleString()}`);

  // Verify Ezekiel 23:20
  const ezk = books.find(b => b.abbrev === 'ezk');
  if (ezk && ezk.chapters[22] && ezk.chapters[22][19]) {
    console.log('\n✅ Ezekiel 23:20 (NIV):');
    console.log('   ' + ezk.chapters[22][19]);
  }

  // Print coverage
  console.log('\n📊 Book coverage:');
  for (const b of books) {
    const chCount = b.chapters.filter(ch => ch && ch.length > 0).length;
    const expected = BOOKS.find(([,a]) => a === b.abbrev)?.[2] || '?';
    console.log(`   ${b.name.padEnd(22)} ch:${chCount}/${expected} vs:${b.verses}`);
  }
}

function columnToText(items) {
  const byY = new Map();
  for (const it of items) {
    const y = Math.round(it.transform[5]);
    if (!byY.has(y)) byY.set(y, []);
    byY.get(y).push(it);
  }
  const sortedYs = [...byY.keys()].sort((a, b) => b - a);
  let text = '';
  for (const y of sortedYs) {
    const lineItems = byY.get(y).sort((a, b) => a.transform[4] - b.transform[4]);
    text += lineItems.map(it => it.str).join('') + '\n';
  }
  return text;
}

// ── Parse single-column text into books/chapters/verses ──
function parseNIV(text) {
  const books = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  let currentBook = null;
  let currentChapter = -1;
  let pendingVerse = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // ── Book title on its own line ──
    const abbrev = BOOK_ORDER[line];
    if (abbrev && (line.length > 3 || ['Job','Ruth','Joel','Amos','Jonah','Micah','Nahum','Habakkuk','Haggai','Ezra','Esther','Titus','Jude','John','Mark','Luke','Acts','James'].includes(line))) {
      if (!currentBook || currentBook.abbrev !== abbrev) {
        currentBook = { abbrev, name: line, chapters: [] };
        books.push(currentBook);
      }
      currentChapter = -1;
      pendingVerse = null;
      continue;
    }

    if (!currentBook) continue;

    // ── Chapter number on its own line ──
    const chapMatch = line.match(/^(\d{1,3})$/);
    if (chapMatch) {
      const num = parseInt(chapMatch[1]);
      if (num >= 1 && num <= 150) {
        currentChapter = num;
        while (currentBook.chapters.length < currentChapter) {
          currentBook.chapters.push([]);
        }
        pendingVerse = null;
        continue;
      }
    }

    if (currentChapter <= 0) continue;

    // ── Verse lines: may start with verse number, or continue previous verse ──
    const verseStart = line.match(/^(\d{1,3})([A-Za-z"“‘].*)$/);
    if (verseStart) {
      const vs = parseInt(verseStart[1]);
      const txt = verseStart[2];
      if (vs >= 1 && vs <= 200 && txt.length > 2) {
        const chIdx = currentChapter - 1;
        if (currentBook.chapters[chIdx]) {
          while (currentBook.chapters[chIdx].length < vs) {
            currentBook.chapters[chIdx].push('');
          }
          currentBook.chapters[chIdx][vs - 1] = txt;
          pendingVerse = vs;
        }
        continue;
      }
    }

    // ── Continuation of a verse (no leading number) ──
    if (pendingVerse && currentBook.chapters[currentChapter - 1]) {
      const chIdx = currentChapter - 1;
      const vsIdx = pendingVerse - 1;
      if (currentBook.chapters[chIdx][vsIdx]) {
        currentBook.chapters[chIdx][vsIdx] += ' ' + line;
      }
    }
  }

  // Clean up
  for (const book of books) {
    book.chapters = book.chapters.map(ch => (ch || []).map(v => v || '').filter(Boolean));
    book.chapters = book.chapters.filter(ch => ch.length > 0);
    book.verses = book.chapters.reduce((sum, ch) => sum + ch.length, 0);
  }

  return books.filter(b => b.verses > 0);
}

main().catch(e => {
  console.error('❌', e.message);
  console.error(e.stack);
  process.exit(1);
});
