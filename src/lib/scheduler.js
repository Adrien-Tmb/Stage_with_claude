// Planification des collectes (ex. 10h et 15h) avec rattrapage des créneaux manqués.

const atTime = (base, hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
};

/** Dernier créneau planifié passé (≤ now), sur aujourd'hui ou hier. */
export function lastSlot(times, now = new Date()) {
  const candidates = [];
  for (const offset of [0, -1]) {
    const day = new Date(now);
    day.setDate(day.getDate() + offset);
    for (const t of times) candidates.push(atTime(day, t));
  }
  return candidates.filter((d) => d <= now).sort((a, b) => b - a)[0] ?? null;
}

/** Prochain créneau planifié (> now). */
export function nextSlot(times, now = new Date()) {
  const candidates = [];
  for (const offset of [0, 1]) {
    const day = new Date(now);
    day.setDate(day.getDate() + offset);
    for (const t of times) candidates.push(atTime(day, t));
  }
  return candidates.filter((d) => d > now).sort((a, b) => a - b)[0] ?? null;
}

/** Une collecte est due si un créneau est passé depuis la dernière exécution. */
export function isRunDue(scraper, now = new Date()) {
  if (!scraper.enabled || !scraper.times.length) return false;
  const slot = lastSlot(scraper.times, now);
  if (!slot) return false;
  if (!scraper.lastRunAt) return true;
  return new Date(scraper.lastRunAt) < slot;
}
