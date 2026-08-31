"use strict";
(function mount() {
  const $ = id => document.getElementById(id);
  let service, result = null, busy = false;
  function controls() {
    $("check").disabled = busy;
    $("backup").disabled = busy;
    $("install").disabled = busy || !$("backup").checked || !result?.readyToPrepare || result.alreadyPrepared || result.outcomeUncertain;
  }
  function render(value) {
    result = value;
    for (const [id, texts] of [["findings", value.findings], ["tables", value.tablesToAdd]]) {
      $(id).replaceChildren(...texts.map(text => { const li = document.createElement("li"); li.textContent = text; return li; }));
    }
    $("status").textContent = value.outcomeUncertain ? "Résultat incertain : faites contrôler le document avant de poursuivre."
      : value.alreadyPrepared ? "Les quatre tables et leurs règles de préparation sont présentes. Le circuit métier n’est pas encore activé."
      : value.readyToPrepare ? "La préparation des tables vides peut être confirmée après sauvegarde."
      : "Préparation bloquée : les points ci-dessous doivent être examinés sans modifier automatiquement l’existant.";
  }
  async function execute(operation) {
    if (busy) return;
    busy = true; controls(); $("status").textContent = "Contrôle en cours…";
    try { render(await operation()); }
    catch (error) { result = null; $("tables").replaceChildren(); $("findings").replaceChildren(); $("status").textContent = error.message; }
    finally { busy = false; controls(); }
  }
  $("backup").onchange = controls;
  $("check").onclick = () => execute(async () => {
    if (!window.grist?.docApi) throw Error("Ouvrez cette page comme widget dans le document de base Grist.");
    await window.grist.ready({ requiredAccess: "full" });
    service ??= window.PilotageActionGristSetup.create({ grist: window.grist, mode: window.PilotageTestMode });
    return service.inspect();
  });
  $("install").onclick = () => {
    if (busy || $("install").disabled || !service) return;
    if (!window.confirm("Créer les tables manquantes et leurs règles réservées aux propriétaires ? Aucune ancienne action ni donnée personnelle ne sera modifiée.")) return;
    execute(() => service.install({ confirmed: true }));
  };
  // No automatic read or write at load; both stages are explicit user actions.
  controls();
})();
