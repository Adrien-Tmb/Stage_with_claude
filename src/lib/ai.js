// Module d'assistance IA.
// Mode "simulé" : générateurs déterministes nourris par le CV, l'offre et les exemples fournis.
// Mode "Claude" : appel réel à l'API Anthropic (clé saisie dans les paramètres, stockée localement).

import { SKILL_BY_ID, SKILL_CATEGORIES } from '../data/skills.js';
import { SECTORS } from '../data/defaults.js';
import { computeMatch, offerSkills, profileSkills, skillLabel } from './scoring.js';
import { normalize, shortTitle } from './utils.js';

// ---------------------------------------------------------------------------
// Banque d'expériences issues du CV — taguées pour être choisies selon l'offre
// ---------------------------------------------------------------------------
const EXPERIENCES = [
  {
    id: 'bourg', tags: ['urbanisme', 'biodiversite', 'concertation', 'efficacite', 'adaptation', 'decarbonation', 'sig', 'amenagement'],
    fr: "lors de ma mission de conseil pour la Ville de Bourg-la-Reine (Projet d'Innovation Industrielle ESILV / Curious Lab'), j'ai analysé l'éclairage public et mené une étude de terrain sur l'acceptabilité sociale et le sentiment de sécurité afin d'améliorer la trame noire et de préserver la biodiversité",
    en: "during a consulting project for the City of Bourg-la-Reine, I assessed the public lighting network and conducted fieldwork on social acceptability and perceived safety to design a dark corridor protecting biodiversity",
    cv: "Mission de conseil — Ville de Bourg-la-Reine (trame noire, éclairage public, étude de terrain)",
  },
  {
    id: 'audit10', tags: ['efficacite', 'audit-energie', 'decret-tertiaire', 'renovation', 'excel', 'modelisation', 'decarbonation', 'redaction'],
    fr: "j'ai réalisé l'audit de performance énergétique de dix bâtiments dans le cadre du décret tertiaire, de la collecte des consommations jusqu'aux recommandations de travaux",
    en: 'I carried out an energy performance audit of ten buildings under the French tertiary decree, from consumption data collection to retrofit recommendations',
    cv: 'Audit de performance énergétique de 10 bâtiments (décret tertiaire)',
  },
  {
    id: 'pv', tags: ['pv', 'enr', 'modelisation', 'data', 'rigueur', 'pvsyst'],
    fr: "j'ai conçu techniquement un module photovoltaïque en calculant ses pertes et son ratio CTM (cell-to-module)",
    en: 'I designed a photovoltaic module, quantifying its losses and cell-to-module (CTM) ratio',
    cv: 'Conception technique d’un module photovoltaïque (pertes, ratio CTM)',
  },
  {
    id: 'c21', tags: ['adaptation', 'icu', 'urbanisme', 'design-thinking', 'concertation', 'renovation'],
    fr: "j'ai participé aux Rencontres de la Génération Durable avec Construction21, où nous avons imaginé et pitché des solutions d'adaptation climatique urbaine (atelier « Habiter à +4 °C dans les villes »), ainsi qu'à la Fresque de la Rénovation énergétique",
    en: 'I took part in Construction21’s Sustainable Generation workshops, ideating and pitching urban climate-adaptation solutions ("Living in +4°C cities")',
    cv: 'Construction21 — atelier « Habiter à +4 °C » (adaptation climatique urbaine)',
  },
  {
    id: 'thales', tags: ['gmao', 'iot', 'rigueur', 'redaction', 'equipe', 'efficacite', 'cdc'],
    fr: "lors de mon stage chez Thales, j'ai analysé et optimisé des procédures de maintenance industrielle (GMAO), fiabilisé la documentation technique et exploité des solutions IoT en coordination avec les équipes terrain",
    en: 'during my internship at Thales, I optimised industrial maintenance procedures (CMMS), improved technical documentation and used IoT tracking tools alongside field teams',
    cv: 'Stage Thales — optimisation des procédures de maintenance (GMAO, IoT)',
  },
  {
    id: 'fabrique', tags: ['gestion-projet', 'analyse-fonct', 'design-thinking', 'cdc', 'equipe', 'autonomie', 'communication'],
    fr: "j'ai piloté l'analyse fonctionnelle et la gestion de projet de La Fabrique, une plateforme d'upcycling textile récompensée par le Prix de l'Esprit Startup",
    en: 'I led the functional analysis and project management of La Fabrique, an upcycling platform that won the ESILV Startup Spirit Award',
    cv: 'La Fabrique — gestion de projet & analyse fonctionnelle (Prix de l’Esprit Startup)',
  },
  {
    id: 'quake', tags: ['moa', 'gestion-projet', 'equipe', 'batiment'],
    fr: "j'ai coordonné les échanges MOA-MOE d'un projet de bâtiment parasismique avec DeVinci Quake",
    en: 'I coordinated client–designer (MOA–MOE) exchanges on an earthquake-resistant building project',
    cv: 'DeVinci Quake — coordination MOA-MOE d’un bâtiment parasismique',
  },
  {
    id: 'riga', tags: ['ml', 'sql', 'data', 'anglais', 'interculturel', 'python', 'modelisation'],
    fr: "mon semestre à la Riga Technical University (Machine Learning, recherche opérationnelle, bases de données, en anglais) a renforcé mes compétences analytiques et mon adaptabilité dans un environnement international",
    en: 'my semester at Riga Technical University (machine learning, operations research, databases — taught in English) strengthened my analytical skills and adaptability in international teams',
    cv: 'Semestre Riga Technical University — ML, recherche opérationnelle, bases de données (EN)',
  },
  {
    id: 'smart', tags: ['smartcity', 'data', 'ml', 'iot'],
    fr: "j'ai participé au Hackathon IBM (Data & IA) et à une Masterclass Smart Cities",
    en: 'I took part in an IBM Data & AI hackathon and a Smart Cities masterclass',
    cv: 'Hackathon IBM (Data & IA) & Masterclass Smart Cities',
  },
];

function rankExperiences(offer) {
  const req = new Set(offerSkills(offer));
  return EXPERIENCES.map((e) => ({ ...e, score: e.tags.filter((t) => req.has(t)).length + (e.tags.includes(offer.sector) ? 1 : 0) }))
    .sort((a, b) => b.score - a.score);
}

const SECTOR_HOOK = {
  fr: {
    urbanisme: 'concevoir des territoires plus sobres, plus résilients et plus agréables à vivre',
    energie: "accélérer la transition énergétique et la décarbonation de nos usages",
    audit: 'aider les organisations à transformer leurs engagements climat en plans d’action concrets',
    mobilite: 'développer des mobilités durables au service des territoires',
    batiment: 'réduire l’empreinte carbone du bâti, premier levier de la ville bas carbone',
    data: 'mettre la donnée au service de la performance énergétique et environnementale',
  },
  en: {
    urbanisme: 'shape low-carbon, resilient and liveable cities',
    energie: 'accelerate the energy transition and the decarbonisation of our societies',
    audit: 'help organisations turn climate commitments into concrete action plans',
    mobilite: 'deliver sustainable mobility for cities and regions',
    batiment: 'cut the carbon footprint of buildings, a key lever for net-zero cities',
    data: 'use data to drive energy and environmental performance',
  },
};

/** Extrait la formule de politesse d'un exemple fourni (dernier paragraphe avant la signature). */
function closingFrom(examples, lang) {
  const ex = examples.find((e) => e.lang === lang && e.content?.trim());
  if (!ex) return null;
  const paras = ex.content.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const re = lang === 'fr' ? /(agréer|salutations|cordialement|considération)/i : /(sincerely|regards|faithfully)/i;
  return paras.reverse().find((p) => re.test(p)) ?? null;
}

function openingFrom(examples, lang) {
  const ex = examples.find((e) => e.lang === lang && e.content?.trim());
  const first = ex?.content.split('\n').map((l) => l.trim()).find(Boolean);
  return first && first.length < 40 ? first : null;
}

export const langForOffer = (offer) => (offer.language === 'en' || offer.space === 'international' ? 'en' : 'fr');

// ---------------------------------------------------------------------------
// 1. Lettre de motivation / e-mail de candidature
// ---------------------------------------------------------------------------
export function generateCoverLetter({ offer, profile, settings, lang = langForOffer(offer), format = 'letter' }) {
  const { tone, examples } = settings.ai;
  const match = computeMatch(offer, profile, settings);
  const exps = rankExperiences(offer).slice(0, tone === 'concis' ? 2 : 3);
  const matched = match.matched.map(skillLabel).slice(0, 4);
  const missing = match.missing.map(skillLabel).slice(0, 2);
  const name = `${profile.firstName} ${profile.lastName}`;
  const duration = `${profile.availability.durationMin} à ${profile.availability.durationMax}`;
  const start = new Date(profile.availability.start);
  const enthusiastic = tone === 'enthousiaste';

  if (lang === 'en') {
    const hook = SECTOR_HOOK.en[offer.sector] ?? SECTOR_HOOK.en.energie;
    if (format === 'email') {
      return `Subject: Internship application – ${offer.title}

Dear Hiring Team,

I am a fourth-year engineering student at ESILV (Sustainable Energy & Cities major) and would love to join ${offer.company} for a ${profile.availability.durationMin}–${profile.availability.durationMax}-month internship from ${start.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}. ${capitalize(exps[0].en)}, which closely matches your "${offer.title}" role.

Please find my CV attached — I would be glad to discuss it at your convenience.

Best regards,
${name}`;
    }
    const opening = openingFrom(examples, 'en') ?? 'Dear Hiring Manager,';
    const closing = closingFrom(examples, 'en') ?? 'Yours sincerely,';
    return `${name}
${profile.school} — ${profile.program}
${profile.home.label}${profile.email ? ` · ${profile.email}` : ''}

${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}

Re: Application for the "${offer.title}" internship — ${offer.location.city}

${opening}

${enthusiastic ? `I was genuinely excited to discover your "${offer.title}" opening.` : `I am writing to apply for the "${offer.title}" internship at ${offer.company}.`} As a fourth-year engineering student at ESILV majoring in Sustainable Energy and Cities, I want to ${hook}, and ${offer.company}'s work — ${lowerFirst(offer.summary)} — is exactly where I see myself contributing.

${exps.map((e, i) => `${i === 0 ? 'In particular, ' : i === 1 ? 'In addition, ' : 'Finally, '}${e.en}.`).join(' ')}

These experiences gave me hands-on skills in ${listEn(matched.length ? matched : ['project management', 'technical analysis'])}${missing.length ? `, and I am eager to quickly build up my expertise in ${listEn(missing)}` : ''}. With professional English (TOEFL ITP 593) and an international semester in Latvia, I am comfortable working in multicultural teams.

I am available for a ${profile.availability.durationMin} to ${profile.availability.durationMax}-month internship starting ${start.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}${offer.durationMonths > profile.availability.durationMax ? ` and can discuss the ${offer.durationMonths}-month duration with my school` : ''}. I would welcome the opportunity to discuss how I could support your team.

${closing}

${name}`;
  }

  const hook = SECTOR_HOOK.fr[offer.sector] ?? SECTOR_HOOK.fr.energie;
  if (format === 'email') {
    return `Objet : Candidature stage – ${shortTitle(offer.title)}

Bonjour,

Élève-ingénieur en 4e année à l'ESILV (majeure Énergies et Villes Durables), je vous adresse ma candidature pour le stage « ${shortTitle(offer.title)} » au sein de ${offer.company}, pour un stage de ${duration} mois à partir d'${start.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}. ${capitalize(exps[0].fr)}.

Vous trouverez mon CV en pièce jointe ; je serais ravi d'échanger avec vous à votre convenance.

Bien cordialement,
${name}`;
  }
  const opening = openingFrom(examples, 'fr') ?? 'Madame, Monsieur,';
  const closing = closingFrom(examples, 'fr') ?? "Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.";
  return `${name}
${profile.school}
${profile.home.label}${profile.email ? ` · ${profile.email}` : ''}${profile.phone ? ` · ${profile.phone}` : ''}

${offer.company}
${offer.location.city}

Le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}

Objet : Candidature au stage « ${shortTitle(offer.title)} »

${opening}

${enthusiastic ? `C'est avec un réel enthousiasme que j'ai découvert votre offre de stage « ${shortTitle(offer.title)} ».` : `Je souhaite vous proposer ma candidature pour le stage « ${shortTitle(offer.title)} ».`} Élève-ingénieur en 4e année à l'ESILV au sein de la majeure Énergies et Villes Durables, je souhaite ${hook}. Les missions proposées par ${offer.company} — ${lowerFirst(offer.summary)} — correspondent précisément au rôle que je souhaite jouer.

${exps.map((e, i) => `${i === 0 ? 'Ainsi, ' : i === 1 ? 'Par ailleurs, ' : 'Enfin, '}${e.fr}.`).join(' ')}

Ces expériences m'ont permis de développer des compétences en ${listFr(matched.length ? matched.map(lowerFirst) : ['gestion de projet', 'analyse technique'])}${missing.length ? ` ; je suis par ailleurs prêt à monter rapidement en compétence sur ${listFr(missing.map(lowerFirst))}` : ''}. ${tone === 'concis' ? '' : 'Rigoureux, à l’écoute et à l’aise en équipe, j’aime confronter l’analyse technique à la réalité du terrain.'}

Disponible pour un stage de ${duration} mois à compter d'${start.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}${offer.durationMonths > profile.availability.durationMax ? ` (la durée de ${offer.durationMonths} mois peut être étudiée avec mon école)` : ''}, je serais heureux de vous exposer plus en détail ma motivation lors d'un entretien.

${closing}

${name}`;
}

// ---------------------------------------------------------------------------
// 2. Adaptation du CV
// ---------------------------------------------------------------------------
const SKILL_TIPS = {
  sig: 'Suivre une initiation QGIS (tutoriels officiels, 3–4 h) et cartographier un cas concret (ex. points lumineux de Bourg-la-Reine) pour pouvoir le citer.',
  excel: 'Mentionner « Excel avancé (TCD, modélisation de scénarios) », utilisé pour l’audit des 10 bâtiments.',
  autocad: 'Indiquer un niveau « notions » si pratiqué en cours ; sinon, signaler la maîtrise de SolidWorks (CAO) comme base transférable.',
  bim: 'Citer SolidWorks comme base CAO et une initiation Revit (Autodesk propose une licence étudiante gratuite).',
  pvsyst: 'Installer la version d’essai de PVsyst et refaire le dimensionnement de votre module PV : à citer en projet.',
  powerbi: 'Réaliser un mini-tableau de bord Power BI sur les données de l’audit énergétique et l’ajouter au portfolio.',
  sql: 'Rappeler le cours « Database » suivi à Riga Technical University (en anglais).',
  python: 'Préciser les usages : analyse de données (pandas), automatisation, machine learning (Riga).',
  modelisation: 'Mettre en avant le calcul des pertes / ratio CTM du module PV et les scénarios de l’audit énergétique.',
  'bilan-carbone': 'Évoquer les cours de décarbonation ; une formation courte « Bilan Carbone® » (ABC) ou la Fresque du Climat renforce le profil.',
  esg: 'Lire la synthèse CSRD/ESRS de l’AMF et citer la veille réglementaire réalisée.',
  rcu: 'Ajouter une ligne « Réseaux de chaleur » si abordés dans le cours Energetic Efficiency ; sinon consulter le guide AMORCE.',
  vrd: 'Signaler la sensibilité aux espaces publics acquise sur la mission éclairage public.',
  hydrogene: 'Mentionner une veille sur l’hydrogène bas carbone (stratégie nationale) si pertinente.',
  acv: 'Suivre le module en ligne « ACV bâtiment RE2020 » (CSTB / Elan) et l’indiquer.',
  mobilite: 'Relier la mission Bourg-la-Reine aux usages de l’espace public (piétons, sécurité).',
  concertation: 'Mettre en avant l’étude de terrain sur l’acceptabilité sociale (Bourg-la-Reine).',
};

export function generateCvSuggestions({ offer, profile, settings, lang = langForOffer(offer) }) {
  const match = computeMatch(offer, profile, settings);
  const exps = rankExperiences(offer);
  const sector = SECTORS[offer.sector]?.short ?? offer.sector;
  const suggestions = [];

  suggestions.push({
    type: 'titre', priority: 'haute', title: 'Titre du CV ciblé',
    detail: lang === 'en'
      ? `« ${offer.title.replace(/ intern(ship)?/i, '')} Intern — ${profile.availability.durationMin}–${profile.availability.durationMax} months from April 2027 »`
      : `« ${shortTitle(offer.title)} – Stage de ${profile.availability.durationMin} à ${profile.availability.durationMax} mois à compter d'avril 2027 »`,
    why: 'Les ATS et les recruteurs comparent d’abord le titre du CV à l’intitulé du poste (votre CV ATS utilise déjà ce principe).',
  });
  suggestions.push({
    type: 'accroche', priority: 'haute', title: 'Accroche personnalisée',
    detail: lang === 'en'
      ? `Engineering student (ESILV, Sustainable Energy & Cities) seeking to contribute to ${offer.company}'s ${sector.toLowerCase()} projects, bringing ${match.matched.slice(0, 3).map(skillLabel).join(', ').toLowerCase() || 'analytical and field skills'}.`
      : `Élève-ingénieur ESILV (Énergies et Villes Durables), je souhaite contribuer aux projets ${sector.toLowerCase()} de ${offer.company} en mobilisant mes compétences en ${match.matched.slice(0, 3).map(skillLabel).join(', ').toLowerCase() || 'analyse et travail de terrain'}.`,
    why: 'Reprendre le vocabulaire de l’offre dans les trois premières lignes.',
  });
  suggestions.push({
    type: 'ordre', priority: 'haute', title: 'Réordonner les expériences',
    detail: exps.slice(0, 3).map((e, i) => `${i + 1}. ${e.cv}`).join('\n'),
    why: 'Placer en tête les expériences qui couvrent le plus de compétences demandées.',
  });
  for (const id of match.missing.slice(0, 5)) {
    suggestions.push({
      type: 'competence', priority: SKILL_BY_ID[id]?.category === 'domaine' ? 'moyenne' : 'basse',
      title: `Compétence demandée : ${skillLabel(id)}`,
      detail: SKILL_TIPS[id] ?? 'À n’ajouter que si vous l’avez réellement pratiquée ; sinon, montrer une expérience proche et votre capacité d’apprentissage.',
      why: 'Mot-clé présent dans l’offre mais absent de votre CV.',
    });
  }
  const reformulations = exps.slice(0, 2).map((e) => {
    const kw = e.tags.filter((t) => offerSkills(offer).includes(t)).slice(0, 3).map(skillLabel);
    return `• ${e.cv}${kw.length ? ` → faire apparaître : ${kw.join(', ')}` : ''}`;
  });
  suggestions.push({
    type: 'reformulation', priority: 'moyenne', title: 'Reformuler avec les mots-clés de l’offre',
    detail: reformulations.join('\n'), why: 'Les mêmes mots que l’annonce = meilleur score ATS.',
  });
  if (lang === 'en') {
    suggestions.push({
      type: 'langue', priority: 'haute', title: 'Version anglaise du CV',
      detail: 'CV d’une page en anglais, sans photo ni date de naissance (usages UK / Irlande), avec « Languages: French (native), English (B2+, TOEFL ITP 593), German (intermediate) ».',
      why: 'Offre rédigée en anglais.',
    });
  }
  if (offer.durationMonths > profile.availability.durationMax) {
    suggestions.push({
      type: 'duree', priority: 'moyenne', title: `Durée de l’offre : ${offer.durationMonths} mois`,
      detail: 'Préciser « disponible 4 à 5 mois, extension possible selon convention » si votre école le permet.',
      why: 'Lever l’objection sur la durée avant l’entretien.',
    });
  }
  return { suggestions, match };
}

// ---------------------------------------------------------------------------
// 3. Analyse des mots-clés
// ---------------------------------------------------------------------------
const STOPWORDS = new Set(normalize(`le la les de des du un une et en au aux pour par sur avec dans vos votre nos notre est sont the of and to in for with on a an your our you we will be at as or from by this that are ce cette ces qui que mois stage intern internship possible lieu`).split(' '));

export function analyzeKeywords({ offer, profile }) {
  const mine = new Set(profileSkills(profile));
  const declared = new Set(offer.requirements ?? []);
  const all = offerSkills(offer);
  const skills = all.map((id) => ({
    id,
    label: skillLabel(id),
    category: SKILL_BY_ID[id]?.category ?? 'domaine',
    categoryLabel: SKILL_CATEGORIES[SKILL_BY_ID[id]?.category] ?? 'Domaine',
    importance: declared.has(id) ? 'haute' : 'moyenne',
    inCv: mine.has(id),
  }));
  const freq = {};
  for (const w of normalize(`${offer.title} ${offer.description}`).split(' ')) {
    if (w.length < 4 || STOPWORDS.has(w)) continue;
    freq[w] = (freq[w] ?? 0) + 1;
  }
  const terms = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([term, count]) => ({ term, count }));
  const coverage = skills.length ? Math.round((skills.filter((s) => s.inCv).length / skills.length) * 100) : 0;
  return { skills, terms, coverage };
}

// ---------------------------------------------------------------------------
// 4. Préparation aux entretiens
// ---------------------------------------------------------------------------
const TECH_QUESTIONS = {
  'decret-tertiaire': ['Quels sont les objectifs du décret tertiaire et comment les atteint-on ?', '-40 % en 2030, -50 % en 2040, -60 % en 2050 (ou valeur absolue) ; déclaration annuelle sur OPERAT ; leviers : travaux, exploitation, comportements.'],
  'audit-energie': ['Comment déroulez-vous un audit énergétique ?', 'Collecte des factures et données, visite technique, bilan par usage, scénarios d’amélioration chiffrés (gains, CAPEX, temps de retour), restitution.'],
  efficacite: ['Quels sont les principaux leviers d’efficacité énergétique d’un bâtiment tertiaire ?', 'Isolation / enveloppe, CVC performant (PAC), GTB/pilotage, éclairage LED, sobriété d’usage, récupération de chaleur.'],
  pv: ['Quels facteurs influencent le productible d’une centrale photovoltaïque ? Qu’est-ce que le ratio CTM ?', 'Irradiation, orientation/inclinaison, ombrages, température, pertes onduleur/câbles ; CTM = puissance du module / somme des puissances des cellules.'],
  eolien: ['Quel est le facteur de charge typique de l’éolien terrestre et en mer ?', '≈ 23–27 % à terre en France, 35–50 % en mer ; dépend du gisement et de la hauteur de moyeu.'],
  nucleaire: ['Pouvez-vous expliquer le principe d’un réacteur à eau pressurisée ?', 'Fission → chaleur dans le circuit primaire pressurisé → générateur de vapeur → turbine. Évoquer EPR2 et SMR.'],
  rcu: ['Quels sont les atouts d’un réseau de chaleur urbain ?', 'Mutualisation, mobilisation d’EnR&R (géothermie, biomasse, chaleur fatale), TVA réduite au-delà de 50 % d’EnR&R, Fonds Chaleur de l’ADEME.'],
  grid: ['Quels défis pose l’intégration des EnR au réseau électrique ?', 'Intermittence, congestion, tenue de tension/fréquence ; solutions : flexibilité, stockage, pilotage de la demande, renforcement réseau.'],
  stockage: ['Quelles technologies de stockage connaissez-vous ?', 'Batteries Li-ion, STEP, hydrogène, stockage thermique ; critères : puissance, énergie, rendement, durée.'],
  hydrogene: ['Différence entre hydrogène gris, bleu et vert ?', 'Vaporeformage sans/avec captage de CO₂, électrolyse alimentée par électricité renouvelable (ou bas carbone).'],
  decarbonation: ['Comment construiriez-vous une trajectoire de décarbonation ?', 'Bilan initial, objectifs alignés SBTi, leviers sobriété / efficacité / électrification / EnR, chiffrage et priorisation, suivi des indicateurs.'],
  'bilan-carbone': ['Quelle est la différence entre les scopes 1, 2 et 3 ?', 'Scope 1 : émissions directes ; scope 2 : énergie achetée ; scope 3 : autres émissions indirectes (achats, déplacements, usage des produits…).'],
  esg: ['Qu’est-ce que la double matérialité dans la CSRD ?', 'Impact de l’entreprise sur l’environnement et la société + impact des enjeux de durabilité sur la performance financière.'],
  acv: ['Quels indicateurs la RE2020 introduit-elle ?', 'Ic énergie / Ic construction (ACV dynamique), Bbio, Cep, DH (confort d’été).'],
  urbanisme: ['Qu’est-ce qu’un PLU(i) et une ZAC ?', 'PLU(i) : document réglementaire de planification ; ZAC : procédure d’aménagement opérationnel pilotée par une collectivité ou un aménageur.'],
  amenagement: ['Comment intégrer la sobriété foncière (ZAN) dans un projet d’aménagement ?', 'Renouvellement urbain, densification qualitative, réhabilitation de friches, désimperméabilisation.'],
  adaptation: ['Citez des solutions pour lutter contre les îlots de chaleur urbains.', 'Végétalisation, désimperméabilisation, matériaux clairs (albédo), eau en ville, ombrage, ventilation naturelle.'],
  icu: ['Comment mesurer un îlot de chaleur ?', 'Capteurs de température, imagerie satellite (températures de surface), simulations microclimatiques.'],
  biodiversite: ['Qu’est-ce qu’une trame noire ?', 'Réseau de corridors écologiques préservés de la pollution lumineuse : extinction, abaissement, spectre ambré, orientation des luminaires.'],
  concertation: ['Comment mener une concertation efficace ?', 'Identifier les parties prenantes, adapter les formats (ateliers, enquêtes terrain), restituer et montrer la prise en compte des avis.'],
  mobilite: ['Qu’est-ce qu’un plan de mobilité et quels leviers de report modal ?', 'Document de planification (ex-PDU) ; leviers : TC performants, modes actifs, stationnement, intermodalité.'],
  sig: ['Quelle analyse spatiale réaliseriez-vous sous SIG pour ce poste ?', 'Ex. croisement de couches (population, chaleur, végétation) pour prioriser des zones d’intervention.'],
  python: ['Comment utiliseriez-vous Python dans ce stage ?', 'Nettoyage et analyse de données (pandas), automatisation de calculs, visualisation, modèles simples.'],
  data: ['Comment fiabilisez-vous un jeu de données de consommation ?', 'Détection des trous / doublons / valeurs aberrantes, normalisation (DJU, surfaces), traçabilité des corrections.'],
  'gestion-projet': ['Comment réagissez-vous face à un retard sur un livrable ?', 'Identifier la cause, prévenir tôt, reprioriser, proposer un plan de rattrapage — illustrer avec La Fabrique ou PIE.'],
  moa: ['Quelle est la différence entre MOA et MOE ?', 'MOA : le commanditaire, porte le besoin et le budget ; MOE : conçoit et suit la réalisation. Exemple : DeVinci Quake.'],
  gmao: ['Qu’avez-vous retenu de la maintenance chez Thales ?', 'Lien GMAO ↔ fiabilité, importance des modes opératoires, retour terrain.'],
};

const EN_TECH = {
  efficacite: ['What are the main energy-efficiency levers in commercial buildings?', 'Fabric upgrades, efficient HVAC / heat pumps, BMS optimisation, LED lighting, behaviour change, heat recovery.'],
  pv: ['Which factors drive the yield of a PV plant? What is the CTM ratio?', 'Irradiance, tilt/orientation, shading, temperature, inverter/cable losses; CTM = module power / sum of cell powers.'],
  eolien: ['What capacity factors would you expect for onshore vs offshore wind?', 'Roughly 25 % onshore, 35–50 % offshore depending on resource and hub height.'],
  adaptation: ['How would you reduce urban heat island effects?', 'Greening, de-paving, cool materials (albedo), water features, shading, ventilation corridors.'],
  decarbonation: ['How would you build a net-zero roadmap for a client?', 'Baseline, science-based targets, levers (efficiency, electrification, renewables), costing, prioritisation, KPIs.'],
  'bilan-carbone': ['Explain scope 1, 2 and 3 emissions.', 'Direct emissions; purchased energy; all other indirect emissions across the value chain.'],
  rcu: ['Why are district heating networks key for city decarbonisation?', 'They aggregate demand and unlock low-carbon heat sources (geothermal, heat pumps, waste heat).'],
  urbanisme: ['What makes a neighbourhood masterplan sustainable?', 'Density & mixed use, active travel, green-blue infrastructure, low-carbon energy, community engagement.'],
  grid: ['What challenges does renewable integration create for grids?', 'Variability, congestion, voltage/frequency stability; flexibility, storage and reinforcement as solutions.'],
  sig: ['Which GIS analysis would you run for this role?', 'Overlay analysis (e.g. heat, population, green cover) to prioritise intervention areas.'],
  data: ['How do you ensure data quality?', 'Gap/outlier detection, normalisation, documentation of cleaning steps.'],
};

export function generateInterviewPrep({ offer, profile, settings, lang = langForOffer(offer) }) {
  const exps = rankExperiences(offer).slice(0, 3);
  const reqs = offerSkills(offer);
  const bank = lang === 'en' ? { ...EN_TECH } : TECH_QUESTIONS;
  const sections = [];

  sections.push({
    title: lang === 'en' ? 'Motivation' : 'Motivation & projet',
    questions: lang === 'en'
      ? [
        { q: `Why ${offer.company}, and why this role?`, hint: `Link ${offer.company}'s activity (${offer.summary.toLowerCase()}) to your major and your Bourg-la-Reine / audit experiences.` },
        { q: 'Why do you want to work abroad?', hint: 'Riga semester, intercultural openness, European city-climate challenges.' },
        { q: 'Where do you see yourself after your degree?', hint: 'Engineer in sustainable cities / energy transition consulting or design office.' },
      ]
      : [
        { q: `Pourquoi ${offer.company} et pourquoi ce stage ?`, hint: `Relier l'activité (${lowerFirst(offer.summary)}) à votre majeure Énergies et Villes Durables et à vos projets.` },
        { q: `Qu'est-ce qui vous attire dans le secteur « ${SECTORS[offer.sector]?.label ?? offer.sector} » ?`, hint: 'Votre fil rouge : rendre les villes plus sobres et résilientes, entre technique et terrain.' },
        { q: 'Quel est votre projet professionnel à la sortie de l’ESILV ?', hint: 'Bureau d’études / conseil en urbanisme durable et transition énergétique.' },
      ],
  });

  sections.push({
    title: lang === 'en' ? 'Your experience (STAR method)' : 'Parcours — méthode STAR',
    questions: exps.map((e) => ({
      q: lang === 'en' ? `Tell us about this experience: ${e.cv}.` : `Présentez-nous : ${e.cv}.`,
      hint: lang === 'en'
        ? `Situation, Task, Action, Result — ${e.en}. Quantify the outcome.`
        : `Situation, Tâche, Action, Résultat — ${e.fr}. Chiffrer le résultat.`,
    })),
  });

  const tech = reqs.filter((id) => bank[id] || TECH_QUESTIONS[id]).slice(0, 6).map((id) => {
    const [q, hint] = bank[id] ?? TECH_QUESTIONS[id];
    return { q, hint, tag: skillLabel(id) };
  });
  if (tech.length) sections.push({ title: lang === 'en' ? 'Technical questions' : 'Questions techniques', questions: tech });

  sections.push({
    title: lang === 'en' ? 'Soft skills' : 'Savoir-être',
    questions: lang === 'en'
      ? [
        { q: 'Describe a conflict in a team project and how you solved it.', hint: 'VinciRacingTeam events or La Fabrique.' },
        { q: 'What is your main weakness?', hint: 'A real but managed weakness + how you improve it.' },
      ]
      : [
        { q: 'Racontez une situation où vous avez dû convaincre des interlocuteurs non techniques.', hint: 'Étude de terrain Bourg-la-Reine : habitants, services techniques, élus.' },
        { q: 'Comment vous organisez-vous pour tenir plusieurs délais en parallèle ?', hint: 'Cours + PII + association Devinci Durable (secrétaire).' },
        { q: 'Quel est votre principal axe d’amélioration ?', hint: 'Un défaut réel mais maîtrisé, avec ce que vous mettez en place.' },
      ],
  });

  sections.push({
    title: lang === 'en' ? 'Questions to ask them' : 'Questions à poser au recruteur',
    questions: (lang === 'en'
      ? ['What would a typical week look like for the intern?', 'Which projects would I contribute to first?', 'How is the intern supervised and evaluated?', 'What are the next steps of the recruitment process?']
      : ['À quoi ressemblerait une semaine type pour le/la stagiaire ?', 'Sur quels projets interviendrais-je en priorité ?', 'Comment se passent l’encadrement et l’évaluation du stage ?', 'Le stage peut-il déboucher sur une embauche ou un VIE ?']).map((q) => ({ q, hint: '' })),
  });

  if (offer.durationMonths > profile.availability.durationMax) {
    sections.push({
      title: 'Point de vigilance',
      questions: [{ q: `L'offre est sur ${offer.durationMonths} mois, votre disponibilité est de ${profile.availability.durationMin}–${profile.availability.durationMax} mois.`, hint: 'Préparer une réponse claire : contraintes de la convention ESILV, possibilité de démarrer plus tôt ou de prolonger.' }],
    });
  }
  return { lang, sections };
}

// ---------------------------------------------------------------------------
// Mode Claude (API Anthropic, appel direct depuis le navigateur)
// ---------------------------------------------------------------------------
const TASK_PROMPTS = {
  letter: (lang) => `Rédige une lettre de motivation ${lang === 'en' ? 'EN ANGLAIS' : 'en français'} pour cette offre. Inspire-toi du style des exemples fournis, n'invente aucune expérience absente du CV, et termine par la signature.`,
  email: (lang) => `Rédige un e-mail de candidature court (8 lignes max) ${lang === 'en' ? 'EN ANGLAIS' : 'en français'}, avec objet.`,
  cv: () => "Propose des modifications concrètes du CV pour cette offre : titre, accroche, ordre des expériences, reformulations avec les mots-clés de l'offre, compétences manquantes (sans rien inventer). Réponds en français, sous forme de liste structurée.",
  keywords: () => "Extrais les compétences requises par l'offre (techniques, outils, savoir-être, langues), indique pour chacune si elle apparaît dans le CV, et donne un taux de couverture. Réponds en français.",
  interview: (lang) => `Prépare l'entretien : 12 à 15 questions probables (motivation, STAR basées sur le CV, techniques liées à l'offre, savoir-être) avec des pistes de réponse, puis 4 questions à poser au recruteur. Langue : ${lang === 'en' ? 'anglais' : 'français'}.`,
};

export async function generateWithClaude({ task, offer, profile, settings, lang, onText, signal }) {
  const { apiKey, model, tone, examples } = settings.ai;
  if (!apiKey) throw new Error('Ajoutez votre clé API Anthropic dans Paramètres › IA.');
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  const system = `Tu es un coach carrière expert du recrutement de stagiaires ingénieurs (énergie, urbanisme, ville durable). Tu aides ${profile.firstName}, étudiant à l'ESILV. Ton : ${tone}. Sois précis, factuel et n'invente jamais d'expérience, de diplôme ou de compétence.`;
  const prompt = `${TASK_PROMPTS[task](lang)}

<cv>
${profile.cvText}
</cv>

<disponibilite>Stage de ${profile.availability.durationMin} à ${profile.availability.durationMax} mois à partir du ${profile.availability.start}. Domicile : ${profile.home.label}.</disponibilite>

<offre>
Intitulé : ${offer.title}
Entreprise : ${offer.company}
Lieu : ${offer.location.city}, ${offer.location.country}
Durée : ${offer.durationMonths} mois — début ${offer.startDate}
${offer.description}
</offre>

<exemples_de_lettres>
${examples.map((e) => `--- ${e.title} (${e.lang}) ---\n${e.content}`).join('\n\n')}
</exemples_de_lettres>`;

  const params = {
    model,
    max_tokens: 16000,
    output_config: { effort: 'medium' },
    system,
    messages: [{ role: 'user', content: prompt }],
  };
  // Repli automatique côté serveur si le modèle refuse (non disponible pour Haiku).
  if (!model.includes('haiku')) {
    params.betas = ['server-side-fallback-2026-07-01'];
    params.fallbacks = 'default';
  }
  const stream = client.beta.messages.stream(params, { signal });
  stream.on('text', (delta) => onText?.(delta));
  const message = await stream.finalMessage();
  if (message.stop_reason === 'refusal') throw new Error('La génération a été refusée par le modèle.');
  return message.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
}

// ---------------------------------------------------------------------------
// Helpers de rédaction
// ---------------------------------------------------------------------------
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function lowerFirst(s) { return s ? s.charAt(0).toLowerCase() + s.slice(1).replace(/\.$/, '') : s; }
function listFr(items) { return items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} et ${items.at(-1)}`; }
function listEn(items) { return items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`.toLowerCase(); }
