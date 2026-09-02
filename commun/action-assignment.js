"use strict";

// Pure domain planning over a trusted normalized directory. No Grist access.
// Directory, actor and project membership must come from protected server data,
// never from a submitted form. Persistence/ACL enforcement are separate work.
(function expose(root, factory) {
  const api = factory(typeof module === "object" && module.exports ? require("./action-deadlines.js") : root.PilotageActionDeadlines);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PilotageActionAssignment = api;
})(typeof globalThis === "object" ? globalThis : this, function factory(deadlines) {
  const id = n => Number.isSafeInteger(n) && n > 0;
  const ids = a => Array.isArray(a) && a.every(id);
  const unique = a => [...new Set(a)];
  const date = s => typeof s === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(s)
    && Number.isFinite(Date.parse(s)) && new Date(s).toISOString() === s;
  function directory(data) {
    if (!data || !id(data.dgsId)) throw Error("DGS non déterminée.");
    for (const key of ["people", "services", "poles"]) {
      if (!Array.isArray(data[key]) || data[key].some(x => !x || !id(x.id))
        || new Set(data[key].map(x => x.id)).size !== data[key].length) throw Error("Annuaire invalide.");
    }
    function person(personId, agentOnly = false) {
      const p = data.people.find(p => p.id === personId);
      if (!p || p.active !== true || p.internal !== true || !["agent", "elected"].includes(p.kind)
        || (agentOnly && p.kind !== "agent")) throw Error("Interlocuteur interne actif requis.");
      return p;
    }
    person(data.dgsId, true);
    function pole(poleId) {
      const p = data.poles.find(p => p.id === poleId);
      if (!p || p.active !== true) throw Error("Pôle actif non déterminé.");
      person(p.headId, true); return p;
    }
    function service(serviceId) {
      const s = data.services.find(s => s.id === serviceId);
      if (!s || s.active !== true) throw Error("Service actif non déterminé.");
      pole(s.poleId); person(s.headId, true); return s;
    }
    function context(personId, selectedServiceId) {
      const p = person(personId, true);
      if (personId === data.dgsId) {
        if (selectedServiceId != null) throw Error("La DGS n’a pas de service de rattachement.");
        return { personId, serviceId: null, superiorId: null };
      }
      if (!ids(p.serviceIds)) throw Error("Rattachement de service non déterminé.");
      const choices = unique(p.serviceIds).filter(sid => data.services.some(s => s.id === sid && s.active === true));
      if (selectedServiceId == null && choices.length !== 1) throw Error("Choisir le service concerné par la demande.");
      const sid = selectedServiceId ?? choices[0];
      if (!choices.includes(sid)) throw Error("Service sans rattachement à cet agent.");
      const s = service(sid), pôle = pole(s.poleId);
      // Les deux responsables de pôle sont co-responsables et relèvent directement de la DGS.
      const chain = pôle.managerIds.includes(personId) ? [data.dgsId] : [s.headId, ...pôle.managerIds, data.dgsId];
      return { personId, serviceId: sid, superiorId: unique(chain).find(pid => pid !== personId) ?? null };
    }
    return { person, pole, service, context };
  }
  function checkActor(context, org) {
    if (!context || !id(context.personId) || context.active !== true || context.internal !== true
      || context.simulated !== false || context.delegated !== false) throw Error("Compte réel actif requis ; délégation non intégrée.");
    return org.person(context.personId);
  }
  function checkProject(project, org) {
    if (!project || !id(project.id) || !ids(project.electedAssociateIds) || !ids(project.agentIds)) throw Error("Projet incomplet.");
    if (org.person(project.electedPilotId).kind !== "elected") throw Error("Élu pilote non déterminé.");
    org.person(project.agentPilotId, true);
  }
  function allowed(actorId, project, target, data, org) {
    const p = org.person(actorId);
    if (p.kind === "elected") return [project.electedPilotId, ...project.electedAssociateIds].includes(actorId);
    if (actorId === data.dgsId) return true;
    if (target.kind === "pole") return org.pole(target.id).managerIds.includes(actorId);
    if (target.serviceId === null) return false;
    const s = org.service(target.serviceId);
    return s.headId === actorId || org.pole(s.poleId).managerIds.includes(actorId);
  }
  function destination(target, org) {
    if (!target || !id(target.id)) throw Error("Destinataire requis.");
    if (target.kind === "person") {
      const context = org.context(target.id, target.serviceId), pole = context.serviceId ? org.pole(org.service(context.serviceId).poleId) : null;
      return { ...context, kind: "person", id: target.id, managerIds: pole?.managerIds || [] };
    }
    if (target.kind === "service") {
      const s = org.service(target.id), p = org.pole(s.poleId);
      return { kind: "service", id: s.id, personId: s.headId, serviceId: s.id, managerIds: p.managerIds,
        superiorId: p.managerIds.includes(s.headId) ? org.dgsId : p.headId };
    }
    if (target.kind === "pole") {
      const p = org.pole(target.id);
      return { kind: "pole", id: p.id, personId: p.headId, serviceId: null, managerIds: p.managerIds, superiorId: org.dgsId === p.headId ? null : org.dgsId };
    }
    throw Error("Type de destinataire invalide.");
  }
  function setup(data, project, context) {
    const org = directory(data); org.dgsId = data.dgsId;
    checkActor(context, org); checkProject(project, org); return org;
  }
  function associates(items, executorId, actorId, project, data, org) {
    if (!Array.isArray(items)) throw Error("Liste des associés invalide.");
    const targets = items.map(item => destination({ ...item, kind: "person" }, org));
    if (new Set(targets.map(t => t.id)).size !== targets.length || targets.some(t => t.id === executorId)) throw Error("Associé dupliqué ou déjà chargé de réalisation.");
    if (targets.some(t => !allowed(actorId, project, t, data, org))) throw Error("Associé hors du périmètre autorisé.");
    return targets;
  }
  function output(row, actorId, kind, at, participants, membership, extra = {}) {
    const eventKey = `action:${row.id}:revision:${row.revision}`;
    return { ...extra, row, event: { key: eventKey, actionId: row.id, revision: row.revision, actorId, kind, at },
      notifications: unique(participants).filter(pid => pid != null && pid !== actorId).map(pid => ({
        key: `${eventKey}:recipient:${pid}`, recipientId: pid, actionId: row.id, eventKey, kind, read: false,
      })), addProjectAgentIds: unique(membership), integrationReady: false, securityCertified: false };
  }
  function create(input, context, data, project, allocation) {
    const org = setup(data, project, context), target = destination(input?.target, org);
    if (!allowed(context.personId, project, target, data, org)) throw Error("Création hors du périmètre autorisé.");
    if (target.kind === "person" && target.id === context.personId) throw Error("Utiliser la to-do list pour une tâche pour soi-même.");
    if (typeof input.title !== "string" || !input.title.trim() || !id(allocation?.id) || !date(allocation.at)) throw Error("Intitulé, identifiant et date nécessaires.");
    const executorId = target.kind === "person" ? target.id : null;
    const deadline = input.deadline ?? null;
    if (deadline !== null && !deadlines.validDate(deadline)) throw Error("Échéance invalide.");
    const deadlineChain = [{ id: 1, personId: context.personId, date: deadline }];
    const associateTargets = associates(input.associates ?? [], executorId, context.personId, project, data, org);
    const associateIds = associateTargets.map(t => t.id);
    const associateContexts = associateTargets.map(t => ({personId:t.id,serviceId:t.serviceId}));
    const pilotIds = unique([project.electedPilotId, project.agentPilotId]);
    const row = { id: allocation.id, kind: "action", projectId: project.id, projectTitle: project.title ?? "", title: input.title.trim(),
      creatorId: context.personId, executorId, assignerId: executorId === null ? target.personId : null,
      state: executorId === null ? "to_assign" : "in_progress", targetKind: target.kind, targetId: target.id,
      serviceId: target.serviceId, superiorId: target.superiorId ?? null, associateIds, associateContexts, pilotIds, chainIds: [context.personId],
      revision: 1, updatedAt: allocation.at, deadline, deadlineChain,
      visibleTo: unique([context.personId, target.personId, ...(target.managerIds || []), ...pilotIds, ...associateIds, ...(target.superiorId == null ? [] : [target.superiorId])]) };
    // First deadline belongs to the real creator, never a submitted owner id.
    const members = [...associateIds, ...(executorId === null ? [] : [executorId])].filter(pid => !project.agentIds.includes(pid) && pid !== project.agentPilotId);
    return output(row, context.personId, "create", allocation.at, row.visibleTo, members);
  }
  function assign(row, input, context, data, project) {
    const org = setup(data, project, context);
    if (!ids(row?.visibleTo) || !row.visibleTo.includes(context.personId)) throw Error("Action inaccessible.");
    if (row.projectId !== project.id || row.state !== "to_assign" || !id(row.revision) || row.revision >= Number.MAX_SAFE_INTEGER
      || input?.expectedRevision !== row.revision || !date(input.at) || !date(row.updatedAt) || input.at < row.updatedAt) throw Error("Étape ou révision invalide : relire l’action.");
    if (context.personId !== row.creatorId && !canManage(row, context.personId, org)) throw Error("Seul le créateur ou un responsable du périmètre destinataire peut attribuer.");
    const target = destination({ ...input.target, kind: "person" }, org);
    if (!allowed(context.personId, project, target, data, org)) throw Error("Attribution hors du périmètre autorisé.");
    if (row.targetKind === "service" && target.serviceId !== row.targetId) throw Error("L’agent doit appartenir au service destinataire.");
    if (row.targetKind === "pole" && (target.serviceId === null || org.service(target.serviceId).poleId !== row.targetId)) throw Error("L’agent doit appartenir au pôle destinataire.");
    if (!["service", "pole"].includes(row.targetKind) || !ids(row.associateIds) || !ids(row.chainIds) || !ids(row.pilotIds)
      || !id(row.id) || !id(row.creatorId) || !id(row.assignerId)) throw Error("Circuit incomplet.");
    if (row.associateIds.includes(target.id)) throw Error("Retirer cet agent des associés avant de le désigner exécutant.");
    // Preserve upstream deadlines; an attributing manager owns only a new level.
    deadlines.effectiveDeadline(row.deadlineChain);
    let deadlineChain = row.deadlineChain.map(level => ({ ...level }));
    if (deadlineChain.at(-1).personId !== context.personId) deadlineChain.push({
      id: Math.max(...deadlineChain.map(level => level.id)) + 1, personId: context.personId, date: null,
    });
    if (input.deadline != null) deadlineChain = deadlines.changeDeadline(deadlineChain, {
      levelId: deadlineChain.at(-1).id, actorId: context.personId, date: input.deadline,
    }).chain;
    const next = { ...row, executorId: target.id, assignerId: null, serviceId: target.serviceId, superiorId: target.superiorId,
      deadlineChain, deadline: deadlines.effectiveDeadline(deadlineChain),
      state: "in_progress", revision: row.revision + 1, updatedAt: input.at, chainIds: unique([...row.chainIds, context.personId]),
      visibleTo: unique([...row.visibleTo, target.id, ...(target.superiorId === null ? [] : [target.superiorId])]) };
    return output(next, context.personId, "assign", input.at, next.visibleTo,
      project.agentIds.includes(target.id) || project.agentPilotId === target.id ? [] : [target.id], { expectedRevision: row.revision });
  }
  function canManage(row, actorId, org) {
    if (row?.targetKind === "pole") return org.pole(row.targetId).managerIds.includes(actorId);
    if (row?.targetKind === "service") {
      const service = org.service(row.targetId), pole = org.pole(service.poleId);
      return service.headId === actorId || pole.managerIds.includes(actorId);
    }
    return false;
  }
  function canAssign(data, project, row, context) {
    const org = setup(data, project, context);
    return row?.state === "to_assign" && (row.creatorId === context.personId || canManage(row, context.personId, org));
  }
  return Object.freeze({ create, assign, canAssign });
});
