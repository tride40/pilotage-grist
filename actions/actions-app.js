"use strict";
(async function mountUnifiedActions(){
  const element=document.querySelector("#actions");
  try{
    if(!window.grist?.docApi)throw Error("Ouvrez cette page comme widget dans le document de base Grist.");
    await window.grist.ready({requiredAccess:"full"});
    if(!window.PilotageActionGristLifecycle?.create||!window.PilotageActionCircuitUI?.mount||!window.PilotageCurrentUser?.actionContext)
      throw Error("La page Actions manque dans la publication.");
    const identify=async()=>window.PilotageCurrentUser.actionContext(await window.PilotageCurrentUser.identify());
    const service=window.PilotageActionGristLifecycle.create({grist:window.grist,mode:window.PilotageTestMode,identify,requireFinalPermissions:true});
    const catalog=await service.catalog();
    window.PilotageActionCircuitUI.mount({
      element,service,catalog,canWrite:true,allowCreate:true,allowAssignment:true,allowLifecycle:true,confirmWrites:true,
      title:"Actions",initialFilter:"open",showCreate:true,
      banner:"Créez et suivez les actions selon votre rôle. Utilisez les filtres pour retrouver ce que vous devez réaliser, vos demandes et les validations en attente."
    });
  }catch(error){
    element.replaceChildren();const status=document.createElement("p");status.setAttribute("role","alert");status.textContent=error.message;element.append(status);
  }
})();
