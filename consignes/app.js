"use strict";

const TABLE = "CONSIGNES_POLITIQUES";
const REQUIRED_TABLES = ["PROJETS", TABLE, "INTERLOCUTEURS"];
const state = { projects: [], instructions: [], people: [], columns: new Set(), project: null, demo: false, busy: false };
const ui = {
  interfaceState: document.querySelector("#interface-state"), content: document.querySelector("#instructions-content"), feedback: document.querySelector("#feedback"),
  projectSelector: document.querySelector("#project-selector"), openCreate: document.querySelector("#open-create"), dialog: document.querySelector("#instruction-dialog"), form: document.querySelector("#instruction-form"),
  followList: document.querySelector("#follow-list"), checkList: document.querySelector("#check-list"), historyList: document.querySelector("#history-list"),
  followCount: document.querySelector("#follow-count"), checkCount: document.querySelector("#check-count"), historyCount: document.querySelector("#history-count"),
};

async function initialize() {
  bindControls();
  try {
    if (isDemoMode()) { state.demo = true; applyTables(window.INSTRUCTIONS_DEMO_DATA.tables); return; }
    if (!window.grist?.docApi) throw new Error("L’API Grist n’est pas disponible.");
    await withTimeout(Promise.resolve(window.grist.ready({ requiredAccess: "full" })), "initialisation de l’API Grist");
    const tableNames = normalizeTableNames(await withTimeout(window.grist.docApi.listTables(), "détection des tables"));
    const missing = REQUIRED_TABLES.filter((name) => !tableNames.includes(name));
    if (missing.length) throw new Error(`Tables Grist introuvables : ${missing.join(", ")}.`);
    await reloadTables();
    window.grist.onRecord((record) => {
      const project = record && state.projects.find((item) => String(item.id) === String(record.id));
      if (project) { state.project = project; ui.projectSelector.value = String(project.id); render(); }
    });
  } catch (error) { showFatal("Connexion à Grist impossible", exactError(error)); }
}

async function reloadTables(preferredProjectId = state.project?.id) {
  const entries = await Promise.all(REQUIRED_TABLES.map(async (name) => {
    const raw = await withTimeout(window.grist.docApi.fetchTable(name), `lecture de ${name}`);
    if (name === TABLE) state.columns = new Set(Object.keys(raw).filter((key) => Array.isArray(raw[key])));
    return [name, columnarToRecords(raw)];
  }));
  applyTables(Object.fromEntries(entries), preferredProjectId);
}

function applyTables(tables, preferredProjectId) {
  state.projects = tables.PROJETS || []; state.instructions = tables[TABLE] || []; state.people = tables.INTERLOCUTEURS || [];
  if (state.demo) state.columns = new Set(Object.keys(state.instructions[0] || {}));
  populateSelectors();
  state.project = state.projects.find((item) => String(item.id) === String(preferredProjectId)) || firstActiveProject();
  render();
}

function populateSelectors() {
  const projects = [...state.projects].sort((a, b) => textOr(a.Nom_projet, "").localeCompare(textOr(b.Nom_projet, ""), "fr"));
  ui.projectSelector.replaceChildren(...projects.map((project) => option(project.id, textOr(project.Nom_projet, "Projet sans nom"))));
  ui.projectSelector.disabled = projects.length === 0;
  const personSelect = ui.form.elements.Responsable;
  personSelect.replaceChildren(option("", "Non attribué"), ...[...state.people].sort((a, b) => personName(a).localeCompare(personName(b), "fr")).map((person) => option(person.id, personName(person))));
}

function render() {
  if (!state.project) { showFatal("Aucun projet disponible", "Ajoutez un projet dans la table PROJETS."); return; }
  ui.projectSelector.value = String(state.project.id);
  const rows = state.instructions.filter((row) => referenceIds(row.Projet).includes(String(state.project.id)));
  const groups = { follow: [], check: [], history: [] };
  rows.forEach((row) => groups[classify(row)].push(row));
  groups.follow.sort(compareDueDates); groups.check.sort(compareDueDates); groups.history.sort((a, b) => dateValue(b.Date_MAJ || b.Echeance) - dateValue(a.Date_MAJ || a.Echeance));
  renderGroup(ui.followList, ui.followCount, groups.follow, "Aucune consigne à suivre.", "follow");
  renderGroup(ui.checkList, ui.checkCount, groups.check, "Aucune consigne n’attend de contrôle.", "check");
  renderGroup(ui.historyList, ui.historyCount, groups.history, "Aucune consigne dans l’historique.", "history");
  ui.interfaceState.hidden = true; ui.content.hidden = false; ui.openCreate.disabled = state.busy;
}

function renderGroup(container, counter, rows, emptyText, group) {
  counter.textContent = String(rows.length);
  container.replaceChildren(...(rows.length ? rows.map((row) => renderCard(row, group)) : [textElement("p", emptyText, "empty-state")]));
}

function renderCard(row, group) {
  const overdue = isOverdue(row) && group !== "history";
  const card = element("article", `card instruction-card instruction-card--${group}${overdue ? " instruction-card--overdue" : ""}`);
  const header = element("header", "instruction-card__header");
  header.append(textElement("h3", textOr(row.Consigne, "Consigne sans intitulé"), "instruction-card__title"));
  const badges = element("div", "instruction-card__badges");
  badges.append(makeBadge(textOr(row.Priorite, "Priorité normale"), priorityKind(row.Priorite)), makeBadge(textOr(row.Statut, statusLabel(group)), group === "history" ? "success" : group === "check" ? "arbitration" : "info"));
  if (overdue) badges.append(makeBadge("En retard", "danger")); header.append(badges); card.append(header);
  const meta = element("dl", "instruction-card__meta");
  appendDefinition(meta, "Échéance", formatDate(row.Echeance) || "Non renseignée"); appendDefinition(meta, "Responsable", personValue(row.Responsable) || "Non attribué"); card.append(meta);
  appendNote(card, "Retour du service", row.Retour_service || "Aucun retour saisi.");
  if (hasValue(row.Controle_elu)) appendNote(card, "Contrôle élu", row.Controle_elu);
  if (group !== "history") card.append(renderEditor(row, group));
  return card;
}

function renderEditor(row, group) {
  const editor = element("div", "instruction-card__editor");
  const returnLabel = element("label", "form-field"); returnLabel.append(textElement("span", "Retour du service", "form-field__label"));
  const returnInput = element("textarea", "form-field__control"); returnInput.value = displayValue(row.Retour_service); returnInput.placeholder = "Décrivez la réponse ou l’avancement…"; returnLabel.append(returnInput); editor.append(returnLabel);
  const actions = element("div", "instruction-card__actions");
  actions.append(actionButton("Enregistrer le retour", "secondary", () => saveServiceReturn(row, returnInput.value)));
  if (group === "check") {
    const controlLabel = element("label", "form-field"); controlLabel.append(textElement("span", "Commentaire de contrôle (facultatif)", "form-field__label"));
    const controlInput = element("textarea", "form-field__control"); controlInput.value = displayValue(row.Controle_elu); controlLabel.append(controlInput); editor.append(controlLabel);
    actions.append(actionButton("Valider", "primary", () => controlInstruction(row, true, controlInput.value)), actionButton("À reprendre", "secondary", () => controlInstruction(row, false, controlInput.value)));
  }
  editor.append(actions); return editor;
}

async function createInstruction(formData) {
  const fields = writableFields({ Projet: Number(state.project.id), Consigne: formData.get("Consigne").trim(), Priorite: formData.get("Priorite"), Echeance: gristDate(formData.get("Echeance")), Responsable: optionalNumber(formData.get("Responsable")), Statut: "En cours", Date_MAJ: nowGrist() });
  requireFields(fields, ["Projet", "Consigne"]); await writeAction(["AddRecord", TABLE, null, fields], "Consigne créée."); ui.form.reset(); ui.dialog.close();
}

async function saveServiceReturn(row, value) {
  if (!value.trim()) { showFeedback("Le retour du service ne peut pas être vide.", true); return; }
  const fields = writableFields({ Retour_service: value.trim(), Statut: "À contrôler", Date_MAJ: nowGrist() });
  requireFields(fields, ["Retour_service"]); await writeAction(["UpdateRecord", TABLE, row.id, fields], "Retour enregistré : la consigne attend le contrôle de l’élu.");
}

async function controlInstruction(row, validated, comment) {
  if (comment.trim() && !state.columns.has("Controle_elu")) throw new Error("La colonne Controle_elu est nécessaire pour enregistrer ce commentaire.");
  const fields = writableFields({ Controle_elu: comment.trim(), Statut: validated ? "Validée" : "À reprendre", Date_MAJ: nowGrist() });
  requireFields(fields, ["Statut"]); await writeAction(["UpdateRecord", TABLE, row.id, fields], validated ? "Consigne validée." : "Consigne renvoyée au service.");
}

async function writeAction(action, successMessage) {
  if (state.busy) return; state.busy = true; setInteractiveDisabled(true);
  try {
    if (state.demo) applyDemoAction(action); else await withTimeout(window.grist.docApi.applyUserActions([action]), "écriture dans Grist");
    if (!state.demo) await reloadTables(state.project.id); else render(); showFeedback(successMessage);
  } catch (error) { showFeedback(`Écriture impossible — ${exactError(error)}`, true); }
  finally { state.busy = false; setInteractiveDisabled(false); }
}

function applyDemoAction([type, , id, fields]) {
  if (type === "AddRecord") state.instructions.push({ id: Math.max(0, ...state.instructions.map((row) => Number(row.id) || 0)) + 1, ...fields });
  else Object.assign(state.instructions.find((row) => String(row.id) === String(id)), fields);
}

function bindControls() {
  ui.projectSelector.addEventListener("change", () => { state.project = state.projects.find((project) => String(project.id) === ui.projectSelector.value) || null; render(); });
  ui.openCreate.addEventListener("click", () => ui.dialog.showModal());
  ui.dialog.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => ui.dialog.close()));
  ui.dialog.addEventListener("click", (event) => { if (event.target === ui.dialog) ui.dialog.close(); });
  ui.form.addEventListener("submit", async (event) => { event.preventDefault(); if (!ui.form.reportValidity()) return; try { await createInstruction(new FormData(ui.form)); } catch (error) { showFeedback(exactError(error), true); } });
}

function classify(row) { if (isTrue(row.Validee) || ["validee", "terminee", "archivee"].includes(normalizeText(row.Statut))) return "history"; if (isTrue(row.A_controler) || normalizeText(row.Statut).includes("control")) return "check"; return "follow"; }
function writableFields(values) { return Object.fromEntries(Object.entries(values).filter(([key, value]) => state.columns.has(key) && value !== "" && value !== null && value !== undefined)); }
function requireFields(fields, names) { const missing = names.filter((name) => !Object.hasOwn(fields, name)); if (missing.length) throw new Error(`Colonnes obligatoires absentes : ${missing.join(", ")}.`); }
function firstActiveProject() { return state.projects.find((project) => !isTrue(project.Archive) && !["termine", "abandonne"].includes(normalizeText(project.Statut))) || state.projects[0] || null; }
function personValue(value) { return referenceIds(value).map((id) => personName(state.people.find((person) => String(person.id) === id)) || id).join(", "); }
function personName(person) { return person ? textOr(person.Nom_complet || [person.Prenom, person.Nom].filter(hasValue).join(" "), "Interlocuteur sans nom") : ""; }
function referenceIds(value) { const values = Array.isArray(value) ? value : [value]; return values.filter((item) => item !== "L" && hasValue(item)).map(String); }
function isOverdue(row) { const due = dateValue(row.Echeance); return isTrue(row.En_retard) || (due > 0 && due < startOfToday()); }
function compareDueDates(a, b) { return (dateValue(a.Echeance) || Infinity) - (dateValue(b.Echeance) || Infinity); }
function priorityKind(value) { const text = normalizeText(value); return text.includes("urgent") ? "danger" : text.includes("haut") ? "warning" : "info"; }
function statusLabel(group) { return group === "check" ? "À contrôler" : group === "history" ? "Validée" : "En cours"; }
function appendDefinition(container, label, value) { const wrapper = element("div"); wrapper.append(textElement("dt", label), textElement("dd", value)); container.append(wrapper); }
function appendNote(container, label, value) { const note = element("section", "instruction-card__note"); note.append(textElement("strong", label), textElement("p", value)); container.append(note); }
function makeBadge(value, kind) { return textElement("span", value, `badge badge--${kind}`); }
function actionButton(label, kind, handler) { const button = textElement("button", label, `button button--${kind}`); button.type = "button"; button.addEventListener("click", () => Promise.resolve().then(handler).catch((error) => showFeedback(exactError(error), true))); return button; }
function option(value, label) { const node = element("option"); node.value = String(value); node.textContent = label; return node; }
function setInteractiveDisabled(disabled) { document.querySelectorAll("button, textarea, select, input").forEach((control) => { control.disabled = disabled; }); }
function showFeedback(message, error = false) { ui.feedback.textContent = message; ui.feedback.className = `feedback${error ? " feedback--error" : ""}`; ui.feedback.hidden = false; window.setTimeout(() => { ui.feedback.hidden = true; }, 6000); }
function showFatal(title, message) { ui.content.hidden = true; ui.interfaceState.replaceChildren(textElement("strong", title), textElement("p", message)); ui.interfaceState.hidden = false; }
function normalizeTableNames(value) { const rows = Array.isArray(value) ? value : Array.isArray(value?.tables) ? value.tables : []; return rows.map((row) => typeof row === "string" ? row : row?.id ?? row?.tableId ?? row?.name ?? "").filter(Boolean); }
function columnarToRecords(columns) { const names = Object.keys(columns || {}).filter((name) => Array.isArray(columns[name])); const length = Math.max(0, ...names.map((name) => columns[name].length)); return Array.from({ length }, (_, index) => Object.fromEntries(names.map((name) => [name, columns[name][index]]))); }
function withTimeout(promise, label, delay = 10000) { return Promise.race([promise, new Promise((_, reject) => window.setTimeout(() => reject(new Error(`Délai dépassé pendant : ${label}.`)), delay))]); }
/* La démo publique ne s'active jamais dans une iframe Grist. */
function isDemoMode() { return window.self === window.top && new URLSearchParams(window.location.search).get("demo") === "1" && Boolean(window.INSTRUCTIONS_DEMO_DATA); }
function gristDate(value) { return value ? Math.floor(new Date(`${value}T00:00:00`).getTime() / 1000) : null; }
function nowGrist() { return Math.floor(Date.now() / 1000); }
function optionalNumber(value) { return hasValue(value) ? Number(value) : null; }
function startOfToday() { const date = new Date(); date.setHours(0, 0, 0, 0); return date.getTime(); }
function dateValue(value) { if (!hasValue(value)) return 0; const date = new Date(typeof value === "number" ? value * 1000 : value); return Number.isNaN(date.getTime()) ? 0 : date.getTime(); }
function formatDate(value) { const timestamp = dateValue(value); return timestamp ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(timestamp)) : ""; }
function hasValue(value) { return value !== null && value !== undefined && String(value).trim() !== ""; }
function displayValue(value) { if (Array.isArray(value)) return value.filter((item) => item !== "L").join(", "); return hasValue(value) ? String(value).trim() : ""; }
function textOr(value, fallback) { return hasValue(value) ? displayValue(value) : fallback; }
function normalizeText(value) { return displayValue(value).toLocaleLowerCase("fr-FR").normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
function isTrue(value) { return value === true || value === 1 || ["true", "vrai", "oui", "1"].includes(normalizeText(value)); }
function exactError(error) { return error instanceof Error ? error.message : String(error); }
function element(tag, className) { const node = document.createElement(tag); if (className) node.className = className; return node; }
function textElement(tag, value, className) { const node = element(tag, className); node.textContent = displayValue(value); return node; }

initialize();
