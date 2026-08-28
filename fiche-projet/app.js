"use strict";

const REQUIRED_RELATED_TABLES = [
  "PROJETS", "INTERLOCUTEURS", "REUNIONS", "ACTIONS", "CONSIGNES_POLITIQUES",
  "ARBITRAGES_DECISIONS", "AVANCEMENTS",
];
const OPTIONAL_RELATED_TABLES = ["SERVICES", "JALONS", "BLOCAGES", "VIGILANCES", "ATTENTES_EXTERNES", "RELANCES_ATTENTES", "REUNIONS_VERSIONS"];

const PROJECT_CHOICE_FIELDS = ["Thematiques", "Statut"];
const PROJECT_CHOICE_FALLBACKS = {
  Thematiques: ["Finances & Fiscalité", "Sécurité & Tranquillité publique", "Voirie & Mobilités", "Concertation & Participation citoyenne", "Solidarités & Intergénérationnel", "Enfance, Jeunesse & Éducation", "Travaux & Patrimoine bâti", "Urbanisme & Cadre de vie", "Environnement & Transition écologique", "Culture, Vie associative & Festivités", "Vie économique & Tourisme", "Sport"],
  Statut: ["À venir", "En cours", "Terminé", "Abandonné"],
};
const JOURNAL_TYPES = ["Avancement", "Information"];
const JOURNAL_RESOLUTION_TYPES = { Blocage: "Déblocage", Vigilance: "Vigilance levée", "Décision attendue": "Décision prise" };
const DECISION_OPEN_STATUSES = new Set(["a preparer", "a decider", "reportee"]);
const DECISION_CLOSED_STATUSES = new Set(["decidee", "decide", "sans suite"]);
const DECISION_STATUS_FALLBACKS = ["À préparer", "À décider", "Reportée", "Décidée", "Sans suite"];
const appState = { selectedProject: null, tables: null, tableNames: [], metadata: null, demo: false, busy: false, editingJournalId: null, editingDecisionId: null, decisionTransitionRow: null, decisionTransitionStatus: "", journalActionSource: null, deletingJournalId: null, journalSearch: "", journalTypeFilter: "", journalStateFilter: "", showAllJournal: false };
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
  journalSearch: document.querySelector("#journal-search"), journalTypeFilter: document.querySelector("#journal-type-filter"), journalStateFilter: document.querySelector("#journal-state-filter"), journalResults: document.querySelector("#journal-results"), showAllJournal: document.querySelector("#show-all-journal"),
  instructions: document.querySelector("#instructions-list"),
  meetings: document.querySelector("#meetings-list"),
  actions: document.querySelector("#actions-list"),
  arbitrations: document.querySelector("#arbitrations-list"),
  decisionButton: document.querySelector("#add-decision"), decisionDialog: document.querySelector("#decision-dialog"), decisionForm: document.querySelector("#decision-form"), decisionFields: document.querySelector("#decision-fields"), transitionDialog: document.querySelector("#decision-transition-dialog"), transitionForm: document.querySelector("#decision-transition-form"), transitionTitle: document.querySelector("#decision-transition-title"), transitionSubject: document.querySelector("#decision-transition-subject"), transitionLabel: document.querySelector("#decision-transition-label"),
  contacts: document.querySelector("#contacts-list"),
  selector: document.querySelector("#project-selector"), editButton: document.querySelector("#edit-project"), trackingButton: document.querySelector("#update-tracking"),
  editDialog: document.querySelector("#edit-dialog"), editForm: document.querySelector("#edit-form"), editFields: document.querySelector("#edit-fields"),
  trackingDialog: document.querySelector("#tracking-dialog"), trackingForm: document.querySelector("#tracking-form"), trackingFields: document.querySelector("#tracking-fields"), feedback: document.querySelector("#feedback"),
  deleteDialog: document.querySelector("#delete-dialog"), deleteForm: document.querySelector("#delete-form"),
};

/* ---------- Connexion et lecture Grist ---------- */
async function initialize() {
  bindEditing();
  showInterfaceState("loading", "Chargement de la fiche projet", "Lecture des données Grist en cours…", true);
  try {
    if (isLocalDemoMode()) {
      appState.demo = true;
      appState.tables = window.PROJECT_SHEET_DEMO.tables;
      if (!appState.tables.PROJETS?.length) appState.tables.PROJETS = [window.PROJECT_SHEET_DEMO.project];
      selectInitialProject(window.PROJECT_SHEET_DEMO.project);
      renderWhenReady();
      return;
    }

    if (!window.grist?.docApi) throw new Error("L’API Grist n’est pas disponible.");
    await Promise.resolve(window.grist.ready({ requiredAccess: "full" }));
    window.grist.onRecord((record) => {
      if (record) selectProject(record.id, false);
      renderWhenReady();
    });
    appState.tables = await fetchRelatedTables();
    appState.metadata = await fetchMetadata();
    selectInitialProject();
    renderWhenReady();
  } catch (error) {
    console.error("Erreur de connexion à Grist :", error);
    showInterfaceState("error", "Connexion à Grist impossible", exactError(error));
  }
}

async function fetchRelatedTables() {
  const listed=await window.grist.docApi.listTables(),available=(Array.isArray(listed)?listed:(listed?.tables||[])).map(row=>typeof row==="string"?row:row?.id??row?.tableId??row?.name??"").filter(Boolean),missing=REQUIRED_RELATED_TABLES.filter(name=>!available.includes(name));
  if(missing.length)throw new Error(`Tables Grist introuvables : ${missing.join(", ")}.`);
  appState.tableNames=available;const names=[...REQUIRED_RELATED_TABLES,...OPTIONAL_RELATED_TABLES.filter(name=>available.includes(name))];
  const entries = await Promise.all(names.map(async (tableName) => {
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
async function fetchMetadata() {
  try {
    const [tableMeta, columnMeta] = await Promise.all([window.grist.docApi.fetchTable("_grist_Tables"), window.grist.docApi.fetchTable("_grist_Tables_column")]);
    const tableIds = new Map(columnarToRecords(tableMeta).map((row) => [String(row.id), row.tableId]));
    const columns = columnarToRecords(columnMeta);
    const byTable = (table) => columns.filter((column) => tableIds.get(String(column.parentId)) === table);
    const details = Object.fromEntries(["PROJETS", "AVANCEMENTS", "ARBITRAGES_DECISIONS"].map((table) => [table, new Map(byTable(table).map((column) => [column.colId, column]))]));
    const writable = Object.fromEntries(Object.entries(details).map(([table, map]) => [table, new Set([...map.values()].filter(isWritableColumn).map((column) => column.colId))]));
    const choices = Object.fromEntries(PROJECT_CHOICE_FIELDS.map((field) => [field, extractChoiceValues(details.PROJETS.get(field))]));
    return { details, writable, choices };
  } catch (error) {
    console.warn("Métadonnées Grist indisponibles : fallbacks sûrs activés.", error);
    return { details: {}, writable: { PROJETS: new Set(Object.keys(appState.tables.PROJETS?.[0] || {})), AVANCEMENTS: new Set(Object.keys(appState.tables.AVANCEMENTS?.[0] || {})), ARBITRAGES_DECISIONS: new Set(Object.keys(appState.tables.ARBITRAGES_DECISIONS?.[0] || {})) }, choices: Object.fromEntries(PROJECT_CHOICE_FIELDS.map((field) => [field, []])), warning: exactError(error) };
  }
}
function isWritableColumn(column) {
  if (!column) return false;
  // Grist peut renvoyer isFormula=true pour une colonne de données encore vide.
  // Une vraie colonne calculée cumule isFormula=true et une formule non vide.
  if (Object.prototype.hasOwnProperty.call(column, "isFormula")) return !(isTrue(column.isFormula) && hasValue(column.formula));
  return !hasValue(column.formula);
}
function extractChoiceValues(column) {
  if (!column || !["Choice", "ChoiceList"].includes(String(column.type || "").split(":")[0])) return [];
  for (const raw of [column.widgetOptions, column.options]) {
    const options = decodeMetadataOptions(raw); const values = options?.choices ?? options?.choiceValues ?? options?.values;
    if (Array.isArray(values)) return values.filter((value) => value !== "L" && hasValue(value)).map(displayValue);
  }
  return [];
}
function decodeMetadataOptions(value) { if (!hasValue(value)) return null; if (typeof value === "object") return value; try { const decoded = JSON.parse(value); return typeof decoded === "string" ? decodeMetadataOptions(decoded) : decoded; } catch (_) { return null; } }

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
  const updates = sortJournalRows(linked("AVANCEMENTS"));
  const instructions = linked("CONSIGNES_POLITIQUES").sort(compareInstructions);
  const meetings = sortByDate(linked("REUNIONS"), ["Date_reunion", "Date"]);
  const actions = linked("ACTIONS").filter(isOpenAction).sort(compareActions);
  const arbitrations = linked("ARBITRAGES_DECISIONS").sort(compareArbitrations);

  return {
    project,
    updates,
    instructions: instructions.slice(0, 5),
    meetings: meetings.slice(0, 3),
    actions,
    arbitrations,
    contacts: collectContacts(project, { instructions, meetings, actions }, tables.INTERLOCUTEURS),
  };
}

function isLinkedToProject(row, projectId) {
  const link = firstField(row, ["Projet", "PROJET", "Projet_ref", "Projet_ID", "Project"]);
  return referenceIds(link).some((id) => String(id) === String(projectId));
}

function referenceIds(value) {
  if (!hasReferenceValue(value)) return [];
  if (Array.isArray(value)) return (value[0] === "L" ? value.slice(1) : value).flatMap(referenceIds);
  if (typeof value === "object") return [value.id ?? value.rowId].filter(hasReferenceValue);
  return [value];
}

function hasReferenceValue(value) {
  return hasValue(value) && Number(value) !== 0;
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

function isActionAwaitingControl(row) {
  const status = normalizeText(row.Statut);
  const completed = Boolean(dateValue(row.Date_realisation)) || ["realisee", "terminee", "controle", "validee"].some((value) => status.includes(value));
  return completed && (isTrue(row.A_controler) || (isTrue(row.Controle_requis) && !isTrue(row.Controle_effectue)) || status.includes("controler"));
}

function sortByDate(rows, fields) {
  return [...rows].sort((a, b) => dateValue(firstField(b, fields)) - dateValue(firstField(a, fields)));
}
function sortJournalRows(rows) {
  return [...rows].sort((a, b) => dateValue(firstField(b, ["Date_evenement", "Date_MAJ", "Date"])) - dateValue(firstField(a, ["Date_evenement", "Date_MAJ", "Date"])) || dateValue(b.Cree_le) - dateValue(a.Cree_le) || (Number(b.id) || 0) - (Number(a.id) || 0));
}

function buildTimeline(updates, meetings, instructions, arbitrations) {
  const events = [
    ...updates.map((row) => timelineEvent(journalType(row)||"Journal", row.Date_evenement||row.Date_MAJ, journalContent(row))),
    ...meetings.map((row) => timelineEvent("Réunion", row.Date_reunion, row.Objet || row.Points_cles)),
    ...instructions.map((row) => timelineEvent("Consigne politique", row.Date_MAJ || row.Echeance, row.Consigne)),
    ...arbitrations.map((row) => timelineEvent("Décision", row.Date_MAJ || row.Echeance_decision, row.Sujet || row.Question_a_trancher)),
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
  renderProjectSelector();
  if (!appState.selectedProject) {
    showInterfaceState("empty", "Aucun projet sélectionné", "Choisissez un projet dans le sélecteur ci-dessus.");
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
  renderContacts(view.contacts);
  renderHubLinks(project.id);
  ui.state.hidden = true;
  ui.content.hidden = false;
}

function renderHubLinks(projectId) {
  const context = window.PilotageContext;
  const links = [["#hub-actions", "../actions/"], ["#hub-meetings", "../reunions/"], ["#hub-instructions", "../consignes/"]];
  links.forEach(([selector, path]) => { const link = document.querySelector(selector); if (link) link.href = context?.url(path, { projectId, mode: "project" }) || `${path}?projectId=${encodeURIComponent(projectId)}&mode=project`; });
}

function renderProjectBadges(project) {
  ui.badges.replaceChildren();
  [
    [project.Statut, statusKind(project.Statut)],
    [displayValue(project.Thematiques), "arbitration"],
  ].filter(([value]) => hasValue(value)).forEach(([value, kind]) => ui.badges.append(makeBadge(value, kind)));
}

function renderHeroPeople(project) {
  ui.people.replaceChildren();
  appendDefinition(ui.people, "Agent pilote", personValue(project.Agent_pilote || project.Responsable));
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
  const heading = element("div", "progress-card__heading");
  heading.append(textElement("h2", "Situation actuelle"));
  ui.progress.append(heading);
  const details = element("dl", "summary-details");
  appendDefinition(details, "Lancement", [project.Mois_lancement, project.Annee_lancement].filter(hasValue).join(" "));
  appendDefinition(details, "Objectif de réalisation", [project.Trimestre_objectif, project.Annee_objectif].filter(hasValue).join(" "));
  const linked=(table)=>((appState.tables?.[table]||[]).filter(row=>isLinkedToProject(row,project.id))),active=(table,field)=>linked(table).filter(row=>!(field in row)||isTrue(row[field]));
  const blockages=active("BLOCAGES","Actif"),vigilances=active("VIGILANCES","Active"),expectations=linked("ATTENTES_EXTERNES").filter(row=>!["recue","sans suite"].includes(normalizeText(row.Statut))),milestones=linked("JALONS").filter(row=>!isTrue(row.Franchi));
  appendDefinition(details,"Blocages actifs",blockages.length?String(blockages.length):"");appendDefinition(details,"Vigilances actives",vigilances.length?String(vigilances.length):"");appendDefinition(details,"Attentes externes",expectations.length?String(expectations.length):"");appendDefinition(details,"Jalons à venir",milestones.length?String(milestones.length):"");
  appendDefinition(details, "Dernière mise à jour", formatDate(project.Derniere_MAJ));
  if (details.children.length) ui.progress.append(details);
  const alerts=[...blockages.slice(0,3).map(row=>["Blocage",row.Blocage,"danger"]),...vigilances.slice(0,3).map(row=>["Vigilance",row.Vigilance,"warning"])];if(alerts.length){const list=element("div","situation-list");alerts.forEach(([label,value,tone])=>{const item=element("div",`alert alert--${tone}`);item.append(textElement("strong",label),textElement("span",value));list.append(item)});ui.progress.append(list)}
  ui.progress.classList.remove("progress-card--next-step");
}
function currentNextSteps(projectId) {
  const rows = (appState.tables?.AVANCEMENTS || []).filter((row) => isLinkedToProject(row, projectId));
  const stored = rows.filter((row) => journalType(row) === "Prochaine étape" && journalEntryState(row, rows) !== "Résolu");
  const project = (appState.tables?.PROJETS || []).find((row) => String(row.id) === String(projectId));
  const legacy = legacyNextStep(project, stored);
  return [...stored, ...(legacy ? [legacy] : [])].sort((a, b) => dateValue(a.Date_prochaine_etape) - dateValue(b.Date_prochaine_etape));
}
function legacyNextStep(project, stored = []) {
  if (!project || !hasValue(project.Prochaine_etape)) return null;
  const same = stored.some((row) => normalizeText(journalContent(row)) === normalizeText(project.Prochaine_etape) && dateInputValue(row.Date_prochaine_etape) === dateInputValue(project.Date_prochaine_etape));
  return same ? null : { id: "legacy", Projet: project.id, Type_entree: "Prochaine étape", Contenu: project.Prochaine_etape, Date_prochaine_etape: project.Date_prochaine_etape, Etat_entree: "Ouvert", legacy: true };
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
  fillJournalTypeFilter(rows);
  const filtered = rows.filter((row) => {
    const type = journalType(row), state = journalEntryState(row, rows);
    const haystack = normalizeText([type, journalContent(row), personValue(row.Saisi_par), personValue(row.Decisionnaire), row.Prochaine_etape, row.Point_vigilance, row.Difficulte_blocage, row.Decision_attendue].filter(hasValue).join(" "));
    return (!appState.journalSearch || haystack.includes(normalizeText(appState.journalSearch))) && (!appState.journalTypeFilter || type === appState.journalTypeFilter) && (!appState.journalStateFilter || state === appState.journalStateFilter);
  });
  const hasFilters = Boolean(appState.journalSearch || appState.journalTypeFilter || appState.journalStateFilter);
  const displayed = appState.showAllJournal || hasFilters ? filtered : filtered.slice(0, 5);
  ui.journalResults.textContent = `${filtered.length} entrée${filtered.length > 1 ? "s" : ""}`;
  ui.showAllJournal.hidden = filtered.length <= 5 || hasFilters;
  ui.showAllJournal.textContent = appState.showAllJournal ? "Réduire" : `Tout afficher (${filtered.length})`;
  renderCollection(ui.updates, displayed, rows.length ? "Aucune entrée ne correspond à ces filtres." : "Le journal est vide. Ajoutez le premier changement de ce projet.", (row) => {
    const content = journalContent(row);
    const type = journalType(row);
    const card = makeItemCard(textOr(row.Titre,type), row.Date_evenement || row.Date_MAJ || row.Date, journalDateLabel(row));
    card.root.classList.add("journal-card");
    card.root.dataset.kind = journalKind(type);
    appendBadges(card.meta, [[journalEntryState(row, rows), journalEntryState(row, rows) === "Résolu" ? "success" : "info"]]);
    if (hasValue(content)) card.body.append(textElement("p", content, "journal-card__text"));
    appendFields(card.body, [
      ["Saisi par", personValue(row.Saisi_par)], ["Décisionnaire", personValue(row.Decisionnaire)],
      ["Avancement", type === "Avancement" ? formatProgress(row.Avancement) : ""],
      ["Prochaine étape", row.Prochaine_etape], ["Date prochaine étape", formatDate(row.Date_prochaine_etape)], ["Difficulté ou blocage", row.Difficulte_blocage],
      ["Point de vigilance", row.Point_vigilance], ["Commentaire", row.Commentaire],
    ]);
    if (hasValue(row.Decision_attendue)) card.body.append(makeCallout("Décision attendue", row.Decision_attendue));
    const actions = element("div", "journal-card__actions");
    const edit = textElement("button", "Modifier", "button button--secondary"); edit.type = "button"; edit.addEventListener("click", () => openJournalForm(row));
    const remove = textElement("button", "Supprimer", "button button--ghost-danger"); remove.type = "button"; remove.addEventListener("click", () => confirmDeleteJournal(row.id));
    const resolutionType = JOURNAL_RESOLUTION_TYPES[type];
    if (resolutionType && journalEntryState(row, rows) !== "Résolu") {
      const label = type === "Blocage" ? "Marquer comme débloqué" : type === "Vigilance" ? "Lever la vigilance" : "Exprimer la décision";
      const resolve = textElement("button", label, "button button--primary"); resolve.type = "button"; resolve.addEventListener("click", () => openJournalResolution(row, resolutionType)); actions.append(resolve);
    }
    actions.append(edit, remove); card.body.append(actions);
    return card.root;
  });
}
function fillJournalTypeFilter(rows) {
  const selected = appState.journalTypeFilter;
  const values = [...new Set(rows.map(journalType).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr"));
  ui.journalTypeFilter.replaceChildren(option("", "Tous les types"), ...values.map((value) => option(value, value))); ui.journalTypeFilter.value = selected;
}

function journalType(row) { return textOr(row.Type_entree || row.Type, inferJournalType(row)); }
function inferJournalType(row) { if (hasValue(row.Decision_attendue)) return "Décision attendue"; if (hasValue(row.Difficulte_blocage)) return "Blocage"; if (hasValue(row.Point_vigilance)) return "Vigilance"; if (hasValue(row.Avancement)) return "Avancement"; return "Information"; }
function journalContent(row) { return firstField(row, ["Description", "Contenu", "Fait_marquant", "Travail_realise", "Commentaire", "Prochaine_etape", "Difficulte_blocage", "Decision_attendue", "Point_vigilance"]); }
function journalDateLabel(row) { const date = formatDate(row.Date_evenement || row.Date_MAJ || row.Date); const time = formatTime(row.Date_evenement || row.Cree_le); return [date, time].filter(Boolean).join(" · "); }
function journalKind(type) { const value = normalizeText(type); if (["deblocage", "vigilance levee", "decision prise", "etape franchie"].includes(value)) return "success"; if (value.includes("blocage")) return "danger"; if (value.includes("vigilance")) return "warning"; if (value.includes("decision")) return "arbitration"; if (value.includes("etape")) return "info"; return "info"; }
function journalEntryState(row, rows) {
  if (!JOURNAL_RESOLUTION_TYPES[journalType(row)] && journalType(row) !== "Prochaine étape") return "";
  const resolvedByChild = rows.some((candidate) => referenceIds(candidate.Entree_parent).some((id) => String(id) === String(row.id)) && ["deblocage", "vigilance levee", "decision prise", "etape franchie"].includes(normalizeText(journalType(candidate))));
  return resolvedByChild || normalizeText(row.Etat_entree) === "resolu" ? "Résolu" : "Ouvert";
}

function renderInstructions(rows) {
  renderCollection(ui.instructions, rows, "Aucune consigne liée à ce projet.", (row) => {
    const card = makeItemCard(textOr(row.Consigne, "Consigne"), row.Echeance);
    if (isTrue(row.En_retard)) card.root.classList.add("item-card--danger");
    else if (isTrue(row.A_controler)) card.root.classList.add("item-card--warning");
    appendBadges(card.meta, [[row.Statut, statusKind(row.Statut)]]);
    appendFields(card.body, [["Émetteur", personValue(row.Emetteur)], ["Destinataire(s)", personValue(row.Destinataires || row.Responsable)]]);
    return card.root;
  });
}

function renderMeetings(rows) {
  renderCollection(ui.meetings, rows, "Aucune réunion liée à ce projet.", (row) => {
    const card = makeItemCard(textOr(row.Objet, "Réunion"), row.Date_reunion);
    appendBadges(card.meta, [[row.Type_reunion, "info"]]);
    appendFields(card.body, [["Participants", personValue(row.Participants)], ["Points clés", row.Points_cles], ["Décisions prises", row.Decisions_prises]]);
    if (hasValue(row.Arbitrage_attendu)) card.body.append(makeCallout("Décision à prendre", row.Arbitrage_attendu));
    return card.root;
  });
}

function renderActions(rows) {
  renderCollection(ui.actions, rows, "Aucune action ouverte.", (row) => {
    const card = makeItemCard(textOr(row.Action, "Action"), row.Echeance);
    if (isTrue(row.En_retard)) card.root.classList.add("item-card--danger");
    appendBadges(card.meta, [[row.Statut, statusKind(row.Statut)], [isTrue(row.En_retard) ? "En retard" : "", "danger"]]);
    appendFields(card.body, [["Attribuée à", personValue(row.Attribuee_a || row.Responsable)]]);
    return card.root;
  });
}

function renderArbitrations(rows) {
  const open = rows.filter(isOpenDecision), closed = rows.filter((row) => !isOpenDecision(row));
  ui.arbitrations.replaceChildren();
  if (!rows.length) return void ui.arbitrations.append(makeEmpty("Aucune décision liée à ce projet."));
  [["Décisions ouvertes", open], ["Décisions closes", closed]].forEach(([title, group]) => {
    if (!group.length) return;
    const section = element("section", "decision-group"); section.append(textElement("h3", `${title} · ${group.length}`, "decision-group__title"));
    const list = element("div", "stack-list");
    group.forEach((row) => {
    const root = element("article", `arbitration-block card${isOpenDecision(row) ? " decision-card--open" : " decision-card--closed"}`);
    const header = element("div", "item-card__header");
    header.append(textElement("h4", textOr(row.Sujet, "Décision")));
    if (hasValue(row.Echeance_decision)) header.append(textElement("time", formatDate(row.Echeance_decision), "item-card__date"));
    const meta = element("div", "item-card__meta");
    appendBadges(meta, [[row.Statut, statusKind(row.Statut)]]);
    const body = element("div", "item-card__body");
    appendFields(body, [["Contexte", row.Contexte], ["Question à trancher", row.Question_a_trancher], ["Options", row.Options], ["Position élue", row.Position_elue], ["Décision prise", row.Decision_prise], ["Date de décision", formatDate(row.Date_decision)], ["Instance", row.Instance_decision], ["Décision par", personValue(row.Decision_par)]]);
    const controls = element("div", "journal-card__actions");
    if (isOpenDecision(row)) {
      controls.append(decisionWorkflowButton("Reporter", "secondary", () => transitionDecision(row, "Reportée")), decisionWorkflowButton("Décider", "primary", () => openDecisionForm(row, "Décidée")), decisionWorkflowButton("Classer sans suite", "ghost-danger", () => transitionDecision(row, "Sans suite")));
    } else {
      controls.append(decisionWorkflowButton("Consulter / compléter", "secondary", () => openDecisionForm(row)));
    }
    body.append(controls);
    root.append(header, meta, body);
    list.append(root);
    }); section.append(list); ui.arbitrations.append(section);
  });
}
function isOpenDecision(row) { const status = normalizeText(row.Statut); return DECISION_OPEN_STATUSES.has(status) || (!DECISION_CLOSED_STATUSES.has(status) && !isTrue(row.Transmis)); }
function decisionWorkflowButton(label, kind, handler) { const button = textElement("button", label, `button button--${kind}`); button.type = "button"; button.addEventListener("click", () => Promise.resolve(handler()).catch((error) => showFeedback(`Mise à jour impossible — ${exactError(error)}`))); return button; }
function transitionDecision(row, status) {
  appState.decisionTransitionRow = row; appState.decisionTransitionStatus = status; ui.transitionForm.reset();
  ui.transitionTitle.textContent = status === "Reportée" ? "Reporter la décision" : "Classer la décision sans suite";
  ui.transitionLabel.textContent = status === "Reportée" ? "Motif du report *" : "Motif du classement sans suite *";
  ui.transitionSubject.textContent = textOr(row.Sujet, "Décision"); ui.transitionDialog.querySelector(".form-message").textContent = ""; ui.transitionDialog.showModal(); ui.transitionForm.elements.Motif.focus();
}
async function saveDecisionTransition(event) {
  event.preventDefault(); const row = appState.decisionTransitionRow, status = appState.decisionTransitionStatus, reason = ui.transitionForm.elements.Motif.value.trim();
  if (!row || !status || !reason) return;
  const timestamp = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date());
  const entry = `${timestamp} — ${status} — ${reason}`;
  const values = { Statut: status };
  if (decisionHasColumn("Motif_report") && status === "Reportée") values.Motif_report = reason;
  if (decisionHasColumn("Historique_evolution")) values.Historique_evolution = [displayValue(row.Historique_evolution), entry].filter(Boolean).join("\n");
  await writeChanges(ui.transitionDialog, [["UpdateRecord", "ARBITRAGES_DECISIONS", row.id, values]], `Décision ${status.toLocaleLowerCase("fr-FR")}.`);
  appState.decisionTransitionRow = null; appState.decisionTransitionStatus = "";
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

function makeItemCard(title, date, dateLabel = "") {
  const root = element("article", "card item-card");
  const header = element("div", "item-card__header");
  header.append(textElement("h3", title));
  if (hasValue(date)) header.append(textElement("time", dateLabel || formatDate(date), "item-card__date"));
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
  bar.style.width = `${percentage}%`;
  bar.dataset.level = percentage >= 100 ? "complete" : percentage >= 60 ? "good" : percentage >= 30 ? "medium" : "start";
  progress.append(bar);
  return progress;
}

/* ---------- Sélection autonome et édition ---------- */
const PROJECT_FIELDS = [
  ["Nom_projet", "Nom du projet", "text"], ["Description", "Description", "textarea"], ["Objectif_politique", "Objectif politique", "textarea"],
  ["Thematiques", "Thématique(s)", "choicelist"], ["Statut", "Statut", "choice"], ["Agent_pilote", "Agent pilote", "agent"], ["Responsable", "Agent pilote (compatibilité)", "agent"], ["Elu_pilote", "Élu pilote", "elu"],
  ["Mois_lancement", "Mois de lancement", "text"], ["Annee_lancement", "Année de lancement", "number"], ["Trimestre_objectif", "Trimestre objectif", "text"], ["Annee_objectif", "Année objectif", "number"], ["Motif_abandon", "Motif d’abandon", "textarea"],
];

function bindEditing() {
  ui.selector.addEventListener("change", () => selectProject(ui.selector.value, true)); ui.editButton.addEventListener("click", openProjectForm); ui.trackingButton.addEventListener("click", () => openJournalForm());
  document.querySelector("#add-journal-inline").addEventListener("click", () => openJournalForm());
  ui.decisionButton.addEventListener("click", () => openDecisionForm());
  document.querySelectorAll("dialog [data-close]").forEach((button) => button.addEventListener("click", () => button.closest("dialog").close()));
  ui.editForm.addEventListener("submit", saveProject); ui.trackingForm.addEventListener("submit", saveJournal); ui.decisionForm.addEventListener("submit", saveDecision); ui.transitionForm.addEventListener("submit", saveDecisionTransition); ui.deleteForm.addEventListener("submit", deleteJournal);
  ui.journalSearch.addEventListener("input", () => { appState.journalSearch = ui.journalSearch.value; renderWhenReady(); });
  ui.journalTypeFilter.addEventListener("change", () => { appState.journalTypeFilter = ui.journalTypeFilter.value; renderWhenReady(); });
  ui.journalStateFilter.addEventListener("change", () => { appState.journalStateFilter = ui.journalStateFilter.value; renderWhenReady(); });
  ui.showAllJournal.addEventListener("click", () => { appState.showAllJournal = !appState.showAllJournal; renderWhenReady(); });
  try { const channel = new BroadcastChannel("pilotage-grist"); channel.addEventListener("message", (event) => { if (event.data?.type === "select-project") selectProject(event.data.id, true); }); } catch (_) { /* facultatif */ }
}
function selectInitialProject(fallback) {
  const queryId = window.PilotageContext?.projectId || new URLSearchParams(location.search).get("project"); let stored;
  try { stored = JSON.parse(localStorage.getItem("pilotage-grist:selected-project") || "null")?.id; } catch (_) { stored = null; }
  selectProject(queryId || stored || fallback?.id || appState.tables.PROJETS?.[0]?.id, false);
}
function selectProject(id, sync) {
  const project = appState.tables?.PROJETS?.find((row) => String(row.id) === String(id)); if (!project) return;
  appState.selectedProject = project; try { localStorage.setItem("pilotage-grist:selected-project", JSON.stringify({id:project.id,name:project.Nom_projet,at:Date.now()})); } catch (_) {}
  if (sync && !appState.demo && typeof window.grist?.setCursorPos === "function") window.grist.setCursorPos({rowId:project.id}).catch(()=>{});
  renderWhenReady();
}
function renderProjectSelector() {
  const selected = String(appState.selectedProject?.id || ""); ui.selector.replaceChildren(...(appState.tables.PROJETS || []).map((project) => option(project.id, textOr(project.Nom_projet, `Projet ${project.id}`)))); ui.selector.value = selected; ui.selector.disabled = Boolean(window.PilotageContext?.isProjectMode);
}
function option(value,label){const item=document.createElement("option");item.value=value;item.textContent=label;return item;}
function openProjectForm() {
  ui.editFields.replaceChildren(...PROJECT_FIELDS.filter(([name]) => projectHasColumn(name) && !(name === "Responsable" && projectHasColumn("Agent_pilote"))).map(([name, label, type]) => formField(name, label, type, appState.selectedProject[name])));
  const fallback = PROJECT_CHOICE_FIELDS.filter((field) => !(appState.metadata?.choices?.[field] || []).length);
  ui.editDialog.querySelector(".form-message").textContent = fallback.length ? `Choix Grist indisponibles pour ${fallback.join(", ")} : valeurs existantes et valeurs sûres proposées.` : "";
  ui.editDialog.showModal();
}
function projectHasColumn(name){return appState.demo?(appState.tables.PROJETS || []).some((row)=>Object.prototype.hasOwnProperty.call(row,name)):Boolean(appState.metadata?.writable?.PROJETS?.has(name));}
function projectChoiceValues(field) { const metadata = appState.metadata?.choices?.[field] || []; const existing = (appState.tables.PROJETS || []).map((row) => displayValue(row[field])).filter(Boolean); return [...new Set([...(metadata.length ? metadata : (PROJECT_CHOICE_FALLBACKS[field] || [])), ...existing])]; }
function formField(name,label,type,value){const wrapper=element("label",`form-field${type==="textarea"||type==="choicelist"?" form-field--wide":""}`);wrapper.append(textElement("span",label,"form-field__label"));let control;if(type==="textarea"){control=document.createElement("textarea");control.rows=3;}else if(type==="choice"||type==="choicelist"){control=document.createElement("select");const values=projectChoiceValues(name);if(type==="choice")control.append(option("","Non renseigné"));control.append(...values.map((item)=>option(item,item)));if(type==="choicelist"){control.multiple=true;control.size=Math.min(6,values.length);const selected=new Set(referenceIds(value));[...control.options].forEach(item=>{item.selected=selected.has(item.value)})}}else if(["agent","elu"].includes(type)){control=document.createElement("select");const flag=type==="agent"?"Est_agent_Sanguinet":"Est_elu_Sanguinet";const role=type==="agent"?"agent":"elu",people=(appState.tables.INTERLOCUTEURS||[]).filter((person)=>isTrue(person[flag])||normalizeText(person.Role_interne)===role);control.append(option("","Non renseigné"),...people.map((p)=>option(p.id,textOr(p.Nom_complet,`Interlocuteur ${p.id}`))));}else{control=document.createElement("input");control.type=type;if(type==="number"){control.min=2000;control.max=2200;}}control.className="form-field__control";control.name=name;if(type!=="choicelist")control.value=type==="date"?dateInputValue(value):displayValue(value);wrapper.append(control);return wrapper;}
function dateInputValue(value){if(!hasValue(value))return "";const d=new Date(typeof value==="number"?value*1000:value);return Number.isNaN(d.getTime())?"":d.toISOString().slice(0,10);}
function valuesFromForm(form, allowed){const data=new FormData(form),values={};for(const [name,raw] of data.entries()){if(!allowed.includes(name)||name==="Thematiques")continue;if(["Responsable","Agent_pilote","Elu_pilote"].includes(name))values[name]=hasValue(raw)?Number(raw):null;else if(["Annee_lancement","Annee_objectif"].includes(name))values[name]=hasValue(raw)?Number(raw):null;else values[name]=String(raw).trim();}if(allowed.includes("Thematiques"))values.Thematiques=["L",...data.getAll("Thematiques").filter(hasValue)];return values;}
async function saveProject(event){event.preventDefault();const allowed=PROJECT_FIELDS.map(([name])=>name).filter(projectHasColumn),values=valuesFromForm(ui.editForm,allowed),next={...appState.selectedProject,...values},message=ui.editDialog.querySelector(".form-message"),errors=window.PilotageV3Rules?.projectErrors(next)||[],changes=window.PilotageV3Rules?.projectJournalChanges(appState.selectedProject,next)||[];if(errors.length){message.textContent=errors[0];return}try{const actions=[["UpdateRecord","PROJETS",appState.selectedProject.id,values]];if(changes.length){const schema=journalSchema(),now=Math.floor(Date.now()/1000);for(const change of changes)actions.push(["AddRecord","AVANCEMENTS",null,automaticJournalValues(schema,change,appState.selectedProject,next,now)])}await writeChanges(ui.editDialog,actions,changes.length?"Projet mis à jour et changement tracé dans le Journal.":"Projet mis à jour.")}catch(error){message.textContent=`Modification impossible — ${exactError(error)}`}}
function automaticJournalValues(schema,change,before,after,now){const labels={Elu_pilote:"Élu pilote",Agent_pilote:"Agent pilote",Trimestre_objectif:"Trimestre objectif",Annee_objectif:"Année objectif"},value=(field,project)=>["Elu_pilote","Agent_pilote"].includes(field)?personValue(project[field]??(field==="Agent_pilote"?project.Responsable:null)):textOr(project[field],"non renseigné"),details=change.fields.map(field=>`${labels[field]} : ${value(field,before)} → ${value(field,after)}`).join(" ; "),row={[schema.project]:before.id,[schema.date]:now,[schema.type]:change.type,[schema.content]:details};if(schema.title)row[schema.title]=change.type;if(schema.createdAt)row[schema.createdAt]=now;if(schema.automatic)row[schema.automatic]=true;return row}

const DECISION_FIELDS = [
  ["Sujet", "Sujet", "text"], ["Contexte", "Contexte", "textarea"], ["Question_a_trancher", "Question à trancher", "textarea"],
  ["Options", "Options", "textarea"], ["Position_elue", "Position élue", "textarea"], ["Urgence", "Urgence", "choice"],
  ["Echeance_decision", "Date nécessaire", "date"], ["Statut", "Statut", "choice"],
];
const DECISION_RESULT_FIELDS = [
  ["Decision_prise", "Décision prise", "textarea"], ["Date_decision", "Date de décision", "date"], ["Instance_decision", "Instance de décision", "text"], ["Decision_par", "Décision par", "person"],
];
function decisionHasColumn(name) { return appState.demo ? (appState.tables.ARBITRAGES_DECISIONS || []).some((row) => Object.prototype.hasOwnProperty.call(row, name)) : Boolean(appState.metadata?.writable?.ARBITRAGES_DECISIONS?.has(name)); }
function decisionChoices(name) {
  const column = appState.metadata?.details?.ARBITRAGES_DECISIONS?.get(name), metadata = extractChoiceValues(column);
  const existing = (appState.tables.ARBITRAGES_DECISIONS || []).map((row) => displayValue(row[name])).filter(Boolean);
  const fallback = name === "Statut" ? DECISION_STATUS_FALLBACKS : name === "Urgence" ? ["Normale", "Haute", "Urgente", "Critique"] : [];
  return [...new Set([...(metadata.length ? metadata : fallback), ...existing])];
}
function decisionField(name, label, type, value) {
  if (type === "person") {
    const wrapper = formField(name, label, "elu", value); wrapper.querySelector("select").replaceChildren(option("", "Non renseigné"), ...(appState.tables.INTERLOCUTEURS || []).map((person) => option(person.id, textOr(person.Nom_complet, `Interlocuteur ${person.id}`)))); return wrapper;
  }
  if (type === "checkbox") { const wrapper = element("label", "switch-field form-field--wide"), control = document.createElement("input"); control.type = "checkbox"; control.name = name; control.checked = isTrue(value); wrapper.append(control, textElement("span", label)); return wrapper; }
  const wrapper = formField(name, label, type === "choice" ? "text" : type, value), control = wrapper.querySelector("input,textarea");
  if (type === "choice") { const select = document.createElement("select"); select.className = "form-field__control"; select.name = name; select.append(option("", "Non renseigné"), ...decisionChoices(name).map((choice) => option(choice, choice))); select.value = displayValue(value); control.replaceWith(select); }
  return wrapper;
}
function openDecisionForm(row = null, forcedStatus = "") {
  appState.editingDecisionId = row?.id ?? null; ui.decisionForm.reset(); ui.decisionFields.replaceChildren();
  ui.decisionDialog.querySelector("#decision-title").textContent = row ? "Modifier la décision" : "Nouvelle décision";
  ui.decisionDialog.querySelector("[type=submit]").textContent = row ? "Enregistrer" : "Créer la décision";
  const project = element("div", "journal-context form-field--wide"); project.append(textElement("span", "Projet", "item-label"), textElement("strong", textOr(appState.selectedProject.Nom_projet, "Projet")));
  ui.decisionFields.append(project, ...DECISION_FIELDS.filter(([name]) => decisionHasColumn(name)).map(([name, label, type]) => decisionField(name, label, type, row?.[name] ?? (name === "Statut" ? "À préparer" : ""))));
  const result = element("div", "decision-result form-grid form-field--wide"); result.append(...DECISION_RESULT_FIELDS.filter(([name]) => decisionHasColumn(name)).map(([name, label, type]) => decisionField(name, label, type, row?.[name]))); ui.decisionFields.append(result);
  const status = ui.decisionForm.elements.Statut; const refresh = () => { result.hidden = normalizeText(status?.value) !== "decidee"; }; if (status) status.addEventListener("change", refresh); refresh();
  if (status && forcedStatus) { status.value = forcedStatus; refresh(); }
  const subject = ui.decisionForm.elements.Sujet; if (subject) subject.required = true;
  ui.decisionDialog.querySelector(".form-message").textContent = ""; ui.decisionDialog.showModal(); subject?.focus();
}
async function saveDecision(event) {
  event.preventDefault(); const message = ui.decisionDialog.querySelector(".form-message");
  try {
    if (!decisionHasColumn("Projet")) throw new Error("ARBITRAGES_DECISIONS.Projet doit être une référence éditable vers PROJETS.");
    const allowed = new Set([...DECISION_FIELDS, ...DECISION_RESULT_FIELDS].map(([name]) => name).filter(decisionHasColumn));
    const values = { Projet: appState.selectedProject.id }; const data = new FormData(ui.decisionForm);
    for (const name of allowed) {
      if (name === "Projet") continue; const raw = data.get(name);
      if (["Echeance_decision", "Date_decision"].includes(name)) values[name] = hasValue(raw) ? new Date(`${raw}T00:00:00`).getTime() / 1000 : null;
      else if (name === "Point_hebdo") values[name] = data.has(name);
      else if (name === "Decision_par") values[name] = hasValue(raw) ? Number(raw) : null;
      else values[name] = String(raw || "").trim();
    }
    if (!hasValue(values.Sujet)) throw new Error("Renseignez le sujet de la décision.");
    const action = appState.editingDecisionId ? ["UpdateRecord", "ARBITRAGES_DECISIONS", appState.editingDecisionId, values] : ["AddRecord", "ARBITRAGES_DECISIONS", null, values];
    await writeChanges(ui.decisionDialog, [action], appState.editingDecisionId ? "Décision mise à jour." : "Décision créée et liée au projet.");
  } catch (error) { console.error("Écriture de la décision impossible", error); message.textContent = `Enregistrement impossible — ${exactError(error)}`; }
}

function openJournalForm(row = null, initialType = "") {
  appState.editingJournalId = row?.id ?? null; appState.journalActionSource = null; ui.trackingForm.reset();
  ui.trackingDialog.querySelector("#tracking-title").textContent = row ? "Modifier l’entrée du journal" : "Ajouter au journal";
  ui.trackingDialog.querySelector("[type=submit]").textContent = row ? "Enregistrer la modification" : "Ajouter l’entrée";
  ui.trackingFields.replaceChildren();
  const type = journalType(row || {});
  if (row) {
    const hidden = document.createElement("input"); hidden.type = "hidden"; hidden.name = "Type_entree"; hidden.value = type;
    const context = element("div", "journal-context form-field--wide"); context.append(textElement("span", "Type d’entrée", "item-label"), makeBadge(type, journalKind(type)));
    const content = formField("Contenu", "Texte de l’entrée", "textarea", journalContent(row)); content.querySelector("textarea").required = true;
    const date = formField("Date_MAJ", "Date", "date", row.Date_MAJ || row.Date); ui.trackingFields.append(hidden, context, content, date);
    ui.trackingDialog.querySelector(".form-message").textContent = ""; ui.trackingDialog.showModal(); content.querySelector("textarea").focus(); return;
  }
  const typeField = formField("Type_entree", "Type d’entrée", "choice", type); const typeSelect = typeField.querySelector("select"); typeSelect.replaceChildren(...JOURNAL_TYPES.map((item) => option(item, item)));
  if (initialType && JOURNAL_TYPES.includes(initialType)) typeSelect.value = initialType;
  const contentField = formField("Contenu", "Qu’est-ce qui a changé ?", "textarea", ""); contentField.querySelector("textarea").required = true;
  contentField.querySelector("textarea").addEventListener("input", (event) => { delete event.currentTarget.dataset.automatic; });
  const dateField = formField("Date_MAJ", "Date", "date", row?.Date_MAJ || row?.Date || new Date());
  const dynamic = element("div", "journal-dynamic form-grid form-field--wide");
  ui.trackingFields.append(typeField, dynamic, contentField, dateField);
  const refresh = () => {
    const prompts = { Avancement: "Quel avancement souhaitez-vous consigner ?", Information: "Quelle information souhaitez-vous consigner ?" };
    const textarea = contentField.querySelector("textarea"); contentField.querySelector(".form-field__label").textContent = prompts[typeSelect.value] || "Qu’est-ce qui a changé ?";
    renderJournalDynamic(dynamic, typeSelect.value, row);
  };
  typeSelect.addEventListener("change", refresh); refresh();
  ui.trackingDialog.querySelector(".form-message").textContent = ""; ui.trackingDialog.showModal(); contentField.querySelector("textarea").focus();
}
function renderJournalDynamic(container, type, row) {
  container.replaceChildren();
  if (type === "Prochaine étape") {
    const date = formField("Date_prochaine_etape", "Date prévue", "date", row?.Date_prochaine_etape); date.querySelector("input").required = true; container.append(date);
  } else if (type === "Étape franchie") {
    const wrapper = element("label", "form-field form-field--wide"); wrapper.append(textElement("span", "Étape qui vient d’être franchie", "form-field__label"));
    const select = document.createElement("select"); select.name = "Etape_source"; select.className = "form-field__control"; select.required = true;
    const steps = currentNextSteps(appState.selectedProject.id); select.append(option("", "Sélectionner une étape…"), ...steps.map((step) => option(step.id, `${formatDate(step.Date_prochaine_etape)} — ${journalContent(step)}`)));
    wrapper.append(select); container.append(wrapper);
    const add = textElement("button", "+ Ajouter une nouvelle prochaine étape", "button button--secondary form-field--wide"); add.type = "button";
    const replacement = element("div", "replacement-step form-grid form-field--wide"); replacement.hidden = true;
    const next = formField("Nouvelle_etape", "Nouvelle prochaine étape", "textarea", ""); const date = formField("Nouvelle_etape_date", "Date prévue", "date", ""); replacement.append(next, date);
    add.addEventListener("click", () => { replacement.hidden = false; add.hidden = true; next.querySelector("textarea").focus(); }); container.append(add, replacement);
  } else if (type === "Décision attendue") {
    const person = formField("Decisionnaire", "Décisionnaire", "elu", row?.Decisionnaire || appState.selectedProject.Elu_pilote); container.append(person);
  }
}
function openJournalResolution(source, type) {
  appState.editingJournalId = null; appState.journalActionSource = source; ui.trackingForm.reset(); ui.trackingFields.replaceChildren();
  const prompts = { Déblocage: ["Marquer comme débloqué", "Comment le blocage a-t-il été levé ?"], "Vigilance levée": ["Lever la vigilance", "Pourquoi cette vigilance peut-elle être levée ?"], "Décision prise": ["Exprimer la décision", "Quelle décision a été prise ?"] };
  ui.trackingDialog.querySelector("#tracking-title").textContent = prompts[type][0]; ui.trackingDialog.querySelector("[type=submit]").textContent = prompts[type][0];
  const hidden = document.createElement("input"); hidden.type = "hidden"; hidden.name = "Type_entree"; hidden.value = type;
  const context = element("div", "journal-context form-field--wide"); context.append(textElement("span", "Entrée concernée", "item-label"), textElement("strong", journalContent(source)));
  const content = formField("Contenu", prompts[type][1], "textarea", ""); content.querySelector("textarea").required = true;
  const date = formField("Date_MAJ", "Date", "date", new Date()); ui.trackingFields.append(hidden, context, content, date);
  if (type === "Décision prise") ui.trackingFields.append(formField("Decisionnaire", "Décisionnaire", "elu", source.Decisionnaire || appState.selectedProject.Elu_pilote));
  ui.trackingDialog.querySelector(".form-message").textContent = ""; ui.trackingDialog.showModal(); content.querySelector("textarea").focus();
}
function journalSchema() {
  const writable = appState.demo ? new Set(Object.keys(appState.tables.AVANCEMENTS?.[0] || {})) : appState.metadata?.writable?.AVANCEMENTS;
  if (!writable) throw new Error("Métadonnées d’AVANCEMENTS indisponibles : écriture annulée par sécurité.");
  const details = appState.metadata?.details?.AVANCEMENTS;
  const pick = (...names) => names.find((name) => writable.has(name));
  const columnsOfType = (predicate) => details ? [...details.values()].filter((column) => writable.has(column.colId) && predicate(String(column.type || ""))) : [];
  const projectRefs = columnsOfType((type) => type === "Ref:PROJETS");
  const dateColumns = columnsOfType((type) => ["Date", "DateTime"].includes(type.split(":")[0]));
  const namedProjectCandidate = pick("Projet", "PROJET", "Projet_ref", "Projet_ID", "Project");
  const namedDateCandidate = pick("Date_MAJ", "Date");
  const namedProject = namedProjectCandidate && (!details || String(details.get(namedProjectCandidate)?.type || "") === "Ref:PROJETS") ? namedProjectCandidate : null;
  const namedDate = namedDateCandidate && (!details || ["Date", "DateTime"].includes(String(details.get(namedDateCandidate)?.type || "").split(":")[0])) ? namedDateCandidate : null;
  const schema = {
    writable,
    project: namedProject || (projectRefs.length === 1 ? projectRefs[0].colId : null),
    date: pick("Date_evenement") || namedDate || (dateColumns.length === 1 ? dateColumns[0].colId : null),
    type: pick("Type_entree", "Type"),
    content: pick("Description", "Contenu", "Fait_marquant", "Travail_realise", "Commentaire"),
    title: pick("Titre"),
    parent: pick("Entree_parent"),
    state: pick("Etat_entree"),
    decisionMaker: pick("Decisionnaire"),
    createdAt: pick("Cree_le"),
    automatic: pick("Automatique"),
  };
  if (!schema.project) {
    const refs = details ? [...details.values()].filter((column) => String(column.type || "").startsWith("Ref")).map((column) => `${column.colId} (${column.type}${isWritableColumn(column) ? ", éditable" : ", calculée"})`) : [];
    throw new Error(`AVANCEMENTS : aucune référence éditable unique vers PROJETS détectée${refs.length ? `. Références trouvées : ${refs.join(", ")}` : ". Aucune colonne Ref trouvée dans les métadonnées"}.`);
  }
  if (!schema.date) throw new Error(`AVANCEMENTS : aucune date éditable reconnue${dateColumns.length > 1 ? `. Dates trouvées : ${dateColumns.map((column) => column.colId).join(", ")}` : " (attendu : Date_evenement)"}.`);
  if (!schema.type) throw new Error("AVANCEMENTS : créez la colonne éditable Type_entree (Choix) pour utiliser le journal métier.");
  if (!schema.content) throw new Error("AVANCEMENTS : aucune colonne de contenu éditable reconnue. Créez Contenu (Texte).");
  if (!schema.createdAt && !schema.date) throw new Error("AVANCEMENTS : créez Date_evenement ou Cree_le pour garantir l’ordre chronologique.");
  return schema;
}
async function saveJournal(event) {
  event.preventDefault();
  const message = ui.trackingDialog.querySelector(".form-message");
  message.textContent = "Vérification des colonnes AVANCEMENTS…";
  try {
    const schema = journalSchema();
    const data = new FormData(ui.trackingForm);
    const content = String(data.get("Contenu") || "").trim();
    if (!content) { message.textContent = "Décrivez ce qui a changé."; return; }
    const rawDate = data.get("Date_MAJ");
    if (!hasValue(rawDate)) { message.textContent = "Renseignez la date de l’entrée."; return; }
    const type = String(data.get("Type_entree") || "");
    const entryDate = new Date(`${rawDate}T12:00:00`).getTime() / 1000;
    if (appState.editingJournalId) {
      await writeChanges(ui.trackingDialog, [["UpdateRecord", "AVANCEMENTS", appState.editingJournalId, { [schema.date]: entryDate, [schema.content]: content }]], "Entrée du journal modifiée."); return;
    }
    const createdAt = Math.floor(Date.now() / 1000);
    const values = { [schema.project]: appState.selectedProject.id, [schema.date]: entryDate, [schema.content]: content, [schema.type]: type }; if(schema.createdAt)values[schema.createdAt]=createdAt;
    if (type === "Vigilance" && schema.writable.has("Point_vigilance")) values.Point_vigilance = content;
    if (type === "Blocage" && schema.writable.has("Difficulte_blocage")) values.Difficulte_blocage = content;
    if (type === "Décision attendue" && schema.writable.has("Decision_attendue")) values.Decision_attendue = content;
    if (type === "Prochaine étape") {
      if (!schema.state || !schema.writable.has("Date_prochaine_etape")) throw new Error("Pour planifier plusieurs étapes, créez Etat_entree et vérifiez que Date_prochaine_etape est éditable dans AVANCEMENTS.");
      if (!hasValue(data.get("Date_prochaine_etape"))) throw new Error("Renseignez la date prévue de la prochaine étape.");
      values[schema.state] = "Ouvert"; values.Date_prochaine_etape = new Date(`${data.get("Date_prochaine_etape")}T00:00:00`).getTime() / 1000;
    }
    if (schema.decisionMaker && hasValue(data.get("Decisionnaire"))) values[schema.decisionMaker] = Number(data.get("Decisionnaire"));
    if (appState.journalActionSource) {
      if (!schema.parent || !schema.state) throw new Error("Pour cette action, créez les colonnes éditables Entree_parent (Référence vers AVANCEMENTS) et Etat_entree (Choix : Ouvert, Résolu).");
      values[schema.parent] = appState.journalActionSource.id; values[schema.state] = "Résolu";
    } else if (schema.state && Object.prototype.hasOwnProperty.call(JOURNAL_RESOLUTION_TYPES, type)) values[schema.state] = "Ouvert";
    if (type === "Étape franchie") {
      if (!schema.parent || !schema.state) throw new Error("Pour franchir une étape, créez Entree_parent et Etat_entree dans AVANCEMENTS.");
      const sourceId = data.get("Etape_source"); if (!hasValue(sourceId)) throw new Error("Sélectionnez l’étape qui vient d’être franchie.");
      if (sourceId !== "legacy") values[schema.parent] = Number(sourceId);
    }
    const actions = [["AddRecord", "AVANCEMENTS", null, values]];
    if (type === "Prochaine étape") {
      const legacy = legacyNextStep(appState.selectedProject, (appState.tables.AVANCEMENTS || []).filter((row) => isLinkedToProject(row, appState.selectedProject.id) && journalType(row) === "Prochaine étape"));
      if (legacy) {
        const migrated = { [schema.project]: appState.selectedProject.id, [schema.date]: entryDate, [schema.content]: legacy.Contenu, [schema.type]: "Prochaine étape", [schema.state]: "Ouvert" }; if(schema.createdAt)migrated[schema.createdAt]=createdAt-1;
        if (hasValue(legacy.Date_prochaine_etape)) migrated.Date_prochaine_etape = legacy.Date_prochaine_etape;
        actions.unshift(["AddRecord", "AVANCEMENTS", null, migrated]);
      }
    }
    if (appState.journalActionSource) {
      actions.push(["UpdateRecord", "AVANCEMENTS", appState.journalActionSource.id, { [schema.state]: "Résolu" }]);
      if (type === "Vigilance levée" && projectHasColumn("Point_vigilance")) {
        const projectRows = (appState.tables.AVANCEMENTS || []).filter((row) => isLinkedToProject(row, appState.selectedProject.id));
        const remaining = projectRows.filter((row) => journalType(row) === "Vigilance" && String(row.id) !== String(appState.journalActionSource.id) && journalEntryState(row, projectRows) !== "Résolu").sort((a, b) => dateValue(b.Date_MAJ || b.Date) - dateValue(a.Date_MAJ || a.Date));
        actions.push(["UpdateRecord", "PROJETS", appState.selectedProject.id, { Point_vigilance: remaining.length ? journalContent(remaining[0]) : "" }]);
      }
    } else {
      const project = {};
      if (type === "Étape franchie") {
        const sourceId = data.get("Etape_source"); if (sourceId !== "legacy") actions.push(["UpdateRecord", "AVANCEMENTS", Number(sourceId), { [schema.state]: "Résolu" }]);
        const newStep = String(data.get("Nouvelle_etape") || "").trim(), newStepDate = data.get("Nouvelle_etape_date");
        const remaining = currentNextSteps(appState.selectedProject.id).filter((step) => String(step.id) !== String(sourceId));
        if (newStep || hasValue(newStepDate)) {
          if (!newStep || !hasValue(newStepDate)) throw new Error("Pour ajouter une étape suivante, renseignez son texte et sa date.");
          if (!schema.writable.has("Date_prochaine_etape")) throw new Error("AVANCEMENTS.Date_prochaine_etape doit être éditable pour ajouter une étape suivante.");
          const nextValues = { [schema.project]: appState.selectedProject.id, [schema.date]: entryDate, [schema.content]: newStep, [schema.type]: "Prochaine étape", [schema.state]: "Ouvert", Date_prochaine_etape: new Date(`${newStepDate}T00:00:00`).getTime() / 1000 }; if(schema.createdAt)nextValues[schema.createdAt]=createdAt;
          actions.push(["AddRecord", "AVANCEMENTS", null, nextValues]); remaining.push({ Contenu: newStep, Date_prochaine_etape: nextValues.Date_prochaine_etape });
        }
        const earliest = remaining.sort((a, b) => dateValue(a.Date_prochaine_etape) - dateValue(b.Date_prochaine_etape))[0];
        if (projectHasColumn("Prochaine_etape")) project.Prochaine_etape = earliest ? journalContent(earliest) : "";
        if (projectHasColumn("Date_prochaine_etape")) project.Date_prochaine_etape = earliest ? earliest.Date_prochaine_etape : null;
      } else if (type === "Prochaine étape") {
        const candidates = [...currentNextSteps(appState.selectedProject.id), { Contenu: content, Date_prochaine_etape: values.Date_prochaine_etape }].sort((a, b) => dateValue(a.Date_prochaine_etape) - dateValue(b.Date_prochaine_etape)); const earliest = candidates[0];
        if (projectHasColumn("Prochaine_etape")) project.Prochaine_etape = journalContent(earliest);
        if (projectHasColumn("Date_prochaine_etape")) project.Date_prochaine_etape = earliest.Date_prochaine_etape;
      } else if (type === "Vigilance" && projectHasColumn("Point_vigilance")) {
        project.Point_vigilance = content;
      }
      if (Object.keys(project).length) actions.push(["UpdateRecord", "PROJETS", appState.selectedProject.id, project]);
    }
    await writeChanges(ui.trackingDialog, actions, "Nouvelle entrée ajoutée au journal.");
  } catch (error) {
    console.error("Préparation de l’écriture AVANCEMENTS impossible", error);
    message.textContent = `Ajout impossible — ${exactError(error)}`;
  }
}
function confirmDeleteJournal(id){appState.deletingJournalId=id;ui.deleteDialog.querySelector(".form-message").textContent="";ui.deleteDialog.showModal();}
async function deleteJournal(event){event.preventDefault();await writeChanges(ui.deleteDialog,[["RemoveRecord","AVANCEMENTS",appState.deletingJournalId]],"Entrée du journal supprimée.");appState.deletingJournalId=null;}
async function writeChanges(dialog,actions,message){if(appState.busy)return;appState.busy=true;dialog.querySelectorAll("input,textarea,select,button").forEach(c=>c.disabled=true);try{if(appState.demo)applyDemoActions(actions);else await window.grist.docApi.applyUserActions(actions);if(!appState.demo)appState.tables=await fetchRelatedTables();selectProject(appState.selectedProject.id,false);dialog.close();showFeedback(message);}catch(error){console.error("Écriture Grist impossible",error);dialog.querySelector(".form-message").textContent=`Écriture impossible — ${exactError(error)}`;}finally{appState.busy=false;dialog.querySelectorAll("input,textarea,select,button").forEach(c=>c.disabled=false);}}
function applyDemoActions(actions){for(const [type,table,id,fields] of actions){if(type==="UpdateRecord")Object.assign(appState.tables[table].find(r=>String(r.id)===String(id)),fields);else if(type==="AddRecord")appState.tables[table].push({id:Math.max(0,...appState.tables[table].map(r=>Number(r.id)||0))+1,...fields});else if(type==="RemoveRecord")appState.tables[table]=appState.tables[table].filter(r=>String(r.id)!==String(id));}}
function showFeedback(message){ui.feedback.textContent=message;ui.feedback.hidden=false;setTimeout(()=>ui.feedback.hidden=true,4000);}

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
function formatTime(value) { if (!hasValue(value)) return ""; const timestamp = dateValue(value); return timestamp ? new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date(timestamp)) : ""; }
function parseProgress(value) { if (!hasValue(value)) return null; const number = Number(String(value).replace("%", "").replace(",", ".")); if (!Number.isFinite(number)) return null; const percentage = number > 0 && number <= 1 ? number * 100 : number; return Math.round(Math.min(100, Math.max(0, percentage))); }
function formatProgress(value) { const percentage = parseProgress(value); return percentage === null ? "" : `${percentage} %`; }
function initials(name) { const parts = displayValue(name).split(/\s+/).filter(Boolean); return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?"; }
function exactError(error) { return error instanceof Error ? `${error.name} : ${error.message}` : String(error); }
function statusKind(value) { const status = normalizeText(value); if (["termine", "valide", "conforme", "decide"].includes(status)) return "success"; if (["bloque", "retard", "en retard"].includes(status)) return "danger"; if (["vigilance", "a controler"].includes(status)) return "warning"; if (["arbitrage", "a decider"].includes(status)) return "arbitration"; return "info"; }

initialize();
