import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Get a localized string by key (English only) */
export function t(key) {
  return key; // returns the key itself as a simple label
}

/** Thinking messages (English) */
export function getThinkingMessage() {
  const msgs = [
    '🤔 Thinking...',
    '🧠 Processing...',
    '✨ Generating...',
    '🔍 Analyzing...',
    '⚡ Computing...',
  ];
  return msgs[Math.floor(Math.random() * msgs.length)];
}
