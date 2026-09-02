"use strict";

// Owner staging command builder, not a permission boundary or automatic migration.
(function(root,factory){
  const common=typeof module==="object"&&module.exports;
  const api=factory(common?require("./action-assignment.js"):root.PilotageActionAssignment,
    common?require("./action-directory.js"):root.PilotageActionDirectory,
    common?require("./action-associate-contexts.js"):root.PilotageActionAssociateContexts);
  if(common)module.exports=api;else root.PilotageActionGristAssignment=api;
})(typeof globalThis==="object"?globalThis:this,function(domain,directory,associateContexts){
  const labels={to_assign:"À attribuer",in_progress:"En cours"};
  const seconds=s=>s===null?null:Date.parse(s)/1000;
  const day=s=>s===null?null:seconds(`${s}T00:00:00.000Z`);
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  // Never invent a starting revision for an unprepared project.
  function projectProof(source,adds,eventId){
    const revision=source.Revision_rattachement,pointer=source.Evenement_rattachement;
    const raw=source.Agents_associes;
    if(!Number.isSafeInteger(revision)||revision<0||revision>=Number.MAX_SAFE_INTEGER
      ||!Number.isSafeInteger(pointer)||pointer<0||(revision===0)!==(pointer===0)
      ||!(raw===null||(Array.isArray(raw)&&raw[0]==="L"&&raw.slice(1).every(n=>Number.isSafeInteger(n)&&n>0)
        &&new Set(raw.slice(1)).size===raw.length-1)))
      throw Error("Preuve PROJETS absente ou invalide : préparation explicite nécessaire.");
    const previous=directory.refs(raw);
    return {Revision_rattachement_projet:adds.length?revision+1:0,
      Membres_projet_avant:["L",...(adds.length?previous:[])],
      project:adds.length?{Revision_rattachement:revision+1,Evenement_rattachement:eventId}:null};
  }
  function next(rows){
    const n=rows.reduce((max,r)=>Math.max(max,r.id),0)+1;
    if(!Number.isSafeInteger(n)||n<1||n>1000000)throw Error("Limite des identifiants atteinte : maintenance nécessaire.");
    return n;
  }
  function project(data,pid){
    const rows=data.PROJETS.filter(p=>p.id===pid);
    if(rows.length!==1)throw Error("Projet absent ou dupliqué.");
    const raw=Object.fromEntries(["INTERLOCUTEURS","SERVICES","POLES"].map(name=>{
      const rows=data[name];
      if(!Array.isArray(rows))throw Error("Annuaire non chargé.");
      const keys=[...new Set(["id",...rows.flatMap(Object.keys)])];
      return [name,Object.fromEntries(keys.map(k=>[k,rows.map(r=>r[k])]))];
    }));
    const org=directory.normalize(raw);
    return {org,project:directory.project(rows[0],org),source:rows[0]};
  }
  function finish(data,plan,actions,source,before){
    const row=plan.row,eventId=next(data.ACTIONS_EVENEMENTS),event=plan.event;
    const proof=projectProof(source,plan.addProjectAgentIds,eventId);
    actions.unshift(["AddRecord","ACTIONS_EVENEMENTS",eventId,{
      Action:row.id,Cle_evenement:event.key,Revision:row.revision,Auteur:event.actorId,Date_evenement:seconds(event.at),
      Operation:event.kind,Etape_avant:before,Etape_apres:labels[row.state],Precision:"",
      Revision_rattachement_projet:proof.Revision_rattachement_projet,Membres_projet_avant:proof.Membres_projet_avant,
    }]);
    if(plan.addProjectAgentIds.length)actions.push(["UpdateRecord","PROJETS",source.id,{
      Agents_associes:["L",...new Set([...directory.refs(source.Agents_associes),...plan.addProjectAgentIds])],
      ...proof.project,
    }]);
    for(const n of plan.notifications)actions.push(["AddRecord","ACTIONS_NOTIFICATIONS",null,{
      Action:row.id,Evenement:eventId,Cle_notification:n.key,Destinataire:n.recipientId,Type_notification:n.kind,Lue:false,Date_lecture:null,
    }]);
    return {actions,eventId,plan:{...plan,patch:{revision:row.revision,state:row.state,updatedAt:row.updatedAt,
      executorId:row.executorId,assignerId:row.assignerId,deadline:row.deadline}},actionId:row.id};
  }
  function creation(data,context,projectId,input,at){
    const loaded=project(data,projectId),id=next(data.ACTIONS);
    const plan=domain.create({title:input?.title,target:input?.target,deadline:input?.deadline,associates:input?.associates},context,loaded.org,loaded.project,{id,at});
    const r=plan.row;
    const c={Action:id,Version_circuit:1,Revision:1,Etape:labels[r.state],Createur:r.creatorId,Executant:r.executorId??0,
      Responsable_destinataire:r.assignerId??0,Type_destinataire:{person:"Agent",service:"Service",pole:"Pôle"}[r.targetKind],
      Agent_destinataire:r.targetKind==="person"?r.targetId:0,Service_destinataire:r.targetKind==="service"?r.targetId:0,
      Pole_destinataire:r.targetKind==="pole"?r.targetId:0,Service_contexte:r.serviceId??0,Superieur_direct:r.superiorId??0,
      Associes:["L",...r.associateIds],Contextes_associes:associateContexts.encode(r.associateContexts,r.associateIds),Date_realisation:null,Realisee_par:0,Date_cloture:null,Date_annulation:null,
      Audience_initiale:["L",...r.visibleTo],Bilan:"",Motif_complement:"",Motif_annulation:"",Modifie_le:seconds(at)};
    const calendar=new Intl.DateTimeFormat("fr-CA",{timeZone:"Europe/Paris",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(at));
    const actions=[
      ["AddRecord","ACTIONS",id,{Action:r.title,Projet:projectId,Demandee_par:r.creatorId,Attribuee_a:r.executorId??0,
        Statut:r.executorId===null?"À attribuer":"En cours",Date_creation:day(calendar),Echeance:day(r.deadline),Resultat:"",Revision_circuit:1}],
      ["AddRecord","ACTIONS_CIRCUIT",null,c],
      ["AddRecord","ACTIONS_ATTRIBUTIONS",null,{Action:id,Niveau:1,Attributaire:r.creatorId,Destinataire:r.executorId??r.assignerId,
        Service_contexte:r.serviceId??0,Date_attribution:seconds(at),Echeance:day(r.deadline),Revision_ecriture:r.revision}],
    ];
    return finish(data,plan,actions,loaded.source,"");
  }
  function attribution(data,decoded,context,input,at){
    const loaded=project(data,decoded.row.projectId);
    const plan=domain.assign(decoded.row,{target:input?.target,deadline:input?.deadline,expectedRevision:input?.expectedRevision,at},context,loaded.org,loaded.project);
    const r=plan.row;
    const actions=[
      ["UpdateRecord","ACTIONS",r.id,{Attribuee_a:r.executorId,Statut:"En cours",Echeance:day(r.deadline),Revision_circuit:r.revision}],
      ["UpdateRecord","ACTIONS_CIRCUIT",decoded.circuitId,{Executant:r.executorId,Responsable_destinataire:0,Service_contexte:r.serviceId??0,
        Superieur_direct:r.superiorId??0,Revision:r.revision,Etape:labels[r.state],Modifie_le:seconds(at)}],
    ];
    const old=data.ACTIONS_ATTRIBUTIONS.filter(a=>a.Action===r.id).sort((a,b)=>a.Niveau-b.Niveau);
    for(const level of r.deadlineChain){
      const values={Action:r.id,Niveau:level.id,Attributaire:level.personId,Destinataire:r.executorId,
        Service_contexte:r.serviceId??0,Date_attribution:seconds(at),Echeance:day(level.date),Revision_ecriture:r.revision};
      const existing=old.find(a=>a.Niveau===level.id);
      if(!existing)actions.push(["AddRecord","ACTIONS_ATTRIBUTIONS",null,values]);
      else if(level.id===r.deadlineChain.at(-1).id && existing.Attributaire===context.personId){
        // Only their deadline may change; preserve attribution time and context.
        actions.push(["UpdateRecord","ACTIONS_ATTRIBUTIONS",existing.id,{Echeance:day(level.date),Revision_ecriture:r.revision}]);
      }
    }
    return finish(data,plan,actions,loaded.source,"À attribuer");
  }
  function canAssign(data,row,context){
    const loaded=project(data,row.projectId);
    return domain.canAssign(loaded.org,loaded.project,row,context);
  }
  // Capture expected records BEFORE the write. A post-write discrepancy must
  // leave the caller uncertain, never silently overwrite or retry the batch.
  // This owner-staging check does not replace server permissions.
  function prepareConfirmation(data,bundle){
    const actionId=bundle.actionId, fields=["Action","Niveau","Attributaire","Destinataire","Service_contexte","Date_attribution","Echeance","Revision_ecriture"];
    const levels=data.ACTIONS_ATTRIBUTIONS.filter(r=>r.Action===actionId)
      .map(r=>Object.fromEntries(["id",...fields].map(k=>[k,r[k]])));
    const sourceFields={};
    for(const [operation,table,id,values] of bundle.actions){
      if(table==="ACTIONS"&&id===actionId)Object.assign(sourceFields,values);
      if(table!=="ACTIONS_ATTRIBUTIONS")continue;
      if(operation==="AddRecord")levels.push({id,...values});
      else if(operation==="UpdateRecord"){
        const level=levels.find(r=>r.id===id);
        if(!level)throw Error("Niveau d’attribution à modifier absent.");
        Object.assign(level,values);
      }else throw Error("Modification de chaîne non prise en charge.");
    }
    const planned=bundle.plan.row;
    const previousProject=data.PROJETS.find(p=>p.id===planned.projectId);
    const requiredMembers=[...new Set([...directory.refs(previousProject?.Agents_associes),...bundle.plan.addProjectAgentIds])];
    const expectedProof=projectProof(previousProject,bundle.plan.addProjectAgentIds,bundle.eventId).project;
    const proofFields=expectedProof||{Revision_rattachement:previousProject.Revision_rattachement,
      Evenement_rattachement:previousProject.Evenement_rattachement};
    const participants=[...planned.visibleTo];
    return function confirm(after,row){
      const actual=after.ACTIONS_ATTRIBUTIONS.filter(r=>r.Action===actionId);
      if(actual.length!==levels.length||levels.some(expected=>{
        const matches=actual.filter(r=>r.Niveau===expected.Niveau);
        return matches.length!==1||(expected.id!=null&&matches[0].id!==expected.id)
          ||fields.some(k=>matches[0][k]!==expected[k]);
      }))throw Error("Chaîne d’attribution enregistrée non confirmée : contrôler chaque niveau et échéance.");
      const source=after.ACTIONS.find(r=>r.id===actionId);
      if(!source||Object.entries(sourceFields).some(([k,v])=>source[k]!==v))
        throw Error("Action source enregistrée non confirmée.");
      const project=after.PROJETS.find(p=>p.id===planned.projectId);
      const actualMembers=directory.refs(project?.Agents_associes);
      if(actualMembers.length!==requiredMembers.length||!requiredMembers.every(pid=>actualMembers.includes(pid))
        ||!project||Object.entries(proofFields).some(([k,v])=>project[k]!==v))
        throw Error("Rattachement au projet non confirmé : membres antérieurs ou nouveaux manquants.");
      if(!participants.every(pid=>row.visibleTo.includes(pid)))
        throw Error("Participants antérieurs ou nouveaux non confirmés.");
    };
  }
  // Preflight on the actual outgoing source mutations. This is a client guard,
  // not a replacement for server ACLs against direct table/API writes.
  function validateSourceWrites(data,bundle){
    const row=bundle.plan.row,kind=bundle.plan.event.kind;
    if(!["create","assign"].includes(kind)||bundle.actionId!==row.id)throw Error("Commande source non reconnue.");
    const sources=bundle.actions.filter(a=>a[1]==="ACTIONS");
    if(sources.length!==1)throw Error("Une seule écriture de l’action source est attendue.");
    const [operation,,sourceId,fields]=sources[0];
    const expected=kind==="create"?{
      Action:row.title,Projet:row.projectId,Demandee_par:row.creatorId,Attribuee_a:row.executorId??0,
      Statut:row.executorId===null?"À attribuer":"En cours",
      Date_creation:day(new Intl.DateTimeFormat("fr-CA",{timeZone:"Europe/Paris",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(bundle.plan.event.at))),
      Echeance:day(row.deadline),Resultat:"",Revision_circuit:1,
    }:{Attribuee_a:row.executorId,Statut:"En cours",Echeance:day(row.deadline),Revision_circuit:row.revision};
    if(operation!==(kind==="create"?"AddRecord":"UpdateRecord")||sourceId!==row.id
      ||!fields||Object.keys(fields).length!==Object.keys(expected).length
      ||Object.entries(expected).some(([key,value])=>fields[key]!==value))throw Error("Écriture ACTIONS hors du périmètre prévu.");
    const existing=data.ACTIONS.filter(a=>a.id===row.id);
    if((kind==="create"&&existing.length)||(kind==="assign"&&(existing.length!==1||existing[0].Projet!==row.projectId)))
      throw Error("Action source absente, déjà existante ou liée à un autre projet.");
    const projects=data.PROJETS.filter(p=>p.id===row.projectId);
    if(projects.length!==1)throw Error("Projet source absent ou dupliqué.");
    const previous=directory.refs(projects[0].Agents_associes);
    // Derive eligible additions from business roles, not from a supplied list.
    const eligible=kind==="create"?[...row.associateIds,...(row.executorId===null?[]:[row.executorId])]:[row.executorId];
    const additions=[...new Set(eligible)].filter(pid=>!previous.includes(pid)&&pid!==projects[0].Agent_pilote);
    const proof=projectProof(projects[0],additions,bundle.eventId);
    const eventWrites=bundle.actions.filter(a=>a[1]==="ACTIONS_EVENEMENTS");
    const event=eventWrites[0];
    if(eventWrites.length!==1||event[0]!=="AddRecord"||!Number.isSafeInteger(bundle.eventId)||bundle.eventId<=0
      ||event[2]!==bundle.eventId||event[3]?.Action!==row.id||event[3]?.Operation!==kind
      ||event[3]?.Revision_rattachement_projet!==proof.Revision_rattachement_projet
      ||!same(event[3]?.Membres_projet_avant,proof.Membres_projet_avant))
      throw Error("Preuve PROJETS de l’événement hors du périmètre prévu.");
    const projectWrites=bundle.actions.filter(a=>a[1]==="PROJETS");
    if(projectWrites.length!==(additions.length?1:0))throw Error("Écriture PROJETS absente, répétée ou inutile.");
    if(projectWrites.length){
      const [op,,id,values]=projectWrites[0],expectedMembers=[...new Set([...previous,...additions])];
      const members=values?.Agents_associes;
      if(op!=="UpdateRecord"||id!==row.projectId||Object.keys(values||{}).length!==3
        ||values.Revision_rattachement!==proof.project.Revision_rattachement
        ||values.Evenement_rattachement!==proof.project.Evenement_rattachement
        ||!Array.isArray(members)||members[0]!=="L"||members.length!==expectedMembers.length+1
        ||new Set(members.slice(1)).size!==expectedMembers.length||!expectedMembers.every(pid=>members.slice(1).includes(pid)))
        throw Error("Écriture PROJETS hors du périmètre prévu : conserver exactement les membres et ajouts autorisés.");
    }
    return true;
  }
  return Object.freeze({creation,attribution,canAssign,prepareConfirmation,validateSourceWrites});
});
