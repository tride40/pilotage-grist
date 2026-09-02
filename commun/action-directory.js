"use strict";

// Converts explicit Grist directory fields to the action domain model.
// This is NOT an authorization boundary: server protections remain necessary.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PilotageActionDirectory = api;
})(typeof globalThis === "object" ? globalThis : this, function () {
  const id = value => Number.isSafeInteger(value) && value > 0;
  const yes = value => value === true || value === 1;
  function bool(value) {
    if (![true, false, 1, 0].includes(value)) throw Error("Indicateur d’annuaire absent ou invalide.");
    return yes(value);
  }
  function refs(value) {
    if (value == null) return [];
    if (!Array.isArray(value)) throw Error("Liste de références invalide.");
    const result = value[0] === "L" ? value.slice(1) : value.slice();
    if (!result.every(id)) throw Error("Référence illisible dans l’annuaire.");
    return [...new Set(result)];
  }
  function records(raw) {
    if (!raw || !Array.isArray(raw.id) || !raw.id.every(id)
      || new Set(raw.id).size !== raw.id.length) throw Error("Identifiants d’annuaire invalides.");
    const columns = Object.entries(raw);
    if (columns.some(([, values]) => !Array.isArray(values) || values.length !== raw.id.length)) throw Error("Lecture d’annuaire incomplète.");
    return raw.id.map((_, i) => Object.fromEntries(columns.map(([name, values]) => [name, values[i]])));
  }
  function normalize(tables) {
    const people = records(tables.INTERLOCUTEURS).map(p => ({
      id: p.id, active: bool(p.Actif), internal: bool(p.Interne_Mairie),
      kind: p.Role_interne === "Agent" ? "agent" : p.Role_interne === "Élu" ? "elected" : null,
      dgs: bool(p.Est_DGS), serviceIds: [],
    }));
    const byId = new Map(people.map(p => [p.id, p]));
    function agent(pid, mustBeActive = true) {
      const p = byId.get(pid);
      if (!p || !p.internal || p.kind !== "agent" || (mustBeActive && !p.active)) throw Error("Responsable ou membre interne non déterminé.");
      return p;
    }
    const candidates = people.filter(p => p.active && p.dgs);
    if (candidates.length !== 1) throw Error("Une seule DGS active doit être désignée explicitement.");
    const dgsId = agent(candidates[0].id).id;
    function nonDgs(pid, active = true) {
      const p = agent(pid, active);
      if (p.id === dgsId) throw Error("La DGS ne doit pas être rattachée à un service ou diriger un pôle.");
      return p;
    }
    const poles = records(tables.POLES).filter(p => bool(p.Actif)).map(p => {
      const headId = nonDgs(p.Responsable).id;
      const deputyId = p.Responsable_adjoint ? nonDgs(p.Responsable_adjoint).id : null;
      if (deputyId === headId) throw Error("Le responsable et son adjoint doivent être distincts.");
      return { id: p.id, active: true, headId, deputyId, managerIds: [headId, ...(deputyId ? [deputyId] : [])] };
    });
    const services = records(tables.SERVICES).filter(s => bool(s.Actif)).map(s => {
      const pole = poles.find(p => p.id === s.Pole);
      if (!pole) throw Error("Pôle actif manquant pour un service.");
      const headId = bool(s.Responsable_du_pole) ? pole.headId : s.Responsable_designe;
      nonDgs(headId);
      if (s.Responsable !== headId) throw Error("Responsable calculé incohérent avec l’organisation.");
      // Match the existing directory: service head is also a service member.
      for (const pid of new Set([...refs(s.Agents), headId])) nonDgs(pid, false).serviceIds.push(s.id);
      return { id: s.id, active: true, headId, poleId: pole.id };
    });
    for (const pole of poles) for (const managerId of pole.managerIds) {
      if (!byId.get(managerId).serviceIds.length) throw Error("Responsable de pôle sans service actif de rattachement.");
    }
    return { dgsId, people: people.map(({dgs, ...p}) => p), services, poles };
  }
  function project(row, directory) {
    if (!row || !id(row.id)) throw Error("Projet non déterminé.");
    function requirePerson(pid, kind) {
      const p = directory.people.find(p => p.id === pid);
      if (!p || !p.active || !p.internal || p.kind !== kind) throw Error("Pilotage ou association du projet à vérifier.");
      return pid;
    }
    return { id: row.id, title: typeof row.Nom_projet === "string" ? row.Nom_projet : "",
      electedPilotId: requirePerson(row.Elu_pilote, "elected"),
      agentPilotId: requirePerson(row.Agent_pilote, "agent"),
      electedAssociateIds: refs(row.Elus_associes).map(pid => requirePerson(pid, "elected")),
      agentIds: refs(row.Agents_associes).map(pid => requirePerson(pid, "agent")),
    };
  }
  return Object.freeze({ normalize, project, records, refs });
});
