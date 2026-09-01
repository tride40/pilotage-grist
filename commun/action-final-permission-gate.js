"use strict";

// Exact metadata gate used by functional pages after the permission rollout.
(function expose(root, factory) {
  const common = typeof module === "object" && module.exports;
  const api = factory(
    common ? require("./action-permission-audit.js") : root.PilotageActionPermissionAudit,
    common ? require("./action-authority-permission-lot.js") : root.PilotageActionAuthorityPermissionLot
  );
  if (common) module.exports = api;
  else root.PilotageActionFinalPermissionGate = api;
})(typeof globalThis === "object" ? globalThis : this, function factory(permissionAudit, authorityLot) {
  const documentId = "f8iwcexDATAwBKsaG6gZRs", expectedManagedRuleCount = 81;
  const managedTables = new Set(["ACTIONS", "ACTIONS_CIRCUIT", "ACTIONS_ATTRIBUTIONS", "ACTIONS_EVENEMENTS", "ACTIONS_NOTIFICATIONS", "PILOTAGE_COMPTES", "INTERLOCUTEURS", "SERVICES", "POLES", "PROJETS"]);
  function review({ snapshot, base, authority }) {
    const findings = [...base.findings];
    if (!authority) findings.push("Les règles finales des projets et de l’organisation ne sont plus conformes.");
    const resourceIds = new Set(snapshot.resources.filter(resource => managedTables.has(resource.tableId)).map(resource => resource.id));
    const managedRuleCount = snapshot.rules.filter(rule => resourceIds.has(rule.resource)).length;
    if (managedRuleCount !== expectedManagedRuleCount) findings.push(`Le périmètre géré contient ${managedRuleCount} règles au lieu de ${expectedManagedRuleCount}.`);
    return Object.freeze({ findings, managedRuleCount, readyForFunctionalPages: base.readyForPermissionReview === true && authority && managedRuleCount === expectedManagedRuleCount && findings.length === 0,
      actions: [], writesBusinessRows: false });
  }
  function inspect(snapshot) {
    if (!permissionAudit?.inspect || !authorityLot?.matches) throw Error("Le contrôle final des permissions manque dans la publication.");
    return review({ snapshot, base: permissionAudit.inspect(snapshot), authority: authorityLot.matches(snapshot) });
  }
  return Object.freeze({ documentId, expectedManagedRuleCount, review, inspect });
});
