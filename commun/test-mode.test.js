"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
let JSDOM;try{({JSDOM}=require(process.env.JSDOM_PATH||"jsdom"));}catch{}
const domTest=JSDOM?test:test.skip;
const KEY="pilotage-grist:test-mode:f8iwcexDATAw:v1";
const selection={active:true,personId:7,label:"Personne de test"};
const people=[{id:7,Nom:"Test",Prenom:"Personne",Actif:true,Email:"test@example.invalid"},{id:8,Nom:"Inactif",Actif:false},{id:9,Nom:"Externe",Actif:true}];
const settle=()=>new Promise(resolve=>setTimeout(resolve,10));
async function page({value=null,home=false,storage=null}={}){
  const dom=new JSDOM(`<!doctype html><body>${home?'<main class="app-shell home"></main>':'<main><form><button type="submit">Enregistrer</button></form></main>'}</body>`,{url:"https://tride40.github.io/pilotage-grist/accueil/",runScripts:"outside-only"});
  const w=dom.window,calls=[];
  if(storage)Object.defineProperty(w,"localStorage",{value:storage});
  else if(value!==null)w.localStorage.setItem(KEY,typeof value==="string"?value:JSON.stringify(value));
  w.grist={ready:async()=>{},docApi:{applyUserActions:async actions=>{calls.push(actions);return {};},fetchTable:async name=>{
    assert.equal(name,"INTERLOCUTEURS");
    return {id:people.map(p=>p.id),Nom:people.map(p=>p.Nom),Prenom:people.map(p=>p.Prenom),Email:people.map(p=>p.Email),Actif:people.map(p=>p.Actif)};
  }}};
  for(const file of ["test-mode.js","current-user.js"])vm.runInContext(fs.readFileSync(path.join(__dirname,file),"utf8"),dom.getInternalVMContext());
  await settle();
  return {dom,w,calls,mode:w.PilotageTestMode,close:()=>w.close()};
}
domTest("simulation : identité choisie sans écriture d'identification et auteurs bloqués",async()=>{
  const p=await page({value:selection});try{
    const identity=await p.w.PilotageCurrentUser.identify();
    assert.equal(identity.personId,7);assert.equal(identity.simulated,true);assert.equal(p.calls.length,0);
    assert.throws(()=>p.w.PilotageCurrentUser.requirePersonId(identity),/Mode test/);
    assert.match(p.w.document.querySelector("#pilotage-test-banner").textContent,/Personne de test/);
  }finally{p.close();}
});
domTest("aucune action Grist ne traverse le garde en mode test, y compris lots et schéma",async()=>{
  const p=await page({value:selection});try{
    for(const kind of ["AddRecord","UpdateRecord","RemoveRecord","AddColumn","ModifyColumn","BulkUpdateRecord"]){
      await assert.rejects(p.mode.applyUserActions([[kind,"PROJETS",1,{}]]),/consultation seule/);
    }
    assert.equal(p.calls.length,0);
    let submitted=false;p.w.document.querySelector("form").addEventListener("submit",()=>submitted=true);
    p.w.document.querySelector("form").dispatchEvent(new p.w.Event("submit",{bubbles:true,cancelable:true}));
    assert.equal(submitted,false);
  }finally{p.close();}
});
domTest("mode normal : écritures conservées et bandeau masqué",async()=>{
  const p=await page();try{
    await p.mode.applyUserActions([["UpdateRecord","PROJETS",1,{Nom_projet:"Test"}]]);
    assert.equal(p.calls.length,1);assert.equal(p.mode.isReadOnly(),false);
    assert.equal(p.w.document.querySelector("#pilotage-test-banner").hidden,true);
  }finally{p.close();}
});
domTest("changement depuis une autre page : verrouillage immédiat jusqu'au rechargement",async()=>{
  const p=await page();try{
    p.w.localStorage.setItem(KEY,JSON.stringify(selection));
    await assert.rejects(p.mode.applyUserActions([]),/Mode test/);
    p.w.dispatchEvent(new p.w.StorageEvent("storage",{key:KEY}));
    assert.match(p.w.document.querySelector("#pilotage-test-banner").textContent,/actualisez/);
    p.w.localStorage.removeItem(KEY);
    await assert.rejects(p.mode.applyUserActions([]),/Mode test/);
    assert.equal(p.calls.length,0);
  }finally{p.close();}
});
domTest("sortie du test : aucune écriture avec l'identité simulée encore en mémoire",async()=>{
  const p=await page({value:selection});try{
    p.w.localStorage.removeItem(KEY);
    await assert.rejects(p.mode.applyUserActions([]),/Mode test/);
  }finally{p.close();}
  const fresh=await page();try{assert.equal(fresh.mode.isReadOnly(),false);}finally{fresh.close();}
});
domTest("choix absent, inactif ou supprimé : pas de repli silencieux sur le compte réel",async()=>{
  for(const id of [null,8,999]){
    const p=await page({value:{...selection,personId:id}});try{
      await assert.rejects(p.w.PilotageCurrentUser.identify(),/Mode test|actif ou accessible/);
      assert.equal(p.calls.length,0);assert.equal(p.mode.isReadOnly(),true);
    }finally{p.close();}
  }
});
domTest("stockage illisible ou interdit : mode verrouillé",async()=>{
  for(const options of [{value:"invalide"},{storage:{getItem(){throw Error("interdit");}}}]){
    const p=await page(options);try{
      await assert.rejects(p.mode.applyUserActions([]),/consultation seule/);
      assert.equal(p.calls.length,0);
    }finally{p.close();}
  }
});
domTest("accueil : interrupteur et liste des actifs dont les externes, libellés en texte",async()=>{
  const p=await page({home:true,value:{...selection,label:"<img src=x>"}});try{
    const doc=p.w.document,select=doc.querySelector("#test-mode-panel select");
    assert.equal(doc.querySelector('[role="switch"]').checked,true);
    assert.deepEqual([...select.options].map(o=>o.value).sort(),["","7","9"]);
    assert.equal(select.value,"7");assert.equal(doc.querySelector("#pilotage-test-banner img"),null);
    assert.equal(select.closest("label").hidden,false);
    assert.equal(p.calls.length,0);
  }finally{p.close();}
});
test("tous les widgets chargent le garde avant leurs scripts et toutes les écritures métier y passent",()=>{
  const root=path.resolve(__dirname,"..");
  for(const folder of ["accueil","actions","consignes","dashboard","diagnostic-v3","fiche-projet","interlocuteurs","point-hebdomadaire","reunions"]){
    const html=fs.readFileSync(path.join(root,folder,"index.html"),"utf8");
    assert.ok(html.indexOf("test-mode.js")>=0&&html.indexOf("test-mode.js")<html.indexOf('src="app.js'),folder);
    assert.match(html,/test-mode.css/);
    for(const file of fs.readdirSync(path.join(root,folder)).filter(f=>f.endsWith(".js")&&!f.endsWith(".test.js"))){
      const source=fs.readFileSync(path.join(root,folder,file),"utf8");
      assert.doesNotMatch(source,/grist\.docApi\.applyUserActions/,`${folder}/${file}`);
    }
  }
});
