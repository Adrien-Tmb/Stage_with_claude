import { useEffect, useMemo, useState } from 'react';
import { Circle, CircleMarker, MapContainer, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { Car, ExternalLink, MapPinned, TrainFront, Plane } from 'lucide-react';
import { useAppStore } from '../store/useAppStore.js';
import { useEnrichedOffers } from '../hooks/useOffers.js';
import { useChartTheme } from '../hooks/useChartTheme.js';
import { SECTORS } from '../data/defaults.js';
import { directionsUrl, formatDuration, formatKm } from '../lib/geo.js';
import { durationText } from '../lib/utils.js';
import { Card, Chip, PageHeader, Tabs } from '../components/ui/index.jsx';
import { useOpenOffer } from '../components/offers/OfferCard.jsx';

const VIEWS = {
  idf: { center: [48.87, 2.3], zoom: 10 },
  france: { center: [46.6, 2.4], zoom: 6 },
  europe: { center: [52, 6], zoom: 4 },
  world: { center: [35, 0], zoom: 2 },
};

function Fly({ view }) {
  const map = useMap();
  useEffect(() => { map.flyTo(VIEWS[view].center, VIEWS[view].zoom, { duration: 0.8 }); }, [map, view]);
  return null;
}

export default function MapPage() {
  const { offers } = useEnrichedOffers();
  const home = useAppStore((s) => s.profile.home);
  const theme = useChartTheme();
  const open = useOpenOffer();
  const [view, setView] = useState('idf');
  const [sectors, setSectors] = useState([]);
  const [minMatch, setMinMatch] = useState(0);

  const visible = useMemo(() => offers.filter((o) => !o.expired && o.status !== 'archived' && o.reaction !== -1
    && (!sectors.length || sectors.includes(o.sector)) && o.matchScore >= minMatch), [offers, sectors, minMatch]);
  const nearest = useMemo(() => [...visible].sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 12), [visible]);
  const color = (o) => (theme.dark ? SECTORS[o.sector]?.dark : SECTORS[o.sector]?.color) ?? '#94a3b8';

  return (
    <div>
      <PageHeader icon={MapPinned} title="Carte & trajets" subtitle={`Offres géolocalisées autour de ${home.label} — taille du point = score de match`}
        actions={<Tabs value={view} onChange={setView} tabs={[{ id: 'idf', label: 'Île-de-France' }, { id: 'france', label: 'France' }, { id: 'europe', label: 'Europe' }, { id: 'world', label: 'Monde' }]} />} />

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-ink-800">
            {Object.entries(SECTORS).map(([k, s]) => (
              <Chip key={k} active={sectors.includes(k)} onClick={() => setSectors((v) => (v.includes(k) ? v.filter((x) => x !== k) : [...v, k]))}>
                <span className="h-2 w-2 rounded-full" style={{ background: theme.dark ? s.dark : s.color }} />{s.short}
              </Chip>
            ))}
            <label className="ml-auto flex items-center gap-2 text-xs muted">
              Match ≥ {minMatch} %
              <input type="range" min="0" max="90" step="5" value={minMatch} onChange={(e) => setMinMatch(+e.target.value)} className="accent-brand-500" />
            </label>
          </div>
          <div className="h-[68vh]">
            <MapContainer center={VIEWS.idf.center} zoom={VIEWS.idf.zoom} style={{ height: '100%', width: '100%' }} worldCopyJump>
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Fly view={view} />
              {[5, 15, 30].map((km) => (
                <Circle key={km} center={[home.lat, home.lng]} radius={km * 1000} pathOptions={{ color: theme.axis, weight: 1, dashArray: '4 6', fill: false, opacity: 0.6 }}>
                  <Tooltip direction="top" sticky>{km} km</Tooltip>
                </Circle>
              ))}
              <CircleMarker center={[home.lat, home.lng]} radius={9} pathOptions={{ color: '#fff', weight: 3, fillColor: '#6366f1', fillOpacity: 1 }}>
                <Tooltip permanent direction="right" offset={[10, 0]}>Domicile</Tooltip>
              </CircleMarker>
              {visible.map((o) => (
                <CircleMarker key={o.id} center={[o.location.lat + ((o.id.charCodeAt(5) % 7) - 3) * 0.0015, o.location.lng + ((o.id.charCodeAt(6) % 7) - 3) * 0.0015]}
                  radius={4 + o.matchScore / 14} pathOptions={{ color: theme.surface, weight: 2, fillColor: color(o), fillOpacity: 0.9 }}>
                  <Popup>
                    <div className="w-60 space-y-1.5">
                      <p className="text-sm font-semibold leading-snug">{o.title}</p>
                      <p className="text-xs opacity-70">{o.company} · {o.location.city}</p>
                      <p className="text-xs">Match <b>{o.matchScore} %</b> · {durationText(o)} · {formatKm(o.distanceKm)}</p>
                      <div className="flex gap-3 text-xs">
                        <span className="flex items-center gap-1">{o.travel?.mode === 'flight' ? <Plane size={12} /> : <TrainFront size={12} />}{formatDuration(o.travel?.transit)}</span>
                        {o.travel?.car && <span className="flex items-center gap-1"><Car size={12} />{formatDuration(o.travel.car)}</span>}
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <button className="rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white" onClick={() => open(o.id)}>Détails</button>
                        <a className="rounded-md bg-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-800" href={directionsUrl(home, o.location, 'transit')} target="_blank" rel="noreferrer">Itinéraire TC</a>
                        <a className="rounded-md bg-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-800" href={directionsUrl(home, o.location, 'driving')} target="_blank" rel="noreferrer">Voiture</a>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        </Card>

        <Card className="flex max-h-[76vh] flex-col">
          <div className="border-b border-slate-200 px-4 py-3 dark:border-ink-800">
            <p className="section-title">Les plus proches</p>
            <p className="text-xs muted">{visible.length} offres sur la carte</p>
          </div>
          <div className="flex-1 divide-y divide-slate-100 overflow-y-auto dark:divide-ink-800">
            {nearest.map((o) => (
              <button key={o.id} onClick={() => open(o.id)} className="block w-full px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-ink-800/50">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color(o) }} />
                  <p className="truncate text-sm font-medium text-ink-900 dark:text-white">{o.company}</p>
                  <span className="ml-auto shrink-0 text-xs font-semibold text-ink-700 dark:text-ink-200">{formatKm(o.distanceKm)}</span>
                </div>
                <p className="mt-0.5 truncate text-xs muted">{o.title}</p>
                <div className="mt-1 flex gap-3 text-[11px] muted">
                  <span className="flex items-center gap-1"><TrainFront size={11} />{formatDuration(o.travel?.transit)}</span>
                  {o.travel?.car && <span className="flex items-center gap-1"><Car size={11} />{formatDuration(o.travel.car)}</span>}
                  <span>Match {o.matchScore} %</span>
                  <a href={directionsUrl(home, o.location, 'transit')} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="ml-auto text-brand-600 dark:text-brand-400"><ExternalLink size={11} /></a>
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
