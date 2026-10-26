// Scraper simulé : "parcourt" les sources activées, applique les critères,
// et ne retient que les offres jamais vues (dédoublonnage par empreinte).

import { generateCorpus } from './offerFactory.js';
import { haversineKm } from './geo.js';
import { normalize, seededRandom, shuffle } from './utils.js';

/** Vérifie qu'une offre respecte les critères de recherche paramétrés. Renvoie la raison du rejet, ou null. */
export function rejectReason(offer, settings, profile) {
  const { criteria, scraper } = settings;
  if (!criteria.spaces[offer.space]) return 'espace désactivé';
  if (offer.source && !scraper.sources[offer.source]) return 'source désactivée';
  if (criteria.sectors[offer.sector] && !criteria.sectors[offer.sector].enabled) return 'secteur exclu';
  if (!criteria.companyTypes[offer.companyType]) return "type d'entreprise exclu";
  if (!criteria.durations.includes(offer.durationMonths)) return 'durée hors critères';
  if (offer.startDate < criteria.startFrom || offer.startDate > criteria.startTo) return 'date de début hors fenêtre';
  if (offer.kind === 'neighbour' && !criteria.broaden.neighbourRoles) return 'poste voisin';
  if (offer.kind === 'research' && !criteria.broaden.research) return 'recherche';
  if (offer.companyType === 'labo' && !criteria.broaden.labs) return 'laboratoire';
  if (offer.space === 'france') {
    const km = haversineKm(profile.home, offer.location);
    if (km != null && km > criteria.maxDistanceKm) return 'trop loin';
  }
  const text = normalize(`${offer.title} ${offer.description}`);
  if (criteria.excludeKeywords.some((k) => k && text.includes(normalize(k)))) return 'mot-clé exclu';
  if (criteria.includeKeywords.length && !criteria.includeKeywords.some((k) => text.includes(normalize(k)))) {
    return 'aucun mot-clé requis';
  }
  return null;
}

/**
 * Lance une passe de collecte.
 * @returns {{ added, scanned, duplicates, filtered, bySource, reasons }}
 */
export function runScrape({ settings, profile, knownFingerprints, now = Date.now(), initial = false }) {
  const slot = new Date(now).toISOString().slice(0, 13); // une "photo du web" par heure
  const rng = seededRandom(`run|${slot}|${knownFingerprints.size}`);
  const base = generateCorpus('base', now);
  const fresh = generateCorpus(`live-${slot}`, now).slice(0, 25);
  const scannedPool = initial ? base : shuffle([...base, ...fresh], rng).slice(0, 45 + Math.floor(rng() * 25));

  const maxNew = initial ? 70 : 3 + Math.floor(rng() * 6);
  const added = [];
  const reasons = {};
  const bySource = {};
  let duplicates = 0;
  let filtered = 0;
  const seen = new Set(knownFingerprints);

  for (const offer of scannedPool) {
    if (!settings.scraper.sources[offer.source]) continue; // source non interrogée
    bySource[offer.source] = (bySource[offer.source] ?? 0) + 1;
    if (seen.has(offer.fingerprint)) {
      duplicates++;
      continue;
    }
    const reason = rejectReason(offer, settings, profile);
    if (reason) {
      filtered++;
      reasons[reason] = (reasons[reason] ?? 0) + 1;
      continue;
    }
    if (added.length >= maxNew) continue;
    seen.add(offer.fingerprint);
    added.push({ ...offer, scrapedAt: new Date(now).toISOString(), status: 'new', reaction: 0 });
  }

  return { added, scanned: scannedPool.length, duplicates, filtered, bySource, reasons };
}
