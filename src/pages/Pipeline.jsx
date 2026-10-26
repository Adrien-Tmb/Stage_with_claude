import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BellRing, Building2, CalendarClock, KanbanSquare, MapPin, Search, StickyNote, User } from 'lucide-react';
import { useAppStore } from '../store/useAppStore.js';
import { useEnrichedOffers } from '../hooks/useOffers.js';
import { COLUMNS, SECTORS } from '../data/defaults.js';
import { cx, daysBetween, formatDate, normalize, shortTitle } from '../lib/utils.js';
import { EmptyState, PageHeader, ScoreRing, SectorBadge } from '../components/ui/index.jsx';
import ApplicationModal from '../components/pipeline/ApplicationModal.jsx';

function AppCard({ app, offer, onOpen, onDragStart, followUp }) {
  const now = Date.now();
  const due = followUp && !followUp.done && new Date(followUp.date).getTime() <= now;
  return (
    <div draggable onDragStart={onDragStart} onClick={onOpen}
      className="card card-hover cursor-grab p-3 active:cursor-grabbing dark:bg-ink-900">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-semibold leading-snug text-ink-900 dark:text-white">{offer ? shortTitle(offer.title) : 'Offre supprimée'}</p>
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs muted"><Building2 size={12} />{offer?.company}</p>
          <p className="flex items-center gap-1 truncate text-xs muted"><MapPin size={12} />{offer?.location.city}</p>
        </div>
        {offer && <ScoreRing value={offer.matchScore} size={36} />}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {offer && <SectorBadge sector={offer.sector} sectors={SECTORS} />}
        {app.appliedAt && <span className="text-[11px] muted">Envoyée le {formatDate(app.appliedAt, { day: 'numeric', month: 'short' })}</span>}
      </div>
      {(app.contactName || app.notes || app.interviewAt || due) && (
        <div className="mt-2 space-y-1 border-t border-slate-100 pt-2 text-[11px] dark:border-ink-800">
          {app.interviewAt && app.column === 'interview' && (
            <p className="flex items-center gap-1 font-medium text-violet-600 dark:text-violet-300"><CalendarClock size={12} />{new Date(app.interviewAt).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
          )}
          {due && <p className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400"><BellRing size={12} />Relance à faire (J+{daysBetween(app.appliedAt ?? app.interviewAt, now)})</p>}
          {app.contactName && <p className="flex items-center gap-1 truncate muted"><User size={12} />{app.contactName}</p>}
          {app.notes && <p className="flex items-start gap-1 muted"><StickyNote size={12} className="mt-0.5 shrink-0" /><span className="line-clamp-2">{app.notes}</span></p>}
        </div>
      )}
      {offer?.expired && app.column !== 'closed' && <p className="mt-2 rounded-md bg-rose-500/10 px-2 py-1 text-[11px] text-rose-600 dark:text-rose-300">L'offre a expiré</p>}
    </div>
  );
}

export default function Pipeline() {
  const applications = useAppStore((s) => s.applications);
  const events = useAppStore((s) => s.events);
  const moveApplication = useAppStore((s) => s.moveApplication);
  const { offers } = useEnrichedOffers();
  const [dragId, setDragId] = useState(null);
  const [over, setOver] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [q, setQ] = useState('');

  const offerById = useMemo(() => Object.fromEntries(offers.map((o) => [o.id, o])), [offers]);
  const followUps = useMemo(() => Object.fromEntries(Object.values(events).filter((e) => e.type === 'followup' && e.auto).map((e) => [e.applicationId, e])), [events]);
  const apps = Object.values(applications).filter((a) => !q || normalize(`${offerById[a.offerId]?.title} ${offerById[a.offerId]?.company} ${a.notes}`).includes(normalize(q)));

  const onDrop = (col) => {
    if (dragId) moveApplication(dragId, col);
    setDragId(null);
    setOver(null);
  };

  const total = Object.keys(applications).length;
  return (
    <div>
      <PageHeader icon={KanbanSquare} title="Pipeline de candidatures"
        subtitle="Glissez-déposez les cartes · relance automatique J+7 · offres expirées détectées automatiquement"
        actions={(
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input className="input w-64 pl-9" placeholder="Filtrer les cartes…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        )} />
      {total === 0 ? (
        <EmptyState icon={KanbanSquare} title="Votre pipeline est vide" action={<Link to="/france" className="btn-primary">Parcourir les offres</Link>}>
          Cliquez sur « Postuler » sur une offre du Smart Feed pour l'ajouter ici.
        </EmptyState>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
          <div className="grid min-w-[1100px] grid-cols-5 gap-4">
            {COLUMNS.map((col) => {
              const list = apps.filter((a) => a.column === col.id).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
              return (
                <div key={col.id}
                  onDragOver={(e) => { e.preventDefault(); setOver(col.id); }}
                  onDragLeave={() => setOver(null)}
                  onDrop={() => onDrop(col.id)}
                  className={cx('flex min-h-[60vh] flex-col rounded-2xl border bg-slate-100/60 p-3 transition dark:bg-ink-900/40',
                    over === col.id ? 'border-brand-500 bg-brand-500/5' : 'border-transparent')}>
                  <div className="mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: col.color }} />
                      <p className="text-sm font-semibold text-ink-800 dark:text-ink-100">{col.label}</p>
                      <span className="ml-auto rounded-md bg-white px-1.5 text-xs font-bold text-ink-500 dark:bg-ink-800 dark:text-ink-300">{list.length}</span>
                    </div>
                    <p className="mt-0.5 text-[11px] muted">{col.hint}</p>
                  </div>
                  <div className="flex flex-1 flex-col gap-2.5">
                    {list.map((a) => (
                      <AppCard key={a.id} app={a} offer={offerById[a.offerId]} followUp={followUps[a.id]}
                        onOpen={() => setOpenId(a.id)} onDragStart={() => setDragId(a.id)} />
                    ))}
                    {list.length === 0 && <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-300 py-8 text-xs muted dark:border-ink-700">Déposez une carte ici</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {openId && <ApplicationModal appId={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
