// Outils partagés des routines Claude : lecture/écriture des données publiées,
// normalisation des offres collectées sur le web, géocodage et calcul du score de match.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLACES } from '../../src/data/places.js';
import { COMPANY_TYPES } from '../../src/data/companies.js';
import { SECTORS, DEFAULT_PROFILE, DEFAULT_SETTINGS } from '../../src/data/defaults.js';
import { SOURCES } from '../../src/data/sources.js';
import { computeMatch, extractSkills, skillLabel } from '../../src/lib/scoring.js';
import { fingerprint, hashString, normalize } from '../../src/lib/utils.js';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const DATA_DIR = resolve(ROOT, 'public/data');
export const OFFERS_FILE = resolve(DATA_DIR, 'offers.json');
export const DOSSIERS_FILE = resolve(DATA_DIR, 'dossiers.json');

export function readJson(file, fallback) {
  if (!existsSync(file)) return fallback;
  return JSON.parse(readFileSync(file, 'utf8'));
}

export function writeJson(file, data) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

export const loadOffers = () => readJson(OFFERS_FILE, { version: 1, updatedAt: null, runs: [], offers: [] });
export const loadDossiers = () => readJson(DOSSIERS_FILE, { version: 1, updatedAt: null, dossiers: {} });

/** Villes fréquentes absentes du référentiel de l'app (lat/lng WGS84). */
const EXTRA_PLACES = {
  blagnac: { city: 'Blagnac', region: 'Occitanie', country: 'France', lat: 43.6372, lng: 1.3906 },
  paris: { city: 'Paris', region: 'Île-de-France', country: 'France', lat: 48.8566, lng: 2.3522 },
  pantin: { city: 'Pantin', region: 'Île-de-France', country: 'France', lat: 48.8944, lng: 2.4093 },
  clichy: { city: 'Clichy', region: 'Île-de-France', country: 'France', lat: 48.9045, lng: 2.3060 },
  'choisy le roi': { city: 'Choisy-le-Roi', region: 'Île-de-France', country: 'France', lat: 48.7638, lng: 2.4093 },
  vincennes: { city: 'Vincennes', region: 'Île-de-France', country: 'France', lat: 48.8474, lng: 2.4392 },
  'puteaux': { city: 'Puteaux', region: 'Île-de-France', country: 'France', lat: 48.8846, lng: 2.2389 },
  'levallois perret': { city: 'Levallois-Perret', region: 'Île-de-France', country: 'France', lat: 48.8950, lng: 2.2870 },
  'neuilly sur seine': { city: 'Neuilly-sur-Seine', region: 'Île-de-France', country: 'France', lat: 48.8846, lng: 2.2697 },
  'massy': { city: 'Massy', region: 'Île-de-France', country: 'France', lat: 48.7309, lng: 2.2713 },
  'saint quentin en yvelines': { city: 'Saint-Quentin-en-Yvelines', region: 'Île-de-France', country: 'France', lat: 48.7758, lng: 2.0458 },
  'versailles': { city: 'Versailles', region: 'Île-de-France', country: 'France', lat: 48.8049, lng: 2.1204 },
  'cergy': { city: 'Cergy', region: 'Île-de-France', country: 'France', lat: 49.0364, lng: 2.0761 },
  'creteil': { city: 'Créteil', region: 'Île-de-France', country: 'France', lat: 48.7904, lng: 2.4556 },
  'nice': { city: 'Nice', region: "Provence-Alpes-Côte d'Azur", country: 'France', lat: 43.7102, lng: 7.2620 },
  'aix en provence': { city: 'Aix-en-Provence', region: "Provence-Alpes-Côte d'Azur", country: 'France', lat: 43.5297, lng: 5.4474 },
  'tours': { city: 'Tours', region: 'Centre-Val de Loire', country: 'France', lat: 47.3941, lng: 0.6848 },
  'annemasse': { city: 'Annemasse', region: 'Auvergne-Rhône-Alpes', country: 'France', lat: 46.1934, lng: 6.2342 },
  'clermont ferrand': { city: 'Clermont-Ferrand', region: 'Auvergne-Rhône-Alpes', country: 'France', lat: 45.7772, lng: 3.0870 },
  'amiens': { city: 'Amiens', region: 'Hauts-de-France', country: 'France', lat: 49.8941, lng: 2.2958 },
  'rouen': { city: 'Rouen', region: 'Normandie', country: 'France', lat: 49.4432, lng: 1.0999 },
  'dijon': { city: 'Dijon', region: 'Bourgogne-Franche-Comté', country: 'France', lat: 47.3220, lng: 5.0415 },
  'metz': { city: 'Metz', region: 'Grand Est', country: 'France', lat: 49.1193, lng: 6.1757 },
  'the hague': { city: 'The Hague', region: 'Zuid-Holland', country: 'Pays-Bas', lat: 52.0705, lng: 4.3007 },
  'utrecht': { city: 'Utrecht', region: 'Utrecht', country: 'Pays-Bas', lat: 52.0907, lng: 5.1214 },
  'eindhoven': { city: 'Eindhoven', region: 'Noord-Brabant', country: 'Pays-Bas', lat: 51.4416, lng: 5.4697 },
  'aarhus': { city: 'Aarhus', region: 'Midtjylland', country: 'Danemark', lat: 56.1629, lng: 10.2039 },
  'leeds': { city: 'Leeds', region: 'England', country: 'Royaume-Uni', lat: 53.8008, lng: -1.5491 },
  'birmingham': { city: 'Birmingham', region: 'England', country: 'Royaume-Uni', lat: 52.4862, lng: -1.8904 },
  'cambridge': { city: 'Cambridge', region: 'England', country: 'Royaume-Uni', lat: 52.2053, lng: 0.1218 },
  'oxford': { city: 'Oxford', region: 'England', country: 'Royaume-Uni', lat: 51.7520, lng: -1.2577 },
  'galway': { city: 'Galway', region: 'Connacht', country: 'Irlande', lat: 53.2707, lng: -9.0568 },
  'geneva': { city: 'Geneva', region: 'Genève', country: 'Suisse', lat: 46.2044, lng: 6.1432 },
  'lausanne': { city: 'Lausanne', region: 'Vaud', country: 'Suisse', lat: 46.5197, lng: 6.6323 },
  'hamburg': { city: 'Hamburg', region: 'Hamburg', country: 'Allemagne', lat: 53.5511, lng: 9.9937 },
  'madrid': { city: 'Madrid', region: 'Madrid', country: 'Espagne', lat: 40.4168, lng: -3.7038 },
  'milan': { city: 'Milan', region: 'Lombardy', country: 'Italie', lat: 45.4642, lng: 9.19 },
};

const PLACE_INDEX = (() => {
  const idx = new Map();
  for (const [key, p] of Object.entries(PLACES)) {
    idx.set(normalize(key), p);
    idx.set(normalize(p.city), p);
  }
  for (const [key, p] of Object.entries(EXTRA_PLACES)) idx.set(normalize(key), p);
  return idx;
})();

/** Coordonnées d'une ville (référentiel interne) ; null si inconnue. */
export function geocodeCity(city) {
  const n = normalize(city).replace(/\b\d{5}\b/g, '').replace(/\s+/g, ' ').trim();
  if (PLACE_INDEX.has(n)) return PLACE_INDEX.get(n);
  const arr = n.match(/^paris (\d{1,2})(e|er|eme)?$/);
  if (arr && PLACE_INDEX.has(`paris ${arr[1]}`)) return PLACE_INDEX.get(`paris ${arr[1]}`);
  if (n.startsWith('paris')) return PLACE_INDEX.get('paris');
  return null;
}

const ISO_MONTH = /^\d{4}-\d{2}(-\d{2})?$/;
const toIsoDay = (v) => (v && ISO_MONTH.test(v) ? (v.length === 7 ? `${v}-01` : v) : null);

/** Durée de l'annonce → valeur la plus favorable au profil (4–5 mois) dans la fourchette annoncée. */
export function resolveDuration(value, { durationMin = 4, durationMax = 5 } = DEFAULT_PROFILE.availability) {
  if (value == null || value === '') return null;
  const [lo, hi] = Array.isArray(value) ? value.map(Number) : [Number(value), Number(value)];
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo < 1 || hi > 24) return null;
  if (hi < durationMin) return hi; // ex. 2–3 mois → 3
  if (lo > durationMax) return lo; // ex. 6 mois → 6
  return Math.max(lo, Math.min(hi, durationMax)); // ex. 4–6 mois → 5
}

export const slug = (s) => normalize(s).replace(/\s+/g, '-');

/**
 * Valide et complète une offre trouvée par la routine.
 * Les champs inconnus restent null : on n'invente jamais une durée ou une date absente de l'annonce.
 * @returns {{ offer?: object, reason?: string }}
 */
export function normalizeCandidate(c, now = new Date()) {
  const title = c.title?.trim();
  const company = c.company?.trim();
  if (!title || !company) return { reason: 'intitulé ou entreprise manquant' };
  if (!/^https?:\/\/[^\s]+\.[^\s]+/.test(c.url ?? '')) return { reason: 'lien direct manquant ou invalide' };
  if (!SECTORS[c.sector]) return { reason: `secteur inconnu (${c.sector}) — attendu : ${Object.keys(SECTORS).join(', ')}` };

  const city = c.location?.city?.trim() ?? c.city?.trim();
  if (!city) return { reason: 'ville manquante' };
  const known = geocodeCity(city);
  const lat = Number(c.location?.lat ?? known?.lat);
  const lng = Number(c.location?.lng ?? known?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { reason: `coordonnées inconnues pour « ${city} » : ajoutez location.lat / location.lng` };
  const country = c.location?.country ?? known?.country ?? 'France';
  const location = { city: known && !c.location?.keepCity ? known.city : city, region: c.location?.region ?? known?.region ?? '', country, lat, lng };

  const companyType = COMPANY_TYPES[c.companyType] ? c.companyType : 'pme';
  const space = country === 'France' ? 'france' : 'international';
  const fp = fingerprint({ company, title, city: location.city });
  const text = `${title}\n${c.summary ?? ''}\n${c.description ?? ''}\n${(c.skills ?? []).join(', ')}`;

  const offer = {
    id: `off_r${hashString(fp).toString(36)}`,
    fingerprint: fp,
    title,
    company,
    companyId: c.companyId ?? slug(company),
    companyType,
    companySizeRank: COMPANY_TYPES[companyType].rank,
    location,
    space,
    sector: c.sector,
    kind: ['core', 'neighbour', 'research'].includes(c.kind) ? c.kind : 'core',
    language: c.language === 'en' || c.language === 'fr' ? c.language : space === 'france' ? 'fr' : 'en',
    level: c.level ?? null, // « M1 », « PFE », « césure »…
    durationMonths: resolveDuration(c.durationMonths),
    durationLabel: c.durationLabel ?? null,
    startDate: toIsoDay(c.startDate),
    startLabel: c.startLabel ?? null,
    summary: (c.summary ?? '').trim().slice(0, 320),
    description: (c.description ?? c.summary ?? '').trim().slice(0, 6000),
    requirements: extractSkills(text),
    stipend: c.stipend ?? null,
    remote: c.remote ?? null,
    url: c.url,
    source: SOURCES[c.source] ? c.source : 'other',
    sourceLabel: c.sourceLabel ?? (SOURCES[c.source] ? null : 'Autre site'),
    postedAt: toIsoDay(c.postedAt) ? new Date(toIsoDay(c.postedAt)).toISOString() : now.toISOString(),
    expiresAt: toIsoDay(c.deadline ?? c.expiresAt) ? new Date(toIsoDay(c.deadline ?? c.expiresAt)).toISOString() : null,
    scrapedAt: now.toISOString(),
    lastSeenAt: now.toISOString(),
    closedAt: null,
    verified: c.verified ?? false, // true si la page de l'annonce a été lue directement
    notes: c.notes ?? null,
    real: true,
    simulated: false,
  };
  return { offer };
}

/** Score de match avec le profil par défaut (celui du CV). */
export function matchFor(offer) {
  const m = computeMatch(offer, DEFAULT_PROFILE, DEFAULT_SETTINGS);
  return { score: m.score, matched: m.matched.map(skillLabel), missing: m.missing.map(skillLabel) };
}

export { DEFAULT_PROFILE, DEFAULT_SETTINGS };
