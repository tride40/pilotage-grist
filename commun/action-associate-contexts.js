"use strict";

// Explicit persisted choice, never reconstructed from today's directory.
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;else root.PilotageActionAssociateContexts=api;
})(typeof globalThis==="object"?globalThis:this,function(){
  const positive=n=>Number.isSafeInteger(n)&&n>0;
  function validate(items,associateIds){
    if(!Array.isArray(associateIds)||!associateIds.every(positive)||new Set(associateIds).size!==associateIds.length
      ||!Array.isArray(items)||items.length!==associateIds.length)throw Error("Contextes des associés incomplets.");
    const seen=new Set();
    const result=items.map(item=>{
      if(!item||!positive(item.personId)||!associateIds.includes(item.personId)||seen.has(item.personId)
        ||!(item.serviceId===null||positive(item.serviceId)))throw Error("Contexte d’associé invalide.");
      seen.add(item.personId);return {personId:item.personId,serviceId:item.serviceId};
    });
    return result.sort((a,b)=>a.personId-b.personId);
  }
  function encode(items,associateIds){return JSON.stringify(validate(items,associateIds).map(i=>[i.personId,i.serviceId]));}
  function decode(text,associateIds){
    if(text===""&&Array.isArray(associateIds)&&associateIds.length===0)return [];
    if(typeof text!=="string")throw Error("Contextes des associés à renseigner.");
    let pairs;try{pairs=JSON.parse(text);}catch{throw Error("Contextes des associés illisibles.");}
    if(!Array.isArray(pairs)||pairs.some(p=>!Array.isArray(p)||p.length!==2))throw Error("Format des contextes invalide.");
    return validate(pairs.map(([personId,serviceId])=>({personId,serviceId})),associateIds);
  }
  return Object.freeze({encode,decode,validate,columnId:"Contextes_associes"});
});
