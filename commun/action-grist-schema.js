"use strict";

// Additive STAGING plan only: empty new tables, owner-only table ACLs.
// It does not enable the business workflow or certify production permissions.
(function expose(root, factory) {
  const api = factory(typeof module === "object" && module.exports ? require("./action-notification-permissions.js") : root.PilotageActionNotificationPermissions);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PilotageActionGristSchema = api;
})(typeof globalThis === "object" ? globalThis : this, function factory(notificationPolicy) {
  const documentId = "f8iwcexDATAwBKsaG6gZRs";
  const ref = "Ref:INTERLOCUTEURS", refs = "RefList:INTERLOCUTEURS", time = "DateTime:Europe/Paris";
  const definitions = {
    ACTIONS_CIRCUIT: {
      Action: "Ref:ACTIONS", Version_circuit: "Int", Revision: "Int", Etape: "Choice",
      Createur: ref, Executant: ref, Responsable_destinataire: ref,
      Type_destinataire: "Choice", Agent_destinataire: ref, Service_destinataire: "Ref:SERVICES", Pole_destinataire: "Ref:POLES",
      Service_contexte: "Ref:SERVICES", Superieur_direct: ref, Associes: refs, Contextes_associes: "Text", Audience_initiale: refs,
      Date_realisation: time, Realisee_par: ref, Date_cloture: time, Date_annulation: time,
      Bilan: "Text", Motif_complement: "Text", Motif_annulation: "Text", Modifie_le: time,
    },
    ACTIONS_ATTRIBUTIONS: { Action: "Ref:ACTIONS", Niveau: "Int", Attributaire: ref, Destinataire: ref,
      Service_contexte: "Ref:SERVICES", Date_attribution: time, Echeance: "Date", Revision_ecriture:"Int" },
    ACTIONS_EVENEMENTS: { Action: "Ref:ACTIONS", Cle_evenement: "Text", Revision: "Int", Auteur: ref,
      Date_evenement: time, Operation: "Text", Etape_avant: "Text", Etape_apres: "Text", Precision: "Text",
      Revision_rattachement_projet: "Int", Membres_projet_avant: refs },
    ACTIONS_NOTIFICATIONS: { Action: "Ref:ACTIONS", Evenement: "Ref:ACTIONS_EVENEMENTS", Cle_notification: "Text",
      Destinataire: ref, Type_notification: "Text", Lue: "Bool", Date_lecture: time },
  };
  const choiceLists = {
    Etape: ["À attribuer", "En cours", "Complément demandé", "Réalisée à examiner", "Clôturée", "Annulée"],
    Type_destinataire: ["Agent", "Service", "Pôle"],
  };
  const positive = n => Number.isSafeInteger(n) && n > 0;
  function schema() {
    return Object.entries(definitions).map(([tableId, columns]) => ({ tableId, columns: Object.entries(columns).map(([id, type]) => ({
      id, type, isFormula: false, formula: "", ...(choiceLists[id] ? { widgetOptions: JSON.stringify({ choices: choiceLists[id] }) } : {}),
    })) }));
  }
  function validateRows(rows, name) {
    if (!Array.isArray(rows) || rows.some(r => !r || !positive(r.id)) || new Set(rows.map(r => r.id)).size !== rows.length) throw Error(`Métadonnées invalides : ${name}.`);
  }
  function inspect(snapshot) {
    if (snapshot?.documentId !== documentId) throw Error("Préparation réservée au document de base autorisé.");
    for (const name of ["tables", "columns", "resources", "rules"]) validateRows(snapshot[name], name);
    if (new Set(snapshot.tables.map(t => t.tableId)).size !== snapshot.tables.length) throw Error("Tables dupliquées.");
    for (const name of ["ACTIONS", "INTERLOCUTEURS", "PROJETS", "SERVICES", "POLES"]) if (!snapshot.tables.some(t => t.tableId === name)) throw Error(`Table source absente : ${name}.`);
    const findings = [], missing = [];
    let notificationsAccess="owner";
    const check = (table, expected) => {
      const cols = snapshot.columns.filter(c => c.parentId === table.id);
      if (new Set(cols.map(c => c.colId)).size !== cols.length) throw Error(`Colonnes dupliquées : ${table.tableId}.`);
      for (const wanted of expected.columns) {
        const actual = cols.find(c => c.colId === wanted.id);
        if (!actual || actual.type !== wanted.type || actual.isFormula !== false || (actual.formula || "") !== "") findings.push(`${table.tableId}.${wanted.id} : colonne absente ou incompatible`);
        if (actual && wanted.widgetOptions) {
          let options;
          try { options = JSON.parse(actual.widgetOptions || "{}"); } catch { options = {}; }
          if (JSON.parse(wanted.widgetOptions).choices.some(value => !options.choices?.includes(value))) findings.push(`${table.tableId}.${wanted.id} : choix incomplets`);
        }
      }
      // Unknown extra columns may be intentional; do not erase or certify them.
      for (const col of cols) if (!expected.columns.some(c => c.id === col.colId) && col.colId !== "manualSort" && !col.colId.startsWith("gristHelper_")) findings.push(`${table.tableId}.${col.colId} : colonne supplémentaire à examiner`);
    };
    for (const expected of schema()) {
      const table = snapshot.tables.find(t => t.tableId === expected.tableId);
      const resources = snapshot.resources.filter(r => r.tableId === expected.tableId);
      if (!table) {
        if (resources.length) findings.push(`${expected.tableId} : permissions préexistantes sans table`);
        else missing.push(expected);
        continue;
      }
      check(table, expected);
      if (resources.length !== 1 || resources[0].colIds !== "*") { findings.push(`${expected.tableId} : permissions de préparation à examiner`); continue; }
      const rules = snapshot.rules.filter(r => r.resource === resources[0].id).sort((a, b) => a.rulePos - b.rulePos);
      const owner = r => ["user.Access == OWNER", "user.Access in [OWNER]"].includes(r.aclFormula);
      if(expected.tableId==="ACTIONS_NOTIFICATIONS"&&notificationPolicy
        &&(notificationPolicy.matches(rules,{readOnly:true})||notificationPolicy.matches(rules))){
        notificationsAccess=notificationPolicy.matches(rules,{readOnly:true})?"recipient-read":"recipient-read-state";
        findings.push(...notificationPolicy.checkColumns(snapshot.columns.filter(c=>c.parentId===table.id),expected.columns));
        // The identity mapping must remain owner-managed. Unknown rules need review.
        const accountResources=snapshot.resources.filter(r=>r.tableId==="PILOTAGE_COMPTES");
        const accountRules=accountResources.length===1?snapshot.rules.filter(r=>r.resource===accountResources[0].id).sort((a,b)=>a.rulePos-b.rulePos):[];
        const compact=s=>String(s||"").replace(/\s/g,"");
        const accountRead="user.IsLoggedIn and user.Access == EDITOR and user.PilotageCompte.id > 0 and user.PilotageCompte.Actif and rec.id == user.PilotageCompte.id";
        const accounts=snapshot.tables.find(t=>t.tableId==="PILOTAGE_COMPTES");
        for(const [colId,type]of Object.entries({Email:"Text",Interlocuteur:"Ref:INTERLOCUTEURS",Actif:"Bool"})){
          const cols=snapshot.columns.filter(c=>accounts&&c.parentId===accounts.id&&c.colId===colId);
          if(cols.length!==1||cols[0].type!==type||cols[0].isFormula!==false||(cols[0].formula||"")!=="")findings.push(`Registre des comptes : ${colId} incompatible.`);
        }
        if(accountResources.length!==1||accountResources[0].colIds!=="*"||accountRules.length!==3
          ||!owner(accountRules[0])||accountRules[0].permissionsText!=="+CRUD"
          ||compact(accountRules[1].aclFormula)!==compact(accountRead)||accountRules[1].permissionsText!=="+R"
          ||accountRules[2].aclFormula!==""||accountRules[2].permissionsText!=="-CRUD"
          ||accountRules.some((r,i)=>!Number.isFinite(r.rulePos)||(i&&r.rulePos<=accountRules[i-1].rulePos)))findings.push("Registre des comptes : protection propriétaire non confirmée.");
        const attributes=snapshot.rules.filter(r=>r.userAttributes).map(r=>{try{return JSON.parse(r.userAttributes);}catch{return null;}});
        const mapped=attributes.filter(a=>a?.name==="PilotageCompte");
        if(mapped.length!==1||mapped[0].tableId!=="PILOTAGE_COMPTES"||mapped[0].lookupColId!=="Email"||mapped[0].charId!=="Email")findings.push("Appariement PilotageCompte non confirmé.");
        continue;
      }
      if (rules.length !== 2 || !owner(rules[0]) || rules[0].permissionsText !== "+CRUD"
        || rules[1].aclFormula !== "" || rules[1].permissionsText !== "-CRUD"
        || !Number.isFinite(rules[0].rulePos) || !Number.isFinite(rules[1].rulePos) || rules[0].rulePos >= rules[1].rulePos) findings.push(`${expected.tableId} : droits différents du confinement propriétaire`);
    }
    // Non-owners must not be allowed to rewrite formulas and derive hidden data.
    const schemaDenied = snapshot.resources.some(resource => resource.tableId === "*" && resource.colIds === "*"
      && snapshot.rules.some(rule => rule.resource === resource.id && rule.aclFormula === "user.Access != OWNER" && rule.permissionsText === "-S"));
    if (!schemaDenied) findings.push("Confirmer l’interdiction de modifier la structure pour les non-propriétaires avant installation.");
    if (snapshot.rules.some(rule => /\+[^-]*S/.test(rule.permissionsText || "")
      && !["user.Access == OWNER", "user.Access in [OWNER]"].includes(rule.aclFormula))) {
      findings.push("Une autorisation de modification de structure doit être examinée avant installation.");
    }
    return { missing, findings, readyToPrepare: findings.length === 0, alreadyPrepared: findings.length === 0 && missing.length === 0,
      notificationsAccess, businessWorkflowEnabled: false, securityCertified: false };
  }
  function plan(snapshot) {
    const report = inspect(snapshot);
    if (!report.readyToPrepare) return { ...report, actions: [] };
    let resourceId = Math.max(0, ...snapshot.resources.map(r => r.id));
    let ruleId = Math.max(0, ...snapshot.rules.map(r => r.id));
    if (resourceId > Number.MAX_SAFE_INTEGER - 4 || ruleId > Number.MAX_SAFE_INTEGER - 8) throw Error("Identifiants de permissions invalides.");
    const actions = [];
    for (const table of report.missing) {
      actions.push(["AddTable", table.tableId, table.columns]);
      actions.push(["AddRecord", "_grist_ACLResources", ++resourceId, { tableId: table.tableId, colIds: "*" }]);
      actions.push(["AddRecord", "_grist_ACLRules", ++ruleId, { resource: resourceId, aclFormula: "user.Access == OWNER",
        aclFormulaParsed: JSON.stringify(["Eq", ["Attr", ["Name", "user"], "Access"], ["Name", "OWNER"]]), permissionsText: "+CRUD", rulePos: 1 }]);
      actions.push(["AddRecord", "_grist_ACLRules", ++ruleId, { resource: resourceId, aclFormula: "", aclFormulaParsed: "", permissionsText: "-CRUD", rulePos: 2 }]);
    }
    return { ...report, actions };
  }
  return Object.freeze({ documentId, schema, inspect, plan });
});
