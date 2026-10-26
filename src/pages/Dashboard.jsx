import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  ArrowRight, BellRing, Bot, BriefcaseBusiness, CalendarClock, CalendarDays, CheckCircle2, Flame, Gauge, Globe2, LayoutDashboard,
  MapPin, MessageSquareReply, Radar, Send, Sparkles, Target, TrendingUp,
} from 'lucide-react';
import { useAppStore, daysUntilStart } from '../store/useAppStore.js';
import { useEnrichedOffers, useNow } from '../hooks/useOffers.js';
import { useChartTheme } from '../hooks/useChartTheme.js';
import { computeStats } from '../lib/stats.js';
import { sortOffers } from '../lib/scoring.js';
import { nextSlot } from '../lib/scheduler.js';
import { SOURCES } from '../data/sources.js';
import { SECTORS } from '../data/defaults.js';
import { formatKm } from '../lib/geo.js';
import { cx, formatDateTime, timeAgo, timeUntil } from '../lib/utils.js';
import { Card, CardHeader, EmptyState, PageHeader, ProgressBar, ScoreRing, SectorBadge } from '../components/ui/index.jsx';
import { useOpenOffer } from '../components/offers/OfferCard.jsx';

function ChartTooltip({ active, payload, label, theme, unit = '' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border px-3 py-2 text-xs shadow-lg" style={{ background: theme.surface, borderColor: theme.grid, color: theme.text }}>
      <p className="mb-1 font-semibold">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color ?? p.payload?.fill }} />
          <span style={{ color: theme.muted }}>{p.name}</span>
          <b className="ml-auto pl-3">{p.value}{unit}</b>
        </p>
      ))}
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, tone = 'brand', to }) {
  const tones = {
    brand: 'from-brand-500/15 text-brand-600 dark:text-brand-400',
    sky: 'from-sky-500/15 text-sky-600 dark:text-sky-400',
    violet: 'from-violet-500/15 text-violet-600 dark:text-violet-400',
    amber: 'from-amber-500/15 text-amber-600 dark:text-amber-400',
    rose: 'from-rose-500/15 text-rose-600 dark:text-rose-400',
    indigo: 'from-indigo-500/15 text-indigo-600 dark:text-indigo-400',
  };
  const body = (
    <Card className={cx('relative overflow-hidden p-4', to && 'card-hover')}>
      <div className={cx('absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br to-transparent', tones[tone])} />
      <div className={cx('relative mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-ink-800', tones[tone])}><Icon size={18} /></div>
      <p className="relative text-2xl font-extrabold tracking-tight text-ink-900 dark:text-white">{value}</p>
      <p className="relative text-xs font-medium text-ink-600 dark:text-ink-300">{label}</p>
      {sub && <p className="relative mt-0.5 text-[11px] muted">{sub}</p>}
    </Card>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

function ScraperCard() {
  useNow(30_000);
  const scraper = useAppStore((s) => s.settings.scraper);
  const log = useAppStore((s) => s.scrapeLog);
  const scraping = useAppStore((s) => s.scraping);
  const scrapeNow = useAppStore((s) => s.scrapeNow);
  const last = log[0];
  const enabledSources = Object.entries(scraper.sources).filter(([, v]) => v).map(([k]) => SOURCES[k]?.label);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-200">
        <span className={cx('h-2 w-2 rounded-full', scraper.enabled ? 'animate-pulse bg-emerald-300' : 'bg-white/40')} />
        Moteur de collecte {scraper.enabled ? 'actif' : 'en pause'}
      </div>
      <p className="mt-2 text-sm text-white/80">
        {scraper.times.join(' · ')} — {enabledSources.length} sources
        {scraper.enabled && <> · prochaine passe <b className="text-white">{timeUntil(nextSlot(scraper.times))}</b></>}
      </p>
      {last && (
        <p className="mt-1 text-xs text-white/60">
          Dernière passe {timeAgo(last.at)} : <b className="text-white">{last.added}</b> nouvelles, {last.duplicates} doublons ignorés, {last.filtered} hors critères
        </p>
      )}
      <button onClick={() => scrapeNow('manuelle')} disabled={scraping}
        className="btn mt-3 bg-white text-ink-900 hover:bg-emerald-50 disabled:opacity-60">
        <Radar size={15} className={scraping ? 'animate-spin' : ''} />Lancer maintenant
      </button>
    </div>
  );
}

export default function Dashboard() {
  const { offers, ctx } = useEnrichedOffers();
  const applications = useAppStore((s) => s.applications);
  const events = useAppStore((s) => s.events);
  const profile = useAppStore((s) => s.profile);
  const log = useAppStore((s) => s.scrapeLog);
  const openAiPanel = useAppStore((s) => s.openAiPanel);
  const toggleEventDone = useAppStore((s) => s.toggleEventDone);
  const theme = useChartTheme();
  const open = useOpenOffer();
  const stats = useMemo(() => computeStats({ offers, applications, events }), [offers, applications, events]);
  const appOffers = useMemo(() => new Set(Object.values(applications).map((a) => a.offerId)), [applications]);

  const top = useMemo(() => sortOffers(
    offers.filter((o) => !o.expired && o.status !== 'archived' && o.reaction !== -1 && !appOffers.has(o.id)),
    ['match', 'interest', 'duration', 'sector', 'distance'], ctx,
  ).slice(0, 6), [offers, ctx, appOffers]);

  const agenda = useMemo(() => Object.values(events)
    .filter((e) => !e.done)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 6), [events]);

  const sectorsRanked = [...stats.sectors].filter((s) => s.offers || s.sent).sort((a, b) => b.potential - a.potential);
  const maxSource = stats.sources[0]?.value ?? 1;
  const days = daysUntilStart(profile);
  const hour = new Date().getHours();

  return (
    <div className="space-y-6">
      <PageHeader icon={LayoutDashboard} title="Tableau de bord" subtitle="Vue d'ensemble de votre recherche de stage" />

      {/* --- Hero --- */}
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-ink-900 p-6 text-white shadow-glow xl:col-span-2">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 right-40 h-40 w-40 rounded-full bg-sky-400/20 blur-3xl" />
          <div className="relative grid gap-6 md:grid-cols-[1fr_auto]">
            <div>
              <p className="text-sm text-emerald-100">{hour < 18 ? 'Bonjour' : 'Bonsoir'} {profile.firstName} 👋</p>
              <h2 className="mt-1 text-2xl font-bold leading-tight sm:text-3xl">
                {stats.newOffers > 0 ? <>{stats.newOffers} nouvelles offres vous attendent</> : 'Votre veille est à jour'}
              </h2>
              <p className="mt-2 max-w-xl text-sm text-emerald-50/80">
                {stats.highMatch} offres actives avec un match ≥ 80 %, {stats.followUpsDue > 0 ? `${stats.followUpsDue} relance(s) à faire` : 'aucune relance en retard'} et {stats.upcomingInterviews} entretien(s) à venir.
                Objectif : un stage de {profile.availability.durationMin} à {profile.availability.durationMax} mois dès avril 2027, dans <b className="text-white">{days} jours</b>.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to="/france" className="btn bg-white/15 text-white backdrop-blur hover:bg-white/25"><MapPin size={15} />Espace France</Link>
                <Link to="/international" className="btn bg-white/15 text-white backdrop-blur hover:bg-white/25"><Globe2 size={15} />International</Link>
                <Link to="/pipeline" className="btn bg-white/15 text-white backdrop-blur hover:bg-white/25"><BriefcaseBusiness size={15} />Pipeline</Link>
              </div>
            </div>
            <div className="md:w-72"><ScraperCard /></div>
          </div>
        </div>

        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="section-title">Avancement de la recherche</p>
            <Link to="/settings" className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">Critères</Link>
          </div>
          <div className="space-y-3">
            {stats.funnel.map((f, i) => (
              <div key={f.stage}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-ink-600 dark:text-ink-300">{f.stage}</span>
                  <b className="text-ink-900 dark:text-white">{f.value}</b>
                </div>
                <ProgressBar value={stats.funnel[0].value ? (f.value / stats.funnel[0].value) * 100 : 0} color={theme.series[[0, 6, 2, 3][i]]} />
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4 text-center dark:border-ink-800">
            <div><p className="text-xl font-bold text-ink-900 dark:text-white">{stats.responseRate} %</p><p className="text-[11px] muted">Taux de réponse</p></div>
            <div><p className="text-xl font-bold text-ink-900 dark:text-white">{stats.sent ? Math.round((stats.interviews / stats.sent) * 100) : 0} %</p><p className="text-[11px] muted">Taux d'entretien</p></div>
          </div>
        </Card>
      </div>

      {/* --- KPIs --- */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi icon={Target} label="Offres actives" value={stats.liveOffers} sub={`${stats.postedThisWeek} publiées cette semaine`} to="/france" />
        <Kpi icon={Flame} label="Match ≥ 80 %" value={stats.highMatch} sub="Très pertinentes" tone="amber" to="/france" />
        <Kpi icon={Send} label="Candidatures envoyées" value={stats.sent} sub={`${Object.keys(applications).length} dans le pipeline`} tone="sky" to="/pipeline" />
        <Kpi icon={MessageSquareReply} label="Taux de réponse" value={`${stats.responseRate} %`} sub={`${stats.responses} réponse(s)`} tone="indigo" />
        <Kpi icon={CalendarClock} label="Entretiens" value={stats.interviews} sub={`${stats.upcomingInterviews} à venir`} tone="violet" to="/calendar" />
        <Kpi icon={BellRing} label="Relances à faire" value={stats.followUpsDue} sub="Échéance J+7 atteinte" tone="rose" to="/calendar" />
      </div>

      {/* --- Activité --- */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader icon={TrendingUp} title="Activité hebdomadaire" subtitle="Offres publiées repérées et candidatures envoyées (8 semaines)"
            action={(
              <div className="flex gap-3 text-xs">
                <span className="flex items-center gap-1.5 muted"><span className="h-2 w-2 rounded-full" style={{ background: theme.series[0] }} />Offres repérées</span>
                <span className="flex items-center gap-1.5 muted"><span className="h-2 w-2 rounded-full" style={{ background: theme.series[1] }} />Candidatures</span>
              </div>
            )} />
          <div className="h-64 px-2 pb-3 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.weeks} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                <defs>
                  {[0, 1].map((i) => (
                    <linearGradient key={i} id={`g${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={theme.series[i]} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={theme.series[i]} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid vertical={false} stroke={theme.grid} />
                <XAxis dataKey="label" tick={{ fill: theme.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: theme.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip theme={theme} />} cursor={{ stroke: theme.axis, strokeDasharray: '4 4' }} />
                <Area type="monotone" dataKey="offres" name="Offres repérées" stroke={theme.series[0]} strokeWidth={2} fill="url(#g0)" activeDot={{ r: 5, strokeWidth: 2, stroke: theme.surface }} />
                <Area type="monotone" dataKey="candidatures" name="Candidatures" stroke={theme.series[1]} strokeWidth={2} fill="url(#g1)" activeDot={{ r: 5, strokeWidth: 2, stroke: theme.surface }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader icon={Gauge} title="Sources de collecte" subtitle="Nombre d'offres par plateforme" />
          <div className="space-y-2.5 px-5 pb-5 pt-4">
            {stats.sources.map((s) => (
              <div key={s.key} className="group">
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-ink-600 dark:text-ink-300">{s.label}</span>
                  <b className="text-ink-900 dark:text-white">{s.value}</b>
                </div>
                <ProgressBar value={(s.value / maxSource) * 100} color={theme.primary} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* --- Top offres & agenda --- */}
      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader icon={Sparkles} title="Meilleures opportunités" subtitle="Score de match puis intérêt — hors pipeline"
            action={<Link to="/france" className="btn-ghost btn-sm">Tout voir<ArrowRight size={13} /></Link>} />
          <div className="divide-y divide-slate-100 px-2 pb-2 pt-3 dark:divide-ink-800">
            {top.map((o) => (
              <div key={o.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-slate-50 dark:hover:bg-ink-800/50">
                <ScoreRing value={o.matchScore} size={40} />
                <button className="min-w-0 flex-1 text-left" onClick={() => open(o.id)}>
                  <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">{o.title}</p>
                  <p className="flex items-center gap-2 truncate text-xs muted">
                    <span className="font-medium text-ink-600 dark:text-ink-300">{o.company}</span>· {o.location.city} · {formatKm(o.distanceKm)} · {o.durationMonths} mois
                  </p>
                </button>
                <SectorBadge sector={o.sector} sectors={SECTORS} />
                <button className="icon-btn h-8 w-8" title="Assistant IA" onClick={() => openAiPanel(o.id)}><Bot size={15} /></button>
              </div>
            ))}
            {top.length === 0 && <p className="px-3 py-8 text-center text-sm muted">Aucune offre pour l'instant.</p>}
          </div>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader icon={CalendarDays} title="Agenda & relances" subtitle="Prochaines échéances"
            action={<Link to="/calendar" className="btn-ghost btn-sm">Agenda<ArrowRight size={13} /></Link>} />
          <div className="space-y-2 px-5 pb-5 pt-4">
            {agenda.length === 0 && <EmptyState icon={CalendarDays} title="Rien de prévu">Les relances J+7 et entretiens apparaîtront ici.</EmptyState>}
            {agenda.map((e) => {
              const late = new Date(e.date).getTime() < Date.now();
              return (
                <div key={e.id} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 dark:border-ink-800">
                  <div className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                    e.type === 'interview' ? 'bg-violet-500/15 text-violet-600 dark:text-violet-300' : late ? 'bg-rose-500/15 text-rose-600 dark:text-rose-300' : 'bg-amber-500/15 text-amber-600 dark:text-amber-300')}>
                    {e.type === 'interview' ? <CalendarClock size={16} /> : <BellRing size={16} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-900 dark:text-white">{e.title}</p>
                    <p className={cx('text-xs', late ? 'font-semibold text-rose-600 dark:text-rose-400' : 'muted')}>{late ? 'En retard · ' : ''}{formatDateTime(e.date)}</p>
                  </div>
                  <button className="icon-btn h-8 w-8" title="Marquer comme fait" onClick={() => toggleEventDone(e.id)}><CheckCircle2 size={16} /></button>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* --- Secteurs --- */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader icon={TrendingUp} title="Secteurs les plus porteurs" subtitle="Classés par potentiel : volume d'offres × adéquation, bonifié par les réponses obtenues" />
          <div className="grid gap-4 p-5 md:grid-cols-2">
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sectorsRanked} layout="vertical" margin={{ top: 0, right: 12, left: 8, bottom: 0 }} barCategoryGap={6}>
                  <CartesianGrid horizontal={false} stroke={theme.grid} />
                  <XAxis type="number" allowDecimals={false} tick={{ fill: theme.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="label" width={74} tick={{ fill: theme.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip theme={theme} />} cursor={{ fill: theme.grid, opacity: 0.4 }} />
                  <Bar dataKey="offers" name="Offres actives" radius={[0, 4, 4, 0]} maxBarSize={18}>
                    {sectorsRanked.map((s) => <Cell key={s.key} fill={theme.dark ? SECTORS[s.key].dark : SECTORS[s.key].color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide muted">
                  <th className="pb-2 font-semibold">Secteur</th>
                  <th className="pb-2 text-right font-semibold">Match moy.</th>
                  <th className="pb-2 text-right font-semibold">Envoyées</th>
                  <th className="pb-2 text-right font-semibold">Réponse</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-ink-800">
                {sectorsRanked.map((s, i) => (
                  <tr key={s.key}>
                    <td className="py-2">
                      <span className="flex items-center gap-2 font-medium text-ink-800 dark:text-ink-100">
                        <span className="w-3 text-[11px] text-ink-400">{i + 1}</span>
                        <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.label}
                      </span>
                    </td>
                    <td className="py-2 text-right text-ink-700 dark:text-ink-200">{s.avgMatch} %</td>
                    <td className="py-2 text-right text-ink-700 dark:text-ink-200">{s.sent}</td>
                    <td className="py-2 text-right font-semibold text-ink-900 dark:text-white">{s.responseRate == null ? '—' : `${s.responseRate} %`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader icon={Radar} title="Journal de collecte" subtitle="Dernières passes du scraper" />
          <div className="max-h-72 space-y-1 overflow-y-auto px-5 pb-5 pt-3">
            {log.slice(0, 12).map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-ink-800/50">
                <span className={cx('flex h-7 min-w-7 items-center justify-center rounded-md px-1.5 text-xs font-bold', r.added ? 'bg-brand-500/15 text-brand-700 dark:text-brand-300' : 'bg-slate-100 text-ink-500 dark:bg-ink-800')}>+{r.added}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-ink-700 dark:text-ink-200">Passe {r.trigger}</p>
                  <p className="text-[11px] muted">{r.scanned} analysées · {r.duplicates} doublons · {r.filtered} filtrées</p>
                </div>
                <span className="shrink-0 text-[11px] muted">{timeAgo(r.at)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
