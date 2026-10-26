// Lists taken from the IB guides you shared (MYP Language acquisition guide,
// MYP: From principles into practice).

export const KEY_CONCEPTS = [
  "Aesthetics", "Change", "Communication", "Communities",
  "Connections", "Creativity", "Culture", "Development",
  "Form", "Global interactions", "Identity", "Logic",
  "Perspective", "Relationships", "Systems", "Time, place and space"
];

export const RELATED_BY_PHASE = {
  "1–2": ["Audience", "Function", "Pronunciation", "Context", "Meaning", "Purpose", "Conventions", "Message", "Structure", "Form", "Patterns", "Word choice"],
  "3–4": ["Audience", "Function", "Point of view", "Context", "Idiom", "Purpose", "Conventions", "Meaning", "Structure", "Empathy", "Message", "Word choice"],
  "5–6": ["Argument", "Empathy", "Purpose", "Audience", "Idiom", "Stylistic choices", "Bias", "Inference", "Theme", "Context", "Point of view", "Voice"]
};

export const GLOBAL_CONTEXTS = {
  "Identities and relationships": [
    "Competition and cooperation; teams, affiliation and leadership",
    "Identity formation; self-esteem; status; roles and role models",
    "Personal efficacy and agency; attitudes, motivation, independence; happiness and the good life",
    "Physical, psychological and social development; transitions; health and well-being; lifestyle choices",
    "Human nature and human dignity; moral reasoning and ethical judgment; consciousness and mind"
  ],
  "Orientation in space and time": [
    "Civilizations and social histories, heritage, pilgrimage, migration, displacement and exchange",
    "Epochs, eras, turning points and “big history”",
    "Scale, duration, frequency and variability",
    "Peoples, boundaries, exchange and interaction",
    "Natural and human landscapes and resources",
    "Evolution, constraints and adaptation",
    "Indigenous understanding"
  ],
  "Personal and cultural expression": [
    "Artistry, craft, creation, beauty",
    "Products, systems and institutions",
    "Social constructions of reality; philosophies and ways of life; belief systems; ritual and play",
    "Critical literacy, languages and linguistic systems; histories of ideas, fields and disciplines; analysis and argument",
    "Metacognition and abstract thinking",
    "Entrepreneurship, practice and competency"
  ],
  "Scientific and technical innovation": [
    "Systems, models, methods; products, processes and solutions",
    "Adaptation, ingenuity and progress",
    "Opportunity, risk, consequences and responsibility",
    "Modernization, industrialization and engineering",
    "Digital life, virtual environments and the Information Age",
    "The biological revolution",
    "Mathematical puzzles, principles and discoveries"
  ],
  "Globalization and sustainability": [
    "Markets, commodities and commercialization",
    "Human impact on the environment",
    "Commonality, diversity and interconnection",
    "Consumption, conservation, scarcity; natural resources and public goods",
    "Population and demography",
    "Urban planning, strategy and infrastructure",
    "Data-driven decision-making"
  ],
  "Fairness and development": [
    "Democracy, politics, government and civil society",
    "Inequality, difference and inclusion",
    "Human capability and development; social entrepreneurs",
    "Rights, law, civic responsibility and the public sphere",
    "Justice, peace and conflict management",
    "Ecology and disparate impact",
    "Power and privilege",
    "Authority, security and freedom",
    "Imagining a hopeful future"
  ]
};

// ---- date helpers (UTC-safe, "YYYY-MM-DD" strings)
const toDate = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };
export const toIso = (dt) => dt.toISOString().slice(0, 10);
export const mondayOf = (s) => { const d = toDate(s); const wd = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - wd); return toIso(d); };
export const addDays = (s, n) => { const d = toDate(s); d.setUTCDate(d.getUTCDate() + n); return toIso(d); };
const fmt = (s, opts) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...opts }).format(toDate(s));
export const shortDate = (s) => fmt(s, { month: "short", day: "numeric" });
export const longDate = (s) => fmt(s, { month: "long", day: "numeric" });
export const dayName = (s) => fmt(s, { weekday: "short" });

// weeks (Mon..Fri) covering [start, end]
export function weeksBetween(start, end) {
  if (!start || !end || end < start) return [];
  const out = [];
  let mon = mondayOf(start);
  while (mon <= end) {
    out.push({ monday: mon, days: [0, 1, 2, 3, 4].map((i) => addDays(mon, i)) });
    mon = addDays(mon, 7);
  }
  return out;
}

// session paragraphs are justified in the template, so keep each field on one line
const oneLine = (t) => String(t || "").replace(/\s*\n+\s*/g, " ").trim();

// plan -> data object consumed by the 10th grade template
export function build10thData(plan) {
  const dates = Object.keys(plan.days).sort();
  const byWeek = new Map();
  dates.forEach((d) => { const m = mondayOf(d); if (!byWeek.has(m)) byWeek.set(m, []); byWeek.get(m).push(d); });
  let sn = 0;
  const weeks = [...byWeek.entries()].map(([mon, ds], i) => ({
    n: i + 1,
    rangeLabel: `${longDate(mon)} – ${longDate(addDays(mon, 4))}`,
    topic: plan.weekTopics[mon] || "",
    sessions: ds.map((d) => { const s = plan.days[d]; return { sn: ++sn, sdate: shortDate(d), objective: oneLine(s.objective), opening: oneLine(s.opening), ts: oneLine(s.ts), le: oneLine(s.le), closing: oneLine(s.closing) }; })
  }));
  const gc = plan.globalContext ? (plan.exploration ? `${plan.globalContext}: ${plan.exploration}` : plan.globalContext) : "";
  return {
    ...plan,
    duration: plan.duration || `${dates.length} sessions × ${plan.minutes || 50} min`,
    relatedConcepts: [...plan.relatedConcepts, plan.otherRelated].filter(Boolean).join(", "),
    globalContext: gc,
    weeks
  };
}

// ---------------------------------------------------------------- POP (11th / 12th)
export const LEARNER_ATTRS = [
  ["indagacion", "Indagación"], ["comunicacion", "Comunicación"], ["conocimiento", "Conocimiento"],
  ["razonamiento", "Razonamiento"], ["integridad", "Integridad"], ["mentalidad", "Mentalidad abierta"],
  ["solidaridad", "Solidaridad"], ["audacia", "Audacia"], ["equilibrio", "Equilibrio"], ["reflexion", "Reflexión"]
];

export const ATL_GROUPS = [
  ["Habilidades de pensamiento", [["transfer", "Transferencia"], ["critical", "Pensamiento crítico"], ["creative", "Pensamiento creativo"]]],
  ["Habilidades de comunicación", [
    ["commExpress", "Comunicarse de forma oral y escrita"], ["commUnderstand", "Comprender diversos mensajes"],
    ["commRead", "Leer y comprender diversos textos"], ["commWrite", "Escribir diferentes tipos de texto"],
    ["commArgue", "Forma argumentos propios de forma oral y escrita"]]],
  ["Habilidades sociales", [
    ["socEmotions", "Identificar, entender, y manejar nuestras emociones y las de los demás"],
    ["socRelations", "Desarrollar y mantener relaciones positivas"], ["socCollab", "Trabajo colaborativo"]]],
  ["Habilidades de autogestión", [
    ["selfDecisions", "Toma decisiones de manera responsable"], ["selfGoals", "Establecer y alcanzar metas"],
    ["selfTime", "Gestión eficaz del tiempo y tareas"], ["selfResilience", "Automotivación y resiliencia"]]],
  ["Habilidades de investigación", [
    ["resCite", "Citado de fuentes"], ["resRefs", "Inclusión de referencias"], ["resValidate", "Validar información"]]]
];

// Taken from your 11th and 12th grade planners.
export const COMP_GEN = [
  "Escucha, interpreta y emite mensajes pertinentes en distintos contextos mediante el uso de medios, códigos y herramientas apropiados en una segunda lengua.",
  "Participa y colabora de manera efectiva en equipos diversos al construir visiones compartidas.",
  "Mantiene una actitud respetuosa hacia la interculturalidad y la diversidad de creencias, valores, ideas y prácticas sociales."
];
export const COMP_DISC = [
  "Se comunica en una lengua extranjera mediante un discurso coherente, correcto y estructurado de forma oral y escrita en un nivel B2 o superior.",
  "Evalúa y argumenta puntos de vista complejos, redactando artículos y folletos informativos con registro y estilo adecuados.",
  "Se expresa en una lengua extranjera con fluidez, precisión y eficacia sobre temas complejos de nivel C1.",
  "Elabora informes, artículos de opinión y presentaciones formales utilizando estructuras gramaticales avanzadas (inversiones, enfáticas y modificadores) con rigor académico."
];

export const WEEK_FIELDS = [
  ["topic", "Tema / Objetivos de aprendizaje"], ["concepts", "Conceptos a trabajar"], ["prior", "Conocimientos previos de los estudiantes"],
  ["activityDev", "Desarrollo de la actividad"], ["resources", "Recursos tecnológicos y otros recursos"],
  ["evidence", "Evidencias de trabajo fuera de clase y dentro de clase"], ["differentiation", "Diferenciación"],
  ["intl", "Vínculo con mentalidad internacional"], ["formative", "Evaluación formativa"]
];

const fullDate = (s) => `${longDate(s)}, ${s.slice(0, 4)}`;

export function buildPopData(plan) {
  const dates = Object.keys(plan.days).sort();
  const byWeek = new Map();
  dates.forEach((d) => { const m = mondayOf(d); if (!byWeek.has(m)) byWeek.set(m, []); byWeek.get(m).push(d); });
  let sn = 0;
  const weeks = [...byWeek.entries()].map(([mon, ds], i) => ({
    n: i + 1,
    rangeLabel: `${longDate(mon)} to ${longDate(addDays(mon, 4))}`,
    ...Object.fromEntries(WEEK_FIELDS.map(([k]) => [k, (plan.weekFields[mon] || {})[k] || ""])),
    sessions: ds.map((d) => { const s = plan.days[d]; return { sn: ++sn, sdate: shortDate(d), sname: s.name, sobjective: oneLine(s.objective), sdev: oneLine(s.dev) }; })
  }));
  const data = {
    subject: plan.subject, teacher: plan.teacher, grade: plan.grade, groups: plan.groups, period: plan.period,
    elabDate: plan.elabDate, unitTitle: plan.unitTitle, purpose: plan.purpose, centralIdea: plan.centralIdea,
    startDate: plan.start ? fullDate(plan.start) : "", endDate: plan.end ? fullDate(plan.end) : "",
    sessionsCount: String(dates.length),
    compGen: [...plan.compGen, plan.compGenOther].filter(Boolean).join("\n"),
    compDisc: [...plan.compDisc, plan.compDiscOther].filter(Boolean).join("\n"),
    reflInitial: plan.reflInitial, reflMid: plan.reflMid, reflFinal: plan.reflFinal, summative: plan.summative,
    linkLang: plan.linkLang, linkHPP: plan.linkHPP, linkAS: plan.linkAS, linkOther: plan.linkOther,
    weeks
  };
  LEARNER_ATTRS.forEach(([k]) => { data["attr_" + k] = plan.attrs[k] || ""; });
  ATL_GROUPS.forEach(([, items]) => items.forEach(([k]) => { data["atl_" + k] = plan.atl[k] || ""; }));
  return data;
}
