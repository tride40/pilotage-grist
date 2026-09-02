"use strict";

const TABLES = Object.freeze({ people: "INTERLOCUTEURS", accounts: "PILOTAGE_COMPTES" });
const state = { people: [], accounts: [], accountColumns: new Set(), identity: null, selected: null, demo: false, busy: false };
const $ = (selector) => document.querySelector(selector);
const model = () => window.PilotageAccessModel;

function demoMode() { return new URLSearchParams(location.search).get("demo") === "1" && window.self === window.top; }
function columnarToRecords(columns) { const names=Object.keys(columns||{}).filter((name)=>Array.isArray(columns[name])),length=Math.max(0,...names.map((name)=>columns[name].length));return Array.from({length},(_,index)=>Object.fromEntries(names.map((name)=>[name,columns[name][index]]))); }
function initials(person) { return model().personName(person).split(/\s+/).slice(0,2).map((part)=>part[0]).join("").toUpperCase(); }
function text(value) { return value === null || value === undefined ? "" : String(value).trim(); }
function exactError(error) { const message=text(error?.message||error);if(/ACL_DENY|access rules|row create access/i.test(message))return "Les règles d’accès Grist ont refusé cette opération.";return message||"Erreur inconnue."; }

async function load() {
  if (demoMode()) {
    state.demo=true;state.identity=window.PILOTAGE_ACCESS_DEMO_DATA.identity;
    state.people=structuredClone(window.PILOTAGE_ACCESS_DEMO_DATA.tables.INTERLOCUTEURS);
    state.accounts=structuredClone(window.PILOTAGE_ACCESS_DEMO_DATA.tables.PILOTAGE_COMPTES);
    state.accountColumns=new Set(Object.keys(state.accounts[0]||{Email:1,Interlocuteur:1,Actif:1,Administrateur:1}));
    return;
  }
  await Promise.resolve(window.grist.ready({requiredAccess:"full"}));
  const [peopleColumns,accountColumns]=await Promise.all([window.grist.docApi.fetchTable(TABLES.people),window.grist.docApi.fetchTable(TABLES.accounts)]);
  state.people=columnarToRecords(peopleColumns);state.accounts=columnarToRecords(accountColumns);state.accountColumns=new Set(Object.keys(accountColumns));
  state.identity=await window.PilotageCurrentUser.identify({people:state.people});
  window.PilotageCurrentUser.requireAdministrator(state.identity);
}

function renderIdentity() {
  const person=state.identity?.person,name=person?model().personName(person):"Administrateur";
  $("#identity-avatar").textContent=person?initials(person):"?";$("#identity-name").textContent=name;$("#identity-role").textContent=person?text(person.Fonction||person.Role_interne||"Administrateur"):text(state.identity?.email||"Compte administrateur");
}

function renderStats() {
  const eligible=state.people.filter((person)=>model().isInternal(person)&&model().isActive(person));
  $("#people-count").textContent=eligible.length;$("#active-count").textContent=state.accounts.filter((account)=>account.Actif===true).length;$("#pending-count").textContent=eligible.filter((person)=>!model().accountForPerson(state.accounts,person.id)).length;
}

function renderPeople() {
  const people=model().searchablePeople(state.people,state.accounts,$("#person-search").value),list=$("#people-list");list.replaceChildren();
  people.forEach((person)=>{const account=model().accountForPerson(state.accounts,person.id),button=document.createElement("button");button.type="button";button.className="person-option";button.setAttribute("role","option");button.innerHTML=`<span class="person-option__avatar" aria-hidden="true">${escapeHtml(initials(person))}</span><span class="person-option__body"><strong>${escapeHtml(model().personName(person))}</strong><span>${escapeHtml(text(person.Fonction||person.Role_interne||person.Email||"Interne à la mairie"))}</span></span><span class="badge ${account?.Actif===true?"badge--success":account?"badge--warning":"badge--info"}">${account?.Actif===true?"Actif":account?"Inactif":"À préparer"}</span>`;button.addEventListener("click",()=>selectPerson(person));list.append(button)});
  $("#empty-result").hidden=people.length>0;
}

function selectPerson(person) {
  state.selected=person;const account=model().accountForPerson(state.accounts,person.id),email=text(account?.Email||person.Email);
  $("#selected-avatar").textContent=initials(person);$("#selected-name").textContent=model().personName(person);$("#selected-role").textContent=[person.Role_interne,person.Fonction].filter(Boolean).join(" · ")||"Interne à la mairie";$("#selected-organisation").textContent=text(person.Organisme);
  $("#selected-email").textContent=text(person.Email)||"Non renseignée";$("#selected-account-state").textContent=account?(account.Actif===true?"Actif":"Inactif"):"À créer";$("#login-email").value=email;$("#account-active").checked=account?account.Actif===true:true;$("#account-administrator").checked=account?.Administrateur===true;
  $("#administrator-field").hidden=!state.accountColumns.has("Administrateur");$("#account-status").textContent=account?(account.Actif===true?"Actif — les modifications remplaceront le réglage actuel":"Existe mais est inactif"):"Sera créé lors de l’enregistrement";$("#account-status-icon").textContent=account?"✓":"2";$("#account-status-icon").className=`status-icon ${account?.Actif===true?"status-icon--success":""}`;$("#save-account").textContent=account?"Enregistrer les modifications":"Créer le compte applicatif";
  $("#access-form").hidden=false;$("#form-message").textContent="";$("#access-form").scrollIntoView({behavior:"smooth",block:"start"});
}

function clearSelection() { state.selected=null;$("#access-form").hidden=true;$("#person-search").focus(); }
function restoreEmail() { if(state.selected)$("#login-email").value=text(state.selected.Email); }
function setBusy(value) { state.busy=value;$("#save-account").disabled=value;$("#cancel-selection").disabled=value; }
function feedback(message,error=false) { const box=$("#form-message");box.textContent=message;box.classList.toggle("is-error",error); }

async function save(event) {
  event.preventDefault();if(state.busy||!state.selected)return;
  const account=model().accountForPerson(state.accounts,state.selected.id),loginEmail=model().normalizeEmail($("#login-email").value),errors=model().validate({person:state.selected,account,accounts:state.accounts,loginEmail});
  if(errors.length){feedback(errors[0],true);return}
  const values={Email:loginEmail,Interlocuteur:Number(state.selected.id),Actif:$("#account-active").checked};if(state.accountColumns.has("Administrateur"))values.Administrateur=$("#account-administrator").checked;
  setBusy(true);feedback("");
  try {
    if(state.demo){if(account)Object.assign(account,values);else state.accounts.push({id:Math.max(0,...state.accounts.map((item)=>Number(item.id)||0))+1,...values});}
    else {const action=account?["UpdateRecord",TABLES.accounts,Number(account.id),values]:["AddRecord",TABLES.accounts,null,values];await window.PilotageGristWrite.applyUserActions([action]);await reloadTables();}
    renderStats();renderPeople();selectPerson(state.selected);feedback(account?"Compte applicatif mis à jour.":"Compte applicatif créé. Il reste à confirmer l’accès Éditeur dans le partage Grist.");
  } catch(error) { feedback(`Enregistrement impossible — ${exactError(error)}`,true); }
  finally { setBusy(false); }
}

async function reloadTables() { const [people,accounts]=await Promise.all([window.grist.docApi.fetchTable(TABLES.people),window.grist.docApi.fetchTable(TABLES.accounts)]);state.people=columnarToRecords(people);state.accounts=columnarToRecords(accounts);state.accountColumns=new Set(Object.keys(accounts));state.selected=state.people.find((person)=>String(person.id)===String(state.selected?.id))||null; }
function escapeHtml(value){return String(value).replace(/[&<>'"]/g,(character)=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[character]));}
function pageFailure(error){$("#page-error").hidden=false;$("#page-error").textContent=`Accès impossible — ${exactError(error)}`;$("#identity-avatar").textContent="!";$("#identity-name").textContent="Accès refusé";$("#identity-role").textContent="Administrateur requis";}

async function start(){try{await load();renderIdentity();renderStats();renderPeople();$("#access-workspace").hidden=false;$("#person-search").addEventListener("input",renderPeople);$("#access-form").addEventListener("submit",save);$("#cancel-selection").addEventListener("click",clearSelection);$("#restore-email").addEventListener("click",restoreEmail);}catch(error){console.error(error);pageFailure(error)}}
start();
