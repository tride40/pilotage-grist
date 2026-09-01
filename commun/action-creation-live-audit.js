"use strict";

// Read-only dry run of real creation and initial-attribution plans.
// Generated Grist actions stay in memory and are never returned or submitted.
(function expose(root, factory) {
  const common = typeof module === "object" && module.exports;
  const api = factory(
    common ? require("./action-final-live-audit.js") : root.PilotageActionFinalLiveAudit,
    common ? require("./action-grist-assignment.js") : root.PilotageActionGristAssignment,
    common ? require("./action-directory.js") : root.PilotageActionDirectory
  );
  if (common) module.exports = api;
  else root.PilotageActionCreationLiveAudit = api;
})(typeof globalThis === "object" ? globalThis : this, function factory(finalAudit, assignment, directory) {
  const documentId = "f8iwcexDATAwBKsaG6gZRs";
  const names = Object.freeze(["ACTIONS", "ACTIONS_CIRCUIT", "ACTIONS_ATTRIBUTIONS", "ACTIONS_EVENEMENTS", "ACTIONS_NOTIFICATIONS", "PROJETS", "INTERLOCUTEURS", "SERVICES", "POLES"]);
  const positive = value => Number.isSafeInteger(Number(value)) && Number(value) > 0;
  const active = value => value === true || value === 1;

  function context(identity, people) {
    const personId = Number(identity?.personId ?? identity?.person?.id);
    const person = people.find(row => Number(row.id) === personId);
    if (!positive(personId) || !person) throw Error("Votre interlocuteur réel n’est pas accessible.");
    return Object.freeze({ personId, active: active(person.Actif), internal: active(person.Interne_Mairie), simulated: false, delegated: false });
  }

  function targetCandidates(org) {
    const targets = [];
    for (const person of org.people.filter(person => person.active && person.internal && person.kind === "agent")) {
      if (person.serviceIds.length > 1) person.serviceIds.forEach(serviceId => targets.push({ kind: "person", id: person.id, serviceId }));
      else targets.push({ kind: "person", id: person.id, ...(person.serviceIds[0] ? { serviceId: person.serviceIds[0] } : {}) });
    }
    org.services.forEach(service => targets.push({ kind: "service", id: service.id }));
    org.poles.forEach(pole => targets.push({ kind: "pole", id: pole.id }));
    return targets;
  }

  function review({ validation, identity, data }) {
    const findings = [], confirmed = [];
    if (validation?.readyForFinalValidation !== true) findings.push("La validation finale des permissions n’est plus conforme.");
    else confirmed.push("Permissions et schéma final confirmés");
    const actor = context(identity, data.INTERLOCUTEURS);
    if (!actor.active || !actor.internal || identity?.accountActive !== true) findings.push("Votre identité réelle active et interne n’est pas confirmée.");
    else confirmed.push("Auteur réel actif et interne confirmé");
    if (identity?.administrator !== true) findings.push("Le compte de mise en service n’est plus administrateur.");

    for (const name of ["ACTIONS_CIRCUIT", "ACTIONS_ATTRIBUTIONS", "ACTIONS_EVENEMENTS", "ACTIONS_NOTIFICATIONS"])
      if (data[name].length !== 0) findings.push(`${name} doit rester vide avant le premier essai réel.`);

    let org = null, projects = [], routeCounts = { person: 0, service: 0, pole: 0 }, planCount = 0, plannedWriteCount = 0;
    if (!findings.length) {
      try {
        const raw = Object.fromEntries(["INTERLOCUTEURS", "SERVICES", "POLES"].map(name => {
          const rows = data[name], keys = [...new Set(["id", ...rows.flatMap(Object.keys)])];
          return [name, Object.fromEntries(keys.map(key => [key, rows.map(row => row[key])]))];
        }));
        org = directory.normalize(raw);
        projects = data.PROJETS.map(project => directory.project(project, org));
        const candidates = targetCandidates(org), at = "2026-09-01T12:00:00.000Z";
        for (const project of projects) for (const target of candidates) {
          try {
            const bundle = assignment.creation(data, actor, project.id, { title: "Prévisualisation non enregistrée", target, deadline: null }, at);
            assignment.validateSourceWrites(data, bundle);
            planCount += 1; routeCounts[target.kind] += 1; plannedWriteCount = Math.max(plannedWriteCount, bundle.actions.length);
          } catch { /* An out-of-scope route is expected and remains unavailable. */ }
        }
      } catch (error) { findings.push(error.message); }
    }
    if (!projects.length) findings.push("Aucun projet entièrement piloté n’est disponible pour une création.");
    if (!planCount) findings.push("Votre rôle métier ne permet actuellement aucune création dans les projets contrôlés.");
    else confirmed.push(`${planCount} scénario(s) réel(s) de création et d’attribution initiale prévisualisés sans enregistrement`);
    return Object.freeze({ findings, confirmed, counts: { projects: projects.length, plans: planCount, direct: routeCounts.person, services: routeCounts.service, poles: routeCounts.pole }, plannedWriteCount,
      readyForCreation: findings.length === 0, actions: [], writesBusinessRows: false, previewOnly: true });
  }

  function create({ grist, mode, identify }) {
    if (!finalAudit?.create || !assignment?.creation || !assignment?.validateSourceWrites || !directory?.records) throw Error("Le moteur de prévisualisation complet manque dans la publication.");
    if (typeof identify !== "function") throw Error("Le service d’identification réelle manque dans la publication.");
    let busy = false;
    return Object.freeze({ async inspect() {
      if (busy) throw Error("Prévisualisation déjà en cours."); busy = true;
      try {
        mode?.assertWritable?.();
        if (await grist.docApi.getDocName() !== documentId) throw Error("Document de base non autorisé.");
        const validation = await finalAudit.create({ grist }).inspect();
        const raw = await Promise.all(names.map(name => grist.docApi.fetchTable(name)));
        const data = Object.fromEntries(names.map((name, index) => [name, directory.records(raw[index])]));
        const identity = await identify({ people: data.INTERLOCUTEURS });
        if (await grist.docApi.getDocName() !== documentId) throw Error("Le document a changé pendant la prévisualisation.");
        return review({ validation, identity, data });
      } finally { busy = false; }
    } });
  }
  return Object.freeze({ documentId, names, context, targetCandidates, review, create });
});
