"use strict";
(function(root){
  const labels={to_assign:"À attribuer",in_progress:"En cours",additional_work:"Complément demandé",performed:"Réalisée à examiner",closed:"Clôturée",cancelled:"Annulée"};
  const verbs={perform:"Déclarer réalisée",close:"Clôturer",request_additional_work:"Demander un complément",cancel:"Annuler l’action",assign:"Attribuer"};
  const eventLabels={create:"Création de l’action",assign:"Attribution de l’action",perform:"Réalisation déclarée",close:"Action clôturée",request_additional_work:"Complément demandé",cancel:"Action annulée"};
  const confirmations={
    create:"Créer cette action réelle dans le nouveau circuit ?",
    assign:"Enregistrer cette attribution réelle ?",
    perform:"Déclarer cette action comme réellement réalisée ?",
    close:"Clôturer définitivement cette action ?",
    request_additional_work:"Demander réellement un complément sur cette action ?",
    cancel:"Annuler réellement cette action ?"
  };
  function diagnosticDetails(error){
    const seen=new WeakSet();
    function clean(value,depth=0){
      if(value===null||["string","number","boolean"].includes(typeof value))return value;
      if(depth>=4||typeof value!=="object")return undefined;
      if(seen.has(value))return "[référence circulaire]";
      seen.add(value);
      if(Array.isArray(value))return value.slice(0,20).map(item=>clean(item,depth+1)).filter(item=>item!==undefined);
      const result={};
      for(const key of Object.getOwnPropertyNames(value).slice(0,30)){
        if(["stack","message"].includes(key))continue;
        let item;try{item=clean(value[key],depth+1);}catch{item="[illisible]";}
        if(item!==undefined)result[key]=item;
      }
      return result;
    }
    const details=clean(error);
    if(!details||typeof details!=="object"||!Object.keys(details).length)return "";
    const text=JSON.stringify(details);
    return text.length>2000?`${text.slice(0,2000)}…`:text;
  }
  function failureMessage(error){
    const message=typeof error?.message==="string"&&error.message.trim()?error.message.trim():"Erreur Grist non précisée.";
    const details=error?.details, raw=details?.memos;
    const memos=[...new Set((Array.isArray(raw)?raw:Object.values(raw||{})).flat(4)
      .filter(value=>typeof value==="string").map(value=>value.trim()).filter(Boolean))];
    const code=typeof error?.code==="string"&&error.code.trim()?error.code.trim():"";
    const diagnostic=[code&&`code ${code}`,...memos].filter(Boolean).join(" · ");
    const rawDetails=diagnosticDetails(error);
    return [diagnostic?`${message} (${diagnostic})`:message,rawDetails&&`Détails techniques : ${rawDetails}`].filter(Boolean).join("\n");
  }
  function mount({element,service,catalog={projects:[],people:[],services:[],poles:[]},canWrite=false,allowCreate=canWrite,allowAssignment=canWrite,allowLifecycle=canWrite,confirmWrites=false,banner="Écritures désactivées : activation du circuit en attente.",title="Circuit des actions",initialFilter="open",showCreate=true,showNotifications=false}){
    const doc=element.ownerDocument, win=doc.defaultView;
    let rows=[],notifications=[],notificationButtons=[],busy=false,locked=false,selected=null,opener=null,currentCapability=false,currentOperation=null,smartFilter=initialFilter==="smart";
    const node=(tag,text,cls)=>{const e=doc.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
    const button=(text,fn,cls="button button--secondary")=>{const e=node("button",text,cls);e.type="button";e.addEventListener("click",fn);return e;};
    const option=(select,value,label)=>{const e=node("option",label);e.value=value;select.append(e);};
    element.replaceChildren();
    const heading=node("header",undefined,"circuit-heading"), pageTitle=node("h1",title);
    const add=button("Nouvelle action",()=>openCreate(),"button button--primary");heading.append(pageTitle);if(showCreate)heading.append(add);
    const notice=node("p",banner,"circuit-notice"),status=node("p","");status.setAttribute("role","status");status.setAttribute("aria-live","polite");
    const notificationPanel=node("section",undefined,"card circuit-notifications"),notificationTitle=node("h2","Notifications"),notificationStatus=node("p","");
    notificationStatus.setAttribute("role","status");notificationPanel.setAttribute("aria-label","Notifications non lues");notificationPanel.append(notificationTitle,notificationStatus);
    const toolbar=node("div",undefined,"circuit-toolbar"), search=node("input"), filter=node("select");
    search.type="search";search.placeholder="Rechercher une action";search.setAttribute("aria-label","Rechercher une action");
    for(const [key,label] of [["open","Actions ouvertes"],["executor","Mes actions à réaliser"],["creator","Mes demandes en cours"],["review","À valider"],["all","Toutes les actions"],["history","Historique"]])option(filter,key,label);
    filter.value=["open","executor","creator","review","all","history"].includes(initialFilter)?initialFilter:"open";
    filter.setAttribute("aria-label","Afficher les actions");
    const refresh=button("Actualiser",()=>load());toolbar.append(search,filter,refresh);
    const list=node("section");list.setAttribute("aria-label","Liste des actions");
    const dialog=node("dialog");dialog.setAttribute("aria-labelledby","circuit-form-title");
    const form=node("form"),formTitle=node("h2");formTitle.id="circuit-form-title";
    const fields=node("div",undefined,"circuit-form-fields"),error=node("p",undefined,"circuit-form-error");error.setAttribute("role","alert");
    const controls=node("div",undefined,"circuit-controls"),back=button("Retour",()=>close()),submit=node("button","Enregistrer","button button--primary");submit.type="submit";
    controls.append(back,submit);form.append(formTitle,fields,error,controls);dialog.append(form);
    element.append(heading,notice,...(showNotifications?[notificationPanel]:[]),toolbar,status,list,dialog);
    function disabled(){add.disabled=busy||locked||!canWrite||!allowCreate;submit.disabled=busy||locked||!canWrite||!currentCapability;refresh.disabled=busy;back.disabled=busy;notificationButtons.forEach(item=>item.disabled=busy||locked||!canWrite);}
    function showSubmit(visible){submit.hidden=!visible;submit.style.display=visible?"":"none";}
    function resetDialogScroll(){dialog.scrollTop=0;form.scrollTop=0;fields.scrollTop=0;}
    function close(){if(busy)return;dialog.close();form.reset();fields.replaceChildren();selected=null;currentCapability=false;currentOperation=null;showSubmit(true);back.textContent="Retour";resetDialogScroll();opener?.focus();}
    function open(title,capability,operation){if(busy||locked||!canWrite||!capability)return false;currentCapability=true;currentOperation=operation;opener=doc.activeElement;form.reset();fields.replaceChildren();error.textContent="";formTitle.textContent=title;showSubmit(true);submit.textContent="Enregistrer";back.textContent="Retour";disabled();dialog.showModal();resetDialogScroll();return true;}
    function group(title){const e=node("fieldset");e.append(node("legend",title));fields.append(e);return e;}
    function field(parent,label,name,type="text",required=false){const wrap=node("label"),control=node(type==="select"?"select":type==="textarea"?"textarea":"input");control.name=name;if(control.tagName==="INPUT")control.type=type;control.required=required;wrap.append(node("span",label),control);parent.append(wrap);return control;}
    function destination(parent,withKind){
      const kind=withKind?field(parent,"Destinataire","kind","select"):null;
      if(kind)for(const [key,label]of [["person","Agent"],["service","Service"],["pole","Pôle"]])option(kind,key,label);
      const target=field(parent,"Choisir le destinataire","target","select",true),context=field(parent,"Service concerné","serviceId","select");
      function updateContext(){context.replaceChildren();option(context,"","Choisir le service");const person=catalog.people.find(p=>p.id===Number(target.value));
        const choices=(person?.serviceIds||[]).map(id=>catalog.services.find(s=>s.id===id)).filter(Boolean);
        context.parentElement.hidden=(kind?.value||"person")!=="person"||choices.length<2;context.required=!context.parentElement.hidden;
        choices.forEach(s=>option(context,s.id,s.name));if(choices.length===1)context.value=choices[0].id;
      }
      function populate(){target.replaceChildren();option(target,"","Choisir");const type=kind?.value||"person";
        const choices=type==="person"?catalog.people.filter(p=>p.kind==="agent"):type==="service"?catalog.services:catalog.poles;
        choices.forEach(p=>option(target,p.id,p.name));updateContext();}
      kind?.addEventListener("change",populate);target.addEventListener("change",updateContext);populate();
      return ()=>({kind:kind?.value||"person",id:Number(target.value),...(context.value&&!(kind&&kind.value!=="person")?{serviceId:Number(context.value)}:{})});
    }
    let collect=null;
    function openCreate(){if(!open("Nouvelle action",allowCreate,"create"))return;selected=null;
      const subject=group("1 · Projet et demande"),project=field(subject,"Projet","project","select",true);
      option(project,"","Choisir un projet");catalog.projects.forEach(p=>option(project,p.id,p.name));field(subject,"Intitulé","title","text",true).maxLength=500;
      const recipient=group("2 · Attribution"),getTarget=destination(recipient,true);
      const timing=group("3 · Calendrier"),date=field(timing,"Échéance (facultative)","deadline","date");
      const associates=group("4 · Agents associés (facultatif)"),items=[];
      catalog.people.filter(p=>p.kind==="agent").forEach(p=>{const check=field(associates,p.name,`associate-${p.id}`,"checkbox");const services=p.serviceIds||[];let selector=null;
        if(services.length>1){selector=field(associates,`Service pour ${p.name}`,`associate-service-${p.id}`,"select");option(selector,"","Choisir le service");services.forEach(id=>{const s=catalog.services.find(s=>s.id===id);if(s)option(selector,id,s.name);});selector.disabled=true;check.addEventListener("change",()=>{selector.disabled=!check.checked;selector.required=check.checked;});}
        items.push({p,check,selector});});
      collect=()=>service.createAction(Number(project.value),{title:form.elements.title.value,deadline:date.value||null,target:getTarget(),
        associates:items.filter(i=>i.check.checked).map(i=>({id:i.p.id,...(i.selector?{serviceId:Number(i.selector.value)}:{})}))});
    }
    async function openCommand(row,operation){
      const capability=operation==="assign"?allowAssignment:allowLifecycle;
      if(!canWrite||!capability||busy||locked)return;busy=true;disabled();
      try{const fresh=await service.inspect(row.id);selected=fresh.row;
        if(!fresh.operations.includes(operation))throw Error("Cette commande n’est plus disponible. Actualisez la liste.");
        busy=false;if(!open(verbs[operation],capability,operation))return;selected=fresh.row;
        const details=group(selected.title);let target=null;
        if(operation==="assign")target=destination(details,false);
        const deadline=operation==="assign"?field(details,"Échéance (facultative)","deadline","date"):null;
        const note=operation!=="assign"?field(details,["cancel","request_additional_work"].includes(operation)?"Motif obligatoire":"Bilan ou précision (facultatif)","note","textarea",["cancel","request_additional_work"].includes(operation)):null;
        if(note)note.maxLength=10000;
        collect=()=>operation==="assign"?service.assignAction(selected.id,{target:target(),deadline:deadline.value||null,expectedRevision:selected.revision}):
          service.execute(selected.id,{type:operation,note:note.value,expectedRevision:selected.revision});
      }catch(e){status.textContent=e.message;}finally{busy=false;disabled();}
    }
    const personName=id=>catalog.people.find(person=>person.id===id)?.name||"Non renseigné";
    const serviceName=id=>catalog.services.find(service=>service.id===id)?.name||"Non renseigné";
    const poleName=id=>catalog.poles.find(pole=>pole.id===id)?.name||"Non renseigné";
    function formatDate(value,withTime=false){if(!value)return null;const source=/^\d{4}-\d{2}-\d{2}$/.test(value)?`${value}T12:00:00`:value,date=new Date(source);if(Number.isNaN(date.getTime()))return value;return new Intl.DateTimeFormat("fr-FR",withTime?{dateStyle:"medium",timeStyle:"short"}:{dateStyle:"medium"}).format(date);}
    function detailLine(parent,label,value){if(value===null||value===undefined||value==="")return;const line=node("p");line.append(node("strong",`${label} : `),doc.createTextNode(String(value)));parent.append(line);}
    function targetName(row){return row.targetKind==="person"?personName(row.targetId):row.targetKind==="service"?serviceName(row.targetId):row.targetKind==="pole"?poleName(row.targetId):"Non renseigné";}
    async function openDetail(row){
      if(busy)return;busy=true;disabled();
      try{const fresh=await service.inspect(row.id);selected=fresh.row;opener=doc.activeElement;form.reset();fields.replaceChildren();error.textContent="";formTitle.textContent="Détail de l’action";currentCapability=false;currentOperation="view";showSubmit(false);back.textContent="Retour à la liste";
        const summary=group(selected.title);detailLine(summary,"Projet",selected.projectTitle);detailLine(summary,"État",labels[selected.state]||selected.state);detailLine(summary,"Échéance",formatDate(selected.deadline));detailLine(summary,"Dernière mise à jour",formatDate(selected.updatedAt,true));
        const actors=group("Acteurs");detailLine(actors,"Créateur",personName(selected.creatorId));detailLine(actors,"Destinataire",targetName(selected));detailLine(actors,"Exécutant",selected.executorId?personName(selected.executorId):"À attribuer");detailLine(actors,"Service concerné",selected.serviceId?serviceName(selected.serviceId):null);detailLine(actors,"Agents associés",selected.associateIds?.length?selected.associateIds.map(personName).join(", "):"Aucun");
        const outcomeValues=[["Bilan",selected.result],["Motif du complément",selected.additionalWorkReason],["Motif de l’annulation",selected.cancellationReason],["Déclarée réalisée le",formatDate(selected.performedAt,true)],["Clôturée le",formatDate(selected.closedAt,true)],["Annulée le",formatDate(selected.cancelledAt,true)]];
        if(outcomeValues.some(([,value])=>value)){const outcome=group("Réalisation et suivi");outcomeValues.forEach(([label,value])=>detailLine(outcome,label,value));}
        if(fresh.history?.length){const history=group("Historique");fresh.history.forEach(event=>{const entry=node("article",undefined,"circuit-history-entry");entry.append(node("h3",`${event.revision} · ${eventLabels[event.operation]||event.operation}`));detailLine(entry,"Auteur",personName(event.authorId));detailLine(entry,"Date",formatDate(event.occurredAt,true));if(event.from&&event.to)detailLine(entry,"Évolution",`${event.from} → ${event.to}`);detailLine(entry,"Précision",event.note);history.append(entry);});}
        if(fresh.operations?.length){const available=group("Actions disponibles"),bar=node("div",undefined,"circuit-controls");for(const operation of fresh.operations){const permitted=operation==="assign"?allowAssignment:allowLifecycle,b=button(verbs[operation],()=>{close();openCommand(fresh.row,operation);});b.disabled=!canWrite||!permitted||locked;bar.append(b);}available.append(bar);}
        disabled();dialog.showModal();resetDialogScroll();
      }catch(e){status.textContent=e.message;}finally{busy=false;disabled();}
    }
    function render(){list.replaceChildren();const shown=rows.filter(r=>{
      const terminal=["closed","cancelled"].includes(r.state);
      const scope=filter.value==="all"||filter.value==="history"?filter.value==="all"||terminal
        :filter.value==="review"?Boolean(r.roles?.creator&&r.state==="performed")
        :filter.value==="executor"?Boolean(r.roles?.executor&&!terminal)
        :filter.value==="creator"?Boolean(r.roles?.creator&&!terminal):!terminal;
      return scope&&`${r.title} ${r.projectTitle}`.toLocaleLowerCase("fr").includes(search.value.toLocaleLowerCase("fr"));});
      if(!shown.length)list.append(node("p","Aucune action dans cette vue.","circuit-empty"));
      shown.forEach(r=>{const card=node("article",undefined,"card circuit-card"),h=node("h2",r.title),meta=node("p",`${r.projectTitle} · ${labels[r.state]||r.state}`);
        card.append(h,meta);if(r.deadline)card.append(node("p",`Échéance : ${r.deadline}`));
        const bar=node("div",undefined,"circuit-controls");bar.append(button("Voir le détail",()=>openDetail(r)));for(const op of r.operations||[]){const permitted=op==="assign"?allowAssignment:allowLifecycle,b=button(verbs[op],()=>openCommand(r,op));b.disabled=!canWrite||!permitted||busy||locked;bar.append(b);}card.append(bar);list.append(card);});
    }
    function showAction(notification){filter.value="all";search.value=notification.title;render();list.scrollIntoView({block:"start",behavior:"smooth"});}
    function renderNotifications(){if(!showNotifications)return;notificationButtons=[];notificationPanel.replaceChildren(notificationTitle,notificationStatus);const unread=notifications.filter(item=>!item.read);notificationTitle.textContent=`Notifications${unread.length?` (${unread.length})`:""}`;
      notificationStatus.textContent=unread.length?`${unread.length} notification(s) non lue(s).`:"Aucune notification non lue.";
      unread.forEach(item=>{const card=node("article",undefined,"circuit-notification"),label=({create:"Nouvelle action",assign:"Action attribuée",perform:"Action déclarée réalisée",close:"Action clôturée",request_additional_work:"Complément demandé",cancel:"Action annulée"})[item.type]||"Mise à jour de l’action";
        card.append(node("h3",item.title),node("p",label));const controls=node("div",undefined,"circuit-controls"),view=button("Afficher l’action",()=>showAction(item)),read=button("Marquer comme lue",()=>markRead(item.id));notificationButtons.push(view,read);controls.append(view,read);card.append(controls);notificationPanel.append(card);});disabled();}
    async function markRead(id){if(busy||locked||!canWrite||typeof service.markNotificationRead!=="function")return;busy=true;disabled();try{await service.markNotificationRead(id);busy=false;await load();status.textContent="Notification marquée comme lue.";}catch(e){locked=true;status.textContent=failureMessage(e);}finally{busy=false;disabled();}}
    function chooseSmartFilter(){if(!smartFilter)return;const active=row=>!["closed","cancelled"].includes(row.state);filter.value=rows.some(row=>row.roles?.creator&&row.state==="performed")?"review"
        :rows.some(row=>row.roles?.executor&&active(row))?"executor"
        :rows.some(row=>row.roles?.creator&&active(row))?"creator":"open";smartFilter=false;}
    async function load(){if(busy)return;busy=true;disabled();try{const values=await Promise.all([service.list(),showNotifications&&typeof service.notifications==="function"?service.notifications():[]]);rows=values[0];notifications=values[1];chooseSmartFilter();status.textContent=`${rows.length} action(s) chargée(s).`;}catch(e){rows=[];notifications=[];status.textContent=e.message;}finally{busy=false;renderNotifications();disabled();render();}}
    form.addEventListener("submit",async event=>{event.preventDefault();if(busy||locked||!canWrite||!currentCapability||!collect||!form.reportValidity())return;
      if(confirmWrites&&!win.confirm(confirmations[currentOperation]||"Enregistrer cette opération réelle ?"))return;
      busy=true;disabled();error.textContent="";
      try{await collect();busy=false;close();await load();status.textContent="Action enregistrée.";}
      catch(e){error.textContent=failureMessage(e);
        // Any submission failure stays locked until the controller reconciles it.
        // Do not retry blindly after a network response was lost.
        locked=true;status.textContent="Envoi interrompu. Actualisez pour consulter ; aucun nouvel envoi avant contrôle.";
      }finally{busy=false;disabled();render();}});
    dialog.addEventListener("cancel",e=>{e.preventDefault();close();});search.addEventListener("input",render);filter.addEventListener("change",()=>{smartFilter=false;render();});
    disabled();const ready=load();
    return {ready,refresh:load,dispose(){locked=true;canWrite=false;rows=[];element.replaceChildren();}};
  }
  root.PilotageActionCircuitUI=Object.freeze({mount,failureMessage,diagnosticDetails});
})(typeof globalThis==="object"?globalThis:this);
