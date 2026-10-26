import { useEffect, useState } from 'react';
import { Bot, CalendarPlus, ExternalLink, FileText, Trash2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore.js';
import { COLUMNS } from '../../data/defaults.js';
import { addDays, formatDateTime, toDateInput, toDateTimeInput } from '../../lib/utils.js';
import { Field, Modal } from '../ui/index.jsx';

/** Fiche détaillée d'une candidature : dates, URL, contact, notes, statut, documents générés. */
export default function ApplicationModal({ appId, onClose }) {
  const app = useAppStore((s) => (appId ? s.applications[appId] : null));
  const offer = useAppStore((s) => (app ? s.offers[app.offerId] : null));
  const contacts = useAppStore((s) => s.contacts);
  const followUpDays = useAppStore((s) => s.settings.notifications.followUpDays);
  const { updateApplication, moveApplication, deleteApplication, openAiPanel, upsertContact } = useAppStore.getState();
  const [form, setForm] = useState(null);

  useEffect(() => { if (app) setForm({ ...app }); }, [appId]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!app || !form) return null;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const save = () => {
    const { column, ...rest } = form;
    const patch = {
      ...rest,
      appliedAt: form.appliedAt ? new Date(form.appliedAt).toISOString() : null,
      interviewAt: form.interviewAt ? new Date(form.interviewAt).toISOString() : null,
      followUpAt: form.followUpAt ? new Date(form.followUpAt).toISOString() : null,
    };
    if (form.contactId && contacts[form.contactId]) {
      patch.contactName = contacts[form.contactId].name;
      patch.contactEmail = contacts[form.contactId].email;
    }
    updateApplication(app.id, patch);
    if (column !== app.column) moveApplication(app.id, column);
    onClose();
  };
  const createContact = () => {
    if (!form.contactName) return;
    const id = upsertContact({ name: form.contactName, email: form.contactEmail, company: offer?.company, companyId: offer?.companyId, type: 'rh', status: 'contacté', lastContactAt: form.appliedAt ?? new Date().toISOString() });
    setForm((f) => ({ ...f, contactId: id }));
  };
  const docs = Object.entries(app.documents ?? {});

  return (
    <Modal open onClose={onClose} title={offer?.title ?? 'Candidature'} subtitle={offer ? `${offer.company} · ${offer.location.city}` : ''} size="max-w-3xl"
      footer={(
        <>
          <button className="btn-danger mr-auto" onClick={() => { deleteApplication(app.id); onClose(); }}><Trash2 size={15} />Supprimer</button>
          <button className="btn-ghost" onClick={onClose}>Annuler</button>
          <button className="btn-primary" onClick={save}>Enregistrer</button>
        </>
      )}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Statut">
          <select className="input" value={form.column} onChange={set('column')}>
            {COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </Field>
        <Field label="Date de candidature">
          <input type="date" className="input" value={toDateInput(form.appliedAt)} onChange={set('appliedAt')} />
        </Field>
        <Field label="URL de l'offre / du suivi" className="sm:col-span-2">
          <div className="flex gap-2">
            <input className="input" value={form.url ?? ''} onChange={set('url')} />
            {form.url && <a className="btn-secondary" href={form.url} target="_blank" rel="noreferrer"><ExternalLink size={15} /></a>}
          </div>
        </Field>
        <Field label="Contact (CRM)">
          <select className="input" value={form.contactId ?? ''} onChange={set('contactId')}>
            <option value="">— Aucun / saisie libre —</option>
            {Object.values(contacts).map((c) => <option key={c.id} value={c.id}>{c.name} · {c.company}</option>)}
          </select>
        </Field>
        <Field label="Personne jointe (saisie libre)">
          <div className="flex gap-2">
            <input className="input" value={form.contactName ?? ''} onChange={set('contactName')} placeholder="Nom, rôle" />
            {!form.contactId && form.contactName && <button type="button" className="btn-secondary btn-sm shrink-0" onClick={createContact} title="Ajouter au CRM">+ CRM</button>}
          </div>
        </Field>
        <Field label="E-mail du contact"><input className="input" value={form.contactEmail ?? ''} onChange={set('contactEmail')} /></Field>
        <Field label="Relance prévue" hint={`Par défaut J+${followUpDays} après la candidature`}>
          <input type="date" className="input" value={toDateInput(form.followUpAt ?? (form.appliedAt ? addDays(form.appliedAt, followUpDays) : ''))} onChange={set('followUpAt')} />
        </Field>
        <Field label="Date & heure d'entretien" hint="Ajoutée automatiquement à l'agenda">
          <input type="datetime-local" className="input" value={toDateTimeInput(form.interviewAt)} onChange={set('interviewAt')} />
        </Field>
        <Field label="Lieu / lien visio"><input className="input" value={form.interviewPlace ?? ''} onChange={set('interviewPlace')} placeholder="Teams, adresse…" /></Field>
        <Field label="Notes" className="sm:col-span-2"><textarea rows={4} className="input" value={form.notes ?? ''} onChange={set('notes')} /></Field>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="label">Documents</p>
          {docs.length === 0 && <p className="text-sm muted">Aucun document enregistré.</p>}
          <div className="space-y-1.5">
            {docs.map(([kind, d]) => (
              <details key={kind} className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-ink-800">
                <summary className="flex cursor-pointer items-center gap-2 font-medium"><FileText size={14} />{kind === 'email' ? 'E-mail de candidature' : 'Lettre de motivation'}<span className="ml-auto text-[11px] muted">{formatDateTime(d.at)}</span></summary>
                <pre className="mt-2 max-h-60 overflow-y-auto whitespace-pre-wrap font-sans text-xs text-ink-600 dark:text-ink-300">{d.content}</pre>
              </details>
            ))}
          </div>
          <button className="btn-secondary btn-sm mt-2" onClick={() => { onClose(); openAiPanel(app.offerId); }}><Bot size={13} />Ouvrir l'assistant IA</button>
        </div>
        <div>
          <p className="label">Historique</p>
          <ol className="space-y-2 border-l border-slate-200 pl-4 dark:border-ink-800">
            {[...(app.history ?? [])].reverse().map((h, i) => (
              <li key={i} className="relative text-sm">
                <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-ink-900" style={{ backgroundColor: COLUMNS.find((c) => c.id === h.column)?.color }} />
                <span className="font-medium text-ink-800 dark:text-ink-100">{COLUMNS.find((c) => c.id === h.column)?.label}</span>
                {h.auto && <span className="ml-1 text-[11px] muted">(auto)</span>}
                <span className="block text-xs muted">{formatDateTime(h.at)}</span>
              </li>
            ))}
          </ol>
          {app.interviewAt && <p className="mt-3 flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-300"><CalendarPlus size={13} />Entretien synchronisé dans l'agenda</p>}
        </div>
      </div>
    </Modal>
  );
}
