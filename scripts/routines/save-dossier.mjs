#!/usr/bin/env node
// Valide un (ou plusieurs) dossier(s) de candidature rédigé(s) par Claude et l'ajoute à public/data/dossiers.json.
// Usage : node scripts/routines/save-dossier.mjs dossier.json
// Format : voir routines/DOSSIERS.md (cv en Markdown, lettre, e-mail, cvChanges, keywords, interview).

import { readFileSync } from 'node:fs';
import { DOSSIERS_FILE, loadDossiers, loadOffers, writeJson } from './lib.mjs';

const file = process.argv[2];
if (!file) {
  console.error('Usage : node scripts/routines/save-dossier.mjs <dossier.json>');
  process.exit(1);
}
const input = JSON.parse(readFileSync(file, 'utf8'));
const list = Array.isArray(input) ? input : [input];
const store = loadDossiers();
const { offers } = loadOffers();
const now = new Date().toISOString();
const errors = [];
const saved = [];

function check(d) {
  const e = [];
  if (!d.offerId) e.push('offerId manquant');
  if (!['fr', 'en'].includes(d.lang)) e.push('lang doit valoir fr ou en');
  if (typeof d.cv !== 'string' || d.cv.length < 800 || !/^#\s/m.test(d.cv)) e.push('cv : Markdown complet attendu (titre « # Nom », ≥ 800 caractères)');
  if (typeof d.letter !== 'string' || d.letter.length < 700) e.push('letter : lettre complète attendue (≥ 700 caractères)');
  if (!Array.isArray(d.cvChanges) || d.cvChanges.length < 3 || d.cvChanges.some((c) => !c.section || !c.change)) e.push('cvChanges : ≥ 3 éléments { section, change, why }');
  if (!Array.isArray(d.keywords?.matched) || !Array.isArray(d.keywords?.missing)) e.push('keywords : { matched: [], missing: [] } attendu');
  if (!Array.isArray(d.interview) || d.interview.length < 8 || d.interview.some((q) => !q.q)) e.push('interview : ≥ 8 questions { category, q, hint }');
  if (/\[(à compléter|todo|xx+)\]/i.test(`${d.cv}\n${d.letter}`)) e.push('texte non finalisé (marqueurs à compléter)');
  return e;
}

for (const d of list) {
  const e = check(d);
  if (e.length) {
    errors.push({ offerId: d.offerId, errors: e });
    continue;
  }
  const offer = offers.find((o) => o.id === d.offerId);
  store.dossiers[d.offerId] = {
    offerId: d.offerId,
    fingerprint: d.fingerprint ?? offer?.fingerprint ?? null,
    title: d.title ?? offer?.title,
    company: d.company ?? offer?.company,
    url: d.url ?? offer?.url ?? null,
    lang: d.lang,
    generatedAt: now,
    request: d.request ?? null, // n° d'issue GitHub si demandé depuis l'app
    cv: d.cv.trim(),
    letter: d.letter.trim(),
    email: d.email?.trim() ?? null,
    cvChanges: d.cvChanges,
    keywords: { matched: d.keywords.matched, missing: d.keywords.missing, notes: d.keywords.notes ?? null },
    interview: d.interview,
  };
  saved.push(d.offerId);
}

if (saved.length) {
  store.updatedAt = now;
  writeJson(DOSSIERS_FILE, store);
}
console.log(JSON.stringify({ saved, errors, total: Object.keys(store.dossiers).length }, null, 2));
process.exit(errors.length ? 2 : 0);
