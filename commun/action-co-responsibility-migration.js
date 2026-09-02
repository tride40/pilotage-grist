"use strict";

// Migration atomique des formules et permissions : les deux responsables d'un
// pôle deviennent co-responsables. Aucune donnée métier n'est modifiée.
(function expose(root,factory){
  const common=typeof module==="object"&&module.exports;
  const api=factory(
    common?require("./action-circuit-schema-lot.js"):root.PilotageActionCircuitSchemaLot,
    common?require("./action-event-schema-lot.js"):root.PilotageActionEventSchemaLot,
    common?require("./action-circuit-permission-lot.js"):root.PilotageActionCircuitPermissionLot,
    common?require("./action-authority-permission-lot.js"):root.PilotageActionAuthorityPermissionLot
  );
  if(common)module.exports=api;else root.PilotageActionCoResponsibilityMigration=api;
})(typeof globalThis==="object"?globalThis:this,function factory(circuitSchema,eventSchema,circuitRules,authorityRules){
  const documentId="f8iwcexDATAwBKsaG6gZRs",compact=value=>String(value||"").replace(/\s/g,"");
  const targetColumns=[
    ...circuitSchema.definitions().filter(column=>["ACL_creation_perimetre","ACL_attribution_perimetre","ACL_creation_enregistrement_coherent"].includes(column.id)).map(column=>({tableId:"ACTIONS_CIRCUIT",...column})),
    {tableId:"ACTIONS_EVENEMENTS",...eventSchema.definitions().find(column=>column.id==="ACL_notifications_coherentes")},
  ];
  const sharedPole=`  def pole(p):
    if not p.id or not p.Actif:
      raise ValueError("pole")
    head = person(p.Responsable, "Agent")
    deputy = person(p.Responsable_adjoint, "Agent") if p.Responsable_adjoint.id else None
    if head.id == dgs.id or (deputy and (deputy.id == dgs.id or deputy.id == head.id)):
      raise ValueError("pole")
    return p
  def managers(p):
    parent = pole(p)
    return [parent.Responsable.id] + ([parent.Responsable_adjoint.id] if parent.Responsable_adjoint.id else [])`;
  const oldPole=`  def pole(p):
    if not p.id or not p.Actif or person(p.Responsable, "Agent").id == dgs.id:
      raise ValueError("pole")
    return p`;
  function legacyFormula(column){
    let formula=column.formula;
    if(["ACL_creation_perimetre","ACL_attribution_perimetre"].includes(column.id))formula=formula
      .replace(sharedPole,oldPole)
      .replace('if p.id in managers(s.Pole):','if s.Pole.Responsable.id == p.id:')
      .replace('return next(pid for pid in [s.Responsable.id] + managers(s.Pole) + [dgs.id] if pid != p.id)','return next(pid for pid in [s.Responsable.id, s.Pole.Responsable.id, dgs.id] if pid != p.id)')
      .replace('return actor.id in managers(target_pole)','return pole(target_pole).Responsable.id == actor.id')
      .replace('return actor.id in [target_service.Responsable.id] + managers(target_service.Pole)','return actor.id in [target_service.Responsable.id, target_service.Pole.Responsable.id]')
      .replace('superior = dgs.id if target.id in managers(target_service.Pole) else target_service.Pole.Responsable.id','superior = target_service.Pole.Responsable.id\n    if superior == target.id:\n      superior = dgs.id');
    if(column.id==="ACL_creation_enregistrement_coherent")formula=formula.replace(
      '  context_pole = rec.Pole_destinataire if rec.Pole_destinataire.id else (rec.Service_contexte.Pole if rec.Service_contexte.id else None)\n  if context_pole and context_pole.id:\n    expected_audience.add(context_pole.Responsable.id)\n    if context_pole.Responsable_adjoint.id:\n      expected_audience.add(context_pole.Responsable_adjoint.id)\n','');
    if(column.id==="ACL_notifications_coherentes")formula=formula.replace(
      '  audience = [p.id for p in circuit.Audience_initiale]\n  if not audience or len(set(audience)) != len(audience):\n    return False\n  expected.extend(audience)\n  if rec.Operation == "assign":\n    chain = list(ACTIONS_ATTRIBUTIONS.lookupRecords(Action=rec.Action))',
      '  if rec.Operation == "assign":\n    audience = [p.id for p in circuit.Audience_initiale]\n    if not audience or len(set(audience)) != len(audience):\n      return False\n    chain = list(ACTIONS_ATTRIBUTIONS.lookupRecords(Action=rec.Action))\n    expected.extend(audience)');
    return {...column,formula};
  }
  const legacyColumns=targetColumns.map(legacyFormula);
  const targetCircuitRules=circuitRules.definitions(),legacyCircuitRules=targetCircuitRules.map(rule=>rule.key!=="assign-U"?rule:{...rule,aclFormula:rule.aclFormula.replace(
    "(user.PilotageCompte.Interlocuteur == rec.Createur or user.PilotageCompte.Interlocuteur == rec.Responsable_destinataire or (rec.Type_destinataire == 'Service' and user.PilotageCompte.Interlocuteur in [rec.Service_destinataire.Pole.Responsable, rec.Service_destinataire.Pole.Responsable_adjoint]) or (rec.Type_destinataire == 'Pôle' and user.PilotageCompte.Interlocuteur in [rec.Pole_destinataire.Responsable, rec.Pole_destinataire.Responsable_adjoint]))",
    "(user.PilotageCompte.Interlocuteur == rec.Createur or user.PilotageCompte.Interlocuteur == rec.Responsable_destinataire)")});
  const targetAuthority=authorityRules.definitions(),targetPoleAuthority=targetAuthority.find(item=>item.tableId==="POLES"&&item.colIds==="Actif,Responsable,Responsable_adjoint");
  const legacyPoleAuthority={...targetPoleAuthority,colIds:"Actif,Responsable",rules:targetPoleAuthority.rules.map(rule=>rule.key!=="unchanged-editor"?rule:{...rule,aclFormula:rule.aclFormula.replace(" and newRec.Responsable_adjoint == rec.Responsable_adjoint","")})};
  function rows(raw){
    if(!raw||!Array.isArray(raw.id))throw Error("Lecture des métadonnées impossible.");
    const columns=Object.entries(raw).filter(([,values])=>Array.isArray(values));
    if(columns.some(([,values])=>values.length!==raw.id.length))throw Error("Métadonnées tronquées.");
    return raw.id.map((_,index)=>Object.fromEntries(columns.map(([name,values])=>[name,values[index]])));
  }
  function column(snapshot,target){
    const table=snapshot.tables.filter(item=>item.tableId===target.tableId);if(table.length!==1)return null;
    const matches=snapshot.columns.filter(item=>item.parentId===table[0].id&&item.colId===target.id);return matches.length===1?matches[0]:null;
  }
  const exactColumn=(actual,target)=>actual&&actual.type===target.type&&(actual.formula||"")===(target.formula||"");
  function resource(snapshot,tableId,colIds){const matches=snapshot.resources.filter(item=>item.tableId===tableId&&item.colIds===colIds);return matches.length===1?matches[0]:null;}
  function ordered(snapshot,parent){return parent?snapshot.rules.filter(rule=>rule.resource===parent.id).sort((a,b)=>a.rulePos-b.rulePos):[];}
  function exactRules(actual,target){return actual.length===target.length&&actual.every((rule,index)=>rule.permissionsText===target[index].permissionsText&&compact(rule.aclFormula)===compact(target[index].aclFormula));}
  const exactRule=(actual,target)=>Boolean(actual)&&actual.permissionsText===target.permissionsText&&compact(actual.aclFormula)===compact(target.aclFormula);
  function inspect(snapshot){
    if(!snapshot||!["tables","columns","resources","rules"].every(key=>Array.isArray(snapshot[key])))throw Error("Métadonnées incomplètes.");
    const targetCircuitResource=resource(snapshot,"ACTIONS_CIRCUIT","*"),targetPoleResource=resource(snapshot,"POLES",targetPoleAuthority.colIds),legacyPoleResource=resource(snapshot,"POLES",legacyPoleAuthority.colIds);
    const findings=[],actions=[];
    targetColumns.forEach((item,index)=>{
      const actual=column(snapshot,item);
      if(exactColumn(actual,item))return;
      if(exactColumn(actual,legacyColumns[index]))actions.push(["ModifyColumn",item.tableId,item.id,{type:item.type,isFormula:true,formula:item.formula}]);
      else findings.push(`Formule inattendue : ${item.tableId}.${item.id}.\n${actual&&actual.formula?actual.formula:"(formule absente)"}`);
    });
    const circuitRows=ordered(snapshot,targetCircuitResource),targetAssign=targetCircuitRules.findIndex(rule=>rule.key==="assign-U"),actualAssign=circuitRows[targetAssign];
    if(!targetCircuitResource)findings.push("Ressource de permissions ACTIONS_CIRCUIT introuvable.");
    else if(!exactRule(actualAssign,targetCircuitRules[targetAssign])){
      if(exactRule(actualAssign,legacyCircuitRules[targetAssign]))actions.push(["UpdateRecord","_grist_ACLRules",actualAssign.id,{aclFormula:targetCircuitRules[targetAssign].aclFormula}]);
      else findings.push("Règle d’attribution ACTIONS_CIRCUIT inattendue.");
    }
    if(targetPoleResource&&legacyPoleResource)findings.push("Deux ressources de permissions POLES concurrentes.");
    const poleResource=targetPoleResource||legacyPoleResource;
    if(!poleResource)findings.push("Ressource de permissions POLES introuvable.");
    const unchanged=targetPoleAuthority.rules.findIndex(rule=>rule.key==="unchanged-editor"),authorityRows=ordered(snapshot,poleResource),actualUnchanged=authorityRows[unchanged];
    if(poleResource&&!exactRule(actualUnchanged,targetPoleAuthority.rules[unchanged])){
      if(exactRule(actualUnchanged,legacyPoleAuthority.rules[unchanged]))actions.push(["UpdateRecord","_grist_ACLRules",actualUnchanged.id,{aclFormula:targetPoleAuthority.rules[unchanged].aclFormula}]);
      else findings.push("Règle de protection des responsables de pôle inattendue.");
    }
    if(legacyPoleResource)actions.push(["UpdateRecord","_grist_ACLResources",legacyPoleResource.id,{colIds:targetPoleAuthority.colIds}]);
    if(findings.length)return {findings,readyToInstall:false,alreadyInstalled:false,actions:[],changed:0};
    if(!actions.length)return {findings:[],readyToInstall:false,alreadyInstalled:true,actions:[],changed:0};
    return {findings:[],readyToInstall:true,alreadyInstalled:false,actions,changed:actions.length};
  }
  function create({grist,mode}){
    let busy=false,preview=null,outcomeUncertain=false;
    async function guard(){if(!mode||mode.isReadOnly())throw Error("Installation indisponible.");mode.assertWritable();if(await grist.docApi.getDocName()!==documentId)throw Error("Document de base non autorisé.");}
    async function snapshot(){await guard();const names=["_grist_Tables","_grist_Tables_column","_grist_ACLResources","_grist_ACLRules"],values=await Promise.all(names.map(async name=>rows(await grist.docApi.fetchTable(name))));await guard();return{tables:values[0],columns:values[1],resources:values[2],rules:values[3]};}
    const report=value=>({...value,outcomeUncertain});
    return Object.freeze({
      async inspect(){if(busy)throw Error("Adaptation déjà en cours.");preview=null;const current=await snapshot(),result=inspect(current);if(result.readyToInstall)preview=JSON.stringify(current);return report(result);},
      async install({confirmed=false}={}){if(busy)throw Error("Adaptation déjà en cours.");if(outcomeUncertain)throw Error("Résultat précédent incertain : ne recommencez pas.");if(!confirmed||!preview)throw Error("Vérifiez puis confirmez explicitement l’adaptation.");busy=true;try{const current=await snapshot();if(JSON.stringify(current)!==preview){preview=null;throw Error("Les permissions ont changé : refaites la vérification.");}const result=inspect(current);if(!result.readyToInstall||!result.actions.length)throw Error("Adaptation bloquée.");preview=null;outcomeUncertain=true;await grist.docApi.applyUserActions(result.actions);const verified=inspect(await snapshot());if(!verified.alreadyInstalled)throw Error("La relecture ne confirme pas l’adaptation.");outcomeUncertain=false;return report(verified);}catch(error){if(outcomeUncertain)throw Error(`Ne relancez pas automatiquement. ${error.message}`);throw error;}finally{busy=false;}}
    });
  }
  return Object.freeze({documentId,inspect,create,legacy:{columns:legacyColumns,circuitRules:legacyCircuitRules,poleAuthority:legacyPoleAuthority}});
});
