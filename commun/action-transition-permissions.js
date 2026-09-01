"use strict";

// Candidate ACL fragments only, NOT installed and NOT a complete access policy.
// Helpers must be formula columns administered by owners; notification/role
// integrity and live Grist validation are still prerequisites to any rollout.
(function(root,factory){
  const common=typeof module==="object"&&module.exports;
  const api=factory(common?require("./action-grist-schema.js"):root.PilotageActionGristSchema,
    common?require("./action-scoped-revision.js"):root.PilotageActionScopedRevision);
  if(common)module.exports=api;else root.PilotageActionTransitionPermissions=api;
})(typeof globalThis==="object"?globalThis:this,function(schema,revision){
  const person="user.PilotageCompte.Interlocuteur";
  const eligible=`user.IsLoggedIn and user.Access == EDITOR and user.PilotageCompte.id > 0 and user.PilotageCompte.Actif and ${person} > 0`;
  const base=[eligible,"rec.Version_circuit == 1","rec.Revision > 0","newRec.id == rec.id",
    "newRec.Revision == rec.Revision + 1","newRec.ACL_revision_coherente",
    `newRec.ACL_evenement_auteur == ${person}`,
    "newRec.ACL_evenement_etape_avant == rec.Etape",
    "newRec.Modifie_le != None","rec.Modifie_le != None","newRec.Modifie_le >= rec.Modifie_le",
    "(rec.Etape not in ['Réalisée à examiner', 'Complément demandé'] or (rec.Date_realisation != None and rec.Realisee_par == rec.Executant and rec.Date_realisation <= rec.Modifie_le))"];
  const definitions={
    perform:{changed:["Date_realisation","Realisee_par","Bilan"],conditions:[
      `${person} == rec.Executant`,"rec.Etape in ['En cours', 'Complément demandé']",
      "newRec.Etape == 'Réalisée à examiner'","newRec.Date_realisation == newRec.Modifie_le",
      `newRec.Realisee_par == ${person}`,"newRec.Bilan == newRec.ACL_evenement_precision"]},
    close:{changed:["Date_cloture"],conditions:[`${person} == rec.Createur`,
      "rec.Etape == 'Réalisée à examiner'","newRec.Etape == 'Clôturée'","newRec.Date_cloture == newRec.Modifie_le"]},
    request_additional_work:{changed:["Motif_complement"],conditions:[`${person} == rec.Createur`,
      "rec.Etape == 'Réalisée à examiner'","newRec.Etape == 'Complément demandé'",
      "newRec.ACL_evenement_motif_present","newRec.Motif_complement == newRec.ACL_evenement_precision"]},
    cancel:{changed:["Date_annulation","Motif_annulation"],conditions:[`${person} == rec.Createur`,
      "rec.Etape in ['À attribuer', 'En cours', 'Complément demandé', 'Réalisée à examiner']",
      "newRec.Etape == 'Annulée'","newRec.Date_annulation == newRec.Modifie_le",
      "newRec.ACL_evenement_motif_present","newRec.Motif_annulation == newRec.ACL_evenement_precision"]},
  };
  const columns=()=>schema.schema().find(t=>t.tableId==="ACTIONS_CIRCUIT").columns;
  function fragments(){
    const transitions={};
    for(const [operation,definition] of Object.entries(definitions)){
      const mutable=new Set(["Etape","Revision","Modifie_le",...definition.changed]);
      const frozen=columns().filter(c=>!mutable.has(c.id)).map(c=>`newRec.${c.id} == rec.${c.id}`);
      transitions[operation]=[...base,`newRec.ACL_evenement_operation == '${operation}'`,...definition.conditions,...frozen].join(" and ");
    }
    return {circuitUpdate:Object.values(transitions).map(c=>`(${c})`).join(" or "),transitions,
      eventCreate:`${eligible} and newRec.Auteur == ${person} and newRec.Operation in ['perform', 'close', 'request_additional_work', 'cancel'] and newRec.ACL_transition_autorisee`};
  }
  function helperColumns(){
    const eventTransition={tableId:"ACTIONS_EVENEMENTS",id:"ACL_transition_autorisee",type:"Bool",isFormula:true,formula:`try:
  action = rec.Action
  if not action.id or rec.Operation not in ["perform", "close", "request_additional_work", "cancel"]:
    return False
  circuits = list(ACTIONS_CIRCUIT.lookupRecords(Action=action))
  if len(circuits) != 1:
    return False
  circuit = circuits[0]
  if type(rec.Revision) is not int or rec.Revision != circuit.Revision + 1:
    return False
  if rec.Cle_evenement != "action:%s:revision:%s" % (action.id, rec.Revision):
    return False
  if not rec.Auteur.id or rec.Etape_avant != circuit.Etape or rec.Date_evenement is None or circuit.Modifie_le is None or rec.Date_evenement < circuit.Modifie_le:
    return False
  if action.Revision_circuit != circuit.Revision or action.Statut != circuit.Etape:
    return False
  if rec.Operation == "perform":
    return bool(rec.Auteur.id == circuit.Executant.id and circuit.Etape in ["En cours", "Complément demandé"] and rec.Etape_apres == "Réalisée à examiner" and isinstance(rec.Precision, str) and rec.Precision.strip())
  if rec.Auteur.id != circuit.Createur.id:
    return False
  if rec.Operation == "close":
    return bool(circuit.Etape == "Réalisée à examiner" and rec.Etape_apres == "Clôturée" and rec.Precision == "")
  if rec.Operation == "request_additional_work":
    return bool(circuit.Etape == "Réalisée à examiner" and rec.Etape_apres == "Complément demandé" and isinstance(rec.Precision, str) and rec.Precision.strip())
  return bool(circuit.Etape in ["À attribuer", "En cours", "Complément demandé", "Réalisée à examiner"] and rec.Etape_apres == "Annulée" and isinstance(rec.Precision, str) and rec.Precision.strip())
except Exception:
  return False`};
    eventTransition.formula=eventTransition.formula.replace(
      " and isinstance(rec.Precision, str) and rec.Precision.strip())",
      " and isinstance(rec.Precision, str))"
    );
    const circuitHelpers=[
      ["auteur","Ref:INTERLOCUTEURS","Auteur","0"],
      ["operation","Text","Operation",'""'],
      ["etape_avant","Text","Etape_avant",'""'],
      ["precision","Text","Precision",'""'],
      ["motif_present","Bool","Precision","False"],
      ["notifications_coherentes","Bool","ACL_notifications_coherentes","False"],
    ].map(([suffix,type,field,fallback])=>({tableId:"ACTIONS_CIRCUIT",id:`ACL_evenement_${suffix}`,type,isFormula:true,
      formula:`try:
  events = list(ACTIONS_EVENEMENTS.lookupRecords(Action=rec.Action, Revision=rec.Revision))
  if len(events) != 1:
    return ${fallback}
  value = events[0].${field}
  return ${suffix==="motif_present"?'bool(isinstance(value, str) and value.strip())':"value"}
except Exception:
  return ${fallback}`}));
    return [eventTransition,...circuitHelpers];
  }
  function checkColumns(actual){
    const expected=[...columns(),revision.helperColumns().find(c=>c.tableId==="ACTIONS_CIRCUIT"),...helperColumns()];
    const findings=[];
    for(const col of expected){
      const matches=actual.filter(c=>c.colId===col.id);
      if(matches.length!==1||matches[0].type!==col.type||matches[0].isFormula!==col.isFormula
        ||(col.formula!==undefined&&(matches[0].formula||"")!==col.formula))findings.push(`Colonne à vérifier : ${col.id}`);
    }
    for(const col of actual)if(!expected.some(c=>c.id===col.colId)&&col.colId!=="manualSort"
      &&!(col.colId.startsWith("gristHelper_")&&col.isFormula===true))findings.push(`Colonne supplémentaire à protéger : ${col.colId}`);
    // This checks exact formula definitions, not their server evaluation or ACLs.
    return findings;
  }
  return Object.freeze({fragments,helperColumns,checkColumns,integrationReady:false,securityCertified:false});
});
