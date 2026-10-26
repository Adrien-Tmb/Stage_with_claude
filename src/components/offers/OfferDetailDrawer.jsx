import { Link } from 'react-router-dom';
import { Archive, Bot, Building2, Car, CheckCircle2, CircleDashed, ExternalLink, Plus, Star, ThumbsDown, ThumbsUp, TrainFront, Plane, X } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore.js';
import { useEnrichedOffer } from '../../hooks/useOffers.js';
import { COMPANY_TYPES, COMPANY_BY_ID } from '../../data/companies.js';
import { SECTORS } from '../../data/defaults.js';
import { SOURCES } from '../../data/sources.js';
import { directionsUrl, formatDuration, formatKm, TIER_LABELS } from '../../lib/geo.js';
import { skillLabel } from '../../lib/scoring.js';
import { cx, durationText, formatDate, timeAgo } from '../../lib/utils.js';
import { Badge, Drawer, ScoreRing, SectorBadge, ProgressBar } from '../ui/index.jsx';
import MiniMap from './MiniMap.jsx';

function Info({ label, children }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-ink-950/50">
      <p className="text-[10px] font-semibold uppercase tracking-wide muted">{label}</p>
      <p className="text-sm font-medium text-ink-800 dark:text-ink-100">{children}</p>
    </div>
  );
}

export default function OfferDetailDrawer({ offerId, onClose }) {
  const offer = useEnrichedOffer(offerId);
  const home = useAppStore((s) => s.profile.home);
  const application = useAppStore((s) => Object.values(s.applications).find((a) => a.offerId === offerId));
  const followed = useAppStore((s) => (offer ? !!s.followedCompanies[offer.companyId] : false));
  const { react, createApplication, openAiPanel, archiveOffer, toggleFollowCompany } = useAppStore.getState();
  if (!offer) return null;
  const co = COMPANY_BY_ID[offer.companyId];
  const { matched, missing } = offer.matchDetails;
  const TransitIcon = offer.travel?.mode === 'flight' ? Plane : TrainFront;

  return (
    <Drawer open={!!offer} onClose={onClose}>
      <div className="relative border-b border-slate-200 bg-gradient-to-br from-brand-500/10 via-transparent to-indigo-500/5 px-6 pb-5 pt-6 dark:border-ink-800">
        <button className="icon-btn absolute right-4 top-4" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        <div className="mb-2 flex flex-wrap gap-1.5 pr-10">
          <SectorBadge sector={offer.sector} sectors={SECTORS} />
          <Badge>{COMPANY_TYPES[offer.companyType]?.label}</Badge>
          {offer.space === 'international' && <Badge tone="sky">{TIER_LABELS[offer.regionTier] ?? 'International'}</Badge>}
          {offer.simulated && <Badge tone="amber" className="cursor-help"><span title="Offre générée par le scraper simulé — le lien ouvre une vraie recherche pré-remplie.">Offre simulée</span></Badge>}
          {offer.expired && <Badge tone="rose">Expirée</Badge>}
        </div>
        <h2 className="pr-10 text-xl font-bold leading-snug text-ink-900 dark:text-white">{offer.title}</h2>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm muted">
          <Link to={`/companies?c=${offer.companyId}`} onClick={onClose} className="flex items-center gap-1 font-semibold text-ink-700 hover:text-brand-600 dark:text-ink-200"><Building2 size={14} />{offer.company}</Link>
          <span>·</span><span>{offer.location.city}, {offer.location.country}</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {application ? (
            <Link to="/pipeline" onClick={onClose} className="btn-secondary"><CheckCircle2 size={16} className="text-brand-500" />Dans le pipeline</Link>
          ) : (
            <button className="btn-primary" onClick={() => createApplication(offer.id)}><Plus size={16} />Ajouter au pipeline</button>
          )}
          <button className="btn-secondary" onClick={() => openAiPanel(offer.id)}><Bot size={16} />Candidature assistée IA</button>
          <a className="btn-secondary" href={offer.url} target="_blank" rel="noreferrer"><ExternalLink size={16} />Voir l'offre</a>
          <div className="ml-auto flex gap-1">
            <button onClick={() => react(offer.id, 1)} className={cx('icon-btn', offer.reaction === 1 && 'bg-brand-500/15 text-brand-600')} title="J'aime"><ThumbsUp size={17} /></button>
            <button onClick={() => react(offer.id, -1)} className={cx('icon-btn', offer.reaction === -1 && 'bg-rose-500/15 text-rose-600')} title="Pas pour moi"><ThumbsDown size={17} /></button>
            <button onClick={() => { archiveOffer(offer.id); onClose(); }} className="icon-btn" title="Archiver"><Archive size={17} /></button>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="card flex items-center gap-4 p-4">
            <ScoreRing value={offer.matchScore} size={64} />
            <div className="min-w-0">
              <p className="section-title">Score de match CV</p>
              <p className="text-xs muted">{matched.length} compétence(s) sur {matched.length + missing.length} couvertes, + secteur, durée, date et langue.</p>
            </div>
          </div>
          <div className="card flex items-center gap-4 p-4">
            <ScoreRing value={offer.interestScore} size={64} color="#6366f1" />
            <div>
              <p className="section-title">Score d'intérêt</p>
              <p className="text-xs muted">Appris de vos likes / dislikes sur des offres similaires (secteur, entreprise, compétences). Évolue avec le temps.</p>
            </div>
          </div>
        </section>

        <section>
          <p className="label">Compétences demandées</p>
          <div className="flex flex-wrap gap-1.5">
            {matched.map((id) => <Badge key={id} tone="brand"><CheckCircle2 size={11} />{skillLabel(id)}</Badge>)}
            {missing.map((id) => <Badge key={id} tone="amber"><CircleDashed size={11} />{skillLabel(id)}</Badge>)}
          </div>
          <ProgressBar className="mt-3" value={(matched.length / Math.max(1, matched.length + missing.length)) * 100} />
        </section>

        <section className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Info label="Durée"><span className={offer.durationMonths <= 5 && offer.durationMonths >= 4 ? 'text-brand-600 dark:text-brand-400' : ''}>{durationText(offer)}</span></Info>
          <Info label="Début">{offer.startLabel || formatDate(offer.startDate)}</Info>
          <Info label="Gratification">{offer.stipend ?? '—'}</Info>
          <Info label="Mode">{offer.remote ?? '—'}</Info>
          <Info label="Source">{SOURCES[offer.source]?.label ?? 'Ajout manuel'}</Info>
          <Info label="Publiée">{timeAgo(offer.postedAt)}</Info>
          <Info label="Expire le">{formatDate(offer.expiresAt)}</Info>
          <Info label="Langue">{offer.language === 'en' ? 'Anglais' : 'Français'}</Info>
          <Info label="Taille">{COMPANY_TYPES[offer.companyType]?.label}</Info>
        </section>

        <section>
          <p className="label">Trajet depuis {home.label}</p>
          <div className="mb-3 grid grid-cols-3 gap-2">
            <Info label="Distance">{formatKm(offer.distanceKm)}</Info>
            <Info label={offer.travel?.mode === 'flight' ? 'Avion (porte à porte)' : offer.travel?.mode === 'train' ? 'Train' : 'Transports'}>
              <span className="flex items-center gap-1"><TransitIcon size={14} />{formatDuration(offer.travel?.transit)}</span>
            </Info>
            <Info label="Voiture"><span className="flex items-center gap-1"><Car size={14} />{formatDuration(offer.travel?.car)}</span></Info>
          </div>
          <MiniMap home={home} dest={offer.location} />
          <div className="mt-2 flex gap-2">
            <a className="btn-secondary btn-sm" target="_blank" rel="noreferrer" href={directionsUrl(home, offer.location, 'transit')}><TrainFront size={13} />Itinéraire transports</a>
            <a className="btn-secondary btn-sm" target="_blank" rel="noreferrer" href={directionsUrl(home, offer.location, 'driving')}><Car size={13} />Itinéraire voiture</a>
          </div>
          <p className="mt-1 text-[11px] muted">Temps estimés (modèle simplifié) — l'itinéraire Google Maps donne le temps exact.</p>
        </section>

        <section>
          <p className="label">Description</p>
          <div className="whitespace-pre-line rounded-xl border border-slate-200 p-4 text-sm leading-relaxed text-ink-700 dark:border-ink-800 dark:text-ink-200">{offer.description}</div>
        </section>

        {co && (
          <section className="card flex items-center justify-between gap-3 p-4">
            <div>
              <p className="section-title">{co.name}</p>
              <p className="text-xs muted">{co.description}</p>
            </div>
            <button onClick={() => toggleFollowCompany(co.id)} className={followed ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}>
              <Star size={13} className={followed ? 'fill-current' : ''} />{followed ? 'Suivie' : 'Suivre'}
            </button>
          </section>
        )}
      </div>
    </Drawer>
  );
}
