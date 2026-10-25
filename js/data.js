/* ------------------------------------------------------------------ *
 * talaria.school — maquette — Catalogue de formations
 * Boutique en ligne serverless (maquette statique).
 * Données purement déclaratives : la vraie source sera Firestore
 * (EPIC T-FIREBASE). Prix métier = 60 € / module ; bloc complet = 7 modules.
 * ------------------------------------------------------------------ */
window.TALARIA = window.TALARIA || {};

TALARIA.PRICE_PER_MODULE = 60;
TALARIA.MODULES_PER_FORMATION = 7;
// Remise éventuelle du bloc complet en % (0 = aucun remise, bloc = modules × 7).
TALARIA.BLOC_DISCOUNT_PCT = 0;

TALARIA.trainingPrice = function (modulesCount) {
  return modulesCount * TALARIA.PRICE_PER_MODULE;
};

TALARIA.blocPrice = function () {
  const base = TALARIA.trainingPrice(TALARIA.MODULES_PER_FORMATION);
  if (TALARIA.BLOC_DISCOUNT_PCT <= 0) return base;
  return Math.round((base * (100 - TALARIA.BLOC_DISCOUNT_PCT)) / 100);
};

TALARIA.formatEUR = function (value) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);
};

var LOCALE_MAP = {
  zh: "zh-CN", hi: "hi-IN", bn: "bn-BD", pt: "pt-PT",
  ar: "ar-SA", ur: "ur-PK", el: "el-GR", tr: "tr-TR",
  th: "th-TH", sr: "sr-RS", id: "id-ID", vi: "vi-VN",
  ko: "ko-KR", ja: "ja-JP", nl: "nl-NL", it: "it-IT",
  de: "de-DE", ru: "ru-RU", es: "es-ES",
  fa: "fa-IR",
};

TALARIA.locale = function () {
  var code = window.TALARIA && TALARIA.I18N && TALARIA.I18N.current
    ? TALARIA.I18N.current()
    : "fr";
  return LOCALE_MAP[code] || code;
};

// Clé chrome localisée (repli sûr si i18n.js absent).
TALARIA.t = function (key) {
  if (window.TALARIA && TALARIA.I18N && TALARIA.I18N.t) {
    return TALARIA.I18N.t.apply(TALARIA.I18N, arguments);
  }
  return key;
};

// Formation localisée : structure tirée du catalogue de base (data.js),
// textes métier remplacés par i18n-content.js quand disponibles.
TALARIA.localizedTraining = function (id) {
  var tr = TALARIA.findTraining(id);
  if (!tr) return null;
  var loc = null;
  if (window.TALARIA && TALARIA.I18N && TALARIA.I18N.catalogText) {
    loc = function (field) {
      var v = TALARIA.I18N.catalogText(id, field);
      return v;
    };
  }
  function pick(base, field) {
    if (!loc) return base;
    var v = loc(field);
    return v ? v : base;
  }
  var objectives = tr.objectives;
  if (loc) {
    var obj = loc("objectives");
    if (Array.isArray(obj) && obj.length) objectives = obj;
  }
  var modules = tr.modules.map(function (m, i) {
    if (!loc) return m;
    var mods = loc("modules");
    var lm = Array.isArray(mods) && mods[i] ? mods[i] : null;
    return {
      id: m.id,
      title: lm && lm.title ? lm.title : m.title,
      desc: lm && lm.desc ? lm.desc : m.desc,
    };
  });
  return {
    id: tr.id,
    code: tr.code,
    name: pick(tr.name, "title"),
    title: pick(tr.title, "title"),
    tagline: pick(tr.tagline, "tagline"),
    level: pick(tr.level, "level"),
    duration: pick(tr.duration, "duration"),
    audience: pick(tr.audience, "audience"),
    outco: pick(tr.outco, "outco"),
    objectives: objectives,
    modules: modules,
  };
};

TALARIA.catalog = [
  {
    id: "fpa",
    code: "FPA",
    name: "Formateur Professionnel d'Adultes",
    title: "Formateur Professionnel d'Adultes",
    level: "Niveau 5 (Bac+2)",
    duration: "6 mois — 70% en distanciel",
    tagline:
      "Concevoir, animer et évaluer des formations pour adultes, en présentiel et à distance.",
    objectives: [
      "Concevoir et structurer une action de formation",
      "Animer des séances engageantes pour un public adulte",
      "Évaluer les acquis et adapter sa pédagogie",
      "Accompagner chaque apprenant dans son parcours",
      "Mobiliser les outils numériques et le distanciel",
      "Assurer le suivi et l’évaluation des acquis",
    ],
    audience: "Futurs formateurs, animateurs, salariés de la formation continue, reconversions.",
    outco: "Parcours de compétences FPA",
    modules: [
      {
        id: "fpa-m1",
        title: "Concevoir et préparer une action de formation",
        desc: "Analyser le besoin, définir les objectifs pédagogiques et bâtir le déroulé (SPG, séquence, évaluation).",
      },
      {
        id: "fpa-m2",
        title: "Préparer et animer des séances de formation",
        desc: "Techniques d'animation de groupe, gestion du temps, pédagogie active et induction d'apprenants adultes.",
      },
      {
        id: "fpa-m3",
        title: "Évaluer les acquis des apprenants",
        desc: "Construire des évaluations formatives et certificatives, analyser les résultats et ajuster la formation.",
      },
      {
        id: "fpa-m4",
        title: "Accompagner les apprenants dans leur parcours",
        desc: "Suivi individualisé, entretiens, remédiation et posture d'accompagnant de la réussite.",
      },
      {
        id: "fpa-m5",
        title: "Digitaliser et intégrer le distanciel",
        desc: "Outils numériques, capsules vidéo, classes virtuelles et hybridation de la formation.",
      },
      {
        id: "fpa-m6",
        title: "Assurer le suivi et l’évaluation des acquis",
        desc: "Mettre en place des processus de suivi qualité et d’évaluation des acquis",
      },
      {
        id: "fpa-m7",
        title: "Développer son projet professionnel",
        desc: "Mise en situation professionnelle, questionnement et préparation complète au titre.",
      },
    ],
  },
  {
    id: "cda",
    code: "CDA",
    name: "Concepteur Développeur d'Applications",
    title: "Concepteur Développeur d'Applications",
    level: "Niveau 6 (Bac+3/4)",
    duration: "18 mois — 65% en distanciel",
    tagline:
      "Concevoir, développer et industrialiser des applications web, du besoin au déploiement.",
    objectives: [
      "Analyser le besoin et concevoir la solution informatique",
      "Développer le backend et l'API d'une application",
      "Modéliser et exploiter la base de données",
      "Construire des interfaces web front-end modernes",
      "Sécuriser l'application et respecter le RGPD",
      "Tester, qualifier et industrialiser (CI/CD)",
    ],
    audience: "Développeurs débutants, techniciens, professionnels en reconversion vers la conception logicielle.",
    outco: "Parcours de compétences CDA",
    modules: [
      {
        id: "cda-m1",
        title: "Fondamentaux de l'algorithmique et du développement",
        desc: "Logique, structures de données, orienté objet et bonnes pratiques de code.",
      },
      {
        id: "cda-m2",
        title: "Développer une application (backend)",
        desc: "Langage de référence, API REST, persistence et services métier.",
      },
      {
        id: "cda-m3",
        title: "Concevoir la base de données",
        desc: "Modélisation, requêtes SQL, indexation et choix SQL/NoSQL.",
      },
      {
        id: "cda-m4",
        title: "Front-end et interfaces web",
        desc: "HTML/CSS/JS, framework front, accessibilité et expérience utilisateur.",
      },
      {
        id: "cda-m5",
        title: "Sécurité des applications et RGPD",
        desc: "OWASP, gestion des identités, chiffrement et conformité réglementaire.",
      },
      {
        id: "cda-m6",
        title: "Tests, qualité et CI/CD",
        desc: "Tests unitaires et d'intégration, revue de code et pipeline de déploiement.",
      },
      {
        id: "cda-m7",
        title: "Projet professionnel encadré",
        desc: "Projet complet fil rouge et passage en revue du projet professionnel.",
      },
    ],
  },
];

TALARIA.findTraining = function (id) {
  return TALARIA.catalog.find((t) => t.id === id) || null;
};