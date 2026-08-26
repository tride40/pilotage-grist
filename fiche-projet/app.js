"use strict";

const RELATED_TABLES = [
  "INTERLOCUTEURS", "REUNIONS", "ACTIONS", "CONSIGNES_POLITIQUES",
  "ARBITRAGES_DECISIONS", "AVANCEMENTS",
];

const appState = { selectedProject: null, tables: null };
const ui = {
  state: document.querySelector("#interface-state"),
  content: document.querySelector("#project-content"),
  name: document.querySelector("#project-name"),
  code: document.querySelector("#project-code"),
  badges: document.querySelector("#project-badges"),
  people: document.querySelector("#hero-people"),
  objective: document.querySelector("#objective-card"),
  progress: document.querySelector("#progress-card"),
  vigilance: document.querySelector("#vigilance-panel"),
  updates: document.querySelector("#updates-list"),
  instructions: document.querySelector("#instructions-list"),
  meetings: document.querySelector("#meetings-list"),
  actions: document.querySelector("#actions-list"),
  arbitrations: document.querySelector("#arbitrations-list"),
  timeline: document.querySelector("#timeline-list"),
  contacts: document.querySelector("#contacts-list"),
};

/* ---------- Connexion et lecture Grist ---------- */
async function initialize() {
  showInterfaceState("loading", "Chargement de la fiche projet", "Lecture des données Grist en cours…", true);
  try {
    if (isLocalDemoMode()) {
      appState.tables = window.PROJECT_SHEET_DEMO.tables;
      appState.selectedProject = window.PROJECT_SHEET_DEMO.project;
      renderWhenReady();
      return;
    }

    if (!window.grist?.docApi) throw new Error("L’API Grist n’est pas disponible.");
    await Promise.resolve(window.grist.ready({ requiredAccess: "full" }));
    window.grist.onRecord((record) => {
      appState.selectedProject = record || null;
      renderWhenReady();
    });
    appState.tables = await fetchRelatedTables();
    renderWhenReady();
  } catch (error) {
    console.error("Erreur de connexion à Grist :", error);
    showInterfaceState("error", "Connexion à Grist impossible", exactError(error));
  }
}

async function fetchRelatedTables() {
  const entries = await Promise.all(RELATED_TABLES.map(async (tableName) => {
    const columns = await window.grist.docApi.fetchTable(tableName);
    return [tableName, columnarToRecords(columns)];
  }));
  return Object.fromEntries(entries);
}

function columnarToRecords(columns) {
  if (!columns || typeof columns !== "object") return [];
  const names = Object.keys(columns).filter((name) => Array.isArray(columns[name]));
  const length = Math.max(0, ...names.map((name) => columns[name].length));
  return Array.from({ length }, (_, index) =>
    Object.fromEntries(names.map((name) => [name, columns[name][index]])),
  );
}

function isLocalDemoMode() {
  return ["localhost", "127.0.0.1"].includes(window.location.hostname)
    && window.self === window.top
    && new URLSearchParams(window.location.search).get("demo") === "1"
    && Boolean(window.PROJECT_SHEET_DEMO);
}

/* ---------- Transformation des données du projet ---------- */
function buildProjectView(project, tables) {
  const projectId = project.id;
  const linked = (tableName) => tables[tableName].filter((row) => isLinkedToProject(row, projectId));
  const updates = sortByDate(linked("AVANCEMENTS"), ["Date_MAJ", "Date"]);
  const instructions = linked("CONSIGNES_POLITIQUES").sort(compareInstructions);
  const meetings = sortByDate(linked("REUNIONS"), ["Date_reunion", "Date"]);
  const actions = linked("ACTIONS").filter(isOpenAction).sort(compareActions);
  const arbitrations = linked("ARBITRAGES_DECISIONS").sort(compareArbitrations);

  return {
    project,
    updates: updates.slice(0, 5),
    instructions: instructions.slice(0, 5),
    meetings: meetings.slice(0, 3),
    actions,
    arbitrations,
    timeline: buildTimeline(updates, meetings, instructions, arbitrations).slice(0, 6),
    contacts: collectContacts(project, { instructions, meetings, actions }, tables.INTERLOCUTEURS),
  };
}

function isLinkedToProject(row, projectId) {
  const link = firstField(row, ["Projet", "PROJET", "Projet_ref", "Projet_ID", "Project"]);
  return referenceIds(link).some((id) => String(id) === String(projectId));
}

function referenceIds(value) {
  if (!hasValue(value)) return [];
  if (Array.isArray(value)) return value[0] === "L" ? value.slice(1) : value.flatMap(referenceIds);
  if (typeof value === "object") return [value.id ?? value.rowId].filter(hasValue);
  return [value];
}

function compareInstructions(a, b) {
  return instructionScore(b) - instructionScore(a) || dateValue(b.Echeance) - dateValue(a.Echeance);
}

function instructionScore(row) {
  return Number(!isTrue(row.Validee)) + Number(isTrue(row.A_controler)) * 2 + Number(isTrue(row.En_retard)) * 4;
}

function compareActions(a, b) {
  return Number(isTrue(b.En_retard)) - Number(isTrue(a.En_retard)) || dateValue(a.Echeance) - dateValue(b.Echeance);
}

function compareArbitrations(a, b) {
  return arbitrationScore(b) - arbitrationScore(a) || dateValue(a.Echeance_decision) - dateValue(b.Echeance_decision);
}

function arbitrationScore(row) {
  const unresolved = !["decide", "sans suite"].includes(normalizeText(row.Statut));
  return Number(isTrue(row.A_decider)) * 4 + Number(isTrue(row.Point_hebdo)) * 2 + Number(unresolved);
}

function isOpenAction(row) {
  if ("Ouverte" in row) return isTrue(row.Ouverte);
  if ("Terminee" in row) return !isTrue(row.Terminee);
  return !["termine", "terminee", "cloture", "cloturee", "annule", "annulee"].includes(normalizeText(row.Statut));
}

function sortByDate(rows, fields) {
  return [...rows].sort((a, b) => dateValue(firstField(b, fields)) - dateValue(firstField(a, fields)));
}

function buildTimeline(updates, meetings, instructions, arbitrations) {
  const events = [
    ...updates.map((row) => timelineEvent("Avancement", row.Date_MAJ, row.Travail_realise || row.Prochaine_etape)),
    ...meetings.map((row) => timelineEvent("Réunion", row.Date_reunion, row.Objet || row.Points_cles)),
    ...instructions.map((row) => timelineEvent("Consigne politique", row.Date_MAJ || row.Echeance, row.Consigne)),
    ...arbitrations.map((row) => timelineEvent("Arbitrage", row.Date_MAJ || row.Echeance_decision, row.Sujet || row.Question_a_trancher)),
  ].filter((event) => hasValue(event.date));
  return events.sort((a, b) => dateValue(b.date) - dateValue(a.date));
}

function timelineEvent(type, date, text) { return { type, date, text }; }

function collectContacts(project, related, people) {
  const values = [project.Responsable, project.Elu_pilote];
  related.meetings.forEach((row) => values.push(row.Participants));
  related.actions.forEach((row) => values.push(row.Responsable));
  related.instructions.forEach((row) => values.push(row.Responsable));
  const identifiers = values.flatMap(referenceIds).filter(hasValue);
  const found = new Map();

  identifiers.forEach((identifier) => {
    const person = people.find((candidate) =>
      String(candidate.id) === String(identifier)
      || normalizeText(candidate.Nom_complet) === normalizeText(identifier),
    );
    const contact = person || { id: `text:${identifier}`, Nom_complet: displayValue(identifier) };
    const key = hasValue(contact.id) ? `id:${contact.id}` : `name:${normalizeText(contact.Nom_complet)}`;
    found.set(key, contact);
  });
  return [...found.values()];
}

/* ---------- Rendu principal ---------- */
function renderWhenReady() {
  if (!appState.tables) return;
  if (!appState.selectedProject) {
    showInterfaceState("empty", "Aucun projet sélectionné", "Sélectionnez une ligne dans la table PROJETS pour afficher sa fiche.");
    return;
  }
  renderProject(buildProjectView(appState.selectedProject, appState.tables));
}

function renderProject(view) {
  const { project } = view;
  ui.name.textContent = textOr(project.Nom_projet, "Projet sans nom");
  setText(ui.code, project.Code_projet, "Projet");
  renderProjectBadges(project);
  renderHeroPeople(project);
  renderObjective(project);
  renderProgress(project);
  renderVigilance(project.Point_vigilance, project.Statut);
  renderUpdates(view.updates);
  renderInstructions(view.instructions);
  renderMeetings(view.meetings);
  renderActions(view.actions);
  renderArbitrations(view.arbitrations);
  renderTimeline(view.timeline);
  renderContacts(view.contacts);
  ui.state.hidden = true;
  ui.content.hidden = false;
}

function renderProjectBadges(project) {
  ui.badges.replaceChildren();
  [
    [project.Statut, statusKind(project.Statut)],
    [project.Priorite, "warning"],
    [project.Categorie, "arbitration"],
  ].filter(([value]) => hasValue(value)).forEach(([value, kind]) => ui.badges.append(makeBadge(value, kind)));
}

function renderHeroPeople(project) {
  ui.people.replaceChildren();
  appendDefinition(ui.people, "Responsable", personValue(project.Responsable));
  appendDefinition(ui.people, "Élu pilote", personValue(project.Elu_pilote));
  if (!ui.people.children.length) ui.people.hidden = true;
  else ui.people.hidden = false;
}

function renderObjective(project) {
  ui.objective.replaceChildren();
  const title = document.createElement("h2");
  title.textContent = textOr(project.Objectif_politique, "Objectif politique non renseigné");
  ui.objective.append(title);
  if (hasValue(project.Description)) ui.objective.append(textElement("p", project.Description));
}

function renderProgress(project) {
  ui.progress.replaceChildren();
  const percentage = parseProgress(project.Avancement);
  const heading = element("div", "progress-card__heading");
  heading.append(textElement("h2", "Avancement"), textElement("span", percentage === null ? "—" : `${percentage} %`, "progress-card__value"));
  ui.progress.append(heading);
  if (percentage !== null) ui.progress.append(makeProgress(percentage));
  const details = element("dl", "summary-details");
  appendDefinition(details, "Prochaine étape", project.Prochaine_etape);
  appendDefinition(details, "Date prochaine étape", formatDate(project.Date_prochaine_etape));
  appendDefinition(details, "Échéance", formatDate(project.Echeance));
  appendDefinition(details, "Dernière mise à jour", formatDate(project.Derniere_MAJ));
  if (details.children.length) ui.progress.append(details);
}

function renderVigilance(value, status) {
  ui.vigilance.replaceChildren();
  if (!hasValue(value)) return void (ui.vigilance.hidden = true);
  ui.vigilance.classList.toggle("vigilance-panel--danger", ["bloque", "retard", "en retard"].includes(normalizeText(status)));
  ui.vigilance.append(textElement("strong", "Point de vigilance"), textElement("span", value));
  ui.vigilance.hidden = false;
}

/* ---------- Rendu des sections liées ---------- */
function renderUpdates(rows) {
  renderCollection(ui.updates, rows, "Aucun avancement renseigné.", (row) => {
    const card = makeItemCard(row.Travail_realise || "Point d’avancement", row.Date_MAJ);
    appendFields(card.body, [
      ["Saisi par", personValue(row.Saisi_par)], ["Avancement", formatProgress(row.Avancement)],
      ["Travail réalisé", row.Travail_realise], ["Prochaine étape", row.Prochaine_etape],
      ["Difficulté ou blocage", row.Difficulte_blocage],
    ]);
    if (hasValue(row.Decision_attendue)) card.body.append(makeCallout("Décision attendue", row.Decision_attendue));
    return card.root;
  });
}

function renderInstructions(rows) {
  renderCollection(ui.instructions, rows, "Aucune consigne liée à ce projet.", (row) => {
    const card = makeItemCard(textOr(row.Consigne, "Consigne"), row.Echeance);
    if (isTrue(row.En_retard)) card.root.classList.add("item-card--danger");
    else if (isTrue(row.A_controler)) card.root.classList.add("item-card--warning");
    appendBadges(card.meta, [[row.Statut, statusKind(row.Statut)], [row.Priorite, "warning"], [isTrue(row.A_controler) ? "À contrôler" : "", "warning"], [isTrue(row.En_retard) ? "En retard" : "", "danger"]]);
    appendFields(card.body, [["Responsable", personValue(row.Responsable)], ["Retour du service", row.Retour_service]]);
    return card.root;
  });
}

function renderMeetings(rows) {
  renderCollection(ui.meetings, rows, "Aucune réunion liée à ce projet.", (row) => {
    const card = makeItemCard(textOr(row.Objet, "Réunion"), row.Date_reunion);
    appendBadges(card.meta, [[row.Type_reunion, "info"]]);
    appendFields(card.body, [["Participants", personValue(row.Participants)], ["Points clés", row.Points_cles], ["Décisions prises", row.Decisions_prises]]);
    if (hasValue(row.Arbitrage_attendu)) card.body.append(makeCallout("Arbitrage attendu", row.Arbitrage_attendu));
    return card.root;
  });
}

function renderActions(rows) {
  renderCollection(ui.actions, rows, "Aucune action ouverte.", (row) => {
    const card = makeItemCard(textOr(row.Action, "Action"), row.Echeance);
    if (isTrue(row.En_retard)) card.root.classList.add("item-card--danger");
    appendBadges(card.meta, [[row.Statut, statusKind(row.Statut)], [row.Priorite, "warning"], [isTrue(row.En_retard) ? "En retard" : "", "danger"], [isTrue(row.A_controler) ? "À contrôler" : "", "warning"]]);
    appendFields(card.body, [["Responsable", personValue(row.Responsable)]]);
    return card.root;
  });
}

function renderArbitrations(rows) {
  renderCollection(ui.arbitrations, rows, "Aucun arbitrage lié à ce projet.", (row) => {
    const root = element("article", "arbitration-block");
    const header = element("div", "item-card__header");
    header.append(textElement("h3", textOr(row.Sujet, "Arbitrage")));
    if (hasValue(row.Echeance_decision)) header.append(textElement("time", formatDate(row.Echeance_decision), "item-card__date"));
    const meta = element("div", "item-card__meta");
    appendBadges(meta, [[row.Type, "arbitration"], [row.Statut, statusKind(row.Statut)], [row.Urgence, "danger"], [isTrue(row.A_decider) ? "À décider" : "", "arbitration"]]);
    const body = element("div", "item-card__body");
    appendFields(body, [["Question à trancher", row.Question_a_trancher], ["Options", row.Options], ["Position élue", row.Position_elue]]);
    root.append(header, meta, body);
    return root;
  });
}

function renderTimeline(events) {
  ui.timeline.replaceChildren();
  if (!events.length) return void ui.timeline.append(makeEmpty("Aucun événement récent."));
  events.forEach((event) => {
    const item = element("li", "timeline__item");
    const content = element("div", "timeline__content");
    content.append(textElement("time", formatDate(event.date)), textElement("h3", event.type));
    if (hasValue(event.text)) content.append(textElement("p", event.text));
    item.append(element("span", "timeline__dot"), content);
    ui.timeline.append(item);
  });
}

function renderContacts(rows) {
  ui.contacts.replaceChildren();
  if (!rows.length) return void ui.contacts.append(makeEmpty("Aucun interlocuteur identifié."));
  rows.forEach((person) => {
    const card = element("article", "card contact-card");
    const wrapper = element("div", "person");
    const avatar = textElement("span", initials(person.Nom_complet), "avatar");
    const details = element("div", "person__details");
    details.append(textElement("p", textOr(person.Nom_complet, "Interlocuteur"), "person__name"));
    const meta = [person.Fonction, person.Organisme, person.Type_interlocuteur].filter(hasValue).map(displayValue).join(" · ");
    if (meta) details.append(textElement("p", meta, "person__meta"));
    wrapper.append(avatar, details);
    card.append(wrapper);
    ui.contacts.append(card);
  });
}

/* ---------- Fabrique de composants simples ---------- */
function renderCollection(container, rows, emptyMessage, renderer) {
  container.replaceChildren();
  if (!rows.length) return void container.append(makeEmpty(emptyMessage));
  rows.forEach((row) => container.append(renderer(row)));
}

function makeItemCard(title, date) {
  const root = element("article", "card item-card");
  const header = element("div", "item-card__header");
  header.append(textElement("h3", title));
  if (hasValue(date)) header.append(textElement("time", formatDate(date), "item-card__date"));
  const meta = element("div", "item-card__meta");
  const body = element("div", "item-card__body");
  root.append(header, meta, body);
  return { root, meta, body };
}

function appendFields(container, fields) {
  fields.filter(([, value]) => hasValue(value)).forEach(([label, value]) => {
    const field = element("div", "item-card__field");
    field.append(textElement("span", label, "item-label"), textElement("p", displayValue(value)));
    container.append(field);
  });
}

function appendBadges(container, badges) {
  badges.filter(([value]) => hasValue(value)).forEach(([value, kind]) => container.append(makeBadge(value, kind)));
  if (!container.children.length) container.remove();
}

function makeBadge(value, kind = "info") {
  return textElement("span", displayValue(value), `badge badge--${kind}`);
}

function makeCallout(label, value) {
  const callout = element("div", "decision-callout");
  callout.append(textElement("span", label, "item-label"), textElement("p", displayValue(value)));
  return callout;
}

function makeProgress(percentage) {
  const progress = element("div", "progress");
  progress.setAttribute("role", "progressbar");
  progress.setAttribute("aria-valuemin", "0");
  progress.setAttribute("aria-valuemax", "100");
  progress.setAttribute("aria-valuenow", String(percentage));
  const bar = element("span", "progress__bar");
  bar.style.setProperty("--progress", `${percentage}%`);
  progress.append(bar);
  return progress;
}

function makeEmpty(message) { return textElement("p", message, "empty-section"); }
function element(tag, className) { const node = document.createElement(tag); if (className) node.className = className; return node; }
function textElement(tag, text, className) { const node = element(tag, className); node.textContent = displayValue(text); return node; }

function appendDefinition(container, label, value) {
  if (!hasValue(value)) return;
  const wrapper = document.createElement("div");
  wrapper.append(textElement("dt", label), textElement("dd", displayValue(value)));
  container.append(wrapper);
}

function showInterfaceState(kind, title, message, loading = false) {
  ui.content.hidden = true;
  ui.state.className = `interface-state interface-state--${kind}`;
  ui.state.replaceChildren();
  if (loading) ui.state.append(element("span", "loader"));
  const text = document.createElement("div");
  text.append(textElement("strong", title), textElement("p", message));
  ui.state.append(text);
  ui.state.hidden = false;
}

/* ---------- Formats et valeurs Grist ---------- */
function firstField(record, fields) { for (const field of fields) if (hasValue(record[field])) return record[field]; return null; }
function personValue(value) {
  if (!hasValue(value)) return "";
  const people = appState.tables?.INTERLOCUTEURS || [];
  const names = referenceIds(value).map((identifier) => {
    const person = people.find((candidate) => String(candidate.id) === String(identifier));
    return person?.Nom_complet || identifier;
  });
  return names.map(displayValue).join(", ");
}
function hasValue(value) { return value !== null && value !== undefined && String(value).trim() !== ""; }
function displayValue(value) { if (Array.isArray(value)) return value.filter((item) => item !== "L").map(displayValue).join(", "); return hasValue(value) ? String(value).trim() : ""; }
function textOr(value, fallback) { return hasValue(value) ? displayValue(value) : fallback; }
function setText(node, value, fallback) { node.textContent = textOr(value, fallback); }
function isTrue(value) { return value === true || value === 1 || ["true", "vrai", "oui", "1"].includes(normalizeText(value)); }
function normalizeText(value) { return hasValue(value) ? String(value).trim().toLocaleLowerCase("fr-FR").normalize("NFD").replace(/[\u0300-\u036f]/g, "") : ""; }
function dateValue(value) { if (!hasValue(value)) return 0; const date = new Date(typeof value === "number" ? value * 1000 : value); return Number.isNaN(date.getTime()) ? 0 : date.getTime(); }
function formatDate(value) { if (!hasValue(value)) return ""; const timestamp = dateValue(value); return timestamp ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(timestamp)) : displayValue(value); }
function parseProgress(value) { if (!hasValue(value)) return null; const number = Number(String(value).replace("%", "").replace(",", ".")); if (!Number.isFinite(number)) return null; const percentage = number > 0 && number <= 1 ? number * 100 : number; return Math.round(Math.min(100, Math.max(0, percentage))); }
function formatProgress(value) { const percentage = parseProgress(value); return percentage === null ? "" : `${percentage} %`; }
function initials(name) { const parts = displayValue(name).split(/\s+/).filter(Boolean); return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?"; }
function exactError(error) { return error instanceof Error ? `${error.name} : ${error.message}` : String(error); }
function statusKind(value) { const status = normalizeText(value); if (["termine", "valide", "conforme", "decide"].includes(status)) return "success"; if (["bloque", "retard", "en retard"].includes(status)) return "danger"; if (["vigilance", "a controler"].includes(status)) return "warning"; if (["arbitrage", "a decider"].includes(status)) return "arbitration"; return "info"; }

initialize();
