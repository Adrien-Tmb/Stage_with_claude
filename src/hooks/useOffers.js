// Sélecteurs dérivés : offres enrichies (distance, trajets, scores) et horloge partagée.
import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { enrichOffer } from '../lib/scoring.js';

export function useScoringContext() {
  const profile = useAppStore((s) => s.profile);
  const settings = useAppStore((s) => s.settings);
  const interestModel = useAppStore((s) => s.interestModel);
  const followed = useAppStore((s) => s.followedCompanies);
  return useMemo(() => ({ profile, settings, interestModel, followed }), [profile, settings, interestModel, followed]);
}

/** Toutes les offres, enrichies. Recalculé uniquement quand les données sources changent. */
export function useEnrichedOffers() {
  const offers = useAppStore((s) => s.offers);
  const ctx = useScoringContext();
  const list = useMemo(() => Object.values(offers).map((o) => enrichOffer(o, ctx)), [offers, ctx]);
  return { offers: list, ctx };
}

export function useEnrichedOffer(id) {
  const offer = useAppStore((s) => (id ? s.offers[id] : null));
  const ctx = useScoringContext();
  return useMemo(() => (offer ? enrichOffer(offer, ctx) : null), [offer, ctx]);
}

/** Horloge qui force un rendu toutes les `ms` millisecondes (comptes à rebours). */
export function useNow(ms = 30_000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}
