"use strict";

// Pure transition planner. Not an ACL or persistence adapter. The caller must
// load a server-authorized snapshot and commit state/event/notifications atomically
// with a server-side revision check. Never submit this plan blindly from a widget.
(function expose(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PilotageActionLifecycle = api;
})(typeof globalThis === "object" ? globalThis : this, function createLifecycle() {
  const states = ["to_assign", "in_progress", "additional_work", "performed", "closed", "cancelled"];
  const positive = n => Number.isSafeInteger(n) && n > 0;
  const unique = values => [...new Set(values)];
  function list(value) { return Array.isArray(value) && value.every(positive); }
  function timestamp(value) {
    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
      && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
  }
  function validate(row) {
    const awaitingAssignment = row?.state === "to_assign" || (row?.state === "cancelled" && row.executorId === null);
    if (!row || !positive(row.id) || !positive(row.projectId) || !positive(row.creatorId)
      || (awaitingAssignment ? row.executorId !== null || !positive(row.assignerId) : !positive(row.executorId))
      || !positive(row.revision) || row.revision >= Number.MAX_SAFE_INTEGER
      || !states.includes(row.state) || !list(row.visibleTo) || !list(row.associateIds)
      || !list(row.chainIds) || !list(row.pilotIds) || !timestamp(row.updatedAt)) {
      throw Error("Circuit incomplet : qualifier l’action avant toute opération.");
    }
    // Null explicitly means no superior in the validated hierarchy. Undefined
    // must not silently suppress the mandatory information to a superior.
    const recipientId = awaitingAssignment ? row.assignerId : row.executorId;
    if (row.superiorId !== null && (!positive(row.superiorId) || row.superiorId === recipientId)) {
      throw Error("Supérieur direct distinct non déterminé.");
    }
    const audience = [row.creatorId, recipientId, ...row.associateIds, ...row.chainIds, ...row.pilotIds,
      ...(row.superiorId === null ? [] : [row.superiorId])];
    if (!audience.every(id => row.visibleTo.includes(id))) throw Error("Audience autorisée incomplète.");
    if (row.state === "performed" || row.state === "additional_work" || row.state === "closed") {
      if (row.performedBy !== row.executorId || !timestamp(row.performedAt)
        || row.performedAt > row.updatedAt) throw Error("Déclaration de réalisation non déterminée.");
    }
    if (row.state === "closed" && (!timestamp(row.closedAt) || row.closedAt < row.performedAt
      || row.closedAt > row.updatedAt)) throw Error("Clôture non déterminée.");
  }
  function actor(context) {
    if (!context || !positive(context.personId) || context.internal !== true || context.active !== true
      || context.simulated !== false || context.delegated !== false) {
      throw Error("Identité réelle active nécessaire ; délégation non intégrée à ce lot.");
    }
  }
  function operations(row, context) {
    actor(context);
    // Do not validate or expose the contents of a hidden source.
    if (!list(row?.visibleTo) || !row.visibleTo.includes(context.personId)) return [];
    validate(row);
    if (["closed", "cancelled"].includes(row.state)) return [];
    const result = [];
    if (row.executorId === context.personId && ["in_progress", "additional_work"].includes(row.state)) result.push("perform");
    if (row.creatorId === context.personId && row.state === "performed") result.push("close", "request_additional_work");
    if (row.creatorId === context.personId) result.push("cancel");
    return result;
  }
  function plan(row, context, command) {
    actor(context);
    if (!list(row?.visibleTo) || !row.visibleTo.includes(context.personId)) throw Error("Action inaccessible.");
    validate(row);
    if (!command || command.expectedRevision !== row.revision) throw Error("Action modifiée : relire avant de recommencer.");
    if (!operations(row, context).includes(command.type)) throw Error("Opération non autorisée à cette étape.");
    if (!timestamp(command.at) || command.at < row.updatedAt) throw Error("Date d’événement invalide.");
    if (command.note !== undefined && typeof command.note !== "string") throw Error("Précision invalide.");
    const note = (command.note || "").trim();
    if (["request_additional_work", "cancel"].includes(command.type) && !note) throw Error("Un motif est obligatoire.");
    const target = { perform: "performed", close: "closed", request_additional_work: "additional_work", cancel: "cancelled" }[command.type];
    // Only lifecycle fields may be patched: never accept actor, owner, deadline,
    // audience or reassignment values from the submitted form.
    const patch = { state: target, revision: row.revision + 1, updatedAt: command.at };
    if (command.type === "perform") Object.assign(patch, { performedAt: command.at, performedBy: context.personId, result: note });
    if (command.type === "close") patch.closedAt = command.at;
    if (command.type === "request_additional_work") patch.additionalWorkReason = note;
    if (command.type === "cancel") Object.assign(patch, { cancelledAt: command.at, cancellationReason: note });
    const eventKey = `action:${row.id}:revision:${patch.revision}`;
    const event = { key: eventKey, actionId: row.id, actorId: context.personId, at: command.at,
      from: row.state, to: target, operation: command.type, note, revision: patch.revision };
    // Notifications contain a pointer, not private notes or blockage content.
    // Their source must still be read through server permissions on opening.
    const recipients = unique([row.creatorId, row.executorId ?? row.assignerId, ...row.associateIds, ...row.pilotIds,
      ...(row.superiorId === null ? [] : [row.superiorId]), ...(command.type === "cancel" ? row.chainIds : [])]);
    const notifications = recipients.filter(id => id !== context.personId).map(id => ({
      key: `${eventKey}:recipient:${id}`, recipientId: id, actionId: row.id, eventKey,
      kind: command.type, read: false,
    }));
    return { expectedRevision: row.revision, patch, event, notifications, integrationReady: false, securityCertified: false };
  }
  return Object.freeze({ operations, plan });
});
