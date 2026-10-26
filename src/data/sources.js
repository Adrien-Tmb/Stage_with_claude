// Sources de collecte. Les liens générés pointent vers de vraies pages de recherche
// (pré-remplies avec l'intitulé et la ville) : on retrouve l'annonce en un clic.

const q = encodeURIComponent;

export const SOURCES = {
  careers: {
    label: 'Sites carrières', color: '#10b981', weight: 3,
    description: 'Pages recrutement des entreprises suivies (scraping direct).',
    url: (o, co) => co?.website ?? '#',
  },
  linkedin: {
    label: 'LinkedIn', color: '#0a66c2', weight: 4,
    description: 'LinkedIn Jobs — filtre « Stage ».',
    url: (o) => `https://www.linkedin.com/jobs/search/?keywords=${q(`${o.title} ${o.company}`)}&location=${q(o.location.city)}&f_E=1`,
  },
  indeed: {
    label: 'Indeed', color: '#2557a7', weight: 3,
    description: 'Indeed France / UK / IE selon le pays.',
    url: (o) => {
      const host = { 'Royaume-Uni': 'uk.indeed.com', Irlande: 'ie.indeed.com', France: 'fr.indeed.com' }[o.location.country] ?? 'www.indeed.com';
      return `https://${host}/jobs?q=${q(`${o.title} ${o.company}`)}&l=${q(o.location.city)}`;
    },
  },
  hellowork: {
    label: 'HelloWork', color: '#ff5a5f', weight: 2, franceOnly: true,
    description: 'HelloWork (ex-RegionsJob) — offres de stage.',
    url: (o) => `https://www.hellowork.com/fr-fr/emploi/recherche.html?k=${q(o.title)}&l=${q(o.location.city)}&c=Stage`,
  },
  wttj: {
    label: 'Welcome to the Jungle', color: '#ffcd00', weight: 2,
    description: 'Welcome to the Jungle — start-ups et scale-ups.',
    url: (o) => `https://www.welcometothejungle.com/fr/jobs?query=${q(`${o.title} ${o.company}`)}&refinementList%5Bcontract_type%5D%5B%5D=internship`,
  },
  jobteaser: {
    label: 'JobTeaser (ESILV)', color: '#6d28d9', weight: 2, franceOnly: true,
    description: 'Career center de l’école (JobTeaser).',
    url: (o) => `https://www.jobteaser.com/fr/job-offers?q=${q(`${o.title} ${o.company}`)}`,
  },
  apec: {
    label: 'APEC', color: '#e4007c', weight: 1, franceOnly: true,
    description: 'APEC — offres cadres et stages ingénieur.',
    url: (o) => `https://www.apec.fr/candidat/recherche-emploi.html/emploi?motsCles=${q(`${o.title} ${o.company}`)}`,
  },
  euraxess: {
    label: 'Euraxess / labos', color: '#0ea5e9', weight: 1, researchOnly: true,
    description: 'Portails recherche (Euraxess, ABG, sites des laboratoires).',
    url: (o) => `https://euraxess.ec.europa.eu/jobs/search?keywords=${q(`${o.title} ${o.company}`)}`,
  },
};

export const SOURCE_KEYS = Object.keys(SOURCES);
