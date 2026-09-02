"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
let JSDOM;try{({JSDOM}=require(process.env.JSDOM_PATH||"jsdom"));}catch{}
const domTest=JSDOM?test:test.skip;
domTest("accueil : nouvelles catégories, six cartes uniques et destinations inchangées",()=>{
  const dom=new JSDOM(fs.readFileSync(path.join(__dirname,"index.html"),"utf8"),{url:"https://tride40.github.io/pilotage-grist/accueil/",runScripts:"outside-only"});
  try{
    const doc=dom.window.document;
    const pages=id=>[...doc.querySelectorAll(`[aria-labelledby="${id}"] [data-page]`)].map(card=>card.dataset.page);
    assert.deepEqual(pages("piloter-title"),["dashboard","actions"]);
    assert.deepEqual(pages("travailler-title"),["project","meetings","weekly"]);
    assert.deepEqual(pages("ressources-title"),["contacts"]);
    assert.equal(doc.querySelectorAll("[data-page]").length,6);
    const featured=[...doc.querySelectorAll(".tool-grid--featured .tool-card")];
    assert.equal(featured[0].className,featured[1].className);
    assert.equal(featured[0].querySelector(".tool-card__icon").className,"tool-card__icon");assert.equal(featured[1].querySelector(".tool-card__icon").className,"tool-card__icon tool-card__icon--green");
    const css=fs.readFileSync(path.join(__dirname,"styles.css"),"utf8");
    assert.match(css,/\.tool-grid--featured \{ grid-auto-rows: 1fr;/);
    assert.match(css,/\.tool-grid--featured \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
    assert.doesNotMatch(css,/\[data-page="(?:dashboard|weekly)"\]/);
    assert.equal(doc.querySelector("#organiser-title"),null);
    assert.equal(doc.querySelector('[data-page="project"] strong').textContent,"Suivi des projets");
    assert.match(doc.querySelector('[data-page="project"]').textContent,/jalons.*journal/);
    const code=fs.readFileSync(path.join(__dirname,"app.js"),"utf8").split("function displayToday()")[0];
    vm.runInContext(fs.readFileSync(path.join(__dirname,"../commun/navigation.js"),"utf8"),dom.getInternalVMContext());vm.runInContext(code+"\nconfigureCards();",dom.getInternalVMContext());
    const expected={dashboard:9,project:10,meetings:11,actions:37,contacts:14,weekly:15};
    for(const [page,id]of Object.entries(expected)){
      const card=doc.querySelector(`[data-page="${page}"]`);
      assert.equal(card.href,`https://grist.numerique.gouv.fr/o/docs/f8iwcexDATAw/Pilotage-des-projets/p/${id}?style=singlePage`);
      assert.equal(card.target,"_top");
      assert.equal(card.getAttribute("aria-label"),`${card.querySelector("strong").textContent} — ouvrir la page`);
    }
  }finally{dom.window.close();}
});
