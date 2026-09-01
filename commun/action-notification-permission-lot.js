"use strict";

// Generated from the reviewed final policy. ACTIONS_NOTIFICATIONS permission lot only.
(function expose(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;else root.PilotageActionNotificationPermissionLot=api;
})(typeof globalThis==="object"?globalThis:this,function factory(){
  const tableId="ACTIONS_NOTIFICATIONS",expected=[
  {
    "key": "owner",
    "aclFormula": "user.Access == OWNER",
    "permissionsText": "+CRUD",
    "memo": "Administration du document."
  },
  {
    "key": "create-C",
    "aclFormula": "user.IsLoggedIn and user.Access == EDITOR and user.PilotageCompte.id > 0 and user.PilotageCompte.Actif and user.PilotageCompte.Interlocuteur > 0 and newRec.ACL_evenement_auteur == user.PilotageCompte.Interlocuteur and newRec.ACL_notification_valide and newRec.Lue == False and newRec.Date_lecture == None",
    "permissionsText": "+C",
    "memo": "Opération métier vérifiée."
  },
  {
    "key": "read-state-U",
    "aclFormula": "user.IsLoggedIn and user.Access == EDITOR and user.PilotageCompte.id > 0 and user.PilotageCompte.Actif and user.PilotageCompte.Interlocuteur > 0 and rec.Destinataire == user.PilotageCompte.Interlocuteur and newRec.id == rec.id and newRec.Action == rec.Action and newRec.Evenement == rec.Evenement and newRec.Cle_notification == rec.Cle_notification and newRec.Destinataire == rec.Destinataire and newRec.Type_notification == rec.Type_notification and ((newRec.Lue == False and newRec.Date_lecture == None) or (newRec.Lue == True and newRec.Date_lecture != None and newRec.Date_lecture >= 0))",
    "permissionsText": "+U",
    "memo": "Opération métier vérifiée."
  },
  {
    "key": "recipient-read-R",
    "aclFormula": "user.IsLoggedIn and user.Access == EDITOR and user.PilotageCompte.id > 0 and user.PilotageCompte.Actif and user.PilotageCompte.Interlocuteur > 0 and rec.Destinataire == user.PilotageCompte.Interlocuteur",
    "permissionsText": "+R",
    "memo": "Notification visible uniquement par son destinataire."
  },
  {
    "key": "everyone-else",
    "aclFormula": "",
    "permissionsText": "-CRUD",
    "memo": "Aucun autre accès."
  }
],prepared=[
  {
    "aclFormula": "user.Access == OWNER",
    "permissionsText": "+CRUD"
  },
  {
    "aclFormula": "user.IsLoggedIn and user.Access == EDITOR and user.PilotageCompte.id > 0 and user.PilotageCompte.Actif and user.PilotageCompte.Interlocuteur > 0 and rec.Destinataire == user.PilotageCompte.Interlocuteur",
    "permissionsText": "+R"
  },
  {
    "aclFormula": "user.IsLoggedIn and user.Access == EDITOR and user.PilotageCompte.id > 0 and user.PilotageCompte.Actif and user.PilotageCompte.Interlocuteur > 0 and rec.Destinataire == user.PilotageCompte.Interlocuteur and newRec.id == rec.id and newRec.Action == rec.Action and newRec.Evenement == rec.Evenement and newRec.Cle_notification == rec.Cle_notification and newRec.Destinataire == rec.Destinataire and newRec.Type_notification == rec.Type_notification and ((newRec.Lue == False and newRec.Date_lecture == None) or (newRec.Lue == True and newRec.Date_lecture != None and newRec.Date_lecture >= 0))",
    "permissionsText": "+U"
  },
  {
    "aclFormula": "",
    "permissionsText": "-CRUD"
  }
];
  const compact=value=>String(value||"").replace(/\s/g,"");
  const owner=rule=>["user.Access==OWNER","user.Accessin[OWNER]"].includes(compact(rule.aclFormula));
  function definitions(){return expected.map(rule=>({...rule}));}
  function ordered(snapshot,resource){return snapshot.rules.filter(rule=>rule.resource===resource.id).sort((a,b)=>a.rulePos-b.rulePos);}
  function exactProfile(rows,profile){return rows.length===profile.length&&rows.every((rule,index)=>Number.isFinite(rule.rulePos)&&(!index||rule.rulePos>rows[index-1].rulePos)&&rule.permissionsText===profile[index].permissionsText&&(index?compact(rule.aclFormula)===compact(profile[index].aclFormula):owner(rule)));}
  function exact(rows){return exactProfile(rows,expected);}
  function preparedProfile(rows){const staging=[{aclFormula:"user.Access == OWNER",permissionsText:"+CRUD"},{aclFormula:"",permissionsText:"-CRUD"}],readOnly=prepared.filter((_,index)=>index!==2);return exactProfile(rows,staging)||exactProfile(rows,prepared)||exactProfile(rows,readOnly);}
  function matches(rows){return exact([...rows].sort((a,b)=>a.rulePos-b.rulePos));}
  function inspect(snapshot){
    if(!snapshot||!Array.isArray(snapshot.resources)||!Array.isArray(snapshot.rules))throw Error("Métadonnées de permissions incomplètes.");
    const resources=snapshot.resources.filter(resource=>resource.tableId===tableId&&resource.colIds==="*");
    if(resources.length!==1)return {findings:[`${tableId} : ressource de permission absente ou dupliquée.`],readyToInstall:false,alreadyInstalled:false,actions:[]};
    const rows=ordered(snapshot,resources[0]);
    if(exact(rows))return {findings:[],readyToInstall:false,alreadyInstalled:true,actions:[]};
    if(!preparedProfile(rows))return {findings:[`${tableId} : les règles actuelles ne correspondent à aucun profil préparatoire reconnu.`],readyToInstall:false,alreadyInstalled:false,actions:[]};
    let nextId=Math.max(0,...snapshot.rules.map(rule=>rule.id));
    if(!Number.isSafeInteger(nextId)||nextId>Number.MAX_SAFE_INTEGER-expected.length)throw Error("Identifiants de règles invalides.");
    const fields=(rule,rulePos)=>({resource:resources[0].id,aclFormula:rule.aclFormula,permissionsText:rule.permissionsText,memo:rule.memo,rulePos});
    const actions=[["UpdateRecord","_grist_ACLRules",rows[0].id,fields(expected[0],1)]],middle=rows.slice(1,-1);
    for(let index=1;index<expected.length-1;index++)actions.push(index-1<middle.length
      ?["UpdateRecord","_grist_ACLRules",middle[index-1].id,fields(expected[index],index+1)]
      :["AddRecord","_grist_ACLRules",++nextId,fields(expected[index],index+1)]);
    actions.push(["UpdateRecord","_grist_ACLRules",rows.at(-1).id,fields(expected.at(-1),expected.length)]);
    return {findings:[],readyToInstall:true,alreadyInstalled:false,actions};
  }
  return Object.freeze({tableId,definitions,inspect,matches});
});
