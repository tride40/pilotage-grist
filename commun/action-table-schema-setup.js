"use strict";

// Shared explicit runner for one additive schema lot.
(function expose(root,factory){
  const api=factory(typeof module==="object"&&module.exports?require("./action-grist-schema.js"):root.PilotageActionGristSchema);
  if(typeof module==="object"&&module.exports)module.exports=api;else root.PilotageActionTableSchemaSetup=api;
})(typeof globalThis==="object"?globalThis:this,function factory(schema){
  function rows(raw){
    if(!raw||!Array.isArray(raw.id))throw Error("Lecture des métadonnées impossible.");
    const columns=Object.entries(raw).filter(([,values])=>Array.isArray(values));
    if(columns.some(([,values])=>values.length!==raw.id.length))throw Error("Métadonnées tronquées.");
    return raw.id.map((_,index)=>Object.fromEntries(columns.map(([key,values])=>[key,values[index]])));
  }
  function create({grist,mode,lot}){
    if(!lot||typeof lot.inspect!=="function"||typeof lot.tableId!=="string")throw Error("Lot de schéma invalide.");
    let busy=false,preview=null,outcomeUncertain=false;
    async function guard(){if(!mode||mode.isReadOnly())throw Error("Installation interdite en mode test.");mode.assertWritable();if(await grist.docApi.getDocName()!==schema.documentId)throw Error("Document de base non autorisé.");}
    async function snapshot(){await guard();const [tables,columns]=await Promise.all(["_grist_Tables","_grist_Tables_column"].map(async table=>rows(await grist.docApi.fetchTable(table))));await guard();return {tables,columns};}
    function report(result){return {tableId:lot.tableId,findings:[...result.findings],columns:[...result.missing],alreadyInstalled:result.alreadyInstalled,readyToInstall:result.readyToInstall,outcomeUncertain};}
    return Object.freeze({
      async inspect(){if(busy)throw Error("Installation déjà en cours.");preview=null;const current=await snapshot(),result=lot.inspect(current);if(result.readyToInstall)preview=JSON.stringify(current);return report(result);},
      async install({confirmed=false}={}){
        if(busy)throw Error("Installation déjà en cours.");if(outcomeUncertain)throw Error("Résultat précédent incertain : contrôler le document avant toute nouvelle tentative.");if(!confirmed||!preview)throw Error(`Vérifier puis confirmer explicitement le lot ${lot.tableId}.`);busy=true;
        try{const current=await snapshot();if(JSON.stringify(current)!==preview){preview=null;throw Error("Le schéma a changé : refaire la vérification.");}const result=lot.inspect(current);if(!result.readyToInstall)throw Error(`Lot ${lot.tableId} bloqué par une incompatibilité.`);await guard();preview=null;outcomeUncertain=true;await grist.docApi.applyUserActions(result.actions);const verified=lot.inspect(await snapshot());if(!verified.alreadyInstalled)throw Error(`Les colonnes ${lot.tableId} ne sont pas toutes confirmées.`);outcomeUncertain=false;return report(verified);}catch(error){if(outcomeUncertain)throw Error(`Ne pas relancer automatiquement. ${error.message}`);throw error;}finally{busy=false;}
      },
    });
  }
  return Object.freeze({create});
});
