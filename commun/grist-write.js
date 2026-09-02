"use strict";

(function exposeGristWrite(global) {
  function assertWritable() {
    if (!global.grist?.docApi?.applyUserActions) {
      throw new Error("L’API Grist d’écriture n’est pas disponible.");
    }
    return true;
  }

  function isReadOnly() {
    return false;
  }

  async function applyUserActions(actions) {
    assertWritable();
    return global.grist.docApi.applyUserActions(actions);
  }

  global.PilotageGristWrite = Object.freeze({
    isReadOnly,
    assertWritable,
    applyUserActions,
  });
})(window);
