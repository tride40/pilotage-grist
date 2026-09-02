"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const directory=require("./action-directory.js"),assignment=require("./action-assignment.js");
const migration=require("./action-co-responsibility-migration.js");

const columnar=rows=>Object.fromEntries([...new Set(rows.flatMap(Object.keys))].map(key=>[key,rows.map(row=>row[key]??null)]));
function fixture(){
  const people=[
    {id:1,Actif:true,Interne_Mairie:true,Role_interne:"Agent",Est_DGS:true},
    {id:2,Actif:true,Interne_Mairie:true,Role_interne:"Agent",Est_DGS:false},
    {id:3,Actif:true,Interne_Mairie:true,Role_interne:"Agent",Est_DGS:false},
    {id:4,Actif:true,Interne_Mairie:true,Role_interne:"Agent",Est_DGS:false},
    {id:5,Actif:true,Interne_Mairie:true,Role_interne:"Élu",Est_DGS:false},
  ];
  const poles=[{id:20,Actif:true,Responsable:2,Responsable_adjoint:3}];
  const services=[{id:10,Actif:true,Pole:20,Responsable_du_pole:true,Responsable_designe:0,Responsable:2,Agents:["L",2,3,4]}];
  const org=directory.normalize({INTERLOCUTEURS:columnar(people),POLES:columnar(poles),SERVICES:columnar(services)});
  const project={id:30,title:"Projet",electedPilotId:5,agentPilotId:4,electedAssociateIds:[],agentIds:[4]};
  const context=personId=>({personId,active:true,internal:true,simulated:false,delegated:false});
  return {org,project,context};
}

test("les responsables principal et adjoint ont le même périmètre d'attribution",()=>{
  const {org,project,context}=fixture(),at="2026-09-02T12:00:00.000Z";
  assert.deepEqual(org.poles[0].managerIds,[2,3]);
  const plan=assignment.create({title:"Préparer le dossier",target:{kind:"pole",id:20},associates:[]},context(1),org,project,{id:100,at});
  assert.equal(plan.row.assignerId,2,"le responsable principal reste le destinataire technique unique");
  assert.ok(plan.row.visibleTo.includes(2));assert.ok(plan.row.visibleTo.includes(3));
  assert.equal(assignment.canAssign(org,project,plan.row,context(2)),true);
  assert.equal(assignment.canAssign(org,project,plan.row,context(3)),true);
  const assigned=assignment.assign(plan.row,{target:{kind:"person",id:4,serviceId:10},expectedRevision:1,at:"2026-09-02T13:00:00.000Z"},context(3),org,project);
  assert.equal(assigned.row.state,"in_progress","aucune validation intermédiaire ne doit être ajoutée");
  assert.ok(assigned.notifications.some(item=>item.recipientId===2),"le responsable principal est notifié de l'action de son adjoint");
});

test("une action du responsable principal informe aussi son adjoint",()=>{
  const {org,project,context}=fixture();
  const plan=assignment.create({title:"Demander une intervention",target:{kind:"person",id:4,serviceId:10},associates:[]},context(2),org,project,{id:101,at:"2026-09-02T14:00:00.000Z"});
  assert.ok(plan.notifications.some(item=>item.recipientId===3));
});

test("la migration adapte uniquement les formules et permissions attendues",()=>{
  const tables=[{id:1,tableId:"ACTIONS_CIRCUIT"},{id:2,tableId:"ACTIONS_EVENEMENTS"},{id:3,tableId:"POLES"}];
  const columns=migration.legacy.columns.map((column,index)=>({id:index+1,parentId:column.tableId==="ACTIONS_CIRCUIT"?1:2,colId:column.id,type:column.type,isFormula:column.isFormula,formula:column.formula}));
  const resources=[{id:10,tableId:"ACTIONS_CIRCUIT",colIds:"*"},{id:11,tableId:"POLES",colIds:migration.legacy.poleAuthority.colIds}];
  let ruleId=20;
  const rules=[...migration.legacy.circuitRules.map((rule,index)=>({id:ruleId++,resource:10,rulePos:index+1,aclFormula:rule.aclFormula,permissionsText:rule.permissionsText})),...migration.legacy.poleAuthority.rules.map((rule,index)=>({id:ruleId++,resource:11,rulePos:index+1,aclFormula:rule.aclFormula,permissionsText:rule.permissionsText}))];
  const snapshot={tables,columns,resources,rules},preview=migration.inspect(snapshot);
  assert.equal(preview.readyToInstall,true);assert.equal(preview.actions.length,7);
  for(const [operation,table,id,values] of preview.actions){
    if(operation==="ModifyColumn"){const parent=tables.find(item=>item.tableId===table);Object.assign(columns.find(item=>item.parentId===parent.id&&item.colId===id),values);}
    else if(table==="_grist_ACLResources")Object.assign(resources.find(item=>item.id===id),values);
    else if(table==="_grist_ACLRules")Object.assign(rules.find(item=>item.id===id),values);
  }
  assert.equal(migration.inspect(snapshot).alreadyInstalled,true);
});
