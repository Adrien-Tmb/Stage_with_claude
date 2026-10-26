// Utilitaires génériques : identifiants, normalisation de texte, dates, aléatoire déterministe.

export const uid = (prefix = 'id') =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/** Minuscules, sans accents ni ponctuation superflue — sert au dédoublonnage et au matching. */
export function normalize(str = '') {
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, ' ')
    .replace(/[^a-z0-9+#/ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Empreinte stable d'une offre : même entreprise + même intitulé + même ville = doublon. */
export function fingerprint({ company, title, city }) {
  const t = normalize(title)
    .replace(/\b(stage|stagiaire|intern|internship|h f|f h|m f|w m|e)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return `${normalize(company)}|${t}|${normalize(city)}`;
}

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/** PRNG déterministe (mulberry32) : le corpus simulé est identique d'une session à l'autre. */
export function seededRandom(seed) {
  let a = typeof seed === 'number' ? seed : hashString(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

export function shuffle(arr, rng = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- Dates ----------
export const DAY = 86_400_000;

export const addDays = (date, days) => new Date(new Date(date).getTime() + days * DAY).toISOString();

export const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / DAY);

export const isSameDay = (a, b) => {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
};

export function formatDate(date, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('fr-FR', opts);
}

export function formatDateTime(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(date) {
  if (!date) return '—';
  const diff = Date.now() - new Date(date).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  if (d < 30) return `il y a ${d} j`;
  return formatDate(date);
}

export function timeUntil(date) {
  const diff = new Date(date).getTime() - Date.now();
  if (diff <= 0) return 'maintenant';
  const min = Math.round(diff / 60000);
  if (min < 60) return `dans ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `dans ${h} h ${String(min % 60).padStart(2, '0')}`;
  return `dans ${Math.round(h / 24)} j`;
}

/** Valeur pour <input type="date"> */
export const toDateInput = (date) => (date ? new Date(date).toISOString().slice(0, 10) : '');
/** Valeur pour <input type="datetime-local"> en heure locale */
export function toDateTimeInput(date) {
  if (!date) return '';
  const d = new Date(date);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d - off).toISOString().slice(0, 16);
}

// ---------- Objets ----------
/** Écriture immuable d'une valeur à un chemin "a.b.c". */
export function setIn(obj, path, value) {
  const keys = Array.isArray(path) ? path : path.split('.');
  if (keys.length === 0) return value;
  const [head, ...rest] = keys;
  return { ...obj, [head]: rest.length ? setIn(obj?.[head] ?? {}, rest, value) : value };
}

export function getIn(obj, path) {
  return (Array.isArray(path) ? path : path.split('.')).reduce((o, k) => o?.[k], obj);
}

/** Fusion profonde : les valeurs par défaut complètent un état persisté plus ancien. */
export function deepMerge(base, override) {
  if (Array.isArray(base) || Array.isArray(override)) return override ?? base;
  if (typeof base !== 'object' || base === null) return override ?? base;
  const out = { ...base };
  for (const k of Object.keys(override ?? {})) {
    out[k] = typeof override[k] === 'object' && override[k] !== null && !Array.isArray(override[k])
      ? deepMerge(base[k] ?? {}, override[k])
      : override[k];
  }
  return out;
}

export const cx = (...classes) => classes.filter(Boolean).join(' ');

export function downloadFile(filename, content, mime = 'application/json') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Intitulé sans le préfixe « Stage – » (évite « candidature au stage « Stage – … » »). */
export const shortTitle = (title = '') => title.replace(/^Stage(?: de recherche| R&D)?\s*[–-]\s*/i, '');

// ---------- Offres réelles : champs parfois inconnus ----------
/** « 5 mois », « 4 à 6 mois » (libellé de l'annonce) ou « durée n.c. ». */
export const durationText = (o) => o.durationLabel || (o.durationMonths ? `${o.durationMonths} mois` : 'durée n.c.');

/** « dès avr. 2027 », « févr.–juin 2027 » (libellé de l'annonce) ou « début n.c. ». */
export const startText = (o) => o.startLabel
  || (o.startDate ? `dès ${formatDate(o.startDate, { month: 'short', year: 'numeric' })}` : 'début n.c.');
