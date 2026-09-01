"use strict";

// Final read-only validation of metadata, legacy counters and the administrator anchor.
(function expose(root,factory){
  const common=typeof module==="object"&&module.exports;
  const api=factory(common?require("./action-permission-audit.js"):root.PilotageActionPermissionAudit,common?require("./action-authority-permission-lot.js"):root.PilotageActionAuthorityPermissionLot,common?require("./action-legacy-live-audit.js"):root.PilotageActionLegacyLiveAudit,common?require("./action-account-live-audit.js"):root.PilotageActionAccountLiveAudit);
  if(common)module.exports=api;else root.PilotageActionFinalLiveAudit=api;
})(typeof globalThis==="object"?globalThis:this,function factory(permissionAudit,authorityLot,legacyAudit,accountAudit){
  const documentId="f8iwcexDATAwBKsaG6gZRs",managedTables=new Set(["ACTIONS","ACTIONS_CIRCUIT","ACTIONS_ATTRIBUTIONS","ACTIONS_EVENEMENTS","ACTIONS_NOTIFICATIONS","PILOTAGE_COMPTES","INTERLOCUTEURS","SERVICES","POLES","PROJETS"]),expectedManagedRuleCount=81;
  function rows(raw){if(!raw||!Array.isArray(raw.id))throw Error("Lecture des métadonnées impossible.");const columns=Object.entries(raw).filter(([,values])=>Array.isArray(values));if(columns.some(([,values])=>values.length!==raw.id.length))throw Error("Métadonnées tronquées.");return raw.id.map((_,index)=>Object.fromEntries(columns.map(([name,values])=>[name,values[index]])));}
  function review({metadata,permission,authority,legacy,account}){
    const findings=[...(permission.findings||[]),...(legacy.findings||[]),...(account.findings||[])],confirmed=[...(permission.confirmed||[])];
    if(!authority)findings.push("Les 41 règles des projets et de l’organisation ne sont pas conformes.");else confirmed.push("Projets et organisation : 41 règles conformes");
    if(!legacy.readyForActionPolicy)findings.push("Les 17 actions historiques ne sont pas confirmées.");else confirmed.push("Héritage : 17 actions préservées, circuit encore vide");
    if(!account.readyForAuthorityPolicy)findings.push("Le compte administrateur actif n’est pas confirmé.");else confirmed.push("Administration : compte actif et interlocuteur interne confirmés");
    const resourceIds=new Set(metadata.resources.filter(resource=>managedTables.has(resource.tableId)).map(resource=>resource.id)),managedRuleCount=metadata.rules.filter(rule=>resourceIds.has(rule.resource)).length;
    if(managedRuleCount!==expectedManagedRuleCount)findings.push(`Le périmètre géré contient ${managedRuleCount} règles au lieu des ${expectedManagedRuleCount} règles attendues.`);else confirmed.push(`${expectedManagedRuleCount} règles gérées relues dans les métadonnées`);
    return {findings,confirmed,managedRuleCount,expectedManagedRuleCount,readyForFinalValidation:permission.readyForPermissionReview===true&&authority===true&&legacy.readyForActionPolicy===true&&account.readyForAuthorityPolicy===true&&findings.length===0,actions:[],writesBusinessRows:false};
  }
  function create({grist}){let busy=false;return Object.freeze({async inspect(){if(busy)throw Error("Validation déjà en cours.");busy=true;try{if(await grist.docApi.getDocName()!==documentId)throw Error("Document de base non autorisé.");const names=["_grist_Tables","_grist_Tables_column","_grist_ACLResources","_grist_ACLRules"],values=await Promise.all(names.map(async name=>rows(await grist.docApi.fetchTable(name)))),metadata={documentId,tables:values[0],columns:values[1],resources:values[2],rules:values[3]};if(await grist.docApi.getDocName()!==documentId)throw Error("Le document a changé pendant la validation.");const permission=permissionAudit.inspect(metadata),authority=authorityLot.matches(metadata),[legacy,account]=await Promise.all([legacyAudit.create({grist}).inspect(),accountAudit.create({grist}).inspect()]);if(await grist.docApi.getDocName()!==documentId)throw Error("Le document a changé pendant la validation.");return review({metadata,permission,authority,legacy,account});}finally{busy=false;}}});}
  return Object.freeze({documentId,expectedManagedRuleCount,review,create});
});
