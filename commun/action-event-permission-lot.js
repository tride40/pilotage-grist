"use strict";

// Generated from the reviewed final policy. ACTIONS_EVENEMENTS permission lot only.
(function expose(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;else root.PilotageActionEventPermissionLot=api;
})(typeof globalThis==="object"?globalThis:this,function factory(){
  const tableId="ACTIONS_EVENEMENTS",expected=[
  {
    "key": "owner",
    "aclFormula": "user.Access == OWNER",
    "permissionsText": "+CRUD",
    "memo": "Administration du document."
  },
  {
    "key": "create-C",
    "aclFormula": "((user.IsLoggedIn and user.Access == EDITOR and user.PilotageCompte.id > 0 and user.PilotageCompte.Actif and user.PilotageCompte.Interlocuteur > 0) and (newRec.Auteur == user.PilotageCompte.Interlocuteur) and (newRec.ACL_revision_coherente) and (newRec.ACL_notifications_coherentes) and (newRec.ACL_rattachement_valide)) and (newRec.Operation == 'create')",
    "permissionsText": "+C",
    "memo": "Opération métier vérifiée."
  },
  {
    "key": "assign-C",
    "aclFormula": "((user.IsLoggedIn and user.Access == EDITOR and user.PilotageCompte.id > 0 and user.PilotageCompte.Actif and user.PilotageCompte.Interlocuteur > 0) and (newRec.Auteur == user.PilotageCompte.Interlocuteur) and (newRec.ACL_revision_coherente) and (newRec.ACL_notifications_coherentes) and (newRec.ACL_rattachement_valide)) and (newRec.Operation == 'assign')",
    "permissionsText": "+C",
    "memo": "Opération métier vérifiée."
  },
  {
    "key": "perform-C",
    "aclFormula": "((user.IsLoggedIn and user.Access == EDITOR and user.PilotageCompte.id > 0 and user.PilotageCompte.Actif and user.PilotageCompte.Interlocuteur > 0) and (newRec.Auteur == user.PilotageCompte.Interlocuteur) and (newRec.ACL_transition_autorisee) and (newRec.ACL_rattachement_valide)) and (newRec.Operation == 'perform')",
    "permissionsText": "+C",
    "memo": "Opération métier vérifiée."
  },
  {
    "key": "close-C",
    "aclFormula": "((user.IsLoggedIn and user.Access == EDITOR and user.PilotageCompte.id > 0 and user.PilotageCompte.Actif and user.PilotageCompte.Interlocuteur > 0) and (newRec.Auteur == user.PilotageCompte.Interlocuteur) and (newRec.ACL_transition_autorisee) and (newRec.ACL_rattachement_valide)) and (newRec.Operation == 'close')",
    "permissionsText": "+C",
    "memo": "Opération métier vérifiée."
  },
  {
    "key": "request_additional_work-C",
    "aclFormula": "((user.IsLoggedIn and user.Access == EDITOR and user.PilotageCompte.id > 0 and user.PilotageCompte.Actif and user.PilotageCompte.Interlocuteur > 0) and (newRec.Auteur == user.PilotageCompte.Interlocuteur) and (newRec.ACL_transition_autorisee) and (newRec.ACL_rattachement_valide)) and (newRec.Operation == 'request_additional_work')",
    "permissionsText": "+C",
    "memo": "Opération métier vérifiée."
  },
  {
    "key": "cancel-C",
    "aclFormula": "((user.IsLoggedIn and user.Access == EDITOR and user.PilotageCompte.id > 0 and user.PilotageCompte.Actif and user.PilotageCompte.Interlocuteur > 0) and (newRec.Auteur == user.PilotageCompte.Interlocuteur) and (newRec.ACL_transition_autorisee) and (newRec.ACL_rattachement_valide)) and (newRec.Operation == 'cancel')",
    "permissionsText": "+C",
    "memo": "Opération métier vérifiée."
  },
  {
    "key": "participant-read-R",
    "aclFormula": "user.IsLoggedIn and user.Access == EDITOR and user.PilotageCompte.id > 0 and user.PilotageCompte.Actif and user.PilotageCompte.Interlocuteur > 0 and user.PilotageCompte.Interlocuteur in rec.ACL_audience",
    "permissionsText": "+R",
    "memo": "Circuit visible par un participant autorisé."
  },
  {
    "key": "everyone-else",
    "aclFormula": "",
    "permissionsText": "-CRUD",
    "memo": "Aucun autre accès."
  }
];
  const compact=value=>String(value||"").replace(/\s/g,"");
  const owner=rule=>["user.Access==OWNER","user.Accessin[OWNER]"].includes(compact(rule.aclFormula));
  function definitions(){return expected.map(rule=>({...rule}));}
  function ordered(snapshot,resource){return snapshot.rules.filter(rule=>rule.resource===resource.id).sort((a,b)=>a.rulePos-b.rulePos);}
  function exact(rows){return rows.length===expected.length&&rows.every((rule,index)=>Number.isFinite(rule.rulePos)&&(!index||rule.rulePos>rows[index-1].rulePos)&&rule.permissionsText===expected[index].permissionsText&&compact(rule.aclFormula)===compact(expected[index].aclFormula));}
  function staging(rows){return rows.length===2&&owner(rows[0])&&rows[0].permissionsText==="+CRUD"&&rows[1].aclFormula===""&&rows[1].permissionsText==="-CRUD"&&Number.isFinite(rows[0].rulePos)&&Number.isFinite(rows[1].rulePos)&&rows[0].rulePos<rows[1].rulePos;}
  function matches(rows){return exact([...rows].sort((a,b)=>a.rulePos-b.rulePos));}
  function inspect(snapshot){
    if(!snapshot||!Array.isArray(snapshot.resources)||!Array.isArray(snapshot.rules))throw Error("Métadonnées de permissions incomplètes.");
    const resources=snapshot.resources.filter(resource=>resource.tableId===tableId&&resource.colIds==="*");
    if(resources.length!==1)return {findings:[`${tableId} : ressource de permission absente ou dupliquée.`],readyToInstall:false,alreadyInstalled:false,actions:[]};
    const rows=ordered(snapshot,resources[0]);
    if(exact(rows))return {findings:[],readyToInstall:false,alreadyInstalled:true,actions:[]};
    if(!staging(rows))return {findings:[`${tableId} : la protection actuelle ne correspond ni au confinement préparatoire ni aux règles finales.`],readyToInstall:false,alreadyInstalled:false,actions:[]};
    let nextId=Math.max(0,...snapshot.rules.map(rule=>rule.id));
    if(!Number.isSafeInteger(nextId)||nextId>Number.MAX_SAFE_INTEGER-(expected.length-2))throw Error("Identifiants de règles invalides.");
    const fields=(rule,rulePos)=>({resource:resources[0].id,aclFormula:rule.aclFormula,permissionsText:rule.permissionsText,memo:rule.memo,rulePos});
    const actions=[["UpdateRecord","_grist_ACLRules",rows[0].id,fields(expected[0],1)]];
    for(let index=1;index<expected.length-1;index++)actions.push(["AddRecord","_grist_ACLRules",++nextId,fields(expected[index],index+1)]);
    actions.push(["UpdateRecord","_grist_ACLRules",rows[1].id,fields(expected.at(-1),expected.length)]);
    return {findings:[],readyToInstall:true,alreadyInstalled:false,actions};
  }
  return Object.freeze({tableId,definitions,inspect,matches});
});
