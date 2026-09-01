"use strict";

(function exposeCurrentUser(global) {
  const CONTEXT_TABLE = "CONTEXTE_UTILISATEUR";
  const PEOPLE_TABLE = "INTERLOCUTEURS";
  const ACCOUNTS_TABLE = "PILOTAGE_COMPTES";

  async function accountProfile(email, personId) {
    try {
      const accounts = columnarToRecords(await global.grist.docApi.fetchTable(ACCOUNTS_TABLE));
      const matches = accounts.filter((item) => normalize(item.Email) === normalize(email));
      if (matches.length !== 1) return { accountId: null, accountActive: false, administrator: false, administratorProfileAvailable: false };
      const account = matches[0], linked = referenceId(account.Interlocuteur), available = Object.hasOwn(account, "Administrateur");
      const active = account.Actif === true && Number(linked) === Number(personId);
      return { accountId: account.id ?? null, accountActive: active, administrator: Boolean(active && available && account.Administrateur === true), administratorProfileAvailable: available };
    } catch (error) {
      console.warn("Profil PILOTAGE_COMPTES indisponible", error);
      return { accountId: null, accountActive: false, administrator: false, administratorProfileAvailable: false };
    }
  }

  async function identify({ people = null } = {}) {
    if (!global.grist?.docApi) throw new Error("L’API Grist n’est pas disponible.");
    if (global.PilotageTestMode?.current()) return global.PilotageTestMode.identity(people);
    global.PilotageTestMode?.assertWritable();
    const sessionKey = global.crypto?.randomUUID?.() || `pilotage-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    let contextId = null;
    try {
      const result = await global.grist.docApi.applyUserActions([
        ["AddRecord", CONTEXT_TABLE, null, { Cle_session: sessionKey }],
      ]);
      contextId = result?.retValues?.[0] ?? result?.[0]?.rowId ?? null;
      const context = columnarToRecords(await global.grist.docApi.fetchTable(CONTEXT_TABLE));
      const row = context.find((item) => String(item.Cle_session) === sessionKey)
        || context.find((item) => contextId && String(item.id) === String(contextId));
      if (!row) throw new Error("La ligne d’identification créée n’a pas été retrouvée.");
      contextId = row.id;
      const email = text(row.Email_Grist);
      if (!email) throw new Error("Grist n’a pas renseigné Email_Grist. Vérifiez sa formule d’initialisation.");
      const personId = referenceId(row.Interlocuteur);
      const personRows = people || columnarToRecords(await global.grist.docApi.fetchTable(PEOPLE_TABLE));
      const person = personRows.find((item) => String(item.id) === String(personId))
        || personRows.find((item) => normalize(item.Email) === normalize(email))
        || null;
      const resolvedPersonId = person?.id ?? personId ?? null;
      const profile = await accountProfile(email, resolvedPersonId);
      global.PilotageTestMode?.assertWritable();
      return { email, personId: resolvedPersonId, person, ...profile };
    } finally {
      if (contextId) {
        try {
          await global.grist.docApi.applyUserActions([["RemoveRecord", CONTEXT_TABLE, Number(contextId)]]);
        } catch (error) {
          console.warn("Nettoyage de CONTEXTE_UTILISATEUR impossible", error);
        }
      }
    }
  }

  function columnarToRecords(columns) {
    const names = Object.keys(columns || {}).filter((name) => Array.isArray(columns[name]));
    const length = Math.max(0, ...names.map((name) => columns[name].length));
    return Array.from({ length }, (_, index) => Object.fromEntries(names.map((name) => [name, columns[name][index]])));
  }

  function referenceId(value) {
    if (Array.isArray(value)) return value.find((item) => item !== "R" && item !== "L") ?? null;
    return value || null;
  }

  function text(value) { return value === null || value === undefined ? "" : String(value).trim(); }
  function normalize(value) { return text(value).toLocaleLowerCase("fr-FR"); }
  function requirePersonId(identity) {
    global.PilotageTestMode?.assertWritable();
    if (identity?.simulated) throw new Error("Mode test : impossible d’enregistrer sous une identité simulée.");
    const id = Number(identity?.personId ?? identity?.person?.id);
    if (!Number.isFinite(id) || id <= 0) throw new Error("Votre compte Grist n’est associé à aucun interlocuteur.");
    return id;
  }

  function requireAdministrator(identity) {
    global.PilotageTestMode?.assertWritable();
    if (identity?.simulated) throw new Error("Mode test : profil administrateur simulé interdit pour un enregistrement réel.");
    if (identity?.administrator !== true) throw new Error("Cette opération est réservée à un administrateur désigné.");
    return true;
  }

  function actionContext(identity) {
    if (identity?.simulated) throw new Error("Mode test : le circuit réel reste en consultation seule.");
    const personId = Number(identity?.personId ?? identity?.person?.id), person = identity?.person;
    if (!Number.isSafeInteger(personId) || personId <= 0 || !person) throw new Error("Votre compte Grist n’est associé à aucun interlocuteur accessible.");
    const active = person.Actif === true || person.Actif === 1, internal = person.Interne_Mairie === true || person.Interne_Mairie === 1;
    if (!active || !internal || identity?.accountActive !== true) throw new Error("Un compte réel actif rattaché à un interlocuteur interne est nécessaire.");
    return Object.freeze({ personId, active: true, internal: true, simulated: false, delegated: false });
  }

  global.PilotageCurrentUser = Object.freeze({ identify, requirePersonId, requireAdministrator, actionContext });
})(window);
