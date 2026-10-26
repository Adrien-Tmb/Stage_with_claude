// Géographie : distances, estimation des temps de trajet et liens d'itinéraire.

export const HOME_DEFAULT = { label: 'La Garenne-Colombes (92250)', lat: 48.9067, lng: 2.2486 };

/** Distance orthodromique en km (formule de haversine). */
export function haversineKm(a, b) {
  if (!a || !b) return null;
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/**
 * Estimation des temps de trajet (minutes) — modèle simple, calibré sur l'Île-de-France :
 *  - voiture : détour routier ×1,3 ; vitesse moyenne croissante avec la distance (bouchons en petite couronne) ;
 *  - transports : marche + attente + vitesse commerciale RER/métro, puis TGV, puis avion.
 * Un lien Google Maps donne ensuite l'itinéraire exact.
 */
export function estimateTravel(km) {
  if (km == null) return null;
  const road = km * 1.3;
  let carSpeed = 22;
  if (road > 15) carSpeed = 32;
  if (road > 40) carSpeed = 55;
  if (road > 120) carSpeed = 85;
  const car = road > 1500 ? null : Math.round(8 + (road / carSpeed) * 60);

  let transit;
  let mode = 'transit';
  if (km < 60) {
    transit = Math.round(12 + ((km * 1.35) / 24) * 60); // RER / Transilien / métro
  } else if (km < 900) {
    mode = 'train';
    transit = Math.round(50 + (km / 190) * 60); // TGV / Eurostar + accès gare
  } else {
    mode = 'flight';
    transit = Math.round(150 + (km / 750) * 60); // avion + aéroports
  }
  return { car, transit, mode };
}

export function formatDuration(min) {
  if (min == null) return '—';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
}

export function formatKm(km) {
  if (km == null) return '—';
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km).toLocaleString('fr-FR')} km`;
}

export function directionsUrl(home, dest, mode = 'transit') {
  const params = new URLSearchParams({
    api: '1',
    origin: `${home.lat},${home.lng}`,
    destination: `${dest.lat},${dest.lng}`,
    travelmode: mode,
  });
  return `https://www.google.com/maps/dir/?${params}`;
}

/** Priorité "Espace International" : Europe anglophone > Europe (anglais de travail) > reste du monde anglophone. */
export const COUNTRY_TIERS = {
  'Royaume-Uni': 1, Irlande: 1,
  'Pays-Bas': 2, Danemark: 2, Suède: 2, Norvège: 2, Finlande: 2, Allemagne: 2, Belgique: 2,
  Luxembourg: 2, Suisse: 2, Autriche: 2, Espagne: 2, Portugal: 2, Lettonie: 2,
  Canada: 3, 'États-Unis': 3, Australie: 3, Singapour: 3,
};

export const TIER_LABELS = {
  1: 'Europe anglophone',
  2: 'Europe — anglais de travail',
  3: 'Monde anglophone',
};

/** Géocodage d'une adresse via Nominatim (OpenStreetMap). */
export async function geocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=fr&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Géocodage indisponible (${res.status})`);
  const [hit] = await res.json();
  if (!hit) throw new Error('Adresse introuvable');
  return { lat: +hit.lat, lng: +hit.lon, label: hit.display_name };
}
