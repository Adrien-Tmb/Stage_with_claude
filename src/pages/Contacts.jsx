import { useMemo, useState } from 'react';
import { CalendarClock, ExternalLink, GraduationCap, Linkedin, Mail, MessageSquarePlus, Plus, Search, Trash2, UserCog, Users, Wrench } from 'lucide-react';
import { useAppStore } from '../store/useAppStore.js';
import { COMPANIES } from '../data/companies.js';
import { cx, formatDate, normalize, timeAgo, toDateInput } from '../lib/utils.js';
import { Badge, Card, Chip, EmptyState, Field, Modal, PageHeader } from '../components/ui/index.jsx';

export const CONTACT_TYPES = {
  operationnel: { label: 'Opérationnel', icon: Wrench, tone: 'sky' },
  rh: { label: 'RH / Recrutement', icon: UserCog, tone: 'violet' },
  alumni: { label: 'Alumni ESILV', icon: GraduationCap, tone: 'brand' },
  autre: { label: 'Autre', icon: Users, tone: 'slate' },
};
const STATUSES = ['à contacter', 'contacté', 'en discussion', 'relancer', 'clos'];
const STATUS_TONE = { 'à contacter': 'slate', contacté: 'sky', 'en discussion': 'brand', relancer: 'amber', clos: 'slate' };

export const alumniSearchUrl = (company) => `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`ESILV ${company}`)}`;

function ContactModal({ contact, onClose }) {
  const { upsertContact, deleteContact, logInteraction } = useAppStore.getState();
  const live = useAppStore((s) => (contact?.id ? s.contacts[contact.id] : null));
  const [f, setF] = useState({ name: '', role: '', type: 'alumni', company: '', email: '', phone: '', linkedin: '', status: 'à contacter', nextActionAt: '', notes: '', ...contact });
  const [it, setIt] = useState({ channel: 'LinkedIn', summary: '' });
  const set = (k) => (e) => setF((v) => ({ ...v, [k]: e.target.value }));
  const save = () => {
    const co = COMPANIES.find((c) => c.name === f.company);
    upsertContact({ ...f, companyId: co?.id ?? f.companyId, nextActionAt: f.nextActionAt ? new Date(f.nextActionAt).toISOString() : null });
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={contact?.id ? f.name : 'Nouveau contact'} subtitle="Mini-CRM : opérationnels, RH et anciens élèves" size="max-w-3xl"
      footer={(
        <>
          {contact?.id && <button className="btn-danger mr-auto" onClick={() => { deleteContact(contact.id); onClose(); }}><Trash2 size={15} />Supprimer</button>}
          <button className="btn-ghost" onClick={onClose}>Annuler</button>
          <button className="btn-primary" disabled={!f.name} onClick={save}>Enregistrer</button>
        </>
      )}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom"><input className="input" value={f.name} onChange={set('name')} /></Field>
        <Field label="Fonction"><input className="input" value={f.role} onChange={set('role')} /></Field>
        <Field label="Catégorie">
          <select className="input" value={f.type} onChange={set('type')}>{Object.entries(CONTACT_TYPES).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}</select>
        </Field>
        <Field label="Entreprise">
          <input className="input" list="crm-companies" value={f.company} onChange={set('company')} />
          <datalist id="crm-companies">{COMPANIES.map((c) => <option key={c.id} value={c.name} />)}</datalist>
        </Field>
        <Field label="E-mail"><input className="input" value={f.email} onChange={set('email')} /></Field>
        <Field label="Téléphone"><input className="input" value={f.phone} onChange={set('phone')} /></Field>
        <Field label="Profil LinkedIn"><input className="input" value={f.linkedin} onChange={set('linkedin')} placeholder="https://linkedin.com/in/…" /></Field>
        <Field label="Statut">
          <select className="input" value={f.status} onChange={set('status')}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
        </Field>
        <Field label="Prochaine action"><input type="date" className="input" value={toDateInput(f.nextActionAt)} onChange={set('nextActionAt')} /></Field>
        <Field label="Notes" className="sm:col-span-2"><textarea rows={3} className="input" value={f.notes} onChange={set('notes')} /></Field>
      </div>
      {contact?.id && (
        <div className="mt-5">
          <p className="label">Historique des échanges</p>
          <div className="mb-3 flex gap-2">
            <select className="input w-36" value={it.channel} onChange={(e) => setIt((v) => ({ ...v, channel: e.target.value }))}>
              {['LinkedIn', 'E-mail', 'Téléphone', 'Visio', 'Forum / salon', 'Café'].map((c) => <option key={c}>{c}</option>)}
            </select>
            <input className="input" placeholder="Résumé de l'échange…" value={it.summary} onChange={(e) => setIt((v) => ({ ...v, summary: e.target.value }))} />
            <button className="btn-secondary shrink-0" disabled={!it.summary} onClick={() => { logInteraction(contact.id, it); setIt((v) => ({ ...v, summary: '' })); }}><MessageSquarePlus size={15} />Ajouter</button>
          </div>
          <ol className="space-y-2 border-l border-slate-200 pl-4 dark:border-ink-800">
            {(live?.interactions ?? []).map((i) => (
              <li key={i.id} className="text-sm">
                <span className="font-medium text-ink-800 dark:text-ink-100">{i.channel}</span> <span className="text-xs muted">· {formatDate(i.at)}</span>
                <p className="text-ink-600 dark:text-ink-300">{i.summary}</p>
              </li>
            ))}
            {!(live?.interactions ?? []).length && <li className="text-sm muted">Aucun échange enregistré.</li>}
          </ol>
        </div>
      )}
    </Modal>
  );
}

export default function Contacts() {
  const contacts = useAppStore((s) => s.contacts);
  const [type, setType] = useState('all');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null);
  const list = useMemo(() => Object.values(contacts)
    .filter((c) => (type === 'all' || c.type === type) && (!q || normalize(`${c.name} ${c.company} ${c.role}`).includes(normalize(q))))
    .sort((a, b) => new Date(a.nextActionAt ?? '2100') - new Date(b.nextActionAt ?? '2100')), [contacts, type, q]);
  const counts = Object.values(contacts).reduce((acc, c) => ({ ...acc, [c.type]: (acc[c.type] ?? 0) + 1 }), {});

  return (
    <div>
      <PageHeader icon={Users} title="Réseau & contacts" subtitle="Gardez la trace des opérationnels, RH et alumni contactés — et de la prochaine action à mener"
        actions={<button className="btn-primary" onClick={() => setEditing({})}><Plus size={16} />Nouveau contact</button>} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {Object.entries(CONTACT_TYPES).map(([k, t]) => (
          <button key={k} onClick={() => setType(type === k ? 'all' : k)} className={cx('card card-hover flex items-center gap-3 p-4 text-left', type === k && 'ring-2 ring-brand-500/40')}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-ink-600 dark:bg-ink-800 dark:text-ink-200"><t.icon size={18} /></div>
            <div><p className="text-xl font-bold text-ink-900 dark:text-white">{counts[k] ?? 0}</p><p className="text-xs muted">{t.label}</p></div>
          </button>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input className="input pl-9" placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Chip active={type === 'all'} onClick={() => setType('all')}>Tous</Chip>
        {Object.entries(CONTACT_TYPES).map(([k, t]) => <Chip key={k} active={type === k} onClick={() => setType(k)}>{t.label}</Chip>)}
      </div>

      {list.length === 0 ? (
        <EmptyState icon={Users} title="Aucun contact" action={<button className="btn-primary" onClick={() => setEditing({})}><Plus size={15} />Ajouter un contact</button>}>
          Ajoutez les alumni, recruteurs et opérationnels avec qui vous échangez.
        </EmptyState>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide muted dark:bg-ink-950/40">
                <tr>
                  <th className="px-4 py-3 font-semibold">Contact</th><th className="px-4 py-3 font-semibold">Entreprise</th><th className="px-4 py-3 font-semibold">Catégorie</th>
                  <th className="px-4 py-3 font-semibold">Statut</th><th className="px-4 py-3 font-semibold">Dernier échange</th><th className="px-4 py-3 font-semibold">Prochaine action</th><th />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-ink-800">
                {list.map((c) => {
                  const t = CONTACT_TYPES[c.type] ?? CONTACT_TYPES.autre;
                  const late = c.nextActionAt && new Date(c.nextActionAt).getTime() < Date.now();
                  return (
                    <tr key={c.id} onClick={() => setEditing(c)} className="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-ink-800/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-ink-600 to-ink-800 text-xs font-bold text-white">{c.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</div>
                          <div><p className="font-medium text-ink-900 dark:text-white">{c.name}</p><p className="text-xs muted">{c.role}</p></div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink-700 dark:text-ink-200">{c.company}</td>
                      <td className="px-4 py-3"><Badge tone={t.tone}><t.icon size={11} />{t.label}</Badge></td>
                      <td className="px-4 py-3"><Badge tone={STATUS_TONE[c.status]}>{c.status}</Badge></td>
                      <td className="px-4 py-3 text-xs muted">{c.lastContactAt ? timeAgo(c.lastContactAt) : '—'}</td>
                      <td className={cx('px-4 py-3 text-xs', late ? 'font-semibold text-rose-600 dark:text-rose-400' : 'muted')}>
                        {c.nextActionAt ? <span className="flex items-center gap-1"><CalendarClock size={12} />{formatDate(c.nextActionAt)}</span> : '—'}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          {c.email && <a className="icon-btn h-8 w-8" href={`mailto:${c.email}`}><Mail size={15} /></a>}
                          <a className="icon-btn h-8 w-8" target="_blank" rel="noreferrer" href={c.linkedin || alumniSearchUrl(c.company)} title={c.linkedin ? 'Profil LinkedIn' : 'Rechercher sur LinkedIn'}>{c.linkedin ? <Linkedin size={15} /> : <ExternalLink size={15} />}</a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {editing && <ContactModal contact={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
