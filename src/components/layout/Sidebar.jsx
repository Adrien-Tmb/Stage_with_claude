import { NavLink } from 'react-router-dom';
import { Building2, CalendarDays, Globe2, KanbanSquare, LayoutDashboard, MapPinned, MapPin, Settings, Users, X } from 'lucide-react';
import { useAppStore, daysUntilStart } from '../../store/useAppStore.js';
import { cx } from '../../lib/utils.js';

function useCounts() {
  const offers = useAppStore((s) => s.offers);
  const events = useAppStore((s) => s.events);
  const applications = useAppStore((s) => s.applications);
  let fr = 0;
  let intl = 0;
  for (const o of Object.values(offers)) {
    if (o.status !== 'new') continue;
    if (o.space === 'france') fr++;
    else intl++;
  }
  const now = Date.now();
  const due = Object.values(events).filter((e) => e.type === 'followup' && !e.done && new Date(e.date).getTime() <= now).length;
  const active = Object.values(applications).filter((a) => ['todo', 'sent', 'interview'].includes(a.column)).length;
  return { fr, intl, due, active };
}

export default function Sidebar({ mobileOpen, onClose }) {
  const profile = useAppStore((s) => s.profile);
  const counts = useCounts();
  const days = daysUntilStart(profile);

  const groups = [
    { label: 'Pilotage', items: [{ to: '/', label: 'Tableau de bord', icon: LayoutDashboard, end: true }] },
    {
      label: 'Smart Feed',
      items: [
        { to: '/france', label: 'Espace France', icon: MapPin, badge: counts.fr },
        { to: '/international', label: 'Espace International', icon: Globe2, badge: counts.intl },
      ],
    },
    {
      label: 'Candidatures',
      items: [
        { to: '/pipeline', label: 'Pipeline', icon: KanbanSquare, badge: counts.active, badgeTone: 'muted' },
        { to: '/calendar', label: 'Agenda & relances', icon: CalendarDays, badge: counts.due, badgeTone: 'alert' },
      ],
    },
    {
      label: 'Outils',
      items: [
        { to: '/map', label: 'Carte & trajets', icon: MapPinned },
        { to: '/companies', label: 'Fiches entreprises', icon: Building2 },
        { to: '/contacts', label: 'Réseau & contacts', icon: Users },
      ],
    },
  ];

  const nav = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-emerald-700 shadow-glow">
            <svg viewBox="0 0 32 32" className="h-5 w-5"><path d="M7 21l5-9 4 6 2-3 4 6" stroke="white" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div>
            <p className="text-[15px] font-extrabold tracking-tight text-ink-900 dark:text-white">StagePilot</p>
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] muted">Recherche de stage</p>
          </div>
        </div>
        <button className="icon-btn lg:hidden" onClick={onClose} aria-label="Fermer le menu"><X size={18} /></button>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {groups.map((g) => (
          <div key={g.label}>
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400 dark:text-ink-500">{g.label}</p>
            <div className="space-y-0.5">
              {g.items.map((it) => (
                <NavLink key={it.to} to={it.to} end={it.end} onClick={onClose}
                  className={({ isActive }) => cx(
                    'group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition',
                    isActive
                      ? 'bg-brand-500/10 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
                      : 'text-ink-600 hover:bg-slate-100 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-ink-800/70 dark:hover:text-white',
                  )}>
                  <it.icon size={18} className="shrink-0" />
                  <span className="flex-1 truncate">{it.label}</span>
                  {it.badge > 0 && (
                    <span className={cx('rounded-md px-1.5 py-0.5 text-[10px] font-bold',
                      it.badgeTone === 'alert' ? 'bg-rose-500 text-white' : it.badgeTone === 'muted' ? 'bg-slate-200 text-ink-600 dark:bg-ink-700 dark:text-ink-200' : 'bg-brand-500 text-white')}>
                      {it.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="space-y-3 border-t border-slate-200 p-3 dark:border-ink-800">
        <div className="rounded-xl bg-gradient-to-br from-brand-500/15 via-emerald-500/5 to-transparent p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">Objectif avril 2027</p>
          <p className="mt-0.5 text-2xl font-extrabold text-ink-900 dark:text-white">J-{Math.max(0, days)}</p>
          <p className="text-xs muted">Stage {profile.availability.durationMin} à {profile.availability.durationMax} mois</p>
        </div>
        <NavLink to="/settings" onClick={onClose}
          className={({ isActive }) => cx('flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition',
            isActive ? 'bg-brand-500/10 text-brand-700 dark:text-brand-300' : 'text-ink-600 hover:bg-slate-100 dark:text-ink-400 dark:hover:bg-ink-800/70')}>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-ink-700 to-ink-900 text-xs font-bold text-white">
            {profile.firstName[0]}{profile.lastName[0]}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-ink-900 dark:text-white">{profile.firstName} {profile.lastName}</p>
            <p className="truncate text-[11px] muted">ESILV · {profile.level}</p>
          </div>
          <Settings size={16} />
        </NavLink>
      </div>
    </div>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white/80 backdrop-blur-xl dark:border-ink-800 dark:bg-ink-950/80 lg:block">
        {nav}
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/60" onClick={onClose} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white animate-fade-up dark:bg-ink-950">{nav}</aside>
        </div>
      )}
    </>
  );
}
