"use strict";

// Owner-only staging adapter. Does not migrate legacy actions or grant ACLs.
// All cooperating writers must append an event FIRST, using the observed global
// next event id. Duplicate ids abort a competing batch. This is not protection
// against a trusted owner editing/deleting the journal directly.
(function (root, factory) {
  const common = typeof module === "object" && module.exports;
  const api = factory(common ? require("./action-lifecycle.js") : root.PilotageActionLifecycle,
    common ? require("./action-directory.js") : root.PilotageActionDirectory,
    common ? require("./action-grist-schema.js") : root.PilotageActionGristSchema,
    common ? require("./action-grist-assignment.js") : root.PilotageActionGristAssignment,
    common ? require("./action-deadlines.js") : root.PilotageActionDeadlines,
    common ? require("./action-associate-contexts.js") : root.PilotageActionAssociateContexts,
    common ? require("./action-final-permission-gate.js") : root.PilotageActionFinalPermissionGate);
  if (common) module.exports = api;
  else root.PilotageActionGristLifecycle = api;
})(typeof globalThis === "object" ? globalThis : this, function (lifecycle, directory, schema, assignment, deadlines, associateContexts, finalGate) {
  const states = { "À attribuer":"to_assign", "En cours":"in_progress", "Complément demandé":"additional_work",
    "Réalisée à examiner":"performed", "Clôturée":"closed", "Annulée":"cancelled" };
  const labels = Object.fromEntries(Object.entries(states).map(([k,v]) => [v,k]));
  const positive = n => Number.isSafeInteger(n) && n > 0;
  function submissionLatch() {
    let uncertain = false;
    return Object.freeze({
      assertClear() { if (uncertain) throw Error("Résultat précédent incertain : contrôler le journal avant toute nouvelle commande."); },
      markSubmitted() { uncertain = true; },
      reconcile() { uncertain = false; },
      isUncertain() { return uncertain; },
    });
  }
  function iso(value, optional = false) {
    if (value === null && optional) return null;
    if (typeof value !== "number" || !Number.isFinite(value)) throw Error("Date Grist invalide.");
    try { return new Date(value * 1000).toISOString(); } catch { throw Error("Date Grist invalide."); }
  }
  const seconds = value => Date.parse(value) / 1000;
  function storedValueMatches(actual, expected) {
    if (Array.isArray(expected) && expected[0] === "L") {
      const actualRefs = actual == null ? [] : Array.isArray(actual) ? (actual[0] === "L" ? actual.slice(1) : actual) : null;
      return actualRefs !== null && JSON.stringify(actualRefs) === JSON.stringify(expected.slice(1));
    }
    return JSON.stringify(actual) === JSON.stringify(expected);
  }
  function one(rows, predicate) {
    const matches = rows.filter(predicate);
    if (matches.length !== 1) throw Error("Action absente, dupliquée ou non raccordée au circuit.");
    return matches[0];
  }
  function decode(data, actionId) {
    const source = one(data.ACTIONS, a => a.id === actionId);
    const c = one(data.ACTIONS_CIRCUIT, r => r.Action === actionId);
    const project = one(data.PROJETS, p => p.id === source.Projet);
    if (c.Version_circuit !== 1 || !positive(c.Revision) || !states[c.Etape]) throw Error("Version du circuit incompatible.");
    if (!positive(project.Elu_pilote) || !positive(project.Agent_pilote)) throw Error("Pilotes du projet non déterminés.");
    const attributions = data.ACTIONS_ATTRIBUTIONS.filter(a => a.Action === actionId).sort((a,b) => a.Niveau-b.Niveau);
    if (!attributions.length || attributions.some((a,i) => a.Niveau !== i+1 || !positive(a.Attributaire) || !positive(a.Destinataire))
      || attributions[0].Attributaire !== c.Createur) throw Error("Chaîne d’attribution incomplète.");
    const chainIds = [...new Set(attributions.map(a => a.Attributaire))];
    const pilotIds = [...new Set([project.Elu_pilote,project.Agent_pilote])];
    const associateIds = directory.refs(c.Associes);
    const contexts = associateContexts.decode(c.Contextes_associes,associateIds);
    const deadlineChain = attributions.map(a=>({id:a.Niveau,personId:a.Attributaire,date:a.Echeance===null?null:iso(a.Echeance).slice(0,10)}));
    const deadline = deadlines.effectiveDeadline(deadlineChain);
    // Initial audience is persisted business history, never inferred from the
    // private notification rows that happen to be readable by this account.
    const rawAudience=c.Audience_initiale;
    if(!Array.isArray(rawAudience)||rawAudience[0]!=="L"||rawAudience.length<2
      ||!rawAudience.slice(1).every(positive)||new Set(rawAudience.slice(1)).size!==rawAudience.length-1)
      throw Error("Participants initiaux absents ou invalides : reprise explicite nécessaire.");
    const initialAudience=rawAudience.slice(1);
    if(!initialAudience.includes(c.Createur))throw Error("Participants initiaux incohérents : créateur absent.");
    const recipient = c.Executant || c.Responsable_destinataire;
    if (source.Demandee_par !== c.Createur || source.Attribuee_a !== (c.Executant || 0) || source.Revision_circuit !== c.Revision || source.Statut !== c.Etape)
      throw Error("L’action source et son circuit ne correspondent plus.");
    const row = {id:actionId,kind:"action",projectId:source.Projet,title:source.Action,projectTitle:project.Nom_projet,
      creatorId:c.Createur,executorId:c.Executant || null,assignerId:c.Responsable_destinataire || null,
      superiorId:c.Superieur_direct === 0 ? null : c.Superieur_direct,
      targetKind:({Agent:"person",Service:"service","Pôle":"pole"})[c.Type_destinataire],
      targetId:c.Agent_destinataire||c.Service_destinataire||c.Pole_destinataire,
      serviceId:c.Service_contexte||null,deadlineChain,deadline,
      state:states[c.Etape],revision:c.Revision,updatedAt:iso(c.Modifie_le),chainIds,pilotIds,associateIds,associateContexts:contexts,
      initialAudience,visibleTo:[...new Set([c.Createur,recipient,...chainIds,...pilotIds,...associateIds,...initialAudience,
        ...attributions.map(a=>a.Destinataire),...(c.Superieur_direct ? [c.Superieur_direct] : [])])],
      performedAt:iso(c.Date_realisation,true),performedBy:c.Realisee_par || null,
      closedAt:iso(c.Date_cloture,true),cancelledAt:iso(c.Date_annulation,true),
      result:c.Bilan,additionalWorkReason:c.Motif_complement,cancellationReason:c.Motif_annulation,
    };
    const events = data.ACTIONS_EVENEMENTS.filter(e => e.Action === actionId).sort((a,b)=>a.Revision-b.Revision);
    if (events.length !== c.Revision || events.some((e,i) => e.Revision !== i+1
      || e.Cle_evenement !== `action:${actionId}:revision:${i+1}` || !positive(e.Auteur))) throw Error("Journal incomplet ou dupliqué.");
    const last = events.at(-1);
    if (last.Etape_apres !== c.Etape || iso(last.Date_evenement) !== row.updatedAt) throw Error("Le journal et le circuit sont désynchronisés.");
    return {row,circuitId:c.id};
  }
  function commands(decoded, context, command, events) {
    const plan = lifecycle.plan(decoded.row, context, command);
    const next = events.reduce((max,e)=>Math.max(max,e.id),0)+1;
    // Explicit Grist row ids currently have a one-million limit.
    if (next > 1000000) throw Error("Journal plein : maintenance nécessaire avant de continuer.");
    const e = plan.event;
    const actions = [["AddRecord","ACTIONS_EVENEMENTS",next,{
      Action:e.actionId,Cle_evenement:e.key,Revision:e.revision,Auteur:e.actorId,
      Date_evenement:seconds(e.at),Operation:e.operation,Etape_avant:labels[e.from],Etape_apres:labels[e.to],Precision:e.note,
      Revision_rattachement_projet:0,Membres_projet_avant:["L"],
    }]];
    const fields = {Etape:labels[plan.patch.state],Revision:plan.patch.revision,Modifie_le:seconds(plan.patch.updatedAt)};
    const mapping = {performedAt:"Date_realisation",performedBy:"Realisee_par",result:"Bilan",closedAt:"Date_cloture",
      additionalWorkReason:"Motif_complement",cancelledAt:"Date_annulation",cancellationReason:"Motif_annulation"};
    for (const [key,col] of Object.entries(mapping)) if (Object.hasOwn(plan.patch,key)) {
      fields[col] = ["performedAt","closedAt","cancelledAt"].includes(key) ? seconds(plan.patch[key]) : plan.patch[key];
    }
    actions.push(["UpdateRecord","ACTIONS_CIRCUIT",decoded.circuitId,fields]);
    actions.push(["UpdateRecord","ACTIONS",e.actionId,{Statut:labels[plan.patch.state],Revision_circuit:plan.patch.revision}]);
    for (const n of plan.notifications) actions.push(["AddRecord","ACTIONS_NOTIFICATIONS",null,{
      Action:n.actionId,Evenement:next,Cle_notification:n.key,Destinataire:n.recipientId,Type_notification:n.kind,Lue:false,Date_lecture:null,
    }]);
    return {actions,plan,eventId:next};
  }
  function create({grist,mode,identify,clock = () => new Date().toISOString(),requireFinalPermissions=false}) {
    let busy = false, latch = submissionLatch();
    async function guard() {
      if (!mode || mode.isReadOnly()) throw Error("Commandes interdites en simulation.");
      mode.assertWritable();
      if (await grist.docApi.getDocName() !== schema.documentId) throw Error("Document de base non autorisé.");
    }
    const fetch = async table => directory.records(await grist.docApi.fetchTable(table));
    async function confined(actions=[],context=null) {
      await guard();
      // Editors cannot read the complete ACL metadata in Grist. Their writes
      // remain authorized by the installed server rules; only designated
      // administrators can and must repeat the exact client-side ACL audit.
      if(requireFinalPermissions&&context?.administrator===false)return;
      if(requireFinalPermissions&&context?.administrator!==true)throw Error("Profil de contrôle des permissions indéterminé.");
      const names=["_grist_Tables","_grist_Tables_column","_grist_ACLResources","_grist_ACLRules"];
      const [tables,columns,resources,rules]=await Promise.all(names.map(fetch));
      const metadata={documentId:schema.documentId,tables,columns,resources,rules};
      const staged=schema.inspect(metadata).alreadyPrepared;
      const final=Boolean(finalGate?.inspect&&finalGate.inspect(metadata).readyForFunctionalPages);
      if(requireFinalPermissions&&!final)throw Error("Les 81 règles finales ne sont plus confirmées.");
      if(!staged&&!final)throw Error("Les protections propriétaire du circuit ne sont plus confirmées.");
      const writable={ACTIONS:{Action:"Text",Projet:"Ref:PROJETS",Demandee_par:"Ref:INTERLOCUTEURS",Attribuee_a:"Ref:INTERLOCUTEURS",
        Statut:"Choice",Date_creation:"Date",Echeance:"Date",Resultat:"Text",Revision_circuit:"Int"},PROJETS:{Agents_associes:"RefList:INTERLOCUTEURS",
          Revision_rattachement:"Int",Evenement_rattachement:"Ref:ACTIONS_EVENEMENTS"}};
      for(const [,table,,fields] of actions)if(writable[table]) {
        const parent=tables.find(t=>t.tableId===table);
        for(const key of Object.keys(fields)) {
          const col=columns.find(c=>c.parentId===parent?.id&&c.colId===key);
          if(!col||col.type!==writable[table][key]||col.isFormula!==false||(col.formula||"")!=="") {
            throw Error(`Colonne source non modifiable ou incompatible : ${table}.${key}.`);
          }
        }
      }
    }
    async function snapshot(actionId, withDirectory=false, context=null) {
      await confined([],context);
      const before = await fetch("ACTIONS_EVENEMENTS");
      const names=["ACTIONS","ACTIONS_CIRCUIT","ACTIONS_ATTRIBUTIONS","PROJETS",
        ...(withDirectory?["INTERLOCUTEURS","SERVICES","POLES"]:[])];
      const values = await Promise.all(names.map(fetch));
      const after = await fetch("ACTIONS_EVENEMENTS");
      if (JSON.stringify(before)!==JSON.stringify(after)) throw Error("Le journal a changé pendant la lecture : actualiser.");
      await guard();
      const data=Object.fromEntries(names.map((n,i)=>[n,values[i]])); data.ACTIONS_EVENEMENTS=after;
      return {decoded:actionId===null?null:decode(data,actionId),events:after,data};
    }
    async function identity() {
      const context=await identify();
      // Same validation as the domain planner, even for an empty preview.
      lifecycle.operations({visibleTo:[]},context);
      return context;
    }
    async function execute(actionId,input,operation="lifecycle",projectId=null) {
      if (busy) throw Error("Enregistrement déjà en cours.");
      latch.assertClear();
      busy=true;
      try {
        await guard();
        const context=await identity(), current=await snapshot(actionId,operation!=="lifecycle",context);
        const at=clock();
        const bundle=operation==="create"?assignment.creation(current.data,context,projectId,input,at):
          operation==="assign"?assignment.attribution(current.data,current.decoded,context,input,at):
          commands(current.decoded,context,{type:input?.type,note:input?.note,expectedRevision:input?.expectedRevision,at},current.events);
        actionId=bundle.actionId??actionId;
        if(operation!=="lifecycle")assignment.validateSourceWrites(current.data,bundle);
        const confirmEntry=operation!=="lifecycle"?assignment.prepareConfirmation(current.data,bundle):null;
        await confined(bundle.actions,context);
        latch.markSubmitted();
        await grist.docApi.applyUserActions(bundle.actions);
        const events=await fetch("ACTIONS_EVENEMENTS");
        const recorded=events.find(e=>e.id===bundle.eventId), expected=bundle.actions[0][3];
        if (!recorded || Object.entries(expected).some(([k,v])=>!storedValueMatches(recorded[k],v))) throw Error("Événement enregistré non confirmé.");
        const notifications=await fetch("ACTIONS_NOTIFICATIONS");
        const expectedNotices=bundle.actions.filter(a=>a[0]==="AddRecord"&&a[1]==="ACTIONS_NOTIFICATIONS");
        if(notifications.filter(n=>n.Evenement===bundle.eventId).length!==expectedNotices.length)
          throw Error("Notifications enregistrées non confirmées : nombre de destinataires inattendu.");
        for (const action of bundle.actions.filter(a=>a[0]==="AddRecord"&&a[1]==="ACTIONS_NOTIFICATIONS")) {
          const expected=action[3], matches=notifications.filter(n=>n.Cle_notification===expected.Cle_notification);
          if (matches.length!==1 || Object.entries(expected).some(([k,v])=>k!=="Lue" && k!=="Date_lecture" && matches[0][k]!==v)) throw Error("Notifications enregistrées non confirmées.");
        }
        const verified=await snapshot(actionId,false,context);
        const expectedAudience=operation==="create"?bundle.plan.row.visibleTo:current.decoded.row.initialAudience;
        if(expectedAudience.length!==verified.decoded.row.initialAudience.length
          ||!expectedAudience.every(pid=>verified.decoded.row.initialAudience.includes(pid)))
          throw Error("Participants initiaux enregistrés non confirmés.");
        const expectedAssociates=operation==="create"?bundle.plan.row:current.decoded.row;
        if(associateContexts.encode(verified.decoded.row.associateContexts,verified.decoded.row.associateIds)
          !==associateContexts.encode(expectedAssociates.associateContexts,expectedAssociates.associateIds))
          throw Error("Contextes des associés enregistrés non confirmés.");
        if (verified.decoded.row.revision < bundle.plan.patch.revision) throw Error("État enregistré non confirmé.");
        if (verified.decoded.row.revision === bundle.plan.patch.revision
          && Object.entries(bundle.plan.patch).some(([key,value])=>verified.decoded.row[key]!==value)) throw Error("Les champs enregistrés ne correspondent pas à la commande.");
        if(confirmEntry)confirmEntry(verified.data,verified.decoded.row);
        latch.reconcile();
        return {row:verified.decoded.row,eventKey:bundle.plan.event.key,ownerStagingOnly:true,businessWorkflowEnabled:false};
      } finally {busy=false;}
    }
    return Object.freeze({
      async list() {
        if(busy)throw Error("Enregistrement en cours.");
        await guard();const context=await identity(),current=await snapshot(null,false,context);
        return current.data.ACTIONS_CIRCUIT.map(c=>decode(current.data,c.Action).row)
          .filter(row=>row.visibleTo.includes(context.personId)).map(row=>({ ...row,
            roles:{creator:row.creatorId===context.personId,executor:row.executorId===context.personId,assigner:row.assignerId===context.personId},
            operations:[...lifecycle.operations(row,context),...(row.state==="to_assign"&&[row.creatorId,row.assignerId].includes(context.personId)?["assign"]:[])],
          }));
      },
      async catalog() {
        if(busy)throw Error("Enregistrement en cours.");
        await guard();const context=await identity();const {data}=await snapshot(null,true,context);
        const raw=Object.fromEntries(["INTERLOCUTEURS","SERVICES","POLES"].map(name=>{
          const rows=data[name],keys=[...new Set(["id",...rows.flatMap(Object.keys)])];
          return [name,Object.fromEntries(keys.map(k=>[k,rows.map(r=>r[k])]))];
        }));
        const org=directory.normalize(raw);
        return {people:org.people.filter(p=>p.active&&p.internal&&p.kind).map(p=>{
          const source=data.INTERLOCUTEURS.find(r=>r.id===p.id);
          return {...p,name:source.Nom_complet||[source.Prenom,source.Nom].filter(Boolean).join(" ")||`Interlocuteur ${p.id}`};
        }),services:org.services.map(s=>({...s,name:data.SERVICES.find(r=>r.id===s.id).Nom_service||`Service ${s.id}`})),
        poles:org.poles.map(p=>({...p,name:data.POLES.find(r=>r.id===p.id).Pole||`Pôle ${p.id}`})),
        projects:data.PROJETS.map(p=>({id:p.id,name:p.Nom_projet||`Projet ${p.id}`}))};
      },
      async notifications() {
        if(busy)throw Error("Enregistrement en cours.");
        await guard();const context=await identity();await confined([],context);
        const [notices,actions,events]=await Promise.all(["ACTIONS_NOTIFICATIONS","ACTIONS","ACTIONS_EVENEMENTS"].map(fetch));
        return notices.filter(notice=>notice.Destinataire===context.personId).map(notice=>{
          const action=actions.find(row=>row.id===notice.Action),event=events.find(row=>row.id===notice.Evenement);
          if(!action||!event||event.Action!==notice.Action||event.Operation!==notice.Type_notification)
            throw Error("Notification absente, incomplète ou désynchronisée.");
          return {id:notice.id,actionId:notice.Action,title:action.Action||`Action ${notice.Action}`,
            type:notice.Type_notification,read:Boolean(notice.Lue),occurredAt:iso(event.Date_evenement),readAt:iso(notice.Date_lecture,true)};
        }).sort((a,b)=>Number(a.read)-Number(b.read)||b.occurredAt.localeCompare(a.occurredAt)||b.id-a.id);
      },
      async markNotificationRead(notificationId) {
        if(busy)throw Error("Enregistrement en cours.");
        if(!positive(notificationId))throw Error("Notification invalide.");
        latch.assertClear();busy=true;
        try{
          await guard();const context=await identity();await confined([],context);
          const notices=await fetch("ACTIONS_NOTIFICATIONS"),matches=notices.filter(row=>row.id===notificationId&&row.Destinataire===context.personId);
          if(matches.length!==1)throw Error("Notification absente ou non autorisée.");
          if(matches[0].Lue)return {id:notificationId,read:true,alreadyRead:true};
          const readAt=seconds(clock()),actions=[["UpdateRecord","ACTIONS_NOTIFICATIONS",notificationId,{Lue:true,Date_lecture:readAt}]];
          await confined(actions,context);latch.markSubmitted();await grist.docApi.applyUserActions(actions);
          const verified=(await fetch("ACTIONS_NOTIFICATIONS")).filter(row=>row.id===notificationId&&row.Destinataire===context.personId);
          if(verified.length!==1||verified[0].Lue!==true||verified[0].Date_lecture!==readAt)
            throw Error("Lecture de la notification non confirmée.");
          latch.reconcile();return {id:notificationId,read:true,readAt:iso(readAt)};
        }finally{busy=false;}
      },
      async inspect(actionId) {
        if (busy) throw Error("Enregistrement en cours.");
        await guard();
        const context=await identity(), current=await snapshot(actionId,false,context);
        const row=current.decoded.row;
        return {row,operations:[...lifecycle.operations(row,context),...(row.visibleTo.includes(context.personId)&&row.state==="to_assign"&&[row.creatorId,row.assignerId].includes(context.personId)?["assign"]:[])],
          history:current.events.filter(event=>event.Action===actionId).sort((a,b)=>a.Revision-b.Revision).map(event=>({
            revision:event.Revision,authorId:event.Auteur,occurredAt:iso(event.Date_evenement),operation:event.Operation,
            from:event.Etape_avant||null,to:event.Etape_apres||null,note:event.Precision||"",
          })),
          outcomeUncertain:latch.isUncertain(),ownerStagingOnly:true,businessWorkflowEnabled:false};
      },
      execute:(actionId,input)=>execute(actionId,input),
      createAction:(projectId,input)=>execute(null,input,"create",projectId),
      assignAction:(actionId,input)=>execute(actionId,input,"assign"),
    });
  }
  return Object.freeze({create,decode,commands,submissionLatch});
});
