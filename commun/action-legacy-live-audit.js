"use strict";

// Live, read-only aggregate checkpoint for the legacy ACTIONS population.
(function expose(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;else root.PilotageActionLegacyLiveAudit=api;
})(typeof globalThis==="object"?globalThis:this,function factory(){
  const documentId="f8iwcexDATAwBKsaG6gZRs",expectedLegacyCount=17;
  function length(raw,label){if(!raw||!Array.isArray(raw.id))throw Error(`Lecture impossible : ${label}.`);if(new Set(raw.id).size!==raw.id.length)throw Error(`Identifiants dupliqués : ${label}.`);return raw.id.length;}
  function review(raw){
    const findings=[],counts={actions:length(raw.ACTIONS,"ACTIONS"),circuits:length(raw.ACTIONS_CIRCUIT,"ACTIONS_CIRCUIT"),assignments:length(raw.ACTIONS_ATTRIBUTIONS,"ACTIONS_ATTRIBUTIONS"),events:length(raw.ACTIONS_EVENEMENTS,"ACTIONS_EVENEMENTS"),notifications:length(raw.ACTIONS_NOTIFICATIONS,"ACTIONS_NOTIFICATIONS")};
    if(counts.actions!==expectedLegacyCount)findings.push(`Le document contient ${counts.actions} actions au lieu des ${expectedLegacyCount} actions historiques attendues.`);
    for(const [name,count] of Object.entries(counts))if(name!=="actions"&&count)findings.push(`${name} contient déjà ${count} ligne(s) : arrêt avant ouverture des droits ACTIONS.`);
    if(!Array.isArray(raw.ACTIONS.Revision_circuit)||raw.ACTIONS.Revision_circuit.length!==counts.actions)findings.push("ACTIONS.Revision_circuit est absente ou tronquée.");
    else{
      const invalid=raw.ACTIONS.Revision_circuit.filter(value=>!Number.isSafeInteger(value)||value!==0).length;
      if(invalid)findings.push(`${invalid} action(s) historique(s) ne portent pas la révision entière 0.`);
    }
    if(!Array.isArray(raw.ACTIONS.Circuit_actif)||raw.ACTIONS.Circuit_actif.length!==counts.actions)findings.push("ACTIONS.Circuit_actif est absente ou tronquée.");
    else{
      const active=raw.ACTIONS.Circuit_actif.filter(value=>value!==false).length;
      if(active)findings.push(`${active} action(s) sont déjà rattachées à un circuit.`);
    }
    return {counts,expectedLegacyCount,findings,readyForActionPolicy:findings.length===0,legacyActionsPreserved:findings.length===0,actions:[],writesBusinessRows:false};
  }
  function create({grist}){
    let busy=false;
    return Object.freeze({async inspect(){
      if(busy)throw Error("Contrôle déjà en cours.");busy=true;
      try{if(await grist.docApi.getDocName()!==documentId)throw Error("Document de base non autorisé.");const names=["ACTIONS","ACTIONS_CIRCUIT","ACTIONS_ATTRIBUTIONS","ACTIONS_EVENEMENTS","ACTIONS_NOTIFICATIONS"],values=await Promise.all(names.map(name=>grist.docApi.fetchTable(name)));if(await grist.docApi.getDocName()!==documentId)throw Error("Le document a changé pendant le contrôle.");return review(Object.fromEntries(names.map((name,index)=>[name,values[index]])));}finally{busy=false;}
    }});
  }
  return Object.freeze({documentId,expectedLegacyCount,review,create});
});
