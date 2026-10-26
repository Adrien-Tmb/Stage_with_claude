import { useRef, useState } from 'react';
import {
  Bell, BrainCircuit, CalendarClock, Clock, Database, Download, FileText, Globe2, KeyRound, LocateFixed, MapPin, Moon, Palette,
  Plus, Radar, RotateCcw, Search, Settings as SettingsIcon, SlidersHorizontal, Sparkles, Sun, Trash2, Upload, User, Laptop, Target, X,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore.js';
import { SOURCES } from '../data/sources.js';
import { SECTORS } from '../data/defaults.js';
import { COMPANY_TYPES } from '../data/companies.js';
import { geocode, HOME_DEFAULT } from '../lib/geo.js';
import { extractSkills, skillLabel } from '../lib/scoring.js';
import { nextSlot } from '../lib/scheduler.js';
import { cx, downloadFile, formatDateTime, timeUntil, uid } from '../lib/utils.js';
import { Badge, Card, Chip, Field, PageHeader, Toggle } from '../components/ui/index.jsx';
import SortPriorityEditor from '../components/offers/SortPriorityEditor.jsx';

const SECTIONS = [
  { id: 'profile', label: 'Profil & CV', icon: User },
  { id: 'engine', label: 'Moteur de recherche', icon: Radar },
  { id: 'criteria', label: 'Critères', icon: Target },
  { id: 'sorting', label: 'Tri & scores', icon: SlidersHorizontal },
  { id: 'ai', label: 'Assistant IA', icon: BrainCircuit },
  { id: 'notifications', label: 'Notifications & relances', icon: Bell },
  { id: 'data', label: 'Apparence & données', icon: Database },
];

function Section({ title, description, children, icon: Icon }) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        {Icon && <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400"><Icon size={18} /></div>}
        <div>
          <h2 className="text-base font-semibold text-ink-900 dark:text-white">{title}</h2>
          {description && <p className="text-sm muted">{description}</p>}
        </div>
      </div>
      {children}
    </Card>
  );
}

function TagInput({ values, onChange, placeholder }) {
  const [v, setV] = useState('');
  const add = () => {
    const t = v.trim();
    if (t && !values.includes(t)) onChange([...values, t]);
    setV('');
  };
  return (
    <div className="flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-1.5 dark:border-ink-700 dark:bg-ink-950/60">
      {values.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-ink-700 dark:bg-ink-800 dark:text-ink-200">
          {t}<button onClick={() => onChange(values.filter((x) => x !== t))} className="text-ink-400 hover:text-rose-500"><X size={12} /></button>
        </span>
      ))}
      <input className="min-w-[8rem] flex-1 bg-transparent px-1.5 text-sm outline-none placeholder:text-ink-400" value={v} placeholder={placeholder}
        onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }} onBlur={add} />
    </div>
  );
}

// ---------------------------------------------------------------------------
function ProfileSection() {
  const profile = useAppStore((s) => s.profile);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const [addr, setAddr] = useState(profile.home.label);
  const [geo, setGeo] = useState({ loading: false, msg: null });
  const skills = extractSkills(profile.cvText);
  const set = (path) => (e) => updateProfile(path, e.target.value);

  const locate = async () => {
    setGeo({ loading: true, msg: null });
    try {
      const r = await geocode(addr);
      updateProfile('home', { label: addr, lat: r.lat, lng: r.lng });
      setGeo({ loading: false, msg: `Localisé : ${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}` });
    } catch (e) {
      setGeo({ loading: false, msg: `${e.message} — saisissez les coordonnées.` });
    }
  };

  return (
    <div className="space-y-4">
      <Section icon={User} title="Identité & disponibilité" description="Utilisées pour les lettres, le score de match et le tri par distance.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prénom"><input className="input" value={profile.firstName} onChange={set('firstName')} /></Field>
          <Field label="Nom"><input className="input" value={profile.lastName} onChange={set('lastName')} /></Field>
          <Field label="E-mail" hint="Ajouté à l'en-tête des lettres"><input className="input" value={profile.email} onChange={set('email')} placeholder="prenom.nom@…" /></Field>
          <Field label="Téléphone"><input className="input" value={profile.phone} onChange={set('phone')} /></Field>
          <Field label="École" className="sm:col-span-2"><input className="input" value={profile.school} onChange={set('school')} /></Field>
          <Field label="Formation"><input className="input" value={profile.program} onChange={set('program')} /></Field>
          <Field label="Niveau"><input className="input" value={profile.level} onChange={set('level')} /></Field>
          <Field label="Début souhaité"><input type="date" className="input" value={profile.availability.start} onChange={set('availability.start')} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Durée min. (mois)"><input type="number" min="1" max="12" className="input" value={profile.availability.durationMin} onChange={(e) => updateProfile('availability.durationMin', +e.target.value)} /></Field>
            <Field label="Durée max. (mois)"><input type="number" min="1" max="12" className="input" value={profile.availability.durationMax} onChange={(e) => updateProfile('availability.durationMax', +e.target.value)} /></Field>
          </div>
        </div>
      </Section>

      <Section icon={MapPin} title="Domicile" description="Point de départ des distances et des temps de trajet (Espace France trié du plus proche au plus éloigné).">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <input className="input" value={addr} onChange={(e) => setAddr(e.target.value)} />
          <button className="btn-secondary" onClick={locate} disabled={geo.loading}><LocateFixed size={15} />{geo.loading ? 'Recherche…' : 'Géolocaliser'}</button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:w-1/2">
          <Field label="Latitude"><input type="number" step="0.0001" className="input" value={profile.home.lat} onChange={(e) => updateProfile('home.lat', +e.target.value)} /></Field>
          <Field label="Longitude"><input type="number" step="0.0001" className="input" value={profile.home.lng} onChange={(e) => updateProfile('home.lng', +e.target.value)} /></Field>
        </div>
        <div className="mt-2 flex items-center gap-3 text-xs muted">
          {geo.msg && <span>{geo.msg}</span>}
          <button className="text-brand-600 hover:underline dark:text-brand-400" onClick={() => { setAddr(HOME_DEFAULT.label); updateProfile('home', { ...HOME_DEFAULT }); }}>Rétablir La Garenne-Colombes</button>
        </div>
      </Section>

      <Section icon={FileText} title="CV (texte)" description="Analysé pour calculer le score de match et nourrir l'assistant IA. Collez ici la version texte de votre CV.">
        <textarea rows={14} className="input font-mono text-xs leading-relaxed" value={profile.cvText} onChange={set('cvText')} />
        <p className="label mt-4">{skills.length} compétences détectées automatiquement</p>
        <div className="flex flex-wrap gap-1.5">{skills.map((id) => <Badge key={id} tone="brand">{skillLabel(id)}</Badge>)}</div>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
function EngineSection() {
  const scraper = useAppStore((s) => s.settings.scraper);
  const broaden = useAppStore((s) => s.settings.criteria.broaden);
  const spaces = useAppStore((s) => s.settings.criteria.spaces);
  const log = useAppStore((s) => s.scrapeLog);
  const { updateSettings, scrapeNow } = useAppStore.getState();
  const [newTime, setNewTime] = useState('18:00');
  const times = [...scraper.times].sort();

  return (
    <div className="space-y-4">
      <Section icon={Clock} title="Fréquence de collecte" description="Le moteur interroge les sources automatiquement aux heures choisies, et rattrape les passes manquées à l'ouverture.">
        <div className="space-y-4">
          <Toggle checked={scraper.enabled} onChange={(v) => updateSettings('scraper.enabled', v)} label="Collecte automatique" description={scraper.enabled ? `Prochaine passe ${timeUntil(nextSlot(scraper.times))}` : 'En pause'} />
          <div>
            <p className="label">Horaires ({times.length}× / jour)</p>
            <div className="flex flex-wrap items-center gap-2">
              {times.map((t) => (
                <span key={t} className="inline-flex items-center gap-2 rounded-xl border border-brand-500/30 bg-brand-500/10 px-3 py-1.5 text-sm font-semibold text-brand-700 dark:text-brand-300">
                  <Clock size={14} />{t.replace(':', 'h')}
                  <button onClick={() => updateSettings('scraper.times', scraper.times.filter((x) => x !== t))} className="opacity-60 hover:opacity-100"><X size={13} /></button>
                </span>
              ))}
              <input type="time" className="input w-32" value={newTime} onChange={(e) => setNewTime(e.target.value)} />
              <button className="btn-secondary btn-sm" onClick={() => !scraper.times.includes(newTime) && updateSettings('scraper.times', [...scraper.times, newTime])}><Plus size={13} />Ajouter</button>
              <button className="btn-ghost btn-sm" onClick={() => updateSettings('scraper.times', ['10:00', '15:00'])}>2×/jour (10h · 15h)</button>
            </div>
          </div>
          <Toggle checked={scraper.catchUpOnOpen} onChange={(v) => updateSettings('scraper.catchUpOnOpen', v)} label="Rattrapage à l'ouverture" description="Si l'application était fermée à 10h ou 15h, la collecte est lancée à la prochaine ouverture." />
          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-ink-950/50">
            <span className="muted">Dernière passe : <b className="text-ink-800 dark:text-ink-100">{formatDateTime(scraper.lastRunAt)}</b>{log[0] && ` — ${log[0].added} nouvelles, ${log[0].duplicates} doublons ignorés`}</span>
            <button className="btn-primary btn-sm ml-auto" onClick={() => scrapeNow('manuelle')}><Radar size={13} />Lancer maintenant</button>
          </div>
        </div>
      </Section>

      <Section icon={Search} title="Sources" description="Plateformes interrogées. Le dédoublonnage (entreprise + intitulé + ville) évite qu'une même offre publiée sur plusieurs sites apparaisse deux fois.">
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.entries(SOURCES).map(([k, s]) => (
            <div key={k} className={cx('rounded-xl border p-3 transition', scraper.sources[k] ? 'border-brand-500/40 bg-brand-500/[0.04]' : 'border-slate-200 dark:border-ink-800')}>
              <Toggle checked={!!scraper.sources[k]} onChange={(v) => updateSettings(`scraper.sources.${k}`, v)}
                label={<span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />{s.label}</span>}
                description={s.description} />
            </div>
          ))}
        </div>
      </Section>

      <Section icon={Sparkles} title="Élargissement de la recherche" description="Inclure des postes proches de votre cœur de cible pour ne rien rater.">
        <div className="space-y-4">
          <Toggle checked={broaden.neighbourRoles} onChange={(v) => updateSettings('criteria.broaden.neighbourRoles', v)} label="Postes voisins" description="Data analyst énergie, travaux de rénovation, méthodes maintenance, business developer cleantech…" />
          <Toggle checked={broaden.labs} onChange={(v) => updateSettings('criteria.broaden.labs', v)} label="Laboratoires" description="CEA, CSTB, IFPEN, Efficacity, Deltares, DTU, Imperial College…" />
          <Toggle checked={broaden.research} onChange={(v) => updateSettings('criteria.broaden.research', v)} label="Stages de recherche" description="Sujets R&D : modélisation énergétique urbaine, PV, microclimat…" />
          <div className="grid gap-3 border-t border-slate-100 pt-4 dark:border-ink-800 sm:grid-cols-2">
            <Toggle checked={spaces.france} onChange={(v) => updateSettings('criteria.spaces.france', v)} label={<span className="flex items-center gap-2"><MapPin size={14} />Espace France</span>} />
            <Toggle checked={spaces.international} onChange={(v) => updateSettings('criteria.spaces.international', v)} label={<span className="flex items-center gap-2"><Globe2 size={14} />Espace International</span>} />
          </div>
        </div>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
function CriteriaSection() {
  const criteria = useAppStore((s) => s.settings.criteria);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const toggleIn = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v].sort());
  return (
    <div className="space-y-4">
      <Section icon={CalendarClock} title="Durée & dates" description="Les offres hors critères sont écartées dès la collecte.">
        <div className="space-y-4">
          <div>
            <p className="label">Durées acceptées</p>
            <div className="flex flex-wrap gap-1.5">
              {[2, 3, 4, 5, 6].map((d) => <Chip key={d} active={criteria.durations.includes(d)} onClick={() => updateSettings('criteria.durations', toggleIn(criteria.durations, d))}>{d} mois</Chip>)}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Début au plus tôt"><input type="date" className="input" value={criteria.startFrom} onChange={(e) => updateSettings('criteria.startFrom', e.target.value)} /></Field>
            <Field label="Début au plus tard"><input type="date" className="input" value={criteria.startTo} onChange={(e) => updateSettings('criteria.startTo', e.target.value)} /></Field>
          </div>
        </div>
      </Section>

      <Section icon={MapPin} title="Lieu" description="Distance maximale autour du domicile pour l'Espace France.">
        <p className="label flex justify-between"><span>Distance maximale</span><span className="text-brand-600 dark:text-brand-400">{criteria.maxDistanceKm >= 1000 ? 'Toute la France' : `${criteria.maxDistanceKm} km`}</span></p>
        <input type="range" min="10" max="1000" step="10" value={criteria.maxDistanceKm} onChange={(e) => updateSettings('criteria.maxDistanceKm', +e.target.value)} className="w-full accent-brand-500" />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[[30, 'Petite couronne'], [80, 'Île-de-France'], [1000, 'Toute la France']].map(([v, l]) => <Chip key={v} active={criteria.maxDistanceKm === v} onClick={() => updateSettings('criteria.maxDistanceKm', v)}>{l}</Chip>)}
        </div>
      </Section>

      <Section icon={Target} title="Secteurs & priorités" description="Priorité 1 = la plus forte. Utilisée par le tri « Secteur » et le score de match.">
        <div className="space-y-2">
          {Object.entries(SECTORS).map(([k, s]) => {
            const conf = criteria.sectors[k];
            return (
              <div key={k} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 dark:border-ink-800">
                <span className="h-3 w-3 rounded-full" style={{ background: s.color }} />
                <span className="flex-1 text-sm font-medium text-ink-800 dark:text-ink-100">{s.label}</span>
                <div className="flex rounded-lg bg-slate-100 p-0.5 dark:bg-ink-950/60">
                  {[1, 2, 3, 4].map((p) => (
                    <button key={p} onClick={() => updateSettings(`criteria.sectors.${k}.priority`, p)}
                      className={cx('rounded-md px-2.5 py-1 text-xs font-semibold', conf.priority === p ? 'bg-white text-ink-900 shadow-sm dark:bg-ink-800 dark:text-white' : 'muted')}>P{p}</button>
                  ))}
                </div>
                <Toggle checked={conf.enabled} onChange={(v) => updateSettings(`criteria.sectors.${k}.enabled`, v)} />
              </div>
            );
          })}
        </div>
      </Section>

      <Section icon={SettingsIcon} title="Type d'entreprise">
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(COMPANY_TYPES).map(([k, t]) => (
            <Chip key={k} active={criteria.companyTypes[k]} onClick={() => updateSettings(`criteria.companyTypes.${k}`, !criteria.companyTypes[k])}>{t.label}</Chip>
          ))}
        </div>
      </Section>

      <Section icon={Search} title="Mots-clés" description="Inclusion : au moins un mot doit apparaître (laisser vide pour ne pas filtrer). Exclusion : l'offre est écartée.">
        <div className="space-y-4">
          <Field label="Doit contenir l'un de"><TagInput values={criteria.includeKeywords} onChange={(v) => updateSettings('criteria.includeKeywords', v)} placeholder="ex. bas carbone, ZAC… (Entrée)" /></Field>
          <Field label="Exclure"><TagInput values={criteria.excludeKeywords} onChange={(v) => updateSettings('criteria.excludeKeywords', v)} placeholder="ex. alternance (Entrée)" /></Field>
        </div>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
function SortingSection() {
  const interest = useAppStore((s) => s.settings.interest);
  const model = useAppStore((s) => s.interestModel);
  const { updateSettings, resetInterestModel } = useAppStore.getState();
  const top = Object.entries(model.features).sort((a, b) => Math.abs(b[1].w) - Math.abs(a[1].w)).slice(0, 12);
  const pretty = (f) => {
    const [type, val] = f.split(':');
    if (type === 'sector') return `Secteur ${SECTORS[val]?.short ?? val}`;
    if (type === 'skill') return skillLabel(val);
    if (type === 'type') return COMPANY_TYPES[val]?.label ?? val;
    if (type === 'kind') return { core: 'Cœur de cible', neighbour: 'Poste voisin', research: 'Recherche' }[val];
    if (type === 'company') return `Entreprise : ${val}`;
    return val;
  };
  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <Section icon={MapPin} title="Tri — Espace France" description="Par défaut : du plus proche au plus éloigné."><SortPriorityEditor space="france" compact /></Section>
        <Section icon={Globe2} title="Tri — Espace International" description="Par défaut : Europe anglophone d'abord."><SortPriorityEditor space="international" compact /></Section>
      </div>
      <Section icon={Sparkles} title="Score d'intérêt (apprentissage)" description="Chaque like / dislike ajuste le poids des caractéristiques de l'offre. Les préférences anciennes s'estompent progressivement.">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <p className="label flex justify-between"><span>Vitesse d'apprentissage</span><span>{interest.learningRate}</span></p>
            <input type="range" min="0.1" max="1" step="0.05" value={interest.learningRate} onChange={(e) => updateSettings('interest.learningRate', +e.target.value)} className="w-full accent-brand-500" />
          </div>
          <div>
            <p className="label flex justify-between"><span>Demi-vie des préférences</span><span>{interest.halfLifeDays} jours</span></p>
            <input type="range" min="7" max="120" step="1" value={interest.halfLifeDays} onChange={(e) => updateSettings('interest.halfLifeDays', +e.target.value)} className="w-full accent-brand-500" />
          </div>
        </div>
        <p className="label mt-5">Ce que l'application a appris de vous</p>
        {top.length === 0 ? <p className="text-sm muted">Rien pour l'instant — utilisez 👍 / 👎 sur les offres.</p> : (
          <div className="flex flex-wrap gap-1.5">
            {top.map(([f, { w }]) => <Badge key={f} tone={w > 0 ? 'brand' : 'rose'}>{w > 0 ? '▲' : '▼'} {pretty(f)} ({w.toFixed(2)})</Badge>)}
          </div>
        )}
        <button className="btn-ghost btn-sm mt-3" onClick={resetInterestModel}><RotateCcw size={13} />Réinitialiser l'apprentissage</button>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
function AiSection() {
  const ai = useAppStore((s) => s.settings.ai);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const [showKey, setShowKey] = useState(false);
  const setExample = (id, patch) => updateSettings('ai.examples', ai.examples.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  return (
    <div className="space-y-4">
      <Section icon={BrainCircuit} title="Moteur de génération" description="Mode simulé : génération locale instantanée à partir du CV et de vos exemples. Mode Claude : rédaction par l'API Anthropic avec votre propre clé.">
        <div className="grid gap-3 sm:grid-cols-2">
          {[['simulated', 'Simulé (hors ligne)', 'Aucune clé requise, aucune donnée envoyée.'], ['claude', 'Claude (API Anthropic)', 'Rédaction IA réelle, en streaming.']].map(([v, l, d]) => (
            <button key={v} onClick={() => updateSettings('ai.mode', v)}
              className={cx('rounded-xl border p-4 text-left transition', ai.mode === v ? 'border-violet-500/60 bg-violet-500/[0.06] ring-2 ring-violet-500/20' : 'border-slate-200 hover:border-slate-300 dark:border-ink-800')}>
              <p className="font-semibold text-ink-900 dark:text-white">{l}</p><p className="text-xs muted">{d}</p>
            </button>
          ))}
        </div>
        {ai.mode === 'claude' && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Clé API Anthropic" hint="Stockée uniquement dans ce navigateur (LocalStorage), jamais exportée.">
              <div className="flex gap-2">
                <input type={showKey ? 'text' : 'password'} className="input font-mono" value={ai.apiKey} onChange={(e) => updateSettings('ai.apiKey', e.target.value)} placeholder="sk-ant-…" />
                <button className="btn-secondary" onClick={() => setShowKey((v) => !v)}><KeyRound size={15} /></button>
              </div>
            </Field>
            <Field label="Modèle">
              <select className="input" value={ai.model} onChange={(e) => updateSettings('ai.model', e.target.value)}>
                <option value="claude-opus-5-5">Claude Opus 5.5 (recommandé)</option>
                <option value="claude-sonnet-5-5">Claude Sonnet 5.5</option>
                <option value="claude-haiku-5-5">Claude Haiku 5.5 (rapide)</option>
              </select>
            </Field>
          </div>
        )}
        <Field label="Ton par défaut" className="mt-4 sm:w-1/2">
          <select className="input" value={ai.tone} onChange={(e) => updateSettings('ai.tone', e.target.value)}>
            <option value="professionnel">Professionnel</option><option value="enthousiaste">Enthousiaste</option><option value="concis">Concis</option>
          </select>
        </Field>
      </Section>

      <Section icon={FileText} title="Exemples de lettres" description="L'assistant reprend vos formules d'appel et de politesse, et (en mode Claude) votre style, en choisissant l'exemple dans la langue de l'offre.">
        <div className="space-y-4">
          {ai.examples.map((ex) => (
            <div key={ex.id} className="rounded-xl border border-slate-200 p-3 dark:border-ink-800">
              <div className="mb-2 flex gap-2">
                <input className="input" value={ex.title} onChange={(e) => setExample(ex.id, { title: e.target.value })} />
                <select className="input w-24" value={ex.lang} onChange={(e) => setExample(ex.id, { lang: e.target.value })}><option value="fr">FR</option><option value="en">EN</option></select>
                <button className="btn-danger" onClick={() => updateSettings('ai.examples', ai.examples.filter((e) => e.id !== ex.id))}><Trash2 size={15} /></button>
              </div>
              <textarea rows={8} className="input text-sm leading-relaxed" value={ex.content} onChange={(e) => setExample(ex.id, { content: e.target.value })} />
            </div>
          ))}
          <button className="btn-secondary" onClick={() => updateSettings('ai.examples', [...ai.examples, { id: uid('ex'), title: 'Nouvel exemple', lang: 'fr', content: '' }])}><Plus size={15} />Ajouter un exemple</button>
        </div>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
function NotificationsSection() {
  const n = useAppStore((s) => s.settings.notifications);
  const updateSettings = useAppStore((s) => s.updateSettings);
  return (
    <Section icon={Bell} title="Alertes & relances" description="Alertes dans l'interface (cloche + toasts) et rappels automatiques dans l'agenda.">
      <div className="space-y-5">
        <Toggle checked={n.enabled} onChange={(v) => updateSettings('notifications.enabled', v)} label="Activer les notifications" />
        <div>
          <p className="label flex justify-between"><span>Seuil « offre très pertinente »</span><span className="text-brand-600 dark:text-brand-400">match ≥ {n.highMatchThreshold} %</span></p>
          <input type="range" min="50" max="95" step="5" value={n.highMatchThreshold} onChange={(e) => updateSettings('notifications.highMatchThreshold', +e.target.value)} className="w-full accent-brand-500" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Relance automatique après (jours)" hint="Après l'envoi d'une candidature ou un entretien">
            <input type="number" min="1" max="30" className="input" value={n.followUpDays} onChange={(e) => updateSettings('notifications.followUpDays', +e.target.value)} />
          </Field>
          <Field label="Rappel d'entretien (heures avant)">
            <input type="number" min="1" max="72" className="input" value={n.interviewReminderHours} onChange={(e) => updateSettings('notifications.interviewReminderHours', +e.target.value)} />
          </Field>
        </div>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
function DataSection() {
  const theme = useAppStore((s) => s.settings.theme);
  const hasDemo = useAppStore((s) => s.meta.hasDemo);
  const counts = {
    o: useAppStore((s) => Object.keys(s.offers).length),
    a: useAppStore((s) => Object.keys(s.applications).length),
    c: useAppStore((s) => Object.keys(s.contacts).length),
  };
  const { updateSettings, exportData, importData, resetAll, removeDemoData, toast } = useAppStore.getState();
  const fileRef = useRef(null);
  const onImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      importData(await file.text());
      toast('Données importées.', 'success');
    } catch (err) {
      toast(`Import impossible : ${err.message}`, 'warning');
    }
    e.target.value = '';
  };
  return (
    <div className="space-y-4">
      <Section icon={Palette} title="Apparence">
        <div className="grid grid-cols-3 gap-3">
          {[['light', 'Clair', Sun], ['dark', 'Sombre', Moon], ['system', 'Système', Laptop]].map(([v, l, Icon]) => (
            <button key={v} onClick={() => updateSettings('theme', v)}
              className={cx('flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition', theme === v ? 'border-brand-500 bg-brand-500/[0.06] text-brand-700 dark:text-brand-300' : 'border-slate-200 text-ink-600 dark:border-ink-800 dark:text-ink-300')}>
              <Icon size={20} />{l}
            </button>
          ))}
        </div>
      </Section>
      <Section icon={Database} title="Données" description={`Sauvegarde automatique dans ce navigateur (LocalStorage) : ${counts.o} offres, ${counts.a} candidatures, ${counts.c} contacts.`}>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={() => downloadFile(`stagepilot-${new Date().toISOString().slice(0, 10)}.json`, exportData())}><Download size={15} />Exporter (JSON)</button>
          <button className="btn-secondary" onClick={() => fileRef.current?.click()}><Upload size={15} />Importer</button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={onImport} />
          {hasDemo && <button className="btn-secondary" onClick={() => { removeDemoData(); toast('Données de démonstration supprimées.', 'success'); }}><Trash2 size={15} />Supprimer les données de démo</button>}
          <button className="btn-danger" onClick={() => { if (window.confirm('Tout effacer et repartir de zéro ?')) resetAll(); }}><RotateCcw size={15} />Réinitialiser l'application</button>
        </div>
        <p className="mt-3 text-xs muted">L'export permet de transférer vos données sur un autre ordinateur. La clé API n'est jamais incluse.</p>
      </Section>
    </div>
  );
}

export default function Settings() {
  const [section, setSection] = useState('profile');
  const Comp = { profile: ProfileSection, engine: EngineSection, criteria: CriteriaSection, sorting: SortingSection, ai: AiSection, notifications: NotificationsSection, data: DataSection }[section];
  return (
    <div>
      <PageHeader icon={SettingsIcon} title="Paramètres" subtitle="Configurez le moteur de recherche, les critères, le tri et l'assistant IA — tout est sauvegardé automatiquement." />
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <nav className="flex gap-1 overflow-x-auto lg:sticky lg:top-24 lg:flex-col lg:self-start">
          {SECTIONS.map((s) => (
            <button key={s.id} onClick={() => setSection(s.id)}
              className={cx('flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition',
                section === s.id ? 'bg-white text-ink-900 shadow-card dark:bg-ink-800 dark:text-white' : 'text-ink-500 hover:bg-slate-100 hover:text-ink-800 dark:text-ink-400 dark:hover:bg-ink-900')}>
              <s.icon size={17} className={section === s.id ? 'text-brand-500' : ''} />{s.label}
            </button>
          ))}
        </nav>
        <div className="min-w-0 animate-fade-up" key={section}><Comp /></div>
      </div>
    </div>
  );
}
