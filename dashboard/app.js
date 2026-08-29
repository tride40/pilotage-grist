"use strict";

/* Tables lues par le tableau de bord. */
const TABLE_NAMES = [
  "PROJETS", "INTERLOCUTEURS", "REUNIONS", "ACTIONS",
  "CONSIGNES_POLITIQUES", "ARBITRAGES_DECISIONS", "AVANCEMENTS",
];
const OPTIONAL_TABLE_NAMES = ["BLOCAGES", "VIGILANCES"];

const PROJECT_CHOICE_FIELDS = ["Thematiques", "Statut"];
const PROJECT_FORM_FIELDS = [
  "Nom_projet", "Description", "Objectif_politique", "Thematiques", "Statut",
  "Agent_pilote", "Responsable", "Elu_pilote", "Mois_lancement", "Annee_lancement", "Trimestre_objectif", "Annee_objectif",
];
const PROJECT_CHOICE_FALLBACKS = {
  Thematiques: ["Finances & Fiscalité", "Sécurité & Tranquillité publique", "Voirie & Mobilités", "Concertation & Participation citoyenne", "Solidarités & Intergénérationnel", "Enfance, Jeunesse & Éducation", "Travaux & Patrimoine bâti", "Urbanisme & Cadre de vie", "Environnement & Transition écologique", "Culture, Vie associative & Festivités", "Vie économique & Tourisme", "Sport"],
  Statut: ["À venir", "En cours", "Terminé", "Abandonné"],
};

const state = { projects: [], activeFilter: "all", search: "", tables: null, writable: null, projectChoices: null, currentUser: null, demo: false, busy: false };
const elements = {
  date: document.querySelector("#current-date"),
  filters: document.querySelector("#filter-list"),
  kpis: document.querySelector("#kpi-grid"),
  projectGrid: document.querySelector("#project-grid"),
  resultsCount: document.querySelector("#results-count"),
  search: document.querySelector("#project-search"),
  status: document.querySelector("#interface-state"),
  newProject: document.querySelector("#new-project"),
  dialog: document.querySelector("#project-dialog"),
  form: document.querySelector("#project-form"),
  formMessage: document.querySelector("#project-form-message"),
  feedback: document.querySelector("#feedback"),
};

/* ---------- Lecture et normalisation des données Grist ---------- */
async function initializeGristConnection() {
  if (!window.grist?.docApi) throw new Error("L’API Grist ou grist.docApi n’est pas disponible.");

  await Promise.resolve(window.grist.ready({ requiredAccess: "full" }));

  if (typeof window.grist.docApi.listTables !== "function") {
    throw new Error("grist.docApi.listTables() n’est pas disponible.");
  }

  const listedTables = await window.grist.docApi.listTables();
  const tableNames = normalizeTableNames(listedTables);

  const missingTables = TABLE_NAMES.filter((tableName) => !tableNames.includes(tableName));
  if (missingTables.length > 0) {
    throw new Error(`Tables Grist introuvables : ${missingTables.join(", ")}.`);
  }

  return tableNames;
}

async function fetchDocumentData(tableNames) {
  const requestedTables = [...TABLE_NAMES, ...OPTIONAL_TABLE_NAMES].filter((tableName) => tableNames.includes(tableName));
  const tables = await Promise.all(requestedTables.map(async (tableName) => {
    const columns = await window.grist.docApi.fetchTable(tableName);
    return [tableName, columnarToRecords(columns)];
  }));
  return Object.fromEntries(tables);
}

function normalizeTableNames(listedTables) {
  const items = Array.isArray(listedTables)
    ? listedTables
    : Array.isArray(listedTables?.tables) ? listedTables.tables : [];

  return items.map((table) => {
    if (typeof table === "string") return table;
    return table?.id ?? table?.tableId ?? table?.name ?? "";
  }).filter(Boolean);
}

/* La démonstration est impossible dans l'iframe d'un vrai widget Grist. */
function isLocalDemoMode() {
  const localHosts = ["localhost", "127.0.0.1"];
  const requested = new URLSearchParams(window.location.search).get("demo") === "1";
  return localHosts.includes(window.location.hostname)
    && window.self === window.top
    && requested
    && Boolean(window.DASHBOARD_DEMO_DATA);
}

function columnarToRecords(columns) {
  if (!columns || typeof columns !== "object") return [];
  const names = Object.keys(columns).filter((name) => Array.isArray(columns[name]));
  const rowCount = Math.max(0, ...names.map((name) => columns[name].length));
  return Array.from({ length: rowCount }, (_, index) =>
    Object.fromEntries(names.map((name) => [name, columns[name][index]])),
  );
}
async function fetchProjectMetadata() {
  const [tableMeta, columnMeta] = await Promise.all([window.grist.docApi.fetchTable("_grist_Tables"), window.grist.docApi.fetchTable("_grist_Tables_column")]);
  const tables = columnarToRecords(tableMeta), columns = columnarToRecords(columnMeta), ids = new Map(tables.map(row=>[String(row.id),row.tableId]));
  const columnsByTable = (name) => columns.filter((column) => ids.get(String(column.parentId)) === name);
  const writable = Object.fromEntries(TABLE_NAMES.map((name) => [name, new Set(columnsByTable(name).filter((column) => !hasValue(column.formula) && !isTrue(column.isFormula)).map((column) => column.colId))]));
  const projectChoices = Object.fromEntries(PROJECT_CHOICE_FIELDS.map((field) => {
    const column = columnsByTable("PROJETS").find((candidate) => candidate.colId === field);
    return [field, extractChoiceValues(column)];
  }));
  return { writable, projectChoices };
}

function extractChoiceValues(column) {
  if (!column || !["Choice", "ChoiceList"].includes(String(column.type || "").split(":")[0])) return [];
  for (const rawOptions of [column.widgetOptions, column.options]) {
    const options = decodeMetadataOptions(rawOptions);
    const choices = options?.choices ?? options?.choiceValues ?? options?.values;
    if (Array.isArray(choices)) return choices.filter((value) => value !== "L" && hasValue(value)).map(displayValue);
  }
  return [];
}

function decodeMetadataOptions(value) {
  if (!hasValue(value)) return null;
  if (typeof value === "object") return value;
  try {
    const decoded = JSON.parse(value);
    return typeof decoded === "string" ? decodeMetadataOptions(decoded) : decoded;
  } catch (_) {
    return null;
  }
}

/* ---------- Calculs des indicateurs et liens entre tables ---------- */
function prepareDashboardData(tables) {
  const metrics = buildProjectMetrics(tables);
  return tables.PROJETS.filter(isActiveProject).map((project) => ({
    ...project,
    Responsable_affiche: personValue(project.Agent_pilote || project.Responsable, tables.INTERLOCUTEURS),
    Elu_pilote_affiche: personValue(project.Elu_pilote, tables.INTERLOCUTEURS),
    metrics: metrics.get(String(project.id)) ?? emptyMetrics(),
  }));
}

function personValue(value, people) {
  if (!hasValue(value)) return "";
  return referenceIds(value).map((identifier) => {
    const person = people.find((candidate) => String(candidate.id) === String(identifier));
    return person?.Nom_complet || identifier;
  }).map(displayValue).join(", ");
}

function referenceIds(value) {
  if (!hasValue(value)) return [];
  if (Array.isArray(value)) return value[0] === "L" ? value.slice(1) : value.flatMap(referenceIds);
  if (typeof value === "object") return [value.id ?? value.rowId].filter(hasValue);
  return [value];
}

function calculateKpis(tables, projects) {
  return [
    { key: "active", label: "Projets actifs", value: projects.length },
    { key: "arbitration", label: "Décisions à prendre", value: tables.ARBITRAGES_DECISIONS.filter(isOpenDecision).length },
    { key: "late", label: "Actions en retard", value: tables.ACTIONS.filter((row) => isTrue(row.En_retard)).length },
    { key: "check", label: "Consignes à contrôler", value: tables.CONSIGNES_POLITIQUES.filter((row) => isTrue(row.A_controler)).length },
    { key: "watch", label: "Projets à surveiller", value: projects.filter(isProjectToWatch).length },
  ];
}

function buildProjectMetrics(tables) {
  const metrics = new Map(tables.PROJETS.map((project) => [String(project.id), emptyMetrics()]));
  tables.ACTIONS.forEach((action) => {
    const item = getMetricForLinkedProject(metrics, action);
    if (!item) return;
    if (isOpenAction(action)) item.openActions += 1;
    if (isTrue(action.En_retard)) item.lateActions += 1;
  });
  tables.ARBITRAGES_DECISIONS.forEach((row) => {
    const item = getMetricForLinkedProject(metrics, row);
    if (item && isOpenDecision(row)) item.arbitrations += 1;
  });
  tables.CONSIGNES_POLITIQUES.forEach((row) => {
    const item = getMetricForLinkedProject(metrics, row);
    if (item && isTrue(row.A_controler)) item.instructions += 1;
  });
  (tables.BLOCAGES || []).filter(isOpenPilotageObject).forEach((row) => {
    const item = getMetricForLinkedProject(metrics, row);
    if (item) item.blockages += 1;
  });
  (tables.VIGILANCES || []).filter(isOpenPilotageObject).forEach((row) => {
    const item = getMetricForLinkedProject(metrics, row);
    if (item) item.vigilances += 1;
  });
  return metrics;
}

function emptyMetrics() {
  return { openActions: 0, lateActions: 0, arbitrations: 0, instructions: 0, blockages: 0, vigilances: 0 };
}

function isOpenPilotageObject(row) {
  return !hasValue(row.Date_resolution || row.Date_levee)
    && !["leve", "levee", "resolu", "resolue", "clos", "close", "archive", "archivee"].includes(normalizeText(row.Statut));
}

function isOpenDecision(row) {
  const status = normalizeText(row.Statut);
  return ["demandee", "en instruction", "a preparer", "a decider", "reportee"].includes(status)
    || (!["prise", "sans suite", "decidee", "decide"].includes(status) && !isTrue(row.Transmis));
}

function getMetricForLinkedProject(metrics, row) {
  const projectId = getProjectReference(row);
  return projectId === null ? null : metrics.get(String(projectId));
}

/* Plusieurs noms usuels sont acceptés car la colonne de liaison n'a pas été précisée. */
function getProjectReference(row) {
  for (const column of ["Projet", "PROJET", "Projet_ref", "Projet_ID", "Project"]) {
    const value = row[column];
    if (Array.isArray(value) && value[0] === "L") return value[1] ?? null;
    if (hasValue(value)) return value;
  }
  return null;
}

function isActiveProject(project) {
  return !isTrue(project.Archive) && !["termine", "abandonne"].includes(normalizeText(project.Statut));
}

function isProjectToWatch(project) {
  return project.metrics.blockages > 0 || project.metrics.vigilances > 0;
}

function isOpenAction(action) {
  if ("Ouverte" in action) return isTrue(action.Ouverte);
  if ("Terminee" in action) return !isTrue(action.Terminee);
  return !["terminee", "termine", "cloturee", "cloture", "annulee", "annule"].includes(normalizeText(action.Statut));
}

/* ---------- Filtres exécutés localement ---------- */
function getFilteredProjects() {
  return state.projects.filter((project) => {
    const matchesSearch = normalizeText(project.Nom_projet).includes(normalizeText(state.search));
    const matchesFilter = {
      all: true,
      watch: isProjectToWatch(project),
      arbitration: project.metrics.arbitrations > 0,
      late: project.metrics.lateActions > 0,
    }[state.activeFilter];
    return matchesSearch && Boolean(matchesFilter);
  });
}

function bindFilters() {
  elements.filters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    state.activeFilter = button.dataset.filter;
    elements.filters.querySelectorAll("[data-filter]").forEach((item) => {
      const active = item === button;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    renderProjects();
  });
  elements.search.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderProjects();
  });
  elements.newProject.addEventListener("click", openProjectForm);
  elements.dialog.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => elements.dialog.close()));
  elements.form.addEventListener("submit", createProject);
}

/* ---------- Rendu de l'interface ---------- */
function renderKpis(kpis) {
  const template = document.querySelector("#kpi-template");
  const fragment = document.createDocumentFragment();
  kpis.forEach((kpi) => {
    const card = template.content.firstElementChild.cloneNode(true);
    card.dataset.kind = kpi.key;
    card.querySelector(".kpi-card__label").textContent = kpi.label;
    card.querySelector(".kpi-card__value").textContent = new Intl.NumberFormat("fr-FR").format(kpi.value);
    fragment.append(card);
  });
  elements.kpis.replaceChildren(fragment);
}

function renderProjects() {
  const projects = getFilteredProjects();
  elements.projectGrid.replaceChildren();
  elements.resultsCount.textContent = `${projects.length} ${projects.length > 1 ? "projets affichés" : "projet affiché"}`;
  if (projects.length === 0) {
    elements.projectGrid.hidden = true;
    showState(
      state.projects.length === 0 ? "empty" : "filtered-empty",
      state.projects.length === 0 ? "Aucun projet actif" : "Aucun résultat",
      state.projects.length === 0
        ? "Les projets actifs apparaîtront ici dès qu’ils seront disponibles dans Grist."
        : "Essayez un autre filtre ou modifiez votre recherche.",
    );
    return;
  }
  const fragment = document.createDocumentFragment();
  projects.forEach((project) => fragment.append(createProjectCard(project)));
  elements.projectGrid.append(fragment);
  elements.projectGrid.hidden = false;
  elements.status.hidden = true;
}

function createProjectCard(project) {
  const card = document.querySelector("#project-template").content.firstElementChild.cloneNode(true);
  const title = textOr(project.Nom_projet, "Projet sans nom");
  card.querySelector(".project-card__title").textContent = title;
  card.setAttribute("aria-label", title);
  card.dataset.projectId = project.id;
  card.addEventListener("click", () => openProject(project));
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openProject(project); }
  });
  setOptionalText(card.querySelector(".project-card__category"), project.Thematiques);
  renderBadges(card.querySelector(".project-card__badges"), project);
  renderDetails(card.querySelector(".project-card__details"), project);
  renderMetrics(card.querySelector(".project-card__footer"), project.metrics);
  return card;
}

function renderBadges(container, project) {
  const badges = [
    { value: project.Statut, modifier: statusModifier(project.Statut), prefix: "" },
  ].filter((badge) => hasValue(badge.value));
  badges.forEach(({ value, modifier, prefix }) => {
    const badge = document.createElement("span");
    badge.className = `badge badge--${modifier}`;
    badge.textContent = `${prefix}${displayValue(value)}`;
    container.append(badge);
  });
  if (badges.length === 0) container.remove();
}

function renderDetails(container, project) {
  const details = [
    ["Agent pilote", project.Responsable_affiche],
    ["Élu pilote", project.Elu_pilote_affiche],
    ["Objectif de réalisation", [project.Trimestre_objectif, project.Annee_objectif].filter(hasValue).join(" ")],
  ].filter(([, value]) => hasValue(value));
  details.forEach(([label, value]) => {
    const wrapper = document.createElement("div");
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    term.textContent = label;
    description.textContent = displayValue(value);
    wrapper.append(term, description);
    container.append(wrapper);
  });
  if (details.length === 0) container.remove();
}

function renderMetrics(container, metrics) {
  const items = [
    [metrics.openActions, "action ouverte", "actions ouvertes", "info"],
    [metrics.lateActions, "action en retard", "actions en retard", "danger"],
    [metrics.arbitrations, "décision à prendre", "décisions à prendre", "arbitration"],
    [metrics.instructions, "consigne à contrôler", "consignes à contrôler", "warning"],
    [metrics.blockages, "blocage ouvert", "blocages ouverts", "danger"],
    [metrics.vigilances, "vigilance ouverte", "vigilances ouvertes", "warning"],
  ].filter(([count]) => count > 0);
  items.forEach(([count, singular, plural, kind]) => {
    const item = document.createElement("span");
    item.className = `metric metric--${kind}`;
    item.textContent = `${count} ${count > 1 ? plural : singular}`;
    container.append(item);
  });
  if (items.length === 0) container.remove();
}

function showState(kind, title, message) {
  elements.status.className = `interface-state interface-state--${kind}`;
  const text = document.createElement("div");
  const heading = document.createElement("strong");
  const paragraph = document.createElement("p");
  heading.textContent = title;
  paragraph.textContent = message;
  text.append(heading, paragraph);
  elements.status.replaceChildren(text);
  elements.status.hidden = false;
}

/* ---------- Valeurs vides et formats Grist ---------- */
function isTrue(value) {
  return value === true || value === 1 || ["true", "vrai", "oui", "yes", "1"].includes(normalizeText(value));
}

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function normalizeText(value) {
  if (!hasValue(value)) return "";
  return String(value).trim().toLocaleLowerCase("fr-FR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function displayValue(value) {
  if (Array.isArray(value)) return value.filter((part) => part !== "L").join(", ");
  return String(value).trim();
}

function textOr(value, fallback) {
  return hasValue(value) ? displayValue(value) : fallback;
}

function setOptionalText(element, value) {
  if (hasValue(value)) element.textContent = displayValue(value);
  else element.remove();
}

function formatDate(value) {
  if (!hasValue(value)) return "";
  const date = value instanceof Date ? value : new Date(typeof value === "number" ? value * 1000 : value);
  return Number.isNaN(date.getTime()) ? displayValue(value) : new Intl.DateTimeFormat("fr-FR", {
    day: "numeric", month: "short", year: "numeric",
  }).format(date);
}

function statusModifier(status) {
  const value = normalizeText(status);
  if (["termine", "conforme"].includes(value)) return "success";
  if (["bloque", "retard", "en retard"].includes(value)) return "danger";
  if (["vigilance", "a surveiller"].includes(value)) return "warning";
  if (["arbitrage", "a arbitrer"].includes(value)) return "arbitration";
  return "info";
}

/* ---------- Création et transmission du contexte projet ---------- */
function distinctValues(field) {
  return [...new Set((state.tables?.PROJETS || []).map((row) => displayValue(row[field])).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr"));
}

function projectChoiceValues(field) {
  const metadata = state.projectChoices?.[field] || [];
  const existing = distinctValues(field);
  const base = metadata.length ? metadata : PROJECT_CHOICE_FALLBACKS[field];
  return [...new Set([...base, ...existing])];
}

function option(value, label) { const item = document.createElement("option"); item.value = value; item.textContent = label; return item; }

function fillSelect(field, placeholder) {
  const control = elements.form.elements[field];
  const values = projectChoiceValues(field);
  control.replaceChildren(option("", placeholder), ...values.map((value) => option(value, value)));
  return Boolean(state.projectChoices?.[field]?.length);
}

function renderThemeChoices() {
  const container=document.querySelector("#theme-choices");
  container.replaceChildren(...projectChoiceValues("Thematiques").map((value)=>{const label=document.createElement("label");label.className="choice-option";const input=document.createElement("input");input.type="checkbox";input.name="Thematiques";input.value=value;label.append(input,document.createTextNode(value));return label}));
  return Boolean(state.projectChoices?.Thematiques?.length);
}

function openProjectForm() {
  elements.form.reset(); elements.formMessage.classList.remove("is-error"); elements.formMessage.textContent = "";
  const metadataFields = [renderThemeChoices()?"Thematiques":"",fillSelect("Statut", "Sélectionner…")?"Statut":""].filter(Boolean);
  elements.form.elements.Statut.value = "À venir";
  if (!state.demo && metadataFields.length < PROJECT_CHOICE_FIELDS.length) {
    const fallbackFields = PROJECT_CHOICE_FIELDS.filter((field) => !metadataFields.includes(field));
    elements.formMessage.textContent = `Choix Grist indisponibles pour ${fallbackFields.join(", ")} : les valeurs par défaut et existantes sont proposées.`;
  }
  const people = state.tables?.INTERLOCUTEURS || [];
  fillPersonSelect(elements.form.elements.Agent_pilote, people.filter((person) => isTrue(person.Est_agent_Sanguinet) || normalizeText(person.Role_interne)==="agent"));
  fillPersonSelect(elements.form.elements.Elu_pilote, people.filter((person) => isTrue(person.Est_elu_Sanguinet) || normalizeText(person.Role_interne)==="elu"));
  const current=state.currentUser?.person,role=normalizeText(current?.Role_interne);
  if(current&&role==="agent"&&[...elements.form.elements.Agent_pilote.options].some(item=>item.value===String(current.id)))elements.form.elements.Agent_pilote.value=String(current.id);
  if(current&&role==="elu"&&[...elements.form.elements.Elu_pilote.options].some(item=>item.value===String(current.id)))elements.form.elements.Elu_pilote.value=String(current.id);
  elements.dialog.showModal(); elements.form.elements.Nom_projet.focus();
}

function fillPersonSelect(control, people) {
  control.replaceChildren(
    option("", "Non renseigné"),
    ...people.map((person) => option(String(person.id), textOr(person.Nom_complet || [person.Prenom, person.Nom].filter(Boolean).join(" "), `Interlocuteur ${person.id}`))),
  );
}

function cleanFormValues(formData) {
  const values = {};
  for (const [name, raw] of formData.entries()) {
    if (name === "Thematiques") continue;
    if (!hasValue(raw)) continue;
    if (["Agent_pilote", "Elu_pilote"].includes(name)) values[name] = Number(raw);
    else if (["Annee_lancement", "Annee_objectif"].includes(name)) values[name] = Number(raw);
    else values[name] = String(raw).trim();
  }
  const themes=formData.getAll("Thematiques").filter(hasValue);if(themes.length)values.Thematiques=["L",...themes];
  const available = state.demo ? new Set(Object.keys(state.tables?.PROJETS?.[0] || values)) : state.writable?.PROJETS;
  if (!available) throw new Error("Impossible de vérifier les colonnes éditables de PROJETS.");
  return Object.fromEntries(Object.entries(values).filter(([name]) => available.has(name) || (name === "Agent_pilote" && available.has("Responsable"))));
}

async function createProject(event) {
  event.preventDefault(); if (state.busy) return;
  const fields = cleanFormValues(new FormData(elements.form));
  if (!state.writable?.PROJETS?.has("Agent_pilote") && state.writable?.PROJETS?.has("Responsable") && fields.Agent_pilote) { fields.Responsable = fields.Agent_pilote; delete fields.Agent_pilote; }
  if (!fields.Nom_projet) return;
  state.busy = true; setFormBusy(true); elements.formMessage.textContent = "Enregistrement en cours…";
  try {
    let createdId;
    if (state.demo) {
      createdId = Math.max(0, ...state.tables.PROJETS.map((row) => Number(row.id) || 0)) + 1;
      state.tables.PROJETS.push({ id: createdId, ...fields });
    } else {
      const result = await window.grist.docApi.applyUserActions([["AddRecord", "PROJETS", null, fields]]);
      createdId = result?.retValues?.[0] ?? result?.[0]?.rowId ?? null;
      state.tables = await fetchDocumentData(Object.keys(state.tables));
    }
    state.projects = prepareDashboardData(state.tables); renderKpis(calculateKpis(state.tables, state.projects)); renderProjects();
    elements.dialog.close(); showFeedback("Projet créé et relu depuis PROJETS.");
    const created = state.projects.find((row) => String(row.id) === String(createdId)) || state.projects.find((row) => row.Nom_projet === fields.Nom_projet);
    if (created) created._justCreated = true;
  } catch (error) {
    console.error(error); elements.formMessage.textContent = `Création impossible — ${exactError(error)}`; elements.formMessage.classList.add("is-error");
  } finally { state.busy = false; setFormBusy(false); }
}

function setFormBusy(busy) { elements.form.querySelectorAll("input, textarea, select, button").forEach((control) => { control.disabled = busy; }); }
function exactError(error) { return error instanceof Error ? error.message : String(error); }
function showFeedback(message) { elements.feedback.textContent = message; elements.feedback.hidden = false; window.setTimeout(() => { elements.feedback.hidden = true; }, 4500); }

async function openProject(project) {
  const context = { id: project.id, name: textOr(project.Nom_projet, "Projet"), at: Date.now() };
  try { localStorage.setItem("pilotage-grist:selected-project", JSON.stringify(context)); } catch (_) { /* stockage facultatif */ }
  try { new BroadcastChannel("pilotage-grist").postMessage({ type: "select-project", ...context }); } catch (_) { /* canal facultatif */ }
  if (!state.demo && typeof window.grist?.setCursorPos === "function") {
    try { await window.grist.setCursorPos({ rowId: project.id }); } catch (error) { console.warn("Synchronisation Grist impossible", error); }
  }
  if (window.PilotageContext) {
    window.open(window.PilotageContext.projectPageUrl(project.id), "_top");
  } else {
    showFeedback(`${context.name} sélectionné. Ouvrez la page « Fiche projet » dans Grist.`);
  }
}

/* ---------- Démarrage du widget ---------- */
async function initializeDashboard() {
  const today = new Date();
  elements.date.dateTime = today.toISOString().slice(0, 10);
  elements.date.textContent = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).format(today);
  bindFilters();
  try {
    let tables;
    if (isLocalDemoMode()) {
      tables = window.DASHBOARD_DEMO_DATA;
      state.demo = true;
    } else {
      const tableNames = await initializeGristConnection();
      tables = await fetchDocumentData(tableNames);
      try {
        const metadata = await fetchProjectMetadata();
        state.writable = metadata.writable;
        state.projectChoices = metadata.projectChoices;
      } catch (metadataError) {
        console.warn("Métadonnées Grist indisponibles : utilisation des choix par défaut.", metadataError);
        state.writable = { PROJETS: new Set(PROJECT_FORM_FIELDS) };
        state.projectChoices = Object.fromEntries(PROJECT_CHOICE_FIELDS.map((field) => [field, []]));
      }
    }
    state.tables = tables;
    if(state.demo)state.currentUser={person:tables.INTERLOCUTEURS?.[0],personId:tables.INTERLOCUTEURS?.[0]?.id};else try{state.currentUser=await window.PilotageCurrentUser.identify({people:tables.INTERLOCUTEURS||[]})}catch(error){console.warn(error)}
    state.projects = prepareDashboardData(tables);
    renderKpis(calculateKpis(tables, state.projects));
    renderProjects();
  } catch (error) {
    console.error("Impossible de charger le tableau de bord Grist :", error);
    elements.projectGrid.hidden = true;
    elements.resultsCount.textContent = "";
    showState("error", "Connexion à Grist impossible", "Vérifiez que ce widget est ouvert depuis le document « Pilotage des projets » et qu’il dispose d’un accès en lecture.");
  }
}

initializeDashboard();
