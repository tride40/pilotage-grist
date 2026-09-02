"use strict";

// Generated from the reviewed target manifest. Additive ACTIONS_EVENEMENTS lot only.
(function expose(root,factory){
  const api=factory(typeof module==="object"&&module.exports?require("./action-circuit-schema-lot.js"):root.PilotageActionCircuitSchemaLot);
  if(typeof module==="object"&&module.exports)module.exports=api;else root.PilotageActionEventSchemaLot=api;
})(typeof globalThis==="object"?globalThis:this,function factory(circuitLot){
  const tableId="ACTIONS_EVENEMENTS",expected=[
  {
    "id": "Revision_rattachement_projet",
    "type": "Int",
    "isFormula": false,
    "formula": ""
  },
  {
    "id": "Membres_projet_avant",
    "type": "RefList:INTERLOCUTEURS",
    "isFormula": false,
    "formula": ""
  },
  {
    "id": "ACL_revision_coherente",
    "type": "Bool",
    "isFormula": true,
    "formula": "try:\n  if type(rec.Revision) is not int or rec.Revision < 1 or not rec.Action.id:\n    return False\n  circuits = list(ACTIONS_CIRCUIT.lookupRecords(Action=rec.Action))\n  if len(circuits) != 1:\n    return False\n  circuit = circuits[0]\n  peers = list(ACTIONS_EVENEMENTS.lookupRecords(Action=rec.Action, Revision=rec.Revision))\n  return bool(len(peers) == 1 and peers[0].id == rec.id and circuit.ACL_revision_coherente and circuit.Revision == rec.Revision and circuit.Etape == rec.Etape_apres and circuit.Modifie_le == rec.Date_evenement)\nexcept Exception:\n  return False"
  },
  {
    "id": "ACL_notifications_coherentes",
    "type": "Bool",
    "isFormula": true,
    "formula": "try:\n  if rec.Operation not in [\"create\", \"assign\", \"perform\", \"close\", \"request_additional_work\", \"cancel\"]:\n    return False\n  if not rec.ACL_revision_coherente:\n    return False\n  circuits = list(ACTIONS_CIRCUIT.lookupRecords(Action=rec.Action))\n  if len(circuits) != 1:\n    return False\n  circuit = circuits[0]\n  project = rec.Action.Projet\n  recipient = circuit.Executant.id or circuit.Responsable_destinataire.id\n  actor = rec.Auteur.id\n  required = [circuit.Createur.id, recipient, project.Elu_pilote.id, project.Agent_pilote.id]\n  if type(actor) is not int or actor <= 0 or any(type(pid) is not int or pid <= 0 for pid in required):\n    return False\n  expected = required + [p.id for p in circuit.Associes]\n  superior = circuit.Superieur_direct.id\n  if superior:\n    expected.append(superior)\n  if rec.Operation == \"assign\":\n    audience = [p.id for p in circuit.Audience_initiale]\n    if not audience or len(set(audience)) != len(audience):\n      return False\n    chain = list(ACTIONS_ATTRIBUTIONS.lookupRecords(Action=rec.Action))\n    if not chain:\n      return False\n    expected.extend(audience)\n    expected.extend(level.Attributaire.id for level in chain)\n    expected.extend(level.Destinataire.id for level in chain)\n  if rec.Operation == \"cancel\":\n    chain = list(ACTIONS_ATTRIBUTIONS.lookupRecords(Action=rec.Action))\n    if not chain:\n      return False\n    expected.extend(level.Attributaire.id for level in chain)\n  if any(type(pid) is not int or pid <= 0 for pid in expected):\n    return False\n  expected = set(expected) - {actor}\n  notices = list(ACTIONS_NOTIFICATIONS.lookupRecords(Evenement=rec))\n  if len(notices) != len(expected):\n    return False\n  seen = set()\n  for notice in notices:\n    pid = notice.Destinataire.id\n    if pid not in expected or pid in seen:\n      return False\n    if notice.Action.id != rec.Action.id or notice.Type_notification != rec.Operation:\n      return False\n    if notice.Cle_notification != \"%s:recipient:%s\" % (rec.Cle_evenement, pid):\n      return False\n    seen.add(pid)\n  return seen == expected\nexcept Exception:\n  return False"
  },
  {
    "id": "ACL_rattachement_valide",
    "type": "Bool",
    "isFormula": true,
    "formula": "try:\n  revision = rec.Revision_rattachement_projet\n  if type(revision) is not int or revision < 0:\n    return False\n  if revision == 0:\n    return len(list(rec.Membres_projet_avant)) == 0\n  project = rec.Action.Projet\n  return bool(project.id and project.Revision_rattachement == revision and project.Evenement_rattachement.id == rec.id and project.ACL_rattachement_coherent)\nexcept Exception:\n  return False"
  },
  {
    "id": "ACL_transition_autorisee",
    "type": "Bool",
    "isFormula": true,
    "formula": "try:\n  action = rec.Action\n  if not action.id or rec.Operation not in [\"perform\", \"close\", \"request_additional_work\", \"cancel\"]:\n    return False\n  circuits = list(ACTIONS_CIRCUIT.lookupRecords(Action=action))\n  if len(circuits) != 1:\n    return False\n  circuit = circuits[0]\n  if type(rec.Revision) is not int or rec.Revision != circuit.Revision + 1:\n    return False\n  if rec.Cle_evenement != \"action:%s:revision:%s\" % (action.id, rec.Revision):\n    return False\n  if not rec.Auteur.id or rec.Etape_avant != circuit.Etape or rec.Date_evenement is None or circuit.Modifie_le is None or rec.Date_evenement < circuit.Modifie_le:\n    return False\n  if action.Revision_circuit != circuit.Revision or action.Statut != circuit.Etape:\n    return False\n  if rec.Operation == \"perform\":\n    return bool(rec.Auteur.id == circuit.Executant.id and circuit.Etape in [\"En cours\", \"Complément demandé\"] and rec.Etape_apres == \"Réalisée à examiner\" and isinstance(rec.Precision, str) and rec.Precision.strip())\n  if rec.Auteur.id != circuit.Createur.id:\n    return False\n  if rec.Operation == \"close\":\n    return bool(circuit.Etape == \"Réalisée à examiner\" and rec.Etape_apres == \"Clôturée\" and rec.Precision == \"\")\n  if rec.Operation == \"request_additional_work\":\n    return bool(circuit.Etape == \"Réalisée à examiner\" and rec.Etape_apres == \"Complément demandé\" and isinstance(rec.Precision, str) and rec.Precision.strip())\n  return bool(circuit.Etape in [\"À attribuer\", \"En cours\", \"Complément demandé\", \"Réalisée à examiner\"] and rec.Etape_apres == \"Annulée\" and isinstance(rec.Precision, str) and rec.Precision.strip())\nexcept Exception:\n  return False"
  },
  {
    "id": "ACL_audience",
    "type": "RefList:INTERLOCUTEURS",
    "isFormula": true,
    "formula": "try:\n  return rec.Action.ACL_audience if rec.Action.id else []\nexcept Exception:\n  return []"
  }
];
  const notificationColumn=expected.find(column=>column.id==="ACL_notifications_coherentes");
  notificationColumn.formula=notificationColumn.formula.replace(
    '  if rec.Operation == "assign":\n    audience = [p.id for p in circuit.Audience_initiale]\n    if not audience or len(set(audience)) != len(audience):\n      return False\n    chain = list(ACTIONS_ATTRIBUTIONS.lookupRecords(Action=rec.Action))\n    if not chain:\n      return False\n    expected.extend(audience)',
    '  audience = [p.id for p in circuit.Audience_initiale]\n  if not audience or len(set(audience)) != len(audience):\n    return False\n  expected.extend(audience)\n  if rec.Operation == "assign":\n    chain = list(ACTIONS_ATTRIBUTIONS.lookupRecords(Action=rec.Action))\n    if not chain:\n      return False');
  expected.find(column=>column.id==="ACL_transition_autorisee").formula=expected.find(column=>column.id==="ACL_transition_autorisee").formula.replace(
    " and isinstance(rec.Precision, str) and rec.Precision.strip())",
    " and isinstance(rec.Precision, str))"
  );
  function definitions(){return expected.map(column=>({...column}));}
  function exact(actual,target){return actual.type===target.type&&Boolean(actual.isFormula)===target.isFormula&&(actual.formula||"")===(target.formula||"");}
  function inspect(metadata){
    if(!metadata||!Array.isArray(metadata.tables)||!Array.isArray(metadata.columns))throw Error("Métadonnées du schéma incomplètes.");
    const circuit=circuitLot.inspect(metadata),tables=metadata.tables.filter(table=>table.tableId===tableId);
    if(tables.length!==1)return {findings:[`La table ${tableId} est absente ou dupliquée.`],missing:[],alreadyInstalled:false,readyToInstall:false,actions:[]};
    const columns=metadata.columns.filter(column=>column.parentId===tables[0].id),findings=[],missing=[];
    if(!circuit.alreadyInstalled)findings.push("Le lot CIRCUIT doit être présent et conforme.");
    for(const target of expected){const matches=columns.filter(column=>column.colId===target.id);if(matches.length===0)missing.push(target);else if(matches.length!==1||!exact(matches[0],target))findings.push(`Colonne incompatible : ${tableId}.${target.id}.`);}
    const readyToInstall=findings.length===0&&missing.length>0,alreadyInstalled=findings.length===0&&missing.length===0;
    return {findings,missing:missing.map(column=>column.id),alreadyInstalled,readyToInstall,actions:readyToInstall?missing.map(({id,...fields})=>["AddColumn",tableId,id,fields]):[]};
  }
  return Object.freeze({tableId,definitions,inspect});
});
