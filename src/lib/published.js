// Données publiées par les routines Claude dans le dépôt (public/data/*.json, servies par GitHub Pages) :
// offres réelles collectées sur le web et dossiers de candidature rédigés par l'IA.

/** Champs que l'utilisateur modifie dans l'app : jamais écrasés par une nouvelle publication. */
const USER_FIELDS = ['status', 'reaction', 'closedNotified', 'manual'];

export async function fetchPublished(name) {
  const res = await fetch(`./data/${name}?t=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${name} : HTTP ${res.status}`);
  return res.json();
}

/**
 * Fusionne les offres publiées dans l'état local.
 * - offre inconnue (ni id ni empreinte) → ajoutée avec le statut « new » ;
 * - offre connue → champs de l'annonce mis à jour, champs utilisateur conservés ;
 * - offre close (closedAt) → expiresAt avancé, ce qui la fait passer en « Offre close » dans le pipeline.
 */
export function mergePublishedOffers(local, published) {
  const byFingerprint = new Map(Object.values(local).map((o) => [o.fingerprint, o]));
  const offers = { ...local };
  const added = [];
  const closed = [];
  for (const pub of published ?? []) {
    const known = local[pub.id] ?? byFingerprint.get(pub.fingerprint);
    const next = { ...pub, simulated: false, real: true };
    if (pub.closedAt && (!next.expiresAt || next.expiresAt > pub.closedAt)) next.expiresAt = pub.closedAt;
    if (!known) {
      if (pub.closedAt) continue; // déjà close avant d'avoir été vue : inutile de l'afficher
      offers[pub.id] = { ...next, status: 'new', reaction: 0 };
      added.push(offers[pub.id]);
      continue;
    }
    const keep = Object.fromEntries(USER_FIELDS.filter((k) => known[k] !== undefined).map((k) => [k, known[k]]));
    offers[known.id] = { ...known, ...next, id: known.id, ...keep };
    if (pub.closedAt && !known.closedAt) closed.push(offers[known.id]);
  }
  return { offers, added, closed };
}

/** Dossier IA d'une offre : par identifiant, sinon par empreinte (offre ajoutée à la main puis publiée). */
export function findDossier(dossiers, offer) {
  if (!dossiers || !offer) return null;
  return dossiers[offer.id] ?? Object.values(dossiers).find((d) => d.fingerprint && d.fingerprint === offer.fingerprint) ?? null;
}

/** En mode « offres réelles », les offres simulées restent visibles uniquement si elles sont suivies dans le pipeline. */
export function isOfferVisible(offer, mode, inPipeline = false) {
  if (mode === 'real' && offer.simulated) return inPipeline;
  if (mode === 'simulated' && offer.real) return inPipeline;
  return true;
}

/** Lien « nouvelle issue » pré-remplie : la routine Dossiers IA traite les issues titrées [Dossier]. */
export function dossierRequestUrl(repo, offer) {
  const payload = {
    offerId: offer.id,
    fingerprint: offer.fingerprint,
    title: offer.title,
    company: offer.company,
    city: offer.location?.city,
    country: offer.location?.country,
    url: offer.url,
    language: offer.language,
    durationMonths: offer.durationMonths ?? null,
    startDate: offer.startDate ?? null,
    description: (offer.description ?? offer.summary ?? '').slice(0, 1500), // l'URL doit rester < 8 Ko
  };
  const body = [
    'Demande de dossier de candidature (CV personnalisé, lettre, mots-clés, entretien) envoyée depuis StagePilot.',
    'La routine « Dossiers IA » la traitera à son prochain passage puis fermera cette issue.',
    '',
    '```json',
    JSON.stringify(payload, null, 2),
    '```',
  ].join('\n');
  const title = `[Dossier] ${offer.title} — ${offer.company}`;
  return `https://github.com/${repo}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
}
