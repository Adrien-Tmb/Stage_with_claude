# Routine « Collecte des offres de stage »

Tu es la routine planifiée de StagePilot (2×/jour, vers 10 h et 15 h, heure de Paris). Ta mission : trouver
**de vraies offres de stage actuellement en ligne** correspondant à `routines/criteres.json`, les ajouter
sans doublon à `public/data/offers.json`, signaler celles qui ont été retirées, puis publier sur `main`
(GitHub Pages redéploie le site et l'application charge les nouvelles offres toute seule).

Règle d'or : **ne jamais inventer**. Une offre n'est ajoutée que si tu as trouvé son annonce (titre,
entreprise, ville, lien). Un champ que l'annonce ne précise pas reste `null` (durée, date, gratification…).

## 1. Préparer

```bash
npm ci --no-audit --no-fund        # si node_modules est absent
node scripts/routines/list-offers.mjs   # offres déjà publiées : ne pas les re-chercher
cat routines/criteres.json
```

## 2. Chercher (25 à 40 recherches, envoyées par lots en parallèle)

Utilise **WebSearch** (mode `standard`, `extended` pour les requêtes difficiles) pour trouver les annonces,
puis lis l'annonce elle-même avec **curl** (WebFetch ne passe pas par le proxy réseau de l'environnement et
échoue en `ENOTFOUND`) :

```bash
curl -sL -m 20 -o /tmp/page.html "<url de l'annonce>" && node scripts/routines/page-text.mjs /tmp/page.html
```

Si la page est lisible (`blocked: false`), complète les champs à partir du texte réel (dates, durée,
gratification, date de publication) et mets `"verified": true`.
**Respecte les refus des sites** : un code 401/403, une page « Security checkup », « Authenticating… » ou un
captcha signifie que le site refuse les robots. N'essaie pas de les contourner (pas de faux navigateur,
pas d'en-têtes trompeurs, pas d'API non publique) : garde les informations des résultats de recherche et
laisse `verified` à `false`.

État constaté le 26/10/2026 : lisibles — jobs.makesense.org, www.wizbii.com, www.hellowork.com,
jobs.smartrecruiters.com ; refusent les robots — LinkedIn (pages d'offres), Indeed, Welcome to the Jungle,
JobTeaser, APEC, Le Moniteur, Gradcracker, edf.fr. Seuls les domaines autorisés dans les réglages réseau de
l'environnement sont joignables.

Varie les angles à chaque passage (ne refais pas toujours les mêmes requêtes) :
- **Job boards** : `site:` + mots-clés, par ex. `stage 2027 urbanisme site:welcometothejungle.com`,
  `site:hellowork.com stage aménagement 2027`, `site:fr.indeed.com/viewjob stage énergie 2027`,
  `site:linkedin.com/jobs/view stage transition énergétique 2027`, `site:jobs.makesense.org stage 2027`,
  `site:lemoniteur.fr stage 2027`, `site:jobteaser.com stage 2027 énergie`, `site:apec.fr stage 2027`.
- **Entreprises cibles d'Adrien** (`criteres.json` → `entreprises_cibles`, 3 groupes classés du plus au moins
  intéressant) — **priorité absolue** :
  - groupe 1 (Setec, Carbone 4, Capgemini, EDF, TotalEnergies) : **toutes à chaque passage** ;
  - groupe 2 : au moins 5 entreprises par passage, en rotation ;
  - groupe 3 : au moins 3 entreprises par passage, en rotation.
  Pour la rotation, regarde les `note` des passages précédents (`public/data/offers.json` → `runs`) et
  **cite dans ta `note` les entreprises cibles vérifiées**. Cherche leur site carrières, LinkedIn et WTTJ
  (`"<Entreprise>" stage 2027`, puis avec un secteur : énergie, urbanisme, ville durable, bâtiment…).
- **Autres sites carrières** (`sources.sites_carrieres`) : 4 à 6 entreprises différentes par passage, en tournant.
- **Secteur public** : collectivités, aménageurs, agences d'urbanisme (Emploi-territorial, Place de l'emploi public).
- **International — au moins 10 recherches par passage** (l'Espace International de l'app en dépend) :
  - Irlande et Pays-Bas d'abord (anglais, UE : pas de visa), puis Belgique, Luxembourg, pays nordiques,
    Allemagne ; Royaume-Uni et Suisse aussi, en notant dans `notes` qu'un visa / permis est nécessaire
    (Royaume-Uni : visa « Government Authorised Exchange » parrainé ; Suisse : permis de stage).
  - Sources qui marchent bien : climate.jobs, climatechangejobs.com, Moovijob (Luxembourg / Belgique),
    gradireland.com, magnet.me (Pays-Bas), iagora.com, Euraxess, Eurocities, sites carrières (Arup, Mott
    MacDonald, Ramboll, Sweco, COWI, AECOM, Guidehouse, Ørsted, Vattenfall, Statkraft, Fortum, ESB…).
  - Requêtes en anglais : `internship 2027 energy transition Dublin`, `"intern" sustainability Utrecht 2027`,
    `stage 2027 Luxembourg énergie`, `internship spring 2027 urban planning Netherlands`…
  - Écarte les « summer internships » de 6 à 12 semaines et les placements de 12 mois (hors critères),
    sauf si une durée de 4–6 mois est possible.
  - `location.country` en français, comme dans l'app : Royaume-Uni, Irlande, Pays-Bas, Belgique, Luxembourg,
    Allemagne, Danemark, Suède, Norvège, Finlande, Suisse, Espagne… ; ajoute `lat`/`lng` pour une ville
    hors référentiel.
- **Élargissement** : postes voisins (data énergie, rénovation, bureau d'études), laboratoires (CEA,
  CSTB, Efficacity, ADEME…) et stages de recherche.

Garde une offre si : c'est un **stage** (pas d'alternance / CDI / VIE), le début est compatible avec
`fenetre_debut` ou non précisé pour une annonce récente (publiée il y a moins de ~45 jours) ciblant 2027,
la durée est dans `duree_mois_acceptee` ou non précisée, et le sujet relève d'un secteur listé.
Les PFE de 6 mois sont acceptés (signale-le dans `level`). Ignore les annonces dont la date limite est passée.

## 3. Vérifier les offres déjà publiées

Pour les offres de `list-offers` publiées il y a plus de 10 jours (ou dont `expiresAt` est passé) :
recherche l'annonce (titre + entreprise). Si elle est retirée, pourvue, ou si sa date limite est
dépassée, ajoute-la à `closed`. Dans le doute, laisse-la ouverte.

## 4. Écrire le fichier de collecte puis fusionner

Écris un fichier temporaire (hors du dépôt, par ex. dans le scratchpad) :

```jsonc
{
  "queries": 32,                       // nombre de recherches effectuées
  "note": "Résumé court du passage",   // affiché dans le journal
  "offers": [{
    "title": "Stage – Chargé(e) d'études urbanisme durable",   // intitulé exact de l'annonce
    "company": "Egis",
    "companyType": "grand_groupe",     // grand_groupe | eti | pme | startup | public | labo | ong
    "sector": "urbanisme",             // urbanisme | energie | audit | mobilite | batiment | data
    "kind": "core",                    // core | neighbour (poste voisin) | research
    "location": { "city": "Montreuil", "country": "France" },  // ajoute lat/lng si la ville est peu connue
    "durationMonths": [4, 6],          // nombre, [min, max] ou null
    "durationLabel": "4 à 6 mois",     // texte de l'annonce (optionnel)
    "startDate": "2027-04",            // AAAA-MM(-JJ) ou null
    "startLabel": "avril 2027",        // optionnel
    "level": "M1",                     // M1 | PFE | césure | null
    "language": "fr",                  // fr | en (langue de l'annonce)
    "summary": "2 phrases factuelles sur les missions.",
    "description": "Missions, profil, informations pratiques (reformulés depuis l'annonce, ≤ 1 500 caractères).",
    "skills": ["SIG", "bilan carbone"],// compétences citées dans l'annonce
    "stipend": "1 300 € brut / mois",  // ou null
    "url": "https://… lien direct vers l'annonce (à défaut, la page de liste où elle figure)",
    "source": "linkedin",              // careers | linkedin | indeed | hellowork | wttj | jobteaser | apec | euraxess | other
    "sourceLabel": "Makesense",        // obligatoire si source = other
    "postedAt": "2026-10-20",          // date de publication si connue
    "deadline": "2026-12-15",          // date limite de candidature si connue
    "verified": false,
    "notes": "Point d'attention éventuel (ex. réservé PFE)"
  }],
  "closed": [{ "id": "off_r…", "reason": "annonce retirée" }]
}
```

```bash
node scripts/routines/merge-offers.mjs /chemin/collecte.json --dry-run   # contrôle
node scripts/routines/merge-offers.mjs /chemin/collecte.json
```

Corrige puis relance si le bilan contient des `rejected` (ville sans coordonnées → ajoute `lat`/`lng`).
Le script dédoublonne (entreprise + intitulé + ville) : une offre déjà publiée n'est jamais ajoutée deux fois.

## 5. Publier

```bash
npm test
git add public/data/offers.json
git commit -m "Collecte du <date> : <n> nouvelles offres, <m> closes"
git push origin HEAD:main
```

L'utilisateur a autorisé cette routine à pousser directement sur `main` (le site GitHub Pages se met à
jour en ~1 minute). Si le push est refusé parce que `main` a avancé : `git pull --rebase origin main`
puis repousse. Ne modifie aucun autre fichier que `public/data/offers.json`.

S'il n'y a aucune nouvelle offre et aucune offre close, ne crée pas de commit.

## 6. Compte rendu

Termine par un résumé de 5 lignes maximum : nombre de recherches, offres ajoutées (titre — entreprise),
offres closes, et les 3 offres les plus intéressantes pour le profil.
