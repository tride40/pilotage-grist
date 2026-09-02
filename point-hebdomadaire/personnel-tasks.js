"use strict";

// Document de base only; isolated release snapshot of the tested recette controller. Grist ACLs remain the authority; client checks also protect
// trusted administrators from accidentally editing another person's tasks.
(function expose(root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("../commun/private-tasks.js"));
  else root.PersonnelTasks = factory(root.PilotagePrivateTasks);
})(typeof globalThis === "object" ? globalThis : this, function createModule(validation) {
  const TABLE = "TACHES_PERSONNELLES";
  // Internal document ID supplied from Grist settings, not the short URL ID.
  const DOCUMENT = "f8iwcexDATAwBKsaG6gZRs";
  function rows(raw) {
    return (raw.id || []).map((id, i) => Object.fromEntries(Object.entries(raw).filter(([, value]) => Array.isArray(value)).map(([key, value]) => [key, value[i]])));
  }
  function create({ grist, mode, identify }) {
    let account = null, projects = [], tasks = [], email = "", busy = false;
    function guard() {
      if (!mode || mode.isReadOnly()) throw Error("L’écriture dans Grist n’est pas disponible.");
      mode.assertWritable();
    }
    async function context() {
      guard();
      if (await grist.docApi.getDocName() !== DOCUMENT) throw Error("Cette page est réservée au document de base autorisé.");
      let accounts;
      try { accounts = rows(await grist.docApi.fetchTable("PILOTAGE_COMPTES")); }
      catch { throw Error("Identification indisponible : la lecture de votre propre compte doit être autorisée dans le document."); }
      const matches = accounts.filter(row => row.Email === email);
      if (matches.length !== 1 || matches[0].Actif !== true) throw Error("Votre compte n’est pas habilité ou n’est plus actif.");
      account = matches[0];
      const people = rows(await grist.docApi.fetchTable("INTERLOCUTEURS"));
      const person = people.find(row => row.id === account.Interlocuteur);
      if (!person || person.Actif !== true || (person.Interne_Mairie ?? person.Interne_Sanguinet) !== true) throw Error("Votre compte doit être rattaché à un interlocuteur interne actif.");
      projects = rows(await grist.docApi.fetchTable("PROJETS"));
      guard();
      return { accountId: account.id, internal: true, active: true, simulated: false, allowedProjectIds: projects.map(row => row.id) };
    }
    async function refresh() {
      tasks = [];
      await context();
      const raw = await grist.docApi.fetchTable(TABLE);
      for (const field of validation.schema()[1].columns.map(column => column.id)) {
        if (!Array.isArray(raw[field])) throw Error("La table des tâches est incomplète ou inaccessible.");
      }
      guard();
      tasks = rows(raw).filter(row => row.Proprietaire === account.id).sort((a, b) => (a.Ordre || 0) - (b.Ordre || 0) || a.id - b.id);
      return { tasks: tasks.map(row => ({ ...row })), projects: projects.map(row => ({ ...row })) };
    }
    async function initialize() {
      guard();
      if (await grist.docApi.getDocName() !== DOCUMENT) throw Error("Cette page est réservée au document de base autorisé.");
      const identity = await identify();
      guard();
      if (identity.simulated || !identity.email) throw Error("Une identité réelle est nécessaire.");
      email = identity.email;
      return refresh();
    }
    async function mutate(operation) {
      if (busy) throw Error("Un enregistrement est déjà en cours.");
      busy = true;
      try {
        // Re-read authorisation and ownership immediately before every write.
        await refresh();
        const actions = operation();
        guard();
        await mode.applyUserActions(actions);
        try { return await refresh(); }
        catch { throw Error("L’opération a été enregistrée, mais la liste n’a pas pu être relue. Actualisez avant de recommencer."); }
      } finally { busy = false; }
    }
    function own(id) {
      const row = tasks.find(task => task.id === id);
      if (!row) throw Error("Cette tâche n’est plus accessible. Actualisez la liste.");
      return row;
    }
    return Object.freeze({ initialize, refresh,
      save: (id, input) => mutate(() => {
        const original = id === null ? null : own(id);
        const values = validation.taskValues({ ...input, done: original?.Terminee ?? false, order: original?.Ordre ?? Math.max(0, ...tasks.map(row => row.Ordre || 0)) + 1 }, {
          accountId: account.id, internal: true, active: true, simulated: false, allowedProjectIds: projects.map(row => row.id),
        });
        return [[id === null ? "AddRecord" : "UpdateRecord", TABLE, id, values]];
      }),
      complete: (id, done) => mutate(() => {
        own(id);
        if (typeof done !== "boolean") throw Error("État invalide.");
        return [["UpdateRecord", TABLE, id, { Terminee: done }]];
      }),
      remove: id => mutate(() => { own(id); return [["RemoveRecord", TABLE, id]]; }),
      move: (id, direction) => mutate(() => {
        const row = own(id), list = tasks.filter(task => task.Terminee === row.Terminee);
        if (![1, -1].includes(direction)) throw Error("Déplacement invalide.");
        const index = list.findIndex(task => task.id === id), destination = index + direction;
        if (destination < 0 || destination >= list.length) throw Error("Cette tâche est déjà en bout de liste.");
        [list[index], list[destination]] = [list[destination], list[index]];
        return list.map((task, position) => ["UpdateRecord", TABLE, task.id, { Ordre: position + 1 }]);
      }),
      clear: () => { tasks = []; projects = []; account = null; email = ""; },
    });
  }
  return Object.freeze({ create, documentId: DOCUMENT });
});
