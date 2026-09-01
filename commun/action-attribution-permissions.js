"use strict";
// Candidate server checks. No installation or permission grants.
(function(root,factory){
  const api=factory(typeof module==="object"&&module.exports?require("./action-grist-schema.js"):root.PilotageActionGristSchema);
  if(typeof module==="object"&&module.exports)module.exports=api;else root.PilotageActionAttributionPermissions=api;
})(typeof globalThis==="object"?globalThis:this,function(schema){
  const chain=`try:
  import datetime
  events = list(ACTIONS_EVENEMENTS.lookupRecords(Action=rec.Action))
  current = [e for e in events if e.Revision == rec.Revision]
  initial = [e for e in events if e.Revision == 1]
  if len(current) != 1 or len(initial) != 1 or initial[0].Operation != "create":
    return False
  event = current[0]
  if event.Operation not in ["create", "assign"] or not rec.ACL_revision_coherente:
    return False
  levels = list(ACTIONS_ATTRIBUTIONS.lookupRecords(Action=rec.Action))
  if any(type(l.Niveau) is not int for l in levels):
    return False
  levels.sort(key=lambda l: l.Niveau)
  count = 1 if event.Operation == "create" or event.Auteur.id == rec.Createur.id else 2
  if len(levels) != count or [l.Niveau for l in levels] != list(range(1, count + 1)):
    return False
  root = levels[0]
  if levels[-1].Revision_ecriture != rec.Revision or (count == 2 and root.Revision_ecriture >= rec.Revision):
    return False
  if not rec.Createur.id or root.Attributaire.id != rec.Createur.id or root.Date_attribution != initial[0].Date_evenement:
    return False
  limit = None
  for level in levels:
    if type(level.Revision_ecriture) is not int or not 0 < level.Revision_ecriture <= rec.Revision:
      return False
    if not level.Attributaire.id or not level.Destinataire.id or level.Date_attribution is None or level.Date_attribution > rec.Modifie_le:
      return False
    deadline = level.Echeance
    if deadline is not None:
      if type(deadline) is not datetime.date or (limit is not None and deadline > limit):
        return False
      limit = deadline
  if rec.Action.Echeance != limit:
    return False
  if event.Operation == "create":
    return bool(rec.Revision == 1 and event.Auteur.id == rec.Createur.id and root.Destinataire.id == (rec.Executant.id or rec.Responsable_destinataire.id) and root.Service_contexte.id == rec.Service_contexte.id)
  if rec.Etape != "En cours" or not rec.Executant.id or rec.Responsable_destinataire.id:
    return False
  if count == 2:
    last = levels[-1]
    if last.Attributaire.id != event.Auteur.id or last.Destinataire.id != rec.Executant.id or last.Service_contexte.id != rec.Service_contexte.id or last.Date_attribution != event.Date_evenement:
      return False
  return True
except Exception:
  return False`;
  const coherent=`try:
  circuits = list(ACTIONS_CIRCUIT.lookupRecords(Action=rec.Action))
  if len(circuits) != 1 or not circuits[0].ACL_attribution_chaine_coherente:
    return False
  if type(rec.Revision_ecriture) is not int or rec.Revision_ecriture != circuits[0].Revision:
    return False
  peers = list(ACTIONS_ATTRIBUTIONS.lookupRecords(Action=rec.Action, Niveau=rec.Niveau))
  return bool(len(peers) == 1 and peers[0].id == rec.id)
except Exception:
  return False`;
  function helperColumns(){return [
    {tableId:"ACTIONS_CIRCUIT",id:"ACL_attribution_chaine_coherente",type:"Bool",isFormula:true,formula:chain},
    {tableId:"ACTIONS_ATTRIBUTIONS",id:"ACL_niveau_coherent",type:"Bool",isFormula:true,formula:coherent},
    ...[["auteur","Ref:INTERLOCUTEURS","Auteur","0"],["operation","Text","Operation",'""']].map(([suffix,type,field,fallback])=>({
      tableId:"ACTIONS_ATTRIBUTIONS",id:`ACL_evenement_${suffix}`,type,isFormula:true,formula:`try:
  circuits = list(ACTIONS_CIRCUIT.lookupRecords(Action=rec.Action))
  if len(circuits) != 1:
    return ${fallback}
  events = list(ACTIONS_EVENEMENTS.lookupRecords(Action=rec.Action, Revision=circuits[0].Revision))
  return events[0].${field} if len(events) == 1 else ${fallback}
except Exception:
  return ${fallback}`})),
  ];}
  function fragments(){
    const person="user.PilotageCompte.Interlocuteur";
    const common=`user.IsLoggedIn and user.Access == EDITOR and user.PilotageCompte.id > 0 and user.PilotageCompte.Actif and ${person} > 0 and newRec.Attributaire == ${person} and newRec.ACL_evenement_auteur == ${person} and newRec.ACL_niveau_coherent`;
    const frozen=["id",...schema.schema().find(t=>t.tableId==="ACTIONS_ATTRIBUTIONS").columns.map(c=>c.id).filter(id=>!["Echeance","Revision_ecriture"].includes(id))]
      .map(id=>`newRec.${id} == rec.${id}`).join(" and ");
    return {
      create:`${common} and ((newRec.ACL_evenement_operation == 'create' and newRec.Niveau == 1) or (newRec.ACL_evenement_operation == 'assign' and newRec.Niveau == 2))`,
      update:`${common} and rec.Attributaire == ${person} and rec.Niveau == 1 and rec.Revision_ecriture > 0 and newRec.Revision_ecriture > rec.Revision_ecriture and newRec.ACL_evenement_operation == 'assign' and (rec.Echeance == None or newRec.Echeance != None) and ${frozen}`,
      delete:"False",
    };
  }
  return Object.freeze({helperColumns,fragments,integrationReady:false,securityCertified:false});
});
