"use strict";

// Additive schema lot for ACTIONS_ATTRIBUTIONS only.
(function expose(root,factory){
  const api=factory(typeof module==="object"&&module.exports?require("./action-grist-schema.js"):root.PilotageActionGristSchema,
    typeof module==="object"&&module.exports?require("./action-attribution-permissions.js"):root.PilotageActionAttributionPermissions,
    typeof module==="object"&&module.exports?require("./action-source-schema-lot.js"):root.PilotageActionSourceSchemaLot);
  if(typeof module==="object"&&module.exports)module.exports=api;else root.PilotageActionAttributionSchemaLot=api;
})(typeof globalThis==="object"?globalThis:this,function factory(schema,attribution,sourceLot){
  const tableId="ACTIONS_ATTRIBUTIONS";
  const audience=`try:
  return rec.Action.ACL_audience if rec.Action.id else []
except Exception:
  return []`;
  function definitions(){
    const revision=schema.schema().find(table=>table.tableId===tableId).columns.find(column=>column.id==="Revision_ecriture");
    return [{...revision},...attribution.helperColumns().filter(column=>column.tableId===tableId).map(column=>({id:column.id,type:column.type,isFormula:column.isFormula,formula:column.formula||""})),
      {id:"ACL_audience",type:"RefList:INTERLOCUTEURS",isFormula:true,formula:audience}];
  }
  function exact(actual,expected){return actual.type===expected.type&&Boolean(actual.isFormula)===expected.isFormula&&(actual.formula||"")===(expected.formula||"");}
  function inspect(metadata){
    if(!metadata||!Array.isArray(metadata.tables)||!Array.isArray(metadata.columns))throw Error("Métadonnées du schéma incomplètes.");
    const dependency=sourceLot.inspect(metadata),tables=metadata.tables.filter(table=>table.tableId===tableId);
    if(tables.length!==1)return {findings:[`La table ${tableId} est absente ou dupliquée.`],missing:[],alreadyInstalled:false,readyToInstall:false,actions:[]};
    const columns=metadata.columns.filter(column=>column.parentId===tables[0].id),findings=dependency.alreadyInstalled?[]:["Le lot ACTIONS doit être présent et conforme avant les attributions."],missing=[];
    for(const expected of definitions()){
      const matches=columns.filter(column=>column.colId===expected.id);
      if(matches.length===0)missing.push(expected);
      else if(matches.length!==1||!exact(matches[0],expected))findings.push(`Colonne incompatible : ${tableId}.${expected.id}.`);
    }
    const readyToInstall=findings.length===0&&missing.length>0,alreadyInstalled=findings.length===0&&missing.length===0;
    return {findings,missing:missing.map(column=>column.id),alreadyInstalled,readyToInstall,
      actions:readyToInstall?missing.map(({id,...fields})=>["AddColumn",tableId,id,fields]):[]};
  }
  return Object.freeze({tableId,definitions,inspect});
});
