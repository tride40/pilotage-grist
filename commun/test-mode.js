/* Simulation locale de l'identité, jamais des autorisations Grist. */
"use strict";
(function(global){
  // Même document que les destinations configurées dans accueil/app.js.
  const KEY="pilotage-grist:test-mode:f8iwcexDATAw:v1";
  const ERROR="Mode test : consultation seule. Quittez le mode test puis rechargez le widget pour modifier des données.";
  let storageError=false,changed=false;
  function read(){
    try{
      const raw=global.localStorage.getItem(KEY);
      if(!raw)return null;
      const value=JSON.parse(raw);
      if(value?.active!==true || (value.personId!==null&&(!Number.isSafeInteger(value.personId)||value.personId<=0)))return {active:true,invalid:true};
      return value;
    }catch{storageError=true;return {active:true,invalid:true};}
  }
  const initial=JSON.stringify(read());
  function current(){return read();}
  function isReadOnly(){return changed || Boolean(read()) || JSON.stringify(read())!==initial;}
  function assertWritable(){if(isReadOnly())throw Error(ERROR);}
  async function applyUserActions(actions,...rest){
    assertWritable();
    return global.grist.docApi.applyUserActions(actions,...rest);
  }
  async function identity(people=null){
    const selected=read();
    if(!selected)return null;
    if(selected.invalid||!selected.personId)throw Error("Mode test : choisissez un interlocuteur actif depuis l’accueil.");
    const rows=people||records(await global.grist.docApi.fetchTable("INTERLOCUTEURS"));
    const person=rows.find(p=>Number(p.id)===selected.personId&&active(p));
    if(!person)throw Error("L’interlocuteur de test n’est plus actif ou accessible. Choisissez-en un autre depuis l’accueil.");
    if(JSON.stringify(read())!==JSON.stringify(selected))throw Error("Le mode test a changé. Rechargez le widget.");
    return {person,personId:person.id,email:String(person.Email||""),simulated:true};
  }
  function active(person){return person.Actif!==false&&person.Actif!==0;}
  function records(raw){return (raw.id||[]).map((id,index)=>Object.fromEntries(Object.entries(raw).filter(([,v])=>Array.isArray(v)).map(([k,v])=>[k,v[index]])));}
  function name(person){return String(person.Nom_complet||[person.Prenom,person.Nom].filter(Boolean).join(" ")||`Interlocuteur ${person.id}`);}
  function node(tag,text){const el=document.createElement(tag);if(text)el.textContent=text;return el;}
  function save(person){
    try{
      if(person===false)global.localStorage.removeItem(KEY);
      else global.localStorage.setItem(KEY,JSON.stringify({active:true,personId:person?Number(person.id):null,label:person?name(person):""}));
      changed=true;
      global.location.reload();
    }catch{storageError=true;changed=true;renderBanner("Stockage local inaccessible : le mode test ne peut pas être synchronisé. Les écritures restent bloquées sur cette page.");}
  }
  let banner;
  function renderBanner(message=""){
    const selected=read();
    if(!banner){banner=node("aside");banner.id="pilotage-test-banner";banner.setAttribute("role","status");document.body.prepend(banner);}
    banner.hidden=!isReadOnly();
    if(banner.hidden)return;
    const copy=node("div"),heading=node("strong",message||(changed?"Mode test modifié — actualisez ce widget":selected?.invalid?"Mode test indisponible":`Mode test — ${selected?.label||"interlocuteur à choisir"}`));
    copy.append(heading,node("p","Consultation seule · Les droits Grist restent ceux de votre compte réel. Les vues communes restent identiques pour tous."));
    const controls=node("div");controls.className="test-mode-actions";
    const reload=node("button","Actualiser ce widget");reload.type="button";reload.onclick=()=>global.location.reload();
    const exit=node("button","Quitter le mode test");exit.type="button";exit.onclick=()=>save(false);
    controls.append(reload,exit);banner.replaceChildren(copy,controls);
  }
  async function mount(){
    renderBanner();
    if(!document.querySelector(".app-shell.home"))return;
    const section=node("section");section.id="test-mode-panel";section.setAttribute("aria-label","Simulation temporaire d’un interlocuteur");
    const label=node("label"),toggle=node("input");toggle.type="checkbox";toggle.setAttribute("role","switch");toggle.checked=Boolean(read());
    label.append(toggle,node("strong","Mode test"));
    const copy=node("p","Prévisualisez une identité sans modifier les données. Avant d’activer ce mode, terminez vos opérations et rechargez les autres widgets ouverts. Ce réglage est partagé entre les onglets de ce navigateur pour cette application.");
    const field=node("label","Interlocuteur à simuler"),select=node("select");select.setAttribute("aria-label","Interlocuteur à simuler");select.disabled=true;
    select.append(node("option","Chargement des interlocuteurs…"));field.append(select);field.hidden=!toggle.checked;
    const status=node("p");status.setAttribute("role","status");
    section.append(label,copy,field,status);document.querySelector(".app-shell.home").prepend(section);
    toggle.onchange=()=>save(toggle.checked?null:false);
    try{
      if(!global.grist?.docApi)throw Error("Ouvrez l’accueil dans Grist pour choisir un interlocuteur.");
      await global.grist.ready({requiredAccess:"full"});
      const people=records(await global.grist.docApi.fetchTable("INTERLOCUTEURS")).filter(active).sort((a,b)=>name(a).localeCompare(name(b),"fr"));
      select.replaceChildren();const placeholder=node("option","Choisir un interlocuteur…");placeholder.value="";select.append(placeholder);
      for(const person of people){const option=node("option",`${name(person)}${person.Role_interne||person.Fonction?` — ${person.Role_interne||person.Fonction}`:""}`);option.value=String(person.id);select.append(option);}
      select.value=String(read()?.personId||"");select.disabled=storageError;
      select.onchange=()=>save(people.find(p=>String(p.id)===select.value)||null);
      if(!people.length)status.textContent="Aucun interlocuteur actif accessible.";
    }catch(error){status.textContent=error.message;toggle.disabled=!read();}
  }
  global.addEventListener("storage",event=>{if(event.key===KEY||event.key===null){changed=true;renderBanner();}});
  // Bloquer les enregistrements au clavier aussi ; les gardes API restent décisives.
  document.addEventListener("submit",event=>{if(isReadOnly()){event.preventDefault();event.stopImmediatePropagation();renderBanner(ERROR);}},true);
  document.addEventListener("click",event=>{
    if(!isReadOnly())return;
    const control=event.target.closest?.("button");
    if(!control||control.closest("#pilotage-test-banner, #test-mode-panel"))return;
    if(/^(?:\+\s*)?(?:Nouveau|Nouvel|Nouvelle|Créer|Enregistrer|Modifier|Supprimer|Désactiver|Activer|Valider|Approuver|Refuser|Transmettre|Préparer les champs)/i.test(control.textContent.trim())||control.matches("[data-order], .drag-handle")){
      event.preventDefault();event.stopImmediatePropagation();renderBanner(ERROR);
    }
  },true);
  global.PilotageTestMode=Object.freeze({current,isReadOnly,assertWritable,applyUserActions,identity});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
})(window);
