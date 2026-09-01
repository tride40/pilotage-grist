"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
let JSDOM;try{({JSDOM}=require(process.env.JSDOM_PATH||"jsdom"));}catch{}

test("les formulaires Action suivent le gabarit commun et les cartes nomment l’exécutant",{skip:!JSDOM},async()=>{
  const dom=new JSDOM("<!doctype html><main id=actions></main>",{runScripts:"outside-only",url:"https://example.test/"});
  const {window}=dom;
  window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  window.HTMLDialogElement.prototype.close=function(){this.open=false;};
  vm.runInContext(fs.readFileSync(path.join(__dirname,"circuit-ui.js"),"utf8"),dom.getInternalVMContext());

  const base={projectTitle:"Quartier Eco-Responsable",creatorId:6,serviceId:3,associateIds:[],updatedAt:"2026-09-01T18:00:00Z",deadline:"2026-09-20",roles:{creator:true,executor:false}};
  const assignRow={...base,id:1,title:"À ATTRIBUER",state:"to_assign",revision:1,targetKind:"service",targetId:3,executorId:null,operations:["assign","cancel"]};
  const activeRow={...base,id:2,title:"ACTION ATTRIBUÉE",state:"in_progress",revision:2,targetKind:"service",targetId:3,executorId:7,operations:["perform","close","request_additional_work","cancel"]};
  const service={
    list:async()=>[assignRow,activeRow],notifications:async()=>[],
    inspect:async id=>{const row=id===1?assignRow:activeRow;return{row,operations:row.operations,history:[]};},
    createAction:async()=>{},assignAction:async()=>{},execute:async()=>{}
  };
  const catalog={projects:[{id:10,name:"Quartier Eco-Responsable"}],people:[{id:6,name:"Tristan",kind:"elected",serviceIds:[]},{id:7,name:"Adrien",kind:"agent",serviceIds:[3]}],services:[{id:3,name:"Patrimoine bâti et Opérations"}],poles:[]};
  const root=window.document.querySelector("#actions"),mounted=window.PilotageActionCircuitUI.mount({element:root,service,catalog,canWrite:true,allowCreate:true,allowAssignment:true,allowLifecycle:true,initialFilter:"all"});
  await mounted.ready;

  const cards=[...root.querySelectorAll(".circuit-card")],activeCard=cards.find(card=>card.querySelector("h2")?.textContent==="ACTION ATTRIBUÉE");
  assert.match(activeCard.textContent,/Destinataire : Patrimoine bâti et Opérations/);
  assert.match(activeCard.textContent,/Exécutant : Adrien/);

  root.querySelector(".circuit-add").click();
  let dialog=root.querySelector("dialog");
  assert.equal(dialog.querySelectorAll(".circuit-form-section").length,4);
  assert.deepEqual([...dialog.querySelectorAll(".circuit-form-section__heading>p")].map(node=>node.textContent),["1","2","3","4"]);
  assert.equal([...dialog.querySelectorAll("button")].find(button=>button.type==="submit").textContent,"Créer l’action");
  [...dialog.querySelectorAll("button")].find(button=>button.textContent==="Retour").click();

  const assignCard=cards.find(card=>card.querySelector("h2")?.textContent==="À ATTRIBUER");
  [...assignCard.querySelectorAll("button")].find(button=>button.textContent==="Attribuer").click();
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.deepEqual([...dialog.querySelectorAll(".circuit-form-section__heading>p")].map(node=>node.textContent),["1","2"]);
  assert.match(dialog.textContent,/Action concernée/);
  assert.match(dialog.textContent,/Nouvelle attribution/);
  assert.equal([...dialog.querySelectorAll("button")].find(button=>button.type==="submit").textContent,"Attribuer l’action");
  [...dialog.querySelectorAll("button")].find(button=>button.textContent==="Retour").click();

  const commands=[
    ["Déclarer réalisée","Réalisation","Déclarer l’action réalisée",false],
    ["Clôturer","Validation","Clôturer l’action",false],
    ["Demander un complément","Complément demandé","Envoyer la demande de complément",true],
    ["Annuler l’action","Motif de l’annulation","Confirmer l’annulation",true]
  ];
  for(const [verb,section,primary,required] of commands){
    [...activeCard.querySelectorAll("button")].find(button=>button.textContent===verb).click();
    await new Promise(resolve=>setTimeout(resolve,0));
    assert.deepEqual([...dialog.querySelectorAll(".circuit-form-section__heading>p")].map(node=>node.textContent),["1","2"]);
    assert.match(dialog.textContent,new RegExp(section));
    assert.equal(dialog.querySelector('textarea[name="note"]').required,required);
    assert.equal([...dialog.querySelectorAll("button")].find(button=>button.type==="submit").textContent,primary);
    [...dialog.querySelectorAll("button")].find(button=>button.textContent==="Retour").click();
  }
  dom.window.close();
});
