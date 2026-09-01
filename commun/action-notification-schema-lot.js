"use strict";

// Generated from the reviewed target manifest. Additive ACTIONS_NOTIFICATIONS lot only.
(function expose(root,factory){
  const api=factory(typeof module==="object"&&module.exports?require("./action-event-schema-lot.js"):root.PilotageActionEventSchemaLot);
  if(typeof module==="object"&&module.exports)module.exports=api;else root.PilotageActionNotificationSchemaLot=api;
})(typeof globalThis==="object"?globalThis:this,function factory(eventLot){
  const tableId="ACTIONS_NOTIFICATIONS",expected=[
  {
    "id": "ACL_notification_valide",
    "type": "Bool",
    "isFormula": true,
    "formula": "try:\n  event = rec.Evenement\n  if not event.id or not event.ACL_revision_coherente:\n    return False\n  if not rec.Destinataire.id or rec.Action.id != event.Action.id:\n    return False\n  if rec.Type_notification != event.Operation:\n    return False\n  return rec.Cle_notification == \"%s:recipient:%s\" % (event.Cle_evenement, rec.Destinataire.id)\nexcept Exception:\n  return False"
  },
  {
    "id": "ACL_evenement_auteur",
    "type": "Ref:INTERLOCUTEURS",
    "isFormula": true,
    "formula": "try:\n  return rec.Evenement.Auteur\nexcept Exception:\n  return 0"
  }
];
  function definitions(){return expected.map(column=>({...column}));}
  function exact(actual,target){return actual.type===target.type&&Boolean(actual.isFormula)===target.isFormula&&(actual.formula||"")===(target.formula||"");}
  function inspect(metadata){
    if(!metadata||!Array.isArray(metadata.tables)||!Array.isArray(metadata.columns))throw Error("Métadonnées du schéma incomplètes.");
    const event=eventLot.inspect(metadata),tables=metadata.tables.filter(table=>table.tableId===tableId);
    if(tables.length!==1)return {findings:[`La table ${tableId} est absente ou dupliquée.`],missing:[],alreadyInstalled:false,readyToInstall:false,actions:[]};
    const columns=metadata.columns.filter(column=>column.parentId===tables[0].id),findings=[],missing=[];
    if(!event.alreadyInstalled)findings.push("Le lot ÉVÉNEMENTS doit être présent et conforme.");
    for(const target of expected){const matches=columns.filter(column=>column.colId===target.id);if(matches.length===0)missing.push(target);else if(matches.length!==1||!exact(matches[0],target))findings.push(`Colonne incompatible : ${tableId}.${target.id}.`);}
    const readyToInstall=findings.length===0&&missing.length>0,alreadyInstalled=findings.length===0&&missing.length===0;
    return {findings,missing:missing.map(column=>column.id),alreadyInstalled,readyToInstall,actions:readyToInstall?missing.map(({id,...fields})=>["AddColumn",tableId,id,fields]):[]};
  }
  return Object.freeze({tableId,definitions,inspect});
});
