"use strict";

// Candidate schema/policy and pure validation. No automatic migration, API call,
// browser storage or publication. Actual enforcement belongs to Grist ACLs.
(function expose(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PilotagePrivateTasks = api;
})(typeof globalThis === "object" ? globalThis : this, function createPrivateTasks() {
  const ACCOUNTS = "PILOTAGE_COMPTES";
  const TASKS = "TACHES_PERSONNELLES";
  const ATTRIBUTE = "PilotageCompte";
  const user = `user.${ATTRIBUTE}`;
  const eligible = `user.IsLoggedIn and user.Access == EDITOR and ${user}.id > 0 and ${user}.Actif`;
  const owns = `${eligible} and rec.Proprietaire == ${user}.id`;

  function schema() {
    return [
      { tableId: ACCOUNTS, columns: [
        { id: "Email", type: "Text", isFormula: false },
        { id: "Interlocuteur", type: "Ref:INTERLOCUTEURS", isFormula: false },
        { id: "Actif", type: "Bool", isFormula: false },
      ] },
      { tableId: TASKS, columns: [
        { id: "Proprietaire", type: `Ref:${ACCOUNTS}`, isFormula: false },
        { id: "Intitule", type: "Text", isFormula: false },
        { id: "Note", type: "Text", isFormula: false },
        { id: "Projet", type: "Ref:PROJETS", isFormula: false },
        { id: "Echeance", type: "Date", isFormula: false },
        { id: "Terminee", type: "Bool", isFormula: false },
        { id: "Ordre", type: "Numeric", isFormula: false },
      ] },
    ];
  }

  function policy() {
    return {
      status: "candidate-requires-grist-validation",
      // Grist user attribute: server account, not contact email or test identity.
      userAttribute: { name: ATTRIBUTE, tableId: ACCOUNTS, lookupColId: "Email", charId: "Email" },
      tableRules: [
        { tableId: ACCOUNTS, colIds: "*", rules: [
          { aclFormula: "user.Access == OWNER", permissionsText: "+CRUD" },
          // Approved for recette: a provisioned active editor may only read
          // their own account. All registry mutations remain owner-only.
          { aclFormula: `${eligible} and rec.id == ${user}.id`, permissionsText: "+R" },
          { aclFormula: "", permissionsText: "-CRUD" },
        ] },
        { tableId: TASKS, colIds: "*", rules: [
          { aclFormula: "user.Access == OWNER", permissionsText: "+CRUD" },
          { aclFormula: owns, permissionsText: "+RD" },
          { aclFormula: `${owns} and newRec.Proprietaire == rec.Proprietaire`, permissionsText: "+U" },
          { aclFormula: `${eligible} and newRec.Proprietaire == ${user}.id`, permissionsText: "+C" },
          { aclFormula: "", permissionsText: "-CRUD" },
        ] },
      ],
      // These requirements apply document-wide. They must be merged with the
      // existing ACLs by an owner on a copy, NOT appended blindly by this module.
      documentRequirements: {
        schemaEdit: [
          { aclFormula: "user.Access == OWNER", permissionsText: "+S" },
          { aclFormula: "", permissionsText: "-S" },
        ],
        copyAndDownloadRestrictedToOwners: true,
        templateFullCopyBypassDisabled: true,
        existingConflictingColumnRulesMustBeReviewed: true,
      },
    };
  }

  function positiveId(value) { return Number.isSafeInteger(value) && value > 0; }
  function validDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }

  function taskValues(input, context) {
    // This is an application-level guard, never a substitute for the policy.
    if (!context || context.simulated !== false || context.internal !== true || context.active !== true || !positiveId(context.accountId)) {
      throw new Error("Un compte interne actif, non simulé, est nécessaire.");
    }
    if (!input || typeof input.title !== "string" || !input.title.trim()) throw new Error("L’intitulé est obligatoire.");
    if (input.note !== undefined && typeof input.note !== "string") throw new Error("La note doit être un texte.");
    const projectId = input.projectId ?? 0;
    if (projectId !== 0 && (!positiveId(projectId) || !Array.isArray(context.allowedProjectIds) || !context.allowedProjectIds.includes(projectId))) {
      throw new Error("Le projet choisi n’est pas accessible.");
    }
    const deadline = input.deadline ?? null;
    if (deadline !== null && !validDate(deadline)) throw new Error("Échéance invalide.");
    const done = input.done ?? false;
    if (typeof done !== "boolean") throw new Error("État de la tâche invalide.");
    const order = input.order ?? 0;
    if (typeof order !== "number" || !Number.isFinite(order)) throw new Error("Ordre invalide.");
    return {
      Proprietaire: context.accountId,
      Intitule: input.title.trim(), Note: input.note ?? "", Projet: projectId,
      Echeance: deadline === null ? null : Date.parse(`${deadline}T00:00:00.000Z`) / 1000,
      Terminee: done, Ordre: order,
    };
  }

  function accountErrors(accounts) {
    if (!Array.isArray(accounts)) return ["Liste de comptes absente."];
    const errors = [], emails = new Set(), people = new Set(), ids = new Set();
    for (const account of accounts) {
      if (!account || !positiveId(account.id) || ids.has(account.id)) {
        errors.push("Identifiant de compte invalide ou dupliqué.");
        continue;
      }
      ids.add(account.id);
      const email = typeof account.Email === "string" ? account.Email.trim().toLowerCase() : "";
      if (!email || !/^[^\s@]+@[^\s@]+$/.test(email) || email === "anon@getgrist.com") errors.push("Adresse de compte invalide.");
      if (emails.has(email)) errors.push("Adresse de compte dupliquée.");
      emails.add(email);
      if (!positiveId(account.Interlocuteur) || people.has(account.Interlocuteur)) errors.push("Rattachement de compte invalide ou dupliqué.");
      people.add(account.Interlocuteur);
      if (typeof account.Actif !== "boolean") errors.push("État du compte invalide.");
    }
    return errors;
  }

  return Object.freeze({ schema, policy, taskValues, accountErrors });
});
