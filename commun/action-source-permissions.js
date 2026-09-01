"use strict";
// Candidate source ACLs, never installed here. Metadata must be freshly audited.
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.PilotageActionSourcePermissions=api;})(typeof globalThis==="object"?globalThis:this,function(){
  const required={Action:"Text",Projet:"Ref:PROJETS",Demandee_par:"Ref:INTERLOCUTEURS",Attribuee_a:"Ref:INTERLOCUTEURS",Statut:"Choice",Date_creation:"Date",Echeance:"Date",Resultat:"Text",Revision_circuit:"Int"};
  const sourceFormula=`try:
  import datetime
  circuits = list(ACTIONS_CIRCUIT.lookupRecords(Action=rec))
  if len(circuits) != 1:
    return False
  circuit = circuits[0]
  events = list(ACTIONS_EVENEMENTS.lookupRecords(Action=rec, Revision=circuit.Revision))
  if len(events) != 1 or not circuit.ACL_revision_coherente or not circuit.ACL_evenement_notifications_coherentes:
    return False
  event = events[0]
  if type(rec.Revision_circuit) is not int or rec.Revision_circuit != circuit.Revision:
    return False
  if rec.Demandee_par.id != circuit.Createur.id or rec.Attribuee_a.id != circuit.Executant.id or rec.Statut != circuit.Etape:
    return False
  if event.Operation == "create":
    return bool(circuit.Revision == 1 and event.Auteur.id == circuit.Createur.id and circuit.ACL_creation_perimetre and circuit.ACL_creation_enregistrement_coherent and type(rec.Date_creation) is datetime.date)
  if event.Operation == "assign":
    return bool(circuit.Etape == "En cours" and circuit.Executant.id > 0 and circuit.ACL_attribution_perimetre and circuit.ACL_attribution_chaine_coherente)
  return event.Operation in ["perform", "close", "request_additional_work", "cancel"]
except Exception:
  return False`;
  function helperColumns(){return [
    {tableId:"ACTIONS",id:"ACL_circuit_source_coherent",type:"Bool",isFormula:true,formula:sourceFormula},
    ...[["auteur","Ref:INTERLOCUTEURS","Auteur","0"],["operation","Text","Operation",'""']].map(([suffix,type,field,fallback])=>({tableId:"ACTIONS",id:`ACL_circuit_${suffix}`,type,isFormula:true,formula:`try:
  circuits = list(ACTIONS_CIRCUIT.lookupRecords(Action=rec))
  if len(circuits) != 1:
    return ${fallback}
  events = list(ACTIONS_EVENEMENTS.lookupRecords(Action=rec, Revision=circuits[0].Revision))
  return events[0].${field} if len(events) == 1 else ${fallback}
except Exception:
  return ${fallback}`})),
  ];}
  function literal(value){
    if(value===null)return "None";
    if(typeof value==="boolean")return value?"True":"False";
    if(typeof value==="string")return JSON.stringify(value);
    if(typeof value==="number"&&Number.isFinite(value))return String(value);
    throw Error("Valeur initiale non prise en charge : revue manuelle requise.");
  }
  function fragments(columns,creationDefaults={}){
    if(!Array.isArray(columns)||columns.some(c=>!c||!/^[_A-Za-z][_A-Za-z0-9]*$/.test(c.colId)||typeof c.isFormula!=="boolean")
      ||new Set(columns.map(c=>c.colId)).size!==columns.length)throw Error("Métadonnées ACTIONS invalides.");
    for(const [id,type] of Object.entries(required)){
      const c=columns.find(c=>c.colId===id);
      if(!c||c.type!==type||c.isFormula)throw Error(`Colonne source incompatible : ${id}`);
    }
    const data=columns.filter(c=>!c.isFormula&&c.colId!=="manualSort");
    // Extra data columns are frozen on update. Creation requires reviewed
    // defaults; never invent defaults for user-specific columns.
    const extra=data.filter(c=>!Object.hasOwn(required,c.colId));
    const findings=extra.filter(c=>!Object.hasOwn(creationDefaults,c.colId)).map(c=>`Valeur initiale à valider : ${c.colId}`);
    const person="user.PilotageCompte.Interlocuteur";
    const base=`user.IsLoggedIn and user.Access == EDITOR and user.PilotageCompte.id > 0 and user.PilotageCompte.Actif and ${person} > 0 and newRec.ACL_circuit_auteur == ${person} and newRec.ACL_circuit_source_coherent`;
    const freeze=["id",...data.filter(c=>!["Attribuee_a","Statut","Echeance","Revision_circuit"].includes(c.colId)).map(c=>c.colId)].map(id=>`newRec.${id} == rec.${id}`);
    const transitionFreeze=["id",...data.filter(c=>!["Statut","Revision_circuit"].includes(c.colId)).map(c=>c.colId)].map(id=>`newRec.${id} == rec.${id}`);
    return {
      create:findings.length?null:[base,"newRec.ACL_circuit_operation == 'create'","newRec.Revision_circuit == 1",`newRec.Demandee_par == ${person}`,...extra.map(c=>`newRec.${c.colId} == ${literal(creationDefaults[c.colId])}`)].join(" and "),
      update:[base,"rec.Circuit_actif","rec.Revision_circuit > 0","newRec.Revision_circuit == rec.Revision_circuit + 1","rec.Attribuee_a == 0","rec.Statut == 'À attribuer'","newRec.Statut == 'En cours'","newRec.Attribuee_a > 0","newRec.ACL_circuit_operation == 'assign'",...freeze].join(" and "),
      transitionUpdate:[base,"rec.Circuit_actif","rec.Revision_circuit > 0","newRec.Revision_circuit == rec.Revision_circuit + 1","newRec.ACL_circuit_operation in ['perform', 'close', 'request_additional_work', 'cancel']",...transitionFreeze].join(" and "),
      delete:"False",findings,
    };
  }
  return Object.freeze({required:Object.freeze(required),helperColumns,fragments,integrationReady:false,securityCertified:false});
});
