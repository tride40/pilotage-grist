"use strict";

// First real-data checkpoint: final permissions, current identity and counters only.
// The identity helper owns the temporary CONTEXTE_UTILISATEUR row and removes it.
(function expose(root, factory) {
  const common = typeof module === "object" && module.exports;
  const api = factory(common ? require("./action-final-live-audit.js") : root.PilotageActionFinalLiveAudit);
  if (common) module.exports = api;
  else root.PilotageActionRealDataPreflight = api;
})(typeof globalThis === "object" ? globalThis : this, function factory(finalAudit) {
  const documentId = "f8iwcexDATAwBKsaG6gZRs";
  const tableNames = Object.freeze([
    "INTERLOCUTEURS", "PROJETS", "ACTIONS", "ACTIONS_CIRCUIT",
    "ACTIONS_ATTRIBUTIONS", "ACTIONS_EVENEMENTS", "ACTIONS_NOTIFICATIONS",
  ]);

  function records(raw, label) {
    if (!raw || !Array.isArray(raw.id)) throw Error(`Lecture impossible : ${label}.`);
    const columns = Object.entries(raw).filter(([, values]) => Array.isArray(values));
    if (columns.some(([, values]) => values.length !== raw.id.length)) throw Error(`Lecture tronquée : ${label}.`);
    const rows = raw.id.map((_, index) => Object.fromEntries(columns.map(([name, values]) => [name, values[index]])));
    const ids = rows.map(row => Number(row.id));
    if (ids.some(id => !Number.isSafeInteger(id) || id <= 0) || new Set(ids).size !== ids.length) throw Error(`Identifiants invalides : ${label}.`);
    return rows;
  }

  function review({ validation, identity, tables }) {
    const findings = [], confirmed = [];
    if (validation?.readyForFinalValidation !== true) findings.push("La validation finale des 81 règles n’est plus conforme.");
    else confirmed.push("Permissions finales : 81 règles conformes");

    const personId = Number(identity?.personId ?? identity?.person?.id);
    const accountId = Number(identity?.accountId);
    if (!Number.isSafeInteger(personId) || personId <= 0) findings.push("Votre compte Grist n’est associé à aucun interlocuteur accessible.");
    if (!Number.isSafeInteger(accountId) || accountId <= 0 || identity?.accountActive !== true) findings.push("Votre registre de compte actif n’est pas confirmé.");
    if (identity?.administrator !== true) findings.push("Votre compte n’est pas désigné comme administrateur pour cette mise en service.");
    if (!findings.some(text => /compte|interlocuteur|administrateur/i.test(text))) confirmed.push("Identité réelle : interlocuteur, compte actif et administrateur confirmés");

    const counts = Object.fromEntries(tableNames.map(name => [name, tables?.[name]?.length ?? -1]));
    if (counts.INTERLOCUTEURS < 1) findings.push("Aucun interlocuteur autorisé n’est lisible.");
    if (counts.PROJETS < 1) findings.push("Aucun projet autorisé n’est lisible.");
    if (counts.ACTIONS !== 17) findings.push(`Le compteur des actions historiques vaut ${counts.ACTIONS} au lieu de 17.`);
    for (const name of ["ACTIONS_CIRCUIT", "ACTIONS_ATTRIBUTIONS", "ACTIONS_EVENEMENTS", "ACTIONS_NOTIFICATIONS"])
      if (counts[name] !== 0) findings.push(`${name} contient déjà ${counts[name]} ligne(s) ; la première création réelle doit attendre.`);
    if (!findings.some(text => /lisible|compteur|contient déjà/i.test(text))) confirmed.push("Lectures réelles : projets et interlocuteurs accessibles, 17 actions historiques, nouveau circuit vide");

    return Object.freeze({
      findings, confirmed, counts,
      readyForRealData: findings.length === 0,
      actions: [], writesBusinessRows: false, usesTemporaryIdentityRow: true,
    });
  }

  function create({ grist, mode, identify }) {
    if (!finalAudit?.create) throw Error("Le validateur final manque dans la publication.");
    if (typeof identify !== "function") throw Error("Le service d’identification réelle manque dans la publication.");
    let busy = false;
    return Object.freeze({
      async inspect() {
        if (busy) throw Error("Contrôle des données réelles déjà en cours.");
        busy = true;
        try {
          mode?.assertWritable?.();
          if (await grist.docApi.getDocName() !== documentId) throw Error("Document de base non autorisé.");
          const validation = await finalAudit.create({ grist }).inspect();
          if (!validation.readyForFinalValidation) return review({ validation, identity: null, tables: {} });
          const peopleRaw = await grist.docApi.fetchTable("INTERLOCUTEURS");
          const people = records(peopleRaw, "INTERLOCUTEURS");
          const identity = await identify({ people });
          const remaining = tableNames.filter(name => name !== "INTERLOCUTEURS");
          const values = await Promise.all(remaining.map(name => grist.docApi.fetchTable(name)));
          const tables = { INTERLOCUTEURS: people };
          remaining.forEach((name, index) => { tables[name] = records(values[index], name); });
          if (await grist.docApi.getDocName() !== documentId) throw Error("Le document a changé pendant le contrôle.");
          return review({ validation, identity, tables });
        } finally { busy = false; }
      },
    });
  }

  return Object.freeze({ documentId, tableNames, records, review, create });
});
