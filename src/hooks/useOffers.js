// Sélecteurs dérivés : offres enrichies (distance, trajets, scores) et horloge partagée.
import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { enrichOffer } from '../lib/scoring.js';
import { isOfferVisible } from '../lib/published.js';

export function useScoringContext() {
  const profile = useAppStore((s) => s.profile);
  const settings = useAppStore((s) => s.settings);
  const interestModel = useAppStore((s) => s.interestModel);
  const followed = useAppStore((s) => s.followedCompanies);
  return useMemo(() => ({ profile, settings, interestModel, followed }), [profile, settings, interestModel, followed]);
}

/** Offres visibles selon le mode de collecte (réelles / simulées / mixte). */
export function useVisibleOffers() {
  const offers = useAppStore((s) => s.offers);
  const applications = useAppStore((s) => s.applications);
  const mode = useAppStore((s) => s.settings.scraper.mode);
  const sources = useAppStore((s) => s.settings.scraper.sources);
  return useMemo(() => {
    const tracked = new Set(Object.values(applications).map((a) => a.offerId));
    // Une source désactivée dans les paramètres masque aussi les offres réelles qui en proviennent.
    return Object.values(offers).filter((o) => isOfferVisible(o, mode, tracked.has(o.id))
      && (!o.real || sources[o.source] !== false || tracked.has(o.id)));
  }, [offers, applications, mode, sources]);
}

/** Toutes les offres visibles, enrichies. Recalculé uniquement quand les données sources changent. */
export function useEnrichedOffers() {
  const offers = useVisibleOffers();
  const ctx = useScoringContext();
  const list = useMemo(() => offers.map((o) => enrichOffer(o, ctx)), [offers, ctx]);
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
