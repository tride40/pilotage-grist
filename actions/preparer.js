"use strict";
(function mount() {
  const $ = id => document.getElementById(id);
  let service, result = null, busy = false, sourceService, sourceResult = null, sourceBusy = false;
  function controls() {
    $("check").disabled = busy;
    $("backup").disabled = busy;
    $("install").disabled = busy || !$("backup").checked || !result?.readyToPrepare || result.alreadyPrepared || result.outcomeUncertain;
    $("source-check").disabled = sourceBusy;
    $("source-backup").disabled = sourceBusy;
    $("source-install").disabled = sourceBusy || !$("source-backup").checked || !sourceResult?.readyToInstall || sourceResult.alreadyInstalled || sourceResult.outcomeUncertain;
  }
  function renderSource(value) {
    sourceResult = value;
    $("source-findings").replaceChildren(...value.findings.map(text => { const li = document.createElement("li"); li.textContent = text; return li; }));
    $("source-columns").replaceChildren(...value.columns.map(text => { const li = document.createElement("li"); li.textContent = `ACTIONS.${text}`; return li; }));
    $("source-status").textContent = value.outcomeUncertain ? "Résultat incertain : ne relancez pas l’installation."
      : value.alreadyInstalled ? "Lot 1 confirmé : les cinq colonnes ACTIONS sont présentes et conformes."
      : value.readyToInstall ? "Lot 1 prêt : cinq ajouts compatibles, aucune ligne métier ne sera modifiée."
      : "Lot 1 bloqué : examinez les écarts affichés.";
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
  async function executeSource(operation) {
    if (sourceBusy) return;
    sourceBusy = true; controls(); $("source-status").textContent = "Contrôle du lot ACTIONS en cours…";
    try { renderSource(await operation()); }
    catch (error) { sourceResult = null; $("source-columns").replaceChildren(); $("source-findings").replaceChildren(); $("source-status").textContent = error.message; }
    finally { sourceBusy = false; controls(); }
  }
  $("backup").onchange = controls;
  $("source-backup").onchange = controls;
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
  $("source-check").onclick = () => executeSource(async () => {
    if (!window.grist?.docApi) throw Error("Ouvrez cette page comme widget dans le document de base Grist.");
    await window.grist.ready({ requiredAccess: "full" });
    sourceService ??= window.PilotageActionSourceSchemaSetup.create({ grist: window.grist, mode: window.PilotageTestMode });
    return sourceService.inspect();
  });
  $("source-install").onclick = () => {
    if (sourceBusy || $("source-install").disabled || !sourceService) return;
    if (!window.confirm("Ajouter les cinq colonnes techniques du lot ACTIONS ? Les lignes existantes ne seront pas modifiées.")) return;
    executeSource(() => sourceService.install({ confirmed: true }));
  };
  // No automatic read or write at load; both stages are explicit user actions.
  controls();
})();
