/* Extension du seul volet organisation de l'annuaire. Les activités restent inchangées. */
window.MunicipalOrganisation = (() => {
  "use strict";
  const M = window.OrganisationModel;
  const org = {poles:[], ready:false, error:"", metadata:[], names:[], selectedPole:null};
  const $ = selector => document.querySelector(selector);
  const name = id => servicePerson(id) || "Non renseigné";
  const poleName = s => M.poleOf(s, org.poles)?.Pole || "Pôle à renseigner";
  const sorted = rows => [...rows].sort((a,b) => String(a.Pole || a.Nom_service).localeCompare(String(b.Pole || b.Nom_service), "fr"));
  function button(label, kind, handler) {
    const control=textElement("button",label,`button button--${kind}`); control.type="button";
    control.addEventListener("click",()=>Promise.resolve().then(handler).catch(error=>{
      const dialog=control.closest("dialog");
      if(dialog?.querySelector(".form-message")) showFormError(dialog,error);
      else {
        const container=dialog?.querySelector(".service-list,#detail-body");
        if(!container) {feedback(exactError(error),true);return;}
        container.querySelector(".org-error")?.remove();
        const notice=textElement("p",exactError(error),"org-section org-warning org-error");
        notice.setAttribute("role","alert");notice.tabIndex=-1;container.prepend(notice);notice.focus();
      }
    }));
    return control;
  }

  function section(title, ...children) {
    const box = element("section", "org-section");
    box.append(textElement("h3", title), ...children);
    return box;
  }
  function field(label, name, type="text", required=false) {
    const wrap = element("label", "form-field"), input = element(type === "select" ? "select" : type === "textarea" ? "textarea" : "input", "form-field__control");
    input.name = name; if (input.tagName === "INPUT") input.type = type;
    input.required = required;
    wrap.append(textElement("span", label, "form-field__label"), input);
    return wrap;
  }
  function check(label, name, checked=false) {
    const wrap = element("label", "service-agent-option"), input = element("input");
    input.type = "checkbox"; input.name = name; input.checked = checked;
    wrap.append(input, textElement("span", label)); return wrap;
  }
  function grid(...children) { const box = element("div", "org-grid"); box.append(...children); return box; }
  function newDialog(id, title) {
    const dialog = element("dialog", "org-dialog"), form = element("form"), header = element("div", "dialog-header"), body = element("div", "org-form-body"), message = element("p", "form-message"), footer = element("div", "dialog-actions");
    dialog.id=id; const heading=textElement("h2",title); heading.id=`${id}-title`; dialog.setAttribute("aria-labelledby",heading.id);
    header.append(heading,button("×","secondary",()=>dialog.close())); header.lastChild.setAttribute("aria-label","Fermer");
    message.setAttribute("aria-live","polite"); footer.append(button("Annuler","secondary",()=>dialog.close()));
    const submit=textElement("button","Enregistrer","button button--primary"); submit.type="submit"; footer.append(submit);
    form.append(header,body,message,footer); dialog.append(form); document.body.append(dialog);
    return {dialog,form,body,message,heading};
  }
  let poleEditor, dgsEditor;
  async function readOrganisation() {
    org.error="";
    try {
      org.names=normalizeTableNames(await window.grist.docApi.listTables());
      org.poles=org.names.includes("POLES")?columnarToRecords(await window.grist.docApi.fetchTable("POLES")):[];
      const [rawTables,rawColumns]=await Promise.all([window.grist.docApi.fetchTable("_grist_Tables"),window.grist.docApi.fetchTable("_grist_Tables_column")]);
      const ids=new Map(columnarToRecords(rawTables).map(t=>[t.id,t.tableId]));
      org.metadata=columnarToRecords(rawColumns).map(c=>({...c,tableId:ids.get(c.parentId)}));
      // Aucune écriture au chargement : on ne fait que déterminer si l'adaptation est nécessaire.
      org.ready=M.schemaActions(org.metadata,org.names,{SERVICES:[],POLES:org.poles}).length===0;
    } catch(error) { org.ready=false; org.error=exactError(error); }
  }
  async function setup() {
    if (!window.confirm("Adapter les tables pour gérer les pôles et la DGS ? Les services, agents et liens existants seront conservés. Conservez votre sauvegarde Grist avant de continuer.")) return;
    await readOrganisation();
    if(org.error) throw Error(org.error);
    const actions=M.schemaActions(org.metadata,org.names,{SERVICES:state.services,POLES:org.poles});
    if (!actions.length) return;
    await write(actions,"Organisation municipale activée. Vous pouvez maintenant créer les pôles et rattacher les services.");
  }
  function requireReady() { if (!org.ready) throw Error("Activez d’abord l’organisation municipale depuis sa fenêtre de gestion."); }
  function candidates() { return municipalAgents().filter(p=>!M.dgs(p)); }
  function fillPeople(select, selected, placeholder="Choisir un agent…", people=candidates()) {
    const rows=[...people];
    const previous=state.people.find(p=>Number(p.id)===Number(selected));
    if(previous&&!rows.some(p=>p.id===previous.id)) rows.push(previous);
    select.replaceChildren(option("",placeholder),...rows.map(p=>option(p.id,personName(p)+(isActive(p)?"":" — inactif"))));
    select.value=String(selected||"");
  }
  function renderOrganisation() {
    const parts=[];
    ui.openServiceForm.hidden=!org.ready; $("#org-new-pole").hidden=!org.ready;
    if(!org.ready) {
      const setupBox=section("Mise en place de l’organisation",textElement("p",org.error||"Une adaptation des tables est nécessaire pour les pôles, la DGS et les responsabilités automatiques."));
      setupBox.append(button("Activer l’organisation municipale","primary",setup)); parts.push(setupBox);
    }
    const directors=state.people.filter(M.dgs), director=directors[0];
    const top=section("Direction générale des services",textElement("p",director?personName(director):"DGS non désignée","org-leader"),textElement("p","Direction de l’ensemble de l’administration — hors pôles et services.","org-muted"));
    top.classList.add("org-direction");
    if(directors.length>1) top.append(textElement("p","Plusieurs DGS sont désignées : régularisez cette situation.","org-warning"));
    if(org.ready) top.append(button(director?"Modifier la désignation":"Désigner la DGS","secondary",openDgs));
    parts.push(top);
    for(const pole of sorted(org.poles)) {
      const services=sorted(state.services.filter(s=>Number(s.Pole)===Number(pole.id))), box=section(pole.Pole||"Pôle à nommer");
      box.classList.add("org-pole"); if(!M.active(pole)) box.classList.add("service-card--inactive");
      const count=new Set(services.filter(M.active).flatMap(s=>M.members(s,org.poles))).size;
      box.append(textElement("p",`Responsable : ${name(pole.Responsable)}`,"org-leader"));
      if(Number(pole.Responsable_adjoint??pole.Responsbale_adjoint)) box.append(textElement("p",`Adjoint : ${name(pole.Responsable_adjoint??pole.Responsbale_adjoint)}`));
      box.append(textElement("p",`${services.length} service(s) · ${count} agent(s), sans doublon · ${M.active(pole)?"Actif":"Inactif"}`,"org-muted"));
      if(org.ready) {
        const controls=element("div","org-controls");
        controls.append(button("Modifier le pôle","secondary",()=>openPole(pole)),button(M.active(pole)?"Désactiver":"Réactiver","secondary",()=>togglePole(pole)));
        if(M.active(pole)) controls.append(button("+ Service dans ce pôle","primary",()=>openService(null,pole.id)));
        box.append(controls);
      }
      box.append(...services.map(serviceCard));
      if(!services.length) box.append(textElement("p","Aucun service rattaché pour le moment.","empty-state"));
      parts.push(box);
    }
    const unassigned=state.services.filter(s=>!M.poleOf(s,org.poles));
    if(unassigned.length) parts.push(section("Services à rattacher",textElement("p","Ces services existants sont conservés. Affectez-les à un pôle lors de leur modification.","org-muted"),...sorted(unassigned).map(serviceCard)));
    const orphans=state.people.filter(p=>M.agent(p)&&M.active(p)&&!M.dgs(p)&&!M.servicesOf(p,state.services.filter(M.active),org.poles).length);
    if(orphans.length) parts.push(section("Rattachements à compléter",textElement("p",orphans.map(personName).join(" · "),"org-warning"),textElement("p","Affectez ces agents à au moins un service. Les données existantes ne sont pas supprimées.")));
    ui.servicesList.replaceChildren(...parts);
  }
  function serviceCard(service) {
    const card=element("article",`history-card service-card${M.active(service)?"":" service-card--inactive"}`), members=M.members(service,org.poles);
    card.append(textElement("h4",service.Nom_service||"Service à nommer"),textElement("p",`Responsable : ${name(M.responsible(service,org.poles))}`));
    card.append(textElement("p",`${M.yes(service.Responsable_du_pole)?"Responsable repris du pôle":"Responsable désigné"} · ${members.length} agent(s) · ${M.active(service)?"Actif":"Inactif"}`,"org-muted"));
    const details=element("details"), summary=textElement("summary",`Voir les ${members.length} agent(s)`), list=element("ul","org-members");
    members.forEach(id=>{const item=element("li"),person=state.people.find(p=>Number(p.id)===id);item.append(person?button(personName(person),"secondary",()=>showDetail(person)):textElement("span",`Agent ${id} à vérifier`));list.append(item);});
    details.append(summary,list); card.append(details);
    if(org.ready) {const controls=element("div","org-controls"); controls.append(button("Modifier","secondary",()=>openService(service)),button(M.active(service)?"Désactiver":"Réactiver","secondary",()=>toggleServiceSafe(service)));card.append(controls);}
    return card;
  }
  function personOrganisation(person) {
    const box=section("Organisation et responsabilités");
    if(M.dgs(person)) {box.append(textElement("p","Direction générale des services","org-leader"),textElement("p","Dirige l’ensemble de l’administration, sans rattachement à un pôle ou à un service."));return box;}
    box.append(textElement("h4","Rattachements"));
    const services=M.servicesOf(person,state.services,org.poles);
    for(const service of sorted(services)) {
      const pole=M.poleOf(service,org.poles), item=element("article","history-card");
      item.append(textElement("h4",`${service.Nom_service} → ${poleName(service)}`),textElement("p",`Responsable du service : ${name(M.responsible(service,org.poles))}`));
      if(pole) {item.append(textElement("p",`Responsable de pôle : ${name(pole.Responsable)}`)); if(Number(pole.Responsable_adjoint)) item.append(textElement("p",`Adjoint : ${name(pole.Responsable_adjoint)}`));}
      if(!M.active(service)) item.append(badge("Service inactif","warning")); box.append(item);
    }
    if(!services.length) box.append(textElement("p","Rattachement à compléter","org-warning"));
    const duties=M.responsibilities(person,state.services,org.poles);
    box.append(textElement("h4","Responsabilités exercées"));
    box.append(textElement("p",duties.length?duties.join("\n"):"Aucune responsabilité d’encadrement renseignée.","org-duties"));
    return box;
  }
  function serviceFormLayout() {
    const nameField=field("Nom du service *","Nom_service","text",true), pole=field("Pôle de rattachement *","Pole","select",true), mode=field("Mode de responsabilité","Mode","select"), leader=field("Responsable désigné *","Responsable","select",true);
    mode.lastChild.append(option("designated","Responsable désigné"),option("pole","Responsable du pôle"));
    const preview=textElement("p","","org-inherited");preview.id="org-inherited";
    const search=field("Rechercher un agent","Recherche_agents","search");
    ui.serviceForm.querySelector(".form-grid").replaceChildren(section("1 · Identification",grid(nameField,pole)),section("2 · Responsabilité",grid(mode,leader),preview),section("3 · Agents du service",search,textElement("p","Le responsable est inclus automatiquement. Un agent peut appartenir à plusieurs services.","org-muted"),ui.serviceAgents),section("4 · Notes et état",field("Notes","Notes","textarea"),check("Service actif","Actif",true)));
    ui.serviceForm.querySelector(".form-grid").classList.add("org-form-body");
    ui.serviceForm.elements.Mode.addEventListener("change",refreshService);
    ui.serviceForm.elements.Pole.addEventListener("change",refreshService);
    ui.serviceForm.elements.Responsable.addEventListener("change",refreshService);
    ui.serviceForm.elements.Recherche_agents.addEventListener("input",()=>{
      const query=normalizeText(ui.serviceForm.elements.Recherche_agents.value);
      ui.serviceAgents.querySelectorAll("label").forEach(label=>label.hidden=!normalizeText(label.textContent).includes(query));
    });
  }
  function openService(service=null, preferredPole=null) {
    requireReady(); state.selectedService=service; ui.serviceForm.reset();
    const f=ui.serviceForm.elements; ui.serviceTitle.textContent=service?"Modifier le service":"Nouveau service";
    f.Nom_service.value=service?.Nom_service||""; f.Notes.value=service?.Notes||""; f.Actif.checked=service?M.active(service):true;
    f.Pole.replaceChildren(option("","Choisir un pôle…"),...sorted(org.poles.filter(p=>M.active(p)||Number(p.id)===Number(service?.Pole))).map(p=>option(p.id,p.Pole)));
    f.Pole.value=String(preferredPole||service?.Pole||""); f.Mode.value=M.yes(service?.Responsable_du_pole)?"pole":"designated";
    fillPeople(f.Responsable,service?.Responsable_designe??service?.Responsable);
    const selected=new Set(service?M.members(service,org.poles):[]);
    const people=state.people.filter(p=>M.agent(p)&&!M.dgs(p)&&(M.active(p)||selected.has(Number(p.id))));
    ui.serviceAgents.replaceChildren(...people.map(person=>{
      const label=check(personName(person),"Agents",selected.has(Number(person.id))), input=label.firstChild; input.value=person.id;
      const other=M.servicesOf(person,state.services,org.poles).filter(s=>s.id!==service?.id).map(s=>`${s.Nom_service} (${poleName(s)})`);
      if(other.length) label.lastChild.append(textElement("small",`Autres services : ${other.join(", ")}`,"org-muted"));
      return label;
    }));
    refreshService(); ui.serviceDialog.querySelector(".form-message").textContent=""; ui.serviceDialog.showModal();
  }
  function refreshService() {
    const f=ui.serviceForm.elements, inherited=f.Mode.value==="pole", service={Pole:Number(f.Pole.value),Responsable_du_pole:inherited,Responsable_designe:Number(f.Responsable.value)};
    f.Responsable.closest("label").hidden=inherited; f.Responsable.required=!inherited;
    $("#org-inherited").textContent=inherited?`Responsable effectif : ${name(M.responsible(service,org.poles))}. Mis à jour automatiquement avec le pôle.`:"";
    const leader=M.responsible(service,org.poles);
    ui.serviceAgents.querySelectorAll("input").forEach(input=>{
      input.disabled=false;
      if(Number(input.value)===leader) {input.checked=true; input.disabled=true;}
    });
  }
  async function saveServiceSafe(data) {
    requireReady();
    const inherited=data.get("Mode")==="pole", values={Nom_service:String(data.get("Nom_service")||"").trim(),Pole:Number(data.get("Pole")),Responsable_du_pole:inherited,Responsable_designe:inherited?0:Number(data.get("Responsable")),Agents:["L",...data.getAll("Agents").map(Number)],Notes:String(data.get("Notes")||""),Actif:data.get("Actif")==="on"};
    M.validateService(values,state.people,org.poles);
    values.Agents=["L",...M.members(values,org.poles)];
    const updated={...state.selectedService,...values}, after=state.selectedService?state.services.map(s=>s.id===updated.id?updated:s):[...state.services,updated];
    const orphans=M.orphanedAfter(state.services,after,state.people,org.poles);
    if(orphans.length) throw Error(`Cette modification laisserait sans service actif : ${orphans.map(personName).join(", ")}. Affectez ces agents à un autre service avant de continuer.`);
    await write([state.selectedService?"UpdateRecord":"AddRecord","SERVICES",state.selectedService?.id??null,values],"Service enregistré."); ui.serviceDialog.close();
  }
  async function toggleServiceSafe(service) {
    requireReady(); const next={...service,Actif:!M.active(service)};
    if(next.Actif) M.validateService(next,state.people,org.poles);
    const orphans=M.orphanedAfter(state.services,state.services.map(s=>s.id===service.id?next:s),state.people,org.poles);
    if(orphans.length) throw Error(`Réaffectez d’abord ces agents : ${orphans.map(personName).join(", ")}.`);
    if(!window.confirm(`${next.Actif?"Réactiver":"Désactiver"} ${service.Nom_service} ? Les références historiques seront conservées.`)) return;
    await write(["UpdateRecord","SERVICES",service.id,{Actif:next.Actif}],"État du service mis à jour.");
  }
  function openPole(pole=null) {
    requireReady(); org.selectedPole=pole; const f=poleEditor.form.elements; poleEditor.form.reset();
    poleEditor.heading.textContent=pole?"Modifier le pôle":"Nouveau pôle"; f.Pole.value=pole?.Pole||"";
    fillPeople(f.Responsable,pole?.Responsable); fillPeople(f.Responsable_adjoint,pole?.Responsable_adjoint,"Aucun adjoint");
    poleEditor.message.textContent=""; poleEditor.dialog.showModal();
  }
  async function savePole(data) {
    const values={Pole:String(data.get("Pole")||"").trim(),Responsable:Number(data.get("Responsable")),Responsable_adjoint:Number(data.get("Responsable_adjoint")),Actif:org.selectedPole?M.active(org.selectedPole):true};
    M.validatePole(values,state.people,state.services,org.poles);
    const action=[org.selectedPole?"UpdateRecord":"AddRecord","POLES",org.selectedPole?.id??null,values];
    const updates=org.selectedPole?M.inheritedUpdates({...values,id:org.selectedPole.id},state.services):[];
    await write([action,...updates],"Pôle et responsabilités des services mis à jour."); poleEditor.dialog.close();
  }
  async function togglePole(pole) {
    if(M.active(pole)&&state.services.some(s=>Number(s.Pole)===Number(pole.id)&&M.active(s))) throw Error("Réaffectez ou désactivez d’abord les services actifs de ce pôle.");
    if(!M.active(pole)) M.validatePole(pole,state.people,state.services,org.poles);
    if(window.confirm(`${M.active(pole)?"Désactiver":"Réactiver"} le pôle ${pole.Pole} ?`)) await write(["UpdateRecord","POLES",pole.id,{Actif:!M.active(pole)}],"État du pôle mis à jour.");
  }
  function openDgs() {
    requireReady(); dgsEditor.form.reset(); const current=state.people.find(M.dgs);
    fillPeople(dgsEditor.form.elements.Personne,current?.id,"Choisir la DGS…",municipalAgents());
    const outgoing=$("#org-outgoing"); outgoing.replaceChildren(textElement("h3","Rattachement de la DGS sortante"),textElement("p","En cas de remplacement, choisissez au moins un service pour la personne sortante si elle reste active."));
    if(current) state.services.filter(M.active).forEach(service=>{const label=check(service.Nom_service,"Services_sortante");label.firstChild.value=service.id;outgoing.append(label);});
    outgoing.hidden=!current; dgsEditor.message.textContent=""; dgsEditor.dialog.showModal();
  }
  async function saveDgs(data) {
    requireReady();
    const actions=M.dgsActions(data.get("Personne"),data.getAll("Services_sortante"),state.people,state.services,org.poles);
    await write(actions,"Direction générale mise à jour."); dgsEditor.dialog.close();
  }
  function install() {
    $("#open-services").textContent="Organisation municipale"; $("#services-title").textContent="Organisation municipale";
    const newPoleButton=button("+ Nouveau pôle","secondary",()=>openPole());newPoleButton.id="org-new-pole";ui.openServiceForm.before(newPoleButton);
    poleEditor=newDialog("pole-dialog","Nouveau pôle");
    poleEditor.body.append(section("1 · Identification",field("Nom du pôle *","Pole","text",true)),section("2 · Responsabilités",grid(field("Responsable *","Responsable","select",true),field("Responsable adjoint","Responsable_adjoint","select")),textElement("p","Les responsables restent des agents de leurs services.","org-muted")));
    dgsEditor=newDialog("dgs-dialog","Direction générale des services");
    const outgoing=section("Rattachement de la DGS sortante"); outgoing.id="org-outgoing";
    dgsEditor.body.append(section("1 · Personne désignée",field("DGS *","Personne","select",true),textElement("p","La DGS dirige l’ensemble de l’administration. Ses rattachements aux services seront retirés lors de la désignation, sans modifier ses liens avec les projets. Ses éventuelles responsabilités de pôle ou de service doivent être réaffectées au préalable.")),outgoing);
    for(const [editor,save] of [[poleEditor,savePole],[dgsEditor,saveDgs]]) editor.form.addEventListener("submit",event=>{event.preventDefault();if(editor.form.reportValidity())save(new FormData(editor.form)).catch(error=>showFormError(editor.dialog,error));});
    serviceFormLayout();
    const originalReload=reload, originalApply=applyTables, originalDetail=showDetail, originalSavePerson=savePerson, originalPersonServices=renderPersonServices, originalRefresh=refreshInternalFields, originalToggle=toggleActive, originalCard=renderCard;
    renderCard=function(person){const card=originalCard(person);if(M.dgs(person))card.querySelector(".person-card__badges").prepend(badge("DGS","info"));return card;};
    reload=async function(id){await readOrganisation(); await originalReload(id);};
    applyTables=function(tables,id){if(tables.POLES)org.poles=tables.POLES;if(state.demo){org.ready=true;(tables.SERVICES||[]).forEach(s=>s.Responsable=M.responsible(s,org.poles));}originalApply(tables,id);};
    renderServices=renderOrganisation; openServiceForm=openService; saveService=saveServiceSafe; toggleService=toggleServiceSafe;
    personServiceNames=person=>M.dgs(person)?"Hors services — Direction générale":M.servicesOf(person,state.services,org.poles).map(s=>s.Nom_service).join(", ");
    showDetail=function(person){originalDetail(person);if(M.agent(person)){const old=ui.detailBody.querySelector(".org-section");old?.remove();ui.detailBody.querySelector(".detail-summary").after(personOrganisation(person));}};
    renderPersonServices=function(person){originalPersonServices(person);ui.personServices.querySelectorAll("label").forEach(label=>{const input=label.querySelector("input"),service=state.services.find(s=>String(s.id)===input.value);label.lastChild.textContent+=` — ${poleName(service)}`;if(person&&M.responsible(service,org.poles)===Number(person.id)){input.checked=true;label.lastChild.textContent+=" (responsable — rattachement obligatoire)";}});};
    refreshInternalFields=function(){originalRefresh();if(M.dgs(state.selected)){ui.personServicesField.hidden=true;}};
    savePerson=async function(data){
      if(org.ready) {
        const agent=data.get("Interne_Mairie")==="on"&&data.get("Role_interne")==="Agent", current=state.selected;
        if(current&&M.dgs(current)&&(!agent||data.get("Actif")!=="on")) throw Error("Remplacez d’abord la DGS depuis Organisation municipale.");
        if(current&&M.responsibilities(current,state.services,org.poles).length&&(!agent||data.get("Actif")!=="on")) throw Error("Réaffectez les responsabilités de cette personne avant de modifier son profil ou de la désactiver.");
        if(agent&&!M.dgs(current)) {
          const selected=new Set(data.getAll("Services_municipaux").map(Number));
          if(data.get("Actif")==="on"&&!state.services.some(s=>M.active(s)&&selected.has(Number(s.id)))) throw Error("Un agent interne doit appartenir à au moins un service actif.");
          if(current&&state.services.some(s=>M.responsible(s,org.poles)===Number(current.id)&&!selected.has(Number(s.id)))) throw Error("Modifiez d’abord le responsable du service avant de retirer ce rattachement.");
        }
      }
      await originalSavePerson(data);
    };
    toggleActive=async function(person){if(isActive(person)&&(M.dgs(person)||M.responsibilities(person,state.services,org.poles).length))throw Error("Réaffectez d’abord les responsabilités de cette personne.");if(org.ready&&!isActive(person)&&M.agent(person)&&!M.dgs(person)&&!M.servicesOf(person,state.services,org.poles).some(M.active))throw Error("Affectez cet agent à un service actif depuis sa fiche de modification avant de le réactiver.");return originalToggle(person);};
    // Les erreurs restent dans le formulaire ; aucune fermeture après un échec d'écriture.
    write=async function(action,message){
      if(state.busy)throw Error("Un enregistrement est déjà en cours.");state.busy=true;disable(true);
      try {
        const actions=Array.isArray(action[0])?action:[action];
        if(state.demo){actions.forEach(applyDemo);applyTables({INTERLOCUTEURS:state.people,SERVICES:state.services,POLES:org.poles,PROJETS:state.projects,REUNIONS:state.meetings,ACTIONS:state.actions,CONSIGNES_POLITIQUES:state.instructions},state.selected?.id);}
        else {await window.grist.docApi.applyUserActions(actions);await reload(state.selected?.id);}
        feedback(message);
      }catch(error){feedback(`Écriture impossible — ${exactError(error)}`,true);throw error;}
      finally{state.busy=false;disable(false);if(ui.serviceDialog.open)refreshService();}
    };
    applyDemo=function([type,table,id,fields]){const rows=table===TABLE?state.people:table==="SERVICES"?state.services:table==="POLES"?org.poles:null;if(!rows)throw Error(`Table de démonstration inconnue : ${table}`);if(type==="AddRecord")rows.push({id:Math.max(0,...rows.map(r=>Number(r.id)))+1,...fields});else if(type==="UpdateRecord"){const row=rows.find(r=>Number(r.id)===Number(id));if(!row)throw Error("Ligne de démonstration absente.");Object.assign(row,fields);}};
  }
  return {install,getPoles:()=>org.poles,getMetadata:()=>org.metadata};
})();
