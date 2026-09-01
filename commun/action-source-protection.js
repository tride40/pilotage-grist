"use strict";

// Preparation only. No API calls and no general editor grant.
// A protected computed marker distinguishes managed actions from legacy rows.
(function(root,factory){
  const common=typeof module==="object"&&module.exports;
  const api=factory(common?require("./action-grist-schema.js"):root.PilotageActionGristSchema);
  if(common)module.exports=api;else root.PilotageActionSourceProtection=api;
})(typeof globalThis==="object"?globalThis:this,function(schema){
  const marker={id:"Circuit_actif",type:"Bool",isFormula:true,formula:"bool(ACTIONS_CIRCUIT.lookupRecords(Action=rec.id))"};
  const condition="user.Access != OWNER and rec.Circuit_actif";
  const owner=r=>["user.Access == OWNER","user.Access in [OWNER]"].includes(r.aclFormula);
  function plan(snapshot){
    const staging=schema.inspect(snapshot);
    const findings=[...staging.findings];
    if(!staging.alreadyPrepared)findings.push("Les quatre tables de préparation doivent être présentes et protégées.");
    const source=snapshot.tables.find(t=>t.tableId==="ACTIONS");
    const helpers=snapshot.columns.filter(c=>c.parentId===source?.id&&c.colId===marker.id);
    if(helpers.length>1)findings.push("Colonne de contrôle dupliquée.");
    const helper=helpers[0];
    if(helper&&(helper.type!==marker.type||helper.isFormula!==true||helper.formula!==marker.formula))findings.push("Circuit_actif existe avec une définition différente : ne pas la remplacer.");
    const resources=snapshot.resources.filter(r=>r.tableId==="ACTIONS");
    let existing=false;
    if(resources.length){
      if(resources.length!==1||resources[0].colIds!=="*")findings.push("Des règles ACTIONS existent : examiner leur combinaison avant modification.");
      else {
        const rules=snapshot.rules.filter(r=>r.resource===resources[0].id).sort((a,b)=>a.rulePos-b.rulePos);
        // Grist may persist its neutral "Tous les autres" editor row.
        // Remove only that final empty fallback, never a conditional/grant rule.
        if(rules.length===3&&rules[2].aclFormula===""&&rules[2].permissionsText===""
          &&!(rules[2].userAttributes||"")&&Number.isFinite(rules[2].rulePos)&&rules[2].rulePos>rules[1].rulePos)rules.pop();
        existing=rules.length===2&&owner(rules[0])&&rules[0].permissionsText==="+CRUD"
          &&rules[1].aclFormula===condition&&rules[1].permissionsText==="-UD"
          &&Number.isFinite(rules[0].rulePos)&&Number.isFinite(rules[1].rulePos)&&rules[0].rulePos<rules[1].rulePos;
        if(!existing)findings.push("Les règles ACTIONS ne correspondent pas à la protection préparée : examen requis.");
      }
    }
    if(existing&&!helper)findings.push("La règle de contrôle existe sans sa colonne calculée.");
    const actions=[];
    if(!findings.length){
      if(!helper)actions.push(["AddColumn","ACTIONS",marker.id,{type:marker.type,isFormula:marker.isFormula,formula:marker.formula}]);
      if(!existing){
        const resourceId=Math.max(0,...snapshot.resources.map(r=>r.id))+1;
        const ruleId=Math.max(0,...snapshot.rules.map(r=>r.id))+1;
        if(resourceId>1000000||ruleId+1>1000000)throw Error("Identifiants de permissions hors limite.");
        actions.push(["AddRecord","_grist_ACLResources",resourceId,{tableId:"ACTIONS",colIds:"*"}]);
        actions.push(["AddRecord","_grist_ACLRules",ruleId,{resource:resourceId,aclFormula:"user.Access == OWNER",permissionsText:"+CRUD",rulePos:1}]);
        actions.push(["AddRecord","_grist_ACLRules",ruleId+1,{resource:resourceId,aclFormula:condition,permissionsText:"-UD",rulePos:2,
          memo:"Les actions reprises par le nouveau circuit ne sont plus modifiables ni supprimables directement par les non-propriétaires."}]);
      }
    }
    return {actions,findings,readyToPrepare:findings.length===0,alreadyPrepared:findings.length===0&&!!helper&&existing,
      businessWorkflowEnabled:false,securityCertified:false,
      impact:"Les non-propriétaires ne peuvent plus modifier ou supprimer une action liée au circuit. Les autres actions conservent les règles existantes. Aucun droit d’écriture métier nouveau n’est accordé."};
  }
  return Object.freeze({plan,marker:Object.freeze(marker),condition});
});
