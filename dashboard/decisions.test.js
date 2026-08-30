"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
let JSDOM;try{({JSDOM}=require(process.env.JSDOM_PATH||"jsdom"));}catch{}
const domTest=JSDOM?test:test.skip;
function page(){
  const dom=new JSDOM(fs.readFileSync(path.join(__dirname,"index.html"),"utf8"),{url:"http://localhost/dashboard/",runScripts:"outside-only"});
  const ctx=dom.getInternalVMContext();
  vm.runInContext(fs.readFileSync(path.join(__dirname,"app.js"),"utf8").replace(/initializeDashboard\(\);\s*$/, ""),ctx);
  const run=code=>vm.runInContext(code,ctx);
  run(`state.tables={PROJETS:[{id:1,Statut:"En cours",Nom_projet:"Actif"},{id:2,Statut:"Terminé"},{id:3,Statut:"Abandonné"},{id:4,Archive:true},{id:5,Statut:"À venir",Nom_projet:"Futur"}],INTERLOCUTEURS:[],ACTIONS:[],CONSIGNES_POLITIQUES:[],ARBITRAGES_DECISIONS:[]};`);
  return {dom,doc:dom.window.document,run,load:rows=>{ctx.rows=rows;run("state.tables.ARBITRAGES_DECISIONS=rows;state.projects=prepareDashboardData(state.tables);renderKpis(calculateKpis(state.tables,state.projects));renderProjects();");},close:()=>dom.window.close()};
}
domTest("décisions limitées aux projets actifs, cohérence avec le filtre et les cartes",()=>{
  const p=page();try{
    p.load([1,2,3,4,5].map(Projet=>({id:Projet,Projet,Statut:"Demandée"})));
    assert.equal(p.doc.querySelector('[data-kind="arbitration"] .kpi-card__value').textContent,"2");
    p.run('bindFilters()');p.doc.querySelector('[data-kind="arbitration"]').click();
    assert.equal(p.doc.querySelectorAll("#project-grid [data-project-id]").length,2);
    assert.equal(p.doc.querySelector("#unlinked-decisions").hidden,true);
  }finally{p.close();}
});
domTest("décisions sans projet ou référence invalide : signalement séparé, pas de faux compteur",()=>{
  const p=page();try{
    p.load([{id:10,Projet:0,Sujet:"À rattacher",Statut:"Demandée"},{id:11,Projet:999,Statut:"Demandée"},{id:12,Projet:null,Statut:"Prise"}]);
    assert.equal(p.doc.querySelector('[data-kind="arbitration"] .kpi-card__value').textContent,"0");
    const box=p.doc.querySelector("#unlinked-decisions");assert.equal(box.hidden,false);
    assert.match(box.querySelector("summary").textContent,/2 décisions/);
    assert.equal(box.querySelectorAll("li").length,2);assert.match(box.textContent,/À rattacher — ligne 10/);
    p.run('state.activeFilter="arbitration";renderProjects();');assert.equal(box.hidden,false);
    p.load([{id:10,Projet:1,Sujet:"À rattacher",Statut:"Demandée"}]);
    assert.equal(box.hidden,true);assert.equal(box.querySelectorAll("li").length,0);
    assert.equal(p.doc.querySelector('[data-kind="arbitration"] .kpi-card__value').textContent,"1");
  }finally{p.close();}
});
domTest("plusieurs décisions d'un même projet restent plusieurs décisions, liaison liste compatible",()=>{
  const p=page();try{
    p.load([{id:1,Projet:["L",1],Statut:"Demandée"},{id:2,Projet:1,Statut:"Reportée"},{id:3,Projet:1,Statut:"Prise"}]);
    assert.equal(p.doc.querySelector('[data-kind="arbitration"] .kpi-card__value').textContent,"2");
    assert.equal(p.run("state.projects[0].metrics.arbitrations"),2);
    assert.equal(p.run('state.activeFilter="arbitration";getFilteredProjects().length'),1);
  }finally{p.close();}
});
domTest("sans projet actif : signalement disponible et sujets injectés comme texte",()=>{
  const p=page();try{
    p.run("state.tables.PROJETS=[]");
    p.load([{id:4,Sujet:"<img src=x onerror=alert(1)>",Statut:"Demandée"}]);
    assert.equal(p.doc.querySelector("#unlinked-decisions").hidden,false);
    assert.equal(p.doc.querySelector("#unlinked-decisions img"),null);
    assert.match(p.doc.querySelector("#interface-state").textContent,/Aucun projet actif/);
  }finally{p.close();}
});
