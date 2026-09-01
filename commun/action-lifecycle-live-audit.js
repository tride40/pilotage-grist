"use strict";

// Read-only lifecycle rehearsal over a creation plan derived from real rows.
// No Grist command leaves this module.
(function expose(root, factory) {
  const common = typeof module === "object" && module.exports;
  const api = factory(
    common ? require("./action-final-live-audit.js") : root.PilotageActionFinalLiveAudit,
    common ? require("./action-grist-assignment.js") : root.PilotageActionGristAssignment,
    common ? require("./action-directory.js") : root.PilotageActionDirectory,
    common ? require("./action-lifecycle.js") : root.PilotageActionLifecycle,
    common ? require("./action-creation-live-audit.js") : root.PilotageActionCreationLiveAudit
  );
  if (common) module.exports = api;
  else root.PilotageActionLifecycleLiveAudit = api;
})(typeof globalThis === "object" ? globalThis : this, function factory(finalAudit, assignment, directory, lifecycle, creationAudit) {
  const documentId = "f8iwcexDATAwBKsaG6gZRs";
  const names = Object.freeze(["ACTIONS", "ACTIONS_CIRCUIT", "ACTIONS_ATTRIBUTIONS", "ACTIONS_EVENEMENTS", "ACTIONS_NOTIFICATIONS", "PROJETS", "INTERLOCUTEURS", "SERVICES", "POLES"]);
  const actor = personId => Object.freeze({ personId, active: true, internal: true, simulated: false, delegated: false });
  const nextRow = (row, patch) => Object.freeze({ ...row, ...patch });

  function organization(data) {
    const raw = Object.fromEntries(["INTERLOCUTEURS", "SERVICES", "POLES"].map(name => {
      const rows = data[name], keys = [...new Set(["id", ...rows.flatMap(Object.keys)])];
      return [name, Object.fromEntries(keys.map(key => [key, rows.map(row => row[key])]))];
    }));
    return directory.normalize(raw);
  }

  function firstDirectPlan(data, identity) {
    const creator = creationAudit.context(identity, data.INTERLOCUTEURS), org = organization(data);
    const projects = data.PROJETS.map(project => directory.project(project, org));
    const directTargets = creationAudit.targetCandidates(org).filter(target => target.kind === "person" && target.id !== creator.personId);
    for (const project of projects) for (const target of directTargets) {
      try {
        const bundle = assignment.creation(data, creator, project.id, { title: "Répétition du cycle non enregistrée", target, deadline: null }, "2026-09-01T12:00:00.000Z");
        assignment.validateSourceWrites(data, bundle);
        return { bundle, creator, executor: actor(bundle.plan.row.executorId) };
      } catch { /* Continue until a business-authorized direct route is found. */ }
    }
    throw Error("Aucun parcours direct autorisé ne permet de répéter le cycle complet.");
  }

  function transition(row, context, type, at, note) {
    const plan = lifecycle.plan(row, context, { type, expectedRevision: row.revision, at, ...(note === undefined ? {} : { note }) });
    return { row: nextRow(row, plan.patch), plan };
  }

  function review({ validation, identity, data }) {
    const findings = [], confirmed = [];
    if (validation?.readyForFinalValidation !== true) findings.push("La validation finale des permissions n’est plus conforme.");
    for (const name of ["ACTIONS_CIRCUIT", "ACTIONS_ATTRIBUTIONS", "ACTIONS_EVENEMENTS", "ACTIONS_NOTIFICATIONS"])
      if (data[name].length !== 0) findings.push(`${name} doit rester vide pendant cette répétition.`);
    let counts = { transitions: 0, notifications: 0, finalRevision: 0 }, operations = [];
    if (!findings.length) try {
      const { bundle, creator, executor } = firstDirectPlan(data, identity), initial = bundle.plan.row;
      if (!lifecycle.operations(initial, executor).includes("perform") || !lifecycle.operations(initial, creator).includes("cancel")) throw Error("Commandes initiales incohérentes.");
      const performed = transition(initial, executor, "perform", "2026-09-01T12:01:00.000Z", "");
      const complement = transition(performed.row, creator, "request_additional_work", "2026-09-01T12:02:00.000Z", "Précision requise");
      const performedAgain = transition(complement.row, executor, "perform", "2026-09-01T12:03:00.000Z", "");
      const closed = transition(performedAgain.row, creator, "close", "2026-09-01T12:04:00.000Z");
      const cancelled = transition(initial, creator, "cancel", "2026-09-01T12:01:00.000Z", "Annulation de répétition");
      const plans = [performed.plan, complement.plan, performedAgain.plan, closed.plan, cancelled.plan];
      operations = plans.map(plan => plan.event.operation);
      counts = { transitions: plans.length, notifications: plans.reduce((sum, plan) => sum + plan.notifications.length, 0), finalRevision: closed.row.revision };
      if (closed.row.state !== "closed" || cancelled.row.state !== "cancelled" || closed.row.revision !== 5) throw Error("États finaux ou révisions incohérents.");
      confirmed.push("Réalisation par l’exécutant confirmée", "Complément demandé par le créateur puis nouvelle réalisation confirmés", "Clôture et annulation motivée confirmées");
    } catch (error) { findings.push(error.message); }
    return Object.freeze({ findings, confirmed, counts, operations, readyForLifecycle: findings.length === 0,
      actions: [], writesBusinessRows: false, previewOnly: true, actorsAreDryRun: true });
  }

  function create({ grist, mode, identify }) {
    if (!finalAudit?.create || !assignment?.creation || !directory?.records || !lifecycle?.plan || !creationAudit?.context) throw Error("Le moteur complet du cycle de vie manque dans la publication.");
    if (typeof identify !== "function") throw Error("Le service d’identification réelle manque dans la publication.");
    let busy = false;
    return Object.freeze({ async inspect() {
      if (busy) throw Error("Répétition du cycle déjà en cours."); busy = true;
      try {
        mode?.assertWritable?.();
        if (await grist.docApi.getDocName() !== documentId) throw Error("Document de base non autorisé.");
        const validation = await finalAudit.create({ grist }).inspect();
        const raw = await Promise.all(names.map(name => grist.docApi.fetchTable(name)));
        const data = Object.fromEntries(names.map((name, index) => [name, directory.records(raw[index])]));
        const identity = await identify({ people: data.INTERLOCUTEURS });
        if (await grist.docApi.getDocName() !== documentId) throw Error("Le document a changé pendant la répétition.");
        return review({ validation, identity, data });
      } finally { busy = false; }
    } });
  }
  return Object.freeze({ documentId, names, organization, firstDirectPlan, transition, review, create });
});
