import { Link, useSearchParams } from 'react-router-dom';
import { BadgeCheck, Bot, Building2, CalendarRange, Car, Clock, ExternalLink, FileCheck2, FlaskConical, MapPin, Plus, Shuffle, ThumbsDown, ThumbsUp, TrainFront, Check, Star } from 'lucide-react';
import { findDossier, useAppStore } from '../../store/useAppStore.js';
import { targetCompany } from '../../data/targetCompanies.js';
import { COMPANY_TYPES } from '../../data/companies.js';
import { SECTORS } from '../../data/defaults.js';
import { SOURCES } from '../../data/sources.js';
import { formatDuration, formatKm } from '../../lib/geo.js';
import { cx, durationText, startText, timeAgo } from '../../lib/utils.js';
import { Badge, ScoreRing, SectorBadge } from '../ui/index.jsx';

export function useOpenOffer() {
  const [params, setParams] = useSearchParams();
  return (id) => {
    const next = new URLSearchParams(params);
    next.set('offer', id);
    setParams(next);
    useAppStore.getState().markSeen(id);
  };
}

export default function OfferCard({ offer, application, rank }) {
  const { react, createApplication, openAiPanel } = useAppStore.getState();
  const open = useOpenOffer();
  const src = SOURCES[offer.source];
  const hasDossier = useAppStore((s) => !!findDossier(s.dossiers, offer));
  const target = targetCompany(offer.company);
  const durationOk = offer.durationMonths >= 4 && offer.durationMonths <= 5;

  return (
    <article
      onClick={() => open(offer.id)}
      className={cx('card card-hover group relative cursor-pointer p-4 animate-fade-up',
        offer.reaction === -1 && 'opacity-60', offer.expired && 'opacity-50')}
    >
      {offer.status === 'new' && (
        <span className="absolute -left-px top-5 h-8 w-1 rounded-r-full bg-brand-500" title="Nouvelle offre" />
      )}
      <div className="flex gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            {rank != null && <span className="text-[11px] font-bold text-ink-400">#{rank}</span>}
            {offer.status === 'new' && <Badge tone="brand">Nouveau</Badge>}
            {target && <Badge tone="amber" title={`${target.label} — groupe ${target.tier}, n° ${target.rank + 1}`}><Star size={11} className="fill-current" />Cible G{target.tier}</Badge>}
            {offer.real && <Badge tone="sky" title="Annonce réelle collectée par la routine Claude"><BadgeCheck size={11} />Offre réelle</Badge>}
            {hasDossier && <Badge tone="violet" title="CV, lettre et préparation rédigés par Claude"><FileCheck2 size={11} />Dossier IA prêt</Badge>}
            <SectorBadge sector={offer.sector} sectors={SECTORS} />
            {offer.kind === 'research' && <Badge tone="sky"><FlaskConical size={11} />Recherche</Badge>}
            {offer.kind === 'neighbour' && <Badge tone="violet"><Shuffle size={11} />Poste voisin</Badge>}
            {offer.expired && <Badge tone="rose">Expirée</Badge>}
            {application && <Badge tone="indigo"><Check size={11} />Dans le pipeline</Badge>}
          </div>
          <h3 className="line-clamp-2 font-semibold leading-snug text-ink-900 group-hover:text-brand-700 dark:text-white dark:group-hover:text-brand-300">
            {offer.title}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm muted">
            <span className="flex items-center gap-1 font-medium text-ink-700 dark:text-ink-200"><Building2 size={14} />{offer.company}</span>
            <span className="flex items-center gap-1"><MapPin size={14} />{offer.location.city}{offer.space === 'international' && `, ${offer.location.country}`}</span>
          </div>
          <p className="mt-2 line-clamp-2 text-sm text-ink-600 dark:text-ink-300">{offer.summary}</p>

          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
            <span className={cx('flex items-center gap-1 rounded-md px-2 py-0.5 font-semibold',
              durationOk ? 'bg-brand-500/10 text-brand-700 dark:text-brand-300' : 'bg-amber-500/10 text-amber-700 dark:text-amber-300')}>
              <Clock size={12} />{durationText(offer)}
            </span>
            <span className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-ink-600 dark:bg-ink-800 dark:text-ink-300">
              <CalendarRange size={12} />{startText(offer)}
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-ink-600 dark:bg-ink-800 dark:text-ink-300">
              {COMPANY_TYPES[offer.companyType]?.label ?? 'Entreprise'}
            </span>
            <span className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-ink-600 dark:bg-ink-800 dark:text-ink-300" title="Distance à vol d'oiseau">
              {formatKm(offer.distanceKm)}
            </span>
            {offer.travel && (
              <span className="flex items-center gap-2 rounded-md bg-slate-100 px-2 py-0.5 text-ink-600 dark:bg-ink-800 dark:text-ink-300" title="Temps de trajet estimé">
                <span className="flex items-center gap-1"><TrainFront size={12} />{formatDuration(offer.travel.transit)}</span>
                {offer.travel.car && <span className="flex items-center gap-1"><Car size={12} />{formatDuration(offer.travel.car)}</span>}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-center gap-2">
          <ScoreRing value={offer.matchScore} label="Match" />
          <ScoreRing value={offer.interestScore} label="Intérêt" color="#6366f1" size={38} />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-ink-800" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 text-[11px] muted">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: src?.color ?? '#94a3b8' }} />
          {offer.sourceLabel ?? src?.label ?? 'Ajout manuel'} · {timeAgo(offer.postedAt)}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => react(offer.id, 1)} title="J'aime — affine le score d'intérêt"
            className={cx('icon-btn h-8 w-8', offer.reaction === 1 && 'bg-brand-500/15 text-brand-600 dark:text-brand-300')}><ThumbsUp size={15} /></button>
          <button onClick={() => react(offer.id, -1)} title="Pas pour moi"
            className={cx('icon-btn h-8 w-8', offer.reaction === -1 && 'bg-rose-500/15 text-rose-600 dark:text-rose-300')}><ThumbsDown size={15} /></button>
          <a href={offer.url} target="_blank" rel="noreferrer" className="icon-btn h-8 w-8" title="Voir l'offre"><ExternalLink size={15} /></a>
          <button onClick={() => openAiPanel(offer.id, hasDossier ? 'dossier' : 'letter')} className="btn-secondary btn-sm"><Bot size={14} />IA</button>
          {application ? (
            <Link to="/pipeline" className="btn-secondary btn-sm">Suivi</Link>
          ) : (
            <button onClick={() => createApplication(offer.id)} className="btn-primary btn-sm"><Plus size={14} />Postuler</button>
          )}
        </div>
      </div>
    </article>
  );
}
