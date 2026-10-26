// État initial de l'application : profil (issu du CV), paramètres et exemples de lettres.

import { HOME_DEFAULT } from '../lib/geo.js';

// Couleurs : palette catégorielle validée (contraste & daltonisme), attribuée dans un ordre fixe.
export const SECTORS = {
  urbanisme: { label: 'Urbanisme & aménagement', short: 'Urbanisme', color: '#2a78d6', dark: '#3987e5' },
  energie: { label: 'Énergie', short: 'Énergie', color: '#eb6834', dark: '#d95926' },
  audit: { label: 'Audit & conseil', short: 'Audit', color: '#1baf7a', dark: '#199e70' },
  mobilite: { label: 'Mobilité & infrastructures', short: 'Mobilité', color: '#eda100', dark: '#c98500' },
  batiment: { label: 'Bâtiment durable', short: 'Bâtiment', color: '#e87ba4', dark: '#d55181' },
  data: { label: 'Data & smart city', short: 'Data', color: '#008300', dark: '#008300' },
};

export const COLUMNS = [
  { id: 'todo', label: 'À postuler', color: '#64748b', hint: 'Offres retenues, candidature à préparer' },
  { id: 'sent', label: 'Candidature envoyée', color: '#0ea5e9', hint: 'Relance automatique à J+7' },
  { id: 'interview', label: 'Entretien', color: '#8b5cf6', hint: 'Date d’entretien → agenda' },
  { id: 'rejected', label: 'Refus', color: '#f43f5e', hint: 'Garder une trace pour les stats' },
  { id: 'closed', label: 'Offre close', color: '#a1a1aa', hint: 'Détection automatique des offres expirées' },
];

export const CV_TEXT = `Adrien TAMBOISE — Étudiant ingénieur généraliste, ESILV (4e année, 1re année de Master), spécialité Énergies et Villes Durables.
Recherche un stage de 4 à 5 mois à compter d'avril 2027 : infrastructure, urbanisme et aménagement du territoire, transition énergétique.

FORMATION
- ESILV (2023–2028), ingénieur généraliste, La Défense. A4 : Énergies et Villes Durables (Solar Energy, Wind Energy, Nuclear Energy, Energetic Efficiency, Decarbonization — in English).
  Projets : audit de performance énergétique de 10 bâtiments (décret tertiaire) ; conception technique d'un module photovoltaïque (calcul des pertes et ratio CTM) ; Hackathon IBM (Data & IA) ; Masterclass Smart Cities ; Rencontres de la Génération Durable avec Construction21 (atelier « Habiter à +4°C dans les villes », adaptation climatique urbaine) ; Fresque de la Rénovation énergétique.
- Riga Technical University (Lettonie), semestre A3 : Machine Learning, Operation Research, Database — in English.

EXPÉRIENCES
- 2026–2027 : Projet d'Innovation Industrielle ESILV / Curious Lab' — mission de consulting pour la Ville de Bourg-la-Reine : améliorer la trame noire et préserver la biodiversité ; analyse technique de l'éclairage public et étude de terrain sur l'acceptabilité sociale et le sentiment de sécurité.
- 2026 : Projet d'Innovation à Impact Positif — La Fabrique, plateforme web d'upcycling textile (Prix de l'Esprit Startup) ; analyse fonctionnelle et gestion de projet en équipe.
- 06–08/2025 : Stage ouvrier, Groupe Thales — maintenance industrielle aéronautique (GMAO), mise à jour des modes opératoires, technologies IoT (systèmes Spider), coordination avec les équipes terrain.
- 2024–2025 : PIE 2 — bâtiment parasismique avec DeVinci Quake ; coordination MOA-MOE.
- 2023–2024 : PIE 1 — hexapode mécanique (SolidWorks, impression 3D) ; planning de projet.

COMPÉTENCES
Logiciels : SolidWorks, C#, Python, UML. Méthodes : gestion de projet, analyse fonctionnelle, cahier des charges, Design Thinking.
Domaines : énergies renouvelables (solaire, éolien, nucléaire), efficacité énergétique, décarbonation.
Langues : français (maternelle), anglais professionnel B2+ (TOEFL ITP 593, Cambridge FCE), allemand intermédiaire.
Engagement : Devinci Durable (secrétaire 2026–2027), VinciRacingTeam (responsable évènementiel). Tennis, basketball. Semestre en Lettonie : ouverture interculturelle et adaptabilité.
Personnalité : déterminé, à l'écoute, rigoureux, ouvert d'esprit.`;

export const DEFAULT_PROFILE = {
  firstName: 'Adrien',
  lastName: 'Tamboise',
  email: '',
  phone: '',
  linkedin: 'linkedin.com/in/adrien-tamboise',
  school: 'ESILV — École Supérieure d’Ingénieurs Léonard de Vinci',
  program: 'Ingénieur généraliste — Majeure Énergies et Villes Durables',
  level: '4e année (M1)',
  headline: 'Élève-ingénieur Énergies & Villes Durables — stage 4 à 5 mois dès avril 2027',
  home: { ...HOME_DEFAULT },
  availability: { start: '2027-04-01', durationMin: 4, durationMax: 5 },
  cvText: CV_TEXT,
  languages: ['Français (natif)', 'Anglais B2+ (TOEFL 593)', 'Allemand (intermédiaire)'],
};

const LETTER_FR = `Madame, Monsieur,

Élève-ingénieur en 4e année à l'ESILV, au sein de la majeure Énergies et Villes Durables, je souhaite mettre mon sens de l'analyse et mon goût du terrain au service de projets qui rendent nos villes plus sobres et plus résilientes. C'est pourquoi votre offre de stage a retenu toute mon attention.

Lors de ma mission de conseil pour la Ville de Bourg-la-Reine, j'ai analysé l'éclairage public et mené une étude de terrain sur l'acceptabilité sociale d'une trame noire : une expérience qui m'a appris à concilier contraintes techniques, enjeux environnementaux et attentes des habitants. J'ai également réalisé l'audit de performance énergétique de dix bâtiments dans le cadre du décret tertiaire.

Rigoureux, à l'écoute et habitué au travail en équipe, je serais heureux de vous exposer plus en détail ma motivation lors d'un entretien.

Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.

Adrien Tamboise`;

const LETTER_EN = `Dear Hiring Manager,

I am a fourth-year engineering student at ESILV (Paris La Défense), majoring in Sustainable Energy and Cities, and I am looking for a 4 to 5-month internship starting in April 2027. Your opportunity strongly resonates with my ambition to contribute to the energy transition of cities.

During a consulting project for the City of Bourg-la-Reine, I assessed public lighting and carried out fieldwork on the social acceptability of a "dark corridor" policy for biodiversity. I also performed an energy performance audit of ten buildings and designed a photovoltaic module, analysing cell-to-module losses. My semester at Riga Technical University, taught in English, strengthened my adaptability in international teams.

I would welcome the opportunity to discuss how I could contribute to your team.

Yours sincerely,

Adrien Tamboise`;

export const DEFAULT_SETTINGS = {
  theme: 'dark',
  scraper: {
    enabled: true,
    times: ['10:00', '15:00'],
    catchUpOnOpen: true,
    sources: { careers: true, linkedin: true, indeed: true, hellowork: true, wttj: true, jobteaser: true, apec: false, euraxess: true },
    lastRunAt: null,
  },
  criteria: {
    spaces: { france: true, international: true },
    durations: [4, 5, 6],
    startFrom: '2027-03-01',
    startTo: '2027-05-15',
    maxDistanceKm: 1000,
    sectors: {
      urbanisme: { enabled: true, priority: 1 },
      energie: { enabled: true, priority: 2 },
      audit: { enabled: true, priority: 3 },
      mobilite: { enabled: true, priority: 3 },
      batiment: { enabled: true, priority: 3 },
      data: { enabled: true, priority: 3 },
    },
    companyTypes: { grand_groupe: true, eti: true, pme: true, startup: true, public: true, labo: true, ong: true },
    broaden: { neighbourRoles: true, labs: true, research: true },
    includeKeywords: [],
    excludeKeywords: ['alternance', 'apprentissage', 'CDI'],
  },
  sorting: {
    france: ['distance', 'duration', 'sector', 'companySize', 'match', 'interest'],
    international: ['region', 'duration', 'sector', 'match', 'companySize', 'interest'],
    companySizeOrder: 'desc',
  },
  notifications: {
    enabled: true,
    highMatchThreshold: 80,
    followUpDays: 7,
    interviewReminderHours: 24,
  },
  interest: { learningRate: 0.35, halfLifeDays: 30 },
  ai: {
    mode: 'simulated',
    apiKey: '',
    model: 'claude-opus-5-5',
    tone: 'professionnel',
    examples: [
      { id: 'ex_fr', title: 'Lettre type — FR (ville durable)', lang: 'fr', content: LETTER_FR },
      { id: 'ex_en', title: 'Cover letter — EN (energy & cities)', lang: 'en', content: LETTER_EN },
    ],
  },
};

export const EMPTY_INTEREST_MODEL = { features: {}, updatedAt: null };
