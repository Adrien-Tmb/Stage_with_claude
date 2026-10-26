#!/usr/bin/env node
// Contrôle des liens de toutes les offres ouvertes, à chaque passage de la collecte.
// Usage : node scripts/routines/check-links.mjs [--write]
// Pour chaque offre : téléchargement de la page avec curl (client par défaut, via le proxy réseau), puis verdict :
//   ok        → page lue, l'annonce semble en ligne
//   gone      → 404 / 410, ou texte « offre expirée / plus disponible / pourvue » → à fermer
//   list      → le lien mène à une page de liste et non à l'annonce → trouver le lien direct
//   blocked   → site qui refuse les robots (401/403, captcha) ou domaine non autorisé : contrôle par WebSearch
//   error     → erreur réseau ponctuelle
// Avec --write, les verdicts ok / list / blocked sont enregistrés sur les offres (linkStatus, linkCheckedAt) ;
// les offres « gone » ne sont PAS fermées automatiquement : la routine confirme puis les passe dans « closed ».

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadOffers, writeJson, OFFERS_FILE } from './lib.mjs';

const GONE = /(offre|annonce)[^.]{0,40}(expir|n'est plus|plus disponible|pourvue|cl[oô]tur)|no longer (available|accepting|open)|job (has )?expired|position (has been )?filled|this job is closed|page (introuvable|not found)|404 not found/i;
const BLOCKED = /security checkup|authenticating|captcha|access denied|just a moment|verify you are human/i;
// Pages de résultats / listes d'offres : le lien ne mène pas à l'annonce elle-même.
const LIST_URL = /(\/recherche|\/search|[?&](q|k|keywords?|query)=|\/Emploi-[^/]+$|\/Stage\/[^/]+\.html$|\/jobs\/?$|\/offres-emploi\/?$)/i;

const dir = mkdtempSync(join(tmpdir(), 'links-'));
const page = join(dir, 'p.html');

function check(url) {
  let out;
  try {
    out = execFileSync('curl', ['-sL', '-m', '20', '-o', page, '-w', '%{http_code} %{url_effective}', url], { encoding: 'utf8' });
  } catch (e) {
    out = e.stdout?.toString() ?? '000';
  }
  const [codeStr, finalUrl = url] = out.trim().split(' ');
  const code = Number(codeStr);
  if (!code) return { status: 'blocked', code, note: 'domaine non autorisé ou injoignable' };
  let text = '';
  try { text = readFileSync(page, 'utf8').replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 200_000); } catch { /* page vide */ }
  if (code === 404 || code === 410) return { status: 'gone', code, finalUrl };
  if (code === 401 || code === 403 || code === 429 || BLOCKED.test(text.slice(0, 3000))) return { status: 'blocked', code, finalUrl, note: 'le site refuse les robots' };
  if (code >= 500) return { status: 'error', code, finalUrl };
  if (GONE.test(text)) return { status: 'gone', code, finalUrl, note: 'texte « offre expirée / plus disponible »' };
  if (LIST_URL.test(url) || LIST_URL.test(finalUrl)) return { status: 'list', code, finalUrl, note: 'page de liste, pas l’annonce' };
  return { status: 'ok', code, finalUrl };
}

const data = loadOffers();
const now = new Date().toISOString();
const report = { ok: [], list: [], blocked: [], gone: [], error: [] };
for (const o of data.offers.filter((x) => !x.closedAt)) {
  const r = check(o.url);
  report[r.status].push({ id: o.id, title: o.title, company: o.company, url: o.url, ...r });
  if (process.argv.includes('--write') && r.status !== 'gone' && r.status !== 'error') {
    o.linkStatus = r.status;
    o.linkCheckedAt = now;
  }
}
rmSync(dir, { recursive: true, force: true });
if (process.argv.includes('--write')) writeJson(OFFERS_FILE, data);
console.log(JSON.stringify({
  checkedAt: now,
  counts: Object.fromEntries(Object.entries(report).map(([k, v]) => [k, v.length])),
  ...report,
}, null, 2));
