import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, BellRing, CalendarClock, CheckCheck, Info, Menu, Moon, Radar, Search, Sparkles, Sun, TimerOff, Trash2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore.js';
import { nextSlot } from '../../lib/scheduler.js';
import { cx, timeAgo, timeUntil } from '../../lib/utils.js';
import { useNow } from '../../hooks/useOffers.js';

const NOTIF_ICON = { match: Sparkles, followup: BellRing, interview: CalendarClock, expired: TimerOff, info: Info };
const NOTIF_TONE = {
  match: 'bg-brand-500/15 text-brand-600 dark:text-brand-300',
  followup: 'bg-amber-500/15 text-amber-600 dark:text-amber-300',
  interview: 'bg-violet-500/15 text-violet-600 dark:text-violet-300',
  expired: 'bg-slate-500/15 text-ink-500',
  info: 'bg-sky-500/15 text-sky-600 dark:text-sky-300',
};

function Notifications() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const notifications = useAppStore((s) => s.notifications);
  const { markNotificationRead, markAllNotificationsRead, clearNotifications } = useAppStore.getState();
  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const h = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button className="icon-btn relative" onClick={() => setOpen((v) => !v)} aria-label="Notifications">
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-white dark:ring-ink-950">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="card absolute right-0 top-11 z-50 w-[22rem] overflow-hidden animate-fade-up dark:bg-ink-900">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-ink-800">
            <p className="section-title">Notifications</p>
            <div className="flex gap-1">
              <button className="btn-ghost btn-sm" onClick={markAllNotificationsRead} title="Tout marquer comme lu"><CheckCheck size={14} /></button>
              <button className="btn-ghost btn-sm" onClick={clearNotifications} title="Tout effacer"><Trash2 size={14} /></button>
            </div>
          </div>
          <div className="max-h-[26rem] overflow-y-auto">
            {notifications.length === 0 && <p className="px-4 py-10 text-center text-sm muted">Aucune notification</p>}
            {notifications.map((n) => {
              const Icon = NOTIF_ICON[n.type] ?? Info;
              return (
                <button key={n.id}
                  onClick={() => { markNotificationRead(n.id); if (n.link) navigate(n.link); setOpen(false); }}
                  className={cx('flex w-full gap-3 border-b border-slate-100 px-4 py-3 text-left transition last:border-0 hover:bg-slate-50 dark:border-ink-800/60 dark:hover:bg-ink-800/50', !n.read && 'bg-brand-500/[0.04]')}>
                  <div className={cx('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', NOTIF_TONE[n.type] ?? NOTIF_TONE.info)}><Icon size={15} /></div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-medium text-ink-900 dark:text-white">
                      <span className="truncate">{n.title}</span>
                      {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />}
                    </p>
                    <p className="line-clamp-2 text-xs muted">{n.body}</p>
                    <p className="mt-1 text-[10px] text-ink-400">{timeAgo(n.at)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Topbar({ onMenu }) {
  useNow(30_000);
  const navigate = useNavigate();
  const location = useLocation();
  const scraper = useAppStore((s) => s.settings.scraper);
  const theme = useAppStore((s) => s.settings.theme);
  const scraping = useAppStore((s) => s.scraping);
  const { scrapeNow, updateSettings } = useAppStore.getState();
  const [q, setQ] = useState('');
  const next = scraper.enabled ? nextSlot(scraper.times) : null;
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const submit = (e) => {
    e.preventDefault();
    const target = location.pathname === '/international' ? '/international' : '/france';
    navigate(`${target}?q=${encodeURIComponent(q)}`);
  };

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/75 backdrop-blur-xl dark:border-ink-800 dark:bg-ink-950/75">
      <div className="mx-auto flex h-16 max-w-[1500px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button className="icon-btn lg:hidden" onClick={onMenu} aria-label="Menu"><Menu size={20} /></button>
        <form onSubmit={submit} className="relative hidden max-w-md flex-1 sm:block">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher une offre, une entreprise, une ville…"
            className="input rounded-full pl-9 dark:bg-ink-900" />
        </form>
        <div className="flex-1 sm:hidden" />

        <div className="ml-auto flex items-center gap-1.5">
          <div className="hidden items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs dark:border-ink-800 md:flex">
            <span className={cx('h-2 w-2 rounded-full', scraper.enabled ? 'bg-brand-500 shadow-[0_0_0_3px_rgba(16,185,129,0.2)]' : 'bg-ink-400')} />
            <span className="muted">
              {scraper.enabled ? <>Prochaine collecte <b className="text-ink-700 dark:text-ink-200">{timeUntil(next)}</b></> : 'Collecte auto désactivée'}
            </span>
          </div>
          <button className="btn-primary" onClick={() => scrapeNow('manuelle')} disabled={scraping}>
            <Radar size={16} className={scraping ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{scraping ? 'Collecte…' : 'Lancer une collecte'}</span>
          </button>
          <button className="icon-btn" onClick={() => updateSettings('theme', isDark ? 'light' : 'dark')}
            aria-label="Changer de thème" title={`Thème : ${theme}`}>
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Notifications />
        </div>
      </div>
    </header>
  );
}
