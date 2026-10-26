import { useState } from 'react';
import { LocateFixed } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore.js';
import { PLACES } from '../../data/places.js';
import { SECTORS } from '../../data/defaults.js';
import { COMPANY_TYPES, COMPANIES } from '../../data/companies.js';
import { geocode } from '../../lib/geo.js';
import { extractSkills } from '../../lib/scoring.js';
import { Field, Modal } from '../ui/index.jsx';

const INIT = {
  title: '', company: '', placeKey: 'La Défense', customCity: '', customCountry: 'France', lat: '', lng: '',
  sector: 'urbanisme', companyType: 'grand_groupe', durationMonths: 5, startDate: '2027-04-01', url: '', description: '', language: 'fr',
};

/** Ajout manuel d'une offre trouvée ailleurs (le dédoublonnage s'applique aussi). */
export default function AddOfferModal({ open, onClose, defaultSpace = 'france' }) {
  const [f, setF] = useState(INIT);
  const [geo, setGeo] = useState({ loading: false, error: null });
  const addManualOffer = useAppStore((s) => s.addManualOffer);
  const set = (k) => (e) => setF((v) => ({ ...v, [k]: e.target?.value ?? e }));

  const locate = async () => {
    setGeo({ loading: true, error: null });
    try {
      const r = await geocode(`${f.customCity}, ${f.customCountry}`);
      setF((v) => ({ ...v, lat: r.lat.toFixed(4), lng: r.lng.toFixed(4) }));
      setGeo({ loading: false, error: null });
    } catch (e) {
      setGeo({ loading: false, error: e.message });
    }
  };

  const submit = (e) => {
    e.preventDefault();
    const location = f.placeKey === 'custom'
      ? { city: f.customCity, country: f.customCountry, region: '', lat: +f.lat, lng: +f.lng }
      : { ...PLACES[f.placeKey], key: f.placeKey };
    const known = COMPANIES.find((c) => c.name.toLowerCase() === f.company.trim().toLowerCase());
    const space = location.country === 'France' ? 'france' : 'international';
    addManualOffer({
      title: f.title.trim(), company: f.company.trim(), companyId: known?.id ?? `custom-${f.company.trim().toLowerCase().replace(/\W+/g, '-')}`,
      companyType: known?.type ?? f.companyType, location, space, sector: f.sector, durationMonths: +f.durationMonths,
      startDate: f.startDate, url: f.url, description: f.description, summary: f.description.split('\n')[0].slice(0, 220) || f.title,
      requirements: extractSkills(`${f.title}\n${f.description}`), language: space === 'france' ? f.language : 'en',
    });
    setF(INIT);
    onClose();
  };

  const valid = f.title && f.company && (f.placeKey !== 'custom' || (f.customCity && f.lat && f.lng));
  const places = Object.entries(PLACES).filter(([, p]) => (defaultSpace === 'france' ? p.country === 'France' : p.country !== 'France'));

  return (
    <Modal open={open} onClose={onClose} title="Ajouter une offre" subtitle="Une offre repérée ailleurs ? Elle sera scorée, dédoublonnée et ajoutée au feed."
      footer={<><button className="btn-ghost" onClick={onClose}>Annuler</button><button className="btn-primary" disabled={!valid} onClick={submit}>Ajouter</button></>}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Intitulé du poste" className="sm:col-span-2"><input className="input" value={f.title} onChange={set('title')} placeholder="Stage – Chargé(e) d'études urbanisme" required /></Field>
        <Field label="Entreprise">
          <input className="input" list="companies-list" value={f.company} onChange={set('company')} required />
          <datalist id="companies-list">{COMPANIES.map((c) => <option key={c.id} value={c.name} />)}</datalist>
        </Field>
        <Field label="Type de structure">
          <select className="input" value={f.companyType} onChange={set('companyType')}>
            {Object.entries(COMPANY_TYPES).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="Lieu">
          <select className="input" value={f.placeKey} onChange={set('placeKey')}>
            {places.map(([k, p]) => <option key={k} value={k}>{p.city}{p.country !== 'France' ? ` (${p.country})` : ''}</option>)}
            <option value="custom">Autre lieu…</option>
          </select>
        </Field>
        <Field label="Secteur">
          <select className="input" value={f.sector} onChange={set('sector')}>
            {Object.entries(SECTORS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
          </select>
        </Field>
        {f.placeKey === 'custom' && (
          <div className="grid gap-3 rounded-xl bg-slate-50 p-3 dark:bg-ink-950/50 sm:col-span-2 sm:grid-cols-[1fr_1fr_auto]">
            <Field label="Ville"><input className="input" value={f.customCity} onChange={set('customCity')} /></Field>
            <Field label="Pays"><input className="input" value={f.customCountry} onChange={set('customCountry')} /></Field>
            <div className="flex items-end"><button type="button" className="btn-secondary" onClick={locate} disabled={!f.customCity || geo.loading}><LocateFixed size={15} />{geo.loading ? '…' : 'Localiser'}</button></div>
            <Field label="Latitude"><input className="input" value={f.lat} onChange={set('lat')} /></Field>
            <Field label="Longitude"><input className="input" value={f.lng} onChange={set('lng')} /></Field>
            {geo.error && <p className="text-xs text-rose-500 sm:col-span-3">{geo.error} — saisissez les coordonnées manuellement.</p>}
          </div>
        )}
        <Field label="Durée (mois)"><input type="number" min="1" max="12" className="input" value={f.durationMonths} onChange={set('durationMonths')} /></Field>
        <Field label="Début"><input type="date" className="input" value={f.startDate} onChange={set('startDate')} /></Field>
        <Field label="Lien direct vers l'offre" className="sm:col-span-2"><input type="url" className="input" value={f.url} onChange={set('url')} placeholder="https://…" /></Field>
        <Field label="Description (copier-coller de l'annonce)" hint="Les compétences sont extraites automatiquement pour calculer le score de match." className="sm:col-span-2">
          <textarea rows={6} className="input" value={f.description} onChange={set('description')} />
        </Field>
      </form>
    </Modal>
  );
}
