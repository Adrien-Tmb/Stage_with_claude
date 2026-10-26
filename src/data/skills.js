// Dictionnaire de compétences : sert à l'extraction de mots-clés et au score de match CV ↔ offre.
// aliases : variantes FR/EN (normalisées à l'exécution).

const s = (id, label, category, aliases = []) => ({ id, label, category, aliases: [label, ...aliases] });

export const SKILL_CATEGORIES = {
  domaine: 'Domaine métier',
  outil: 'Outil / logiciel',
  methode: 'Méthode',
  soft: 'Savoir-être',
  langue: 'Langue',
};

export const SKILLS = [
  // Domaines — urbanisme & ville
  s('urbanisme', 'Urbanisme', 'domaine', ['urban planning', 'urbanism', 'planification urbaine', 'projet urbain']),
  s('amenagement', 'Aménagement du territoire', 'domaine', ['amenagement', 'land use', 'spatial planning', 'territorial planning', 'zac', 'masterplan']),
  s('mobilite', 'Mobilité & transports', 'domaine', ['mobilite', 'mobility', 'transport planning', 'transports', 'transport']),
  s('smartcity', 'Smart city', 'domaine', ['smart cities', 'ville intelligente', 'smart city']),
  s('adaptation', 'Adaptation climatique', 'domaine', ['climate adaptation', 'resilience', 'resilience climatique', 'adaptation au changement climatique', '+4 c', 'habiter a +4']),
  s('icu', 'Îlots de chaleur urbains', 'domaine', ['urban heat island', 'ilots de chaleur', 'microclimat']),
  s('biodiversite', 'Biodiversité & trame noire', 'domaine', ['biodiversity', 'biodiversite', 'trame noire', 'trame verte', 'eclairage public', 'public lighting']),
  s('concertation', 'Concertation & acceptabilité sociale', 'domaine', ['stakeholder engagement', 'concertation', 'acceptabilite sociale', 'participation citoyenne', 'etude de terrain', 'fieldwork']),
  s('moa', "Maîtrise d'ouvrage (MOA/MOE)", 'domaine', ['moa', 'moe', 'maitrise d ouvrage', 'client side', 'project owner']),
  s('vrd', 'VRD / espaces publics', 'domaine', ['vrd', 'voirie', 'public realm', 'espaces publics']),
  // Domaines — énergie
  s('efficacite', 'Efficacité énergétique', 'domaine', ['energy efficiency', 'efficacite energetique', 'energetic efficiency', 'performance energetique']),
  s('audit-energie', 'Audit énergétique', 'domaine', ['energy audit', 'audit energetique', 'audit de performance energetique']),
  s('decret-tertiaire', 'Décret tertiaire', 'domaine', ['decret tertiaire', 'eco energie tertiaire', 'operat']),
  s('renovation', 'Rénovation énergétique', 'domaine', ['retrofit', 'renovation energetique', 'fresque de la renovation']),
  s('pv', 'Photovoltaïque', 'domaine', ['solar pv', 'photovoltaique', 'solaire', 'solar energy', 'solar', 'module photovoltaique', 'agrivoltaisme']),
  s('eolien', 'Éolien', 'domaine', ['wind energy', 'eolien', 'offshore wind', 'onshore wind', 'wind']),
  s('nucleaire', 'Nucléaire', 'domaine', ['nuclear', 'nucleaire', 'nuclear energy', 'surete nucleaire']),
  s('enr', 'Énergies renouvelables', 'domaine', ['renewable energy', 'renewables', 'energies renouvelables', 'enr']),
  s('rcu', 'Réseaux de chaleur', 'domaine', ['district heating', 'reseaux de chaleur', 'reseau de chaleur', 'heat network', 'district energy']),
  s('grid', 'Réseaux électriques / smart grids', 'domaine', ['smart grid', 'smart grids', 'power grid', 'reseau electrique', 'grid connection', 'raccordement']),
  s('stockage', 'Stockage & flexibilité', 'domaine', ['energy storage', 'battery', 'batteries', 'stockage', 'flexibilite', 'flexibility']),
  s('hydrogene', 'Hydrogène', 'domaine', ['hydrogen', 'hydrogene', 'electrolyse']),
  s('decarbonation', 'Décarbonation', 'domaine', ['decarbonisation', 'decarbonization', 'decarbonation', 'net zero', 'bas carbone', 'low carbon']),
  s('bilan-carbone', 'Bilan carbone / GES', 'domaine', ['carbon footprint', 'carbon accounting', 'bilan carbone', 'ghg', 'ges', 'scope 3']),
  s('acv', 'ACV (analyse de cycle de vie)', 'domaine', ['lca', 'life cycle assessment', 'acv', 'analyse de cycle de vie', 're2020']),
  s('esg', 'RSE / ESG / CSRD', 'domaine', ['esg', 'rse', 'csrd', 'csr', 'sustainability reporting', 'taxonomie', 'taxonomy']),
  s('iot', 'IoT & capteurs', 'domaine', ['iot', 'internet of things', 'capteurs', 'sensors', 'spider']),
  s('data', 'Analyse de données', 'domaine', ['data analysis', 'analyse de donnees', 'data', 'data & ia', 'dataviz']),
  s('ml', 'Machine learning / IA', 'domaine', ['machine learning', 'ia', 'ai', 'intelligence artificielle', 'operation research', 'recherche operationnelle']),
  s('modelisation', 'Modélisation énergétique', 'domaine', ['energy modelling', 'energy modeling', 'modelisation', 'simulation thermique', 'std', 'thermique dynamique']),
  s('gmao', 'Maintenance / GMAO', 'domaine', ['gmao', 'cmms', 'maintenance industrielle', 'maintenance']),
  // Outils
  s('python', 'Python', 'outil', ['python', 'pandas']),
  s('excel', 'Excel avancé', 'outil', ['excel', 'vba', 'tableur']),
  s('sig', 'SIG (QGIS / ArcGIS)', 'outil', ['gis', 'sig', 'qgis', 'arcgis']),
  s('autocad', 'AutoCAD', 'outil', ['autocad', 'cad', 'dao']),
  s('bim', 'BIM / Revit', 'outil', ['bim', 'revit']),
  s('solidworks', 'SolidWorks', 'outil', ['solidworks', 'cao', '3d modelling']),
  s('csharp', 'C#', 'outil', ['c#', 'csharp', '.net']),
  s('sql', 'SQL / bases de données', 'outil', ['sql', 'database', 'bases de donnees', 'base de donnees']),
  s('powerbi', 'Power BI / Tableau', 'outil', ['power bi', 'powerbi', 'tableau software']),
  s('pvsyst', 'PVsyst', 'outil', ['pvsyst']),
  s('uml', 'UML', 'outil', ['uml']),
  // Méthodes
  s('gestion-projet', 'Gestion de projet', 'methode', ['project management', 'gestion de projet', 'pilotage de projet', 'planning', 'coordination']),
  s('analyse-fonct', 'Analyse fonctionnelle', 'methode', ['functional analysis', 'analyse fonctionnelle']),
  s('cdc', 'Cahier des charges', 'methode', ['specifications', 'cahier des charges', 'requirements']),
  s('design-thinking', 'Design Thinking', 'methode', ['design thinking', 'ideation', 'design thinker']),
  s('redaction', 'Rédaction de rapports', 'methode', ['report writing', 'redaction', 'rapports', 'livrables', 'deliverables']),
  s('benchmark', 'Veille & benchmark', 'methode', ['benchmark', 'veille', 'market research', 'etat de l art', 'literature review']),
  s('reglementaire', 'Analyse réglementaire', 'methode', ['regulatory', 'reglementaire', 'reglementation', 'policy analysis']),
  // Savoir-être
  s('equipe', "Travail en équipe", 'soft', ['teamwork', 'travail en equipe', 'esprit d equipe', 'cooperation en equipe', 'team player']),
  s('rigueur', 'Rigueur', 'soft', ['rigour', 'rigor', 'rigueur', 'rigoureux', 'attention to detail']),
  s('autonomie', 'Autonomie', 'soft', ['autonomy', 'autonomie', 'self-starter', 'proactive']),
  s('communication', 'Communication', 'soft', ['communication', 'presentation', 'aisance relationnelle', 'ecoute', 'a l ecoute']),
  s('synthese', 'Esprit de synthèse', 'soft', ['synthesis', 'esprit de synthese', 'analytical', 'analytique', 'sens de l analyse']),
  s('interculturel', 'Ouverture interculturelle', 'soft', ['international', 'intercultural', 'interculturelle', 'adaptabilite', 'adaptability']),
  // Langues
  s('anglais', 'Anglais professionnel', 'langue', ['english', 'anglais', 'fluent english', 'toefl']),
  s('allemand', 'Allemand', 'langue', ['german', 'allemand', 'deutsch']),
  s('francais', 'Français', 'langue', ['french', 'francais']),
];

export const SKILL_BY_ID = Object.fromEntries(SKILLS.map((sk) => [sk.id, sk]));
