"use strict";

// One-shot migration for editor lifecycle writes. It recognizes only the
// reviewed legacy state or the exact corrected state and never touches data.
(function expose(root,factory){
  const common=typeof module==="object"&&module.exports;
  const api=factory(
    common?require("./action-event-schema-lot.js"):root.PilotageActionEventSchemaLot,
    common?require("./action-source-schema-lot.js"):root.PilotageActionSourceSchemaLot,
    common?require("./action-notification-schema-lot.js"):root.PilotageActionNotificationSchemaLot,
    common?require("./action-event-permission-lot.js"):root.PilotageActionEventPermissionLot,
    common?require("./action-circuit-permission-lot.js"):root.PilotageActionCircuitPermissionLot
  );
  if(common)module.exports=api;else root.PilotageActionEditorTransitionMigration=api;
})(typeof globalThis==="object"?globalThis:this,function factory(eventSchema,sourceSchema,notificationSchema,eventRules,circuitRules){
  const documentId="f8iwcexDATAwBKsaG6gZRs";
  const transitionKeys=new Set(["perform","close","request_additional_work","cancel"]);
  const compact=value=>String(value||"").replace(/\s/g,"");
  const targetColumn=(module,id)=>module.definitions().find(column=>column.id===id);
  const sourceTarget=targetColumn(sourceSchema,"ACL_circuit_source_coherent");
  const noticeTarget=targetColumn(notificationSchema,"ACL_notification_valide");
  const eventTarget=targetColumn(eventSchema,"ACL_transition_autorisee");
  const sourceLegacy={...sourceTarget,formula:sourceTarget.formula.replace(
    "if len(events) != 1 or not circuit.ACL_revision_coherente:",
    "if len(events) != 1 or not circuit.ACL_revision_coherente or not circuit.ACL_evenement_notifications_coherentes:"
  )};
  const noticeLegacy={...noticeTarget,formula:noticeTarget.formula.replace(
    "if not event.id or not event.ACL_revision_coherente:",
    "if not event.id or not event.ACL_revision_coherente or not event.ACL_notifications_coherentes:"
  )};
  function legacyRules(module,kind){
    return module.definitions().map(rule=>{
      const operation=rule.key.replace(/-[CU]$/,"");
      if(!transitionKeys.has(operation))return rule;
      if(kind==="event")return {...rule,aclFormula:rule.aclFormula.replace(
        "(newRec.ACL_transition_autorisee)",
        "(newRec.ACL_revision_coherente) and (newRec.ACL_notifications_coherentes)"
      )};
      return {...rule,aclFormula:rule.aclFormula.replace(
        " and newRec.ACL_revision_coherente and newRec.ACL_evenement_auteur",
        " and newRec.ACL_revision_coherente and newRec.ACL_evenement_notifications_coherentes and newRec.ACL_evenement_auteur"
      )};
    });
  }
  const eventLegacyRules=legacyRules(eventRules,"event"),circuitLegacyRules=legacyRules(circuitRules,"circuit");
  function exactColumn(actual,target){
    return actual&&actual.type===target.type&&Boolean(actual.isFormula)===target.isFormula&&(actual.formula||"")===(target.formula||"");
  }
  function resource(snapshot,tableId){
    const rows=snapshot.resources.filter(row=>row.tableId===tableId&&row.colIds==="*");
    return rows.length===1?rows[0]:null;
  }
  function orderedRules(snapshot,tableId){
    const parent=resource(snapshot,tableId);
    return parent?snapshot.rules.filter(rule=>rule.resource===parent.id).sort((a,b)=>a.rulePos-b.rulePos):[];
  }
  function exactRules(rows,definitions){
    return rows.length===definitions.length&&rows.every((row,index)=>
      row.permissionsText===definitions[index].permissionsText&&compact(row.aclFormula)===compact(definitions[index].aclFormula));
  }
  function findColumn(snapshot,tableId,colId){
    const tables=snapshot.tables.filter(table=>table.tableId===tableId);
    if(tables.length!==1)return [];
    return snapshot.columns.filter(column=>column.parentId===tables[0].id&&column.colId===colId);
  }
  function inspect(snapshot){
    if(!snapshot||!["tables","columns","resources","rules"].every(key=>Array.isArray(snapshot[key])))throw Error("Métadonnées incomplètes.");
    const source=findColumn(snapshot,"ACTIONS",sourceTarget.id),notice=findColumn(snapshot,"ACTIONS_NOTIFICATIONS",noticeTarget.id),event=findColumn(snapshot,"ACTIONS_EVENEMENTS",eventTarget.id);
    const eventRows=orderedRules(snapshot,"ACTIONS_EVENEMENTS"),circuitRows=orderedRules(snapshot,"ACTIONS_CIRCUIT");
    const target=source.length===1&&exactColumn(source[0],sourceTarget)&&notice.length===1&&exactColumn(notice[0],noticeTarget)&&event.length===1&&exactColumn(event[0],eventTarget)
      &&exactRules(eventRows,eventRules.definitions())&&exactRules(circuitRows,circuitRules.definitions());
    if(target)return {findings:[],readyToInstall:false,alreadyInstalled:true,actions:[],changedRules:8};
    const legacy=source.length===1&&exactColumn(source[0],sourceLegacy)&&notice.length===1&&exactColumn(notice[0],noticeLegacy)&&event.length===0
      &&exactRules(eventRows,eventLegacyRules)&&exactRules(circuitRows,circuitLegacyRules);
    if(!legacy)return {findings:["Les formules ou règles installées ne correspondent pas exactement à la version attendue. Aucun changement n’est proposé."],readyToInstall:false,alreadyInstalled:false,actions:[],changedRules:0};
    const actions=[
      ["AddColumn","ACTIONS_EVENEMENTS",eventTarget.id,{type:eventTarget.type,isFormula:true,formula:eventTarget.formula}],
      ["ModifyColumn","ACTIONS",sourceTarget.id,{type:sourceTarget.type,isFormula:true,formula:sourceTarget.formula}],
      ["ModifyColumn","ACTIONS_NOTIFICATIONS",noticeTarget.id,{type:noticeTarget.type,isFormula:true,formula:noticeTarget.formula}],
    ];
    for(const [rows,targets] of [[eventRows,eventRules.definitions()],[circuitRows,circuitRules.definitions()]]){
      targets.forEach((rule,index)=>{if(compact(rows[index].aclFormula)!==compact(rule.aclFormula))actions.push(["UpdateRecord","_grist_ACLRules",rows[index].id,{aclFormula:rule.aclFormula}]);});
    }
    return {findings:[],readyToInstall:true,alreadyInstalled:false,actions,changedRules:actions.length-3};
  }
  function rows(raw){
    if(!raw||!Array.isArray(raw.id))throw Error("Lecture des métadonnées impossible.");
    const columns=Object.entries(raw).filter(([,values])=>Array.isArray(values));
    if(columns.some(([,values])=>values.length!==raw.id.length))throw Error("Métadonnées tronquées.");
    return raw.id.map((_,index)=>Object.fromEntries(columns.map(([name,values])=>[name,values[index]])));
  }
  function create({grist,mode}){
    let busy=false,preview=null,outcomeUncertain=false;
    async function guard(){
      if(!mode||mode.isReadOnly())throw Error("Installation indisponible : la passerelle d’écriture Grist n’est pas prête.");
      mode.assertWritable();
      if(await grist.docApi.getDocName()!==documentId)throw Error("Document de base non autorisé.");
    }
    async function snapshot(){
      await guard();
      const names=["_grist_Tables","_grist_Tables_column","_grist_ACLResources","_grist_ACLRules"];
      const values=await Promise.all(names.map(async name=>rows(await grist.docApi.fetchTable(name))));
      await guard();
      return {tables:values[0],columns:values[1],resources:values[2],rules:values[3]};
    }
    const report=value=>({...value,outcomeUncertain});
    return Object.freeze({
      async inspect(){
        if(busy)throw Error("Correction déjà en cours.");
        preview=null;
        const current=await snapshot(),result=inspect(current);
        if(result.readyToInstall)preview=JSON.stringify(current);
        return report(result);
      },
      async install({confirmed=false}={}){
        if(busy)throw Error("Correction déjà en cours.");
        if(outcomeUncertain)throw Error("Résultat précédent incertain : ne recommencez pas.");
        if(!confirmed||!preview)throw Error("Vérifiez puis confirmez explicitement le correctif.");
        busy=true;
        try{
          const current=await snapshot();
          if(JSON.stringify(current)!==preview){preview=null;throw Error("Les permissions ont changé : refaites la vérification.");}
          const result=inspect(current);
          if(!result.readyToInstall||!result.actions.length)throw Error("Correctif bloqué.");
          preview=null;outcomeUncertain=true;
          await grist.docApi.applyUserActions(result.actions);
          const verified=inspect(await snapshot());
          if(!verified.alreadyInstalled)throw Error("La relecture ne confirme pas le correctif.");
          outcomeUncertain=false;
          return report(verified);
        }catch(error){
          if(outcomeUncertain)throw Error(`Ne relancez pas automatiquement. ${error.message}`);
          throw error;
        }finally{busy=false;}
      }
    });
  }
  return Object.freeze({documentId,inspect,create,legacy:{source:sourceLegacy,notice:noticeLegacy,eventRules:eventLegacyRules,circuitRules:circuitLegacyRules}});
});
