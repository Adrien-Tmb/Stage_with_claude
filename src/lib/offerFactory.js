// Fabrique d'offres simulées : combine entreprises × modèles de postes × lieux
// avec un aléa déterministe, pour obtenir un corpus stable et crédible.

import { COMPANIES, COMPANY_TYPES } from '../data/companies.js';
import { PLACES } from '../data/places.js';
import { ROLE_TEMPLATES } from '../data/roleTemplates.js';
import { SOURCES } from '../data/sources.js';
import { SKILL_BY_ID } from '../data/skills.js';
import { fingerprint, hashString, pick, seededRandom, shuffle, DAY } from './utils.js';

const DURATIONS = [3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 6];
const STARTS = ['2027-03-01', '2027-03-15', '2027-04-01', '2027-04-01', '2027-04-06', '2027-04-15', '2027-05-03', '2027-06-01'];

function stipend(rng, co, lang) {
  const base = { grand_groupe: 1350, eti: 1200, public: 750, labo: 900, pme: 1000, ong: 900, startup: 1000 }[co.type] ?? 900;
  if (lang === 'en') {
    const amount = Math.round((base * 1.35 + rng() * 500) / 50) * 50;
    return `≈ ${amount.toLocaleString('fr-FR')} € / mois (équivalent)`;
  }
  return `${Math.max(650, Math.round((base + rng() * 350) / 50) * 50).toLocaleString('fr-FR')} € brut / mois`;
}

function pickSource(rng, co, tpl) {
  const pool = Object.entries(SOURCES).filter(([, s]) => {
    if (s.franceOnly && co.space !== 'france') return false;
    if (s.researchOnly && tpl.kind !== 'research' && co.type !== 'labo') return false;
    return true;
  });
  const weighted = pool.flatMap(([k, s]) => Array(s.weight + (k === 'careers' && co.type === 'grand_groupe' ? 2 : 0)).fill(k));
  return pick(rng, weighted);
}

function describe(tpl, co, place, duration, start, lang) {
  const skills = tpl.requirements.map((id) => SKILL_BY_ID[id]?.label).filter(Boolean);
  if (lang === 'en') {
    return [
      `About ${co.name}: ${co.description}`,
      `\nThe role\n${tpl.summary}`,
      `\nWhat you will do\n${tpl.missions.map((m) => `• ${m}`).join('\n')}`,
      `\nYour profile\n• Master-level engineering student (energy, urban planning or environment)\n• Skills: ${skills.join(', ')}\n• Fluent English; other European languages are a plus`,
      `\nPractical details\n• Internship of ${duration} months starting ${new Date(start).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}\n• Location: ${place.city}, ${place.country === 'Royaume-Uni' ? 'United Kingdom' : place.country}\n• Hybrid working possible`,
    ].join('\n');
  }
  return [
    `À propos de ${co.name} : ${co.description}`,
    `\nLe poste\n${tpl.summary}`,
    `\nVos missions\n${tpl.missions.map((m) => `• ${m}`).join('\n')}`,
    `\nVotre profil\n• Étudiant(e) en école d'ingénieurs (Bac+4/5), spécialisation énergie, ville durable ou environnement\n• Compétences : ${skills.join(', ')}\n• Anglais professionnel apprécié`,
    `\nInformations pratiques\n• Stage de ${duration} mois à partir de ${new Date(start).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}\n• Lieu : ${place.city}\n• Télétravail partiel possible`,
  ].join('\n');
}

/** Construit une offre à partir d'un triplet (entreprise, modèle, lieu). */
export function buildOffer(co, tpl, placeKey, seed, now = Date.now()) {
  const rng = seededRandom(`${co.id}|${tpl.key}|${placeKey}|${seed}`);
  const place = PLACES[placeKey];
  const lang = tpl.lang;
  const duration = pick(rng, DURATIONS);
  const startDate = pick(rng, STARTS);
  const source = pickSource(rng, co, tpl);
  const postedAt = new Date(now - Math.floor(rng() * 18) * DAY - Math.floor(rng() * 20) * 3600_000).toISOString();
  const expiresAt = new Date(new Date(postedAt).getTime() + (20 + Math.floor(rng() * 45)) * DAY).toISOString();
  const offer = {
    title: tpl.title,
    company: co.name,
    companyId: co.id,
    companyType: co.type,
    companySizeRank: COMPANY_TYPES[co.type].rank,
    location: { ...place, key: placeKey },
    space: co.space,
    sector: tpl.sector,
    kind: co.type === 'labo' && tpl.kind === 'core' ? 'research' : tpl.kind,
    language: lang,
    durationMonths: duration,
    startDate,
    summary: tpl.summary,
    description: describe(tpl, co, place, duration, startDate, lang),
    requirements: tpl.requirements,
    stipend: stipend(rng, co, lang),
    remote: rng() > 0.4 ? 'hybride' : 'sur site',
    source,
    postedAt,
    expiresAt,
    simulated: true,
  };
  offer.url = SOURCES[source].url(offer, co);
  offer.fingerprint = fingerprint({ company: co.name, title: tpl.title, city: place.city });
  offer.id = `off_${hashString(offer.fingerprint).toString(36)}`;
  return offer;
}

/** Candidats possibles pour une entreprise : modèles compatibles avec ses secteurs, sa langue et son type. */
function templatesFor(co) {
  const lang = co.space === 'france' ? 'fr' : 'en';
  return ROLE_TEMPLATES.filter((tpl) => {
    if (tpl.lang !== lang) return false;
    if (tpl.kind === 'research') return co.type === 'labo' || co.type === 'public';
    if (co.type === 'labo') return tpl.kind === 'research' || (!tpl.strict && co.sectors.includes(tpl.sector));
    if (tpl.strict) return co.sectors[0] === tpl.sector && ['grand_groupe', 'eti', 'pme', 'startup'].includes(co.type);
    return co.sectors.includes(tpl.sector);
  });
}

/**
 * Corpus complet "visible sur le web" pour une graine donnée.
 * La graine "base" donne le corpus de référence ; chaque passage du scraper
 * ajoute une graine datée pour faire apparaître de nouvelles annonces.
 */
export function generateCorpus(seed = 'base', now = Date.now()) {
  const rng = seededRandom(`corpus|${seed}`);
  const offers = [];
  for (const co of COMPANIES) {
    const tpls = shuffle(templatesFor(co), rng);
    if (!tpls.length) continue;
    const n = co.type === 'grand_groupe' ? 2 + Math.floor(rng() * 3) : 1 + Math.floor(rng() * 2);
    for (const tpl of tpls.slice(0, n)) {
      offers.push(buildOffer(co, tpl, pick(rng, co.places), seed, now));
    }
  }
  return shuffle(offers, rng);
}
