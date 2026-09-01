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
  let permissionService, permissionBusy = false;
  let circuitPermissionService, circuitPermissionResult = null, circuitPermissionBusy = false;
  let attributionPermissionService, attributionPermissionResult = null, attributionPermissionBusy = false;
  let eventPermissionService, eventPermissionResult = null, eventPermissionBusy = false;
  let notificationPermissionService, notificationPermissionResult = null, notificationPermissionBusy = false;
  let legacyService, legacyBusy = false;
  let sourcePermissionService, sourcePermissionResult = null, sourcePermissionBusy = false;
  let accountPermissionService, accountPermissionBusy = false;
  let authorityPermissionService, authorityPermissionResult = null, authorityPermissionBusy = false;
  let finalPermissionService, finalPermissionBusy = false;
  let realDataService, realDataBusy = false;
  let creationPreviewService, creationPreviewBusy = false;
  let lifecyclePreviewService, lifecyclePreviewBusy = false;
  let safetyPreviewService, safetyPreviewBusy = false;
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
    $("permission-check").disabled = permissionBusy;
    $("circuit-permission-check").disabled = circuitPermissionBusy;
    $("circuit-permission-confirm").disabled = circuitPermissionBusy;
    $("circuit-permission-install").disabled = circuitPermissionBusy || !$("circuit-permission-confirm").checked || !circuitPermissionResult?.readyToInstall || circuitPermissionResult.alreadyInstalled || circuitPermissionResult.outcomeUncertain;
    $("attribution-permission-check").disabled = attributionPermissionBusy;
    $("attribution-permission-confirm").disabled = attributionPermissionBusy;
    $("attribution-permission-install").disabled = attributionPermissionBusy || !$("attribution-permission-confirm").checked || !attributionPermissionResult?.readyToInstall || attributionPermissionResult.alreadyInstalled || attributionPermissionResult.outcomeUncertain;
    $("event-permission-check").disabled = eventPermissionBusy;
    $("event-permission-confirm").disabled = eventPermissionBusy;
    $("event-permission-install").disabled = eventPermissionBusy || !$("event-permission-confirm").checked || !eventPermissionResult?.readyToInstall || eventPermissionResult.alreadyInstalled || eventPermissionResult.outcomeUncertain;
    $("notification-permission-check").disabled = notificationPermissionBusy;
    $("notification-permission-confirm").disabled = notificationPermissionBusy;
    $("notification-permission-install").disabled = notificationPermissionBusy || !$("notification-permission-confirm").checked || !notificationPermissionResult?.readyToInstall || notificationPermissionResult.alreadyInstalled || notificationPermissionResult.outcomeUncertain;
    $("legacy-check").disabled = legacyBusy;
    $("source-permission-check").disabled = sourcePermissionBusy;
    $("source-permission-confirm").disabled = sourcePermissionBusy;
    $("source-permission-install").disabled = sourcePermissionBusy || !$("source-permission-confirm").checked || !sourcePermissionResult?.readyToInstall || sourcePermissionResult.alreadyInstalled || sourcePermissionResult.outcomeUncertain;
    $("account-permission-check").disabled = accountPermissionBusy;
    $("authority-permission-check").disabled = authorityPermissionBusy;
    $("authority-permission-confirm").disabled = authorityPermissionBusy;
    $("authority-permission-install").disabled = authorityPermissionBusy || !$("authority-permission-confirm").checked || !authorityPermissionResult?.readyToInstall || authorityPermissionResult.alreadyInstalled || authorityPermissionResult.outcomeUncertain;
    $("final-permission-check").disabled = finalPermissionBusy;
    $("real-data-check").disabled = realDataBusy;
    $("creation-preview-check").disabled = creationPreviewBusy;
    $("lifecycle-preview-check").disabled = lifecyclePreviewBusy;
    $("safety-preview-check").disabled = safetyPreviewBusy;
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
  $("permission-check").onclick = async () => {
    if(permissionBusy)return;
    permissionBusy=true;controls();$("permission-status").textContent="Inventaire des permissions en cours…";
    $("permission-findings").replaceChildren();$("permission-confirmed").replaceChildren();
    try{
      if(!window.grist?.docApi)throw Error("Ouvrez cette page comme widget dans le document de base Grist.");
      await window.grist.ready({requiredAccess:"full"});
      permissionService??=window.PilotageActionPermissionAuditService.create({grist:window.grist});
      const value=await permissionService.inspect();
      const list=(id,texts)=>$(id).replaceChildren(...texts.map(text=>{const li=document.createElement("li");li.textContent=text;return li;}));
      list("permission-findings",value.findings);list("permission-confirmed",value.confirmed);
      $("permission-status").textContent=value.readyForPermissionReview
        ?`Contrôle 1/4 conforme : ${value.confirmed.length} points confirmés. ${value.preservedResourceCount} ressource(s) hors circuit seront préservées.`
        :"Contrôle 1/4 bloqué : examinez les écarts affichés avant toute modification.";
    }catch(error){$("permission-status").textContent=error.message;}
    finally{permissionBusy=false;controls();}
  };
  $("circuit-permission-confirm").onchange=controls;
  async function executeCircuitPermission(operation){
    if(circuitPermissionBusy)return;
    circuitPermissionBusy=true;controls();$("circuit-permission-status").textContent="Contrôle du premier lot de permissions en cours…";
    try{
      const value=await operation();circuitPermissionResult=value;
      $("circuit-permission-findings").replaceChildren(...value.findings.map(text=>{const li=document.createElement("li");li.textContent=text;return li;}));
      $("circuit-permission-status").textContent=value.outcomeUncertain?"Résultat incertain : ne relancez pas l’installation."
        :value.alreadyInstalled?"Circuit 1/4 confirmé : les 9 règles ACTIONS_CIRCUIT sont présentes et conformes."
        :value.readyToInstall?"Circuit 1/4 prêt : 9 règles ordonnées, autres ressources préservées."
        :"Circuit 1/4 bloqué : examinez les écarts affichés.";
    }catch(error){circuitPermissionResult=null;$("circuit-permission-findings").replaceChildren();$("circuit-permission-status").textContent=error.message;}
    finally{circuitPermissionBusy=false;controls();}
  }
  $("circuit-permission-check").onclick=()=>executeCircuitPermission(async()=>{
    if(!window.grist?.docApi)throw Error("Ouvrez cette page comme widget dans le document de base Grist.");
    await window.grist.ready({requiredAccess:"full"});
    if(!window.PilotageActionPermissionLotSetup?.create)throw Error("Le moteur sécurisé des permissions manque dans la publication.");
    circuitPermissionService??=window.PilotageActionPermissionLotSetup.create({grist:window.grist,mode:window.PilotageTestMode,audit:window.PilotageActionPermissionAudit,lot:window.PilotageActionCircuitPermissionLot});
    return circuitPermissionService.inspect();
  });
  $("circuit-permission-install").onclick=()=>{
    if(circuitPermissionBusy||$("circuit-permission-install").disabled||!circuitPermissionService)return;
    if(!window.confirm("Installer les 9 règles finales sur ACTIONS_CIRCUIT uniquement ?"))return;
    executeCircuitPermission(()=>circuitPermissionService.install({confirmed:true}));
  };
  $("attribution-permission-confirm").onchange=controls;
  async function executeAttributionPermission(operation){
    if(attributionPermissionBusy)return;
    attributionPermissionBusy=true;controls();$("attribution-permission-status").textContent="Contrôle du deuxième lot de permissions en cours…";
    try{
      const value=await operation();attributionPermissionResult=value;
      $("attribution-permission-findings").replaceChildren(...value.findings.map(text=>{const li=document.createElement("li");li.textContent=text;return li;}));
      $("attribution-permission-status").textContent=value.outcomeUncertain?"Résultat incertain : ne relancez pas l’installation."
        :value.alreadyInstalled?"Circuit 2/4 confirmé : les 5 règles ACTIONS_ATTRIBUTIONS sont présentes et conformes."
        :value.readyToInstall?"Circuit 2/4 prêt : 5 règles ordonnées, lot ACTIONS_CIRCUIT confirmé et autres ressources préservées."
        :"Circuit 2/4 bloqué : examinez les écarts affichés.";
    }catch(error){attributionPermissionResult=null;$("attribution-permission-findings").replaceChildren();$("attribution-permission-status").textContent=error.message;}
    finally{attributionPermissionBusy=false;controls();}
  }
  $("attribution-permission-check").onclick=()=>executeAttributionPermission(async()=>{
    if(!window.grist?.docApi)throw Error("Ouvrez cette page comme widget dans le document de base Grist.");
    await window.grist.ready({requiredAccess:"full"});
    if(!window.PilotageActionPermissionLotSetup?.create)throw Error("Le moteur sécurisé des permissions manque dans la publication.");
    attributionPermissionService??=window.PilotageActionPermissionLotSetup.create({grist:window.grist,mode:window.PilotageTestMode,audit:window.PilotageActionPermissionAudit,lot:window.PilotageActionAttributionPermissionLot});
    return attributionPermissionService.inspect();
  });
  $("attribution-permission-install").onclick=()=>{
    if(attributionPermissionBusy||$("attribution-permission-install").disabled||!attributionPermissionService)return;
    if(!window.confirm("Installer les 5 règles finales sur ACTIONS_ATTRIBUTIONS uniquement ?"))return;
    executeAttributionPermission(()=>attributionPermissionService.install({confirmed:true}));
  };
  $("event-permission-confirm").onchange=controls;
  async function executeEventPermission(operation){
    if(eventPermissionBusy)return;
    eventPermissionBusy=true;controls();$("event-permission-status").textContent="Contrôle du troisième lot de permissions en cours…";
    try{
      const value=await operation();eventPermissionResult=value;
      $("event-permission-findings").replaceChildren(...value.findings.map(text=>{const li=document.createElement("li");li.textContent=text;return li;}));
      $("event-permission-status").textContent=value.outcomeUncertain?"Résultat incertain : ne relancez pas l’installation."
        :value.alreadyInstalled?"Circuit 3/4 confirmé : les 9 règles ACTIONS_EVENEMENTS sont présentes et conformes."
        :value.readyToInstall?"Circuit 3/4 prêt : 9 règles ordonnées, lots précédents confirmés et autres ressources préservées."
        :"Circuit 3/4 bloqué : examinez les écarts affichés.";
    }catch(error){eventPermissionResult=null;$("event-permission-findings").replaceChildren();$("event-permission-status").textContent=error.message;}
    finally{eventPermissionBusy=false;controls();}
  }
  $("event-permission-check").onclick=()=>executeEventPermission(async()=>{
    if(!window.grist?.docApi)throw Error("Ouvrez cette page comme widget dans le document de base Grist.");
    await window.grist.ready({requiredAccess:"full"});
    if(!window.PilotageActionPermissionLotSetup?.create)throw Error("Le moteur sécurisé des permissions manque dans la publication.");
    eventPermissionService??=window.PilotageActionPermissionLotSetup.create({grist:window.grist,mode:window.PilotageTestMode,audit:window.PilotageActionPermissionAudit,lot:window.PilotageActionEventPermissionLot});
    return eventPermissionService.inspect();
  });
  $("event-permission-install").onclick=()=>{
    if(eventPermissionBusy||$("event-permission-install").disabled||!eventPermissionService)return;
    if(!window.confirm("Installer les 9 règles finales sur ACTIONS_EVENEMENTS uniquement ?"))return;
    executeEventPermission(()=>eventPermissionService.install({confirmed:true}));
  };
  $("notification-permission-confirm").onchange=controls;
  async function executeNotificationPermission(operation){
    if(notificationPermissionBusy)return;
    notificationPermissionBusy=true;controls();$("notification-permission-status").textContent="Contrôle du dernier lot de permissions du circuit en cours…";
    try{
      const value=await operation();notificationPermissionResult=value;
      $("notification-permission-findings").replaceChildren(...value.findings.map(text=>{const li=document.createElement("li");li.textContent=text;return li;}));
      $("notification-permission-status").textContent=value.outcomeUncertain?"Résultat incertain : ne relancez pas l’installation."
        :value.alreadyInstalled?"Circuit 4/4 confirmé : les 5 règles ACTIONS_NOTIFICATIONS sont présentes et conformes. La protection du circuit est terminée."
        :value.readyToInstall?"Circuit 4/4 prêt : 5 règles ordonnées, confidentialité existante reconnue et lots précédents confirmés."
        :"Circuit 4/4 bloqué : examinez les écarts affichés.";
    }catch(error){notificationPermissionResult=null;$("notification-permission-findings").replaceChildren();$("notification-permission-status").textContent=error.message;}
    finally{notificationPermissionBusy=false;controls();}
  }
  $("notification-permission-check").onclick=()=>executeNotificationPermission(async()=>{
    if(!window.grist?.docApi)throw Error("Ouvrez cette page comme widget dans le document de base Grist.");
    await window.grist.ready({requiredAccess:"full"});
    if(!window.PilotageActionPermissionLotSetup?.create)throw Error("Le moteur sécurisé des permissions manque dans la publication.");
    notificationPermissionService??=window.PilotageActionPermissionLotSetup.create({grist:window.grist,mode:window.PilotageTestMode,audit:window.PilotageActionPermissionAudit,lot:window.PilotageActionNotificationPermissionLot});
    return notificationPermissionService.inspect();
  });
  $("notification-permission-install").onclick=()=>{
    if(notificationPermissionBusy||$("notification-permission-install").disabled||!notificationPermissionService)return;
    if(!window.confirm("Installer les 5 règles finales sur ACTIONS_NOTIFICATIONS uniquement ?"))return;
    executeNotificationPermission(()=>notificationPermissionService.install({confirmed:true}));
  };
  $("legacy-check").onclick=async()=>{
    if(legacyBusy)return;legacyBusy=true;controls();$("legacy-status").textContent="Contrôle des marqueurs historiques en cours…";$("legacy-findings").replaceChildren();$("legacy-counts").replaceChildren();
    try{
      if(!window.grist?.docApi)throw Error("Ouvrez cette page comme widget dans le document de base Grist.");
      await window.grist.ready({requiredAccess:"full"});legacyService??=window.PilotageActionLegacyLiveAudit.create({grist:window.grist});const value=await legacyService.inspect();
      $("legacy-findings").replaceChildren(...value.findings.map(text=>{const li=document.createElement("li");li.textContent=text;return li;}));
      const labels={actions:"Actions historiques",circuits:"Circuits",assignments:"Attributions",events:"Événements",notifications:"Notifications"};
      $("legacy-counts").replaceChildren(...Object.entries(value.counts).map(([name,count])=>{const li=document.createElement("li");li.textContent=`${labels[name]} : ${count}`;return li;}));
      $("legacy-status").textContent=value.readyForActionPolicy?"Héritage 1/2 conforme : 17 anciennes actions préservées à la révision 0, aucune ligne de circuit.":"Héritage 1/2 bloqué : examinez les écarts affichés.";
    }catch(error){$("legacy-status").textContent=error.message;}
    finally{legacyBusy=false;controls();}
  };
  $("source-permission-confirm").onchange=controls;
  async function executeSourcePermission(operation){
    if(sourcePermissionBusy)return;
    sourcePermissionBusy=true;controls();$("source-permission-status").textContent="Contrôle des droits définitifs ACTIONS en cours…";
    try{
      const value=await operation();sourcePermissionResult=value;
      $("source-permission-findings").replaceChildren(...value.findings.map(text=>{const li=document.createElement("li");li.textContent=text;return li;}));
      $("source-permission-status").textContent=value.outcomeUncertain?"Résultat incertain : ne relancez pas l’installation."
        :value.alreadyInstalled?"Héritage 2/2 confirmé : les 9 règles ACTIONS sont présentes et les anciennes actions restent protégées."
        :value.readyToInstall?"Héritage 2/2 prêt : 9 règles ordonnées et 17 anciennes actions confirmées, sans ligne de circuit."
        :"Héritage 2/2 bloqué : examinez les écarts affichés.";
    }catch(error){sourcePermissionResult=null;$("source-permission-findings").replaceChildren();$("source-permission-status").textContent=error.message;}
    finally{sourcePermissionBusy=false;controls();}
  }
  $("source-permission-check").onclick=()=>executeSourcePermission(async()=>{
    if(!window.grist?.docApi)throw Error("Ouvrez cette page comme widget dans le document de base Grist.");
    await window.grist.ready({requiredAccess:"full"});
    if(!window.PilotageActionPermissionLotSetup?.create||!window.PilotageActionSourcePermissionLot?.inspect)throw Error("Le lot sécurisé ACTIONS manque dans la publication.");
    legacyService??=window.PilotageActionLegacyLiveAudit.create({grist:window.grist});
    sourcePermissionService??=window.PilotageActionPermissionLotSetup.create({grist:window.grist,mode:window.PilotageTestMode,audit:window.PilotageActionPermissionAudit,lot:window.PilotageActionSourcePermissionLot,liveAudit:legacyService});
    return sourcePermissionService.inspect();
  });
  $("source-permission-install").onclick=()=>{
    if(sourcePermissionBusy||$("source-permission-install").disabled||!sourcePermissionService)return;
    if(!window.confirm("Installer les 9 règles définitives sur ACTIONS uniquement, après une nouvelle vérification des 17 anciennes actions ?"))return;
    executeSourcePermission(()=>sourcePermissionService.install({confirmed:true}));
  };
  $("account-permission-check").onclick=async()=>{
    if(accountPermissionBusy)return;accountPermissionBusy=true;controls();$("account-permission-status").textContent="Contrôle des comptes administrateurs en cours…";$("account-permission-findings").replaceChildren();$("account-permission-counts").replaceChildren();
    try{
      if(!window.grist?.docApi)throw Error("Ouvrez cette page comme widget dans le document de base Grist.");
      await window.grist.ready({requiredAccess:"full"});
      if(!window.PilotageActionAccountLiveAudit?.create)throw Error("Le contrôle sécurisé des comptes manque dans la publication.");
      accountPermissionService??=window.PilotageActionAccountLiveAudit.create({grist:window.grist});const value=await accountPermissionService.inspect();
      $("account-permission-findings").replaceChildren(...value.findings.map(text=>{const li=document.createElement("li");li.textContent=text;return li;}));
      const counts=[`Comptes enregistrés : ${value.accountCount}`,`Comptes actifs : ${value.activeAccountCount}`,`Administrateurs désignés : ${value.administratorCount}`];
      $("account-permission-counts").replaceChildren(...counts.map(text=>{const li=document.createElement("li");li.textContent=text;return li;}));
      $("account-permission-status").textContent=value.readyForAuthorityPolicy?"Comptes 1/3 conforme : registre unique, actif et administrateur interne confirmé.":"Comptes 1/3 bloqué : examinez les écarts affichés.";
    }catch(error){$("account-permission-status").textContent=error.message;}
    finally{accountPermissionBusy=false;controls();}
  };
  $("authority-permission-confirm").onchange=controls;
  async function executeAuthorityPermission(operation){
    if(authorityPermissionBusy)return;authorityPermissionBusy=true;controls();$("authority-permission-status").textContent="Contrôle des droits des projets et de l’organisation en cours…";
    try{const value=await operation();authorityPermissionResult=value;$("authority-permission-findings").replaceChildren(...value.findings.map(text=>{const li=document.createElement("li");li.textContent=text;return li;}));$("authority-permission-status").textContent=value.outcomeUncertain?"Résultat incertain : ne relancez pas l’installation.":value.alreadyInstalled?"Projets et organisation 2/3 confirmés : les 41 règles d’autorité sont présentes et conformes.":value.readyToInstall?"Projets et organisation 2/3 prêts : 9 groupes et 41 règles ordonnées, comptes administrateurs confirmés.":"Projets et organisation 2/3 bloqués : examinez les écarts affichés.";}catch(error){authorityPermissionResult=null;$("authority-permission-findings").replaceChildren();$("authority-permission-status").textContent=error.message;}finally{authorityPermissionBusy=false;controls();}
  }
  $("authority-permission-check").onclick=()=>executeAuthorityPermission(async()=>{
    if(!window.grist?.docApi)throw Error("Ouvrez cette page comme widget dans le document de base Grist.");await window.grist.ready({requiredAccess:"full"});if(!window.PilotageActionAuthorityPermissionLot?.inspect||!window.PilotageActionPermissionLotSetup?.create)throw Error("Le lot sécurisé des autorités manque dans la publication.");accountPermissionService??=window.PilotageActionAccountLiveAudit.create({grist:window.grist});authorityPermissionService??=window.PilotageActionPermissionLotSetup.create({grist:window.grist,mode:window.PilotageTestMode,audit:window.PilotageActionPermissionAudit,lot:window.PilotageActionAuthorityPermissionLot,liveAudit:accountPermissionService});return authorityPermissionService.inspect();
  });
  $("authority-permission-install").onclick=()=>{if(authorityPermissionBusy||$("authority-permission-install").disabled||!authorityPermissionService)return;if(!window.confirm("Installer en une seule fois les 41 règles d’autorité sur PROJETS, INTERLOCUTEURS, SERVICES et POLES ?"))return;executeAuthorityPermission(()=>authorityPermissionService.install({confirmed:true}));};
  $("final-permission-check").onclick=async()=>{
    if(finalPermissionBusy)return;finalPermissionBusy=true;controls();$("final-permission-status").textContent="Validation générale en cours…";$("final-permission-findings").replaceChildren();$("final-permission-confirmed").replaceChildren();
    try{if(!window.grist?.docApi)throw Error("Ouvrez cette page comme widget dans le document de base Grist.");await window.grist.ready({requiredAccess:"full"});if(!window.PilotageActionFinalLiveAudit?.create)throw Error("Le validateur général manque dans la publication.");finalPermissionService??=window.PilotageActionFinalLiveAudit.create({grist:window.grist});const value=await finalPermissionService.inspect();const list=(id,texts)=>$(id).replaceChildren(...texts.map(text=>{const li=document.createElement("li");li.textContent=text;return li;}));list("final-permission-findings",value.findings);list("final-permission-confirmed",value.confirmed);$("final-permission-status").textContent=value.readyForFinalValidation?`Validation générale conforme : ${value.managedRuleCount} règles gérées, schéma, héritage et administration confirmés.`:"Validation générale bloquée : examinez les écarts affichés.";}catch(error){$("final-permission-status").textContent=error.message;}finally{finalPermissionBusy=false;controls();}
  };
  $("real-data-check").onclick=async()=>{
    if(realDataBusy)return;realDataBusy=true;controls();$("real-data-status").textContent="Identification et lectures réelles en cours…";$("real-data-findings").replaceChildren();$("real-data-confirmed").replaceChildren();$("real-data-counts").replaceChildren();
    try{
      if(!window.grist?.docApi)throw Error("Ouvrez cette page comme widget dans le document de base Grist.");
      await window.grist.ready({requiredAccess:"full"});
      if(!window.PilotageActionRealDataPreflight?.create||!window.PilotageCurrentUser?.identify)throw Error("Le contrôle sécurisé des données réelles manque dans la publication.");
      realDataService??=window.PilotageActionRealDataPreflight.create({grist:window.grist,mode:window.PilotageTestMode,identify:options=>window.PilotageCurrentUser.identify(options)});
      const value=await realDataService.inspect();
      const list=(id,texts)=>$(id).replaceChildren(...texts.map(text=>{const li=document.createElement("li");li.textContent=text;return li;}));
      list("real-data-findings",value.findings);list("real-data-confirmed",value.confirmed);
      const labels={INTERLOCUTEURS:"Interlocuteurs accessibles",PROJETS:"Projets accessibles",ACTIONS:"Actions historiques",ACTIONS_CIRCUIT:"Circuits",ACTIONS_ATTRIBUTIONS:"Attributions",ACTIONS_EVENEMENTS:"Événements",ACTIONS_NOTIFICATIONS:"Notifications"};
      list("real-data-counts",Object.entries(value.counts).filter(([,count])=>count>=0).map(([name,count])=>`${labels[name]} : ${count}`));
      $("real-data-status").textContent=value.readyForRealData?"Données réelles 1/4 conformes : identité administrative reconnue, lectures autorisées et nouveau circuit encore vide.":"Données réelles 1/4 bloquées : examinez les écarts affichés avant toute création.";
    }catch(error){$("real-data-status").textContent=error.message;}
    finally{realDataBusy=false;controls();}
  };
  $("creation-preview-check").onclick=async()=>{
    if(creationPreviewBusy)return;creationPreviewBusy=true;controls();$("creation-preview-status").textContent="Prévisualisation des chemins réels en cours…";$("creation-preview-findings").replaceChildren();$("creation-preview-confirmed").replaceChildren();$("creation-preview-counts").replaceChildren();
    try{
      if(!window.grist?.docApi)throw Error("Ouvrez cette page comme widget dans le document de base Grist.");
      await window.grist.ready({requiredAccess:"full"});
      if(!window.PilotageActionCreationLiveAudit?.create||!window.PilotageCurrentUser?.identify)throw Error("Le prévisualiseur sécurisé de création manque dans la publication.");
      creationPreviewService??=window.PilotageActionCreationLiveAudit.create({grist:window.grist,mode:window.PilotageTestMode,identify:options=>window.PilotageCurrentUser.identify(options)});
      const value=await creationPreviewService.inspect();
      const list=(id,texts)=>$(id).replaceChildren(...texts.map(text=>{const li=document.createElement("li");li.textContent=text;return li;}));
      list("creation-preview-findings",value.findings);list("creation-preview-confirmed",value.confirmed);
      list("creation-preview-counts",[`Projets entièrement pilotés : ${value.counts.projects}`,`Scénarios autorisés pour votre rôle : ${value.counts.plans}`,`Vers un agent : ${value.counts.direct}`,`Vers un service : ${value.counts.services}`,`Vers un pôle : ${value.counts.poles}`]);
      $("creation-preview-status").textContent=value.readyForCreation?"Données réelles 2/4 conformes : création et attribution initiale entièrement calculables, sans aucun enregistrement.":"Données réelles 2/4 bloquées : examinez les écarts de rôle ou d’organisation affichés.";
    }catch(error){$("creation-preview-status").textContent=error.message;}
    finally{creationPreviewBusy=false;controls();}
  };
  $("lifecycle-preview-check").onclick=async()=>{
    if(lifecyclePreviewBusy)return;lifecyclePreviewBusy=true;controls();$("lifecycle-preview-status").textContent="Répétition du cycle complet en cours…";$("lifecycle-preview-findings").replaceChildren();$("lifecycle-preview-confirmed").replaceChildren();$("lifecycle-preview-counts").replaceChildren();
    try{
      if(!window.grist?.docApi)throw Error("Ouvrez cette page comme widget dans le document de base Grist.");
      await window.grist.ready({requiredAccess:"full"});
      if(!window.PilotageActionLifecycleLiveAudit?.create||!window.PilotageCurrentUser?.identify)throw Error("Le répétiteur sécurisé du cycle de vie manque dans la publication.");
      lifecyclePreviewService??=window.PilotageActionLifecycleLiveAudit.create({grist:window.grist,mode:window.PilotageTestMode,identify:options=>window.PilotageCurrentUser.identify(options)});
      const value=await lifecyclePreviewService.inspect(),list=(id,texts)=>$(id).replaceChildren(...texts.map(text=>{const li=document.createElement("li");li.textContent=text;return li;}));
      list("lifecycle-preview-findings",value.findings);list("lifecycle-preview-confirmed",value.confirmed);
      list("lifecycle-preview-counts",[`Transitions contrôlées : ${value.counts.transitions}`,`Révision finale simulée : ${value.counts.finalRevision}`,`Notifications calculées : ${value.counts.notifications}`]);
      $("lifecycle-preview-status").textContent=value.readyForLifecycle?"Données réelles 3/4 conformes : le cycle complet et ses rôles ont été répétés sans aucun enregistrement.":"Données réelles 3/4 bloquées : examinez l’écart affiché avant toute activation.";
    }catch(error){$("lifecycle-preview-status").textContent=error.message;}
    finally{lifecyclePreviewBusy=false;controls();}
  };
  $("safety-preview-check").onclick=async()=>{
    if(safetyPreviewBusy)return;safetyPreviewBusy=true;controls();$("safety-preview-status").textContent="Contrôle des échéances et notifications en cours…";$("safety-preview-findings").replaceChildren();$("safety-preview-confirmed").replaceChildren();$("safety-preview-counts").replaceChildren();
    try{
      if(!window.grist?.docApi)throw Error("Ouvrez cette page comme widget dans le document de base Grist.");
      await window.grist.ready({requiredAccess:"full"});
      if(!window.PilotageActionSafetyLiveAudit?.create||!window.PilotageCurrentUser?.identify)throw Error("Le dernier contrôle sécurisé du circuit manque dans la publication.");
      safetyPreviewService??=window.PilotageActionSafetyLiveAudit.create({grist:window.grist,mode:window.PilotageTestMode,identify:options=>window.PilotageCurrentUser.identify(options)});
      const value=await safetyPreviewService.inspect(),list=(id,texts)=>$(id).replaceChildren(...texts.map(text=>{const li=document.createElement("li");li.textContent=text;return li;}));
      list("safety-preview-findings",value.findings);list("safety-preview-confirmed",value.confirmed);
      list("safety-preview-counts",[`Niveaux d’échéance contrôlés : ${value.counts.deadlineLevels}`,`Notifications minimales calculées : ${value.counts.notifications}`,`Formules de confidentialité : ${value.counts.helperColumns}`,`Second envoi bloqué après incertitude : ${value.counts.retriesBlocked}`]);
      $("safety-preview-status").textContent=value.readyForSafety?"Données réelles 4/4 conformes : échéances, notifications et résultat incertain sont sécurisés. Le raccordement aux données réelles est terminé.":"Données réelles 4/4 bloquées : examinez l’écart affiché avant de créer les pages fonctionnelles.";
    }catch(error){$("safety-preview-status").textContent=error.message;}
    finally{safetyPreviewBusy=false;controls();}
  };
  // No automatic read or write at load; both stages are explicit user actions.
  controls();
})();
