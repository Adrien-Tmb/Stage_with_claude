// Données de démonstration (candidatures et contacts fictifs) pour découvrir l'application.
// Toutes sont marquées `demo: true` et supprimables en un clic (Paramètres › Données).

import { syncAppEvents } from '../lib/appEvents.js';
import { computeMatch } from '../lib/scoring.js';
import { addDays } from '../lib/utils.js';

export function buildDemoData(offers, profile, settings, now = Date.now()) {
  const nowIso = new Date(now).toISOString();
  const ranked = offers
    .filter((o) => o.space === 'france')
    .map((o) => ({ o, m: computeMatch(o, profile, settings).score }))
    .sort((a, b) => b.m - a.m)
    .map((x) => x.o);
  const bySector = (sector, skip = []) => ranked.find((o) => o.sector === sector && !skip.includes(o.id)) ?? ranked.find((o) => !skip.includes(o.id));

  const used = [];
  const pickOffer = (sector) => {
    const o = bySector(sector, used);
    if (o) used.push(o.id);
    return o;
  };

  const plan = [
    { sector: 'urbanisme', column: 'todo', notes: 'Adapter la lettre : insister sur la mission Bourg-la-Reine.' },
    { sector: 'energie', column: 'sent', appliedDaysAgo: 8, contactName: 'Service RH', notes: 'Candidature via le site carrières.' },
    { sector: 'audit', column: 'interview', appliedDaysAgo: 12, interviewInDays: 3, contactName: 'Manager opérationnel', notes: 'Entretien visio de 45 min avec le manager.' },
    { sector: 'urbanisme', column: 'rejected', appliedDaysAgo: 20, notes: 'Réponse négative standard — profil M2 privilégié.' },
  ];

  let events = {};
  const applications = {};
  plan.forEach((p, i) => {
    const offer = pickOffer(p.sector);
    if (!offer) return;
    const appliedAt = p.appliedDaysAgo ? addDays(nowIso, -p.appliedDaysAgo) : null;
    const id = `app_demo_${i}`;
    const app = {
      id, demo: true, offerId: offer.id, column: p.column, url: offer.url,
      createdAt: addDays(nowIso, -(p.appliedDaysAgo ?? 1) - 1), updatedAt: nowIso, appliedAt,
      respondedAt: ['interview', 'rejected'].includes(p.column) ? addDays(nowIso, -2) : null,
      interviewAt: p.interviewInDays ? new Date(new Date(addDays(nowIso, p.interviewInDays)).setHours(14, 30, 0, 0)).toISOString() : null,
      contactId: null, contactName: p.contactName ?? '', contactEmail: '', notes: p.notes,
      history: [{ at: addDays(nowIso, -(p.appliedDaysAgo ?? 1) - 1), column: 'todo' }, ...(appliedAt ? [{ at: appliedAt, column: 'sent' }] : []), ...(p.column !== 'todo' && p.column !== 'sent' ? [{ at: addDays(nowIso, -2), column: p.column }] : [])],
      documents: {},
    };
    applications[id] = app;
    events = syncAppEvents(events, app, offer, settings);
  });

  const companyOf = (i) => offers.find((o) => o.id === applications[`app_demo_${i}`]?.offerId);
  const contacts = {};
  const mk = (id, c) => { contacts[id] = { id, demo: true, createdAt: nowIso, interactions: [], ...c }; };
  mk('ct_demo_1', {
    name: 'Alumni ESILV (exemple)', role: 'Ingénieure projets urbains', type: 'alumni', company: companyOf(0)?.company ?? 'Egis', companyId: companyOf(0)?.companyId,
    email: '', linkedin: '', status: 'en discussion', lastContactAt: addDays(nowIso, -5), nextActionAt: addDays(nowIso, 2),
    notes: 'Rencontrée au forum ESILV. Propose de transmettre le CV au manager.',
    interactions: [{ id: 'it_1', at: addDays(nowIso, -5), channel: 'LinkedIn', summary: 'Échange sur les stages en aménagement.' }],
  });
  mk('ct_demo_2', {
    name: 'Chargé(e) de recrutement (exemple)', role: 'Talent acquisition — stages', type: 'rh', company: companyOf(1)?.company ?? 'ENGIE', companyId: companyOf(1)?.companyId,
    email: '', linkedin: '', status: 'relancer', lastContactAt: addDays(nowIso, -8), nextActionAt: addDays(nowIso, -1),
    notes: 'Candidature envoyée, relance prévue à J+7.',
    interactions: [{ id: 'it_2', at: addDays(nowIso, -8), channel: 'E-mail', summary: 'Envoi CV + lettre.' }],
  });
  mk('ct_demo_3', {
    name: 'Manager opérationnel (exemple)', role: 'Manager — transition énergétique', type: 'operationnel', company: companyOf(2)?.company ?? 'Capgemini Invent', companyId: companyOf(2)?.companyId,
    email: '', linkedin: '', status: 'en discussion', lastContactAt: addDays(nowIso, -2), nextActionAt: applications.app_demo_2?.interviewAt ?? null,
    notes: 'Entretien planifié — préparer les questions techniques.', interactions: [],
  });

  return { applications, contacts, events };
}
