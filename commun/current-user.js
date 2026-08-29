"use strict";

(function exposeCurrentUser(global) {
  const CONTEXT_TABLE = "CONTEXTE_UTILISATEUR";
  const PEOPLE_TABLE = "INTERLOCUTEURS";

  async function identify({ people = null } = {}) {
    if (!global.grist?.docApi) throw new Error("L’API Grist n’est pas disponible.");
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
      return { email, personId: person?.id ?? personId ?? null, person };
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
    const id = Number(identity?.personId ?? identity?.person?.id);
    if (!Number.isFinite(id) || id <= 0) throw new Error("Votre compte Grist n’est associé à aucun interlocuteur.");
    return id;
  }

  global.PilotageCurrentUser = Object.freeze({ identify, requirePersonId });
})(window);
