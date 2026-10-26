#!/usr/bin/env node
// Extrait le texte lisible d'une page d'annonce téléchargée avec curl (WebFetch ne passe pas par le proxy réseau).
// Usage : curl -sL -m 20 -o /tmp/page.html "<url>" && node scripts/routines/page-text.mjs /tmp/page.html [--max 6000]
// Une page « Security checkup », « Authenticating… », captcha ou un code 401/403 signifie que le site refuse les robots :
// on n'insiste pas et on garde les informations des résultats de recherche (verified: false).

import { readFileSync } from 'node:fs';

const [file, flag, max] = process.argv.slice(2);
if (!file) {
  console.error('Usage : node scripts/routines/page-text.mjs <page.html> [--max 6000]');
  process.exit(1);
}
const limit = flag === '--max' ? Number(max) : 6000;
const raw = readFileSync(file, 'utf8');
const title = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? '';
const decode = (s) => s
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
const text = decode(raw
  .replace(/<(script|style|svg|noscript)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<br\s*\/?>|<\/(p|li|h[1-6]|div|tr)>/gi, '\n')
  .replace(/<[^>]+>/g, ' '))
  .replace(/[ \t]+/g, ' ')
  .replace(/\n\s*\n+/g, '\n')
  .trim();
const blocked = /security checkup|authenticating|captcha|access denied|just a moment/i.test(`${title} ${text.slice(0, 400)}`);
console.log(JSON.stringify({ title: decode(title), blocked, length: text.length, text: text.slice(0, limit) }, null, 2));
