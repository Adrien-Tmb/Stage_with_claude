import { useMemo, useState } from 'react';
import { BellRing, CalendarClock, CalendarDays, CalendarPlus, CheckCircle2, ChevronLeft, ChevronRight, Circle, Download, Mail, Plus, Trash2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore.js';
import { buildIcs, googleCalendarUrl } from '../lib/calendar.js';
import { cx, downloadFile, formatDateTime, isSameDay, toDateTimeInput } from '../lib/utils.js';
import { Card, EmptyState, Field, Modal, PageHeader } from '../components/ui/index.jsx';

const TYPE = {
  interview: { label: 'Entretien', cls: 'bg-violet-500/15 text-violet-700 dark:text-violet-300', dot: 'bg-violet-500', icon: CalendarClock },
  followup: { label: 'Relance', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300', dot: 'bg-amber-500', icon: BellRing },
  custom: { label: 'Rappel', cls: 'bg-sky-500/15 text-sky-700 dark:text-sky-300', dot: 'bg-sky-500', icon: Circle },
};
const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function relanceMail(ev, app, offer, profile) {
  const subject = `Suivi de ma candidature – ${offer?.title ?? ''}`;
  const body = `Bonjour${app?.contactName ? ` ${app.contactName}` : ''},

Je me permets de revenir vers vous concernant ma candidature au poste « ${offer?.title ?? ''} » envoyée le ${app?.appliedAt ? new Date(app.appliedAt).toLocaleDateString('fr-FR') : ''}.
Toujours très motivé par cette opportunité chez ${offer?.company ?? ''}, je reste à votre disposition pour un échange.

Bien cordialement,
${profile.firstName} ${profile.lastName}`;
  return `mailto:${app?.contactEmail ?? ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function EventModal({ open, onClose, initialDate }) {
  const upsertEvent = useAppStore((s) => s.upsertEvent);
  const [f, setF] = useState({ title: '', date: toDateTimeInput(initialDate ?? new Date()), type: 'custom', notes: '', location: '' });
  const set = (k) => (e) => setF((v) => ({ ...v, [k]: e.target.value }));
  const save = () => { upsertEvent({ ...f, date: new Date(f.date).toISOString() }); onClose(); };
  return (
    <Modal open={open} onClose={onClose} title="Nouvel événement"
      footer={<><button className="btn-ghost" onClick={onClose}>Annuler</button><button className="btn-primary" disabled={!f.title} onClick={save}>Ajouter</button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Titre" className="sm:col-span-2"><input className="input" value={f.title} onChange={set('title')} placeholder="Forum ESILV, appel alumni…" /></Field>
        <Field label="Date & heure"><input type="datetime-local" className="input" value={f.date} onChange={set('date')} /></Field>
        <Field label="Type">
          <select className="input" value={f.type} onChange={set('type')}><option value="custom">Rappel</option><option value="interview">Entretien</option><option value="followup">Relance</option></select>
        </Field>
        <Field label="Lieu" className="sm:col-span-2"><input className="input" value={f.location} onChange={set('location')} /></Field>
        <Field label="Notes" className="sm:col-span-2"><textarea rows={3} className="input" value={f.notes} onChange={set('notes')} /></Field>
      </div>
    </Modal>
  );
}

export default function CalendarPage() {
  const events = useAppStore((s) => s.events);
  const applications = useAppStore((s) => s.applications);
  const offers = useAppStore((s) => s.offers);
  const profile = useAppStore((s) => s.profile);
  const { toggleEventDone, deleteEvent } = useAppStore.getState();
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [selected, setSelected] = useState(new Date());
  const [modal, setModal] = useState(false);
  const all = useMemo(() => Object.values(events).sort((a, b) => new Date(a.date) - new Date(b.date)), [events]);
  const now = Date.now();
  const due = all.filter((e) => e.type === 'followup' && !e.done && new Date(e.date).getTime() <= now);
  const upcoming = all.filter((e) => !e.done && new Date(e.date).getTime() > now).slice(0, 10);

  const grid = useMemo(() => {
    const first = new Date(cursor);
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(first);
    start.setDate(1 - offset);
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  }, [cursor]);
  const dayEvents = (d) => all.filter((e) => isSameDay(e.date, d));
  const shift = (n) => setCursor((c) => { const d = new Date(c); d.setMonth(d.getMonth() + n); return d; });

  const Row = ({ e }) => {
    const t = TYPE[e.type] ?? TYPE.custom;
    const app = applications[e.applicationId];
    const offer = app ? offers[app.offerId] : null;
    return (
      <div className={cx('flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 dark:border-ink-800', e.done && 'opacity-50')}>
        <div className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', t.cls)}><t.icon size={16} /></div>
        <div className="min-w-0 flex-1">
          <p className={cx('truncate text-sm font-medium text-ink-900 dark:text-white', e.done && 'line-through')}>{e.title}</p>
          <p className="text-xs muted">{formatDateTime(e.date)}{e.location ? ` · ${e.location}` : ''}</p>
        </div>
        {e.type === 'followup' && <a className="icon-btn h-8 w-8" title="Rédiger la relance (e-mail)" href={relanceMail(e, app, offer, profile)}><Mail size={15} /></a>}
        <a className="icon-btn h-8 w-8" title="Ajouter à Google Agenda" href={googleCalendarUrl(e)} target="_blank" rel="noreferrer"><CalendarPlus size={15} /></a>
        <button className="icon-btn h-8 w-8" title={e.done ? 'Rouvrir' : 'Marquer comme fait'} onClick={() => toggleEventDone(e.id)}><CheckCircle2 size={15} className={e.done ? 'text-brand-500' : ''} /></button>
        {!e.auto && <button className="icon-btn h-8 w-8" title="Supprimer" onClick={() => deleteEvent(e.id)}><Trash2 size={15} /></button>}
      </div>
    );
  };

  return (
    <div>
      <PageHeader icon={CalendarDays} title="Agenda & relances" subtitle="Entretiens synchronisés depuis le pipeline · rappels de relance automatiques à J+7"
        actions={(
          <>
            <button className="btn-secondary" onClick={() => downloadFile('stagepilot-agenda.ics', buildIcs(all.filter((e) => !e.done)), 'text/calendar')}><Download size={16} />Exporter .ics</button>
            <button className="btn-primary" onClick={() => setModal(true)}><Plus size={16} />Événement</button>
          </>
        )} />

      {due.length > 0 && (
        <Card className="mb-4 border-amber-500/40 bg-amber-500/[0.04] p-4 dark:border-amber-500/30">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300"><BellRing size={16} />{due.length} relance(s) à faire maintenant</p>
          <div className="grid gap-2 lg:grid-cols-2">{due.map((e) => <Row key={e.id} e={e} />)}</div>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold capitalize text-ink-900 dark:text-white">{cursor.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</h2>
            <div className="flex gap-1">
              <button className="icon-btn" onClick={() => shift(-1)}><ChevronLeft size={18} /></button>
              <button className="btn-ghost btn-sm" onClick={() => { const d = new Date(); d.setDate(1); setCursor(d); setSelected(new Date()); }}>Aujourd'hui</button>
              <button className="icon-btn" onClick={() => shift(1)}><ChevronRight size={18} /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 dark:border-ink-800 dark:bg-ink-800">
            {WEEKDAYS.map((d) => <div key={d} className="bg-slate-50 py-2 text-center text-[11px] font-semibold uppercase tracking-wide muted dark:bg-ink-900">{d}</div>)}
            {grid.map((d) => {
              const evs = dayEvents(d);
              const inMonth = d.getMonth() === cursor.getMonth();
              const today = isSameDay(d, new Date());
              const sel = isSameDay(d, selected);
              return (
                <button key={d.toISOString()} onClick={() => setSelected(d)} onDoubleClick={() => { setSelected(d); setModal(true); }}
                  className={cx('min-h-[88px] bg-white p-1.5 text-left align-top transition hover:bg-slate-50 dark:bg-ink-900 dark:hover:bg-ink-850', !inMonth && 'opacity-40', sel && 'ring-2 ring-inset ring-brand-500')}>
                  <span className={cx('inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold', today ? 'bg-brand-500 text-white' : 'text-ink-700 dark:text-ink-200')}>{d.getDate()}</span>
                  <div className="mt-1 space-y-0.5">
                    {evs.slice(0, 3).map((e) => (
                      <div key={e.id} className={cx('truncate rounded px-1 py-0.5 text-[10px] font-medium', (TYPE[e.type] ?? TYPE.custom).cls, e.done && 'line-through opacity-60')}>{e.title.replace(/^(Relancer( après entretien)?|Entretien) : /, '')}</div>
                    ))}
                    {evs.length > 3 && <p className="px-1 text-[10px] muted">+{evs.length - 3}</p>}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex gap-4 text-xs muted">
            {Object.values(TYPE).map((t) => <span key={t.label} className="flex items-center gap-1.5"><span className={cx('h-2 w-2 rounded-full', t.dot)} />{t.label}</span>)}
            <span className="ml-auto">Double-clic sur un jour pour ajouter</span>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <p className="section-title mb-3 capitalize">{selected.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <div className="space-y-2">
              {dayEvents(selected).map((e) => <Row key={e.id} e={e} />)}
              {dayEvents(selected).length === 0 && <p className="text-sm muted">Aucun événement.</p>}
            </div>
          </Card>
          <Card className="p-4">
            <p className="section-title mb-3">À venir</p>
            {upcoming.length === 0 ? <EmptyState icon={CalendarDays} title="Rien à venir" /> : <div className="space-y-2">{upcoming.map((e) => <Row key={e.id} e={e} />)}</div>}
          </Card>
        </div>
      </div>
      {modal && <EventModal open onClose={() => setModal(false)} initialDate={new Date(new Date(selected).setHours(10, 0, 0, 0))} />}
    </div>
  );
}
