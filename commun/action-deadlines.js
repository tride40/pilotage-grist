"use strict";

// Pure domain rules. Not loaded by widgets until schema and server permissions
// are verified. The caller supplies an authorized attribution chain, root first;
// this module is NOT an access-control boundary or a Grist persistence adapter.
(function expose(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PilotageActionDeadlines = api;
})(typeof globalThis === "object" ? globalThis : this, function createRules() {
  function positiveId(value) {
    return Number.isSafeInteger(value) && value > 0;
  }

  // Calendar dates only, not timestamps: no local timezone/DST conversion.
  function validDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }

  function validate(chain) {
    if (!Array.isArray(chain) || chain.length === 0) throw new Error("Chaîne d’attribution absente.");
    const ids = new Set();
    let limit = null;
    for (const level of chain) {
      if (!level || !positiveId(level.id) || !positiveId(level.personId) || ids.has(level.id)) {
        throw new Error("Chaîne d’attribution invalide ou dupliquée.");
      }
      ids.add(level.id);
      if (level.date !== null && !validDate(level.date)) throw new Error("Date invalide : format AAAA-MM-JJ attendu.");
      if (level.date !== null) {
        if (limit !== null && level.date > limit) throw new Error("Échéance incompatible avec le niveau supérieur.");
        limit = level.date;
      }
    }
  }

  function effectiveDeadline(chain) {
    validate(chain);
    // Null means no additional deadline at this level, not removal of an
    // inherited limit. The closest downstream date is the effective deadline.
    return chain.reduce((date, level) => level.date ?? date, null);
  }

  function changeDeadline(chain, { levelId, actorId, date } = {}) {
    validate(chain);
    if (!positiveId(actorId) || !positiveId(levelId)) throw new Error("Auteur ou niveau invalide.");
    if (!validDate(date)) throw new Error("Une date valide est nécessaire ; la suppression n’est pas définie.");
    const index = chain.findIndex(level => level.id === levelId);
    if (index < 0 || chain[index].personId !== actorId) {
      throw new Error("Seul l’auteur de l’échéance à ce niveau peut la modifier.");
    }
    const parentLimit = chain.slice(0, index).reduce((limit, level) => level.date ?? limit, null);
    if (parentLimit !== null && date > parentLimit) {
      throw new Error("La nouvelle date dépasse l’échéance du niveau supérieur.");
    }

    const next = chain.map(level => ({ ...level }));
    const changes = [];
    function setDate(i, newDate, reason) {
      const previousDate = next[i].date;
      if (previousDate === newDate) return;
      changes.push({
        levelId: next[i].id, ownerId: next[i].personId,
        previousDate, date: newDate, actorId, reason,
      });
      next[i].date = newDate;
    }
    setDate(index, date, "author-change");
    let limit = date;
    for (let i = index + 1; i < next.length; i += 1) {
      if (next[i].date === null) continue;
      if (next[i].date > limit) setDate(i, limit, "upper-limit-advanced");
      limit = next[i].date;
    }
    validate(next);
    return { chain: next, changes, effectiveDate: effectiveDeadline(next) };
  }

  return Object.freeze({ validDate, effectiveDeadline, changeDeadline });
});
