"use strict";

// Read-only checkpoint for the administrator trust anchor.
(function expose(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;else root.PilotageActionAccountLiveAudit=api;
})(typeof globalThis==="object"?globalThis:this,function factory(){
  const documentId="f8iwcexDATAwBKsaG6gZRs";
  function length(raw,label){if(!raw||!Array.isArray(raw.id))throw Error(`Lecture impossible : ${label}.`);const columns=Object.entries(raw).filter(([,values])=>Array.isArray(values));if(columns.some(([,values])=>values.length!==raw.id.length))throw Error(`Lecture tronquée : ${label}.`);if(new Set(raw.id).size!==raw.id.length)throw Error(`Identifiants dupliqués : ${label}.`);return raw.id.length;}
  const refId=value=>Array.isArray(value)?value.find(item=>item!=="R"&&item!=="L")||0:value||0;
  const email=value=>String(value||"").trim().toLocaleLowerCase("fr-FR");
  function review(raw){
    const findings=[],accountCount=length(raw.PILOTAGE_COMPTES,"PILOTAGE_COMPTES"),personCount=length(raw.INTERLOCUTEURS,"INTERLOCUTEURS");
    for(const name of ["Email","Interlocuteur","Actif","Administrateur"])if(!Array.isArray(raw.PILOTAGE_COMPTES[name])||raw.PILOTAGE_COMPTES[name].length!==accountCount)findings.push(`PILOTAGE_COMPTES.${name} est absente ou tronquée.`);
    for(const name of ["Actif","Interne_Mairie"])if(!Array.isArray(raw.INTERLOCUTEURS[name])||raw.INTERLOCUTEURS[name].length!==personCount)findings.push(`INTERLOCUTEURS.${name} est absente ou tronquée.`);
    if(findings.length)return {accountCount,activeAccountCount:0,administratorCount:0,counts:{accountCount,activeAccountCount:0,administratorCount:0},findings,readyForAuthorityPolicy:false,actions:[],writesBusinessRows:false};
    const seen=new Set();let activeAccountCount=0,administratorCount=0;
    for(let index=0;index<accountCount;index++){
      const address=email(raw.PILOTAGE_COMPTES.Email[index]),active=raw.PILOTAGE_COMPTES.Actif[index]===true,administrator=raw.PILOTAGE_COMPTES.Administrateur[index]===true,person=Number(refId(raw.PILOTAGE_COMPTES.Interlocuteur[index]));
      if(!address)findings.push(`Compte ${raw.PILOTAGE_COMPTES.id[index]} : adresse électronique absente.`);else if(seen.has(address))findings.push("Plusieurs comptes utilisent la même adresse électronique.");else seen.add(address);
      if(active){activeAccountCount++;if(!Number.isSafeInteger(person)||person<=0)findings.push(`Compte actif ${raw.PILOTAGE_COMPTES.id[index]} : interlocuteur invalide.`);}
      if(administrator){administratorCount++;if(!active)findings.push(`Administrateur ${raw.PILOTAGE_COMPTES.id[index]} : compte inactif.`);const personIndex=raw.INTERLOCUTEURS.id.indexOf(person);if(personIndex<0)findings.push(`Administrateur ${raw.PILOTAGE_COMPTES.id[index]} : interlocuteur introuvable.`);else if(raw.INTERLOCUTEURS.Actif[personIndex]!==true||raw.INTERLOCUTEURS.Interne_Mairie[personIndex]!==true)findings.push(`Administrateur ${raw.PILOTAGE_COMPTES.id[index]} : interlocuteur interne actif non confirmé.`);}
    }
    if(administratorCount<1)findings.push("Aucun administrateur actif n’est désigné.");
    return {accountCount,activeAccountCount,administratorCount,counts:{accountCount,activeAccountCount,administratorCount},findings,readyForAuthorityPolicy:findings.length===0,actions:[],writesBusinessRows:false};
  }
  function create({grist}){let busy=false;return Object.freeze({async inspect(){if(busy)throw Error("Contrôle déjà en cours.");busy=true;try{if(await grist.docApi.getDocName()!==documentId)throw Error("Document de base non autorisé.");const [accounts,people]=await Promise.all([grist.docApi.fetchTable("PILOTAGE_COMPTES"),grist.docApi.fetchTable("INTERLOCUTEURS")]);if(await grist.docApi.getDocName()!==documentId)throw Error("Le document a changé pendant le contrôle.");return review({PILOTAGE_COMPTES:accounts,INTERLOCUTEURS:people});}finally{busy=false;}}});}
  return Object.freeze({documentId,review,create});
});
