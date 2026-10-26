import { useEffect } from 'react';
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) map.fitBounds(points, { padding: [30, 30], maxZoom: 13 });
    else if (points.length === 1) map.setView(points[0], 12);
  }, [map, points]);
  return null;
}

/** Petite carte domicile → lieu de l'offre. */
export default function MiniMap({ home, dest, height = 200 }) {
  const points = [[home.lat, home.lng], [dest.lat, dest.lng]];
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-ink-800" style={{ height }}>
      <MapContainer center={points[1]} zoom={11} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }} attributionControl={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Polyline positions={points} pathOptions={{ color: '#10b981', weight: 2, dashArray: '6 6' }} />
        <CircleMarker center={points[0]} radius={7} pathOptions={{ color: '#fff', weight: 2, fillColor: '#6366f1', fillOpacity: 1 }}>
          <Tooltip direction="top">Domicile</Tooltip>
        </CircleMarker>
        <CircleMarker center={points[1]} radius={8} pathOptions={{ color: '#fff', weight: 2, fillColor: '#10b981', fillOpacity: 1 }}>
          <Tooltip direction="top">{dest.city}</Tooltip>
        </CircleMarker>
        <FitBounds points={points} />
      </MapContainer>
    </div>
  );
}
