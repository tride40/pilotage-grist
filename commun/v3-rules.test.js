"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),rules=require("./v3-rules.js");
test("un projet À venir peut rester incomplet",()=>assert.deepEqual(rules.projectErrors({Statut:"À venir"}),[]));
test("un projet En cours exige les deux pilotes",()=>assert.equal(rules.projectErrors({Statut:"En cours"}).length,2));
test("l’ancien Responsable reste un repli de migration",()=>assert.deepEqual(rules.projectErrors({Statut:"En cours",Elu_pilote:2,Responsable:3}),[]));
test("un abandon exige un motif",()=>assert.equal(rules.projectErrors({Statut:"Abandonné"})[0],"Le motif d’abandon est obligatoire."));
test("les projets clos sortent du pilotage",()=>{assert.equal(rules.isProjectActive({Statut:"Terminé"}),false);assert.equal(rules.isProjectActive({Statut:"En cours"}),true)});
test("seuls les statuts V3 ferment une action",()=>{assert.equal(rules.isActionClosed({Statut:"Réalisée"}),true);assert.equal(rules.isActionClosed({Statut:"En cours"}),false)});
