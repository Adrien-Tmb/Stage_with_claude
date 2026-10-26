#!/usr/bin/env node
// Liste compacte des offres publiées encore ouvertes — à revérifier (closes ?) et à ne pas re-chercher.
// Usage : node scripts/routines/list-offers.mjs [--all]

import { loadOffers, matchFor } from './lib.mjs';

const all = process.argv.includes('--all');
const { offers, updatedAt } = loadOffers();
const rows = offers
  .filter((o) => all || !o.closedAt)
  .map((o) => ({
    id: o.id,
    title: o.title,
    company: o.company,
    city: o.location.city,
    url: o.url,
    postedAt: o.postedAt?.slice(0, 10),
    lastSeenAt: o.lastSeenAt?.slice(0, 10),
    expiresAt: o.expiresAt?.slice(0, 10) ?? null,
    closedAt: o.closedAt?.slice(0, 10) ?? null,
    match: matchFor(o).score,
  }));
console.log(JSON.stringify({ updatedAt, count: rows.length, offers: rows }, null, 2));
