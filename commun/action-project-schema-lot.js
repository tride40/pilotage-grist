"use strict";

// Generated from the reviewed target manifest. Additive PROJETS lot only.
(function expose(root,factory){
  const api=factory(typeof module==="object"&&module.exports?require("./action-account-schema-lot.js"):root.PilotageActionAccountSchemaLot);
  if(typeof module==="object"&&module.exports)module.exports=api;else root.PilotageActionProjectSchemaLot=api;
})(typeof globalThis==="object"?globalThis:this,function factory(accountLot){
  const tableId="PROJETS",expected=[
  {
    "id": "Budget",
    "type": "Numeric",
    "isFormula": false,
    "formula": ""
  },
  {
    "id": "Revision_rattachement",
    "type": "Int",
    "isFormula": false,
    "formula": ""
  },
  {
    "id": "Evenement_rattachement",
    "type": "Ref:ACTIONS_EVENEMENTS",
    "isFormula": false,
    "formula": ""
  },
  {
    "id": "ACL_rattachement_coherent",
    "type": "Bool",
    "isFormula": true,
    "formula": "try:\n  event = rec.Evenement_rattachement\n  if not event.id or event.Action.Projet.id != rec.id or type(rec.Revision_rattachement) is not int or rec.Revision_rattachement <= 0:\n    return False\n  if type(event.Revision_rattachement_projet) is not int or event.Revision_rattachement_projet != rec.Revision_rattachement:\n    return False\n  circuits = list(ACTIONS_CIRCUIT.lookupRecords(Action=event.Action))\n  if len(circuits) != 1:\n    return False\n  circuit = circuits[0]\n  events = list(ACTIONS_EVENEMENTS.lookupRecords(Action=event.Action, Revision=circuit.Revision))\n  if len(events) != 1 or events[0].id != event.id or not circuit.ACL_revision_coherente or not circuit.ACL_evenement_notifications_coherentes:\n    return False\n  if event.Operation == \"create\":\n    if not circuit.ACL_creation_perimetre or event.Auteur.id != circuit.Createur.id:\n      return False\n    eligible = [p.id for p in circuit.Associes] + ([circuit.Executant.id] if circuit.Executant.id else [])\n  elif event.Operation == \"assign\":\n    if not circuit.ACL_attribution_perimetre or not circuit.ACL_attribution_chaine_coherente or not circuit.Executant.id:\n      return False\n    eligible = [circuit.Executant.id]\n  else:\n    return False\n  before = [p.id for p in event.Membres_projet_avant]\n  after = [p.id for p in rec.Agents_associes]\n  if not event.Auteur.id or any(type(pid) is not int or pid <= 0 for pid in before + after + eligible):\n    return False\n  if len(set(before)) != len(before) or len(set(after)) != len(after):\n    return False\n  additions = set(eligible) - set(before) - {rec.Agent_pilote.id}\n  return bool(additions and set(after) == set(before) | additions)\nexcept Exception:\n  return False"
  },
  {
    "id": "ACL_rattachement_auteur",
    "type": "Ref:INTERLOCUTEURS",
    "isFormula": true,
    "formula": "try:\n  return rec.Evenement_rattachement.Auteur\nexcept Exception:\n  return 0"
  },
  {
    "id": "ACL_membres_avant",
    "type": "RefList:INTERLOCUTEURS",
    "isFormula": true,
    "formula": "try:\n  return rec.Evenement_rattachement.Membres_projet_avant\nexcept Exception:\n  return []"
  }
],requiredExisting=[
  {
    "id": "Agent_pilote",
    "type": "Ref:INTERLOCUTEURS",
    "isFormula": false,
    "formula": ""
  },
  {
    "id": "Elu_pilote",
    "type": "Ref:INTERLOCUTEURS",
    "isFormula": false,
    "formula": ""
  },
  {
    "id": "Agents_associes",
    "type": "RefList:INTERLOCUTEURS",
    "isFormula": false,
    "formula": ""
  },
  {
    "id": "Elus_associes",
    "type": "RefList:INTERLOCUTEURS",
    "isFormula": false,
    "formula": ""
  }
];
  function definitions(){return expected.map(column=>({...column}));}
  function exact(actual,target){return actual.type===target.type&&Boolean(actual.isFormula)===target.isFormula&&(actual.formula||"")===(target.formula||"");}
  function inspect(metadata){
    if(!metadata||!Array.isArray(metadata.tables)||!Array.isArray(metadata.columns))throw Error("Métadonnées du schéma incomplètes.");
    const account=accountLot.inspect(metadata),tables=metadata.tables.filter(table=>table.tableId===tableId);
    if(tables.length!==1)return {findings:[`La table ${tableId} est absente ou dupliquée.`],missing:[],alreadyInstalled:false,readyToInstall:false,actions:[]};
    const columns=metadata.columns.filter(column=>column.parentId===tables[0].id),findings=[],missing=[];
    if(!account.alreadyInstalled)findings.push("Le lot COMPTES doit être présent et conforme.");
    for(const target of requiredExisting){const matches=columns.filter(column=>column.colId===target.id);if(matches.length!==1||!exact(matches[0],target))findings.push(`Colonne préalable incompatible : ${tableId}.${target.id}.`);}
    for(const target of expected){const matches=columns.filter(column=>column.colId===target.id);if(matches.length===0)missing.push(target);else if(matches.length!==1||!exact(matches[0],target))findings.push(`Colonne incompatible : ${tableId}.${target.id}.`);}
    const readyToInstall=findings.length===0&&missing.length>0,alreadyInstalled=findings.length===0&&missing.length===0;
    return {findings,missing:missing.map(column=>column.id),alreadyInstalled,readyToInstall,actions:readyToInstall?missing.map(({id,...fields})=>["AddColumn",tableId,id,fields]):[]};
  }
  return Object.freeze({tableId,definitions,inspect});
});
