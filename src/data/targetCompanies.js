// Entreprises cibles choisies par Adrien : 3 groupes, chacun classé du plus au moins intéressant.
// Partagé par l'application (badge, bonus d'intérêt, tri) et par la routine de collecte (routines/criteres.json).

import { normalize } from '../lib/utils.js';

export const TARGET_GROUPS = [
  { tier: 1, label: 'Cible prioritaire', companies: [
    { name: 'Setec', aliases: ['setec'] },
    { name: 'Carbone 4', aliases: ['carbone 4', 'carbone4'] },
    { name: 'Capgemini', aliases: ['capgemini'] },
    { name: 'EDF', aliases: ['edf'] },
    { name: 'TotalEnergies', aliases: ['totalenergies', 'total energies'] },
  ] },
  { tier: 2, label: 'Cible', companies: [
    { name: 'Egis', aliases: ['egis'] },
    { name: 'Artelia', aliases: ['artelia'] },
    { name: 'Ingérop', aliases: ['ingerop'] },
    { name: 'Eiffage', aliases: ['eiffage'] },
    { name: 'Bouygues Construction', aliases: ['bouygues'] },
    { name: 'VINCI Energies / VINCI Construction', aliases: ['vinci'] },
    { name: 'Veolia', aliases: ['veolia'] },
    { name: 'ENGIE', aliases: ['engie'] },
    { name: 'Dalkia', aliases: ['dalkia'] },
  ] },
  { tier: 3, label: 'Cible secondaire', companies: [
    { name: 'Grand Paris Aménagement', aliases: ['grand paris amenagement'] },
    { name: 'AREP', aliases: ['arep'] },
    { name: 'Nexity', aliases: ['nexity'] },
    { name: 'Altarea', aliases: ['altarea', 'cogedim'] },
    { name: 'Terao', aliases: ['terao'] },
    { name: 'GRDF', aliases: ['grdf'] },
  ] },
];

const INDEX = TARGET_GROUPS.flatMap((g) => g.companies.map((c, rank) => ({ ...c, tier: g.tier, rank, label: g.label })));
const cache = new Map();

/** Entreprise cible correspondant au nom d'une offre (mot entier, sans accents) ; null sinon. */
export function targetCompany(companyName = '') {
  if (cache.has(companyName)) return cache.get(companyName);
  const n = ` ${normalize(companyName)} `;
  const hit = INDEX.find((c) => c.aliases.some((a) => n.includes(` ${a} `))) ?? null;
  cache.set(companyName, hit);
  return hit;
}

/** Bonus d'intérêt : groupe 1 > 2 > 3, et léger avantage aux premières entreprises de chaque groupe. */
export function targetBonus(companyName) {
  const t = targetCompany(companyName);
  if (!t) return 0;
  return { 1: 14, 2: 9, 3: 5 }[t.tier] - Math.min(t.rank, 8) * 0.5;
}
