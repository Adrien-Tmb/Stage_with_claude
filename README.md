# StagePilot — tableau de bord de recherche de stage

Application web (React + Tailwind) pour **centraliser, automatiser et optimiser** une recherche de stage
d'élève-ingénieur ESILV (majeure *Énergies et Villes Durables*) — stage de 4 à 5 mois dès avril 2027,
domicile à La Garenne-Colombes (92250).

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # tests du moteur (collecte, dédoublonnage, scores, tri, planning, IA)
npm run build    # build statique dans dist/ (déployable tel quel, ex. GitHub Pages)
```

Toutes les données sont **persistées dans le LocalStorage** du navigateur (clé `stagepilot-v1`) ;
export / import JSON dans *Paramètres › Apparence & données*.

---

## 1. Fonctionnalités

| Module | Ce qui est implémenté |
|---|---|
| **Interface** | Menu latéral, mode sombre / clair / système, responsive (mobile → grand écran), barre de recherche globale, notifications (cloche + toasts). |
| **Espace France** | Offres triées par défaut de la plus proche à la plus éloignée du domicile ; distance + temps de trajet (transports / voiture) sur chaque carte. |
| **Espace International** | Entreprises et pays anglophones, priorité *Europe anglophone (UK, IE) › Europe anglais de travail › reste du monde*. |
| **Moteur de collecte simulé** | Passes planifiées 2×/jour (10 h, 15 h, horaires modifiables) avec rattrapage à l'ouverture ; 8 sources activables (sites carrières, LinkedIn, Indeed, HelloWork, Welcome to the Jungle, JobTeaser, APEC, Euraxess/labos) ; élargissement postes voisins / labos / recherche ; **dédoublonnage** par empreinte entreprise + intitulé + ville ; journal des passes. |
| **Smart Feed** | Filtres (secteur, durée, type de structure, nature du poste, source, match min., distance max., zone…) et **ordre de priorité du tri personnalisable** (glisser-déposer) : durée, taille d'entreprise (↑/↓), distance, secteur, match, intérêt, zone, fraîcheur. |
| **Scores** | *Score de match* CV ↔ offre (compétences, secteur, durée, date, langue) ; *score d'intérêt* appris en ligne à partir des 👍/👎, avec oubli progressif (demi-vie réglable). |
| **Pipeline Kanban** | À postuler · Candidature envoyée · Entretien · Refus · Offre close (offres expirées déplacées automatiquement). Fiche : dates, URL, contact (lié au CRM), notes, historique, documents générés. |
| **Assistant IA** | Lettre de motivation / e-mail (FR ou EN selon l'offre, à partir de vos exemples), adaptation du CV, analyse des mots-clés, préparation d'entretien. Mode **simulé** hors-ligne ou **Claude** (API Anthropic, clé personnelle). |
| **Carte + trajets** | Carte Leaflet / OpenStreetMap, cercles 5-15-30 km, temps de trajet estimés et liens d'itinéraire Google Maps (transports / voiture). |
| **Agenda & relances** | Calendrier mensuel ; entretiens synchronisés depuis le pipeline ; relance automatique à J+7 (paramétrable) ; e-mail de relance pré-rédigé ; export **.ics** et « Ajouter à Google Agenda ». |
| **Réseau / contacts** | Mini-CRM : opérationnels, RH, alumni ESILV ; statut, prochaine action, journal des échanges, recherche d'alumni LinkedIn. |
| **Fiches entreprises** | Offres regroupées par entreprise (vision globale d'un grand groupe), candidatures et contacts associés, suivi d'entreprise (bonus d'intérêt). |
| **Dashboard** | KPI, activité hebdomadaire, entonnoir de candidature, taux de réponse / d'entretien, secteurs les plus porteurs, sources, meilleures opportunités, échéances. |

> **À propos de la simulation** — les offres sont générées par un scraper *simulé* (corpus réaliste et
> déterministe d'entreprises réelles du secteur). Leur lien « Voir l'offre » ouvre une **vraie recherche
> pré-remplie** sur la plateforme source (ou le site de l'entreprise). Les vraies annonces repérées
> ailleurs s'ajoutent via **« Ajouter une offre »** : elles sont scorées et dédoublonnées comme les autres.
> Les données de démonstration (candidatures, contacts) se suppriment en un clic.

---

## 2. Arborescence des composants

```
src/
├── main.jsx                      Point d'entrée React
├── App.jsx                       Routeur (HashRouter), thème, horloge du moteur (bootstrap + tick/min)
├── index.css                     Tailwind + classes de composants (.card, .btn, .input, .chip…)
│
├── store/
│   ├── useAppStore.js            ⭐ État global Zustand + persistance LocalStorage + toutes les actions
│   └── demo.js                   Données de démonstration (marquées demo: true)
│
├── hooks/
│   ├── useOffers.js              Offres enrichies (distance, trajets, scores) mémoïsées, horloge
│   └── useChartTheme.js          Couleurs des graphiques par thème
│
├── lib/                          Logique métier pure (testée dans tests/)
│   ├── scraper.js                Passe de collecte : sources, critères, dédoublonnage
│   ├── offerFactory.js           Corpus simulé : entreprises × modèles de postes × lieux
│   ├── scheduler.js              Créneaux 10 h / 15 h, rattrapage, prochaine passe
│   ├── scoring.js                Score de match, score d'intérêt (apprentissage), tri multicritère
│   ├── ai.js                     Générateurs IA simulés + appel Claude (SDK Anthropic, streaming)
│   ├── appEvents.js              Relances J+N et entretiens générés depuis une candidature
│   ├── calendar.js               Export .ics, liens Google Agenda
│   ├── geo.js                    Haversine, temps de trajet, géocodage Nominatim, zones
│   ├── stats.js                  Indicateurs du tableau de bord
│   └── utils.js                  Dates, normalisation, empreintes, PRNG, setIn/deepMerge
│
├── data/
│   ├── defaults.js               Profil (issu du CV), paramètres par défaut, secteurs, colonnes Kanban
│   ├── companies.js              ~80 entreprises (France + international) : type, secteurs, sites
│   ├── roleTemplates.js          Modèles de postes FR/EN (cœur de cible, voisins, recherche)
│   ├── skills.js                 Dictionnaire de compétences FR/EN (matching & mots-clés)
│   ├── sources.js                Plateformes et URL de recherche
│   └── places.js                 Coordonnées des villes
│
├── components/
│   ├── layout/   Layout · Sidebar · Topbar (recherche, statut du scraper, thème, notifications) · Toasts
│   ├── ui/       Card · Badge · SectorBadge · Toggle · Chip · ScoreRing · ProgressBar · Modal · Drawer · Tabs…
│   ├── offers/   OfferCard · OfferDetailDrawer · SortPriorityEditor · AddOfferModal · MiniMap
│   ├── pipeline/ ApplicationModal
│   └── ai/       AIPanel (Lettre · CV · Mots-clés · Entretien)
│
└── pages/
    ├── Dashboard.jsx     Tableau de bord
    ├── Feed.jsx          Smart Feed (space="france" | "international")
    ├── Pipeline.jsx      Kanban
    ├── MapPage.jsx       Carte & trajets
    ├── CalendarPage.jsx  Agenda & relances
    ├── Contacts.jsx      Mini-CRM
    ├── Companies.jsx     Fiches entreprises
    └── Settings.jsx      Paramètres (7 sections)
```

**Interactions clés** : un seul store ; les pages lisent des *sélecteurs* et appellent des *actions*.
Le tiroir de détail d'offre est global (paramètre d'URL `?offer=<id>`), donc ouvrable depuis le
dashboard, la carte, les fiches entreprises ou une notification. Le panneau IA est global
(`aiPanel` dans le store). Déplacer une carte vers « Candidature envoyée » crée la relance J+7
dans l'agenda ; saisir une date d'entretien crée l'événement et la relance post-entretien ;
l'horloge (`tick`, chaque minute) déclenche les collectes planifiées, ferme les offres expirées
et émet les rappels.

---

## 3. Structure de données (état global persisté)

```jsonc
{
  "profile": {
    "firstName": "Adrien", "lastName": "Tamboise", "email": "", "phone": "",
    "school": "ESILV…", "program": "…Énergies et Villes Durables", "level": "4e année (M1)",
    "home": { "label": "La Garenne-Colombes (92250)", "lat": 48.9067, "lng": 2.2486 },
    "availability": { "start": "2027-04-01", "durationMin": 4, "durationMax": 5 },
    "cvText": "…texte du CV, analysé pour le matching…"
  },
  "settings": {
    "theme": "dark | light | system",
    "scraper": { "enabled": true, "times": ["10:00", "15:00"], "catchUpOnOpen": true,
                 "sources": { "careers": true, "linkedin": true, "indeed": true, "hellowork": true,
                              "wttj": true, "jobteaser": true, "apec": false, "euraxess": true },
                 "lastRunAt": "ISO" },
    "criteria": { "spaces": { "france": true, "international": true }, "durations": [4, 5, 6],
                  "startFrom": "2027-03-01", "startTo": "2027-05-15", "maxDistanceKm": 1000,
                  "sectors": { "urbanisme": { "enabled": true, "priority": 1 }, "energie": { "…": 2 }, "audit": { "…": 3 } },
                  "companyTypes": { "grand_groupe": true, "eti": true, "pme": true, "startup": true, "public": true, "labo": true, "ong": true },
                  "broaden": { "neighbourRoles": true, "labs": true, "research": true },
                  "includeKeywords": [], "excludeKeywords": ["alternance", "CDI"] },
    "sorting": { "france": ["distance", "duration", "sector", "companySize", "match", "interest"],
                 "international": ["region", "duration", "sector", "match", "companySize", "interest"],
                 "companySizeOrder": "desc" },
    "notifications": { "enabled": true, "highMatchThreshold": 80, "followUpDays": 7, "interviewReminderHours": 24 },
    "interest": { "learningRate": 0.35, "halfLifeDays": 30 },
    "ai": { "mode": "simulated | claude", "apiKey": "", "model": "claude-opus-5-5", "tone": "professionnel",
            "examples": [{ "id": "ex_fr", "title": "…", "lang": "fr", "content": "…" }] }
  },
  "offers": {
    "off_xxx": {
      "id": "off_xxx", "fingerprint": "egis|charge e d etudes urbanisme…|guyancourt",
      "title": "…", "company": "Egis", "companyId": "egis", "companyType": "grand_groupe",
      "location": { "city": "Guyancourt", "country": "France", "lat": 48.77, "lng": 2.07 },
      "space": "france | international", "sector": "urbanisme", "kind": "core | neighbour | research",
      "language": "fr | en", "durationMonths": 5, "startDate": "2027-04-01",
      "summary": "…", "description": "…", "requirements": ["urbanisme", "sig", "…"],
      "url": "https://…", "source": "linkedin", "stipend": "…", "remote": "hybride",
      "postedAt": "ISO", "expiresAt": "ISO", "scrapedAt": "ISO",
      "status": "new | seen | archived", "reaction": 1, "simulated": true
    }
  },
  "applications": {
    "app_xxx": {
      "id": "app_xxx", "offerId": "off_xxx", "column": "todo | sent | interview | rejected | closed",
      "appliedAt": "ISO", "respondedAt": "ISO", "followUpAt": "ISO|null", "interviewAt": "ISO|null",
      "interviewPlace": "", "url": "", "contactId": "ct_xxx", "contactName": "", "contactEmail": "",
      "notes": "", "history": [{ "at": "ISO", "column": "sent", "auto": false }],
      "documents": { "letter": { "content": "…", "at": "ISO" } }
    }
  },
  "contacts": {
    "ct_xxx": { "id": "ct_xxx", "name": "", "role": "", "type": "operationnel | rh | alumni | autre",
                "company": "", "companyId": "", "email": "", "phone": "", "linkedin": "",
                "status": "à contacter | contacté | en discussion | relancer | clos",
                "lastContactAt": "ISO", "nextActionAt": "ISO", "notes": "",
                "interactions": [{ "id": "", "at": "ISO", "channel": "LinkedIn", "summary": "" }] }
  },
  "events": {
    "ev_fu_app_xxx": { "id": "…", "type": "interview | followup | custom", "auto": true,
                       "applicationId": "app_xxx", "title": "", "date": "ISO", "durationMin": 60,
                       "location": "", "notes": "", "done": false, "notified": false }
  },
  "interestModel": { "features": { "sector:urbanisme": { "w": 0.7, "at": "ISO" }, "company:egis": { "…" } }, "updatedAt": "ISO" },
  "followedCompanies": { "egis": "ISO" },
  "notifications": [{ "id": "", "type": "match | followup | interview | expired | info", "title": "", "body": "", "at": "ISO", "read": false, "link": "/france?offer=off_xxx" }],
  "scrapeLog": [{ "id": "", "at": "ISO", "trigger": "planifiée | manuelle | rattrapage", "added": 5, "duplicates": 31, "filtered": 12, "scanned": 60, "bySource": {} }],
  "meta": { "createdAt": "ISO", "initialized": true, "hasDemo": true }
}
```

---

## 4. Algorithmes

- **Dédoublonnage** : empreinte `entreprise | intitulé normalisé (sans « stage », « intern », « H/F ») | ville`.
  Une même annonce vue sur LinkedIn puis Indeed n'est ajoutée qu'une fois (vaut aussi pour l'ajout manuel).
- **Score de match (0–100)** = 45 × couverture des compétences requises par le CV
  + secteur (P1 : 20, P2 : 16, P3 : 10) + durée (4–5 mois : 15, 6 mois : 8) + date de début (≤ 3 sem. : 10) + langue.
- **Score d'intérêt (0–100)** : chaque like/dislike ajoute ±*taux d'apprentissage* aux caractéristiques de l'offre
  (secteur, entreprise, type, nature, pays, compétences) ; les poids décroissent avec une demi-vie réglable ;
  score = 50 + 45·tanh(signal/3), ajusté par la réaction directe, le suivi de l'entreprise et l'ancienneté.
- **Tri multicritère** : comparaison lexicographique selon l'ordre de priorité choisi ; les critères continus
  (distance, scores) sont regroupés par paliers pour que les critères suivants puissent départager.
- **Temps de trajet** : estimation (détour routier ×1,3 et vitesses moyennes IDF ; RER/métro, puis train, puis avion),
  complétée par les liens d'itinéraire Google Maps exacts.

## 5. Mode Claude (optionnel)

*Paramètres › Assistant IA › Claude* : saisissez une clé API Anthropic (stockée uniquement dans le
navigateur, jamais exportée). Les générations utilisent le SDK officiel `@anthropic-ai/sdk` en streaming
(modèle par défaut `claude-opus-5-5`, repli automatique côté serveur en cas de refus). La clé étant
utilisée côté navigateur, réservez cet usage à un poste personnel.
