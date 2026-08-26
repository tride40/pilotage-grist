"use strict";

/* Tables lues par le tableau de bord. */
const TABLE_NAMES = [
  "PROJETS", "INTERLOCUTEURS", "REUNIONS", "ACTIONS",
  "CONSIGNES_POLITIQUES", "ARBITRAGES_DECISIONS", "AVANCEMENTS",
];

const state = { projects: [], activeFilter: "all", search: "" };
const elements = {
  date: document.querySelector("#current-date"),
  filters: document.querySelector("#filter-list"),
  kpis: document.querySelector("#kpi-grid"),
  projectGrid: document.querySelector("#project-grid"),
  resultsCount: document.querySelector("#results-count"),
  search: document.querySelector("#project-search"),
  status: document.querySelector("#interface-state"),
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
  const requestedTables = TABLE_NAMES.filter((tableName) => tableNames.includes(tableName));
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

/* ---------- Calculs des indicateurs et liens entre tables ---------- */
function prepareDashboardData(tables) {
  const metrics = buildProjectMetrics(tables);
  return tables.PROJETS.filter(isActiveProject).map((project) => ({
    ...project,
    Responsable_affiche: personValue(project.Responsable, tables.INTERLOCUTEURS),
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
    { key: "arbitration", label: "Arbitrages à décider", value: tables.ARBITRAGES_DECISIONS.filter((row) => isTrue(row.A_decider)).length },
    { key: "late", label: "Actions en retard", value: tables.ACTIONS.filter((row) => isTrue(row.En_retard)).length },
    { key: "check", label: "Consignes à contrôler", value: tables.CONSIGNES_POLITIQUES.filter((row) => isTrue(row.A_controler)).length },
    { key: "watch", label: "Projets à surveiller", value: tables.PROJETS.filter(isProjectToWatch).length },
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
    if (item && isTrue(row.A_decider)) item.arbitrations += 1;
  });
  tables.CONSIGNES_POLITIQUES.forEach((row) => {
    const item = getMetricForLinkedProject(metrics, row);
    if (item && isTrue(row.A_controler)) item.instructions += 1;
  });
  return metrics;
}

function emptyMetrics() {
  return { openActions: 0, lateActions: 0, arbitrations: 0, instructions: 0 };
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
  return hasValue(project.Point_vigilance) || normalizeText(project.Statut) === "bloque";
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
      priority: isPriority(project.Priorite),
      watch: isProjectToWatch(project),
      arbitration: project.metrics.arbitrations > 0,
      late: project.metrics.lateActions > 0,
    }[state.activeFilter];
    return matchesSearch && Boolean(matchesFilter);
  });
}

function isPriority(value) {
  if (isTrue(value)) return true;
  return ["haute", "elevee", "prioritaire", "urgent", "urgente", "critique"].includes(normalizeText(value));
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
  setOptionalText(card.querySelector(".project-card__category"), project.Categorie);
  renderBadges(card.querySelector(".project-card__badges"), project);
  renderProgress(card.querySelector(".project-card__progress"), project.Avancement);
  renderDetails(card.querySelector(".project-card__details"), project);
  renderVigilance(card.querySelector(".project-card__vigilance"), project.Point_vigilance);
  renderMetrics(card.querySelector(".project-card__footer"), project.metrics);
  return card;
}

function renderBadges(container, project) {
  const badges = [
    { value: project.Statut, modifier: statusModifier(project.Statut), prefix: "" },
    { value: project.Priorite, modifier: "priority", prefix: "Priorité " },
  ].filter((badge) => hasValue(badge.value));
  badges.forEach(({ value, modifier, prefix }) => {
    const badge = document.createElement("span");
    badge.className = `badge badge--${modifier}`;
    badge.textContent = `${prefix}${displayValue(value)}`;
    container.append(badge);
  });
  if (badges.length === 0) container.remove();
}

function renderProgress(container, rawValue) {
  const percentage = parseProgress(rawValue);
  if (percentage === null) return container.remove();
  const heading = document.createElement("div");
  heading.className = "progress-heading";
  const label = document.createElement("span");
  const value = document.createElement("strong");
  label.textContent = "Avancement";
  value.textContent = `${percentage} %`;
  heading.append(label, value);
  const progress = document.createElement("div");
  progress.className = "progress";
  progress.setAttribute("role", "progressbar");
  progress.setAttribute("aria-label", `Avancement de ${percentage} %`);
  progress.setAttribute("aria-valuemin", "0");
  progress.setAttribute("aria-valuemax", "100");
  progress.setAttribute("aria-valuenow", String(percentage));
  const bar = document.createElement("span");
  bar.className = "progress__bar";
  bar.style.setProperty("--progress", `${percentage}%`);
  progress.append(bar);
  container.append(heading, progress);
}

function renderDetails(container, project) {
  const details = [
    ["Responsable", project.Responsable_affiche],
    ["Prochaine étape", project.Prochaine_etape],
    ["Échéance", formatDate(project.Echeance)],
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

function renderVigilance(container, value) {
  if (!hasValue(value)) return;
  const label = document.createElement("strong");
  const content = document.createElement("span");
  label.textContent = "Point de vigilance";
  content.textContent = displayValue(value);
  container.append(label, content);
  container.hidden = false;
}

function renderMetrics(container, metrics) {
  const items = [
    [metrics.openActions, "action ouverte", "actions ouvertes", "info"],
    [metrics.lateActions, "action en retard", "actions en retard", "danger"],
    [metrics.arbitrations, "arbitrage", "arbitrages", "arbitration"],
    [metrics.instructions, "consigne à contrôler", "consignes à contrôler", "warning"],
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

function parseProgress(value) {
  if (!hasValue(value)) return null;
  const numericValue = Number(String(value).replace("%", "").replace(",", "."));
  if (!Number.isFinite(numericValue)) return null;
  const percentage = numericValue > 0 && numericValue <= 1 ? numericValue * 100 : numericValue;
  return Math.round(Math.min(100, Math.max(0, percentage)));
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
    } else {
      const tableNames = await initializeGristConnection();
      tables = await fetchDocumentData(tableNames);
    }
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
