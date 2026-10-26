// Tests du moteur (collecte, dédoublonnage, scores, tri, planification) — `npm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runScrape, rejectReason } from '../src/lib/scraper.js';
import { generateCorpus } from '../src/lib/offerFactory.js';
import { computeMatch, enrichOffer, sortOffers, updateInterestModel, computeInterest, extractSkills } from '../src/lib/scoring.js';
import { isRunDue, nextSlot } from '../src/lib/scheduler.js';
import { haversineKm, estimateTravel } from '../src/lib/geo.js';
import { generateCoverLetter, generateCvSuggestions, analyzeKeywords, generateInterviewPrep } from '../src/lib/ai.js';
import { syncAppEvents } from '../src/lib/appEvents.js';
import { DEFAULT_PROFILE, DEFAULT_SETTINGS, EMPTY_INTEREST_MODEL } from '../src/data/defaults.js';

const profile = structuredClone(DEFAULT_PROFILE);
const settings = structuredClone(DEFAULT_SETTINGS);
const ctx = { profile, settings, interestModel: EMPTY_INTEREST_MODEL };

test('le corpus est déterministe et sans doublon interne', () => {
  const a = generateCorpus('base', 0);
  const b = generateCorpus('base', 0);
  assert.deepEqual(a.map((o) => o.id), b.map((o) => o.id));
  assert.ok(a.length > 100, `corpus trop petit : ${a.length}`);
  assert.equal(new Set(a.map((o) => o.fingerprint)).size, a.length);
});

test('la collecte ne renvoie que des offres nouvelles et conformes aux critères', () => {
  const first = runScrape({ settings, profile, knownFingerprints: new Set(), initial: true });
  assert.ok(first.added.length >= 20);
  for (const o of first.added) assert.equal(rejectReason(o, settings, profile), null);
  const known = new Set(first.added.map((o) => o.fingerprint));
  const second = runScrape({ settings, profile, knownFingerprints: known });
  for (const o of second.added) assert.ok(!known.has(o.fingerprint), 'doublon ajouté');
  assert.ok(second.duplicates > 0, 'les doublons doivent être détectés');
});

test('les critères filtrent bien (durée, espace)', () => {
  const s = structuredClone(settings);
  s.criteria.durations = [4, 5];
  s.criteria.spaces.international = false;
  const res = runScrape({ settings: s, profile, knownFingerprints: new Set(), initial: true });
  assert.ok(res.added.every((o) => [4, 5].includes(o.durationMonths) && o.space === 'france'));
});

test('le CV est bien analysé', () => {
  const skills = extractSkills(profile.cvText);
  for (const id of ['python', 'efficacite', 'decret-tertiaire', 'pv', 'gestion-projet', 'anglais', 'biodiversite']) {
    assert.ok(skills.includes(id), `compétence non détectée : ${id}`);
  }
  assert.ok(!skills.includes('autocad'));
});

test('score de match : une offre urbanisme 4–5 mois bat une offre audit 6 mois', () => {
  const corpus = generateCorpus('base', Date.now());
  const urba = corpus.find((o) => o.sector === 'urbanisme' && [4, 5].includes(o.durationMonths) && o.language === 'fr');
  const audit = corpus.find((o) => o.sector === 'audit' && o.durationMonths === 6 && o.language === 'fr');
  assert.ok(computeMatch(urba, profile, settings).score > computeMatch(audit, profile, settings).score);
});

test("le score d'intérêt apprend des likes et dislikes", () => {
  const [o1, o2] = generateCorpus('base', Date.now()).filter((o) => o.sector === 'energie');
  const before = computeInterest(o2, EMPTY_INTEREST_MODEL, settings);
  let model = updateInterestModel(EMPTY_INTEREST_MODEL, o1, 1, settings);
  model = updateInterestModel(model, o1, 1, settings);
  assert.ok(computeInterest(o2, model, settings) > before, 'un like sur le même secteur doit augmenter l’intérêt');
  const neg = updateInterestModel(EMPTY_INTEREST_MODEL, o1, -1, settings);
  assert.ok(computeInterest(o2, neg, settings) < before);
});

test('Espace France trié du plus proche au plus éloigné', () => {
  const offers = generateCorpus('base', Date.now()).filter((o) => o.space === 'france').map((o) => enrichOffer(o, ctx));
  const sorted = sortOffers(offers, ['distance'], ctx);
  for (let i = 1; i < sorted.length; i++) assert.ok(sorted[i].distanceKm >= sorted[i - 1].distanceKm - 2.01);
});

test('Espace International : Europe anglophone en premier', () => {
  const offers = generateCorpus('base', Date.now()).filter((o) => o.space === 'international').map((o) => enrichOffer(o, ctx));
  const sorted = sortOffers(offers, settings.sorting.international, ctx);
  assert.equal(sorted[0].regionTier, 1);
  assert.ok(['Royaume-Uni', 'Irlande'].includes(sorted[0].location.country));
});

test('planification 10h / 15h', () => {
  const at = (h, m = 0) => { const d = new Date(2026, 9, 26, h, m); return d; };
  const scraper = { enabled: true, times: ['10:00', '15:00'], lastRunAt: at(10, 1).toISOString() };
  assert.equal(isRunDue(scraper, at(12)), false);
  assert.equal(isRunDue(scraper, at(15, 1)), true);
  assert.equal(nextSlot(scraper.times, at(12)).getHours(), 15);
  assert.equal(nextSlot(scraper.times, at(16)).getHours(), 10);
});

test('distances et trajets depuis La Garenne-Colombes', () => {
  const ladef = { lat: 48.8918, lng: 2.2380 };
  const km = haversineKm(profile.home, ladef);
  assert.ok(km > 1 && km < 3);
  const t = estimateTravel(haversineKm(profile.home, { lat: 51.5074, lng: -0.1278 }));
  assert.equal(t.mode, 'train');
});

test('relance automatique à J+7 et entretien dans l’agenda', () => {
  const app = { id: 'a1', column: 'sent', appliedAt: '2026-10-01T09:00:00.000Z' };
  const ev = Object.values(syncAppEvents({}, app, null, settings));
  assert.equal(ev.length, 1);
  assert.equal(ev[0].date.slice(0, 10), '2026-10-08');
  const iv = Object.values(syncAppEvents({}, { ...app, column: 'interview', interviewAt: '2026-10-20T12:00:00.000Z' }, null, settings));
  assert.deepEqual(iv.map((e) => e.type).sort(), ['followup', 'interview']);
});

test('les générateurs IA produisent des contenus cohérents avec la langue de l’offre', () => {
  const corpus = generateCorpus('base', Date.now());
  const fr = corpus.find((o) => o.language === 'fr');
  const en = corpus.find((o) => o.language === 'en');
  assert.match(generateCoverLetter({ offer: fr, profile, settings }), /Madame, Monsieur/);
  assert.match(generateCoverLetter({ offer: en, profile, settings }), /Dear Hiring Manager/);
  assert.ok(generateCvSuggestions({ offer: fr, profile, settings }).suggestions.length >= 4);
  assert.ok(analyzeKeywords({ offer: fr, profile }).skills.length > 3);
  assert.ok(generateInterviewPrep({ offer: en, profile, settings }).sections.length >= 4);
});
