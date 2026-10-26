// Tests de la chaîne « routines Claude » : normalisation des offres collectées,
// fusion côté application, dossiers IA et rendu sécurisé du Markdown.
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCandidate, resolveDuration, geocodeCity } from '../scripts/routines/lib.mjs';
import { mergePublishedOffers, findDossier, isOfferVisible, dossierRequestUrl } from '../src/lib/published.js';
import { fillContact, markdownToHtml } from '../src/lib/markdown.js';

const base = {
  title: 'Stage – Ingénieur(e) urbanisme durable', company: 'Egis', sector: 'urbanisme', companyType: 'grand_groupe',
  location: { city: 'Montreuil' }, url: 'https://example.com/offre/1', summary: 'Études énergie-carbone de projets urbains.',
  durationMonths: [4, 6], startDate: '2027-04',
};

test('normalizeCandidate complète une offre valide sans inventer les champs absents', () => {
  const { offer } = normalizeCandidate(base, new Date('2026-10-26T10:00:00Z'));
  assert.equal(offer.space, 'france');
  assert.equal(offer.durationMonths, 5);
  assert.equal(offer.startDate, '2027-04-01');
  assert.ok(offer.id.startsWith('off_r'));
  assert.ok(offer.location.lat > 48 && offer.location.lat < 49);
  assert.ok(offer.requirements.includes('urbanisme'));
  const { offer: noDate } = normalizeCandidate({ ...base, durationMonths: null, startDate: null });
  assert.equal(noDate.durationMonths, null);
  assert.equal(noDate.startDate, null);
});

test('normalizeCandidate rejette les offres incomplètes', () => {
  assert.match(normalizeCandidate({ ...base, url: '' }).reason, /lien/);
  assert.match(normalizeCandidate({ ...base, sector: 'finance' }).reason, /secteur/);
  assert.match(normalizeCandidate({ ...base, location: { city: 'Trifouilly' } }).reason, /coordonnées/);
  assert.ok(normalizeCandidate({ ...base, location: { city: 'Trifouilly', lat: 47, lng: 2 } }).offer);
});

test('durée : valeur la plus favorable au profil 4–5 mois dans la fourchette annoncée', () => {
  assert.equal(resolveDuration([4, 6]), 5);
  assert.equal(resolveDuration([3, 6]), 5);
  assert.equal(resolveDuration(6), 6);
  assert.equal(resolveDuration([2, 3]), 3);
  assert.equal(resolveDuration(null), null);
  assert.equal(geocodeCity('Paris 13e').city, 'Paris 13e');
  assert.equal(geocodeCity('92100 Boulogne-Billancourt').city, 'Boulogne-Billancourt');
});

test("mergePublishedOffers n'ajoute que les nouvelles offres et préserve les choix de l'utilisateur", () => {
  const { offer } = normalizeCandidate(base);
  const local = { [offer.id]: { ...offer, status: 'seen', reaction: 1, summary: 'ancien' } };
  const second = normalizeCandidate({ ...base, title: 'Stage – Analyste énergie', company: 'ENGIE', location: { city: 'Courbevoie' } }).offer;
  const res = mergePublishedOffers(local, [{ ...offer, summary: 'nouveau', closedAt: '2026-11-01T00:00:00.000Z' }, second]);
  assert.equal(res.added.length, 1);
  assert.equal(res.added[0].status, 'new');
  assert.equal(res.offers[offer.id].reaction, 1);
  assert.equal(res.offers[offer.id].status, 'seen');
  assert.equal(res.offers[offer.id].summary, 'nouveau');
  assert.equal(res.offers[offer.id].expiresAt, '2026-11-01T00:00:00.000Z');
  assert.equal(res.closed.length, 1);
  // Une offre ajoutée à la main avec la même empreinte n'est pas dupliquée.
  const manual = { off_manual: { ...second, id: 'off_manual', manual: true, status: 'seen' } };
  const res2 = mergePublishedOffers(manual, [second]);
  assert.equal(res2.added.length, 0);
  assert.equal(Object.keys(res2.offers).length, 1);
  assert.equal(res2.offers.off_manual.real, true);
});

test('dossiers : recherche par id ou empreinte, lien de demande court, visibilité par mode', () => {
  const { offer } = normalizeCandidate(base);
  assert.equal(findDossier({ x: { offerId: 'x', fingerprint: offer.fingerprint } }, { ...offer, id: 'autre' }).offerId, 'x');
  assert.equal(findDossier({}, offer), null);
  const url = dossierRequestUrl('Adrien-Tmb/Stage_with_claude', { ...offer, description: 'x'.repeat(10_000) });
  assert.ok(url.startsWith('https://github.com/Adrien-Tmb/Stage_with_claude/issues/new?title=%5BDossier%5D'));
  assert.ok(url.length < 8000);
  assert.equal(isOfferVisible({ simulated: true }, 'real'), false);
  assert.equal(isOfferVisible({ simulated: true }, 'real', true), true);
  assert.equal(isOfferVisible({ real: true }, 'mixed'), true);
});

test('Markdown : HTML échappé, coordonnées injectées localement', () => {
  const html = markdownToHtml('# Nom\n**Titre** <script>alert(1)</script>\n- point [lien](https://a.fr)');
  assert.ok(html.includes('<h1>Nom</h1>'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('<li>point <a href="https://a.fr"'));
  assert.equal(fillContact('Ville · {{phone}} · {{email}} · LinkedIn', {}), 'Ville · LinkedIn');
  assert.equal(fillContact('Ville · {{phone}} · {{email}}', { email: 'a@b.fr' }), 'Ville · a@b.fr');
});
