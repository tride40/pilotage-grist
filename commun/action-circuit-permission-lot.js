"use strict";

// Generated from the reviewed final policy. ACTIONS_CIRCUIT permission lot only.
(function expose(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;else root.PilotageActionCircuitPermissionLot=api;
})(typeof globalThis==="object"?globalThis:this,function factory(){
  const tableId="ACTIONS_CIRCUIT",expected=[
  {
    "key": "owner",
    "aclFormula": "user.Access == OWNER",
    "permissionsText": "+CRUD",
    "memo": "Administration du document."
  },
  {
    "key": "create-C",
    "aclFormula": "(user.IsLoggedIn and user.Access == EDITOR and user.PilotageCompte.id > 0 and user.PilotageCompte.Actif and user.PilotageCompte.Interlocuteur > 0 and newRec.Createur == user.PilotageCompte.Interlocuteur and newRec.ACL_creation_perimetre and newRec.Version_circuit == 1 and newRec.Revision == 1 and newRec.Action > 0 and newRec.ACL_revision_coherente and newRec.ACL_evenement_auteur == user.PilotageCompte.Interlocuteur and newRec.ACL_evenement_precision == '' and newRec.Modifie_le != None and newRec.Modifie_le >= 0 and newRec.ACL_evenement_operation == 'create' and newRec.ACL_evenement_etape_avant == '' and newRec.ACL_creation_enregistrement_coherent and newRec.ACL_evenement_notifications_coherentes and newRec.Date_realisation == None and newRec.Realisee_par == 0 and newRec.Date_cloture == None and newRec.Date_annulation == None and newRec.Bilan == '' and newRec.Motif_complement == '' and newRec.Motif_annulation == '') and (newRec.ACL_attribution_chaine_coherente)",
    "permissionsText": "+C",
    "memo": "Opération métier vérifiée."
  },
  {
    "key": "assign-U",
    "aclFormula": "user.IsLoggedIn and user.Access == EDITOR and user.PilotageCompte.id > 0 and user.PilotageCompte.Actif and user.PilotageCompte.Interlocuteur > 0 and rec.Etape == 'À attribuer' and (user.PilotageCompte.Interlocuteur == rec.Createur or user.PilotageCompte.Interlocuteur == rec.Responsable_destinataire) and newRec.ACL_evenement_auteur == user.PilotageCompte.Interlocuteur and newRec.ACL_attribution_perimetre and newRec.Action == rec.Action and newRec.Createur == rec.Createur and newRec.Associes == rec.Associes and newRec.Contextes_associes == rec.Contextes_associes and newRec.Type_destinataire == rec.Type_destinataire and newRec.Agent_destinataire == rec.Agent_destinataire and newRec.Service_destinataire == rec.Service_destinataire and newRec.Pole_destinataire == rec.Pole_destinataire and rec.Version_circuit == 1 and newRec.id == rec.id and rec.Revision > 0 and newRec.Revision == rec.Revision + 1 and rec.Executant == 0 and rec.Responsable_destinataire > 0 and rec.Modifie_le != None and rec.Modifie_le >= 0 and newRec.Modifie_le >= rec.Modifie_le and newRec.ACL_revision_coherente and newRec.ACL_evenement_auteur == user.PilotageCompte.Interlocuteur and newRec.ACL_evenement_precision == '' and newRec.Modifie_le != None and newRec.Modifie_le >= 0 and newRec.ACL_evenement_operation == 'assign' and newRec.ACL_evenement_notifications_coherentes and newRec.ACL_attribution_chaine_coherente and newRec.ACL_evenement_etape_avant == rec.Etape and rec.Date_realisation == None and rec.Realisee_par == 0 and rec.Date_cloture == None and rec.Date_annulation == None and rec.Bilan == '' and rec.Motif_complement == '' and rec.Motif_annulation == '' and newRec.Action == rec.Action and newRec.Version_circuit == rec.Version_circuit and newRec.Createur == rec.Createur and newRec.Type_destinataire == rec.Type_destinataire and newRec.Agent_destinataire == rec.Agent_destinataire and newRec.Service_destinataire == rec.Service_destinataire and newRec.Pole_destinataire == rec.Pole_destinataire and newRec.Associes == rec.Associes and newRec.Contextes_associes == rec.Contextes_associes and newRec.Audience_initiale == rec.Audience_initiale and newRec.Date_realisation == rec.Date_realisation and newRec.Realisee_par == rec.Realisee_par and newRec.Date_cloture == rec.Date_cloture and newRec.Date_annulation == rec.Date_annulation and newRec.Bilan == rec.Bilan and newRec.Motif_complement == rec.Motif_complement and newRec.Motif_annulation == rec.Motif_annulation",
    "permissionsText": "+U",
    "memo": "Opération métier vérifiée."
  },
  {
    "key": "perform-U",
    "aclFormula": "user.IsLoggedIn and user.Access == EDITOR and user.PilotageCompte.id > 0 and user.PilotageCompte.Actif and user.PilotageCompte.Interlocuteur > 0 and rec.Version_circuit == 1 and rec.Revision > 0 and newRec.id == rec.id and newRec.Revision == rec.Revision + 1 and newRec.ACL_revision_coherente and newRec.ACL_evenement_notifications_coherentes and newRec.ACL_evenement_auteur == user.PilotageCompte.Interlocuteur and newRec.ACL_evenement_etape_avant == rec.Etape and newRec.Modifie_le != None and rec.Modifie_le != None and newRec.Modifie_le >= rec.Modifie_le and (rec.Etape not in ['Réalisée à examiner', 'Complément demandé'] or (rec.Date_realisation != None and rec.Realisee_par == rec.Executant and rec.Date_realisation <= rec.Modifie_le)) and newRec.ACL_evenement_operation == 'perform' and user.PilotageCompte.Interlocuteur == rec.Executant and rec.Etape in ['En cours', 'Complément demandé'] and newRec.Etape == 'Réalisée à examiner' and newRec.Date_realisation == newRec.Modifie_le and newRec.Realisee_par == user.PilotageCompte.Interlocuteur and newRec.Bilan == newRec.ACL_evenement_precision and newRec.Action == rec.Action and newRec.Version_circuit == rec.Version_circuit and newRec.Createur == rec.Createur and newRec.Executant == rec.Executant and newRec.Responsable_destinataire == rec.Responsable_destinataire and newRec.Type_destinataire == rec.Type_destinataire and newRec.Agent_destinataire == rec.Agent_destinataire and newRec.Service_destinataire == rec.Service_destinataire and newRec.Pole_destinataire == rec.Pole_destinataire and newRec.Service_contexte == rec.Service_contexte and newRec.Superieur_direct == rec.Superieur_direct and newRec.Associes == rec.Associes and newRec.Contextes_associes == rec.Contextes_associes and newRec.Audience_initiale == rec.Audience_initiale and newRec.Date_cloture == rec.Date_cloture and newRec.Date_annulation == rec.Date_annulation and newRec.Motif_complement == rec.Motif_complement and newRec.Motif_annulation == rec.Motif_annulation",
    "permissionsText": "+U",
    "memo": "Opération métier vérifiée."
  },
  {
    "key": "close-U",
    "aclFormula": "user.IsLoggedIn and user.Access == EDITOR and user.PilotageCompte.id > 0 and user.PilotageCompte.Actif and user.PilotageCompte.Interlocuteur > 0 and rec.Version_circuit == 1 and rec.Revision > 0 and newRec.id == rec.id and newRec.Revision == rec.Revision + 1 and newRec.ACL_revision_coherente and newRec.ACL_evenement_notifications_coherentes and newRec.ACL_evenement_auteur == user.PilotageCompte.Interlocuteur and newRec.ACL_evenement_etape_avant == rec.Etape and newRec.Modifie_le != None and rec.Modifie_le != None and newRec.Modifie_le >= rec.Modifie_le and (rec.Etape not in ['Réalisée à examiner', 'Complément demandé'] or (rec.Date_realisation != None and rec.Realisee_par == rec.Executant and rec.Date_realisation <= rec.Modifie_le)) and newRec.ACL_evenement_operation == 'close' and user.PilotageCompte.Interlocuteur == rec.Createur and rec.Etape == 'Réalisée à examiner' and newRec.Etape == 'Clôturée' and newRec.Date_cloture == newRec.Modifie_le and newRec.Action == rec.Action and newRec.Version_circuit == rec.Version_circuit and newRec.Createur == rec.Createur and newRec.Executant == rec.Executant and newRec.Responsable_destinataire == rec.Responsable_destinataire and newRec.Type_destinataire == rec.Type_destinataire and newRec.Agent_destinataire == rec.Agent_destinataire and newRec.Service_destinataire == rec.Service_destinataire and newRec.Pole_destinataire == rec.Pole_destinataire and newRec.Service_contexte == rec.Service_contexte and newRec.Superieur_direct == rec.Superieur_direct and newRec.Associes == rec.Associes and newRec.Contextes_associes == rec.Contextes_associes and newRec.Audience_initiale == rec.Audience_initiale and newRec.Date_realisation == rec.Date_realisation and newRec.Realisee_par == rec.Realisee_par and newRec.Date_annulation == rec.Date_annulation and newRec.Bilan == rec.Bilan and newRec.Motif_complement == rec.Motif_complement and newRec.Motif_annulation == rec.Motif_annulation",
    "permissionsText": "+U",
    "memo": "Opération métier vérifiée."
  },
  {
    "key": "request_additional_work-U",
    "aclFormula": "user.IsLoggedIn and user.Access == EDITOR and user.PilotageCompte.id > 0 and user.PilotageCompte.Actif and user.PilotageCompte.Interlocuteur > 0 and rec.Version_circuit == 1 and rec.Revision > 0 and newRec.id == rec.id and newRec.Revision == rec.Revision + 1 and newRec.ACL_revision_coherente and newRec.ACL_evenement_notifications_coherentes and newRec.ACL_evenement_auteur == user.PilotageCompte.Interlocuteur and newRec.ACL_evenement_etape_avant == rec.Etape and newRec.Modifie_le != None and rec.Modifie_le != None and newRec.Modifie_le >= rec.Modifie_le and (rec.Etape not in ['Réalisée à examiner', 'Complément demandé'] or (rec.Date_realisation != None and rec.Realisee_par == rec.Executant and rec.Date_realisation <= rec.Modifie_le)) and newRec.ACL_evenement_operation == 'request_additional_work' and user.PilotageCompte.Interlocuteur == rec.Createur and rec.Etape == 'Réalisée à examiner' and newRec.Etape == 'Complément demandé' and newRec.ACL_evenement_motif_present and newRec.Motif_complement == newRec.ACL_evenement_precision and newRec.Action == rec.Action and newRec.Version_circuit == rec.Version_circuit and newRec.Createur == rec.Createur and newRec.Executant == rec.Executant and newRec.Responsable_destinataire == rec.Responsable_destinataire and newRec.Type_destinataire == rec.Type_destinataire and newRec.Agent_destinataire == rec.Agent_destinataire and newRec.Service_destinataire == rec.Service_destinataire and newRec.Pole_destinataire == rec.Pole_destinataire and newRec.Service_contexte == rec.Service_contexte and newRec.Superieur_direct == rec.Superieur_direct and newRec.Associes == rec.Associes and newRec.Contextes_associes == rec.Contextes_associes and newRec.Audience_initiale == rec.Audience_initiale and newRec.Date_realisation == rec.Date_realisation and newRec.Realisee_par == rec.Realisee_par and newRec.Date_cloture == rec.Date_cloture and newRec.Date_annulation == rec.Date_annulation and newRec.Bilan == rec.Bilan and newRec.Motif_annulation == rec.Motif_annulation",
    "permissionsText": "+U",
    "memo": "Opération métier vérifiée."
  },
  {
    "key": "cancel-U",
    "aclFormula": "user.IsLoggedIn and user.Access == EDITOR and user.PilotageCompte.id > 0 and user.PilotageCompte.Actif and user.PilotageCompte.Interlocuteur > 0 and rec.Version_circuit == 1 and rec.Revision > 0 and newRec.id == rec.id and newRec.Revision == rec.Revision + 1 and newRec.ACL_revision_coherente and newRec.ACL_evenement_notifications_coherentes and newRec.ACL_evenement_auteur == user.PilotageCompte.Interlocuteur and newRec.ACL_evenement_etape_avant == rec.Etape and newRec.Modifie_le != None and rec.Modifie_le != None and newRec.Modifie_le >= rec.Modifie_le and (rec.Etape not in ['Réalisée à examiner', 'Complément demandé'] or (rec.Date_realisation != None and rec.Realisee_par == rec.Executant and rec.Date_realisation <= rec.Modifie_le)) and newRec.ACL_evenement_operation == 'cancel' and user.PilotageCompte.Interlocuteur == rec.Createur and rec.Etape in ['À attribuer', 'En cours', 'Complément demandé', 'Réalisée à examiner'] and newRec.Etape == 'Annulée' and newRec.Date_annulation == newRec.Modifie_le and newRec.ACL_evenement_motif_present and newRec.Motif_annulation == newRec.ACL_evenement_precision and newRec.Action == rec.Action and newRec.Version_circuit == rec.Version_circuit and newRec.Createur == rec.Createur and newRec.Executant == rec.Executant and newRec.Responsable_destinataire == rec.Responsable_destinataire and newRec.Type_destinataire == rec.Type_destinataire and newRec.Agent_destinataire == rec.Agent_destinataire and newRec.Service_destinataire == rec.Service_destinataire and newRec.Pole_destinataire == rec.Pole_destinataire and newRec.Service_contexte == rec.Service_contexte and newRec.Superieur_direct == rec.Superieur_direct and newRec.Associes == rec.Associes and newRec.Contextes_associes == rec.Contextes_associes and newRec.Audience_initiale == rec.Audience_initiale and newRec.Date_realisation == rec.Date_realisation and newRec.Realisee_par == rec.Realisee_par and newRec.Date_cloture == rec.Date_cloture and newRec.Bilan == rec.Bilan and newRec.Motif_complement == rec.Motif_complement",
    "permissionsText": "+U",
    "memo": "Opération métier vérifiée."
  },
  {
    "key": "participant-read-R",
    "aclFormula": "user.IsLoggedIn and user.Access == EDITOR and user.PilotageCompte.id > 0 and user.PilotageCompte.Actif and user.PilotageCompte.Interlocuteur > 0 and user.PilotageCompte.Interlocuteur in rec.ACL_audience",
    "permissionsText": "+R",
    "memo": "Circuit visible par un participant autorisé."
  },
  {
    "key": "everyone-else",
    "aclFormula": "",
    "permissionsText": "-CRUD",
    "memo": "Aucun autre accès."
  }
];
  // Notifications are appended after the circuit update in the same atomic
  // bundle. Their completeness is verified after the write, not while this
  // intermediate row update is being authorized.
  for(const rule of expected){
    if(["perform-U","close-U","request_additional_work-U","cancel-U"].includes(rule.key))
      rule.aclFormula=rule.aclFormula.replace(" and newRec.ACL_evenement_notifications_coherentes","");
  }
  const compact=value=>String(value||"").replace(/\s/g,"");
  const owner=rule=>["user.Access==OWNER","user.Accessin[OWNER]"].includes(compact(rule.aclFormula));
  function definitions(){return expected.map(rule=>({...rule}));}
  function ordered(snapshot,resource){return snapshot.rules.filter(rule=>rule.resource===resource.id).sort((a,b)=>a.rulePos-b.rulePos);}
  function exact(rows){return rows.length===expected.length&&rows.every((rule,index)=>Number.isFinite(rule.rulePos)&&(!index||rule.rulePos>rows[index-1].rulePos)&&rule.permissionsText===expected[index].permissionsText&&compact(rule.aclFormula)===compact(expected[index].aclFormula));}
  function staging(rows){return rows.length===2&&owner(rows[0])&&rows[0].permissionsText==="+CRUD"&&rows[1].aclFormula===""&&rows[1].permissionsText==="-CRUD"&&Number.isFinite(rows[0].rulePos)&&Number.isFinite(rows[1].rulePos)&&rows[0].rulePos<rows[1].rulePos;}
  function matches(rows){return exact([...rows].sort((a,b)=>a.rulePos-b.rulePos));}
  function inspect(snapshot){
    if(!snapshot||!Array.isArray(snapshot.resources)||!Array.isArray(snapshot.rules))throw Error("Métadonnées de permissions incomplètes.");
    const resources=snapshot.resources.filter(resource=>resource.tableId===tableId&&resource.colIds==="*");
    if(resources.length!==1)return {findings:[`${tableId} : ressource de permission absente ou dupliquée.`],readyToInstall:false,alreadyInstalled:false,actions:[]};
    const rows=ordered(snapshot,resources[0]);
    if(exact(rows))return {findings:[],readyToInstall:false,alreadyInstalled:true,actions:[]};
    if(!staging(rows))return {findings:[`${tableId} : la protection actuelle ne correspond ni au confinement préparatoire ni aux règles finales.`],readyToInstall:false,alreadyInstalled:false,actions:[]};
    let nextId=Math.max(0,...snapshot.rules.map(rule=>rule.id));
    if(!Number.isSafeInteger(nextId)||nextId>Number.MAX_SAFE_INTEGER-(expected.length-2))throw Error("Identifiants de règles invalides.");
    const fields=(rule,rulePos)=>({resource:resources[0].id,aclFormula:rule.aclFormula,permissionsText:rule.permissionsText,memo:rule.memo,rulePos});
    const actions=[["UpdateRecord","_grist_ACLRules",rows[0].id,fields(expected[0],1)]];
    for(let index=1;index<expected.length-1;index++)actions.push(["AddRecord","_grist_ACLRules",++nextId,fields(expected[index],index+1)]);
    actions.push(["UpdateRecord","_grist_ACLRules",rows[1].id,fields(expected.at(-1),expected.length)]);
    return {findings:[],readyToInstall:true,alreadyInstalled:false,actions};
  }
  return Object.freeze({tableId,definitions,inspect,matches});
});
