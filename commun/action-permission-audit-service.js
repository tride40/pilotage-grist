"use strict";
(function expose(root,factory){
  const api=factory(typeof module==="object"&&module.exports?require("./action-permission-audit.js"):root.PilotageActionPermissionAudit);
  if(typeof module==="object"&&module.exports)module.exports=api;else root.PilotageActionPermissionAuditService=api;
})(typeof globalThis==="object"?globalThis:this,function factory(audit){
  function rows(raw){
    if(!raw||!Array.isArray(raw.id))throw Error("Lecture des métadonnées impossible.");
    const columns=Object.entries(raw).filter(([,values])=>Array.isArray(values));
    if(columns.some(([,values])=>values.length!==raw.id.length))throw Error("Métadonnées tronquées.");
    return raw.id.map((_,index)=>Object.fromEntries(columns.map(([name,values])=>[name,values[index]])));
  }
  function create({grist}){
    let busy=false;
    return Object.freeze({async inspect(){
      if(busy)throw Error("Contrôle déjà en cours.");
      busy=true;
      try{
        if(await grist.docApi.getDocName()!==audit.documentId)throw Error("Document de base non autorisé.");
        const names=["_grist_Tables","_grist_Tables_column","_grist_ACLResources","_grist_ACLRules"];
        const values=await Promise.all(names.map(async name=>rows(await grist.docApi.fetchTable(name))));
        if(await grist.docApi.getDocName()!==audit.documentId)throw Error("Le document a changé pendant le contrôle.");
        return audit.inspect({documentId:audit.documentId,tables:values[0],columns:values[1],resources:values[2],rules:values[3]});
      }finally{busy=false;}
    }});
  }
  return Object.freeze({create});
});
