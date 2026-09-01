"use strict";

// Final read-only rehearsal: hierarchical deadlines, pointer notifications and
// the no-retry latch used after a submission with an uncertain result.
(function expose(root, factory) {
  const common = typeof module === "object" && module.exports;
  const api = factory(
    common ? require("./action-final-live-audit.js") : root.PilotageActionFinalLiveAudit,
    common ? require("./action-directory.js") : root.PilotageActionDirectory,
    common ? require("./action-assignment.js") : root.PilotageActionAssignment,
    common ? require("./action-grist-assignment.js") : root.PilotageActionGristAssignment,
    common ? require("./action-deadlines.js") : root.PilotageActionDeadlines,
    common ? require("./action-notification-integrity.js") : root.PilotageActionNotificationIntegrity,
    common ? require("./action-grist-lifecycle.js") : root.PilotageActionGristLifecycle,
    common ? require("./action-creation-live-audit.js") : root.PilotageActionCreationLiveAudit,
    common ? require("./action-lifecycle-live-audit.js") : root.PilotageActionLifecycleLiveAudit
  );
  if (common) module.exports = api;
  else root.PilotageActionSafetyLiveAudit = api;
})(typeof globalThis === "object" ? globalThis : this, function factory(finalAudit, directory, domain, assignment, deadlines, notificationIntegrity, gristLifecycle, creationAudit, lifecycleAudit) {
  const documentId = "f8iwcexDATAwBKsaG6gZRs";
  const names = Object.freeze(["ACTIONS", "ACTIONS_CIRCUIT", "ACTIONS_ATTRIBUTIONS", "ACTIONS_EVENEMENTS", "ACTIONS_NOTIFICATIONS", "PROJETS", "INTERLOCUTEURS", "SERVICES", "POLES"]);
  const actor = personId => Object.freeze({ personId, active: true, internal: true, simulated: false, delegated: false });

  function groupPlan(data, identity) {
    const creator = creationAudit.context(identity, data.INTERLOCUTEURS), org = lifecycleAudit.organization(data);
    const projects = data.PROJETS.map(source => ({ source, project: directory.project(source, org) }));
    const groups = creationAudit.targetCandidates(org).filter(target => ["service", "pole"].includes(target.kind));
    for (const { source, project } of projects) for (const target of groups) {
      try {
        const creation = assignment.creation(data, creator, project.id, { title: "Répétition de sécurité non enregistrée", target, deadline: "2026-09-20" }, "2026-09-01T12:00:00.000Z");
        assignment.validateSourceWrites(data, creation);
        const row = creation.plan.row, manager = actor(row.assignerId);
        const candidates = org.people.filter(person => person.active && person.internal && person.kind === "agent" && person.id !== row.assignerId && person.id !== row.creatorId);
        for (const person of candidates) for (const serviceId of (person.serviceIds.length ? person.serviceIds : [null])) {
          try {
            const assigned = domain.assign(row, { target: { kind: "person", id: person.id, ...(serviceId ? { serviceId } : {}) }, deadline: "2026-09-18", expectedRevision: row.revision, at: "2026-09-01T12:01:00.000Z" }, manager, org, project);
            return { creation, assigned, manager, project, source };
          } catch { /* Try the next authorized real agent. */ }
        }
      } catch { /* Try the next group route. */ }
    }
    throw Error("Aucun parcours service ou pôle ne permet de contrôler l’attribution hiérarchique.");
  }

  function validNotices(plans) {
    const notices = plans.flatMap(plan => plan.notifications);
    const keys = new Set();
    for (const notice of notices) {
      if (!notice || typeof notice.key !== "string" || keys.has(notice.key) || !Number.isSafeInteger(notice.recipientId)
        || notice.recipientId <= 0 || notice.read !== false || typeof notice.eventKey !== "string"
        || Object.hasOwn(notice, "note") || Object.hasOwn(notice, "content")) return false;
      keys.add(notice.key);
    }
    return notices.length;
  }

  function review({ validation, identity, data }) {
    const findings = [], confirmed = [];
    if (validation?.readyForFinalValidation !== true) findings.push("La validation finale des permissions n’est plus conforme.");
    for (const name of ["ACTIONS_CIRCUIT", "ACTIONS_ATTRIBUTIONS", "ACTIONS_EVENEMENTS", "ACTIONS_NOTIFICATIONS"])
      if (data[name].length !== 0) findings.push(`${name} doit rester vide pendant ce contrôle.`);
    let counts = { deadlineLevels: 0, notifications: 0, helperColumns: 0, retriesBlocked: 0 };
    if (!findings.length) try {
      const { creation, assigned, manager } = groupPlan(data, identity), chain = assigned.row.deadlineChain;
      if (chain.length !== 2 || deadlines.effectiveDeadline(chain) !== "2026-09-18") throw Error("Échéance effective hiérarchique incohérente.");
      let lateRefused = false;
      try { deadlines.changeDeadline(chain, { levelId: chain[1].id, actorId: manager.personId, date: "2026-09-21" }); }
      catch { lateRefused = true; }
      if (!lateRefused) throw Error("Une échéance inférieure dépasse encore la limite du créateur.");
      const notificationCount = validNotices([creation.plan, assigned]);
      if (!notificationCount) throw Error("Notifications de pointeur incomplètes, dupliquées ou trop bavardes.");
      const helpers = notificationIntegrity.helperColumns();
      if (!Array.isArray(helpers) || helpers.length !== 3 || helpers.some(column => column.isFormula !== true)) throw Error("Formules de confidentialité des notifications incomplètes.");
      const latch = gristLifecycle.submissionLatch(); latch.assertClear(); latch.markSubmitted();
      let retryBlocked = false; try { latch.assertClear(); } catch { retryBlocked = true; }
      if (!retryBlocked || !latch.isUncertain()) throw Error("Une réponse incertaine n’interdit pas correctement le second envoi.");
      latch.reconcile(); latch.assertClear();
      counts = { deadlineLevels: chain.length, notifications: notificationCount, helperColumns: helpers.length, retriesBlocked: 1 };
      confirmed.push("Échéance du responsable limitée par celle du créateur", "Notifications uniques, minimales et liées à leur événement", "Second envoi bloqué jusqu’à réconciliation après un résultat incertain");
    } catch (error) { findings.push(error.message); }
    return Object.freeze({ findings, confirmed, counts, readyForSafety: findings.length === 0,
      actions: [], writesBusinessRows: false, previewOnly: true });
  }

  function create({ grist, mode, identify }) {
    if (!finalAudit?.create || !directory?.records || !domain?.assign || !assignment?.creation || !deadlines?.effectiveDeadline
      || !notificationIntegrity?.helperColumns || !gristLifecycle?.submissionLatch || !creationAudit?.context || !lifecycleAudit?.organization)
      throw Error("Le moteur complet de sécurité du circuit manque dans la publication.");
    if (typeof identify !== "function") throw Error("Le service d’identification réelle manque dans la publication.");
    let busy = false;
    return Object.freeze({ async inspect() {
      if (busy) throw Error("Contrôle de sécurité déjà en cours."); busy = true;
      try {
        mode?.assertWritable?.();
        if (await grist.docApi.getDocName() !== documentId) throw Error("Document de base non autorisé.");
        const validation = await finalAudit.create({ grist }).inspect();
        const raw = await Promise.all(names.map(name => grist.docApi.fetchTable(name)));
        const data = Object.fromEntries(names.map((name, index) => [name, directory.records(raw[index])]));
        const identity = await identify({ people: data.INTERLOCUTEURS });
        if (await grist.docApi.getDocName() !== documentId) throw Error("Le document a changé pendant le contrôle.");
        return review({ validation, identity, data });
      } finally { busy = false; }
    } });
  }
  return Object.freeze({ documentId, names, groupPlan, validNotices, review, create });
});
