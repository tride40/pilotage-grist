"use strict";

// Generated from the reviewed target manifest. Additive ACTIONS_CIRCUIT lot only.
(function expose(root,factory){
  const api=factory(typeof module==="object"&&module.exports?require("./action-source-schema-lot.js"):root.PilotageActionSourceSchemaLot,
    typeof module==="object"&&module.exports?require("./action-attribution-schema-lot.js"):root.PilotageActionAttributionSchemaLot);
  if(typeof module==="object"&&module.exports)module.exports=api;else root.PilotageActionCircuitSchemaLot=api;
})(typeof globalThis==="object"?globalThis:this,function factory(sourceLot,attributionLot){
  const tableId="ACTIONS_CIRCUIT",expected=[
  {
    "id": "Contextes_associes",
    "type": "Text",
    "isFormula": false,
    "formula": ""
  },
  {
    "id": "Audience_initiale",
    "type": "RefList:INTERLOCUTEURS",
    "isFormula": false,
    "formula": ""
  },
  {
    "id": "ACL_revision_coherente",
    "type": "Bool",
    "isFormula": true,
    "formula": "try:\n  action_id = rec.Action.id\n  revision = rec.Revision\n  if not action_id or type(revision) is not int or revision < 1:\n    return False\n  circuits = list(ACTIONS_CIRCUIT.lookupRecords(Action=rec.Action))\n  if len(circuits) != 1 or circuits[0].id != rec.id:\n    return False\n  events = list(ACTIONS_EVENEMENTS.lookupRecords(Action=rec.Action))\n  if len(events) != revision:\n    return False\n  if any(type(e.Revision) is not int for e in events):\n    return False\n  events.sort(key=lambda e: e.Revision)\n  for position, event in enumerate(events, 1):\n    if event.Revision != position:\n      return False\n    if event.Cle_evenement != \"action:%s:revision:%s\" % (action_id, position):\n      return False\n    if position > 1 and event.Etape_avant != events[position - 2].Etape_apres:\n      return False\n  last = events[-1]\n  return bool(last.Etape_apres == rec.Etape and last.Date_evenement is not None and last.Date_evenement == rec.Modifie_le)\nexcept Exception:\n  return False"
  },
  {
    "id": "ACL_evenement_auteur",
    "type": "Ref:INTERLOCUTEURS",
    "isFormula": true,
    "formula": "try:\n  events = list(ACTIONS_EVENEMENTS.lookupRecords(Action=rec.Action, Revision=rec.Revision))\n  if len(events) != 1:\n    return 0\n  value = events[0].Auteur\n  return value\nexcept Exception:\n  return 0"
  },
  {
    "id": "ACL_evenement_operation",
    "type": "Text",
    "isFormula": true,
    "formula": "try:\n  events = list(ACTIONS_EVENEMENTS.lookupRecords(Action=rec.Action, Revision=rec.Revision))\n  if len(events) != 1:\n    return \"\"\n  value = events[0].Operation\n  return value\nexcept Exception:\n  return \"\""
  },
  {
    "id": "ACL_evenement_etape_avant",
    "type": "Text",
    "isFormula": true,
    "formula": "try:\n  events = list(ACTIONS_EVENEMENTS.lookupRecords(Action=rec.Action, Revision=rec.Revision))\n  if len(events) != 1:\n    return \"\"\n  value = events[0].Etape_avant\n  return value\nexcept Exception:\n  return \"\""
  },
  {
    "id": "ACL_evenement_precision",
    "type": "Text",
    "isFormula": true,
    "formula": "try:\n  events = list(ACTIONS_EVENEMENTS.lookupRecords(Action=rec.Action, Revision=rec.Revision))\n  if len(events) != 1:\n    return \"\"\n  value = events[0].Precision\n  return value\nexcept Exception:\n  return \"\""
  },
  {
    "id": "ACL_evenement_motif_present",
    "type": "Bool",
    "isFormula": true,
    "formula": "try:\n  events = list(ACTIONS_EVENEMENTS.lookupRecords(Action=rec.Action, Revision=rec.Revision))\n  if len(events) != 1:\n    return False\n  value = events[0].Precision\n  return bool(isinstance(value, str) and value.strip())\nexcept Exception:\n  return False"
  },
  {
    "id": "ACL_evenement_notifications_coherentes",
    "type": "Bool",
    "isFormula": true,
    "formula": "try:\n  events = list(ACTIONS_EVENEMENTS.lookupRecords(Action=rec.Action, Revision=rec.Revision))\n  if len(events) != 1:\n    return False\n  value = events[0].ACL_notifications_coherentes\n  return value\nexcept Exception:\n  return False"
  },
  {
    "id": "ACL_creation_perimetre",
    "type": "Bool",
    "isFormula": true,
    "formula": "try:\n  import json\n  def person(p, role=None):\n    if not p.id or not p.Actif or not p.Interne_Mairie or p.Role_interne not in [\"Agent\", \"Élu\"]:\n      raise ValueError(\"person\")\n    if role and p.Role_interne != role:\n      raise ValueError(\"role\")\n    return p\n  candidates = list(INTERLOCUTEURS.lookupRecords(Actif=True, Est_DGS=True))\n  if len(candidates) != 1:\n    return False\n  dgs = person(candidates[0], \"Agent\")\n  def pole(p):\n    if not p.id or not p.Actif or person(p.Responsable, \"Agent\").id == dgs.id:\n      raise ValueError(\"pole\")\n    return p\n  def service(s):\n    if not s.id or not s.Actif:\n      raise ValueError(\"service\")\n    parent = pole(s.Pole)\n    head = parent.Responsable if s.Responsable_du_pole else s.Responsable_designe\n    if person(head, \"Agent\").id == dgs.id or s.Responsable.id != head.id:\n      raise ValueError(\"head\")\n    return s\n  def context(p, s):\n    person(p, \"Agent\")\n    if p.id == dgs.id:\n      if s.id:\n        raise ValueError(\"dgs service\")\n      return 0\n    service(s)\n    if p.id not in [m.id for m in s.Agents] + [s.Responsable.id]:\n      raise ValueError(\"membership\")\n    if s.Pole.Responsable.id == p.id:\n      return dgs.id\n    return next(pid for pid in [s.Responsable.id, s.Pole.Responsable.id, dgs.id] if pid != p.id)\n  project = rec.Action.Projet\n  if not project.id:\n    return False\n  person(project.Elu_pilote, \"Élu\")\n  person(project.Agent_pilote, \"Agent\")\n  def allowed(actor, target_service=None, target_pole=None):\n    person(actor)\n    if actor.Role_interne == \"Élu\":\n      return actor.id in [project.Elu_pilote.id] + [p.id for p in project.Elus_associes]\n    if actor.id == dgs.id:\n      return True\n    if target_pole is not None:\n      return pole(target_pole).Responsable.id == actor.id\n    if target_service is None or not target_service.id:\n      return False\n    service(target_service)\n    return actor.id in [target_service.Responsable.id, target_service.Pole.Responsable.id]\n  actor = person(rec.Createur)\n  if rec.Type_destinataire == \"Agent\":\n    target = person(rec.Agent_destinataire, \"Agent\")\n    if rec.Service_destinataire.id or rec.Pole_destinataire.id or target.id == actor.id:\n      return False\n    superior = context(target, rec.Service_contexte)\n    if rec.Executant.id != target.id or rec.Responsable_destinataire.id or rec.Etape != \"En cours\":\n      return False\n    permitted = allowed(actor, rec.Service_contexte)\n  elif rec.Type_destinataire == \"Service\":\n    target_service = service(rec.Service_destinataire)\n    target = target_service.Responsable\n    if rec.Agent_destinataire.id or rec.Pole_destinataire.id or rec.Service_contexte.id != target_service.id:\n      return False\n    superior = target_service.Pole.Responsable.id\n    if superior == target.id:\n      superior = dgs.id\n    if rec.Executant.id or rec.Responsable_destinataire.id != target.id or rec.Etape != \"À attribuer\":\n      return False\n    permitted = allowed(actor, target_service)\n  elif rec.Type_destinataire == \"Pôle\":\n    target_pole = pole(rec.Pole_destinataire)\n    target = target_pole.Responsable\n    if rec.Agent_destinataire.id or rec.Service_destinataire.id or rec.Service_contexte.id:\n      return False\n    superior = dgs.id\n    if rec.Executant.id or rec.Responsable_destinataire.id != target.id or rec.Etape != \"À attribuer\":\n      return False\n    permitted = allowed(actor, target_pole=target_pole)\n  else:\n    return False\n  if not permitted or rec.Superieur_direct.id != superior:\n    return False\n  associates = list(rec.Associes)\n  if len({p.id for p in associates}) != len(associates):\n    return False\n  pairs = json.loads(rec.Contextes_associes)\n  if type(pairs) is not list or len(pairs) != len(associates):\n    return False\n  contexts = {}\n  for pair in pairs:\n    if type(pair) is not list or len(pair) != 2:\n      return False\n    pid, sid = pair\n    if type(pid) is not int or pid <= 0 or pid in contexts or (sid is not None and (type(sid) is not int or sid <= 0)):\n      return False\n    contexts[pid] = sid\n  if set(contexts) != {p.id for p in associates}:\n    return False\n  for associate in associates:\n    person(associate, \"Agent\")\n    if associate.id == rec.Executant.id:\n      return False\n    if associate.id == dgs.id:\n      if contexts[associate.id] is not None or not allowed(actor):\n        return False\n      continue\n    if contexts[associate.id] is None:\n      return False\n    choices = list(SERVICES.lookupRecords(id=contexts[associate.id], Actif=True))\n    if len(choices) != 1:\n      return False\n    context(associate, choices[0])\n    if not allowed(actor, choices[0]):\n      return False\n  return True\nexcept Exception:\n  return False"
  },
  {
    "id": "ACL_attribution_perimetre",
    "type": "Bool",
    "isFormula": true,
    "formula": "try:\n  def person(p, role=None):\n    if not p.id or not p.Actif or not p.Interne_Mairie or p.Role_interne not in [\"Agent\", \"Élu\"]:\n      raise ValueError(\"person\")\n    if role and p.Role_interne != role:\n      raise ValueError(\"role\")\n    return p\n  candidates = list(INTERLOCUTEURS.lookupRecords(Actif=True, Est_DGS=True))\n  if len(candidates) != 1:\n    return False\n  dgs = person(candidates[0], \"Agent\")\n  def pole(p):\n    if not p.id or not p.Actif or person(p.Responsable, \"Agent\").id == dgs.id:\n      raise ValueError(\"pole\")\n    return p\n  def service(s):\n    if not s.id or not s.Actif:\n      raise ValueError(\"service\")\n    parent = pole(s.Pole)\n    head = parent.Responsable if s.Responsable_du_pole else s.Responsable_designe\n    if person(head, \"Agent\").id == dgs.id or s.Responsable.id != head.id:\n      raise ValueError(\"head\")\n    return s\n  def context(p, s):\n    person(p, \"Agent\")\n    if p.id == dgs.id:\n      if s.id:\n        raise ValueError(\"dgs service\")\n      return 0\n    service(s)\n    if p.id not in [m.id for m in s.Agents] + [s.Responsable.id]:\n      raise ValueError(\"membership\")\n    if s.Pole.Responsable.id == p.id:\n      return dgs.id\n    return next(pid for pid in [s.Responsable.id, s.Pole.Responsable.id, dgs.id] if pid != p.id)\n  project = rec.Action.Projet\n  if not project.id:\n    return False\n  person(project.Elu_pilote, \"Élu\")\n  person(project.Agent_pilote, \"Agent\")\n  def allowed(actor, target_service=None, target_pole=None):\n    person(actor)\n    if actor.Role_interne == \"Élu\":\n      return actor.id in [project.Elu_pilote.id] + [p.id for p in project.Elus_associes]\n    if actor.id == dgs.id:\n      return True\n    if target_pole is not None:\n      return pole(target_pole).Responsable.id == actor.id\n    if target_service is None or not target_service.id:\n      return False\n    service(target_service)\n    return actor.id in [target_service.Responsable.id, target_service.Pole.Responsable.id]\n  events = list(ACTIONS_EVENEMENTS.lookupRecords(Action=rec.Action, Revision=rec.Revision))\n  if len(events) != 1 or events[0].Operation != \"assign\":\n    return False\n  actor = person(events[0].Auteur)\n  target = person(rec.Executant, \"Agent\")\n  superior = context(target, rec.Service_contexte)\n  if rec.Etape != \"En cours\" or rec.Responsable_destinataire.id or rec.Superieur_direct.id != superior:\n    return False\n  if target.id in [p.id for p in rec.Associes] or not allowed(actor, rec.Service_contexte):\n    return False\n  if rec.Type_destinataire == \"Service\":\n    service(rec.Service_destinataire)\n    return not rec.Agent_destinataire.id and not rec.Pole_destinataire.id and rec.Service_contexte.id == rec.Service_destinataire.id\n  if rec.Type_destinataire == \"Pôle\":\n    pole(rec.Pole_destinataire)\n    return not rec.Agent_destinataire.id and not rec.Service_destinataire.id and rec.Service_contexte.id > 0 and rec.Service_contexte.Pole.id == rec.Pole_destinataire.id\n  return False\nexcept Exception:\n  return False"
  },
  {
    "id": "ACL_creation_enregistrement_coherent",
    "type": "Bool",
    "isFormula": true,
    "formula": "try:\n  import datetime\n  action = rec.Action\n  if not action.id or not action.Projet.id or rec.Revision != 1:\n    return False\n  if not isinstance(action.Action, str) or not action.Action.strip() or action.Resultat != \"\":\n    return False\n  if action.Demandee_par.id != rec.Createur.id or action.Attribuee_a.id != rec.Executant.id:\n    return False\n  if action.Statut != rec.Etape or rec.Etape not in [\"À attribuer\", \"En cours\"]:\n    return False\n  levels = list(ACTIONS_ATTRIBUTIONS.lookupRecords(Action=action))\n  if len(levels) != 1:\n    return False\n  level = levels[0]\n  if type(level.Niveau) is not int or level.Niveau != 1 or level.Attributaire.id != rec.Createur.id:\n    return False\n  recipient = rec.Executant.id or rec.Responsable_destinataire.id\n  if not recipient or level.Destinataire.id != recipient or level.Service_contexte.id != rec.Service_contexte.id:\n    return False\n  if rec.Modifie_le is None or level.Date_attribution != rec.Modifie_le:\n    return False\n  deadline = level.Echeance\n  if deadline is not None and type(deadline) is not datetime.date:\n    return False\n  if action.Echeance != deadline:\n    return False\n  members = {p.id for p in action.Projet.Agents_associes} | {action.Projet.Agent_pilote.id}\n  required = [p.id for p in rec.Associes] + ([rec.Executant.id] if rec.Executant.id else [])\n  expected_audience = {rec.Createur.id, recipient, action.Projet.Elu_pilote.id, action.Projet.Agent_pilote.id} | {p.id for p in rec.Associes}\n  if rec.Superieur_direct.id:\n    expected_audience.add(rec.Superieur_direct.id)\n  audience = [p.id for p in rec.Audience_initiale]\n  if any(type(pid) is not int or pid <= 0 for pid in expected_audience) or len(set(audience)) != len(audience) or set(audience) != expected_audience:\n    return False\n  return all(type(pid) is int and pid > 0 and pid in members for pid in required)\nexcept Exception:\n  return False"
  },
  {
    "id": "ACL_attribution_chaine_coherente",
    "type": "Bool",
    "isFormula": true,
    "formula": "try:\n  import datetime\n  events = list(ACTIONS_EVENEMENTS.lookupRecords(Action=rec.Action))\n  current = [e for e in events if e.Revision == rec.Revision]\n  initial = [e for e in events if e.Revision == 1]\n  if len(current) != 1 or len(initial) != 1 or initial[0].Operation != \"create\":\n    return False\n  event = current[0]\n  if event.Operation not in [\"create\", \"assign\"] or not rec.ACL_revision_coherente:\n    return False\n  levels = list(ACTIONS_ATTRIBUTIONS.lookupRecords(Action=rec.Action))\n  if any(type(l.Niveau) is not int for l in levels):\n    return False\n  levels.sort(key=lambda l: l.Niveau)\n  count = 1 if event.Operation == \"create\" or event.Auteur.id == rec.Createur.id else 2\n  if len(levels) != count or [l.Niveau for l in levels] != list(range(1, count + 1)):\n    return False\n  root = levels[0]\n  if levels[-1].Revision_ecriture != rec.Revision or (count == 2 and root.Revision_ecriture >= rec.Revision):\n    return False\n  if not rec.Createur.id or root.Attributaire.id != rec.Createur.id or root.Date_attribution != initial[0].Date_evenement:\n    return False\n  limit = None\n  for level in levels:\n    if type(level.Revision_ecriture) is not int or not 0 < level.Revision_ecriture <= rec.Revision:\n      return False\n    if not level.Attributaire.id or not level.Destinataire.id or level.Date_attribution is None or level.Date_attribution > rec.Modifie_le:\n      return False\n    deadline = level.Echeance\n    if deadline is not None:\n      if type(deadline) is not datetime.date or (limit is not None and deadline > limit):\n        return False\n      limit = deadline\n  if rec.Action.Echeance != limit:\n    return False\n  if event.Operation == \"create\":\n    return bool(rec.Revision == 1 and event.Auteur.id == rec.Createur.id and root.Destinataire.id == (rec.Executant.id or rec.Responsable_destinataire.id) and root.Service_contexte.id == rec.Service_contexte.id)\n  if rec.Etape != \"En cours\" or not rec.Executant.id or rec.Responsable_destinataire.id:\n    return False\n  if count == 2:\n    last = levels[-1]\n    if last.Attributaire.id != event.Auteur.id or last.Destinataire.id != rec.Executant.id or last.Service_contexte.id != rec.Service_contexte.id or last.Date_attribution != event.Date_evenement:\n      return False\n  return True\nexcept Exception:\n  return False"
  },
  {
    "id": "ACL_audience",
    "type": "RefList:INTERLOCUTEURS",
    "isFormula": true,
    "formula": "try:\n  action = rec.Action\n  circuits = list(ACTIONS_CIRCUIT.lookupRecords(Action=action))\n  if not action.id or len(circuits) != 1 or circuits[0].id != rec.id or not rec.ACL_revision_coherente:\n    return []\n  initial = [p.id for p in rec.Audience_initiale]\n  if not initial or len(set(initial)) != len(initial) or rec.Createur.id not in initial:\n    return []\n  if action.Demandee_par.id != rec.Createur.id or action.Attribuee_a.id != rec.Executant.id:\n    return []\n  project = action.Projet\n  if not project.id or not project.Elu_pilote.id or not project.Agent_pilote.id:\n    return []\n  levels = sorted(ACTIONS_ATTRIBUTIONS.lookupRecords(Action=action), key=lambda r: r.Niveau)\n  if not levels or levels[0].Attributaire.id != rec.Createur.id:\n    return []\n  if any(type(level.Niveau) is not int or level.Niveau != i + 1 for i, level in enumerate(levels)):\n    return []\n  recipient = rec.Executant.id or rec.Responsable_destinataire.id\n  people = initial + [rec.Createur.id, recipient, project.Elu_pilote.id, project.Agent_pilote.id]\n  people += [p.id for p in rec.Associes]\n  people += [level.Attributaire.id for level in levels] + [level.Destinataire.id for level in levels]\n  if rec.Superieur_direct.id:\n    people.append(rec.Superieur_direct.id)\n  if any(type(pid) is not int or pid <= 0 for pid in people):\n    return []\n  return sorted(set(people))\nexcept Exception:\n  return []"
  }
];
  function definitions(){return expected.map(column=>({...column}));}
  function exact(actual,target){return actual.type===target.type&&Boolean(actual.isFormula)===target.isFormula&&(actual.formula||"")===(target.formula||"");}
  function inspect(metadata){
    if(!metadata||!Array.isArray(metadata.tables)||!Array.isArray(metadata.columns))throw Error("Métadonnées du schéma incomplètes.");
    const source=sourceLot.inspect(metadata),attribution=attributionLot.inspect(metadata),tables=metadata.tables.filter(table=>table.tableId===tableId);
    if(tables.length!==1)return {findings:[`La table ${tableId} est absente ou dupliquée.`],missing:[],alreadyInstalled:false,readyToInstall:false,actions:[]};
    const columns=metadata.columns.filter(column=>column.parentId===tables[0].id),findings=[],missing=[];
    if(!source.alreadyInstalled)findings.push("Le lot ACTIONS doit être présent et conforme.");
    if(!attribution.alreadyInstalled)findings.push("Le lot ATTRIBUTIONS doit être présent et conforme.");
    for(const target of expected){const matches=columns.filter(column=>column.colId===target.id);if(matches.length===0)missing.push(target);else if(matches.length!==1||!exact(matches[0],target))findings.push(`Colonne incompatible : ${tableId}.${target.id}.`);}
    const readyToInstall=findings.length===0&&missing.length>0,alreadyInstalled=findings.length===0&&missing.length===0;
    return {findings,missing:missing.map(column=>column.id),alreadyInstalled,readyToInstall,actions:readyToInstall?missing.map(({id,...fields})=>["AddColumn",tableId,id,fields]):[]};
  }
  return Object.freeze({tableId,definitions,inspect});
});
