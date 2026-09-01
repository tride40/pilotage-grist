/* Présentation de l'annuaire. Les fiches et écritures existantes restent partagées. */
window.MunicipalDirectory=(()=>{
  "use strict";
  const M=window.AnnuaireModel,O=window.OrganisationModel;
  const view={browseExternal:false,openServices:new Set(),setupError:""};
  let toolbar,setupNotice,mandateSection,legacyHint,delegationField,rankField,oldFunctionField;
  const poles=()=>window.MunicipalOrganisation.getPoles();
  const metadata=()=>window.MunicipalOrganisation.getMetadata();
  const collator=new Intl.Collator("fr",{sensitivity:"base",numeric:true});
  const byTitle=(a,b)=>collator.compare(a.Nom_service||a.Pole,b.Nom_service||b.Pole)||Number(a.id)-Number(b.id);
  const ready=()=>state.demo||M.schemaActions(metadata()).length===0;
  function group(title,subtitle,kind=""){
    const box=element("section",`directory-section ${kind}`),header=element("div","directory-heading");
    const text=element("div");text.append(textElement("h2",title));if(subtitle)text.append(textElement("p",subtitle));header.append(text);box.append(header);return box;
  }
  function cards(people,labels=new Map()){
    const grid=element("div","directory-cards");
    for(const person of people){const card=renderCard(person);const label=labels.get(Number(person.id));if(label)card.querySelector(".person-card__badges").prepend(badge(label,"info"));grid.append(card);}
    return grid;
  }
  function empty(text){return textElement("p",text,"directory-empty");}
  function filtered(){return state.people.filter(person=>M.matches(person,{...state,browseExternal:view.browseExternal},state.services,poles()));}
  function renderSetup(){
    let required=false;
    try{required=!ready();view.setupError="";}catch(error){required=true;view.setupError=exactError(error);}
    setupNotice.hidden=!required;
    if(!required)return;
    const copy=element("div");copy.append(textElement("strong","Fonctions et délégations des élus"),textElement("p",view.setupError||"Préparez les trois champs de mandat une seule fois. Les fonctions existantes et les autres données sont conservées."));
    setupNotice.replaceChildren(copy,button("Préparer les champs des élus","secondary",prepareElectedFields));
  }
  async function prepareElectedFields(){
    if(state.demo)return;
    try{
      if(!window.confirm("Ajouter ou préparer les champs Fonction élu, Délégation et Rang ? Aucune ancienne fonction ne sera effacée. Conservez une sauvegarde récente de votre document Grist."))return;
      // Relire la structure juste avant l'écriture, sans dépendre d'un cache local.
      const [rawTables,rawColumns]=await Promise.all([window.grist.docApi.fetchTable("_grist_Tables"),window.grist.docApi.fetchTable("_grist_Tables_column")]);
      const names=new Map(columnarToRecords(rawTables).map(t=>[t.id,t.tableId]));
      const columns=columnarToRecords(rawColumns).map(c=>({...c,tableId:names.get(c.parentId)}));
      const actions=M.schemaActions(columns);
      if(actions.length)await write(actions,"Champs des élus prêts. Complétez les mandats depuis les fiches de modification.");
      else await reload();
      refreshMandate();
    }catch(error){feedback(exactError(error),true);if(ui.dialog.open)showFormError(ui.dialog,error);}
  }
  function serviceBlock(service,people,placements){
    const details=element("details","directory-service"),summary=element("summary"),title=element("span","directory-service__title");
    details.dataset.serviceId=String(service.id);
    const leader=O.responsible(service,poles());
    const memberCount=people.length;
    people=people.filter(p=>{const place=placements.get(Number(p.id));return !place||(place.kind==="service"&&place.id===Number(service.id));});
    people=[...people].sort((a,b)=>(Number(b.id)===leader)-(Number(a.id)===leader)||M.alphabet(a,b));
    title.append(textElement("strong",service.Nom_service||"Service à nommer"),textElement("span",`${memberCount} agent${memberCount>1?"s":""}${memberCount!==people.length?` · ${people.length} présenté${people.length>1?"s":""} ici`:""}${O.active(service)?"":" · Service inactif"}`,"directory-muted"));
    summary.append(title,textElement("span","⌄","directory-chevron"));summary.lastChild.setAttribute("aria-hidden","true");
    const labels=new Map(people.filter(p=>Number(p.id)===leader).map(p=>[Number(p.id),"Responsable du service"]));
    details.append(summary,people.length?cards(people,labels):empty("Les responsables de ce service sont déjà présentés à leur niveau le plus haut dans l’annuaire."));
    details.open=Boolean(state.query.trim())||view.openServices.has(String(service.id));
    details.addEventListener("toggle",()=>{if(!details.isConnected)return;if(!state.query.trim()){if(details.open)view.openServices.add(String(service.id));else view.openServices.delete(String(service.id));}updateExpandLabel();});
    return details;
  }
  function poleBlock(pole,agents,services,placements){
    const peopleById=new Map(agents.map(p=>[Number(p.id),p]));
    const allLeaders=[...new Set([Number(pole.Responsable),Number(pole.Responsable_adjoint)])].map(id=>peopleById.get(id)).filter(Boolean);
    const leaders=allLeaders.filter(p=>placements.get(Number(p.id))?.kind==="pole"&&placements.get(Number(p.id)).id===Number(pole.id));
    const children=services.filter(s=>Number(s.Pole)===Number(pole.id)).map(service=>({service,people:agents.filter(p=>O.members(service,poles()).includes(Number(p.id)))})).filter(s=>s.people.length);
    if(!allLeaders.length&&!children.length)return null;
    const distinct=new Set([...allLeaders.map(p=>p.id),...children.flatMap(s=>s.people.map(p=>p.id))]);
    const box=element("section","directory-pole"),heading=element("div","directory-pole__heading");
    heading.append(textElement("h3",pole.Pole||"Pôle à nommer"),textElement("span",`${distinct.size} agent${distinct.size>1?"s":""}${O.active(pole)?"":" · Pôle inactif"}`,"directory-muted"));box.append(heading);
    if(leaders.length){
      const labels=new Map(leaders.map(p=>[Number(p.id),Number(p.id)===Number(pole.Responsable)?"Responsable de pôle":"Responsable adjoint de pôle"]));
      box.append(cards(leaders,labels));
    }
    if(allLeaders.length>leaders.length)box.append(empty("Les autres responsables de ce pôle sont déjà présentés dans un autre pôle."));
    box.append(...children.map(({service,people})=>serviceBlock(service,people,placements)));
    return box;
  }
  function administration(agents){
    const box=group("Administration municipale","Direction générale, pôles et services","directory-administration");
    const direction=agents.filter(O.dgs).sort(M.alphabet);
    if(direction.length){const dgsBox=element("section","directory-direction");dgsBox.append(textElement("h3","Direction générale des services"),cards(direction));box.append(dgsBox);}
    const members=agents.filter(p=>!O.dgs(p));
    const services=state.services.filter(s=>O.active(s)||state.active!=="active").sort(byTitle);
    const placements=M.leadershipPlacements(poles(),services);
    const expand=button("Tout développer","secondary",toggleServices);expand.id="directory-expand";box.firstChild.append(expand);
    for(const pole of [...poles()].sort(byTitle)){const content=poleBlock(pole,members,services,placements);if(content)box.append(content);}
    const unassigned=services.filter(s=>!O.poleOf(s,poles()));
    const unknown=element("section","directory-pole directory-pole--pending");unknown.append(textElement("h3","Services à rattacher"));
    for(const service of unassigned){const people=members.filter(p=>O.members(service,poles()).includes(Number(p.id)));if(people.length)unknown.append(serviceBlock(service,people,placements));}
    if(unknown.children.length>1)box.append(unknown);
    const withoutService=members.filter(p=>!O.servicesOf(p,services,poles()).length&&!poles().some(pole=>[Number(pole.Responsable),Number(pole.Responsable_adjoint)].includes(Number(p.id))));
    if(withoutService.length){const pending=element("section","directory-pole directory-pole--pending");pending.append(textElement("h3","Rattachements à compléter"),cards(withoutService.sort(M.alphabet)));box.append(pending);}
    expand.hidden=!box.querySelector(".directory-service");
    return box;
  }
  function renderDirectory(){
    renderSetup();
    const rows=filtered(), elected=rows.filter(M.elected).sort(M.electedOrder),agents=rows.filter(M.agent),externals=rows.filter(p=>!M.internal(p)).sort(M.alphabet),other=rows.filter(p=>M.category(p)==="internal").sort(M.alphabet);
    const searching=Boolean(state.query.trim()),externalVisible=searching||view.browseExternal||state.type==="external";
    const sections=[];
    if(elected.length){const section=group("Élus municipaux","Le maire, les adjoints et les conseillers","directory-elected");section.append(cards(elected));sections.push(section);}
    if(agents.length)sections.push(administration(agents));
    if(other.length){const section=group("Autres profils internes","Rôle interne à préciser");section.append(cards(other));sections.push(section);}
    if(externalVisible){
      const section=group("Contacts externes",searching?"Résultats de votre recherche hors mairie":"Personnes et organismes partenaires","directory-external");
      section.append(externals.length?cards(externals):empty("Aucun contact externe ne correspond à cette sélection."));
      if(!searching&&view.browseExternal)section.firstChild.append(button("Masquer les contacts externes","secondary",()=>{view.browseExternal=false;if(state.type==="external"){state.type="";ui.type.value="";}render();}));
      sections.push(section);
    }else{
      const section=group("Contacts externes","Recherchez une personne par son nom, son organisme ou sa fonction.","directory-external directory-external--idle");
      section.append(button("Parcourir les contacts externes","secondary",()=>{view.browseExternal=true;state.type="external";ui.type.value="external";render();ui.grid.querySelector(".directory-external h2")?.scrollIntoView({block:"nearest"});}));sections.push(section);
    }
    if(!rows.length)sections.unshift(empty(searching?"Aucun interlocuteur ne correspond à votre recherche.":"Aucun interlocuteur ne correspond aux filtres sélectionnés."));
    ui.grid.replaceChildren(...sections);
    ui.count.textContent=searching?`${rows.length} personne${rows.length>1?"s":""} trouvée${rows.length>1?"s":""}`:externalVisible?`${rows.length} personne${rows.length>1?"s":""} dans la sélection`:`${rows.length} contact${rows.length>1?"s":""} ${rows.length>1?"municipaux":"municipal"}${state.active==="active"?" · actifs":state.active==="inactive"?" · inactifs":""}`;
    toolbar.querySelector(".directory-clear").hidden=!searching;
    ui.loading.hidden=true;ui.content.hidden=false;ui.open.disabled=state.busy;
    updateExpandLabel();
  }
  function updateExpandLabel(){
    const control=document.querySelector("#directory-expand");if(!control)return;
    const details=[...ui.grid.querySelectorAll(".directory-service")],allOpen=details.length>0&&details.every(d=>d.open);
    control.textContent=allOpen?"Tout réduire":"Tout développer";
  }
  function toggleServices(){
    const details=[...ui.grid.querySelectorAll(".directory-service")],open=!details.every(d=>d.open);
    if(!open)view.openServices.clear();
    details.forEach(d=>{d.open=open;if(open)view.openServices.add(d.dataset.serviceId);});updateExpandLabel();
  }
  function field(label,name,type="text"){
    const box=element("label","form-field"),input=element(type==="select"?"select":"input","form-field__control");
    input.name=name;if(type!=="select")input.type=type;
    box.append(textElement("span",label,"form-field__label"),input);return box;
  }
  function formSection(number,title,subtitle,...children){
    const box=element("section","directory-form-section"),heading=element("div","directory-form-heading"),copy=element("div");
    copy.append(textElement("h3",title),textElement("span",subtitle));heading.append(textElement("p",String(number)),copy);box.append(heading,...children);return box;
  }
  function formGrid(...children){const grid=element("div","directory-form-grid");grid.append(...children);return grid;}
  function formLayout(){
    const f=ui.form.elements,wrap=name=>f[name].closest("label");
    const role=wrap("Role_interne"),internal=wrap("Interne_Mairie"),active=wrap("Actif");
    oldFunctionField=wrap("Fonction");
    const roleField=field("Fonction élu","Fonction_elu","select");roleField.lastChild.append(option("","Non renseigné"),...M.FUNCTIONS.map(value=>option(value,value)));
    delegationField=field("Délégation","Delegation");delegationField.lastChild.placeholder="Ex. Urbanisme et aménagement";
    rankField=field("Rang des adjoints","Rang","number");rankField.lastChild.min="1";rankField.lastChild.step="1";rankField.lastChild.inputMode="numeric";
    rankField.append(textElement("small","Sert uniquement au classement des adjoints. Jamais affiché sur les cartes ou la fiche de consultation.","directory-muted"));
    legacyHint=textElement("p","","directory-legacy");
    mandateSection=element("div","directory-mandate-fields");mandateSection.append(textElement("h4","Mandat et délégation"),formGrid(roleField,delegationField),rankField,legacyHint);
    const identity=formSection(1,"Identité et profil","Nom, profil et appartenance municipale",formGrid(wrap("Prenom"),wrap("Nom")),internal,role);
    const position=formSection(2,"Activité et rattachement","Fonction, organisme et services",formGrid(wrap("Organisme"),oldFunctionField),mandateSection,ui.personServicesField);
    const contact=formSection(3,"Coordonnées","Moyens de contact",formGrid(wrap("Email"),wrap("Telephone")));
    const notes=formSection(4,"Notes et état","Informations complémentaires et disponibilité",wrap("Notes"),active);
    const body=ui.form.querySelector(".form-grid");body.replaceChildren(identity,position,contact,notes);body.classList.add("directory-form-body");
    f.Fonction_elu.addEventListener("change",refreshMandate);
  }
  function refreshMandate(){
    const f=ui.form.elements, elected=f.Interne_Mairie.checked&&M.norm(f.Role_interne.value)==="elu";
    mandateSection.hidden=!elected;oldFunctionField.hidden=elected;
    delegationField.hidden=!M.delegatedRole(f.Fonction_elu.value);
    rankField.hidden=f.Fonction_elu.value!==M.FUNCTIONS[1];
    if(!elected){legacyHint.hidden=true;return;}
    let schemaReady=false;try{schemaReady=ready();}catch{}
    legacyHint.hidden=schemaReady&&Boolean(state.selected?.Fonction_elu||!f.Fonction.value);
    if(!schemaReady)legacyHint.textContent="Les champs des élus doivent être préparés depuis le bandeau de l’annuaire avant l’enregistrement.";
    else legacyHint.textContent=`Fonction actuelle conservée : ${f.Fonction.value}. Choisissez la fonction d’élu et précisez sa délégation pour actualiser l’affichage.`;
  }
  function mandateFields(data,current){
    if(data.get("Interne_Mairie")!=="on"||M.norm(data.get("Role_interne"))!=="elu")return {};
    if(!ready())throw Error("Préparez les champs des élus depuis le bandeau de l’annuaire avant d’enregistrer un mandat.");
    return M.mandateValues(data,current,state.people);
  }
  function install(){
    state.active="active";state.type="";ui.active.value="active";
    ui.search.placeholder="Nom, organisme, fonction, délégation, service…";
    ui.search.setAttribute("aria-description","La recherche inclut les contacts externes et les services. Les inactifs sont accessibles avec le filtre État.");
    ui.grid.classList.add("directory-layout");
    toolbar=ui.content.querySelector(".filters");toolbar.classList.add("directory-toolbar");
    const clear=button("Effacer la recherche","secondary",()=>{state.query="";ui.search.value="";render();ui.search.focus();});clear.classList.add("directory-clear");clear.hidden=true;toolbar.append(clear);
    setupNotice=element("aside","directory-setup");setupNotice.hidden=true;ui.content.prepend(setupNotice);
    formLayout();
    const baseCard=renderCard,baseDetail=showDetail,baseOpen=openForm,baseRefresh=refreshInternalFields,baseToggle=toggleActive;
    populateTypes=function(){ui.type.replaceChildren(option("","Tous les profils"),option("elected","Élus"),option("agent","Agents"),option("external","Externes"),option("internal","Autres profils internes"));ui.type.value=state.type;};
    render=renderDirectory;
    matchesFilters=person=>M.matches(person,{...state,browseExternal:view.browseExternal},state.services,poles());
    renderCard=function(person){
      const card=baseCard(person);card.classList.add("directory-card");
      const identity=card.querySelector(".person-card__identity"),oldTitle=identity.querySelector("h2");
      oldTitle.replaceWith(textElement("h3",personName(person)));
      const subtitle=identity.querySelector("p");
      const role=O.dgs(person)?"Direction générale des services":M.functionLabel(person);
      subtitle.textContent=role;
      if(M.elected(person)&&M.hasDelegation(person)&&person.Delegation)identity.append(textElement("p",person.Delegation,"directory-delegation"));
      if(!M.internal(person)&&person.Organisme)identity.append(textElement("p",person.Organisme,"directory-organisation"));
      if(M.elected(person)&&person.Fonction_elu==="Maire")card.classList.add("directory-card--mayor");
      if(O.dgs(person))card.classList.add("directory-card--dgs");
      // Le rang n'est volontairement injecté dans aucun contenu de consultation.
      return card;
    };
    showDetail=function(person){
      baseDetail(person);
      if(!M.elected(person))return;
      const meta=ui.detailBody.querySelector(".detail-meta");
      const functionBox=[...meta.children].find(child=>child.querySelector("dt")?.textContent==="Fonction");
      if(functionBox)functionBox.querySelector("dd").textContent=M.functionLabel(person);
      if(M.hasDelegation(person))definition(meta,"Délégation",person.Delegation||"Non renseignée");
    };
    openForm=function(person=null){
      baseOpen(person);
      const f=ui.form.elements;
      f.Fonction_elu.replaceChildren(option("","Non renseigné"),...M.FUNCTIONS.map(value=>option(value,value)));
      if(person?.Fonction_elu&&!M.FUNCTIONS.includes(person.Fonction_elu))f.Fonction_elu.append(option(person.Fonction_elu,`${person.Fonction_elu} (valeur existante)`));
      f.Fonction_elu.value=person?.Fonction_elu||"";f.Delegation.value=person?.Delegation||"";f.Rang.value=person?.Rang>0?person.Rang:"";
      refreshMandate();
    };
    refreshInternalFields=function(){baseRefresh();refreshMandate();};
    toggleActive=async function(person){
      if(!isActive(person)&&M.elected(person)&&person.Fonction_elu==="Maire"&&state.people.some(p=>p.id!==person.id&&M.elected(p)&&O.active(p)&&p.Fonction_elu==="Maire"))throw Error("Un maire actif est déjà renseigné.");
      return baseToggle(person);
    };
    // L'écouteur de bind(), installé après celui-ci, réinitialise les filtres.
    // Une microtâche rétablit ensuite la vue initiale : internes actifs seulement.
    ui.reset.addEventListener("click",()=>queueMicrotask(()=>{state.active="active";ui.active.value="active";state.type="";ui.type.value="";view.browseExternal=false;view.openServices.clear();render();}));
    ui.type.addEventListener("change",()=>{view.browseExternal=false;});
  }
  return {install,mandateFields,prepareElectedFields};
})();
