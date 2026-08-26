"use strict";

const REQUIRED_TABLES = ["PROJETS", "REUNIONS", "INTERLOCUTEURS"];
const OPTIONAL_TABLES = ["ACTIONS", "CONSIGNES_POLITIQUES", "ARBITRAGES_DECISIONS"];
const state = { project: null, projects: [], meetings: [], people: [], tables: {}, writable: null, filter: "all", search: "", demo: false, editing: null, lastMeeting: null, busy: false };
const ui = {
  state: document.querySelector("#interface-state"), content: document.querySelector("#meetings-content"),
  projectName: document.querySelector("#project-name"), projectSelector: document.querySelector("#project-selector"), total: document.querySelector("#meeting-count"),
  kpis: document.querySelector("#meeting-kpis"), filters: document.querySelector("#filter-list"),
  search: document.querySelector("#meeting-search"), results: document.querySelector("#results-count"),
  list: document.querySelector("#meeting-list"), template: document.querySelector("#meeting-template"),
  newMeeting: document.querySelector("#new-meeting"), meetingDialog: document.querySelector("#meeting-dialog"), meetingForm: document.querySelector("#meeting-form"), meetingFields: document.querySelector("#meeting-fields"),
  followupDialog: document.querySelector("#followup-dialog"), followupForm: document.querySelector("#followup-form"), followupFields: document.querySelector("#followup-fields"), feedback: document.querySelector("#feedback"),
};

/* Connexion au document Grist et au projet sélectionné. */
async function initialize() {
  bindControls();
  try {
    if (isLocalDemoMode()) { state.demo = true; applyData(window.MEETINGS_DEMO_DATA.project, window.MEETINGS_DEMO_DATA.tables); return; }
    if (!window.grist?.docApi) throw new Error("L’API Grist n’est pas disponible.");
    setLoadingMessage("Initialisation de l’API Grist…");
    await withTimeout(Promise.resolve(window.grist.ready({ requiredAccess: "full" })), "initialisation de l’API Grist");
    setLoadingMessage("Détection des tables du document…");
    const tableNames = normalizeTableNames(await withTimeout(window.grist.docApi.listTables(), "détection des tables"));
    const missing = REQUIRED_TABLES.filter((name) => !tableNames.includes(name));
    if (missing.length) throw new Error(`Tables Grist introuvables : ${missing.join(", ")}.`);
    setLoadingMessage("Lecture des réunions et des interlocuteurs…");
    const tables = await fetchTables([...REQUIRED_TABLES, ...OPTIONAL_TABLES.filter((name) => tableNames.includes(name))]);
    state.tables = tables;
    state.writable = await fetchWritableColumns([...REQUIRED_TABLES,...OPTIONAL_TABLES.filter(name=>tableNames.includes(name))]);
    state.projects = tables.PROJETS;
    state.meetings = tables.REUNIONS;
    state.people = tables.INTERLOCUTEURS;
    populateProjectSelector();
    state.project = firstActiveProject();
    window.grist.onRecord((record) => {
      const matchingProject = record && state.projects.find((project) => String(project.id) === String(record.id));
      if (matchingProject) { state.project = matchingProject; ui.projectSelector.value = String(matchingProject.id); render(); }
    });
    render();
  } catch (error) {
    console.error("Erreur de chargement du widget Réunions :", error);
    showInterfaceState("Connexion à Grist impossible", exactError(error));
  }
}

async function fetchTables(names) {
  const entries = await Promise.all(names.map(async (name) => [name, columnarToRecords(await withTimeout(window.grist.docApi.fetchTable(name), `lecture de la table ${name}`))]));
  return Object.fromEntries(entries);
}
function withTimeout(promise, label, delay = 10000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => window.setTimeout(() => reject(new Error(`Délai dépassé pendant : ${label}.`)), delay)),
  ]);
}
function applyData(project, tables) { state.tables=tables; state.projects = tables.PROJETS || [project]; state.project = project; state.meetings = tables.REUNIONS || []; state.people = tables.INTERLOCUTEURS || []; populateProjectSelector(); render(); }
function normalizeTableNames(value) { const rows = Array.isArray(value) ? value : Array.isArray(value?.tables) ? value.tables : []; return rows.map((row) => typeof row === "string" ? row : row?.id ?? row?.tableId ?? row?.name ?? "").filter(Boolean); }
function columnarToRecords(columns) { if (!columns || typeof columns !== "object") return []; const names = Object.keys(columns).filter((name) => Array.isArray(columns[name])); const length = Math.max(0, ...names.map((name) => columns[name].length)); return Array.from({ length }, (_, index) => Object.fromEntries(names.map((name) => [name, columns[name][index]]))); }
async function fetchWritableColumns(names){const [tm,cm]=await Promise.all([window.grist.docApi.fetchTable("_grist_Tables"),window.grist.docApi.fetchTable("_grist_Tables_column")]);const ids=new Map(columnarToRecords(tm).map(r=>[String(r.id),r.tableId])),cols=columnarToRecords(cm);return Object.fromEntries(names.map(table=>[table,new Set(cols.filter(c=>ids.get(String(c.parentId))===table&&!hasValue(c.formula)&&!isTrue(c.isFormula)).map(c=>c.colId))]));}
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
function populateProjectSelector() {
  const projects = [...state.projects].sort((left, right) => textOr(left.Nom_projet, "").localeCompare(textOr(right.Nom_projet, ""), "fr"));
  ui.projectSelector.replaceChildren(...projects.map((project) => {
    const option = element("option"); option.value = String(project.id); option.textContent = textOr(project.Nom_projet, "Projet sans nom"); return option;
  }));
  ui.projectSelector.disabled = projects.length === 0;
}
function firstActiveProject() {
  return state.projects.find((project) => !isTrue(project.Archive) && !["termine", "abandonne"].includes(normalizeText(project.Statut))) || state.projects[0] || null;
}

/* Rendu de l'interface. */
function render() {
  if (!state.project) { showInterfaceState("Aucun projet sélectionné", "Sélectionnez une ligne dans la table PROJETS pour afficher ses réunions."); return; }
  const meetings = projectMeetings();
  ui.projectSelector.value = String(state.project.id);
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
  card.querySelector("[data-edit]").addEventListener("click",()=>openMeetingForm(meeting));
  if (!details.children.length) details.remove(); if (!sections.children.length) sections.remove(); return card;
}
function appendDefinition(container, label, value) { if (!hasValue(value)) return; const wrapper = element("div"); wrapper.append(textElement("dt", label), textElement("dd", displayValue(value))); container.append(wrapper); }
function appendNote(container, label, value, kind) { if (!hasValue(value)) return; const note = element("section", `meeting-note meeting-note--${kind}`); note.append(textElement("strong", label), textElement("p", displayValue(value))); container.append(note); }
function makeBadge(value, kind) { return textElement("span", displayValue(value), `badge badge--${kind}`); }
function setLoadingMessage(message) { const text = ui.state.querySelector("p"); if (text) text.textContent = message; }
function showInterfaceState(title, message) { ui.content.hidden = true; const box = element("div"); box.append(textElement("strong", title), textElement("p", message)); ui.state.replaceChildren(box); ui.state.hidden = false; }

/* Contrôles locaux sans rechargement. */
function bindControls() {
  ui.projectSelector.addEventListener("change", () => { state.project = state.projects.find((project) => String(project.id) === ui.projectSelector.value) || null; render(); });
  ui.filters.addEventListener("click", (event) => { const button = event.target.closest("[data-filter]"); if (!button) return; state.filter = button.dataset.filter; ui.filters.querySelectorAll("[data-filter]").forEach((item) => item.setAttribute("aria-pressed", String(item === button))); render(); });
  ui.search.addEventListener("input", () => { state.search = ui.search.value; render(); });
  ui.newMeeting.addEventListener("click",()=>openMeetingForm());
  document.querySelectorAll("dialog [data-close]").forEach(button=>button.addEventListener("click",()=>button.closest("dialog").close()));
  ui.meetingForm.addEventListener("submit",saveMeeting);ui.followupForm.addEventListener("submit",saveFollowup);
}

/* Création, édition et suites de réunion. */
const MEETING_FIELDS=[["Projet","Projet","project"],["Date_reunion","Date","date"],["Heure","Heure","time"],["Objet","Objet","text"],["Type_reunion","Type de réunion","text"],["Lieu","Lieu","text"],["Participants","Participants","people"],["Compte_rendu","Compte rendu","textarea"],["Points_cles","Points clés","textarea"],["Decisions_prises","Décisions prises","textarea"],["Arbitrage_attendu","Arbitrage attendu","textarea"],["Prochaine_reunion","Prochaine réunion","date"],["Saisi_par","Saisi par","person"],["CR_finalise","Compte rendu finalisé","checkbox"]];
function hasColumn(table,name){return state.demo?(state.tables[table]||[]).some(row=>Object.prototype.hasOwnProperty.call(row,name)):Boolean(state.writable?.[table]?.has(name));}
function openMeetingForm(meeting=null){state.editing=meeting;ui.meetingForm.reset();document.querySelector("#meeting-form-title").textContent=meeting?"Modifier la réunion":"Nouvelle réunion";ui.meetingFields.replaceChildren(...MEETING_FIELDS.filter(([name])=>hasColumn("REUNIONS",name)||["Projet","Date_reunion","Objet"].includes(name)).map(([name,label,type])=>buildField(name,label,type,meeting?.[name]??(name==="Projet"?state.project?.id:""))));ui.meetingDialog.querySelector(".form-message").textContent="";ui.meetingDialog.showModal();}
function buildField(name,label,type,value){const wrap=element("label",`form-field${type==="textarea"||type==="people"?" form-field--wide":""}`);wrap.append(textElement("span",label,"form-field__label"));let control;if(type==="textarea"){control=element("textarea");control.rows=4;}else if(["project","person","people"].includes(type)){control=element("select");if(type==="people")control.multiple=true;const rows=type==="project"?state.projects:state.people;if(type!=="people")control.append(makeOption("","Non renseigné"));control.append(...rows.map(row=>makeOption(row.id,type==="project"?textOr(row.Nom_projet,`Projet ${row.id}`):textOr(row.Nom_complet,`Interlocuteur ${row.id}`))));}else{control=element("input");control.type=type;}control.className="form-field__control";control.name=name;if(type==="checkbox")control.checked=isTrue(value);else if(type==="date")control.value=inputDate(value);else if(type==="people"){const ids=referenceIds(value);[...control.options].forEach(o=>o.selected=ids.includes(o.value));}else control.value=displayValue(value);wrap.append(control);return wrap;}
function makeOption(value,label){const option=element("option");option.value=value;option.textContent=label;return option;}function inputDate(value){const t=dateValue(value);return t?new Date(t).toISOString().slice(0,10):"";}
function formValues(form,table){const values={};for(const control of form.elements){const name=control.name;if(!name||name==="TargetTable"||(!hasColumn(table,name)&&!(["Projet","Date_reunion","Objet"].includes(name)&&table==="REUNIONS")))continue;if(control.type==="checkbox")values[name]=control.checked;else if(control.multiple){const ids=[...control.selectedOptions].map(o=>Number(o.value));if(ids.length)values[name]=["L",...ids];}else if(!hasValue(control.value))continue;else if(["Projet","Saisi_par","Responsable","Reunion_origine"].includes(name))values[name]=Number(control.value);else if(control.type==="date")values[name]=new Date(`${control.value}T00:00:00`).getTime()/1000;else values[name]=control.value.trim();}return values;}
async function saveMeeting(event){event.preventDefault();const fields=formValues(ui.meetingForm,"REUNIONS");const action=state.editing?["UpdateRecord","REUNIONS",state.editing.id,fields]:["AddRecord","REUNIONS",null,fields];try{const id=await write([action]);state.lastMeeting=state.editing?{...state.editing,...fields}:state.meetings.find(row=>String(row.id)===String(id))||{id,...fields};ui.meetingDialog.close();render();showFollowups();}catch(error){ui.meetingDialog.querySelector(".form-message").textContent=`Écriture impossible — ${exactError(error)}`;}}
function showFollowups(){const panel=element("section","followup-panel");panel.append(textElement("h3","Suites de la réunion"),textElement("p","Créez immédiatement une suite en réutilisant le contexte déjà saisi."));const actions=element("div","followup-actions");[["ACTIONS","+ Action"],["CONSIGNES_POLITIQUES","+ Consigne politique"],["ARBITRAGES_DECISIONS","+ Arbitrage"]].filter(([table])=>state.tables[table]).forEach(([table,label])=>{const button=element("button","button button--secondary");button.type="button";button.textContent=label;button.addEventListener("click",()=>openFollowup(table));actions.append(button);});panel.append(actions);ui.list.prepend(panel);}
function openFollowup(table){ui.followupForm.reset();ui.followupForm.elements.TargetTable.value=table;const names={ACTIONS:"Nouvelle action",CONSIGNES_POLITIQUES:"Nouvelle consigne politique",ARBITRAGES_DECISIONS:"Nouvel arbitrage"};document.querySelector("#followup-title").textContent=names[table];const textName=table==="ACTIONS"?"Action":table==="CONSIGNES_POLITIQUES"?"Consigne":"Sujet";const initial=table==="ARBITRAGES_DECISIONS"?state.lastMeeting.Arbitrage_attendu:state.lastMeeting.Points_cles||state.lastMeeting.Objet;const defs=[["Projet","Projet","project",state.project.id],["Reunion_origine","Réunion d’origine","hidden",state.lastMeeting.id],[textName,table==="ACTIONS"?"Action":table==="CONSIGNES_POLITIQUES"?"Consigne":"Sujet","textarea",initial],["Responsable","Responsable","person",""],["Echeance","Échéance","date",""],["Statut","Statut","text","À faire"],["Commentaire","Commentaire","textarea",""]];ui.followupFields.replaceChildren(...defs.filter(([name])=>name==="Projet"||name==="Reunion_origine"||hasColumn(table,name)).map(([name,label,type,value])=>type==="hidden"?hiddenField(name,value):buildField(name,label,type,value)));ui.followupDialog.querySelector(".form-message").textContent="";ui.followupDialog.showModal();}
function hiddenField(name,value){const input=element("input");input.type="hidden";input.name=name;input.value=value;return input;}
async function saveFollowup(event){event.preventDefault();const table=ui.followupForm.elements.TargetTable.value;try{await write([["AddRecord",table,null,formValues(ui.followupForm,table)]]);ui.followupDialog.close();feedback("Suite créée.");}catch(error){ui.followupDialog.querySelector(".form-message").textContent=`Création impossible — ${exactError(error)}`;}}
async function write(actions){if(state.busy)throw new Error("Une écriture est déjà en cours.");state.busy=true;try{let id;if(state.demo){for(const [type,table,rowId,fields] of actions){if(type==="AddRecord"){id=Math.max(0,...state.tables[table].map(r=>Number(r.id)||0))+1;state.tables[table].push({id,...fields});}else Object.assign(state.tables[table].find(r=>String(r.id)===String(rowId)),fields);}}else{const result=await window.grist.docApi.applyUserActions(actions);id=result?.retValues?.[0]??null;state.tables=await fetchTables([...REQUIRED_TABLES,...OPTIONAL_TABLES.filter(name=>state.tables[name])]);state.projects=state.tables.PROJETS;state.people=state.tables.INTERLOCUTEURS;state.meetings=state.tables.REUNIONS;}return id;}finally{state.busy=false;}}
function feedback(message){ui.feedback.textContent=message;ui.feedback.hidden=false;setTimeout(()=>ui.feedback.hidden=true,4000);}

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
function isTrue(value) { return value === true || value === 1 || ["true", "vrai", "oui", "1"].includes(normalizeText(value)); }
function exactError(error) { return error instanceof Error ? `${error.name} : ${error.message}` : String(error); }
function element(tag, className) { const node = document.createElement(tag); if (className) node.className = className; return node; }
function textElement(tag, value, className) { const node = element(tag, className); node.textContent = displayValue(value); return node; }

initialize();
