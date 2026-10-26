#!/usr/bin/env node
// Fusionne le résultat d'une collecte dans public/data/offers.json.
// Usage : node scripts/routines/merge-offers.mjs collecte.json [--dry-run]
// Entrée : { "offers": [candidats], "closed": [{ "id": "off_r…", "reason": "…" }],
//          "updates": [{ "id": "off_r…", "url": "lien direct", "notes": "…", "verified": true }], "queries": 42, "note": "…" }
// Sortie (stdout) : bilan JSON — ajoutées, doublons, rejetées (avec raison), closes.

import { readFileSync } from 'node:fs';
import { loadOffers, normalizeCandidate, writeJson, OFFERS_FILE } from './lib.mjs';

const [file, ...flags] = process.argv.slice(2);
if (!file) {
  console.error('Usage : node scripts/routines/merge-offers.mjs <collecte.json> [--dry-run]');
  process.exit(1);
}
const input = JSON.parse(readFileSync(file, 'utf8'));
const data = loadOffers();
const now = new Date();
const byFp = new Map(data.offers.map((o) => [o.fingerprint, o]));
const byId = new Map(data.offers.map((o) => [o.id, o]));

const report = { added: [], duplicates: [], rejected: [], closed: [], updated: [] };

for (const cand of input.offers ?? []) {
  const { offer, reason } = normalizeCandidate(cand, now);
  if (!offer) {
    report.rejected.push({ title: cand.title, company: cand.company, reason });
    continue;
  }
  const existing = byFp.get(offer.fingerprint);
  if (existing) {
    // Déjà connue (même entreprise + intitulé + ville) : on note qu'elle est toujours en ligne
    // et on complète les champs restés vides, sans dupliquer.
    existing.lastSeenAt = now.toISOString();
    for (const k of ['durationMonths', 'durationLabel', 'startDate', 'startLabel', 'stipend', 'expiresAt', 'level', 'remote']) {
      if (existing[k] == null && offer[k] != null) existing[k] = offer[k];
    }
    if (offer.verified) existing.verified = true;
    if ((offer.description?.length ?? 0) > (existing.description?.length ?? 0)) {
      existing.description = offer.description;
      existing.requirements = offer.requirements;
    }
    report.duplicates.push({ id: existing.id, title: existing.title, company: existing.company });
    continue;
  }
  data.offers.push(offer);
  byFp.set(offer.fingerprint, offer);
  byId.set(offer.id, offer);
  report.added.push({ id: offer.id, title: offer.title, company: offer.company, city: offer.location.city });
}

for (const c of input.closed ?? []) {
  const o = byId.get(c.id) ?? byFp.get(c.fingerprint);
  if (!o || o.closedAt) continue;
  o.closedAt = now.toISOString();
  o.closedReason = c.reason ?? 'annonce retirée';
  report.closed.push({ id: o.id, title: o.title, company: o.company, reason: o.closedReason });
}

// Mises à jour d'offres existantes : lien direct trouvé, note, vérification.
const UPDATABLE = ['url', 'notes', 'verified', 'durationMonths', 'durationLabel', 'startDate', 'startLabel', 'expiresAt', 'stipend', 'postedAt'];
for (const u of input.updates ?? []) {
  const o = byId.get(u.id) ?? byFp.get(u.fingerprint);
  if (!o) continue;
  for (const k of UPDATABLE) if (u[k] !== undefined) o[k] = u[k];
  if (u.url) { o.linkStatus = null; o.linkCheckedAt = null; } // nouveau lien : à recontrôler
  report.updated.push({ id: o.id, title: o.title, fields: UPDATABLE.filter((k) => u[k] !== undefined) });
}

// Les offres closes depuis plus de 60 jours sont retirées du fichier (l'app garde sa copie locale).
const cutoff = now.getTime() - 60 * 86_400_000;
data.offers = data.offers.filter((o) => !o.closedAt || new Date(o.closedAt).getTime() > cutoff);
data.offers.sort((a, b) => (b.scrapedAt ?? '').localeCompare(a.scrapedAt ?? ''));

data.updatedAt = now.toISOString();
data.runs = [{
  at: now.toISOString(),
  added: report.added.length,
  duplicates: report.duplicates.length,
  rejected: report.rejected.length,
  closed: report.closed.length,
  updated: report.updated.length,
  queries: input.queries ?? null,
  note: input.note ?? null,
}, ...(data.runs ?? [])].slice(0, 120);

if (!flags.includes('--dry-run')) writeJson(OFFERS_FILE, data);
console.log(JSON.stringify({
  ...report,
  totals: { open: data.offers.filter((o) => !o.closedAt).length, all: data.offers.length },
  dryRun: flags.includes('--dry-run'),
}, null, 2));
