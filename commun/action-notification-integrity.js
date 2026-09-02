"use strict";

// Candidate server-formula definitions. No grants, installer or API calls.
// Computes recipients from protected business sources, not private notifications.
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.PilotageActionNotificationIntegrity=api;
})(typeof globalThis==="object"?globalThis:this,function(){
  const complete=`try:
  if rec.Operation not in ["create", "assign", "perform", "close", "request_additional_work", "cancel"]:
    return False
  if not rec.ACL_revision_coherente:
    return False
  circuits = list(ACTIONS_CIRCUIT.lookupRecords(Action=rec.Action))
  if len(circuits) != 1:
    return False
  circuit = circuits[0]
  project = rec.Action.Projet
  recipient = circuit.Executant.id or circuit.Responsable_destinataire.id
  actor = rec.Auteur.id
  required = [circuit.Createur.id, recipient, project.Elu_pilote.id, project.Agent_pilote.id]
  if type(actor) is not int or actor <= 0 or any(type(pid) is not int or pid <= 0 for pid in required):
    return False
  expected = required + [p.id for p in circuit.Associes]
  superior = circuit.Superieur_direct.id
  if superior:
    expected.append(superior)
  audience = [p.id for p in circuit.Audience_initiale]
  if not audience or len(set(audience)) != len(audience):
    return False
  expected.extend(audience)
  if rec.Operation == "assign":
    chain = list(ACTIONS_ATTRIBUTIONS.lookupRecords(Action=rec.Action))
    if not chain:
      return False
    expected.extend(level.Attributaire.id for level in chain)
    expected.extend(level.Destinataire.id for level in chain)
  if rec.Operation == "cancel":
    chain = list(ACTIONS_ATTRIBUTIONS.lookupRecords(Action=rec.Action))
    if not chain:
      return False
    expected.extend(level.Attributaire.id for level in chain)
  if any(type(pid) is not int or pid <= 0 for pid in expected):
    return False
  expected = set(expected) - {actor}
  notices = list(ACTIONS_NOTIFICATIONS.lookupRecords(Evenement=rec))
  if len(notices) != len(expected):
    return False
  seen = set()
  for notice in notices:
    pid = notice.Destinataire.id
    if pid not in expected or pid in seen:
      return False
    if notice.Action.id != rec.Action.id or notice.Type_notification != rec.Operation:
      return False
    if notice.Cle_notification != "%s:recipient:%s" % (rec.Cle_evenement, pid):
      return False
    seen.add(pid)
  return seen == expected
except Exception:
  return False`;
  const valid=`try:
  event = rec.Evenement
  if not event.id or not event.ACL_revision_coherente:
    return False
  if not rec.Destinataire.id or rec.Action.id != event.Action.id:
    return False
  if rec.Type_notification != event.Operation:
    return False
  return rec.Cle_notification == "%s:recipient:%s" % (event.Cle_evenement, rec.Destinataire.id)
except Exception:
  return False`;
  function helperColumns(){return [
    {tableId:"ACTIONS_EVENEMENTS",id:"ACL_notifications_coherentes",type:"Bool",isFormula:true,formula:complete},
    {tableId:"ACTIONS_NOTIFICATIONS",id:"ACL_notification_valide",type:"Bool",isFormula:true,formula:valid},
    {tableId:"ACTIONS_NOTIFICATIONS",id:"ACL_evenement_auteur",type:"Ref:INTERLOCUTEURS",isFormula:true,
      formula:"try:\n  return rec.Evenement.Auteur\nexcept Exception:\n  return 0"},
  ];}
  const notificationCreate="user.IsLoggedIn and user.Access == EDITOR and user.PilotageCompte.id > 0 and user.PilotageCompte.Actif and user.PilotageCompte.Interlocuteur > 0 and newRec.ACL_evenement_auteur == user.PilotageCompte.Interlocuteur and newRec.ACL_notification_valide and newRec.Lue == False and newRec.Date_lecture == None";
  return Object.freeze({helperColumns,notificationCreate,integrationReady:false,securityCertified:false});
});
