"use strict";

// Additive schema lot for ACTIONS only. Existing business rows are never read.
(function expose(root,factory){
  const api=factory(typeof module==="object"&&module.exports?require("./action-source-permissions.js"):root.PilotageActionSourcePermissions);
  if(typeof module==="object"&&module.exports)module.exports=api;else root.PilotageActionSourceSchemaLot=api;
})(typeof globalThis==="object"?globalThis:this,function factory(source){
  const audience=`try:
  circuits = list(ACTIONS_CIRCUIT.lookupRecords(Action=rec))
  return circuits[0].ACL_audience if len(circuits) == 1 else []
except Exception:
  return []`;
  function definitions(){return [
    {id:"Revision_circuit",type:"Int",isFormula:false,formula:""},
    ...source.helperColumns().filter(column=>column.tableId==="ACTIONS").map(column=>({id:column.id,type:column.type,isFormula:column.isFormula,formula:column.formula||""})),
    {id:"ACL_audience",type:"RefList:INTERLOCUTEURS",isFormula:true,formula:audience},
  ];}
  function exact(actual,expected){return actual.type===expected.type&&Boolean(actual.isFormula)===expected.isFormula&&(actual.formula||"")===(expected.formula||"");}
  function inspect(metadata){
    if(!metadata||!Array.isArray(metadata.tables)||!Array.isArray(metadata.columns))throw Error("Métadonnées du schéma incomplètes.");
    const tables=metadata.tables.filter(table=>table.tableId==="ACTIONS");
    if(tables.length!==1)return {findings:["La table ACTIONS est absente ou dupliquée."],missing:[],alreadyInstalled:false,readyToInstall:false,actions:[]};
    const columns=metadata.columns.filter(column=>column.parentId===tables[0].id),findings=[],missing=[];
    const active=columns.filter(column=>column.colId==="Circuit_actif");
    const activeExpected={type:"Bool",isFormula:true,formula:"bool(ACTIONS_CIRCUIT.lookupRecords(Action=rec.id))"};
    if(active.length!==1||!exact(active[0],activeExpected))findings.push("ACTIONS.Circuit_actif ne correspond pas à la formule déjà contrôlée.");
    for(const expected of definitions()){
      const matches=columns.filter(column=>column.colId===expected.id);
      if(matches.length===0)missing.push(expected);
      else if(matches.length!==1||!exact(matches[0],expected))findings.push(`Colonne incompatible : ACTIONS.${expected.id}.`);
    }
    const readyToInstall=findings.length===0&&missing.length>0,alreadyInstalled=findings.length===0&&missing.length===0;
    return {findings,missing:missing.map(column=>column.id),alreadyInstalled,readyToInstall,
      actions:readyToInstall?missing.map(({id,...fields})=>["AddColumn","ACTIONS",id,fields]):[]};
  }
  return Object.freeze({definitions,inspect});
});
