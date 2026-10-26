// Événements d'agenda générés automatiquement à partir de l'état d'une candidature.

import { addDays } from './utils.js';

/**
 * Recalcule les événements automatiques (relance J+N, entretien, relance post-entretien)
 * liés à une candidature, en conservant l'état "fait" / "notifié" s'il n'a pas changé de date.
 */
export function syncAppEvents(events, app, offer, settings) {
  const previous = Object.values(events).filter((e) => e.auto && e.applicationId === app.id);
  const next = Object.fromEntries(Object.entries(events).filter(([, e]) => !(e.auto && e.applicationId === app.id)));
  const label = offer ? `${offer.company} — ${offer.title}` : app.title ?? 'Candidature';
  const days = settings.notifications.followUpDays;
  const add = (ev) => {
    const old = previous.find((e) => e.id === ev.id);
    const sameDate = old && old.date === ev.date;
    next[ev.id] = { ...ev, done: sameDate ? old.done : false, notified: sameDate ? old.notified : false, demo: app.demo };
  };

  if (app.column === 'sent' && app.appliedAt) {
    add({
      id: `ev_fu_${app.id}`, auto: true, type: 'followup', applicationId: app.id, title: `Relancer : ${label}`,
      date: app.followUpAt ?? addDays(app.appliedAt, days),
      notes: `Relance J+${days} après candidature.${app.contactName ? ` Contact : ${app.contactName}` : ''}`,
    });
  }
  if (app.column === 'interview' && app.interviewAt) {
    add({
      id: `ev_iv_${app.id}`, auto: true, type: 'interview', applicationId: app.id, title: `Entretien : ${label}`,
      date: app.interviewAt, durationMin: 60, location: app.interviewPlace || offer?.location?.city || '', notes: app.notes ?? '',
    });
    add({
      id: `ev_fu_${app.id}`, auto: true, type: 'followup', applicationId: app.id, title: `Relancer après entretien : ${label}`,
      date: addDays(app.interviewAt, days), notes: 'Message de remerciement / relance post-entretien.',
    });
  }
  return next;
}
