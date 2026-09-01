"use strict";

// Local review manifest ONLY. No installer, API calls or complete table policy.
// In particular this must never replace existing source-table or read rules.
const schema=require("./action-grist-schema.js");
const revision=require("./action-scoped-revision.js");
const transitions=require("./action-transition-permissions.js");
const routing=require("./action-routing-permissions.js");
const entry=require("./action-entry-permissions.js");
const levels=require("./action-attribution-permissions.js");
const notices=require("./action-notification-integrity.js");
const source=require("./action-source-permissions.js");
const project=require("./action-project-permissions.js");
const readState=require("./action-notification-permissions.js");
const reads=require("./action-read-permissions.js");
const authority=require("./action-authority-permissions.js");
const modules=[revision,transitions,routing,entry,levels,notices,source,project,reads];
const eligible="user.IsLoggedIn and user.Access == EDITOR and user.PilotageCompte.id > 0 and user.PilotageCompte.Actif and user.PilotageCompte.Interlocuteur > 0";
const and=(...parts)=>parts.map(p=>`(${p})`).join(" and ");

function helpers(){
  const result=modules.flatMap(m=>m.helperColumns());
  const keys=result.map(c=>`${c.tableId}.${c.id}`);
  if(new Set(keys).size!==keys.length)throw Error("Définitions de contrôle dupliquées.");
  return result;
}

function review(columnsByTable,creationDefaults={}){
  const findings=[],definitions=helpers();
  if(!columnsByTable||typeof columnsByTable!=="object")throw Error("Métadonnées des tables requises.");
  // Extra business columns cannot bypass freezes generated from the canonical
  // circuit schema. Formula definitions must match, not just their names/types.
  for(const table of schema.schema()){
    const actual=columnsByTable[table.tableId];
    const expected=[...table.columns,...definitions.filter(c=>c.tableId===table.tableId)];
    if(!Array.isArray(actual)){findings.push(`Table à examiner : ${table.tableId}`);continue;}
    for(const col of expected){
      const matches=actual.filter(c=>c?.colId===col.id);
      if(matches.length!==1||matches[0].type!==col.type||matches[0].isFormula!==col.isFormula
        ||(matches[0].formula||"")!==(col.formula||""))findings.push(`Colonne à vérifier : ${table.tableId}.${col.id}`);
    }
    for(const col of actual)if(!col||!expected.some(c=>c.id===col.colId)&&col.colId!=="manualSort"
      &&!(col.colId?.startsWith("gristHelper_")&&col.isFormula===true))findings.push(`Colonne supplémentaire à examiner : ${table.tableId}.${col?.colId}`);
  }
  for(const col of definitions.filter(c=>["ACTIONS","PROJETS"].includes(c.tableId))){
    const matches=(columnsByTable[col.tableId]||[]).filter(c=>c?.colId===col.id);
    if(matches.length!==1||matches[0].type!==col.type||matches[0].isFormula!==true||matches[0].formula!==col.formula)
      findings.push(`Formule source à vérifier : ${col.tableId}.${col.id}`);
  }
  const active=(columnsByTable.ACTIONS||[]).filter(c=>c?.colId==="Circuit_actif");
  if(active.length!==1||active[0].type!=="Bool"||active[0].isFormula!==true
    ||active[0].formula!=="bool(ACTIONS_CIRCUIT.lookupRecords(Action=rec.id))")findings.push("Protection ACTIONS.Circuit_actif à vérifier.");
  let sources,projects;
  try{sources=source.fragments(columnsByTable.ACTIONS,creationDefaults);findings.push(...sources.findings);}catch(error){findings.push(error.message);}
  try{projects=project.fragments(columnsByTable.PROJETS);}catch(error){findings.push(error.message);}
  const authorityReview=authority.review(columnsByTable);
  findings.push(...authorityReview.findings);

  const blockers=[
    "Fusionner les lectures candidates avec les règles existantes, sans héritage de lecture trop large.",
    "Valider l'impact des protections candidates des sources d'autorité et vérifier l'appariement des comptes et l'interdiction de modifier la structure.",
    "Relire les règles existantes, leurs priorités et les permissions par colonne avant fusion.",
    "Préparer la migration contrôlée des données et des formules, sans historique inventé.",
    "Raccorder l'adaptateur sous droits limités et vérifier horodatage et concurrence sur le serveur.",
    "Les modifications d'échéance autonomes ne disposent pas encore d'une autorisation composée.",
  ];
  const rules=[];
  function add(tableId,operation,permission,condition){rules.push({tableId,operation,permission,condition});}
  if(!findings.length){
    const entries=entry.fragments(),cycle=transitions.fragments(),attribution=levels.fragments();
    add("ACTIONS","create","C",sources.create);
    add("ACTIONS","assign","U",sources.update);
    add("ACTIONS","transition","U",sources.transitionUpdate);
    add("PROJETS","attach","U",projects.projectUpdate);
    add("ACTIONS_CIRCUIT","create","C",and(entries.creation,"newRec.ACL_attribution_chaine_coherente"));
    add("ACTIONS_CIRCUIT","assign","U",entries.assignment);
    for(const [operation,condition] of Object.entries(cycle.transitions))add("ACTIONS_CIRCUIT",operation,"U",condition);
    add("ACTIONS_ATTRIBUTIONS","create","C",attribution.create);
    add("ACTIONS_ATTRIBUTIONS","assign","U",attribution.update);
    const initialEventBase=and(eligible,"newRec.Auteur == user.PilotageCompte.Interlocuteur","newRec.ACL_revision_coherente","newRec.ACL_notifications_coherentes",projects.eventCreateGuard);
    const transitionEventBase=and(eligible,"newRec.Auteur == user.PilotageCompte.Interlocuteur","newRec.ACL_transition_autorisee",projects.eventCreateGuard);
    for(const operation of ["create","assign"])
      add("ACTIONS_EVENEMENTS",operation,"C",and(initialEventBase,`newRec.Operation == '${operation}'`));
    for(const operation of Object.keys(cycle.transitions))
      add("ACTIONS_EVENEMENTS",operation,"C",and(transitionEventBase,`newRec.Operation == '${operation}'`));
    add("ACTIONS_NOTIFICATIONS","create","C",notices.notificationCreate);
    add("ACTIONS_NOTIFICATIONS","read-state","U",readState.update);
  }
  // Grist ACL expressions may only name columns that actually exist on the
  // target table. Catch dangling references before any manual policy review.
  const readRules=findings.length?[]:reads.rules();
  for(const rule of [...rules,...readRules]){
    const known=new Set(["id",...columnsByTable[rule.tableId].map(c=>c.colId)]);
    for(const match of rule.condition.matchAll(/\b(?:newRec|rec)\.([A-Za-z_]\w*)/g))
      if(!known.has(match[1]))findings.push(`Référence de permission absente : ${rule.tableId}.${match[1]}`);
  }
  if(findings.length){rules.length=0;readRules.length=0;}
  return {rules,readRules,authorityDenials:findings.length?[]:authorityReview.denials,authorityImpacts:authorityReview.impacts,
    authorityPrerequisites:authorityReview.prerequisites,helperColumns:definitions,findings,blockers,metadataCompatible:findings.length===0,
    // No output can be sent to Grist directly. A review is not certification.
    actions:[],integrationReady:false,securityCertified:false,
    ungranted:["journal-update","journal-delete","circuit-delete","attribution-delete","notification-delete","standalone-deadline-update"],
  };
}
module.exports=Object.freeze({helpers,review});
