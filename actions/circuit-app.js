"use strict";
(async function mountRealCircuit() {
  const element = document.querySelector("#circuit");
  try {
    if (!window.grist?.docApi) throw Error("Ouvrez cette page comme widget dans le document de base Grist.");
    await window.grist.ready({ requiredAccess: "full" });
    if (!window.PilotageActionGristLifecycle?.create || !window.PilotageActionCircuitUI?.mount || !window.PilotageCurrentUser?.actionContext)
      throw Error("La page complète du circuit manque dans la publication.");
    const identify = async () => window.PilotageCurrentUser.actionContext(await window.PilotageCurrentUser.identify());
    const service = window.PilotageActionGristLifecycle.create({ grist: window.grist, mode: window.PilotageTestMode, identify, requireFinalPermissions: true });
    const catalog = await service.catalog();
    window.PilotageActionCircuitUI.mount({ element, service, catalog, canWrite: false,
      banner: "Consultation réelle · La création sera activée après validation des quatre pages fonctionnelles." });
  } catch (error) {
    element.replaceChildren(); const status = document.createElement("p"); status.setAttribute("role", "alert"); status.textContent = error.message; element.append(status);
  }
})();
