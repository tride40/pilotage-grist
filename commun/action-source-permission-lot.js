"use strict";

// Generated from the reviewed final policy. ACTIONS permission lot only.
(function expose(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;else root.PilotageActionSourcePermissionLot=api;
})(typeof globalThis==="object"?globalThis:this,function factory(){
  const tableId="ACTIONS",expected=[
  {
    "key": "owner",
    "aclFormula": "user.Access == OWNER",
    "permissionsText": "+CRUD",
    "memo": "Administration du document."
  },
  {
    "key": "circuit-create",
    "aclFormula": "user.IsLoggedIn and user.Access == EDITOR and user.PilotageCompte.id > 0 and user.PilotageCompte.Actif and user.PilotageCompte.Interlocuteur > 0 and newRec.ACL_circuit_auteur == user.PilotageCompte.Interlocuteur and newRec.ACL_circuit_source_coherent and newRec.ACL_circuit_operation == 'create' and newRec.Revision_circuit == 1 and newRec.Demandee_par == user.PilotageCompte.Interlocuteur",
    "permissionsText": "+C",
    "memo": "Écriture du circuit vérifiée."
  },
  {
    "key": "circuit-assign",
    "aclFormula": "user.IsLoggedIn and user.Access == EDITOR and user.PilotageCompte.id > 0 and user.PilotageCompte.Actif and user.PilotageCompte.Interlocuteur > 0 and newRec.ACL_circuit_auteur == user.PilotageCompte.Interlocuteur and newRec.ACL_circuit_source_coherent and rec.Circuit_actif and rec.Revision_circuit > 0 and newRec.Revision_circuit == rec.Revision_circuit + 1 and rec.Attribuee_a == 0 and rec.Statut == 'À attribuer' and newRec.Statut == 'En cours' and newRec.Attribuee_a > 0 and newRec.ACL_circuit_operation == 'assign' and newRec.id == rec.id and newRec.Action == rec.Action and newRec.Projet == rec.Projet and newRec.Demandee_par == rec.Demandee_par and newRec.Date_creation == rec.Date_creation and newRec.Resultat == rec.Resultat",
    "permissionsText": "+U",
    "memo": "Écriture du circuit vérifiée."
  },
  {
    "key": "circuit-transition",
    "aclFormula": "user.IsLoggedIn and user.Access == EDITOR and user.PilotageCompte.id > 0 and user.PilotageCompte.Actif and user.PilotageCompte.Interlocuteur > 0 and newRec.ACL_circuit_auteur == user.PilotageCompte.Interlocuteur and newRec.ACL_circuit_source_coherent and rec.Circuit_actif and rec.Revision_circuit > 0 and newRec.Revision_circuit == rec.Revision_circuit + 1 and newRec.ACL_circuit_operation in ['perform', 'close', 'request_additional_work', 'cancel'] and newRec.id == rec.id and newRec.Action == rec.Action and newRec.Projet == rec.Projet and newRec.Demandee_par == rec.Demandee_par and newRec.Attribuee_a == rec.Attribuee_a and newRec.Date_creation == rec.Date_creation and newRec.Echeance == rec.Echeance and newRec.Resultat == rec.Resultat",
    "permissionsText": "+U",
    "memo": "Écriture du circuit vérifiée."
  },
  {
    "key": "circuit-read",
    "aclFormula": "user.IsLoggedIn and user.Access == EDITOR and user.PilotageCompte.id > 0 and user.PilotageCompte.Actif and user.PilotageCompte.Interlocuteur > 0 and user.PilotageCompte.Interlocuteur in rec.ACL_audience",
    "permissionsText": "+R",
    "memo": "Participant autorisé à consulter le circuit."
  },
  {
    "key": "legacy-editor",
    "aclFormula": "user.IsLoggedIn and user.Access == EDITOR and not rec.Circuit_actif and rec.Revision_circuit == 0",
    "permissionsText": "+RUD",
    "memo": "Ancienne action : usage éditeur conservé, création interdite."
  },
  {
    "key": "legacy-viewer",
    "aclFormula": "user.IsLoggedIn and user.Access == VIEWER and not rec.Circuit_actif and rec.Revision_circuit == 0",
    "permissionsText": "+R",
    "memo": "Ancienne action : lecture lecteur conservée."
  },
  {
    "key": "managed-write-denial",
    "aclFormula": "user.Access != OWNER and rec.Circuit_actif",
    "permissionsText": "-UD",
    "memo": "Action gérée : aucune écriture hors opération vérifiée."
  },
  {
    "key": "everyone-else",
    "aclFormula": "",
    "permissionsText": "-CRUD",
    "memo": "Aucun autre accès."
  }
],preparedDenial="user.Access != OWNER and rec.Circuit_actif";
  const compact=value=>String(value||"").replace(/\s/g,"");
  const owner=rule=>["user.Access==OWNER","user.Accessin[OWNER]"].includes(compact(rule.aclFormula));
  const ordered=(snapshot,resource)=>snapshot.rules.filter(rule=>rule.resource===resource.id).sort((a,b)=>a.rulePos-b.rulePos);
  const orderedRows=rows=>rows.every((rule,index)=>Number.isFinite(rule.rulePos)&&(!index||rule.rulePos>rows[index-1].rulePos));
  function definitions(){return expected.map(rule=>({...rule}));}
  function exact(rows){return rows.length===expected.length&&orderedRows(rows)&&rows.every((rule,index)=>rule.permissionsText===expected[index].permissionsText&&(index?compact(rule.aclFormula)===compact(expected[index].aclFormula):owner(rule)));}
  function prepared(rows){
    if(!orderedRows(rows)||![2,3].includes(rows.length)||!owner(rows[0])||rows[0].permissionsText!=="+CRUD")return false;
    if(compact(rows[1].aclFormula)!==compact(preparedDenial)||rows[1].permissionsText!=="-UD")return false;
    return rows.length===2||(rows[2].aclFormula===""&&rows[2].permissionsText===""&&!(rows[2].userAttributes||""));
  }
  function matches(rows){return exact([...rows].sort((a,b)=>a.rulePos-b.rulePos));}
  function inspect(snapshot){
    if(!snapshot||!Array.isArray(snapshot.resources)||!Array.isArray(snapshot.rules))throw Error("Métadonnées de permissions incomplètes.");
    const resources=snapshot.resources.filter(resource=>resource.tableId===tableId&&resource.colIds==="*");
    if(resources.length!==1)return {findings:["ACTIONS : ressource de permission absente ou dupliquée."],readyToInstall:false,alreadyInstalled:false,actions:[]};
    const rows=ordered(snapshot,resources[0]);
    if(exact(rows))return {findings:[],readyToInstall:false,alreadyInstalled:true,actions:[]};
    if(!prepared(rows))return {findings:["ACTIONS : les règles actuelles ne correspondent pas à la protection préparatoire reconnue."],readyToInstall:false,alreadyInstalled:false,actions:[]};
    let nextId=Math.max(0,...snapshot.rules.map(rule=>rule.id));
    if(!Number.isSafeInteger(nextId)||nextId>Number.MAX_SAFE_INTEGER-expected.length)throw Error("Identifiants de règles invalides.");
    const fields=(rule,rulePos)=>({resource:resources[0].id,aclFormula:rule.aclFormula,permissionsText:rule.permissionsText,memo:rule.memo,rulePos});
    const actions=[["UpdateRecord","_grist_ACLRules",rows[0].id,fields(expected[0],1)]];
    for(let index=1;index<7;index++)actions.push(["AddRecord","_grist_ACLRules",++nextId,fields(expected[index],index+1)]);
    actions.push(["UpdateRecord","_grist_ACLRules",rows[1].id,fields(expected[7],8)]);
    if(rows[2])actions.push(["UpdateRecord","_grist_ACLRules",rows[2].id,fields(expected[8],9)]);
    else actions.push(["AddRecord","_grist_ACLRules",++nextId,fields(expected[8],9)]);
    return {findings:[],readyToInstall:true,alreadyInstalled:false,actions};
  }
  return Object.freeze({tableId,definitions,inspect,matches});
});
