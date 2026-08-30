"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),M=require("./annuaire-model.js");
const elected=(id,role,extra={})=>({id,Prenom:"Élu",Nom:String(id),Interne_Mairie:true,Role_interne:"Élu",Fonction_elu:role,Actif:true,...extra});
const agent=(id,extra={})=>({id,Prenom:"Agent",Nom:String(id),Interne_Mairie:true,Role_interne:"Agent",Actif:true,...extra});
const form=values=>new Map(Object.entries({Actif:"on",...values}));

test("responsables : pôle avant service, titulaire avant adjoint puis ordre alphabétique stable",()=>{
  const poles=[{id:2,Pole:"Zèbre",Responsable:1,Responsable_adjoint:2},{id:1,Pole:"Alpha",Responsable:2,Responsable_adjoint:1}];
  const services=[{id:2,Nom_service:"Zèbre",Responsable_designe:3},{id:1,Nom_service:"Alpha",Responsable_designe:3},{id:3,Nom_service:"Autre",Responsable_designe:1}];
  const map=M.leadershipPlacements(poles,services);
  assert.deepEqual(map.get(1),{kind:"pole",id:2});
  assert.deepEqual(map.get(2),{kind:"pole",id:1});
  assert.deepEqual(map.get(3),{kind:"service",id:1});
  assert.equal(map.has(4),false);
  assert.deepEqual([...M.leadershipPlacements([...poles].reverse(),[...services].reverse())],[...map]);
});
test("maire puis adjoints par rang, rangs vides après les rangs renseignés",()=>{
  const rows=[elected(1,"Conseiller municipal"),elected(2,"Adjoint au maire",{Rang:2}),elected(3,"Adjoint au maire",{Rang:1}),elected(4,"Maire"),elected(5,"Adjoint au maire"),elected(6,"Conseiller délégué")];
  assert.deepEqual(rows.sort(M.electedOrder).map(p=>p.id),[4,3,2,5,6,1]);
});
test("le rang ne trie ni les conseillers délégués ni les autres profils",()=>{
  const a=elected(1,"Conseiller délégué",{Nom:"Zola",Rang:1}),b=elected(2,"Conseiller délégué",{Nom:"André",Rang:9});
  assert.ok(M.electedOrder(a,b)>0);
  a.Fonction_elu=b.Fonction_elu="Conseiller municipal";assert.ok(M.electedOrder(a,b)>0);
});
test("des rangs identiques ou invalides gardent un tri déterministe",()=>{
  const a=elected(1,"Adjoint au maire",{Nom:"Zola",Rang:2}),b=elected(2,"Adjoint au maire",{Nom:"André",Rang:2});
  assert.ok(M.electedOrder(a,b)>0);
  for(const rank of [0,null,"",-1,"abc",1.5])assert.equal(M.rank({Rang:rank}),Infinity);
  assert.equal(M.electedOrder(a,a),0);
});
test("la fonction historique reste visible, sans deviner la nouvelle fonction",()=>{
  const p=elected(1,"",{Fonction:"Adjointe à l’urbanisme"});
  assert.equal(M.functionLabel(p),"Adjointe à l’urbanisme");
  assert.equal(M.hasDelegation(p),false);
  p.Fonction_elu="Adjoint au maire";assert.equal(M.functionLabel(p),"Adjoint au maire");
});
test("contacts externes masqués au repos, visibles sur recherche ou demande",()=>{
  const ext={id:9,Nom:"Durand",Prenom:"Alex",Organisme:"Atelier Horizon",Fonction:"Paysagiste",Actif:true};
  assert.equal(M.matches(ext,{active:"active"}),false);
  assert.equal(M.matches(ext,{active:"active",query:"horizon"}),true);
  assert.equal(M.matches(ext,{active:"active",query:"PAYSAGISTE durand"}),true);
  assert.equal(M.matches(ext,{browseExternal:true}),true);
  assert.equal(M.matches(ext,{type:"external"}),true);
  assert.equal(M.matches(ext,{type:"agent",query:"horizon"}),false);
  assert.equal(M.matches({...ext,Actif:false},{active:"active",query:"Durand"}),false);
  assert.equal(M.matches({...ext,Actif:false},{active:"inactive",query:"Durand"}),true);
});
test("recherche par délégation, fonction d’élu, organisme et plusieurs termes",()=>{
  const p=elected(1,"Adjoint au maire",{Nom:"Garcia",Delegation:"Finances et ressources humaines",Rang:123456});
  assert.equal(M.matches(p,{query:"garcia finances"}),true);
  assert.equal(M.matches(p,{query:"adjoint humaines"}),true);
  assert.equal(M.matches(p,{query:"123456"}),false);
  assert.equal(M.matches(p,{query:"urbanisme"}),false);
});
test("recherche d’un agent par pôle ou service, multi-appartenance, DGS",()=>{
  const p=agent(1),s=[{id:2,Nom_service:"Urbanisme",Pole:3,Responsable:1,Agents:["L",1]}],poles=[{id:3,Pole:"Aménagement",Responsable:1}];
  assert.equal(M.matches(p,{query:"amenagement urbanisme"},s,poles),true);
  assert.equal(M.matches(p,{query:"responsable"},s,poles),true);
  assert.equal(M.matches(agent(4,{Est_DGS:true}),{query:"dgs"}),true);
  assert.equal(M.matches(p,{query:"dgs"},s,poles),false);
});
test("le rang est validé pour les adjoints et ignoré pour les autres élus",()=>{
  const current=elected(1,"Adjoint au maire");
  assert.deepEqual(M.mandateValues(form({Fonction_elu:"Adjoint au maire",Delegation:"Urbanisme",Rang:"2"}),current,[]),{Fonction_elu:"Adjoint au maire",Delegation:"Urbanisme",Rang:2});
  for(const rank of ["0","-1","1.5","abc","9007199254740992"])assert.throws(()=>M.mandateValues(form({Fonction_elu:"Adjoint au maire",Rang:rank}),current,[]));
  assert.equal(M.mandateValues(form({Fonction_elu:"Adjoint au maire",Rang:""}),current,[]).Rang,0);
  assert.deepEqual(M.mandateValues(form({Fonction_elu:"Maire",Delegation:"ancienne délégation",Rang:"2"}),current,[]),{Fonction_elu:"Maire",Delegation:"",Rang:0});
  assert.equal(M.mandateValues(form({Fonction_elu:"Conseiller délégué",Delegation:"Culture",Rang:"2"}),current,[]).Delegation,"Culture");
});
test("un seul maire actif, sans bloquer l’édition du maire actuel ni l’historique",()=>{
  const mayor=elected(1,"Maire"),data=form({Fonction_elu:"Maire"});
  assert.throws(()=>M.mandateValues(data,null,[mayor]),/déjà renseigné/);
  assert.equal(M.mandateValues(data,mayor,[mayor]).Fonction_elu,"Maire");
  assert.equal(M.mandateValues(data,null,[{...mayor,Actif:false}]).Fonction_elu,"Maire");
  assert.equal(M.mandateValues(form({Fonction_elu:"Maire",Actif:""}),null,[mayor]).Fonction_elu,"Maire");
});
test("préparation du schéma additive, menu de choix Grist et idempotence",()=>{
  const actions=M.schemaActions([]);assert.equal(actions.length,3);
  assert.deepEqual(actions.map(a=>a[2]),["Fonction_elu","Delegation","Rang"]);
  assert.deepEqual(JSON.parse(actions[0][3].widgetOptions).choices,M.FUNCTIONS);
  const cols=actions.map(a=>({tableId:a[1],colId:a[2],...a[3]}));
  assert.deepEqual(M.schemaActions(cols),[]);
  assert.ok(actions.every(a=>a[0]==="AddColumn"));
});
test("préparation préserve les choix personnalisés et les autres options existantes",()=>{
  const col={tableId:"INTERLOCUTEURS",colId:"Fonction_elu",type:"Choice",isFormula:1,formula:"",widgetOptions:JSON.stringify({choices:["Ancien maire"],alignment:"left"})};
  const action=M.schemaActions([col])[0];
  assert.equal(action[0],"ModifyColumn");assert.equal(action[3].isFormula,false);
  const options=JSON.parse(action[3].widgetOptions);assert.equal(options.alignment,"left");assert.ok(options.choices.includes("Ancien maire"));
});
test("préparation refuse les types ou formules incompatibles avant tout envoi",()=>{
  assert.throws(()=>M.schemaActions([{tableId:"INTERLOCUTEURS",colId:"Rang",type:"Text"}]),/à vérifier/);
  assert.throws(()=>M.schemaActions([{tableId:"INTERLOCUTEURS",colId:"Delegation",type:"Text",formula:"custom()"}]),/à vérifier/);
});
test("seuls les élus internes utilisent le mandat",()=>{
  assert.equal(M.elected(elected(1,"Maire")),true);
  assert.equal(M.elected({...elected(1,"Maire"),Interne_Mairie:false}),false);
  assert.equal(M.elected(agent(1,{Fonction_elu:"Maire"})),false);
});
test("une fonction d’élu personnalisée existante n’est pas écrasée lors d’une autre modification",()=>{
  const current=elected(1,"Ancien adjoint",{Delegation:"Culture",Rang:2});
  assert.deepEqual(M.mandateValues(form({Fonction_elu:"Ancien adjoint"}),current,[]),{});
  assert.throws(()=>M.mandateValues(form({Fonction_elu:"Valeur inconnue"}),current,[]),/Choisissez/);
  assert.equal(M.functionLabel(current),"Ancien adjoint");
});
