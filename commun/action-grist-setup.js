"use strict";

// Explicit setup command only. Never invoked when a business widget loads.
(function expose(root, factory) {
  const api = factory(typeof module === "object" && module.exports ? require("./action-grist-schema.js") : root.PilotageActionGristSchema);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PilotageActionGristSetup = api;
})(typeof globalThis === "object" ? globalThis : this, function factory(schema) {
  function rows(raw) {
    if (!raw || !Array.isArray(raw.id)) throw Error("Lecture des métadonnées impossible.");
    const columns = Object.entries(raw).filter(([, value]) => Array.isArray(value));
    if (columns.some(([, values]) => values.length !== raw.id.length)) throw Error("Métadonnées tronquées.");
    return raw.id.map((_, i) => Object.fromEntries(columns.map(([key, value]) => [key, value[i]])));
  }
  function create({ grist, mode }) {
    let busy = false, preview = null, outcomeUncertain = false;
    async function guard() {
      if (!mode || mode.isReadOnly()) throw Error("Préparation interdite en mode test.");
      mode.assertWritable();
      if (await grist.docApi.getDocName() !== schema.documentId) throw Error("Document de base non autorisé.");
    }
    async function snapshot() {
      await guard();
      const tables = ["_grist_Tables", "_grist_Tables_column", "_grist_ACLResources", "_grist_ACLRules"];
      const values = await Promise.all(tables.map(async table => rows(await grist.docApi.fetchTable(table))));
      await guard();
      return { documentId: schema.documentId, tables: values[0], columns: values[1], resources: values[2], rules: values[3] };
    }
    function report(result) {
      return { tablesToAdd: result.missing.map(t => t.tableId), findings: [...result.findings],
        readyToPrepare: result.readyToPrepare, alreadyPrepared: result.alreadyPrepared,
        businessWorkflowEnabled: false, securityCertified: false };
    }
    return Object.freeze({
      async inspect() {
        if (busy) throw Error("Préparation déjà en cours.");
        preview = null;
        const current = await snapshot(), result = schema.plan(current);
        // Keep the exact observed metadata, not a cached executable action plan.
        if (result.readyToPrepare) preview = JSON.stringify(current);
        return { ...report(result), outcomeUncertain };
      },
      async install({ confirmed = false } = {}) {
        if (busy) throw Error("Préparation déjà en cours.");
        if (outcomeUncertain) throw Error("Résultat précédent incertain : contrôler le document avant toute nouvelle tentative.");
        if (!confirmed || !preview) throw Error("Vérifier puis confirmer explicitement la création des tables protégées.");
        busy = true;
        try {
          const current = await snapshot();
          if (JSON.stringify(current) !== preview) { preview = null; throw Error("La structure ou les permissions ont changé : refaire la vérification."); }
          const result = schema.plan(current);
          if (!result.readyToPrepare) throw Error("Préparation bloquée par une incompatibilité.");
          if (!result.actions.length) return report(result);
          await guard(); preview = null;
          // One server request. Grist authorizes ACL changes against the real
          // document owner, not an editable role field supplied by this widget.
          outcomeUncertain = true;
          await grist.docApi.applyUserActions(result.actions);
          const verified = schema.inspect(await snapshot());
          if (!verified.alreadyPrepared) throw Error("Résultat à contrôler : la structure ou les protections attendues ne sont pas confirmées.");
          outcomeUncertain = false;
          return report(verified);
        } catch (error) {
          if (outcomeUncertain) throw Error(`Ne pas relancer automatiquement. ${error.message}`);
          throw error;
        } finally { busy = false; }
      },
    });
  }
  return Object.freeze({ create });
});
