"use strict";
(async function mountRealCircuit() {
  const element = document.querySelector("#circuit");
  try {
    if (!window.grist?.docApi) throw Error("Ouvrez cette page comme widget dans le document de base Grist.");
    await window.grist.ready({ requiredAccess: "full" });
    if (!window.PilotageActionGristLifecycle?.create || !window.PilotageActionCircuitUI?.mount || !window.PilotageCurrentUser?.actionContext)
      throw Error("La page complète du circuit manque dans la publication.");
    const identify = async () => window.PilotageCurrentUser.actionContext(await window.PilotageCurrentUser.identify());
    const service = window.PilotageActionGristLifecycle.create({ grist: window.grist, mode: window.PilotageGristWrite, identify, requireFinalPermissions: true });
    const catalog = await service.catalog();
    window.PilotageActionCircuitUI.mount({ element, service, catalog, canWrite: true, allowCreate: true, allowAssignment: true, allowLifecycle: true, confirmWrites: true,
      banner: "Création, attribution et cycle de vie actifs · Chaque opération réelle demande une confirmation avant enregistrement." });
  } catch (error) {
    element.replaceChildren(); const status = document.createElement("p"); status.setAttribute("role", "alert"); status.textContent = error.message; element.append(status);
  }
})();
