import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, BrainCircuit, CheckCircle2, CircleDashed, Copy, Download, ExternalLink, Eye, EyeOff, FileCheck2, FileText, KeyRound, ListChecks, MessagesSquare, Printer, RefreshCw, Save, Send, Sparkles, Tags, Wand2, X } from 'lucide-react';
import { findDossier, useAppStore } from '../../store/useAppStore.js';
import { dossierRequestUrl } from '../../lib/published.js';
import { CV_CSS, fillContact, markdownToHtml, printMarkdown } from '../../lib/markdown.js';
import { useEnrichedOffer } from '../../hooks/useOffers.js';
import { analyzeKeywords, generateCoverLetter, generateCvSuggestions, generateInterviewPrep, generateWithClaude, langForOffer } from '../../lib/ai.js';
import { cx, downloadFile, formatDateTime } from '../../lib/utils.js';
import { Badge, Drawer, ScoreRing, Tabs } from '../ui/index.jsx';

const TABS = [
  { id: 'dossier', label: 'Dossier Claude', icon: FileCheck2 },
  { id: 'letter', label: 'Lettre / e-mail', icon: FileText },
  { id: 'cv', label: 'Adapter le CV', icon: Wand2 },
  { id: 'keywords', label: 'Mots-clés', icon: Tags },
  { id: 'interview', label: 'Entretien', icon: MessagesSquare },
];

/** Effet "machine à écrire" pour le mode simulé. */
function useTypewriter() {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const timer = useRef(null);
  const run = (full) => {
    clearInterval(timer.current);
    setBusy(true);
    let i = 0;
    timer.current = setInterval(() => {
      i += 18;
      setText(full.slice(0, i));
      if (i >= full.length) { clearInterval(timer.current); setBusy(false); }
    }, 16);
  };
  useEffect(() => () => clearInterval(timer.current), []);
  return { text, setText, busy, setBusy, run };
}

function ClaudeOutput({ task, offer, lang }) {
  const profile = useAppStore((s) => s.profile);
  const settings = useAppStore((s) => s.settings);
  const [out, setOut] = useState('');
  const [state, setState] = useState({ busy: false, error: null });
  const abort = useRef(null);
  const run = async () => {
    abort.current?.abort();
    abort.current = new AbortController();
    setOut('');
    setState({ busy: true, error: null });
    try {
      await generateWithClaude({ task, offer, profile, settings, lang, signal: abort.current.signal, onText: (d) => setOut((t) => t + d) });
      setState({ busy: false, error: null });
    } catch (e) {
      if (e.name !== 'AbortError') setState({ busy: false, error: e.message });
    }
  };
  useEffect(() => () => abort.current?.abort(), []);
  return (
    <div className="card mt-4 p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-2 section-title"><BrainCircuit size={16} className="text-violet-500" />Analyse Claude ({settings.ai.model})</p>
        <button className="btn-secondary btn-sm" onClick={run} disabled={state.busy}><Sparkles size={13} />{state.busy ? 'Génération…' : out ? 'Relancer' : 'Générer avec Claude'}</button>
      </div>
      {state.error && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-300">{state.error}</p>}
      {out && <div className="whitespace-pre-wrap text-sm leading-relaxed text-ink-700 dark:text-ink-200">{out}</div>}
      {!out && !state.error && <p className="text-xs muted">Génère une version rédigée par Claude à partir de votre CV, de l'offre et de vos exemples.</p>}
    </div>
  );
}

function LetterTab({ offer, lang }) {
  const profile = useAppStore((s) => s.profile);
  const settings = useAppStore((s) => s.settings);
  const { saveDocument, updateSettings, toast } = useAppStore.getState();
  const [format, setFormat] = useState('letter');
  const tw = useTypewriter();
  const abort = useRef(null);
  const claude = settings.ai.mode === 'claude';
  const example = settings.ai.examples.find((e) => e.lang === lang);

  const generate = async () => {
    if (!claude) {
      tw.run(generateCoverLetter({ offer, profile, settings, lang, format }));
      return;
    }
    abort.current?.abort();
    abort.current = new AbortController();
    tw.setText('');
    tw.setBusy(true);
    try {
      await generateWithClaude({ task: format === 'email' ? 'email' : 'letter', offer, profile, settings, lang, signal: abort.current.signal, onText: (d) => tw.setText((t) => t + d) });
    } catch (e) {
      if (e.name !== 'AbortError') toast(e.message, 'warning');
    }
    tw.setBusy(false);
  };

  useEffect(() => { if (!claude) tw.run(generateCoverLetter({ offer, profile, settings, lang, format })); }, [offer.id, lang, format]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => abort.current?.abort(), []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={format} onChange={setFormat} tabs={[{ id: 'letter', label: 'Lettre de motivation' }, { id: 'email', label: 'E-mail court' }]} />
        <select className="input w-auto py-1.5" value={settings.ai.tone} onChange={(e) => updateSettings('ai.tone', e.target.value)}>
          <option value="professionnel">Ton professionnel</option>
          <option value="enthousiaste">Ton enthousiaste</option>
          <option value="concis">Ton concis</option>
        </select>
        <button className="btn-primary ml-auto" onClick={generate} disabled={tw.busy}><RefreshCw size={15} className={tw.busy ? 'animate-spin' : ''} />{tw.busy ? 'Rédaction…' : 'Régénérer'}</button>
      </div>
      <p className="text-xs muted">
        Basée sur votre CV, l'offre{example ? <> et votre exemple « <b>{example.title}</b> » (formules d'appel et de politesse)</> : ''}. {claude ? 'Rédigée par Claude.' : 'Mode simulé — activez Claude dans les paramètres pour une rédaction IA réelle.'}
      </p>
      <textarea value={tw.text} onChange={(e) => tw.setText(e.target.value)} rows={22}
        className="input font-[450] leading-relaxed" placeholder={claude ? 'Cliquez sur « Régénérer » pour lancer la rédaction avec Claude.' : ''} />
      <div className="flex flex-wrap gap-2">
        <button className="btn-secondary" onClick={() => { navigator.clipboard.writeText(tw.text); toast('Copié dans le presse-papiers.', 'success'); }}><Copy size={15} />Copier</button>
        <button className="btn-secondary" onClick={() => downloadFile(`${format === 'email' ? 'Email' : 'LM'}_${offer.company.replace(/\W+/g, '_')}.txt`, tw.text, 'text/plain;charset=utf-8')}><Download size={15} />Télécharger</button>
        <button className="btn-secondary" onClick={() => saveDocument(offer.id, format, tw.text)} disabled={!tw.text}><Save size={15} />Enregistrer sur la candidature</button>
      </div>
    </div>
  );
}

const PRIORITY_TONE = { haute: 'rose', moyenne: 'amber', basse: 'slate' };

function CvTab({ offer, lang }) {
  const profile = useAppStore((s) => s.profile);
  const settings = useAppStore((s) => s.settings);
  const { suggestions, match } = useMemo(() => generateCvSuggestions({ offer, profile, settings, lang }), [offer, profile, settings, lang]);
  return (
    <div>
      <div className="mb-4 flex items-center gap-4 rounded-2xl bg-slate-50 p-4 dark:bg-ink-950/50">
        <ScoreRing value={match.score} size={56} />
        <p className="text-sm text-ink-600 dark:text-ink-300">
          Votre CV couvre <b>{match.matched.length}</b> des <b>{match.matched.length + match.missing.length}</b> compétences clés.
          Appliquer ces {suggestions.length} suggestions peut renforcer votre score auprès des ATS et des recruteurs.
        </p>
      </div>
      <div className="space-y-3">
        {suggestions.map((s, i) => (
          <div key={i} className="card p-4">
            <div className="mb-1 flex items-center gap-2">
              <ListChecks size={15} className="text-brand-500" />
              <p className="section-title">{s.title}</p>
              <Badge tone={PRIORITY_TONE[s.priority]} className="ml-auto">Priorité {s.priority}</Badge>
            </div>
            <p className="whitespace-pre-line text-sm text-ink-700 dark:text-ink-200">{s.detail}</p>
            <p className="mt-1 text-xs muted">{s.why}</p>
          </div>
        ))}
      </div>
      {settings.ai.mode === 'claude' && <ClaudeOutput task="cv" offer={offer} lang={lang} />}
    </div>
  );
}

function KeywordsTab({ offer, lang }) {
  const profile = useAppStore((s) => s.profile);
  const mode = useAppStore((s) => s.settings.ai.mode);
  const { skills, terms, coverage } = useMemo(() => analyzeKeywords({ offer, profile }), [offer, profile]);
  const groups = skills.reduce((acc, s) => ({ ...acc, [s.categoryLabel]: [...(acc[s.categoryLabel] ?? []), s] }), {});
  const max = terms[0]?.count ?? 1;
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4 dark:bg-ink-950/50">
        <ScoreRing value={coverage} size={56} />
        <div className="text-sm text-ink-600 dark:text-ink-300">
          <p><b>{skills.filter((s) => s.inCv).length}</b> compétences présentes dans votre CV, <b>{skills.filter((s) => !s.inCv).length}</b> à travailler.</p>
          <p className="mt-1 flex gap-3 text-xs"><span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-brand-500" />Dans le CV</span><span className="flex items-center gap-1"><CircleDashed size={12} className="text-amber-500" />Manquante</span></p>
        </div>
      </div>
      {Object.entries(groups).map(([cat, list]) => (
        <div key={cat}>
          <p className="label">{cat}</p>
          <div className="flex flex-wrap gap-1.5">
            {list.map((s) => (
              <span key={s.id} className={cx('inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium',
                s.inCv ? 'border-brand-500/30 bg-brand-500/10 text-brand-700 dark:text-brand-300' : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300')}>
                {s.inCv ? <CheckCircle2 size={12} /> : <CircleDashed size={12} />}{s.label}
                {s.importance === 'haute' && <span className="rounded bg-current/10 px-1 text-[9px] uppercase opacity-70">clé</span>}
              </span>
            ))}
          </div>
        </div>
      ))}
      <div>
        <p className="label">Termes les plus fréquents de l'annonce</p>
        <div className="space-y-1.5">
          {terms.map((t) => (
            <div key={t.term} className="flex items-center gap-3 text-sm">
              <span className="w-36 truncate text-ink-700 dark:text-ink-200">{t.term}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-ink-800"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${(t.count / max) * 100}%` }} /></div>
              <span className="w-6 text-right text-xs muted">{t.count}</span>
            </div>
          ))}
        </div>
      </div>
      {mode === 'claude' && <ClaudeOutput task="keywords" offer={offer} lang={lang} />}
    </div>
  );
}

function InterviewTab({ offer, lang }) {
  const profile = useAppStore((s) => s.profile);
  const settings = useAppStore((s) => s.settings);
  const [showHints, setShowHints] = useState(true);
  const prep = useMemo(() => generateInterviewPrep({ offer, profile, settings, lang }), [offer, profile, settings, lang]);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm muted">{prep.sections.reduce((n, s) => n + s.questions.length, 0)} questions générées {prep.lang === 'en' ? '(entretien en anglais)' : ''}</p>
        <button className="btn-secondary btn-sm" onClick={() => setShowHints((v) => !v)}>
          {showHints ? <EyeOff size={13} /> : <Eye size={13} />}{showHints ? 'Mode entraînement (masquer les pistes)' : 'Afficher les pistes'}
        </button>
      </div>
      {prep.sections.map((sec) => (
        <div key={sec.title} className="card overflow-hidden">
          <p className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink-600 dark:border-ink-800 dark:bg-ink-950/40 dark:text-ink-300">{sec.title}</p>
          <ul className="divide-y divide-slate-100 dark:divide-ink-800">
            {sec.questions.map((q, i) => (
              <li key={i} className="px-4 py-3">
                <p className="flex items-start gap-2 text-sm font-medium text-ink-900 dark:text-white">
                  <span className="mt-0.5 text-brand-500">Q.</span>{q.q}{q.tag && <Badge tone="indigo" className="ml-auto">{q.tag}</Badge>}
                </p>
                {showHints && q.hint && <p className="ml-6 mt-1 text-sm text-ink-500 dark:text-ink-400">↳ {q.hint}</p>}
              </li>
            ))}
          </ul>
        </div>
      ))}
      {settings.ai.mode === 'claude' && <ClaudeOutput task="interview" offer={offer} lang={lang} />}
    </div>
  );
}

const DOSSIER_PARTS = [
  { id: 'cv', label: 'CV personnalisé' },
  { id: 'letter', label: 'Lettre' },
  { id: 'changes', label: 'Modifications' },
  { id: 'keywords', label: 'Mots-clés' },
  { id: 'interview', label: 'Entretien' },
];

function DocActions({ name, text, offerId, kind, onPrint }) {
  const { saveDocument, toast } = useAppStore.getState();
  return (
    <div className="flex flex-wrap gap-2">
      <button className="btn-secondary" onClick={() => { navigator.clipboard.writeText(text); toast('Copié dans le presse-papiers.', 'success'); }}><Copy size={15} />Copier</button>
      <button className="btn-secondary" onClick={() => downloadFile(name, text, 'text/plain;charset=utf-8')}><Download size={15} />Télécharger</button>
      {onPrint && <button className="btn-secondary" onClick={onPrint}><Printer size={15} />Imprimer / PDF</button>}
      <button className="btn-secondary" onClick={() => saveDocument(offerId, kind, text)}><Save size={15} />Enregistrer sur la candidature</button>
    </div>
  );
}

/** Dossier rédigé par la routine Claude « Dossiers IA » (public/data/dossiers.json). */
function DossierTab({ offer }) {
  const dossier = useAppStore((s) => findDossier(s.dossiers, offer));
  const repo = useAppStore((s) => s.settings.routines.repo);
  const times = useAppStore((s) => s.settings.routines.dossierTimes);
  const toast = useAppStore((s) => s.toast);
  const email = useAppStore((s) => s.profile.email);
  const phone = useAppStore((s) => s.profile.phone);
  const contact = useMemo(() => ({ email, phone }), [email, phone]);
  const [part, setPart] = useState('cv');
  const [letter, setLetter] = useState('');
  const cv = useMemo(() => fillContact(dossier?.cv, contact), [dossier, contact]);
  useEffect(() => setLetter(fillContact(dossier?.letter, contact)), [dossier, contact]);
  const company = offer.company.replace(/\W+/g, '_');

  if (!dossier) {
    return (
      <div className="card p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-300"><FileCheck2 size={22} /></div>
        <p className="section-title">Pas encore de dossier Claude pour cette offre</p>
        <p className="mx-auto mt-1 max-w-md text-sm muted">
          La routine « Dossiers IA » rédige automatiquement un CV personnalisé, une lettre, l'analyse des mots-clés et la préparation d'entretien
          pour les meilleures offres. Pour celle-ci, envoyez une demande : elle sera traitée au prochain passage ({times.map((t) => t.replace(':', 'h')).join(' ou ')}).
        </p>
        <a className="btn-primary mt-4" href={dossierRequestUrl(repo, offer)} target="_blank" rel="noreferrer" onClick={() => toast('Validez l’issue sur GitHub : la routine la traitera à son prochain passage.', 'info')}>
          <Send size={15} />Demander ce dossier à Claude
        </a>
        <p className="mt-2 text-xs muted">Ouvre une issue GitHub pré-remplie dans {repo} (connexion GitHub requise).</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={part} onChange={setPart} tabs={DOSSIER_PARTS} />
        <span className="ml-auto text-xs muted">Rédigé par Claude le {formatDateTime(dossier.generatedAt)} · {dossier.lang === 'en' ? 'anglais' : 'français'}</span>
      </div>

      {part === 'cv' && (
        <>
          <style>{CV_CSS}</style>
          {!contact.email && <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">Ajoutez votre e-mail et votre téléphone dans Paramètres › Profil : ils seront insérés dans le CV (ils ne sont jamais publiés en ligne).</p>}
          <div className="cv-doc rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-ink-700" dangerouslySetInnerHTML={{ __html: markdownToHtml(cv) }} />
          <DocActions name={`CV_${company}.md`} text={cv} offerId={offer.id} kind="cv"
            onPrint={() => printMarkdown(`CV — ${offer.company}`, cv) || toast('Autorisez les fenêtres pop-up pour imprimer.', 'warning')} />
        </>
      )}

      {part === 'letter' && (
        <>
          <textarea value={letter} onChange={(e) => setLetter(e.target.value)} rows={22} className="input font-[450] leading-relaxed" />
          <DocActions name={`LM_${company}.txt`} text={letter} offerId={offer.id} kind="letter" />
          {dossier.email && (
            <div className="card p-4">
              <p className="label">E-mail d'accompagnement</p>
              <p className="whitespace-pre-wrap text-sm text-ink-700 dark:text-ink-200">{fillContact(dossier.email, contact)}</p>
            </div>
          )}
        </>
      )}

      {part === 'changes' && (
        <div className="space-y-3">
          {(dossier.cvChanges ?? []).map((c, i) => (
            <div key={i} className="card p-4">
              <div className="mb-1 flex items-center gap-2"><ListChecks size={15} className="text-brand-500" /><p className="section-title">{c.section}</p></div>
              <p className="whitespace-pre-line text-sm text-ink-700 dark:text-ink-200">{c.change}</p>
              {c.why && <p className="mt-1 text-xs muted">{c.why}</p>}
            </div>
          ))}
        </div>
      )}

      {part === 'keywords' && (
        <div className="space-y-4">
          {[['Présentes dans votre profil', dossier.keywords?.matched, true], ['À travailler / mettre en avant', dossier.keywords?.missing, false]].map(([label, list, ok]) => (
            <div key={label}>
              <p className="label">{label}</p>
              <div className="flex flex-wrap gap-1.5">
                {(list ?? []).map((k) => (
                  <span key={k} className={cx('inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium',
                    ok ? 'border-brand-500/30 bg-brand-500/10 text-brand-700 dark:text-brand-300' : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300')}>
                    {ok ? <CheckCircle2 size={12} /> : <CircleDashed size={12} />}{k}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {dossier.keywords?.notes && <p className="text-sm text-ink-600 dark:text-ink-300">{dossier.keywords.notes}</p>}
        </div>
      )}

      {part === 'interview' && (
        <div className="card overflow-hidden">
          <ul className="divide-y divide-slate-100 dark:divide-ink-800">
            {(dossier.interview ?? []).map((q, i) => (
              <li key={i} className="px-4 py-3">
                <p className="flex items-start gap-2 text-sm font-medium text-ink-900 dark:text-white">
                  <span className="mt-0.5 text-brand-500">Q.</span>{q.q}{q.category && <Badge tone="indigo" className="ml-auto">{q.category}</Badge>}
                </p>
                {q.hint && <p className="ml-6 mt-1 text-sm text-ink-500 dark:text-ink-400">↳ {q.hint}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {offer.url && <a className="btn-ghost btn-sm" href={offer.url} target="_blank" rel="noreferrer"><ExternalLink size={13} />Relire l'annonce d'origine</a>}
    </div>
  );
}

export default function AIPanel() {
  const panel = useAppStore((s) => s.aiPanel);
  const mode = useAppStore((s) => s.settings.ai.mode);
  const hasKey = useAppStore((s) => !!s.settings.ai.apiKey);
  const close = useAppStore((s) => s.closeAiPanel);
  const offer = useEnrichedOffer(panel?.offerId);
  const [tab, setTab] = useState('letter');
  const [lang, setLang] = useState('fr');

  useEffect(() => {
    if (panel) setTab(panel.tab ?? 'letter');
    if (offer) setLang(langForOffer(offer));
  }, [panel?.offerId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!panel || !offer) return null;
  return (
    <Drawer open onClose={close} width="max-w-3xl">
      <div className="border-b border-slate-200 bg-gradient-to-br from-violet-500/10 via-transparent to-brand-500/10 px-6 pb-4 pt-5 dark:border-ink-800">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/30"><Bot size={20} /></div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-300">Candidature assistée par IA</p>
            <h2 className="truncate text-lg font-bold text-ink-900 dark:text-white">{offer.title}</h2>
            <p className="text-sm muted">{offer.company} · {offer.location.city}</p>
          </div>
          <button className="icon-btn" onClick={close} aria-label="Fermer"><X size={18} /></button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Tabs tabs={TABS} value={tab} onChange={setTab} />
          <div className="ml-auto flex items-center gap-2">
            <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold dark:bg-ink-950/60">
              {['fr', 'en'].map((l) => (
                <button key={l} onClick={() => setLang(l)} className={cx('rounded-md px-2.5 py-1 uppercase', lang === l ? 'bg-white text-ink-900 shadow-sm dark:bg-ink-800 dark:text-white' : 'muted')}>{l}</button>
              ))}
            </div>
            <Badge tone={mode === 'claude' ? 'violet' : 'slate'}>
              {mode === 'claude' ? <><BrainCircuit size={11} />Claude{!hasKey && ' — clé manquante'}</> : <><KeyRound size={11} />Mode simulé</>}
            </Badge>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {tab === 'dossier' && <DossierTab offer={offer} />}
        {tab === 'letter' && <LetterTab offer={offer} lang={lang} />}
        {tab === 'cv' && <CvTab offer={offer} lang={lang} />}
        {tab === 'keywords' && <KeywordsTab offer={offer} lang={lang} />}
        {tab === 'interview' && <InterviewTab offer={offer} lang={lang} />}
      </div>
    </Drawer>
  );
}
