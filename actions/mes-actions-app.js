"use strict";
(async function mountExecutorActions(){
  const element=document.querySelector("#executor-actions");
  try{
    if(!window.grist?.docApi)throw Error("Ouvrez cette page comme widget dans le document de base Grist.");
    await window.grist.ready({requiredAccess:"full"});
    if(!window.PilotageActionGristLifecycle?.create||!window.PilotageActionCircuitUI?.mount||!window.PilotageCurrentUser?.actionContext)
      throw Error("La page des actions à réaliser manque dans la publication.");
    const identify=async()=>window.PilotageCurrentUser.actionContext(await window.PilotageCurrentUser.identify());
    const service=window.PilotageActionGristLifecycle.create({grist:window.grist,mode:window.PilotageGristWrite,identify,requireFinalPermissions:true});
    window.PilotageActionCircuitUI.mount({
      element,service,canWrite:true,allowCreate:false,allowAssignment:false,allowLifecycle:true,confirmWrites:true,
      title:"Mes actions à réaliser",initialFilter:"executor",showCreate:false,
      banner:"Retrouvez les actions qui vous sont confiées. Déclarez une réalisation lorsque le travail est terminé ; le créateur pourra ensuite la valider ou demander un complément."
    });
  }catch(error){
    element.replaceChildren();const status=document.createElement("p");status.setAttribute("role","alert");status.textContent=error.message;element.append(status);
  }
})();
