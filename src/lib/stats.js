// Statistiques du tableau de bord.
import { DAY } from './utils.js';
import { SECTORS } from '../data/defaults.js';
import { SOURCES } from '../data/sources.js';

const startOfWeek = (d) => {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // lundi = 0
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - day);
  return x.getTime();
};

const reached = (app, col) => app.column === col || (app.history ?? []).some((h) => h.column === col);

export function computeStats({ offers, applications, events, now = Date.now() }) {
  const apps = Object.values(applications);
  const live = offers.filter((o) => o.status !== 'archived' && !o.expired);
  const sent = apps.filter((a) => a.appliedAt);
  const responded = sent.filter((a) => a.respondedAt || ['interview', 'rejected'].includes(a.column) || reached(a, 'interview'));
  const interviews = apps.filter((a) => reached(a, 'interview'));
  const ev = Object.values(events);

  // Activité hebdomadaire (8 dernières semaines)
  const weeks = [];
  const w0 = startOfWeek(now);
  for (let i = 7; i >= 0; i--) {
    const start = w0 - i * 7 * DAY;
    weeks.push({
      start,
      label: new Date(start).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
      offres: offers.filter((o) => startOfWeek(o.postedAt) === start).length,
      candidatures: sent.filter((a) => startOfWeek(a.appliedAt) === start).length,
    });
  }

  const funnel = [
    { stage: 'Retenues', value: apps.length },
    { stage: 'Envoyées', value: sent.length },
    { stage: 'Réponses', value: responded.length },
    { stage: 'Entretiens', value: interviews.length },
  ];

  const offerById = Object.fromEntries(offers.map((o) => [o.id, o]));
  const sectors = Object.entries(SECTORS).map(([key, s]) => {
    const so = live.filter((o) => o.sector === key);
    const sa = sent.filter((a) => offerById[a.offerId]?.sector === key);
    const sr = sa.filter((a) => responded.includes(a));
    const si = sa.filter((a) => interviews.includes(a));
    const avgMatch = so.length ? Math.round(so.reduce((t, o) => t + o.matchScore, 0) / so.length) : 0;
    return {
      key, label: s.short, color: s.color, offers: so.length, sent: sa.length, responses: sr.length, interviews: si.length,
      responseRate: sa.length ? Math.round((sr.length / sa.length) * 100) : null, avgMatch,
      // Potentiel : volume d'offres × adéquation, bonifié par les réponses obtenues.
      potential: Math.round(so.length * (avgMatch / 100) + sr.length * 3 + si.length * 5),
    };
  });

  const sources = Object.entries(SOURCES)
    .map(([key, s]) => ({ key, label: s.label, value: offers.filter((o) => o.source === key).length }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);

  return {
    liveOffers: live.length,
    newOffers: offers.filter((o) => o.status === 'new').length,
    postedThisWeek: offers.filter((o) => now - new Date(o.postedAt).getTime() < 7 * DAY).length,
    highMatch: live.filter((o) => o.matchScore >= 80).length,
    sent: sent.length,
    responses: responded.length,
    responseRate: sent.length ? Math.round((responded.length / sent.length) * 100) : 0,
    interviews: interviews.length,
    upcomingInterviews: ev.filter((e) => e.type === 'interview' && !e.done && new Date(e.date).getTime() > now).length,
    followUpsDue: ev.filter((e) => e.type === 'followup' && !e.done && new Date(e.date).getTime() <= now).length,
    weeks, funnel, sectors, sources,
  };
}
