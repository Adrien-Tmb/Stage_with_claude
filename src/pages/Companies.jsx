import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Building2, ExternalLink, GraduationCap, KanbanSquare, MapPin, Search, Star, Users, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore.js';
import { useEnrichedOffers } from '../hooks/useOffers.js';
import { COMPANY_BY_ID, COMPANY_TYPES } from '../data/companies.js';
import { COLUMNS, SECTORS } from '../data/defaults.js';
import { cx, durationText, normalize } from '../lib/utils.js';
import { formatKm } from '../lib/geo.js';
import { Badge, Card, Chip, Drawer, PageHeader, ScoreRing, SectorBadge } from '../components/ui/index.jsx';
import { useOpenOffer } from '../components/offers/OfferCard.jsx';
import { alumniSearchUrl } from './Contacts.jsx';

function CompanyDrawer({ group, onClose }) {
  const followed = useAppStore((s) => !!s.followedCompanies[group.id]);
  const toggleFollowCompany = useAppStore((s) => s.toggleFollowCompany);
  const open = useOpenOffer();
  return (
    <Drawer open onClose={onClose}>
      <div className="border-b border-slate-200 bg-gradient-to-br from-brand-500/10 to-transparent px-6 pb-5 pt-6 dark:border-ink-800">
        <button className="icon-btn absolute right-4 top-4" onClick={onClose}><X size={18} /></button>
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-ink-700 to-ink-900 text-lg font-extrabold text-white">{group.name.slice(0, 2).toUpperCase()}</div>
          <div>
            <h2 className="text-xl font-bold text-ink-900 dark:text-white">{group.name}</h2>
            <p className="text-sm muted">{COMPANY_TYPES[group.type]?.label} · {group.cities.join(', ')}</p>
          </div>
        </div>
        {group.description && <p className="mt-3 text-sm text-ink-600 dark:text-ink-300">{group.description}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => toggleFollowCompany(group.id)} className={followed ? 'btn-primary' : 'btn-secondary'}><Star size={15} className={followed ? 'fill-current' : ''} />{followed ? 'Entreprise suivie' : 'Suivre'}</button>
          {group.website && <a className="btn-secondary" href={group.website} target="_blank" rel="noreferrer"><ExternalLink size={15} />Site carrières</a>}
          <a className="btn-secondary" href={alumniSearchUrl(group.name)} target="_blank" rel="noreferrer"><GraduationCap size={15} />Alumni ESILV</a>
        </div>
      </div>
      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
        <div className="grid grid-cols-4 gap-2 text-center">
          {[['Offres', group.offers.length], ['Match max', `${group.bestMatch} %`], ['Candidatures', group.apps.length], ['Contacts', group.contacts.length]].map(([l, v]) => (
            <div key={l} className="rounded-xl bg-slate-50 py-3 dark:bg-ink-950/50"><p className="text-lg font-bold text-ink-900 dark:text-white">{v}</p><p className="text-[11px] muted">{l}</p></div>
          ))}
        </div>
        <section>
          <p className="label">Offres ({group.offers.length})</p>
          <div className="space-y-2">
            {group.offers.map((o) => (
              <button key={o.id} onClick={() => open(o.id)} className="card card-hover flex w-full items-center gap-3 p-3 text-left">
                <ScoreRing value={o.matchScore} size={38} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">{o.title}</p>
                  <p className="text-xs muted">{o.location.city} · {durationText(o)} · {formatKm(o.distanceKm)}{o.expired ? ' · expirée' : ''}</p>
                </div>
                <SectorBadge sector={o.sector} sectors={SECTORS} />
              </button>
            ))}
          </div>
        </section>
        {group.apps.length > 0 && (
          <section>
            <p className="label">Candidatures</p>
            {group.apps.map((a) => <p key={a.id} className="text-sm"><Badge tone="indigo"><KanbanSquare size={11} />{COLUMNS.find((c) => c.id === a.column)?.label}</Badge> <span className="muted">{a.title}</span></p>)}
          </section>
        )}
        {group.contacts.length > 0 && (
          <section>
            <p className="label">Contacts</p>
            {group.contacts.map((c) => <p key={c.id} className="text-sm text-ink-700 dark:text-ink-200"><Users size={13} className="mr-1 inline" />{c.name} — <span className="muted">{c.role}</span></p>)}
          </section>
        )}
      </div>
    </Drawer>
  );
}

export default function Companies() {
  const { offers } = useEnrichedOffers();
  const applications = useAppStore((s) => s.applications);
  const contacts = useAppStore((s) => s.contacts);
  const followedMap = useAppStore((s) => s.followedCompanies);
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [space, setSpace] = useState('all');

  const groups = useMemo(() => {
    const map = {};
    for (const o of offers) {
      if (o.status === 'archived') continue;
      const g = map[o.companyId] ??= {
        id: o.companyId, name: o.company, type: o.companyType, space: o.space, offers: [], apps: [], contacts: [], cities: [], sectors: new Set(),
        description: COMPANY_BY_ID[o.companyId]?.description, website: COMPANY_BY_ID[o.companyId]?.website,
      };
      g.offers.push(o);
      g.sectors.add(o.sector);
      if (!g.cities.includes(o.location.city)) g.cities.push(o.location.city);
    }
    for (const a of Object.values(applications)) {
      const o = offers.find((x) => x.id === a.offerId);
      if (o && map[o.companyId]) map[o.companyId].apps.push({ ...a, title: o.title });
    }
    for (const c of Object.values(contacts)) {
      const g = Object.values(map).find((x) => x.id === c.companyId || x.name === c.company);
      if (g) g.contacts.push(c);
    }
    return Object.values(map).map((g) => ({
      ...g, sectors: [...g.sectors], bestMatch: Math.max(...g.offers.map((o) => o.matchScore)),
      nearest: Math.min(...g.offers.map((o) => o.distanceKm)), followed: !!followedMap[g.id],
    })).sort((a, b) => b.followed - a.followed || b.offers.length - a.offers.length || b.bestMatch - a.bestMatch);
  }, [offers, applications, contacts, followedMap]);

  const list = groups.filter((g) => (!q || normalize(g.name).includes(normalize(q)))
    && (filter === 'all' || (filter === 'followed' ? g.followed : g.type === filter))
    && (space === 'all' || g.space === space));
  const selected = groups.find((g) => g.id === params.get('c'));

  return (
    <div>
      <PageHeader icon={Building2} title="Fiches entreprises" subtitle={`${groups.length} entreprises — offres regroupées pour une vision globale de chaque groupe`} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input className="input pl-9" placeholder="Rechercher une entreprise…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {[['all', 'Toutes'], ['france', 'France'], ['international', 'International']].map(([k, l]) => <Chip key={k} active={space === k} onClick={() => setSpace(k)}>{l}</Chip>)}
        <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-ink-700" />
        <Chip active={filter === 'all'} onClick={() => setFilter('all')}>Tous types</Chip>
        <Chip active={filter === 'followed'} onClick={() => setFilter('followed')}><Star size={12} />Suivies</Chip>
        {Object.entries(COMPANY_TYPES).map(([k, t]) => <Chip key={k} active={filter === k} onClick={() => setFilter(k)}>{t.label}</Chip>)}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {list.map((g) => (
          <button key={g.id} onClick={() => setParams({ c: g.id })} className="card card-hover p-4 text-left">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-ink-700 to-ink-900 text-sm font-extrabold text-white">{g.name.slice(0, 2).toUpperCase()}</div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate font-semibold text-ink-900 dark:text-white">{g.name}{g.followed && <Star size={13} className="shrink-0 fill-amber-400 text-amber-400" />}</p>
                <p className="truncate text-xs muted">{COMPANY_TYPES[g.type]?.label}</p>
              </div>
              <ScoreRing value={g.bestMatch} size={38} />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">{g.sectors.map((s) => <SectorBadge key={s} sector={s} sectors={SECTORS} />)}</div>
            <div className="mt-3 flex items-center gap-3 border-t border-slate-100 pt-3 text-xs muted dark:border-ink-800">
              <span className="font-semibold text-ink-800 dark:text-ink-100">{g.offers.length} offre{g.offers.length > 1 ? 's' : ''}</span>
              <span className="flex items-center gap-1 truncate"><MapPin size={12} />{g.cities.slice(0, 2).join(', ')}{g.cities.length > 2 ? '…' : ''}</span>
              {g.apps.length > 0 && <Badge tone="indigo" className={cx('ml-auto')}>{g.apps.length} cand.</Badge>}
            </div>
          </button>
        ))}
      </div>
      {selected && <CompanyDrawer group={selected} onClose={() => setParams({})} />}
    </div>
  );
}
