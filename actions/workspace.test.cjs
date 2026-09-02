"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const read=name=>fs.readFileSync(path.join(__dirname,name),"utf8");

test("Actions – future devient Mon espace avec ses deux rubriques",()=>{
  const html=read("actions.html"),app=read("actions-app.js");
  assert.match(html,/<title>Mon espace<\/title>/);
  assert.match(html,/private-tasks\.js/);
  assert.match(html,/personnel-tasks\.js/);
  for(const label of ["Coordination","Mon travail","Tout voir","Mes actions","Ma To-Do List"])assert.match(app,new RegExp(label));
  for(const label of ["À attribuer","À valider","Mes demandes en cours","Notifications non lues","Actions à réaliser","Actions en retard","To-Do ouvertes","To-Do en retard"])assert.match(app,new RegExp(label));
});

test("le circuit peut être intégré sans dupliquer sa logique métier",()=>{
  const circuit=read("circuit-ui.js"),app=read("actions-app.js");
  assert.match(circuit,/showHeading=true/);
  assert.match(circuit,/rowPredicate=null/);
  assert.match(circuit,/onData=null/);
  assert.match(circuit,/create:openCreate/);
  assert.match(app,/rowPredicate:actionToDo/);
  assert.match(app,/\["in_progress","additional_work"\]/);
  assert.match(app,/\["assign","À attribuer"\]/);
  assert.match(circuit,/filter\.value==="assign"/);
});

test("la To-Do adopte le formulaire commun numéroté et à actions fixes",()=>{
  const app=read("actions-app.js"),css=read("circuit.css");
  assert.match(app,/circuit-form-section__heading/);
  assert.match(app,/ORGANISATION PERSONNELLE/);
  assert.match(app,/Une note privée, visible uniquement par vous/);
  assert.match(css,/dialog form>\.circuit-controls\{position:sticky/);
  assert.match(css,/@media\(max-width:640px\).*dialog\{inset:0/);
});
