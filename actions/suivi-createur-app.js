"use strict";
(async function mountCreatorFollowUp(){
  const element=document.querySelector("#creator-follow-up");
  try{
    if(!window.grist?.docApi)throw Error("Ouvrez cette page comme widget dans le document de base Grist.");
    await window.grist.ready({requiredAccess:"full"});
    if(!window.PilotageActionGristLifecycle?.create||!window.PilotageActionCircuitUI?.mount||!window.PilotageCurrentUser?.actionContext)
      throw Error("La page de suivi du créateur manque dans la publication.");
    const identify=async()=>window.PilotageCurrentUser.actionContext(await window.PilotageCurrentUser.identify());
    const service=window.PilotageActionGristLifecycle.create({grist:window.grist,mode:window.PilotageTestMode,identify,requireFinalPermissions:true});
    window.PilotageActionCircuitUI.mount({
      element,service,canWrite:true,allowCreate:false,allowAssignment:false,allowLifecycle:true,confirmWrites:true,
      title:"Suivi de mes demandes",initialFilter:"creator",showCreate:false,
      banner:"Retrouvez les actions que vous avez demandées. Le filtre « À valider » affiche celles à clôturer ou à renvoyer pour complément."
    });
  }catch(error){
    element.replaceChildren();const status=document.createElement("p");status.setAttribute("role","alert");status.textContent=error.message;element.append(status);
  }
})();
