// Moteur de pertinence : score de match (CV ↔ offre), score d'intérêt appris, tri multicritère.

import { SKILLS, SKILL_BY_ID } from '../data/skills.js';
import { COMPANY_TYPES } from '../data/companies.js';
import { COUNTRY_TIERS, estimateTravel, haversineKm } from './geo.js';
import { clamp, normalize, DAY } from './utils.js';

// ---------------------------------------------------------------------------
// Compétences
// ---------------------------------------------------------------------------
const containsAlias = (corpus, alias) => {
  const a = normalize(alias);
  if (!a) return false;
  // Les alias courts (ia, sig, ges…) doivent correspondre à un mot entier.
  if (a.length <= 4) return new RegExp(`(^|[^a-z0-9])${a.replace(/[+#]/g, '\\$&')}([^a-z0-9]|$)`).test(corpus);
  return corpus.includes(a);
};

/** Compétences présentes dans un texte libre (CV, description d'offre…). */
export function extractSkills(text) {
  const corpus = normalize(text);
  return SKILLS.filter((sk) => sk.aliases.some((al) => containsAlias(corpus, al))).map((sk) => sk.id);
}

let cvCache = { text: null, skills: [] };
export function profileSkills(profile) {
  if (cvCache.text !== profile.cvText) cvCache = { text: profile.cvText, skills: extractSkills(profile.cvText) };
  return cvCache.skills;
}

/** Compétences requises par une offre : liste déclarée + celles détectées dans la description. */
export function offerSkills(offer) {
  const declared = offer.requirements ?? [];
  const detected = extractSkills(`${offer.title}\n${offer.description ?? ''}`);
  return [...new Set([...declared, ...detected])];
}

// ---------------------------------------------------------------------------
// Score de match (0–100)
// ---------------------------------------------------------------------------
export function sectorPriority(offer, settings) {
  return settings.criteria.sectors[offer.sector]?.priority ?? 4;
}

export function computeMatch(offer, profile, settings) {
  const mine = new Set(profileSkills(profile));
  const required = offer.requirements?.length ? offer.requirements : offerSkills(offer);
  const matched = required.filter((id) => mine.has(id));
  const missing = required.filter((id) => !mine.has(id));
  const coverage = required.length ? matched.length / required.length : 0.5;

  const prio = sectorPriority(offer, settings);
  const sectorPts = { 1: 20, 2: 16, 3: 10 }[prio] ?? 5;

  const { durationMin, durationMax } = profile.availability;
  const d = offer.durationMonths;
  // Offres réelles : durée ou date parfois non précisées → points neutres.
  const durationPts = d == null ? 8 : d >= durationMin && d <= durationMax ? 15 : d === durationMax + 1 ? 8 : 2;

  const start = new Date(offer.startDate).getTime();
  const wanted = new Date(profile.availability.start).getTime();
  const gapDays = Math.abs(start - wanted) / DAY;
  const startPts = !offer.startDate ? 5 : gapDays <= 21 ? 10 : gapDays <= 45 ? 6 : 2;

  const langPts = offer.language === 'en' ? 8 : 10; // anglais B2+ : très bon mais natif FR

  const score = Math.round(clamp(coverage * 45 + sectorPts + durationPts + startPts + langPts, 0, 100));
  return { score, matched, missing, coverage };
}

// ---------------------------------------------------------------------------
// Score d'intérêt — apprentissage en ligne à partir des likes / dislikes
// ---------------------------------------------------------------------------
/** Caractéristiques d'une offre sur lesquelles on apprend les préférences. */
export function offerFeatures(offer) {
  return [
    `sector:${offer.sector}`,
    `company:${offer.companyId ?? normalize(offer.company)}`,
    `type:${offer.companyType}`,
    `kind:${offer.kind}`,
    `country:${offer.location?.country}`,
    ...(offer.requirements ?? []).slice(0, 6).map((r) => `skill:${r}`),
  ];
}

const FEATURE_WEIGHT = { sector: 1.2, company: 1.5, type: 0.8, kind: 0.8, country: 0.6, skill: 0.35 };

/** Décroissance exponentielle : les préférences anciennes pèsent de moins en moins. */
function decay(weight, updatedAt, halfLifeDays, now = Date.now()) {
  if (!updatedAt) return weight;
  const age = (now - new Date(updatedAt).getTime()) / DAY;
  return weight * 0.5 ** (age / halfLifeDays);
}

export function updateInterestModel(model, offer, reaction, settings, now = Date.now()) {
  const { learningRate, halfLifeDays } = settings.interest;
  const features = { ...model.features };
  for (const f of offerFeatures(offer)) {
    const cur = features[f] ?? { w: 0, at: null };
    const w = decay(cur.w, cur.at, halfLifeDays, now) + reaction * learningRate;
    features[f] = { w: clamp(w, -4, 4), at: new Date(now).toISOString() };
  }
  return { features, updatedAt: new Date(now).toISOString() };
}

export function computeInterest(offer, model, settings, now = Date.now()) {
  const { halfLifeDays } = settings.interest;
  let signal = 0;
  for (const f of offerFeatures(offer)) {
    const entry = model.features[f];
    if (!entry) continue;
    signal += decay(entry.w, entry.at, halfLifeDays, now) * (FEATURE_WEIGHT[f.split(':')[0]] ?? 0.5);
  }
  let score = 50 + 45 * Math.tanh(signal / 3);
  if (offer.reaction === 1) score += 15;
  if (offer.reaction === -1) score -= 35;
  if (offer.followedCompany) score += 8;
  // Fraîcheur : une offre ancienne perd un peu d'intérêt (risque d'être pourvue).
  const ageDays = (now - new Date(offer.postedAt).getTime()) / DAY;
  if (ageDays > 14) score -= Math.min(12, (ageDays - 14) * 0.6);
  return Math.round(clamp(score, 0, 100));
}

// ---------------------------------------------------------------------------
// Enrichissement : distance, temps de trajet, scores
// ---------------------------------------------------------------------------
export function enrichOffer(offer, ctx) {
  const { profile, settings, interestModel, followed = {}, now = Date.now() } = ctx;
  const distanceKm = haversineKm(profile.home, offer.location);
  const match = computeMatch(offer, profile, settings);
  const withFollow = { ...offer, followedCompany: !!followed[offer.companyId] };
  return {
    ...withFollow,
    distanceKm,
    travel: estimateTravel(distanceKm),
    matchScore: match.score,
    matchDetails: match,
    interestScore: computeInterest(withFollow, interestModel, settings, now),
    sectorPriority: sectorPriority(offer, settings),
    regionTier: offer.space === 'international' ? COUNTRY_TIERS[offer.location.country] ?? 4 : 0,
    expired: offer.expiresAt ? new Date(offer.expiresAt).getTime() < now : false,
  };
}

// ---------------------------------------------------------------------------
// Tri multicritère à priorités personnalisables
// ---------------------------------------------------------------------------
export const SORT_KEYS = {
  distance: { label: 'Distance', hint: 'La plus proche de chez moi d’abord' },
  duration: { label: 'Durée', hint: '4–5 mois en priorité, puis 6 mois' },
  sector: { label: 'Secteur', hint: 'Urbanisme › Énergie › Audit / autres' },
  companySize: { label: "Taille d'entreprise", hint: 'Grands groupes ↔ petites structures' },
  match: { label: 'Score de match', hint: 'Adéquation avec mon CV' },
  interest: { label: "Score d'intérêt", hint: 'Appris de mes likes / dislikes' },
  region: { label: 'Zone géographique', hint: 'Europe anglophone › Europe › Monde' },
  recent: { label: 'Fraîcheur', hint: 'Offres publiées récemment' },
};

/** Palier de distance : fin près de chez soi, plus large au loin — les critères suivants départagent. */
function distanceBucket(km) {
  if (km == null) return 999;
  if (km < 20) return Math.floor(km / 2);
  if (km < 100) return 10 + Math.floor((km - 20) / 10);
  if (km < 1000) return 18 + Math.floor((km - 100) / 100);
  return 27 + Math.floor((km - 1000) / 500);
}

function durationRank(d, profile) {
  const { durationMin, durationMax } = profile.availability;
  if (d == null) return 1;
  if (d >= durationMin && d <= durationMax) return 0;
  if (d === durationMax + 1) return 1;
  return 2;
}

export function sortValue(key, o, ctx) {
  switch (key) {
    case 'distance': return distanceBucket(o.distanceKm);
    case 'duration': return durationRank(o.durationMonths, ctx.profile);
    case 'sector': return o.sectorPriority;
    case 'companySize': {
      const rank = COMPANY_TYPES[o.companyType]?.rank ?? 0;
      return ctx.settings.sorting.companySizeOrder === 'desc' ? -rank : rank;
    }
    case 'match': return -Math.floor(o.matchScore / 10);
    case 'interest': return -Math.floor(o.interestScore / 10);
    case 'region': return o.regionTier;
    case 'recent': return -Math.floor(new Date(o.postedAt).getTime() / DAY);
    default: return 0;
  }
}

export function sortOffers(offers, priorities, ctx) {
  return [...offers].sort((a, b) => {
    for (const key of priorities) {
      const diff = sortValue(key, a, ctx) - sortValue(key, b, ctx);
      if (diff !== 0) return diff;
    }
    // Départage final : distance exacte puis match.
    return (a.distanceKm ?? 0) - (b.distanceKm ?? 0) || b.matchScore - a.matchScore;
  });
}

export const skillLabel = (id) => SKILL_BY_ID[id]?.label ?? id;
