"use strict";
const test=require("node:test"), assert=require("node:assert/strict"), M=require("./organisation-model.js");
const person=id=>({id,Interne_Mairie:true,Role_interne:"Agent",Actif:true});
const people=[1,2,3,4].map(person);
const poles=[{id:1,Pole:"Technique",Responsable:1,Responsable_adjoint:2,Actif:true}];
const services=[{id:1,Nom_service:"Voirie",Pole:1,Responsable_du_pole:true,Responsable:1,Agents:["L",1,2],Actif:true},{id:2,Nom_service:"Bâtiments",Pole:1,Responsable_designe:2,Agents:["L",2,3],Actif:true}];
test("responsable hérité, membres sans doublons et rattachements multiples",()=>{
  assert.equal(M.responsible(services[0],poles),1);
  assert.deepEqual(M.members({...services[0],Agents:["L",2,2]},poles),[2,1]);
  assert.equal(M.servicesOf(people[1],services,poles).length,2);
  assert.equal(M.responsibilities(people[1],services,poles).length,2);
});
test("changement de responsable de pôle : conserver ancien responsable et membres",()=>{
  const updates=M.inheritedUpdates({...poles[0],Responsable:3},services);
  assert.deepEqual(updates,[["UpdateRecord","SERVICES",1,{Agents:["L",1,2,3]}]]);
});
test("validation service : pôle obligatoire, DGS et externe exclus",()=>{
  assert.equal(M.validateService(services[0],people,poles),services[0]);
  assert.throws(()=>M.validateService({...services[0],Pole:0},people,poles),/pôle actif/);
  assert.throws(()=>M.validateService(services[0],[{...people[0],Est_DGS:true},...people.slice(1)],poles),/hors DGS/);
  assert.throws(()=>M.validateService({...services[0],Agents:["L",99]},people,poles),/agents internes/);
});
test("un responsable de pôle et son adjoint sont distincts et membres d’un service",()=>{
  M.validatePole(poles[0],people,services,poles);
  assert.throws(()=>M.validatePole({...poles[0],Responsable_adjoint:1},people,services,poles),/distinctes/);
  assert.throws(()=>M.validatePole({...poles[0],Responsable:4},people,services,poles),/service actif/);
});
test("une suppression de rattachement ne doit pas créer d’agent orphelin",()=>{
  assert.deepEqual(M.orphanedAfter(services,[{...services[0],Actif:false},services[1]],people,poles).map(p=>p.id),[1]);
  assert.deepEqual(M.orphanedAfter(services,services,people,poles),[]);
});
test("désignation DGS retire les rattachements dans le même lot",()=>{
  assert.deepEqual(M.dgsActions(3,[],people,services,poles),[
    ["UpdateRecord","SERVICES",2,{Agents:["L",2]}],
    ["UpdateRecord","INTERLOCUTEURS",3,{Est_DGS:true}]
  ]);
  assert.throws(()=>M.dgsActions(1,[],people,services,poles),/Réaffectez/);
});
test("remplacement DGS : rattachement obligatoire de la personne sortante",()=>{
  const current=people.map(p=>({...p,Est_DGS:p.id===4}));
  assert.throws(()=>M.dgsActions(3,[],current,services,poles),/sortante/);
  assert.deepEqual(M.dgsActions(3,[2],current,services,poles),[
    ["UpdateRecord","INTERLOCUTEURS",4,{Est_DGS:false}],
    ["UpdateRecord","SERVICES",2,{Agents:["L",2,4]}],
    ["UpdateRecord","INTERLOCUTEURS",3,{Est_DGS:true}]
  ]);
  assert.throws(()=>M.dgsActions(3,[99],current,services,poles),/services actifs/);
});
function initialColumns(){return [
  ["POLES","Pole","Text",true],["POLES","Responsable","Ref:INTERLOCUTEURS",true],
  ["POLES","Responsbale_adjoint","Ref:INTERLOCUTEURS",true],["POLES","Actif","Bool",true],
  ["SERVICES","Pole","Ref:POLES",true],["SERVICES","Responsable","Ref:INTERLOCUTEURS",false]
].map(([tableId,colId,type,isFormula])=>({tableId,colId,type,isFormula,formula:""}));}
test("migration préserve les responsables et membres existants, corrige le libellé adjoint",()=>{
  const actions=M.schemaActions(initialColumns(),["POLES","SERVICES","INTERLOCUTEURS"],{SERVICES:[{id:8,Responsable:2,Responsable_designe:0,Agents:["L",1]}]});
  assert.deepEqual(actions[0],["RenameColumn","POLES","Responsbale_adjoint","Responsable_adjoint"]);
  assert.deepEqual(actions.find(a=>a[0]==="UpdateRecord"),["UpdateRecord","SERVICES",8,{Responsable_designe:2,Responsable_du_pole:false,Agents:["L",1,2]}]);
  assert.equal(actions.at(-1)[3].formula,M.RESPONSIBLE_FORMULA);
  assert.ok(!actions.some(a=>a[0].startsWith("Remove")));
});
test("migration idempotente après application du plan",()=>{
  const columns=initialColumns();
  for(const [action,tableId,colId,fields] of M.schemaActions(columns,["POLES","SERVICES","INTERLOCUTEURS"],{})){
    const col=columns.find(c=>c.tableId===tableId&&c.colId===colId);
    if(action==="RenameColumn")col.colId=fields;
    else if(action==="AddColumn")columns.push({tableId,colId,formula:"",...fields});
    else if(action==="ModifyColumn")Object.assign(col,fields);
  }
  assert.deepEqual(M.schemaActions(columns,["POLES","SERVICES","INTERLOCUTEURS"],{}),[]);
});
test("aucun plan n’est rendu pour une formule ou un type métier incompatible",()=>{
  const cols=initialColumns();cols[0].formula="custom()";
  assert.throws(()=>M.schemaActions(cols,["POLES"],{}),/formule/);
  cols[0].formula="";cols[0].type="Int";
  assert.throws(()=>M.schemaActions(cols,["POLES"],{}),/Type inattendu/);
});
