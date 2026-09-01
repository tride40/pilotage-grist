"use strict";

// Read-only checkpoint between the additive schema and the permission rollout.
// It returns observations only and can never produce Grist user actions.
(function expose(root,factory){
  const common=typeof module==="object"&&module.exports;
  const api=factory(
    common?require("./action-project-schema-lot.js"):root.PilotageActionProjectSchemaLot,
    common?require("./action-notification-permissions.js"):root.PilotageActionNotificationPermissions,
    common?require("./action-source-protection.js"):root.PilotageActionSourceProtection
  );
  if(common)module.exports=api;else root.PilotageActionPermissionAudit=api;
})(typeof globalThis==="object"?globalThis:this,function factory(projectLot,notificationPolicy,sourceProtection){
  const documentId="f8iwcexDATAwBKsaG6gZRs";
  const protectedTables=["ACTIONS_CIRCUIT","ACTIONS_ATTRIBUTIONS","ACTIONS_EVENEMENTS","ACTIONS_NOTIFICATIONS"];
  const compact=value=>String(value||"").replace(/\s/g,"");
  const owner=rule=>["user.Access==OWNER","user.Accessin[OWNER]"].includes(compact(rule.aclFormula));
  function validate(rows,label){
    if(!Array.isArray(rows)||rows.some(row=>!row||!Number.isSafeInteger(row.id)||row.id<=0)||new Set(rows.map(row=>row.id)).size!==rows.length)
      throw Error(`Métadonnées invalides : ${label}.`);
  }
  function ordered(snapshot,resource){
    const rows=snapshot.rules.filter(rule=>rule.resource===resource.id).sort((a,b)=>a.rulePos-b.rulePos);
    if(rows.some((rule,index)=>!Number.isFinite(rule.rulePos)||(index&&rule.rulePos<=rows[index-1].rulePos)))return null;
    return rows;
  }
  function staging(rows){return rows?.length===2&&owner(rows[0])&&rows[0].permissionsText==="+CRUD"&&rows[1].aclFormula===""&&rows[1].permissionsText==="-CRUD";}
  function inspect(snapshot){
    if(!projectLot?.inspect||!notificationPolicy?.matches||!sourceProtection?.condition)
      throw Error("Un module de contrôle des permissions manque dans la publication. Rechargez la version complète avant de poursuivre.");
    if(snapshot?.documentId!==documentId)throw Error("Contrôle réservé au document de base autorisé.");
    for(const label of ["tables","columns","resources","rules"])validate(snapshot[label],label);
    const findings=[],confirmed=[];
    const schema=projectLot.inspect(snapshot);
    if(!schema.alreadyInstalled)findings.push(...(schema.findings.length?schema.findings:["Le schéma additif n’est pas entièrement installé."]));
    else confirmed.push("Schéma additif : 7 lots conformes");

    const tableIds=new Set(snapshot.tables.map(table=>table.tableId));
    if(tableIds.size!==snapshot.tables.length)findings.push("Identifiants de tables dupliqués.");
    const resourcePairs=new Set();
    for(const resource of snapshot.resources){
      const key=`${resource.tableId}|${resource.colIds}`;
      if(resourcePairs.has(key))findings.push(`Ressource de permission dupliquée : ${key}.`);
      resourcePairs.add(key);
      if(!tableIds.has(resource.tableId)&&!resource.tableId.startsWith("*"))findings.push(`Permission liée à une table absente : ${resource.tableId}.`);
      if(!ordered(snapshot,resource))findings.push(`Ordre des règles invalide : ${resource.tableId}[${resource.colIds}].`);
    }
    const resourceIds=new Set(snapshot.resources.map(resource=>resource.id));
    for(const rule of snapshot.rules)if(!resourceIds.has(rule.resource))findings.push(`Règle sans ressource : ${rule.id}.`);

    const schemaDenied=snapshot.resources.some(resource=>resource.tableId==="*"&&resource.colIds==="*"&&
      snapshot.rules.some(rule=>rule.resource===resource.id&&compact(rule.aclFormula)==="user.Access!=OWNER"&&rule.permissionsText==="-S"));
    if(!schemaDenied)findings.push("L’interdiction globale de modifier la structure pour les non-propriétaires n’est pas confirmée.");
    else confirmed.push("Structure : modification interdite aux non-propriétaires");
    if(snapshot.rules.some(rule=>/\+[^-]*S/.test(rule.permissionsText||"")&&!owner(rule)))findings.push("Une règle accorde la modification de structure à un non-propriétaire.");

    const attributes=[];
    for(const rule of snapshot.rules.filter(rule=>rule.userAttributes)){
      try{attributes.push({rule,value:JSON.parse(rule.userAttributes)});}catch{findings.push(`Propriété utilisateur illisible : règle ${rule.id}.`);}
    }
    const mappings=attributes.filter(item=>item.value?.name==="PilotageCompte");
    if(mappings.length!==1||mappings[0].value.tableId!=="PILOTAGE_COMPTES"||mappings[0].value.lookupColId!=="Email"||mappings[0].value.charId!=="Email")
      findings.push("L’appariement du compte utilisateur par e-mail n’est pas confirmé.");
    else confirmed.push("Comptes : appariement utilisateur confirmé");

    for(const tableId of protectedTables){
      const resources=snapshot.resources.filter(resource=>resource.tableId===tableId&&resource.colIds==="*");
      if(resources.length!==1){findings.push(`${tableId} : ressource de permission absente ou dupliquée.`);continue;}
      const rows=ordered(snapshot,resources[0]);
      const valid=tableId==="ACTIONS_NOTIFICATIONS"?(staging(rows)||notificationPolicy.matches(rows)||notificationPolicy.matches(rows,{readOnly:true})):staging(rows);
      if(!valid)findings.push(`${tableId} : règles préparatoires à examiner.`);
      else confirmed.push(`${tableId} : protection préparatoire conforme`);
    }

    const actionResources=snapshot.resources.filter(resource=>resource.tableId==="ACTIONS"&&resource.colIds==="*");
    if(actionResources.length!==1)findings.push("ACTIONS : protection préparatoire absente ou dupliquée.");
    else{
      const rows=ordered(snapshot,actionResources[0])||[];
      const meaningful=rows.filter(rule=>rule.aclFormula||rule.permissionsText||rule.userAttributes);
      if(meaningful.length!==2||!owner(meaningful[0])||meaningful[0].permissionsText!=="+CRUD"||meaningful[1].aclFormula!==sourceProtection.condition||meaningful[1].permissionsText!=="-UD")
        findings.push("ACTIONS : protection préparatoire différente de celle attendue.");
      else confirmed.push("ACTIONS : protection des actions gérées conforme");
    }

    const accountResources=snapshot.resources.filter(resource=>resource.tableId==="PILOTAGE_COMPTES"&&resource.colIds==="*");
    const accountRead="user.IsLoggedIn and user.Access == EDITOR and user.PilotageCompte.id > 0 and user.PilotageCompte.Actif and rec.id == user.PilotageCompte.id";
    if(accountResources.length!==1)findings.push("PILOTAGE_COMPTES : protection absente ou dupliquée.");
    else{
      const rows=ordered(snapshot,accountResources[0])||[];
      if(rows.length!==3||!owner(rows[0])||rows[0].permissionsText!=="+CRUD"||compact(rows[1].aclFormula)!==compact(accountRead)||rows[1].permissionsText!=="+R"||rows[2].aclFormula!==""||rows[2].permissionsText!=="-CRUD")
        findings.push("PILOTAGE_COMPTES : règles actuelles à examiner.");
      else confirmed.push("PILOTAGE_COMPTES : protection actuelle conforme");
    }
    const preserved=snapshot.resources.filter(resource=>!protectedTables.includes(resource.tableId)&&!["ACTIONS","PILOTAGE_COMPTES"].includes(resource.tableId)).length;
    return {findings,confirmed,preservedResourceCount:preserved,readyForPermissionReview:findings.length===0,actions:[],writesBusinessRows:false,securityCertified:false};
  }
  return Object.freeze({documentId,inspect});
});
