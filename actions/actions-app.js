"use strict";
(async function mountPersonalWorkspace(){
  const root=document.querySelector("#actions"),doc=root.ownerDocument;
  const node=(tag,text,cls)=>{const element=doc.createElement(tag);if(text!==undefined)element.textContent=text;if(cls)element.className=cls;return element;};
  const button=(text,handler,cls="button button--secondary")=>{const element=node("button",text,cls);element.type="button";element.addEventListener("click",handler);return element;};
  const activeAction=row=>!["closed","cancelled"].includes(row.state),actionToDo=row=>row.roles?.executor&&["in_progress","additional_work"].includes(row.state);
  const actionLate=row=>row.deadline&&!["performed","closed","cancelled"].includes(row.state)&&new Date(`${row.deadline}T23:59:59`).getTime()<Date.now();
  const taskDate=value=>{if(!value)return null;if(typeof value==="number")return new Date(value*1000);const date=new Date(value);return Number.isNaN(date.getTime())?null:date;};
  const taskDateInput=value=>{const date=taskDate(value);return date?date.toISOString().slice(0,10):"";};
  const taskLate=task=>{const date=taskDate(task.Echeance);return !task.Terminee&&date&&date.setHours(23,59,59,999)<Date.now();};
  const formatDate=value=>{const date=taskDate(value);return date?new Intl.DateTimeFormat("fr-FR",{dateStyle:"medium"}).format(date):"";};

  try{
    if(!window.grist?.docApi)throw Error("Ouvrez cette page comme widget dans le document de base Grist.");
    await window.grist.ready({requiredAccess:"full"});
    if(!window.PilotageActionGristLifecycle?.create||!window.PilotageActionCircuitUI?.mount||!window.PilotageCurrentUser?.actionContext||!window.PersonnelTasks?.create)
      throw Error("La page Mon espace est incomplète dans la publication.");

    const identityPromise=window.PilotageCurrentUser.identify();
    const identify=async()=>window.PilotageCurrentUser.actionContext(await identityPromise);
    const identity=await identityPromise;
    const coordinationService=window.PilotageActionGristLifecycle.create({grist:window.grist,mode:window.PilotageGristWrite,identify,requireFinalPermissions:true});
    const workService=window.PilotageActionGristLifecycle.create({grist:window.grist,mode:window.PilotageGristWrite,identify,requireFinalPermissions:true});
    const catalog=await coordinationService.catalog();

    root.replaceChildren();
    const hero=node("header",undefined,"workspace-hero"),heroInner=node("div",undefined,"workspace-hero__inner"),copy=node("div",undefined,"workspace-hero__copy");
    copy.append(node("p","PILOTAGE PERSONNEL","circuit-eyebrow"),node("h1","Mon espace"),node("p","Coordonnez les demandes et retrouvez tout votre travail au même endroit.","workspace-hero__subtitle"));
    const identityCard=node("section",undefined,"workspace-identity");identityCard.setAttribute("aria-label","Utilisateur connecté");
    const person=identity.person||{},personName=String(person.Nom_complet||[person.Prenom,person.Nom].filter(Boolean).join(" ")||identity.email||"Utilisateur").trim();
    const avatar=node("span",personName.split(/\s+/).slice(0,2).map(part=>part[0]).join("").toUpperCase()||"?","workspace-identity__avatar"),identityBody=node("span",undefined,"workspace-identity__body");
    identityBody.append(node("strong",personName),node("span",[person.Role_interne,person.Fonction].filter(Boolean).join(" · ")||"Utilisateur"));
    const directoryPerson=catalog.people.find(item=>Number(item.id)===Number(identity.personId)),serviceNames=(directoryPerson?.serviceIds||[]).map(id=>catalog.services.find(service=>service.id===id)?.name).filter(Boolean);
    if(serviceNames.length)identityBody.append(node("small",serviceNames.join(" · ")));
    identityCard.append(avatar,identityBody);
    const heroActions=node("div",undefined,"workspace-hero__actions"),homeLink=node("a","⌂ Accueil","button button--secondary workspace-home-link");
    homeLink.href=window.PilotageNavigation.pageUrl("home");homeLink.target="_top";homeLink.setAttribute("aria-label","Retour à l’accueil");
    heroActions.append(homeLink,identityCard);heroInner.append(copy,heroActions);hero.append(heroInner);root.append(hero);

    const shell=node("div",undefined,"workspace-shell"),tabs=node("nav",undefined,"workspace-tabs");tabs.setAttribute("aria-label","Rubriques de Mon espace");
    const coordinationTab=button("Coordination",()=>selectTab("coordination"),"workspace-tab is-active"),workTab=button("Mon travail",()=>selectTab("work"),"workspace-tab");
    coordinationTab.setAttribute("aria-controls","coordination-panel");workTab.setAttribute("aria-controls","work-panel");tabs.append(coordinationTab,workTab);shell.append(tabs);

    const coordinationPanel=node("section",undefined,"workspace-panel");coordinationPanel.id="coordination-panel";
    const coordinationIntro=node("div",undefined,"workspace-section-heading"),coordinationCopy=node("div");coordinationCopy.append(node("p","COORDONNER","workspace-eyebrow"),node("h2","Demandes et validations"),node("p","Créez une action, attribuez-la selon vos droits et suivez son avancement.","workspace-section-heading__subtitle"));
    let coordinationController=null;
    const createAction=button("+ Nouvelle action",()=>coordinationController?.create(),"button button--primary");coordinationIntro.append(coordinationCopy,createAction);
    const coordinationKpis=createKpis([["assign","À attribuer","blue"],["review","À valider","purple"],["requests","Mes demandes en cours","amber"],["unread","Notifications non lues","red"]]);
    const coordinationMount=node("div",undefined,"workspace-module");coordinationPanel.append(coordinationIntro,coordinationKpis.element,coordinationMount);

    const workPanel=node("section",undefined,"workspace-panel");workPanel.id="work-panel";workPanel.hidden=true;
    const workHeading=node("div",undefined,"workspace-section-heading"),workCopy=node("div");workCopy.append(node("p","MON QUOTIDIEN","workspace-eyebrow"),node("h2","Mon travail"),node("p","Consultez ensemble ou séparément les actions qui vous sont confiées et votre liste privée.","workspace-section-heading__subtitle"));workHeading.append(workCopy);
    const workKpis=createKpis([["actions","Actions à réaliser","blue"],["lateActions","Actions en retard","red"],["tasks","To-Do ouvertes","purple"],["lateTasks","To-Do en retard","amber"]]);
    const workViews=node("div",undefined,"workspace-view-switch");workViews.setAttribute("role","group");workViews.setAttribute("aria-label","Contenu de Mon travail");
    const viewButtons={};for(const [key,label] of [["all","Tout voir"],["actions","Mes actions"],["tasks","Ma To-Do List"]]){viewButtons[key]=button(label,()=>selectWorkView(key),`workspace-view-button${key==="all"?" is-active":""}`);workViews.append(viewButtons[key]);}
    const actionSection=node("section",undefined,"workspace-work-section"),actionHeading=node("div",undefined,"workspace-subheading");actionHeading.append(node("div",undefined,"workspace-subheading__mark"),node("h3","Mes actions"));
    const workActionsMount=node("div",undefined,"workspace-module workspace-module--embedded");actionSection.append(actionHeading,workActionsMount);
    const taskSection=node("section",undefined,"workspace-work-section"),taskHeading=node("div",undefined,"workspace-subheading"),newTask=button("+ Nouvelle tâche",()=>taskUi.open(),"button button--primary");taskHeading.append(node("div",undefined,"workspace-subheading__mark workspace-subheading__mark--purple"),node("h3","Ma To-Do List"),newTask);
    const taskMount=node("div",undefined,"workspace-tasks");taskSection.append(taskHeading,taskMount);
    workPanel.append(workHeading,workKpis.element,workViews,actionSection,taskSection);shell.append(coordinationPanel,workPanel);root.append(shell);

    let workRows=[],tasks=[];
    const taskService=window.PersonnelTasks.create({grist:window.grist,mode:window.PilotageGristWrite,identify:()=>identityPromise});
    const taskUi=createTaskUi(taskMount,taskService,()=>{tasks=taskUi.tasks();updateWorkKpis();});
    coordinationController=window.PilotageActionCircuitUI.mount({
      element:coordinationMount,service:coordinationService,catalog,canWrite:true,allowCreate:true,allowAssignment:true,allowLifecycle:true,confirmWrites:true,
      initialFilter:"smart",filterOptions:[["open","Actions ouvertes"],["assign","À attribuer"],["review","À valider"],["creator","Mes demandes en cours"],["all","Toutes les actions"],["history","Historique"]],showCreate:false,showNotifications:true,showHeading:false,showSummary:false,
      onData:({rows,notifications})=>{
        coordinationKpis.set("assign",rows.filter(row=>row.roles?.assigner&&row.state==="to_assign").length);
        coordinationKpis.set("review",rows.filter(row=>row.roles?.creator&&row.state==="performed").length);
        coordinationKpis.set("requests",rows.filter(row=>row.roles?.creator&&activeAction(row)).length);
        coordinationKpis.set("unread",notifications.filter(item=>!item.read).length);
      }
    });
    const workController=window.PilotageActionCircuitUI.mount({
      element:workActionsMount,service:workService,catalog,canWrite:true,allowCreate:false,allowAssignment:false,allowLifecycle:true,confirmWrites:true,
      initialFilter:"executor",filterOptions:[["executor","Mes actions"]],rowPredicate:actionToDo,showCreate:false,showNotifications:false,showHeading:false,showSummary:false,showFilter:false,
      onData:({rows})=>{workRows=rows.filter(actionToDo);updateWorkKpis();}
    });

    function createKpis(definitions){const element=node("section",undefined,"circuit-summary workspace-kpis");element.setAttribute("aria-label","Indicateurs");const values={};for(const [key,label,tone] of definitions){const card=node("article",undefined,`circuit-kpi circuit-kpi--${tone}`);values[key]=node("strong","0");card.append(node("p",label),values[key]);element.append(card);}return{element,set(key,value){if(values[key])values[key].textContent=String(value);}};}
    function updateWorkKpis(){workKpis.set("actions",workRows.length);workKpis.set("lateActions",workRows.filter(actionLate).length);workKpis.set("tasks",tasks.filter(task=>!task.Terminee).length);workKpis.set("lateTasks",tasks.filter(taskLate).length);}
    function selectTab(name){const coordination=name==="coordination";coordinationPanel.hidden=!coordination;workPanel.hidden=coordination;coordinationTab.classList.toggle("is-active",coordination);workTab.classList.toggle("is-active",!coordination);coordinationTab.setAttribute("aria-current",coordination?"page":"false");workTab.setAttribute("aria-current",coordination?"false":"page");if(!coordination){workController.refresh();taskUi.refresh();}}
    function selectWorkView(name){actionSection.hidden=name==="tasks";taskSection.hidden=name==="actions";Object.entries(viewButtons).forEach(([key,item])=>item.classList.toggle("is-active",key===name));}

    function createTaskUi(element,service,onChange){
      let state=[],projects=[],editing=null,busy=false;
      const status=node("p","Chargement de votre To-Do List…","workspace-task-status");status.setAttribute("role","status");
      const list=node("div",undefined,"workspace-task-list"),dialog=node("dialog",undefined,"workspace-task-dialog"),form=node("form"),header=node("header",undefined,"circuit-dialog-header"),headerCopy=node("div"),eyebrow=node("p","ORGANISATION PERSONNELLE","circuit-eyebrow"),title=node("h2","Nouvelle tâche"),close=button("×",()=>closeDialog(),"circuit-dialog-close");close.setAttribute("aria-label","Fermer");headerCopy.append(eyebrow,title);header.append(headerCopy,close);
      const fields=node("div",undefined,"circuit-form-fields"),section=node("section",undefined,"circuit-form-section"),sectionHeading=node("div",undefined,"circuit-form-section__heading"),number=node("p","1"),sectionCopy=node("div");sectionCopy.append(node("h3","Informations de la tâche"),node("span","Une note privée, visible uniquement par vous"));sectionHeading.append(number,sectionCopy);section.append(sectionHeading);
      const titleField=field(section,"Intitulé *","title","text",true),noteField=field(section,"Note (facultative)","note","textarea"),projectField=field(section,"Projet associé (facultatif)","project","select"),deadlineField=field(section,"Échéance (facultative)","deadline","date");fields.append(section);
      const error=node("p",undefined,"circuit-form-error");error.setAttribute("role","alert");const controls=node("div",undefined,"circuit-controls"),cancel=button("Annuler",()=>closeDialog()),submit=node("button","Enregistrer","button button--primary");submit.type="submit";controls.append(cancel,submit);form.append(header,fields,error,controls);dialog.append(form);element.append(status,list,dialog);
      function field(parent,labelText,name,type,required=false){const label=node("label"),control=node(type==="textarea"?"textarea":type==="select"?"select":"input");control.name=name;if(control.tagName==="INPUT")control.type=type;control.required=required;label.append(node("span",labelText),control);parent.append(label);return control;}
      function setBusy(value){busy=value;[close,cancel,submit].forEach(item=>item.disabled=value);}
      function projectName(id){const project=projects.find(item=>Number(item.id)===Number(id));return project?.Nom_projet||project?.name||"";}
      function render(){list.replaceChildren();const open=state.filter(task=>!task.Terminee),done=state.filter(task=>task.Terminee);status.textContent=state.length?`${open.length} tâche(s) ouverte(s) · ${done.length} terminée(s).`:"Votre To-Do List est vide.";if(!state.length){list.append(node("p","Ajoutez ici vos tâches strictement personnelles.","circuit-empty"));return;}for(const task of [...open,...done]){const late=taskLate(task),card=node("article",undefined,`workspace-task-card${task.Terminee?" is-done":""}${late?" is-late":""}`),taskCopy=node("div",undefined,"workspace-task-card__copy"),name=node("h4",task.Intitule);taskCopy.append(name);if(task.Note)taskCopy.append(node("p",task.Note));const meta=node("div",undefined,"workspace-task-card__meta");if(task.Projet)meta.append(node("span",projectName(task.Projet)||"Projet"));if(task.Echeance)meta.append(node("span",`${late?"En retard · ":"Échéance · "}${formatDate(task.Echeance)}`));taskCopy.append(meta);const actions=node("div",undefined,"workspace-task-card__actions");actions.append(button(task.Terminee?"Rouvrir":"Terminer",()=>complete(task)),button("Modifier",()=>openDialog(task)));if(task.Terminee)actions.append(button("Supprimer",()=>remove(task)));card.append(taskCopy,actions);list.append(card);}}
      async function load(initial=false){if(busy)return;setBusy(true);try{const result=initial?await service.initialize():await service.refresh();state=result.tasks||[];projects=result.projects||[];projectField.replaceChildren();projectField.append(new Option("Aucun projet",""));projects.forEach(project=>projectField.append(new Option(project.Nom_projet||`Projet ${project.id}`,project.id)));render();onChange();}catch(reason){status.textContent=reason.message;list.replaceChildren();}finally{setBusy(false);}}
      function openDialog(task=null){if(busy)return;editing=task;form.reset();error.textContent="";title.textContent=task?"Modifier la tâche":"Nouvelle tâche";submit.textContent=task?"Enregistrer les modifications":"Créer la tâche";if(task){titleField.value=task.Intitule||"";noteField.value=task.Note||"";projectField.value=task.Projet||"";deadlineField.value=taskDateInput(task.Echeance);}dialog.showModal();fields.scrollTop=0;}
      function closeDialog(){if(busy)return;dialog.close();editing=null;form.reset();error.textContent="";}
      async function complete(task){setBusy(true);try{const result=await service.complete(task.id,!task.Terminee);state=result.tasks;projects=result.projects;render();onChange();}catch(reason){status.textContent=reason.message;}finally{setBusy(false);}}
      async function remove(task){if(!confirm(`Supprimer définitivement « ${task.Intitule} » ?`))return;setBusy(true);try{const result=await service.remove(task.id);state=result.tasks;projects=result.projects;render();onChange();}catch(reason){status.textContent=reason.message;}finally{setBusy(false);}}
      form.addEventListener("submit",async event=>{event.preventDefault();if(busy||!form.reportValidity())return;setBusy(true);error.textContent="";try{const result=await service.save(editing?.id??null,{title:titleField.value,note:noteField.value,projectId:Number(projectField.value)||0,deadline:deadlineField.value||null});state=result.tasks;projects=result.projects;setBusy(false);closeDialog();render();onChange();}catch(reason){error.textContent=reason.message;}finally{setBusy(false);}});
      dialog.addEventListener("cancel",event=>{event.preventDefault();closeDialog();});load(true);
      return{open:openDialog,refresh:()=>load(false),tasks:()=>[...state]};
    }

    await Promise.all([coordinationController.ready,workController.ready]);
  }catch(error){root.replaceChildren();const status=node("p",error.message);status.setAttribute("role","alert");const home=node("a","⌂ Accueil","button button--secondary workspace-home-link");home.href=window.PilotageNavigation.pageUrl("home");home.target="_top";root.append(status,home);}
})();
