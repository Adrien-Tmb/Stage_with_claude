import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCheck, Filter, Globe2, MapPin, Plus, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { useAppStore } from '../store/useAppStore.js';
import { useEnrichedOffers } from '../hooks/useOffers.js';
import { sortOffers } from '../lib/scoring.js';
import { normalize } from '../lib/utils.js';
import { SECTORS } from '../data/defaults.js';
import { COMPANY_TYPES } from '../data/companies.js';
import { SOURCES } from '../data/sources.js';
import { TIER_LABELS } from '../lib/geo.js';
import { Card, Chip, EmptyState, PageHeader, Toggle } from '../components/ui/index.jsx';
import OfferCard from '../components/offers/OfferCard.jsx';
import SortPriorityEditor from '../components/offers/SortPriorityEditor.jsx';
import AddOfferModal from '../components/offers/AddOfferModal.jsx';

const EMPTY_FILTERS = {
  status: 'all', sectors: [], durations: [], types: [], kinds: [], sources: [], tiers: [],
  minMatch: 0, maxDistance: null, hideDisliked: true, hideExpired: true, hideInPipeline: false,
};

function FilterGroup({ title, children }) {
  return (
    <div>
      <p className="label">{title}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

const toggleIn = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

export default function Feed({ space }) {
  const [params, setParams] = useSearchParams();
  const { offers, ctx } = useEnrichedOffers();
  const applications = useAppStore((s) => s.applications);
  const sorting = useAppStore((s) => s.settings.sorting[space]);
  const markAllSeen = useAppStore((s) => s.markAllSeen);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [q, setQ] = useState(params.get('q') ?? '');
  const [limit, setLimit] = useState(30);
  const [addOpen, setAddOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const isFr = space === 'france';

  useEffect(() => { setQ(params.get('q') ?? ''); }, [params]);
  useEffect(() => { setLimit(30); }, [space, filters, q]);

  const appByOffer = useMemo(() => Object.fromEntries(Object.values(applications).map((a) => [a.offerId, a])), [applications]);
  const spaceOffers = useMemo(() => offers.filter((o) => o.space === space && o.status !== 'archived'), [offers, space]);

  const list = useMemo(() => {
    const nq = normalize(q);
    const f = filters;
    const filtered = spaceOffers.filter((o) => {
      if (nq && !normalize(`${o.title} ${o.company} ${o.location.city} ${o.location.country} ${o.summary}`).includes(nq)) return false;
      if (f.status === 'new' && o.status !== 'new') return false;
      if (f.status === 'liked' && o.reaction !== 1) return false;
      if (f.hideDisliked && f.status !== 'disliked' && o.reaction === -1) return false;
      if (f.status === 'disliked' && o.reaction !== -1) return false;
      if (f.hideExpired && o.expired) return false;
      if (f.hideInPipeline && appByOffer[o.id]) return false;
      if (f.sectors.length && !f.sectors.includes(o.sector)) return false;
      if (f.durations.length && !f.durations.includes(o.durationMonths)) return false;
      if (f.types.length && !f.types.includes(o.companyType)) return false;
      if (f.kinds.length && !f.kinds.includes(o.kind)) return false;
      if (f.sources.length && !f.sources.includes(o.source)) return false;
      if (f.tiers.length && !f.tiers.includes(o.regionTier)) return false;
      if (o.matchScore < f.minMatch) return false;
      if (f.maxDistance != null && o.distanceKm > f.maxDistance) return false;
      return true;
    });
    return sortOffers(filtered, sorting, ctx);
  }, [spaceOffers, filters, q, sorting, ctx, appByOffer]);

  const newCount = spaceOffers.filter((o) => o.status === 'new').length;
  const avgMatch = list.length ? Math.round(list.reduce((s, o) => s + o.matchScore, 0) / list.length) : 0;
  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));
  const activeFilters = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS) || q;

  const filtersPanel = (
    <div className="space-y-5">
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input className="input pl-9" placeholder="Mot-clé, entreprise, ville…" value={q}
          onChange={(e) => { setQ(e.target.value); const n = new URLSearchParams(params); e.target.value ? n.set('q', e.target.value) : n.delete('q'); setParams(n, { replace: true }); }} />
      </div>
      <FilterGroup title="Affichage">
        {[['all', 'Toutes'], ['new', `Nouvelles (${newCount})`], ['liked', 'Aimées'], ['disliked', 'Écartées']].map(([v, l]) => (
          <Chip key={v} active={filters.status === v} onClick={() => set('status', v)}>{l}</Chip>
        ))}
      </FilterGroup>
      <FilterGroup title="Secteur">
        {Object.entries(SECTORS).map(([k, s]) => (
          <Chip key={k} active={filters.sectors.includes(k)} color={s.color} onClick={() => set('sectors', toggleIn(filters.sectors, k))}>{s.short}</Chip>
        ))}
      </FilterGroup>
      <FilterGroup title="Durée">
        {[3, 4, 5, 6].map((d) => <Chip key={d} active={filters.durations.includes(d)} onClick={() => set('durations', toggleIn(filters.durations, d))}>{d} mois</Chip>)}
      </FilterGroup>
      {!isFr && (
        <FilterGroup title="Zone">
          {[1, 2, 3].map((t) => <Chip key={t} active={filters.tiers.includes(t)} onClick={() => set('tiers', toggleIn(filters.tiers, t))}>{TIER_LABELS[t]}</Chip>)}
        </FilterGroup>
      )}
      <FilterGroup title="Type de structure">
        {Object.entries(COMPANY_TYPES).map(([k, t]) => <Chip key={k} active={filters.types.includes(k)} onClick={() => set('types', toggleIn(filters.types, k))}>{t.label}</Chip>)}
      </FilterGroup>
      <FilterGroup title="Nature du poste">
        {[['core', 'Cœur de cible'], ['neighbour', 'Postes voisins'], ['research', 'Recherche / labo']].map(([k, l]) => (
          <Chip key={k} active={filters.kinds.includes(k)} onClick={() => set('kinds', toggleIn(filters.kinds, k))}>{l}</Chip>
        ))}
      </FilterGroup>
      <div>
        <p className="label flex justify-between"><span>Match minimum</span><span className="text-brand-600 dark:text-brand-400">{filters.minMatch} %</span></p>
        <input type="range" min="0" max="95" step="5" value={filters.minMatch} onChange={(e) => set('minMatch', +e.target.value)} className="w-full accent-brand-500" />
      </div>
      {isFr && (
        <div>
          <p className="label flex justify-between"><span>Distance max.</span><span className="text-brand-600 dark:text-brand-400">{filters.maxDistance == null ? 'Illimitée' : `${filters.maxDistance} km`}</span></p>
          <input type="range" min="5" max="1000" step="5" value={filters.maxDistance ?? 1000}
            onChange={(e) => set('maxDistance', +e.target.value >= 1000 ? null : +e.target.value)} className="w-full accent-brand-500" />
          <div className="mt-1 flex gap-1.5">
            {[10, 25, 50].map((km) => <Chip key={km} active={filters.maxDistance === km} onClick={() => set('maxDistance', km)}>≤ {km} km</Chip>)}
          </div>
        </div>
      )}
      <FilterGroup title="Source">
        {Object.entries(SOURCES).filter(([, s]) => isFr || !s.franceOnly).map(([k, s]) => (
          <Chip key={k} active={filters.sources.includes(k)} color={s.color} onClick={() => set('sources', toggleIn(filters.sources, k))}>{s.label}</Chip>
        ))}
      </FilterGroup>
      <div className="space-y-3">
        <Toggle checked={filters.hideDisliked} onChange={(v) => set('hideDisliked', v)} label="Masquer les offres écartées" />
        <Toggle checked={filters.hideExpired} onChange={(v) => set('hideExpired', v)} label="Masquer les offres expirées" />
        <Toggle checked={filters.hideInPipeline} onChange={(v) => set('hideInPipeline', v)} label="Masquer celles déjà dans le pipeline" />
      </div>
      {activeFilters && (
        <button className="btn-ghost w-full" onClick={() => { setFilters(EMPTY_FILTERS); setQ(''); setParams({}, { replace: true }); }}>
          <RotateCcw size={14} />Réinitialiser les filtres
        </button>
      )}
    </div>
  );

  return (
    <div>
      <PageHeader
        icon={isFr ? MapPin : Globe2}
        title={isFr ? 'Espace France' : 'Espace International'}
        subtitle={isFr
          ? 'Trié par défaut de la plus proche à la plus éloignée de La Garenne-Colombes'
          : 'Focus pays et entreprises anglophones — priorité à l’Europe'}
        actions={(
          <>
            <button className="btn-secondary lg:hidden" onClick={() => setShowFilters((v) => !v)}><Filter size={16} />Filtres</button>
            {newCount > 0 && <button className="btn-secondary" onClick={() => markAllSeen(space)}><CheckCheck size={16} />Tout marquer comme vu</button>}
            <button className="btn-secondary" onClick={() => setAddOpen(true)}><Plus size={16} />Ajouter une offre</button>
          </>
        )}
      />

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className={showFilters ? 'block' : 'hidden lg:block'}>
          <div className="space-y-4 lg:sticky lg:top-24">
            <Card className="p-4">
              <div className="mb-4 flex items-center gap-2"><SlidersHorizontal size={16} className="text-brand-500" /><p className="section-title">Filtres</p></div>
              {filtersPanel}
            </Card>
            <Card className="p-4"><SortPriorityEditor space={space} /></Card>
          </div>
        </aside>

        <section>
          <div className="mb-4 grid grid-cols-3 gap-3">
            {[
              ['Offres affichées', list.length],
              ['Nouvelles', newCount],
              ['Match moyen', `${avgMatch} %`],
            ].map(([l, v]) => (
              <Card key={l} className="px-4 py-3">
                <p className="text-[11px] font-medium uppercase tracking-wide muted">{l}</p>
                <p className="text-xl font-bold text-ink-900 dark:text-white">{v}</p>
              </Card>
            ))}
          </div>

          {list.length === 0 ? (
            <EmptyState icon={Search} title="Aucune offre ne correspond"
              action={<button className="btn-secondary" onClick={() => setFilters(EMPTY_FILTERS)}>Réinitialiser les filtres</button>}>
              Élargissez les filtres ou lancez une nouvelle collecte depuis la barre du haut.
            </EmptyState>
          ) : (
            <div className="grid gap-3 2xl:grid-cols-2">
              {list.slice(0, limit).map((o, i) => <OfferCard key={o.id} offer={o} rank={i + 1} application={appByOffer[o.id]} />)}
            </div>
          )}
          {list.length > limit && (
            <div className="mt-4 text-center">
              <button className="btn-secondary" onClick={() => setLimit((l) => l + 30)}>Afficher plus ({list.length - limit} restantes)</button>
            </div>
          )}
        </section>
      </div>
      <AddOfferModal open={addOpen} onClose={() => setAddOpen(false)} defaultSpace={space} />
    </div>
  );
}
