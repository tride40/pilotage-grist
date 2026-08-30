/* Règles de l'organisation municipale, indépendantes du DOM et de Grist. */
(function (root) {
  "use strict";
  const yes = value => value === true || value === 1;
  const ids = value => [...new Set((Array.isArray(value) ? value : [value]).filter(v => v != null && v !== "L" && v !== "" && Number(v) > 0).map(Number))];
  const active = row => row && row.Actif !== false && row.Actif !== 0;
  const agent = row => row && yes(row.Interne_Mairie ?? row.Interne_Sanguinet) && row.Role_interne === "Agent";
  const dgs = row => yes(row?.Est_DGS);
  const poleOf = (service, poles) => poles.find(p => Number(p.id) === Number(service.Pole));
  function responsible(service, poles) {
    return yes(service.Responsable_du_pole) ? Number(poleOf(service, poles)?.Responsable) || 0 : Number(service.Responsable_designe ?? service.Responsable) || 0;
  }
  const members = (service, poles) => [...new Set([...ids(service.Agents), ...ids(responsible(service, poles))])];
  const servicesOf = (person, services, poles) => services.filter(s => members(s, poles).includes(Number(person.id)));
  function responsibilities(person, services, poles) {
    const id = Number(person.id), result = [];
    if (dgs(person)) result.push("Direction générale des services");
    poles.filter(active).forEach(p => {
      if (Number(p.Responsable) === id) result.push(`Responsable — ${p.Pole}`);
      if (Number(p.Responsable_adjoint ?? p.Responsbale_adjoint) === id) result.push(`Responsable adjoint — ${p.Pole}`);
    });
    services.filter(active).forEach(s => { if (responsible(s, poles) === id) result.push(`Responsable — ${s.Nom_service}`); });
    return result;
  }
  function validateService(service, people, poles) {
    if (!String(service.Nom_service || "").trim()) throw Error("Le nom du service est obligatoire.");
    if (!active(poleOf(service, poles))) throw Error("Choisissez un pôle actif pour ce service.");
    const leader = people.find(p => Number(p.id) === responsible(service, poles));
    if (!agent(leader) || !active(leader) || dgs(leader)) throw Error("Le responsable doit être un agent actif, hors DGS.");
    for (const id of ids(service.Agents)) {
      const person = people.find(p => Number(p.id) === id);
      if (!agent(person) || dgs(person)) throw Error("Les membres du service doivent être des agents internes, hors DGS.");
    }
    return service;
  }
  function validatePole(pole, people, services, poles) {
    if (!String(pole.Pole || "").trim()) throw Error("Le nom du pôle est obligatoire.");
    if (Number(pole.Responsable) === Number(pole.Responsable_adjoint) && Number(pole.Responsable)) throw Error("Le responsable et son adjoint doivent être deux personnes distinctes.");
    for (const id of [Number(pole.Responsable), ...ids(pole.Responsable_adjoint)]) {
      const person = people.find(p => Number(p.id) === id);
      if (!agent(person) || !active(person) || dgs(person)) throw Error("Choisissez un responsable et, éventuellement, un adjoint parmi les agents actifs hors DGS.");
      if (!servicesOf(person, services, poles).some(active)) throw Error("Les responsables de pôle doivent appartenir à au moins un service actif. Affectez-les d’abord à un service existant.");
    }
    return pole;
  }
  function orphanedAfter(before, after, people, poles) {
    return people.filter(p => active(p) && agent(p) && !dgs(p)
      && servicesOf(p, before.filter(active), poles).length
      && !servicesOf(p, after.filter(active), poles).length);
  }
  function inheritedUpdates(pole, services) {
    return services.filter(s => Number(s.Pole) === Number(pole.id) && yes(s.Responsable_du_pole)).map(s => ["UpdateRecord", "SERVICES", s.id, {Agents: ["L", ...new Set([...ids(s.Agents), ...ids(s.Responsable), Number(pole.Responsable)])]}]);
  }
  function dgsActions(chosenId, outgoingServiceIds, people, services, poles) {
    const chosen = people.find(p => Number(p.id) === Number(chosenId));
    if (!agent(chosen) || !active(chosen)) throw Error("La DGS doit être une agente ou un agent interne actif.");
    if (services.some(s => responsible(s, poles) === Number(chosen.id)) || poles.some(p => [Number(p.Responsable), Number(p.Responsable_adjoint)].includes(Number(chosen.id)))) throw Error("Réaffectez les responsabilités de service ou de pôle de cette personne avant de la désigner DGS.");
    const outgoing = people.filter(p => dgs(p) && p.id !== chosen.id), selected = ids(outgoingServiceIds);
    if (outgoing.some(active) && !selected.length) throw Error("Choisissez au moins un service pour la DGS sortante.");
    if (selected.some(id => !services.some(s => Number(s.id) === id && active(s)))) throw Error("Choisissez des services actifs pour la DGS sortante.");
    const actions = outgoing.map(p => ["UpdateRecord", "INTERLOCUTEURS", p.id, {Est_DGS:false}]);
    for (const s of services) {
      const before = ids(s.Agents), after = before.filter(id => id !== Number(chosen.id));
      if (selected.includes(Number(s.id))) after.push(...outgoing.map(p => Number(p.id)));
      const unique = ids(after);
      if (JSON.stringify(before) !== JSON.stringify(unique)) actions.push(["UpdateRecord", "SERVICES", s.id, {Agents:["L", ...unique]}]);
    }
    actions.push(["UpdateRecord", "INTERLOCUTEURS", chosen.id, {Est_DGS:true}]);
    return actions;
  }
  const RESPONSIBLE_FORMULA = "$Pole.Responsable if $Responsable_du_pole else $Responsable_designe";
  function schemaActions(columns, tableNames, tables) {
    const actions = [], all = columns.map(c => ({...c}));
    const find = (table, field) => all.find(c => c.tableId === table && c.colId === field);
    if (!tableNames.includes("POLES")) actions.push(["AddTable", "POLES", []]);
    if (find("POLES", "Responsbale_adjoint") && !find("POLES", "Responsable_adjoint")) {
      actions.push(["RenameColumn", "POLES", "Responsbale_adjoint", "Responsable_adjoint"]);
      find("POLES", "Responsbale_adjoint").colId = "Responsable_adjoint";
    }
    function field(table, name, type, label) {
      const existing = find(table, name);
      if (existing && String(existing.formula || "").trim()) throw Error(`Adaptation interrompue : ${table}.${name} contient déjà une formule. Aucune modification n’a été effectuée.`);
      if (existing && existing.type !== type) throw Error(`Type inattendu pour ${table}.${name}. Vérification manuelle nécessaire.`);
      if (!existing) actions.push(["AddColumn", table, name, {type, label, isFormula:false}]);
      else if (yes(existing.isFormula)) actions.push(["ModifyColumn", table, name, {isFormula:false, formula:""}]);
    }
    field("POLES", "Pole", "Text", "Nom du pôle");
    field("POLES", "Responsable", "Ref:INTERLOCUTEURS", "Responsable");
    field("POLES", "Responsable_adjoint", "Ref:INTERLOCUTEURS", "Responsable adjoint");
    field("POLES", "Actif", "Bool", "Actif");
    field("SERVICES", "Pole", "Ref:POLES", "Pôle");
    field("SERVICES", "Responsable_du_pole", "Bool", "Responsable du pôle");
    field("SERVICES", "Responsable_designe", "Ref:INTERLOCUTEURS", "Responsable désigné");
    field("INTERLOCUTEURS", "Est_DGS", "Bool", "Direction générale des services");
    const current = find("SERVICES", "Responsable");
    if (!current || current.type !== "Ref:INTERLOCUTEURS") throw Error("La référence SERVICES.Responsable doit être vérifiée avant adaptation.");
    if (current.formula && current.formula.trim() !== RESPONSIBLE_FORMULA) throw Error("Le responsable des services utilise une formule personnalisée : adaptation arrêtée.");
    if (current.formula?.trim() !== RESPONSIBLE_FORMULA) {
      for (const service of tables.SERVICES || []) {
        if (Number(service.Responsable_designe) && Number(service.Responsable_designe) !== Number(service.Responsable)) throw Error("Deux responsables différents sont déjà enregistrés : adaptation arrêtée.");
        actions.push(["UpdateRecord", "SERVICES", service.id, {Responsable_designe:Number(service.Responsable)||0, Responsable_du_pole:false, Agents:["L", ...new Set([...ids(service.Agents), ...ids(service.Responsable)])]}]);
      }
      actions.push(["ModifyColumn", "SERVICES", "Responsable", {type:"Ref:INTERLOCUTEURS", isFormula:true, formula:RESPONSIBLE_FORMULA}]);
    }
    return actions;
  }
  const api = {yes, ids, active, agent, dgs, poleOf, responsible, members, servicesOf, responsibilities, validateService, validatePole, orphanedAfter, inheritedUpdates, dgsActions, schemaActions, RESPONSIBLE_FORMULA};
  if (typeof module !== "undefined") module.exports = api;
  else root.OrganisationModel = api;
})(typeof window === "undefined" ? {} : window);
