"use strict";
(function mount() {
  const $ = id => document.getElementById(id);
  let service, result = null, busy = false, sourceService, sourceResult = null, sourceBusy = false;
  let attributionService, attributionResult = null, attributionBusy = false;
  let circuitService, circuitResult = null, circuitBusy = false;
  let eventService, eventResult = null, eventBusy = false;
  let notificationService, notificationResult = null, notificationBusy = false;
  let accountService, accountResult = null, accountBusy = false;
  let projectService, projectResult = null, projectBusy = false;
  function controls() {
    $("check").disabled = busy;
    $("backup").disabled = busy;
    $("install").disabled = busy || !$("backup").checked || !result?.readyToPrepare || result.alreadyPrepared || result.outcomeUncertain;
    $("source-check").disabled = sourceBusy;
    $("source-backup").disabled = sourceBusy;
    $("source-install").disabled = sourceBusy || !$("source-backup").checked || !sourceResult?.readyToInstall || sourceResult.alreadyInstalled || sourceResult.outcomeUncertain;
    $("attribution-check").disabled = attributionBusy;
    $("attribution-backup").disabled = attributionBusy;
    $("attribution-install").disabled = attributionBusy || !$("attribution-backup").checked || !attributionResult?.readyToInstall || attributionResult.alreadyInstalled || attributionResult.outcomeUncertain;
    $("circuit-check").disabled = circuitBusy;
    $("circuit-backup").disabled = circuitBusy;
    $("circuit-install").disabled = circuitBusy || !$("circuit-backup").checked || !circuitResult?.readyToInstall || circuitResult.alreadyInstalled || circuitResult.outcomeUncertain;
    $("event-check").disabled = eventBusy;
    $("event-backup").disabled = eventBusy;
    $("event-install").disabled = eventBusy || !$("event-backup").checked || !eventResult?.readyToInstall || eventResult.alreadyInstalled || eventResult.outcomeUncertain;
    $("notification-check").disabled = notificationBusy;
    $("notification-backup").disabled = notificationBusy;
    $("notification-install").disabled = notificationBusy || !$("notification-backup").checked || !notificationResult?.readyToInstall || notificationResult.alreadyInstalled || notificationResult.outcomeUncertain;
    $("account-check").disabled = accountBusy;
    $("account-backup").disabled = accountBusy;
    $("account-install").disabled = accountBusy || !$("account-backup").checked || !accountResult?.readyToInstall || accountResult.alreadyInstalled || accountResult.outcomeUncertain;
    $("project-check").disabled = projectBusy;
    $("project-backup").disabled = projectBusy;
    $("project-install").disabled = projectBusy || !$("project-backup").checked || !projectResult?.readyToInstall || projectResult.alreadyInstalled || projectResult.outcomeUncertain;
  }
  function renderProject(value) {
    projectResult = value;
    $("project-findings").replaceChildren(...value.findings.map(text => { const li = document.createElement("li"); li.textContent = text; return li; }));
    $("project-columns").replaceChildren(...value.columns.map(text => { const li = document.createElement("li"); li.textContent = `PROJETS.${text}`; return li; }));
    $("project-status").textContent = value.outcomeUncertain ? "Résultat incertain : ne relancez pas l’installation."
      : value.alreadyInstalled ? "Lot 7 confirmé : les six colonnes PROJETS sont présentes et conformes. Le schéma additif est terminé."
      : value.readyToInstall ? `Lot 7 prêt : ${value.columns.length} ajout${value.columns.length > 1 ? "s" : ""} compatible${value.columns.length > 1 ? "s" : ""}, dépendance COMPTES et colonnes existantes confirmées.`
      : "Lot 7 bloqué : examinez les écarts affichés.";
  }
  function renderAccount(value) {
    accountResult = value;
    $("account-findings").replaceChildren(...value.findings.map(text => { const li = document.createElement("li"); li.textContent = text; return li; }));
    $("account-columns").replaceChildren(...value.columns.map(text => { const li = document.createElement("li"); li.textContent = `PILOTAGE_COMPTES.${text}`; return li; }));
    $("account-status").textContent = value.outcomeUncertain ? "Résultat incertain : ne relancez pas l’installation."
      : value.alreadyInstalled ? "Lot 6 confirmé : la colonne Administrateur est présente et conforme."
      : value.readyToInstall ? "Lot 6 prêt : ajout compatible, registre des comptes et dépendance NOTIFICATIONS confirmés."
      : "Lot 6 bloqué : examinez les écarts affichés.";
  }
  function renderNotification(value) {
    notificationResult = value;
    $("notification-findings").replaceChildren(...value.findings.map(text => { const li = document.createElement("li"); li.textContent = text; return li; }));
    $("notification-columns").replaceChildren(...value.columns.map(text => { const li = document.createElement("li"); li.textContent = `ACTIONS_NOTIFICATIONS.${text}`; return li; }));
    $("notification-status").textContent = value.outcomeUncertain ? "Résultat incertain : ne relancez pas l’installation."
      : value.alreadyInstalled ? "Lot 5 confirmé : les deux colonnes NOTIFICATIONS sont présentes et conformes."
      : value.readyToInstall ? "Lot 5 prêt : deux ajouts compatibles, dépendance ÉVÉNEMENTS confirmée."
      : "Lot 5 bloqué : examinez les écarts affichés.";
  }
  function renderEvent(value) {
    eventResult = value;
    $("event-findings").replaceChildren(...value.findings.map(text => { const li = document.createElement("li"); li.textContent = text; return li; }));
    $("event-columns").replaceChildren(...value.columns.map(text => { const li = document.createElement("li"); li.textContent = `ACTIONS_EVENEMENTS.${text}`; return li; }));
    $("event-status").textContent = value.outcomeUncertain ? "Résultat incertain : ne relancez pas l’installation."
      : value.alreadyInstalled ? "Lot 4 confirmé : les six colonnes ÉVÉNEMENTS sont présentes et conformes."
      : value.readyToInstall ? "Lot 4 prêt : six ajouts compatibles, dépendance CIRCUIT confirmée."
      : "Lot 4 bloqué : examinez les écarts affichés.";
  }
  function renderCircuit(value) {
    circuitResult = value;
    $("circuit-findings").replaceChildren(...value.findings.map(text => { const li = document.createElement("li"); li.textContent = text; return li; }));
    $("circuit-columns").replaceChildren(...value.columns.map(text => { const li = document.createElement("li"); li.textContent = `ACTIONS_CIRCUIT.${text}`; return li; }));
    $("circuit-status").textContent = value.outcomeUncertain ? "Résultat incertain : ne relancez pas l’installation."
      : value.alreadyInstalled ? "Lot 3 confirmé : les quatorze colonnes CIRCUIT sont présentes et conformes."
      : value.readyToInstall ? "Lot 3 prêt : quatorze ajouts compatibles, lots ACTIONS et ATTRIBUTIONS confirmés."
      : "Lot 3 bloqué : examinez les écarts affichés.";
  }
  function renderAttribution(value) {
    attributionResult = value;
    $("attribution-findings").replaceChildren(...value.findings.map(text => { const li = document.createElement("li"); li.textContent = text; return li; }));
    $("attribution-columns").replaceChildren(...value.columns.map(text => { const li = document.createElement("li"); li.textContent = `ACTIONS_ATTRIBUTIONS.${text}`; return li; }));
    $("attribution-status").textContent = value.outcomeUncertain ? "Résultat incertain : ne relancez pas l’installation."
      : value.alreadyInstalled ? "Lot 2 confirmé : les cinq colonnes ATTRIBUTIONS sont présentes et conformes."
      : value.readyToInstall ? "Lot 2 prêt : cinq ajouts compatibles, dépendance ACTIONS confirmée."
      : "Lot 2 bloqué : examinez les écarts affichés.";
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
  async function executeAttribution(operation) {
    if (attributionBusy) return;
    attributionBusy = true; controls(); $("attribution-status").textContent = "Contrôle du lot ATTRIBUTIONS en cours…";
    try { renderAttribution(await operation()); }
    catch (error) { attributionResult = null; $("attribution-columns").replaceChildren(); $("attribution-findings").replaceChildren(); $("attribution-status").textContent = error.message; }
    finally { attributionBusy = false; controls(); }
  }
  async function executeCircuit(operation) {
    if (circuitBusy) return;
    circuitBusy = true; controls(); $("circuit-status").textContent = "Contrôle du lot CIRCUIT en cours…";
    try { renderCircuit(await operation()); }
    catch (error) { circuitResult = null; $("circuit-columns").replaceChildren(); $("circuit-findings").replaceChildren(); $("circuit-status").textContent = error.message; }
    finally { circuitBusy = false; controls(); }
  }
  async function executeEvent(operation) {
    if (eventBusy) return;
    eventBusy = true; controls(); $("event-status").textContent = "Contrôle du lot ÉVÉNEMENTS en cours…";
    try { renderEvent(await operation()); }
    catch (error) { eventResult = null; $("event-columns").replaceChildren(); $("event-findings").replaceChildren(); $("event-status").textContent = error.message; }
    finally { eventBusy = false; controls(); }
  }
  async function executeNotification(operation) {
    if (notificationBusy) return;
    notificationBusy = true; controls(); $("notification-status").textContent = "Contrôle du lot NOTIFICATIONS en cours…";
    try { renderNotification(await operation()); }
    catch (error) { notificationResult = null; $("notification-columns").replaceChildren(); $("notification-findings").replaceChildren(); $("notification-status").textContent = error.message; }
    finally { notificationBusy = false; controls(); }
  }
  async function executeAccount(operation) {
    if (accountBusy) return;
    accountBusy = true; controls(); $("account-status").textContent = "Contrôle du lot COMPTES en cours…";
    try { renderAccount(await operation()); }
    catch (error) { accountResult = null; $("account-columns").replaceChildren(); $("account-findings").replaceChildren(); $("account-status").textContent = error.message; }
    finally { accountBusy = false; controls(); }
  }
  async function executeProject(operation) {
    if (projectBusy) return;
    projectBusy = true; controls(); $("project-status").textContent = "Contrôle du lot PROJETS en cours…";
    try { renderProject(await operation()); }
    catch (error) { projectResult = null; $("project-columns").replaceChildren(); $("project-findings").replaceChildren(); $("project-status").textContent = error.message; }
    finally { projectBusy = false; controls(); }
  }
  $("backup").onchange = controls;
  $("source-backup").onchange = controls;
  $("attribution-backup").onchange = controls;
  $("circuit-backup").onchange = controls;
  $("event-backup").onchange = controls;
  $("notification-backup").onchange = controls;
  $("account-backup").onchange = controls;
  $("project-backup").onchange = controls;
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
  $("attribution-check").onclick = () => executeAttribution(async () => {
    if (!window.grist?.docApi) throw Error("Ouvrez cette page comme widget dans le document de base Grist.");
    await window.grist.ready({ requiredAccess: "full" });
    attributionService ??= window.PilotageActionTableSchemaSetup.create({ grist: window.grist, mode: window.PilotageTestMode, lot: window.PilotageActionAttributionSchemaLot });
    return attributionService.inspect();
  });
  $("attribution-install").onclick = () => {
    if (attributionBusy || $("attribution-install").disabled || !attributionService) return;
    if (!window.confirm("Ajouter les cinq colonnes techniques du lot ATTRIBUTIONS ? La table est encore vide et reste protégée.")) return;
    executeAttribution(() => attributionService.install({ confirmed: true }));
  };
  $("circuit-check").onclick = () => executeCircuit(async () => {
    if (!window.grist?.docApi) throw Error("Ouvrez cette page comme widget dans le document de base Grist.");
    await window.grist.ready({ requiredAccess: "full" });
    circuitService ??= window.PilotageActionTableSchemaSetup.create({ grist: window.grist, mode: window.PilotageTestMode, lot: window.PilotageActionCircuitSchemaLot });
    return circuitService.inspect();
  });
  $("circuit-install").onclick = () => {
    if (circuitBusy || $("circuit-install").disabled || !circuitService) return;
    if (!window.confirm("Ajouter les quatorze colonnes techniques du lot CIRCUIT ? Les tables métier restent protégées pendant cette préparation.")) return;
    executeCircuit(() => circuitService.install({ confirmed: true }));
  };
  $("event-check").onclick = () => executeEvent(async () => {
    if (!window.grist?.docApi) throw Error("Ouvrez cette page comme widget dans le document de base Grist.");
    await window.grist.ready({ requiredAccess: "full" });
    eventService ??= window.PilotageActionTableSchemaSetup.create({ grist: window.grist, mode: window.PilotageTestMode, lot: window.PilotageActionEventSchemaLot });
    return eventService.inspect();
  });
  $("event-install").onclick = () => {
    if (eventBusy || $("event-install").disabled || !eventService) return;
    if (!window.confirm("Ajouter les six colonnes techniques du lot ÉVÉNEMENTS ? Le journal reste vide et protégé pendant cette préparation.")) return;
    executeEvent(() => eventService.install({ confirmed: true }));
  };
  $("notification-check").onclick = () => executeNotification(async () => {
    if (!window.grist?.docApi) throw Error("Ouvrez cette page comme widget dans le document de base Grist.");
    await window.grist.ready({ requiredAccess: "full" });
    notificationService ??= window.PilotageActionTableSchemaSetup.create({ grist: window.grist, mode: window.PilotageTestMode, lot: window.PilotageActionNotificationSchemaLot });
    return notificationService.inspect();
  });
  $("notification-install").onclick = () => {
    if (notificationBusy || $("notification-install").disabled || !notificationService) return;
    if (!window.confirm("Ajouter les deux colonnes techniques du lot NOTIFICATIONS ? Les notifications restent vides et protégées pendant cette préparation.")) return;
    executeNotification(() => notificationService.install({ confirmed: true }));
  };
  $("account-check").onclick = () => executeAccount(async () => {
    if (!window.grist?.docApi) throw Error("Ouvrez cette page comme widget dans le document de base Grist.");
    await window.grist.ready({ requiredAccess: "full" });
    accountService ??= window.PilotageActionTableSchemaSetup.create({ grist: window.grist, mode: window.PilotageTestMode, lot: window.PilotageActionAccountSchemaLot });
    return accountService.inspect();
  });
  $("account-install").onclick = () => {
    if (accountBusy || $("account-install").disabled || !accountService) return;
    if (!window.confirm("Ajouter la colonne Administrateur au registre des comptes ? Aucun compte ne sera désigné et aucun droit ne sera modifié par cette étape.")) return;
    executeAccount(() => accountService.install({ confirmed: true }));
  };
  $("project-check").onclick = () => executeProject(async () => {
    if (!window.grist?.docApi) throw Error("Ouvrez cette page comme widget dans le document de base Grist.");
    await window.grist.ready({ requiredAccess: "full" });
    projectService ??= window.PilotageActionTableSchemaSetup.create({ grist: window.grist, mode: window.PilotageTestMode, lot: window.PilotageActionProjectSchemaLot });
    return projectService.inspect();
  });
  $("project-install").onclick = () => {
    if (projectBusy || $("project-install").disabled || !projectService) return;
    if (!window.confirm(`Ajouter les ${projectResult.columns.length} colonnes manquantes du lot PROJETS ? Aucune ligne de projet ne sera modifiée.`)) return;
    executeProject(() => projectService.install({ confirmed: true }));
  };
  // No automatic read or write at load; both stages are explicit user actions.
  controls();
})();
