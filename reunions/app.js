"use strict";

const REQUIRED_TABLES = ["REUNIONS", "INTERLOCUTEURS"];
const state = { project: null, meetings: [], people: [], filter: "all", search: "" };
const ui = {
  state: document.querySelector("#interface-state"), content: document.querySelector("#meetings-content"),
  projectName: document.querySelector("#project-name"), total: document.querySelector("#meeting-count"),
  kpis: document.querySelector("#meeting-kpis"), filters: document.querySelector("#filter-list"),
  search: document.querySelector("#meeting-search"), results: document.querySelector("#results-count"),
  list: document.querySelector("#meeting-list"), template: document.querySelector("#meeting-template"),
};

/* Connexion au document Grist et au projet sélectionné. */
async function initialize() {
  bindControls();
  try {
    if (isLocalDemoMode()) { applyData(window.MEETINGS_DEMO_DATA.project, window.MEETINGS_DEMO_DATA.tables); return; }
    if (!window.grist?.docApi) throw new Error("L’API Grist n’est pas disponible.");
    await Promise.resolve(window.grist.ready({ requiredAccess: "full" }));
    const tableNames = normalizeTableNames(await window.grist.docApi.listTables());
    const missing = REQUIRED_TABLES.filter((name) => !tableNames.includes(name));
    if (missing.length) throw new Error(`Tables Grist introuvables : ${missing.join(", ")}.`);
    const tables = await fetchTables(REQUIRED_TABLES);
    state.meetings = tables.REUNIONS;
    state.people = tables.INTERLOCUTEURS;
    window.grist.onRecord((record) => { state.project = record || null; render(); });
    /* Grist peut ne pas envoyer de ligne si la table source est vide ou mal configurée. */
    render();
  } catch (error) {
    console.error("Erreur de chargement du widget Réunions :", error);
    showInterfaceState("Connexion à Grist impossible", exactError(error));
  }
}

async function fetchTables(names) {
  const entries = await Promise.all(names.map(async (name) => [name, columnarToRecords(await window.grist.docApi.fetchTable(name))]));
  return Object.fromEntries(entries);
}
function applyData(project, tables) { state.project = project; state.meetings = tables.REUNIONS || []; state.people = tables.INTERLOCUTEURS || []; render(); }
function normalizeTableNames(value) { const rows = Array.isArray(value) ? value : Array.isArray(value?.tables) ? value.tables : []; return rows.map((row) => typeof row === "string" ? row : row?.id ?? row?.tableId ?? row?.name ?? "").filter(Boolean); }
function columnarToRecords(columns) { if (!columns || typeof columns !== "object") return []; const names = Object.keys(columns).filter((name) => Array.isArray(columns[name])); const length = Math.max(0, ...names.map((name) => columns[name].length)); return Array.from({ length }, (_, index) => Object.fromEntries(names.map((name) => [name, columns[name][index]]))); }
function isLocalDemoMode() { return ["localhost", "127.0.0.1"].includes(window.location.hostname) && window.self === window.top && new URLSearchParams(window.location.search).get("demo") === "1" && Boolean(window.MEETINGS_DEMO_DATA); }

/* Sélection, tri et filtrage des réunions. */
function projectMeetings() {
  if (!state.project) return [];
  return state.meetings.filter((meeting) => referenceIds(meeting.Projet).includes(String(state.project.id)))
    .sort((left, right) => dateValue(right.Date_reunion ?? right.Date) - dateValue(left.Date_reunion ?? left.Date));
}
function filteredMeetings(meetings) {
  const today = startOfToday();
  return meetings.filter((meeting) => {
    const timestamp = dateValue(meeting.Date_reunion ?? meeting.Date);
    const matchesFilter = state.filter === "all"
      || (state.filter === "upcoming" && timestamp >= today)
      || (state.filter === "past" && timestamp > 0 && timestamp < today)
      || (state.filter === "decisions" && (hasValue(meeting.Decisions_prises) || hasValue(meeting.Arbitrage_attendu)));
    const haystack = normalizeText([meeting.Objet, meeting.Type_reunion, meeting.Points_cles, meeting.Decisions_prises].filter(hasValue).join(" "));
    return matchesFilter && haystack.includes(normalizeText(state.search));
  });
}
function calculateKpis(meetings) {
  const today = startOfToday();
  return [["Total", meetings.length], ["À venir", meetings.filter((row) => dateValue(row.Date_reunion ?? row.Date) >= today).length], ["Décisions", meetings.filter((row) => hasValue(row.Decisions_prises)).length], ["Arbitrages", meetings.filter((row) => hasValue(row.Arbitrage_attendu)).length]];
}

/* Rendu de l'interface. */
function render() {
  if (!state.project) { showInterfaceState("Aucun projet sélectionné", "Sélectionnez une ligne dans la table PROJETS pour afficher ses réunions."); return; }
  const meetings = projectMeetings();
  ui.projectName.textContent = textOr(state.project.Nom_projet, "Projet sans nom");
  ui.total.textContent = `${meetings.length} ${meetings.length > 1 ? "réunions" : "réunion"}`;
  renderKpis(calculateKpis(meetings)); renderMeetingList(filteredMeetings(meetings));
  ui.state.hidden = true; ui.content.hidden = false;
}
function renderKpis(items) {
  ui.kpis.replaceChildren(...items.map(([label, value]) => { const card = element("article", "card meeting-kpi"); card.append(textElement("span", label, "meeting-kpi__label"), textElement("strong", value, "meeting-kpi__value")); return card; }));
}
function renderMeetingList(meetings) {
  ui.results.textContent = `${meetings.length} résultat${meetings.length > 1 ? "s" : ""}`;
  if (!meetings.length) { ui.list.replaceChildren(textElement("p", "Aucune réunion ne correspond à ces critères.", "card empty-results")); return; }
  ui.list.replaceChildren(...meetings.map(renderMeetingCard));
}
function renderMeetingCard(meeting) {
  const card = ui.template.content.firstElementChild.cloneNode(true);
  card.querySelector(".meeting-card__date").textContent = formatDate(meeting.Date_reunion ?? meeting.Date) || "Date non renseignée";
  card.querySelector(".meeting-card__title").textContent = textOr(meeting.Objet, "Réunion sans objet");
  const badges = card.querySelector(".meeting-card__badges");
  if (hasValue(meeting.Type_reunion)) badges.append(makeBadge(meeting.Type_reunion, "info"));
  badges.append(makeBadge(isUpcoming(meeting) ? "À venir" : "Passée", isUpcoming(meeting) ? "warning" : "success"));
  const details = card.querySelector(".meeting-card__details");
  appendDefinition(details, "Participants", peopleValue(meeting.Participants)); appendDefinition(details, "Lieu", meeting.Lieu);
  appendDefinition(details, "Durée", meeting.Duree); appendDefinition(details, "Organisateur", peopleValue(meeting.Organisateur ?? meeting.Responsable));
  const sections = card.querySelector(".meeting-card__sections");
  appendNote(sections, "Points clés", meeting.Points_cles, "info"); appendNote(sections, "Décisions prises", meeting.Decisions_prises, "decision");
  appendNote(sections, "Arbitrage attendu", meeting.Arbitrage_attendu, "arbitration"); appendNote(sections, "Prochaines étapes", meeting.Prochaines_etapes ?? meeting.Prochaine_etape, "info");
  if (!details.children.length) details.remove(); if (!sections.children.length) sections.remove(); return card;
}
function appendDefinition(container, label, value) { if (!hasValue(value)) return; const wrapper = element("div"); wrapper.append(textElement("dt", label), textElement("dd", displayValue(value))); container.append(wrapper); }
function appendNote(container, label, value, kind) { if (!hasValue(value)) return; const note = element("section", `meeting-note meeting-note--${kind}`); note.append(textElement("strong", label), textElement("p", displayValue(value))); container.append(note); }
function makeBadge(value, kind) { return textElement("span", displayValue(value), `badge badge--${kind}`); }
function showInterfaceState(title, message) { ui.content.hidden = true; const box = element("div"); box.append(textElement("strong", title), textElement("p", message)); ui.state.replaceChildren(box); ui.state.hidden = false; }

/* Contrôles locaux sans rechargement. */
function bindControls() {
  ui.filters.addEventListener("click", (event) => { const button = event.target.closest("[data-filter]"); if (!button) return; state.filter = button.dataset.filter; ui.filters.querySelectorAll("[data-filter]").forEach((item) => item.setAttribute("aria-pressed", String(item === button))); render(); });
  ui.search.addEventListener("input", () => { state.search = ui.search.value; render(); });
}

/* Formats tolérants aux cellules Grist vides. */
function peopleValue(value) { return referenceIds(value).map((id) => state.people.find((person) => String(person.id) === id)?.Nom_complet || id).join(", "); }
function referenceIds(value) { if (!hasValue(value)) return []; const values = Array.isArray(value) ? value : [value]; return values.filter((item) => item !== "L" && hasValue(item)).map(String); }
function isUpcoming(meeting) { return dateValue(meeting.Date_reunion ?? meeting.Date) >= startOfToday(); }
function startOfToday() { const date = new Date(); date.setHours(0, 0, 0, 0); return date.getTime(); }
function dateValue(value) { if (!hasValue(value)) return 0; const date = new Date(typeof value === "number" ? value * 1000 : value); return Number.isNaN(date.getTime()) ? 0 : date.getTime(); }
function formatDate(value) { const timestamp = dateValue(value); return timestamp ? new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(timestamp)) : ""; }
function hasValue(value) { return value !== null && value !== undefined && String(value).trim() !== ""; }
function displayValue(value) { if (Array.isArray(value)) return value.filter((item) => item !== "L").map(displayValue).join(", "); return hasValue(value) ? String(value).trim() : ""; }
function textOr(value, fallback) { return hasValue(value) ? displayValue(value) : fallback; }
function normalizeText(value) { return displayValue(value).toLocaleLowerCase("fr-FR").normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
function exactError(error) { return error instanceof Error ? `${error.name} : ${error.message}` : String(error); }
function element(tag, className) { const node = document.createElement(tag); if (className) node.className = className; return node; }
function textElement(tag, value, className) { const node = element(tag, className); node.textContent = displayValue(value); return node; }

initialize();
