"use strict";

// Proposed recipient permissions, NOT automatically installed.
// Trust anchor: an owner-managed PILOTAGE_COMPTES row mapped by user.Email.
// Does not grant access to the source action or its event journal.
(function(root,factory){
  const common=typeof module==="object"&&module.exports;
  const api=factory();
  if(common)module.exports=api;else root.PilotageActionNotificationPermissions=api;
})(typeof globalThis==="object"?globalThis:this,function(){
  const eligible="user.IsLoggedIn and user.Access == EDITOR and user.PilotageCompte.id > 0 and user.PilotageCompte.Actif and user.PilotageCompte.Interlocuteur > 0";
  const read=`${eligible} and rec.Destinataire == user.PilotageCompte.Interlocuteur`;
  // manualSort is not exposed as a valid column in this document's ACL editor.
  // Do not include it in the user-facing rule; business fields remain frozen.
  const immutable=["id","Action","Evenement","Cle_notification","Destinataire","Type_notification"];
  const update=`${read} and ${immutable.map(k=>`newRec.${k} == rec.${k}`).join(" and ")} and ((newRec.Lue == False and newRec.Date_lecture == None) or (newRec.Lue == True and newRec.Date_lecture != None and newRec.Date_lecture >= 0))`;
  function rules(){return [
    {aclFormula:"user.Access == OWNER",permissionsText:"+CRUD"},
    {aclFormula:read,permissionsText:"+R"},
    {aclFormula:update,permissionsText:"+U"},
    {aclFormula:"",permissionsText:"-CRUD"},
  ];}
  function checkColumns(columns,definition){
    const findings=[];
    for(const expected of definition){
      const matches=columns.filter(c=>c.colId===expected.id);
      if(matches.length!==1||matches[0].type!==expected.type||matches[0].isFormula!==false||(matches[0].formula||"")!=="")findings.push(`Colonne incompatible : ${expected.id}`);
    }
    for(const col of columns)if(!definition.some(d=>d.id===col.colId)&&col.colId!=="manualSort"&&!(col.colId.startsWith("gristHelper_")&&col.isFormula===true))findings.push(`Colonne supplémentaire à protéger : ${col.colId}`);
    return findings;
  }
  const compact=s=>typeof s==="string"?s.replace(/\s/g,""):"";
  function matches(rows,{readOnly=false}={}){
    const expected=rules().filter((_,i)=>!readOnly||i!==2);
    return rows.length===expected.length&&rows.every((r,i)=>Number.isFinite(r.rulePos)&&(!i||r.rulePos>rows[i-1].rulePos)
      &&r.permissionsText===expected[i].permissionsText
      &&(i===0?["user.Access==OWNER","user.Accessin[OWNER]"].includes(compact(r.aclFormula)):compact(r.aclFormula)===compact(expected[i].aclFormula)));
  }
  return Object.freeze({rules,read,update,immutable:Object.freeze(immutable),checkColumns,matches});
});
