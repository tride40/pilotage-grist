"use strict";

// Generated from the reviewed authority policy. No business rows are touched.
(function expose(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;else root.PilotageActionAuthorityPermissionLot=api;
})(typeof globalThis==="object"?globalThis:this,function factory(){
  const tableIds=["INTERLOCUTEURS","SERVICES","POLES","PROJETS"],expected=[
  {
    "tableId": "INTERLOCUTEURS",
    "colIds": "*",
    "rules": [
      {
        "key": "owner",
        "aclFormula": "user.Access == OWNER",
        "permissionsText": "+CRUD"
      },
      {
        "key": "administrator",
        "aclFormula": "user.IsLoggedIn and user.Access == EDITOR and user.PilotageCompte.id > 0 and user.PilotageCompte.Actif and user.PilotageCompte.Administrateur == True",
        "permissionsText": "+CRUD"
      },
      {
        "key": "editor",
        "aclFormula": "user.IsLoggedIn and user.Access == EDITOR",
        "permissionsText": "+RU"
      },
      {
        "key": "reader",
        "aclFormula": "user.IsLoggedIn and user.Access in [EDITOR, VIEWER]",
        "permissionsText": "+R"
      },
      {
        "key": "everyone-else",
        "aclFormula": "",
        "permissionsText": "-CRUD"
      }
    ]
  },
  {
    "tableId": "INTERLOCUTEURS",
    "colIds": "Actif,Interne_Mairie,Role_interne,Est_DGS",
    "rules": [
      {
        "key": "owner",
        "aclFormula": "user.Access == OWNER",
        "permissionsText": "+U"
      },
      {
        "key": "administrator",
        "aclFormula": "user.IsLoggedIn and user.Access == EDITOR and user.PilotageCompte.id > 0 and user.PilotageCompte.Actif and user.PilotageCompte.Administrateur == True",
        "permissionsText": "+U"
      },
      {
        "key": "unchanged-editor",
        "aclFormula": "user.IsLoggedIn and user.Access == EDITOR and newRec.Actif == rec.Actif and newRec.Interne_Mairie == rec.Interne_Mairie and newRec.Role_interne == rec.Role_interne and newRec.Est_DGS == rec.Est_DGS",
        "permissionsText": "+U"
      },
      {
        "key": "everyone-else",
        "aclFormula": "",
        "permissionsText": "-U"
      }
    ]
  },
  {
    "tableId": "SERVICES",
    "colIds": "*",
    "rules": [
      {
        "key": "owner",
        "aclFormula": "user.Access == OWNER",
        "permissionsText": "+CRUD"
      },
      {
        "key": "administrator",
        "aclFormula": "user.IsLoggedIn and user.Access == EDITOR and user.PilotageCompte.id > 0 and user.PilotageCompte.Actif and user.PilotageCompte.Administrateur == True",
        "permissionsText": "+CRU"
      },
      {
        "key": "editor",
        "aclFormula": "user.IsLoggedIn and user.Access == EDITOR",
        "permissionsText": "+RU"
      },
      {
        "key": "reader",
        "aclFormula": "user.IsLoggedIn and user.Access in [EDITOR, VIEWER]",
        "permissionsText": "+R"
      },
      {
        "key": "everyone-else",
        "aclFormula": "",
        "permissionsText": "-CRUD"
      }
    ]
  },
  {
    "tableId": "SERVICES",
    "colIds": "Actif,Pole,Responsable_du_pole,Responsable_designe,Agents",
    "rules": [
      {
        "key": "owner",
        "aclFormula": "user.Access == OWNER",
        "permissionsText": "+U"
      },
      {
        "key": "administrator",
        "aclFormula": "user.IsLoggedIn and user.Access == EDITOR and user.PilotageCompte.id > 0 and user.PilotageCompte.Actif and user.PilotageCompte.Administrateur == True",
        "permissionsText": "+U"
      },
      {
        "key": "unchanged-editor",
        "aclFormula": "user.IsLoggedIn and user.Access == EDITOR and newRec.Actif == rec.Actif and newRec.Pole == rec.Pole and newRec.Responsable_du_pole == rec.Responsable_du_pole and newRec.Responsable_designe == rec.Responsable_designe and newRec.Agents == rec.Agents",
        "permissionsText": "+U"
      },
      {
        "key": "everyone-else",
        "aclFormula": "",
        "permissionsText": "-U"
      }
    ]
  },
  {
    "tableId": "POLES",
    "colIds": "*",
    "rules": [
      {
        "key": "owner",
        "aclFormula": "user.Access == OWNER",
        "permissionsText": "+CRUD"
      },
      {
        "key": "administrator",
        "aclFormula": "user.IsLoggedIn and user.Access == EDITOR and user.PilotageCompte.id > 0 and user.PilotageCompte.Actif and user.PilotageCompte.Administrateur == True",
        "permissionsText": "+CRU"
      },
      {
        "key": "editor",
        "aclFormula": "user.IsLoggedIn and user.Access == EDITOR",
        "permissionsText": "+RU"
      },
      {
        "key": "reader",
        "aclFormula": "user.IsLoggedIn and user.Access in [EDITOR, VIEWER]",
        "permissionsText": "+R"
      },
      {
        "key": "everyone-else",
        "aclFormula": "",
        "permissionsText": "-CRUD"
      }
    ]
  },
  {
    "tableId": "POLES",
    "colIds": "Actif,Responsable",
    "rules": [
      {
        "key": "owner",
        "aclFormula": "user.Access == OWNER",
        "permissionsText": "+U"
      },
      {
        "key": "administrator",
        "aclFormula": "user.IsLoggedIn and user.Access == EDITOR and user.PilotageCompte.id > 0 and user.PilotageCompte.Actif and user.PilotageCompte.Administrateur == True",
        "permissionsText": "+U"
      },
      {
        "key": "unchanged-editor",
        "aclFormula": "user.IsLoggedIn and user.Access == EDITOR and newRec.Actif == rec.Actif and newRec.Responsable == rec.Responsable",
        "permissionsText": "+U"
      },
      {
        "key": "everyone-else",
        "aclFormula": "",
        "permissionsText": "-U"
      }
    ]
  },
  {
    "tableId": "PROJETS",
    "colIds": "*",
    "rules": [
      {
        "key": "owner",
        "aclFormula": "user.Access == OWNER",
        "permissionsText": "+CRUD"
      },
      {
        "key": "administrator",
        "aclFormula": "user.IsLoggedIn and user.Access == EDITOR and user.PilotageCompte.id > 0 and user.PilotageCompte.Actif and user.PilotageCompte.Administrateur == True",
        "permissionsText": "+CRU"
      },
      {
        "key": "editor",
        "aclFormula": "user.IsLoggedIn and user.Access == EDITOR",
        "permissionsText": "+RU"
      },
      {
        "key": "reader",
        "aclFormula": "user.IsLoggedIn and user.Access in [EDITOR, VIEWER]",
        "permissionsText": "+R"
      },
      {
        "key": "everyone-else",
        "aclFormula": "",
        "permissionsText": "-CRUD"
      }
    ]
  },
  {
    "tableId": "PROJETS",
    "colIds": "Elu_pilote,Agent_pilote,Elus_associes",
    "rules": [
      {
        "key": "owner",
        "aclFormula": "user.Access == OWNER",
        "permissionsText": "+U"
      },
      {
        "key": "administrator",
        "aclFormula": "user.IsLoggedIn and user.Access == EDITOR and user.PilotageCompte.id > 0 and user.PilotageCompte.Actif and user.PilotageCompte.Administrateur == True",
        "permissionsText": "+U"
      },
      {
        "key": "unchanged-editor",
        "aclFormula": "user.IsLoggedIn and user.Access == EDITOR and newRec.Elu_pilote == rec.Elu_pilote and newRec.Agent_pilote == rec.Agent_pilote and newRec.Elus_associes == rec.Elus_associes",
        "permissionsText": "+U"
      },
      {
        "key": "everyone-else",
        "aclFormula": "",
        "permissionsText": "-U"
      }
    ]
  },
  {
    "tableId": "PROJETS",
    "colIds": "Agents_associes,Revision_rattachement,Evenement_rattachement",
    "rules": [
      {
        "key": "owner",
        "aclFormula": "user.Access == OWNER",
        "permissionsText": "+U"
      },
      {
        "key": "administrator",
        "aclFormula": "user.IsLoggedIn and user.Access == EDITOR and user.PilotageCompte.id > 0 and user.PilotageCompte.Actif and user.PilotageCompte.Administrateur == True",
        "permissionsText": "+U"
      },
      {
        "key": "circuit-attach",
        "aclFormula": "user.IsLoggedIn and user.Access == EDITOR and user.PilotageCompte.id > 0 and user.PilotageCompte.Actif and user.PilotageCompte.Interlocuteur > 0 and newRec.ACL_rattachement_auteur == user.PilotageCompte.Interlocuteur and rec.Revision_rattachement >= 0 and newRec.Revision_rattachement == rec.Revision_rattachement + 1 and newRec.Evenement_rattachement > 0 and newRec.Evenement_rattachement != rec.Evenement_rattachement and newRec.ACL_rattachement_coherent and newRec.ACL_membres_avant == rec.Agents_associes and newRec.id == rec.id and newRec.Agent_pilote == rec.Agent_pilote and newRec.Elu_pilote == rec.Elu_pilote and newRec.Budget == rec.Budget and newRec.Elus_associes == rec.Elus_associes",
        "permissionsText": "+U"
      },
      {
        "key": "unchanged-editor",
        "aclFormula": "user.IsLoggedIn and user.Access == EDITOR and newRec.Agents_associes == rec.Agents_associes and newRec.Revision_rattachement == rec.Revision_rattachement and newRec.Evenement_rattachement == rec.Evenement_rattachement",
        "permissionsText": "+U"
      },
      {
        "key": "everyone-else",
        "aclFormula": "",
        "permissionsText": "-U"
      }
    ]
  }
],required=[
  {
    "tableId": "INTERLOCUTEURS",
    "columns": [
      {
        "colId": "Actif",
        "type": "Bool",
        "isFormula": false,
        "formula": ""
      },
      {
        "colId": "Interne_Mairie",
        "type": "Bool",
        "isFormula": false,
        "formula": ""
      },
      {
        "colId": "Role_interne",
        "type": "Choice",
        "isFormula": false,
        "formula": ""
      },
      {
        "colId": "Est_DGS",
        "type": "Bool",
        "isFormula": false,
        "formula": ""
      }
    ]
  },
  {
    "tableId": "SERVICES",
    "columns": [
      {
        "colId": "Actif",
        "type": "Bool",
        "isFormula": false,
        "formula": ""
      },
      {
        "colId": "Pole",
        "type": "Ref:POLES",
        "isFormula": false,
        "formula": ""
      },
      {
        "colId": "Responsable_du_pole",
        "type": "Bool",
        "isFormula": false,
        "formula": ""
      },
      {
        "colId": "Responsable_designe",
        "type": "Ref:INTERLOCUTEURS",
        "isFormula": false,
        "formula": ""
      },
      {
        "colId": "Responsable",
        "type": "Ref:INTERLOCUTEURS",
        "isFormula": true,
        "formula": "$Pole.Responsable if $Responsable_du_pole else $Responsable_designe"
      },
      {
        "colId": "Agents",
        "type": "RefList:INTERLOCUTEURS",
        "isFormula": false,
        "formula": ""
      }
    ]
  },
  {
    "tableId": "POLES",
    "columns": [
      {
        "colId": "Actif",
        "type": "Bool",
        "isFormula": false,
        "formula": ""
      },
      {
        "colId": "Responsable",
        "type": "Ref:INTERLOCUTEURS",
        "isFormula": false,
        "formula": ""
      }
    ]
  },
  {
    "tableId": "PROJETS",
    "columns": [
      {
        "colId": "Elu_pilote",
        "type": "Ref:INTERLOCUTEURS",
        "isFormula": false,
        "formula": ""
      },
      {
        "colId": "Agent_pilote",
        "type": "Ref:INTERLOCUTEURS",
        "isFormula": false,
        "formula": ""
      },
      {
        "colId": "Elus_associes",
        "type": "RefList:INTERLOCUTEURS",
        "isFormula": false,
        "formula": ""
      },
      {
        "colId": "Agents_associes",
        "type": "RefList:INTERLOCUTEURS",
        "isFormula": false,
        "formula": ""
      },
      {
        "colId": "Revision_rattachement",
        "type": "Int",
        "isFormula": false,
        "formula": ""
      },
      {
        "colId": "Evenement_rattachement",
        "type": "Ref:ACTIONS_EVENEMENTS",
        "isFormula": false,
        "formula": ""
      }
    ]
  }
];
  const compact=value=>String(value||"").replace(/\s/g,"");
  const owner=rule=>["user.Access==OWNER","user.Accessin[OWNER]"].includes(compact(rule.aclFormula));
  const ordered=(snapshot,resource)=>snapshot.rules.filter(rule=>rule.resource===resource.id).sort((a,b)=>a.rulePos-b.rulePos);
  const sameRules=(rows,wanted)=>rows.length===wanted.length&&rows.every((rule,index)=>Number.isFinite(rule.rulePos)&&(!index||rule.rulePos>rows[index-1].rulePos)&&rule.permissionsText===wanted[index].permissionsText&&(index||wanted[index].key!=="owner"?compact(rule.aclFormula)===compact(wanted[index].aclFormula):owner(rule)));
  function definitions(){return expected.map(resource=>({...resource,rules:resource.rules.map(rule=>({...rule}))}));}
  function inspect(snapshot){
    if(!snapshot||!Array.isArray(snapshot.tables)||!Array.isArray(snapshot.columns)||!Array.isArray(snapshot.resources)||!Array.isArray(snapshot.rules))throw Error("Métadonnées de permissions incomplètes.");
    const schemaFindings=[];
    for(const table of required){const tables=snapshot.tables.filter(item=>item.tableId===table.tableId);if(tables.length!==1){schemaFindings.push(`${table.tableId} : table absente ou dupliquée.`);continue;}for(const column of table.columns){const matches=snapshot.columns.filter(item=>item.parentId===tables[0].id&&item.colId===column.colId);if(matches.length!==1||matches[0].type!==column.type||Boolean(matches[0].isFormula)!==column.isFormula||(matches[0].formula||"")!==column.formula)schemaFindings.push(`${table.tableId}.${column.colId} : définition incompatible.`);}}
    if(schemaFindings.length)return {findings:schemaFindings,readyToInstall:false,alreadyInstalled:false,actions:[]};
    const current=snapshot.resources.filter(resource=>tableIds.includes(resource.tableId));
    const installed=current.length===expected.length&&expected.every(wanted=>{const resources=current.filter(resource=>resource.tableId===wanted.tableId&&resource.colIds===wanted.colIds);return resources.length===1&&sameRules(ordered(snapshot,resources[0]),wanted.rules);});
    if(installed)return {findings:[],readyToInstall:false,alreadyInstalled:true,actions:[]};
    if(current.length)return {findings:["Des règles existent déjà sur PROJETS ou l’organisation : examen manuel requis avant toute fusion."],readyToInstall:false,alreadyInstalled:false,actions:[]};
    let resourceId=Math.max(0,...snapshot.resources.map(resource=>resource.id)),ruleId=Math.max(0,...snapshot.rules.map(rule=>rule.id));
    if(!Number.isSafeInteger(resourceId)||!Number.isSafeInteger(ruleId)||resourceId>Number.MAX_SAFE_INTEGER-expected.length||ruleId>Number.MAX_SAFE_INTEGER-100)throw Error("Identifiants de permissions invalides.");
    const actions=[];
    for(const wanted of expected){const nextResource=++resourceId;actions.push(["AddRecord","_grist_ACLResources",nextResource,{tableId:wanted.tableId,colIds:wanted.colIds}]);wanted.rules.forEach((rule,index)=>actions.push(["AddRecord","_grist_ACLRules",++ruleId,{resource:nextResource,aclFormula:rule.aclFormula,permissionsText:rule.permissionsText,memo:"Politique d’autorité vérifiée.",rulePos:index+1}]));}
    return {findings:[],readyToInstall:true,alreadyInstalled:false,actions};
  }
  return Object.freeze({tableId:"AUTORITES",tableIds:Object.freeze([...tableIds]),definitions,inspect});
});
