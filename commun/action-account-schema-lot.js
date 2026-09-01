"use strict";

// Generated from the reviewed target manifest. Additive PILOTAGE_COMPTES lot only.
(function expose(root,factory){
  const api=factory(typeof module==="object"&&module.exports?require("./action-notification-schema-lot.js"):root.PilotageActionNotificationSchemaLot);
  if(typeof module==="object"&&module.exports)module.exports=api;else root.PilotageActionAccountSchemaLot=api;
})(typeof globalThis==="object"?globalThis:this,function factory(notificationLot){
  const tableId="PILOTAGE_COMPTES",expected=[
  {
    "id": "Administrateur",
    "type": "Bool",
    "isFormula": false,
    "formula": ""
  }
],requiredExisting=[
  {
    "id": "Email",
    "type": "Text",
    "isFormula": false,
    "formula": ""
  },
  {
    "id": "Interlocuteur",
    "type": "Ref:INTERLOCUTEURS",
    "isFormula": false,
    "formula": ""
  },
  {
    "id": "Actif",
    "type": "Bool",
    "isFormula": false,
    "formula": ""
  }
];
  function definitions(){return expected.map(column=>({...column}));}
  function exact(actual,target){return actual.type===target.type&&Boolean(actual.isFormula)===target.isFormula&&(actual.formula||"")===(target.formula||"");}
  function inspect(metadata){
    if(!metadata||!Array.isArray(metadata.tables)||!Array.isArray(metadata.columns))throw Error("Métadonnées du schéma incomplètes.");
    const notification=notificationLot.inspect(metadata),tables=metadata.tables.filter(table=>table.tableId===tableId);
    if(tables.length!==1)return {findings:[`La table ${tableId} est absente ou dupliquée.`],missing:[],alreadyInstalled:false,readyToInstall:false,actions:[]};
    const columns=metadata.columns.filter(column=>column.parentId===tables[0].id),findings=[],missing=[];
    if(!notification.alreadyInstalled)findings.push("Le lot NOTIFICATIONS doit être présent et conforme.");
    for(const target of requiredExisting){const matches=columns.filter(column=>column.colId===target.id);if(matches.length!==1||!exact(matches[0],target))findings.push(`Colonne préalable incompatible : ${tableId}.${target.id}.`);}
    for(const target of expected){const matches=columns.filter(column=>column.colId===target.id);if(matches.length===0)missing.push(target);else if(matches.length!==1||!exact(matches[0],target))findings.push(`Colonne incompatible : ${tableId}.${target.id}.`);}
    const readyToInstall=findings.length===0&&missing.length>0,alreadyInstalled=findings.length===0&&missing.length===0;
    return {findings,missing:missing.map(column=>column.id),alreadyInstalled,readyToInstall,actions:readyToInstall?missing.map(({id,...fields})=>["AddColumn",tableId,id,fields]):[]};
  }
  return Object.freeze({tableId,definitions,inspect});
});
