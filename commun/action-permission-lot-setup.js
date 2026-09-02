"use strict";

// Explicit, single-table ACL runner with exact pre/post snapshots.
(function expose(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;else root.PilotageActionPermissionLotSetup=api;
})(typeof globalThis==="object"?globalThis:this,function factory(){
  const documentId="f8iwcexDATAwBKsaG6gZRs";
  function rows(raw){
    if(!raw||!Array.isArray(raw.id))throw Error("Lecture des métadonnées impossible.");
    const columns=Object.entries(raw).filter(([,values])=>Array.isArray(values));
    if(columns.some(([,values])=>values.length!==raw.id.length))throw Error("Métadonnées tronquées.");
    return raw.id.map((_,index)=>Object.fromEntries(columns.map(([name,values])=>[name,values[index]])));
  }
  function create({grist,mode,audit,lot,liveAudit=null}){
    if(!audit?.inspect||!lot?.inspect||!lot?.tableId)throw Error("Lot de permissions invalide.");
    const targetTableIds=new Set(Array.isArray(lot.tableIds)&&lot.tableIds.length?lot.tableIds:[lot.tableId]);
    let busy=false,preview=null,livePreview=null,outcomeUncertain=false;
    async function guard(){if(!mode||mode.isReadOnly())throw Error("Installation indisponible : la passerelle d’écriture Grist n’est pas prête.");mode.assertWritable();if(await grist.docApi.getDocName()!==documentId)throw Error("Document de base non autorisé.");}
    async function snapshot(){await guard();const names=["_grist_Tables","_grist_Tables_column","_grist_ACLResources","_grist_ACLRules"];const values=await Promise.all(names.map(async name=>rows(await grist.docApi.fetchTable(name))));await guard();return {documentId,tables:values[0],columns:values[1],resources:values[2],rules:values[3]};}
    function report(result){return {tableId:lot.tableId,findings:[...result.findings],readyToInstall:result.readyToInstall,alreadyInstalled:result.alreadyInstalled,outcomeUncertain};}
    const liveReady=value=>value?.readyForActionPolicy===true||value?.readyForAuthorityPolicy===true;
    function outside(value){const ids=new Set(value.resources.filter(resource=>targetTableIds.has(resource.tableId)).map(resource=>resource.id));return JSON.stringify({tables:value.tables,columns:value.columns,resources:value.resources.filter(resource=>!targetTableIds.has(resource.tableId)),rules:value.rules.filter(rule=>!ids.has(rule.resource))});}
    return Object.freeze({
      async inspect(){if(busy)throw Error("Installation déjà en cours.");preview=null;livePreview=null;const current=await snapshot(),result=lot.inspect(current);if(liveAudit){const live=await liveAudit.inspect();if(!liveReady(live))return report({...result,readyToInstall:false,alreadyInstalled:false,findings:[...live.findings,...result.findings]});livePreview=JSON.stringify(live.counts);}if(result.alreadyInstalled)return report(result);const checkpoint=audit.inspect(current);if(!checkpoint.readyForPermissionReview)return report({...result,readyToInstall:false,findings:[...checkpoint.findings,...result.findings]});if(result.readyToInstall)preview=JSON.stringify(current);return report(result);},
      async install({confirmed=false}={}){
        if(busy)throw Error("Installation déjà en cours.");if(outcomeUncertain)throw Error("Résultat précédent incertain : contrôler le document avant toute nouvelle tentative.");if(!confirmed||!preview)throw Error(`Vérifier puis confirmer explicitement les règles ${lot.tableId}.`);busy=true;
        try{const current=await snapshot();if(JSON.stringify(current)!==preview){preview=null;throw Error("La structure ou les permissions ont changé : refaire la vérification.");}if(!audit.inspect(current).readyForPermissionReview)throw Error("Le contrôle préalable des permissions n’est plus conforme.");if(liveAudit){const before=await liveAudit.inspect();if(!liveReady(before)||JSON.stringify(before.counts)!==livePreview)throw Error("Les compteurs contrôlés ont changé : refaire les contrôles.");}const result=lot.inspect(current);if(!result.readyToInstall||!result.actions.length)throw Error(`Lot ${lot.tableId} bloqué.`);await guard();preview=null;outcomeUncertain=true;await grist.docApi.applyUserActions(result.actions);const after=await snapshot(),verified=lot.inspect(after);if(!verified.alreadyInstalled||outside(current)!==outside(after))throw Error("La relecture ne confirme pas une modification isolée de la table attendue.");if(liveAudit){const afterLive=await liveAudit.inspect();if(!liveReady(afterLive)||JSON.stringify(afterLive.counts)!==livePreview)throw Error("La relecture des compteurs contrôlés n’est pas conforme.");}outcomeUncertain=false;return report(verified);}catch(error){if(outcomeUncertain)throw Error(`Ne pas relancer automatiquement. ${error.message}`);throw error;}finally{busy=false;}
      }
    });
  }
  return Object.freeze({create});
});
