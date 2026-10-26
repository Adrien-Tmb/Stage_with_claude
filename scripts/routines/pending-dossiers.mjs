#!/usr/bin/env node
// Offres qui méritent un dossier de candidature et n'en ont pas encore, avec tout le contexte
// nécessaire à la rédaction (CV, exemples de lettres, compétences couvertes / manquantes).
// Usage : node scripts/routines/pending-dossiers.mjs [--limit 4] [--min-match 60] [--ids off_r1,off_r2]

import { DEFAULT_PROFILE, DEFAULT_SETTINGS, loadDossiers, loadOffers, matchFor } from './lib.mjs';
import { targetCompany } from '../../src/data/targetCompanies.js';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const limit = Number(arg('limit', 4));
const minMatch = Number(arg('min-match', 60));
const ids = arg('ids', '')?.split(',').filter(Boolean) ?? [];

const priority = (o) => o.match.score + (o.target ? { 1: 15, 2: 10, 3: 5 }[o.target.tier] : 0);

const { offers } = loadOffers();
const { dossiers } = loadDossiers();
const done = new Set(Object.values(dossiers).flatMap((d) => [d.offerId, d.fingerprint]));

const candidates = offers
  .filter((o) => !o.closedAt && (!o.expiresAt || new Date(o.expiresAt) > new Date()))
  .filter((o) => (ids.length ? ids.includes(o.id) : !done.has(o.id) && !done.has(o.fingerprint)))
  .map((o) => ({ ...o, match: matchFor(o), target: targetCompany(o.company) }))
  .filter((o) => ids.length || o.match.score >= minMatch)
  // Entreprises cibles d'Adrien d'abord (groupe 1 > 2 > 3), puis meilleur match.
  .sort((a, b) => priority(b) - priority(a) || (b.postedAt ?? '').localeCompare(a.postedAt ?? ''))
  .slice(0, ids.length ? ids.length : limit);

const p = DEFAULT_PROFILE;
console.log(JSON.stringify({
  profile: {
    name: `${p.firstName} ${p.lastName}`,
    headline: p.headline,
    school: p.school,
    program: p.program,
    level: p.level,
    home: p.home.label,
    linkedin: p.linkedin,
    availability: p.availability,
    languages: p.languages,
    cvText: p.cvText,
  },
  letterExamples: DEFAULT_SETTINGS.ai.examples,
  alreadyDone: Object.keys(dossiers).length,
  offers: candidates.map((o) => ({
    id: o.id, fingerprint: o.fingerprint, title: o.title, company: o.company, companyType: o.companyType,
    city: o.location.city, country: o.location.country, language: o.language, sector: o.sector, level: o.level,
    duration: o.durationLabel ?? o.durationMonths, start: o.startLabel ?? o.startDate, url: o.url,
    summary: o.summary, description: o.description, match: o.match,
    targetCompany: o.target ? `groupe ${o.target.tier}, n° ${o.target.rank + 1}` : null,
  })),
}, null, 2));
