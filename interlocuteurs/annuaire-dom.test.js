"use strict";
/* Tests de DOM, pas de navigateur ni de rendu visuel. Dépendance optionnelle : jsdom. */
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
let JSDOM;try{({JSDOM}=require(process.env.JSDOM_PATH||"jsdom"));}catch{}
const domTest=JSDOM?test:test.skip;
const root=path.resolve(__dirname,"..");
const settle=()=>new Promise(resolve=>setTimeout(resolve,15));
const O=require("./organisation-model.js"),M=require("./annuaire-model.js");
async function page({live=false,missingMandate=false}={}){
  const html=fs.readFileSync(path.join(__dirname,"index.html"),"utf8");
  const dom=new JSDOM(html,{url:`http://localhost/interlocuteurs/?demo=${live?0:1}`,runScripts:"outside-only",pretendToBeVisual:true});
  const w=dom.window,context=dom.getInternalVMContext(),errors=[];
  w.confirm=()=>true;w.HTMLElement.prototype.scrollIntoView=function(){};
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  w.HTMLDialogElement.prototype.close=function(){this.open=false;};
  w.addEventListener("error",event=>errors.push(event.error));
  const calls=[],tables={},schema=[],ids=new Map();let nextTableId=1,failNext=false;
  const run=file=>vm.runInContext(fs.readFileSync(path.join(root,file),"utf8"),context,{filename:file});
  function columnar(rows,columns=[]){const keys=[...new Set(["id",...columns,...rows.flatMap(Object.keys)])];return Object.fromEntries(keys.map(key=>[key,rows.map(row=>row[key]??null)]));}
  function addColumn(table,colId,type,extras={}){
    const col={id:schema.length+1,parentId:ids.get(table),colId,type,isFormula:false,formula:"",widgetOptions:"",...extras};schema.push(col);return col;
  }
  function installFakeGrist(){
    Object.assign(tables,JSON.parse(JSON.stringify(w.INTERLOCUTEURS_DEMO_DATA.tables)));
    for(const table of Object.keys(tables))ids.set(table,nextTableId++);
    for(const table of Object.keys(tables))for(const field of new Set(tables[table].flatMap(Object.keys))){
      if(field==="id")continue;
      addColumn(table,field,"Text");
    }
    function setType(table,field,type,extras={}){let col=schema.find(c=>c.parentId===ids.get(table)&&c.colId===field);if(!col)col=addColumn(table,field,type);Object.assign(col,{type,...extras});}
    for(const [field,type] of [["Pole","Text"],["Responsable","Ref:INTERLOCUTEURS"],["Responsable_adjoint","Ref:INTERLOCUTEURS"],["Actif","Bool"]])setType("POLES",field,type);
    for(const [field,type] of [["Pole","Ref:POLES"],["Responsable_du_pole","Bool"],["Responsable_designe","Ref:INTERLOCUTEURS"],["Agents","RefList:INTERLOCUTEURS"],["Actif","Bool"]])setType("SERVICES",field,type);
    setType("SERVICES","Responsable","Ref:INTERLOCUTEURS",{isFormula:true,formula:O.RESPONSIBLE_FORMULA});
    setType("INTERLOCUTEURS","Est_DGS","Bool");
    setType("INTERLOCUTEURS","Notes","Text");
    setType("INTERLOCUTEURS","Actif","Bool");
    setType("INTERLOCUTEURS","Interne_Mairie","Bool");
    setType("INTERLOCUTEURS","Role_interne","Choice");
    for(const [field,type]of M.FIELDS)setType("INTERLOCUTEURS",field,type,field==="Fonction_elu"?{widgetOptions:JSON.stringify({choices:M.FUNCTIONS})}:{});
    if(missingMandate){
      for(let i=schema.length-1;i>=0;i--)if(schema[i].parentId===ids.get("INTERLOCUTEURS")&&M.FIELDS.some(f=>f[0]===schema[i].colId))schema.splice(i,1);
      for(const person of tables.INTERLOCUTEURS)for(const [field]of M.FIELDS)delete person[field];
    }
    // La fonction héritée est calculée par Grist, ici simulée uniquement pour les tests.
    function refresh(){for(const s of tables.SERVICES)s.Responsable=O.responsible(s,tables.POLES);}
    refresh();
    w.grist={ready:async()=>{},docApi:{
      listTables:async()=>Object.keys(tables),
      fetchTable:async table=>{
        if(table==="_grist_Tables")return columnar([...ids].map(([tableId,id])=>({id,tableId})));
        if(table==="_grist_Tables_column")return columnar(schema);
        refresh();
        return columnar(tables[table],schema.filter(c=>c.parentId===ids.get(table)).map(c=>c.colId));
      },
      applyUserActions:async actions=>{
        if(failNext){failNext=false;throw Error("Échec d’écriture simulé");}
        calls.push(JSON.parse(JSON.stringify(actions)));const retValues=[];
        for(const [kind,table,id,fields]of actions){
          if(kind==="AddColumn"){
            assert.ok(!schema.some(c=>c.parentId===ids.get(table)&&c.colId===id));
            addColumn(table,id,fields.type,fields);
            for(const row of tables[table])row[id]=fields.type==="Int"?0:"";
          }else if(kind==="ModifyColumn"){
            Object.assign(schema.find(c=>c.parentId===ids.get(table)&&c.colId===id),fields);
          }else if(kind==="UpdateRecord"||kind==="AddRecord"){
            for(const key of Object.keys(fields))assert.ok(schema.some(c=>c.parentId===ids.get(table)&&c.colId===key&&!c.isFormula),`Champ ${table}.${key} saisissable`);
            if(kind==="AddRecord"){
              const newId=Math.max(0,...tables[table].map(row=>row.id))+1;tables[table].push({id:newId,...fields});retValues.push(newId);
            }else Object.assign(tables[table].find(row=>row.id===id),fields);
          }else if(kind==="RemoveRecord"){
            const index=tables[table].findIndex(row=>row.id===id);
            assert.ok(index>=0);tables[table].splice(index,1);
          }else throw Error(`Action inattendue : ${kind}`);
        }
        refresh();return {retValues};
      }
    }};
  }
  const scripts=[...w.document.querySelectorAll("script[src]")].map(s=>s.getAttribute("src")).filter(src=>!src.startsWith("https:")).map(src=>path.posix.normalize(`interlocuteurs/${src.split("?")[0]}`));
  for(const file of scripts){
    if(file==="interlocuteurs/organisation-model.js"&&live)installFakeGrist();
    run(file);
  }
  await settle();
  assert.deepEqual(errors,[]);
  assert.equal(w.document.querySelector("#people-content").hidden,false,w.document.querySelector("#interface-state").textContent);
  return {dom,w,doc:w.document,tables,calls,schema,context,errors,fail:()=>failNext=true,run:source=>vm.runInContext(source,context),cleanup:()=>w.close()};
}
function click(doc,text,scope=doc){const button=[...scope.querySelectorAll("button")].find(b=>b.textContent===text);assert.ok(button,`Bouton ${text}`);button.click();}
async function removePerson(p){p.doc.querySelector("#delete-person").click();await settle();await settle();}

domTest("responsables uniques au plus haut niveau, agents ordinaires dans plusieurs services",async()=>{
  const p=await page();try{
    p.run(`state.people.push({id:90,Prenom:"Agent",Nom:"Multiple",Interne_Mairie:true,Role_interne:"Agent",Actif:true});
      state.services[0].Agents.push(90,15);state.services[1].Agents.push(90);
      render();`);
    const count=name=>[...p.doc.querySelectorAll("#people-grid .person-card__identity h3")].filter(n=>n.textContent===name).length;
    assert.equal(count("Camille Martin"),1);
    assert.equal(count("Léa Moreau"),1);
    assert.equal(count("Noé Petit"),1);
    assert.equal(count("Agent Multiple"),2);
    assert.ok(cardByName(p,"Léa Moreau").closest(".directory-pole").querySelector("h3").textContent.includes("Services"));
    assert.equal(cardByName(p,"Noé Petit").closest(".directory-service").dataset.serviceId,"2");
    const before=p.run("JSON.stringify(state.services)");
    input(p,"#search","bâtiments");await settle();
    assert.equal(count("Léa Moreau"),1);assert.equal(count("Noé Petit"),1);
    assert.equal(p.run("JSON.stringify(state.services)"),before);
    assert.equal(p.errors.length,0);
  }finally{p.cleanup();}
});

domTest("un responsable de plusieurs services n'a qu'une carte, même sans pôle",async()=>{
  const p=await page();try{
    p.run(`state.services[0].Responsable_du_pole=false;
      state.services[0].Responsable_designe=15;state.services[0].Responsable=15;
      state.services[0].Pole=0;render();`);
    const noes=[...p.doc.querySelectorAll("#people-grid .person-card__identity h3")].filter(n=>n.textContent==="Noé Petit");
    assert.equal(noes.length,1);
    assert.equal(noes[0].closest(".directory-service").dataset.serviceId,"1");
  }finally{p.cleanup();}
});

domTest("une référence censurée bloque ; un nombre sans type référence ne bloque pas",async()=>{
  for(const censored of [true,false]){
    const p=await page({live:true});try{
      if(censored)p.tables.SERVICES[0].Agents=["C"];
      else p.tables.PROJETS[0].Responsable=23; // Colonne Text dans cette simulation.
      await openEdit(p,"Louis André");await removePerson(p);
      assert.equal(p.calls.length,censored?0:1);
      if(censored)assert.match(p.doc.querySelector("#person-form .form-message").textContent,/inaccessible ou en erreur/);
    }finally{p.cleanup();}
  }
});

domTest("suppression uniquement en modification ; annulation sans écriture",async()=>{
  const p=await page({live:true});try{
    click(p.doc,"+ Nouvel interlocuteur");await settle();
    assert.equal(p.doc.querySelector(".person-delete-zone").hidden,true);
    p.doc.querySelector("#person-dialog").close();
    await openEdit(p,"Louis André");
    assert.equal(p.doc.querySelector(".person-delete-zone").hidden,false);
    let prompt="";p.w.confirm=text=>{prompt=text;return false;};
    await removePerson(p);
    assert.match(prompt,/Louis André/);assert.equal(p.calls.length,0);
    assert.equal(p.doc.querySelector("#person-dialog").open,true);
  }finally{p.cleanup();}
});

domTest("suppression confirmée : une seule ligne retirée, formulaire fermé et annuaire actualisé",async()=>{
  const p=await page({live:true});try{
    const before=JSON.parse(JSON.stringify(p.tables));
    await openEdit(p,"Louis André");await removePerson(p);
    assert.deepEqual(p.calls,[[["RemoveRecord","INTERLOCUTEURS",23]]]);
    before.INTERLOCUTEURS=before.INTERLOCUTEURS.filter(row=>row.id!==23);
    assert.deepEqual(p.tables,before);
    assert.equal(p.doc.querySelector("#person-dialog").open,false);
    assert.equal(cardByName(p,"Louis André"),undefined);
    assert.equal(p.run("state.selected"),null);
  }finally{p.cleanup();}
});

domTest("DGS et responsabilités de pôle/service protégées sans confirmation ni écriture",async()=>{
  for(const name of ["Alice Robert","Camille Martin"]){
    const p=await page({live:true});try{
      let confirmed=false;p.w.confirm=()=>{confirmed=true;return true;};
      await openEdit(p,name);await removePerson(p);
      assert.equal(confirmed,false);assert.equal(p.calls.length,0);
      assert.match(p.doc.querySelector("#person-form .form-message").textContent,name==="Alice Robert"?/DGS/:/encore utilisé/);
    }finally{p.cleanup();}
  }
});

domTest("références typées historiques et nouvelles références pendant confirmation bloquent",async()=>{
  for(const late of [false,true]){
    const p=await page({live:true});try{
      // Champ ajouté à une table hors organisation, également valable s'il est calculé.
      const template=p.schema.find(c=>c.colId==="Participants")||p.schema.find(c=>c.colId==="Nom_projet");
      assert.ok(template);
      p.schema.push({...template,id:999,colId:"Auteur_historique",type:"RefList:INTERLOCUTEURS",isFormula:true});
      const table=p.tables.REUNIONS.some(r=>Object.hasOwn(r,"Participants"))?"REUNIONS":"PROJETS";
      const link=()=>{p.tables[table][0].Auteur_historique=["L",23];};
      if(late)p.w.confirm=()=>{link();return true;};else link();
      await openEdit(p,"Louis André");await removePerson(p);
      assert.equal(p.calls.length,0);
      assert.match(p.doc.querySelector("#person-form .form-message").textContent,/Auteur_historique/);
    }finally{p.cleanup();}
  }
});

domTest("lecture ou écriture en échec : aucune fermeture et message dans le formulaire",async()=>{
  for(const reading of [true,false]){
    const p=await page({live:true});try{
      await openEdit(p,"Louis André");
      if(reading)p.w.grist.docApi.fetchTable=async()=>{throw Error("Lecture refusée");};else p.fail();
      await removePerson(p);
      assert.equal(p.doc.querySelector("#person-dialog").open,true);
      assert.ok(p.tables.INTERLOCUTEURS.some(r=>r.id===23));
      assert.equal(p.calls.length,0);
      assert.match(p.doc.querySelector("#person-form .form-message").textContent,reading?/Lecture refusée/:/Échec d’écriture/);
    }finally{p.cleanup();}
  }
});

domTest("démo : suppression isolée aux données fictives",async()=>{
  const p=await page();try{
    await openEdit(p,"Louis André");await removePerson(p);
    assert.equal(p.run("state.people.some(r=>r.id===23)"),false);
    assert.equal(p.doc.querySelector("#person-dialog").open,false);
  }finally{p.cleanup();}
});

domTest("suppression réussie mais rechargement en échec : pas de formulaire obsolète",async()=>{
  const p=await page({live:true});try{
    const apply=p.w.grist.docApi.applyUserActions;
    p.w.grist.docApi.applyUserActions=async actions=>{
      const result=await apply(actions);
      p.w.grist.docApi.fetchTable=async()=>{throw Error("Rechargement indisponible");};
      return result;
    };
    await openEdit(p,"Louis André");await removePerson(p);
    assert.equal(p.doc.querySelector("#person-dialog").open,false);
    assert.match(p.doc.querySelector("#interface-state").textContent,/suppression a réussi/);
    assert.equal(p.calls.length,1);
  }finally{p.cleanup();}
});
function input(p,selector,value,event="input"){
  const node=p.doc.querySelector(selector);assert.ok(node,selector);node.value=value;node.dispatchEvent(new p.w.Event(event,{bubbles:true}));return node;
}
function cardNames(p,selector){return [...p.doc.querySelectorAll(selector+" .person-card__identity h3")].map(n=>n.textContent);}
function cardByName(p,name){return [...p.doc.querySelectorAll("#people-grid .directory-card")].find(c=>c.querySelector(".person-card__identity h3").textContent===name);}
async function openEdit(p,name){const card=cardByName(p,name);assert.ok(card,name);click(p.doc,"Modifier",card);await settle();}
async function save(p){p.doc.querySelector("#person-form").dispatchEvent(new p.w.Event("submit",{bubbles:true,cancelable:true}));await settle();}
domTest("vue initiale catégorisée, maire premier, adjoints ordonnés et rang non exposé",async()=>{
  const p=await page();try{
    assert.deepEqual(cardNames(p,".directory-elected"),["Zoé Renaud","Thomas Garcia","Sophie Bernard","Inès Benali","Louis André","Emma Lefort"]);
    assert.equal(p.doc.querySelectorAll(".directory-external .directory-card").length,0);
    assert.deepEqual(cardNames(p,".directory-direction"),["Alice Robert"]);
    assert.equal(p.doc.querySelectorAll(".directory-pole").length,2);
    assert.equal(p.doc.querySelectorAll(".directory-service").length,3);
    assert.equal(p.doc.querySelectorAll(".directory-service[open]").length,0);
    assert.doesNotMatch(p.doc.querySelector("#people-grid").textContent,/Rang/i);
    assert.equal(p.doc.querySelector("#active-filter").value,"active");
    const pole=p.doc.querySelector(".directory-pole");
    assert.deepEqual([...pole.querySelectorAll(":scope > .directory-cards .person-card__identity h3")].map(n=>n.textContent),["Camille Martin"]);
    assert.ok(p.doc.querySelector("#directory-expand"));
  }finally{p.cleanup();}
});
domTest("déplier les services, multi-appartenance et recherche de service",async()=>{
  const p=await page();try{
    click(p.doc,"Tout développer");await settle();assert.equal(p.doc.querySelectorAll(".directory-service[open]").length,3);
    click(p.doc,"Tout réduire");await settle();assert.equal(p.doc.querySelectorAll(".directory-service[open]").length,0);
    const lea=[...p.doc.querySelectorAll(".directory-service .person-card__identity h3")].filter(n=>n.textContent==="Léa Moreau");assert.equal(lea.length,0);
    input(p,"#search","bâtiments");await settle();
    assert.ok(p.doc.querySelector(".directory-service[open]"));assert.equal(p.doc.querySelectorAll(".directory-elected").length,0);
    assert.equal(p.doc.querySelectorAll(".directory-external .directory-card").length,0);
    click(p.doc,"Effacer la recherche");await settle();assert.equal(p.doc.querySelectorAll(".directory-service[open]").length,0);
  }finally{p.cleanup();}
});
domTest("recherche externe par organisme, fonction, nom ; réinitialisation sans externes",async()=>{
  const p=await page();try{
    for(const query of ["Territoires","Paysagiste","Alex Dubois"]){input(p,"#search",query);await settle();assert.deepEqual(cardNames(p,".directory-external"),["Alex Dubois"]);}
    input(p,"#search","");await settle();assert.equal(p.doc.querySelectorAll(".directory-external .directory-card").length,0);
    click(p.doc,"Parcourir les contacts externes");await settle();assert.deepEqual(cardNames(p,".directory-external"),["Alex Dubois"]);
    input(p,"#active-filter","","change");await settle();assert.deepEqual(cardNames(p,".directory-external"),["Alex Dubois","Nadia Leroy"]);
    click(p.doc,"Réinitialiser");await settle();assert.equal(p.doc.querySelectorAll(".directory-external .directory-card").length,0);assert.equal(p.doc.querySelector("#active-filter").value,"active");
  }finally{p.cleanup();}
});
domTest("fiche de consultation sans rang ; formulaire catégorisé et champs conditionnels",async()=>{
  const p=await page();try{
    click(p.doc,"Voir la fiche",cardByName(p,"Sophie Bernard"));await settle();
    const detail=p.doc.querySelector("#detail-body");assert.match(detail.textContent,/Adjoint au maire/);assert.match(detail.textContent,/Urbanisme et aménagement/);assert.doesNotMatch(detail.textContent,/Rang/);
    click(p.doc,"Modifier",detail);await settle();
    const f=p.doc.querySelector("#person-form");
    assert.equal(f.elements.Fonction_elu.value,"Adjoint au maire");assert.equal(f.elements.Rang.value,"2");assert.equal(f.elements.Rang.closest("label").hidden,false);
    assert.equal(f.elements.Delegation.closest("label").hidden,false);assert.equal(f.elements.Fonction.closest("label").hidden,true);
    assert.equal(f.querySelectorAll(".directory-form-section").length,5);
    input(p,'#person-form [name="Fonction_elu"]',"Conseiller délégué","change");
    assert.equal(f.elements.Rang.closest("label").hidden,true);assert.equal(f.elements.Delegation.closest("label").hidden,false);
    input(p,'#person-form [name="Fonction_elu"]',"Conseiller municipal","change");
    assert.equal(f.elements.Delegation.closest("label").hidden,true);
    input(p,'#person-form [name="Role_interne"]',"Agent","change");
    assert.equal(f.elements.Fonction_elu.closest("section").hidden,true);assert.equal(f.elements.Fonction.closest("label").hidden,false);
    assert.deepEqual(p.errors,[]);
  }finally{p.cleanup();}
});
domTest("enregistrement du rang et de la délégation, tri immédiat, fonction historique conservée",async()=>{
  const p=await page();try{
    await openEdit(p,"Sophie Bernard");
    input(p,'#person-form [name="Rang"]',"1");input(p,'#person-form [name="Delegation"]',"Mobilités et voirie");
    await save(p);assert.equal(p.doc.querySelector("#person-dialog").open,false);
    assert.deepEqual(cardNames(p,".directory-elected").slice(0,3),["Zoé Renaud","Sophie Bernard","Thomas Garcia"]);
    assert.equal(p.run('state.people.find(p=>p.id===11).Fonction'),"Adjointe à l’urbanisme");
    assert.equal(p.run('state.people.find(p=>p.id===11).Delegation'),"Mobilités et voirie");
    input(p,"#search","mobilites");await settle();assert.deepEqual(cardNames(p,".directory-elected"),["Sophie Bernard"]);
    assert.doesNotMatch(p.doc.querySelector("#people-grid").textContent,/Rang/);
    assert.deepEqual(p.errors,[]);
  }finally{p.cleanup();}
});
domTest("préparation explicite des trois champs Grist, aucune écriture au chargement",async()=>{
  const p=await page({live:true,missingMandate:true});try{
    assert.equal(p.calls.length,0);
    assert.equal(p.doc.querySelector(".directory-setup").hidden,false);
    await openEdit(p,"Sophie Bernard");input(p,'#person-form [name="Fonction_elu"]',"Adjoint au maire","change");await save(p);
    assert.equal(p.calls.length,0);assert.equal(p.doc.querySelector("#person-dialog").open,true);
    assert.match(p.doc.querySelector("#person-form .form-message").textContent,/Préparez les champs/);
    p.doc.querySelector("#person-dialog").close();
    await p.run('window.MunicipalDirectory.prepareElectedFields()');await settle();
    assert.equal(p.calls.length,1);assert.deepEqual(p.calls[0].map(a=>a.slice(0,3)),[["AddColumn","INTERLOCUTEURS","Fonction_elu"],["AddColumn","INTERLOCUTEURS","Delegation"],["AddColumn","INTERLOCUTEURS","Rang"]]);
    assert.equal(p.doc.querySelector(".directory-setup").hidden,true);
    await openEdit(p,"Sophie Bernard");input(p,'#person-form [name="Fonction_elu"]',"Adjoint au maire","change");input(p,'#person-form [name="Rang"]',"3");input(p,'#person-form [name="Delegation"]',"Urbanisme");
    await save(p);assert.equal(p.doc.querySelector("#person-dialog").open,false);
    const row=p.tables.INTERLOCUTEURS.find(p=>p.id===11);assert.equal(row.Rang,3);assert.equal(row.Delegation,"Urbanisme");assert.equal(row.Fonction,"Adjointe à l’urbanisme");
    assert.equal(p.calls.length,2);assert.equal(p.calls[1].length,1);assert.equal(p.calls[1][0][1],"INTERLOCUTEURS");
    await p.run('window.MunicipalDirectory.prepareElectedFields()');assert.equal(p.calls.length,2);
    assert.deepEqual(p.errors,[]);
  }finally{p.cleanup();}
});
domTest("échec d’écriture : formulaire ouvert et valeurs conservées",async()=>{
  const p=await page({live:true});try{
    await openEdit(p,"Sophie Bernard");input(p,'#person-form [name="Delegation"]',"Voirie");p.fail();await save(p);
    assert.equal(p.doc.querySelector("#person-dialog").open,true);
    assert.match(p.doc.querySelector("#person-form .form-message").textContent,/Échec d’écriture simulé/);
    assert.equal(p.doc.querySelector('#person-form [name="Delegation"]').value,"Voirie");
    assert.equal(p.tables.INTERLOCUTEURS.find(p=>p.id===11).Delegation,"Urbanisme et aménagement");
    assert.deepEqual(p.errors,[]);
  }finally{p.cleanup();}
});
domTest("ajout d’un élu et suppression d’un rang existant",async()=>{
  const p=await page({live:true});try{
    click(p.doc,"+ Nouvel interlocuteur");await settle();
    const f=p.doc.querySelector("#person-form");
    input(p,'#person-form [name="Nom"]',"Mercier");input(p,'#person-form [name="Prenom"]',"Paul");
    f.elements.Interne_Mairie.checked=true;f.elements.Interne_Mairie.dispatchEvent(new p.w.Event("change"));
    input(p,'#person-form [name="Role_interne"]',"Élu","change");
    input(p,'#person-form [name="Fonction_elu"]',"Adjoint au maire","change");
    input(p,'#person-form [name="Delegation"]',"Sport");input(p,'#person-form [name="Rang"]',"3");
    await save(p);assert.equal(p.doc.querySelector("#person-dialog").open,false);
    const created=p.tables.INTERLOCUTEURS.find(row=>row.Nom==="Mercier");assert.ok(created);assert.equal(created.Fonction_elu,"Adjoint au maire");assert.equal(created.Rang,3);assert.equal(created.Delegation,"Sport");
    assert.deepEqual(p.calls[0][0].slice(0,3),["AddRecord","INTERLOCUTEURS",null]);
    await openEdit(p,"Paul Mercier");input(p,'#person-form [name="Rang"]',"");await save(p);
    assert.equal(created.Rang,0);assert.equal(created.Delegation,"Sport");assert.equal(p.doc.querySelector("#person-dialog").open,false);
    assert.doesNotMatch(cardByName(p,"Paul Mercier").textContent,/Rang/);
    assert.deepEqual(p.errors,[]);
  }finally{p.cleanup();}
});
domTest("les agents restent modifiables avant préparation des champs des élus",async()=>{
  const p=await page({live:true,missingMandate:true});try{
    await openEdit(p,"Camille Martin");
    const f=p.doc.querySelector("#person-form");assert.equal(f.elements.Fonction_elu.closest("section").hidden,true);
    const memberships=JSON.stringify(p.tables.SERVICES.map(s=>s.Agents));
    input(p,'#person-form [name="Fonction"]',"Responsable de l’aménagement");await save(p);
    assert.equal(p.doc.querySelector("#person-dialog").open,false);
    assert.equal(p.tables.INTERLOCUTEURS.find(row=>row.id===10).Fonction,"Responsable de l’aménagement");
    assert.equal(JSON.stringify(p.tables.SERVICES.map(s=>s.Agents)),memberships);
    assert.ok(!Object.hasOwn(p.calls[0][0][3],"Rang"));assert.ok(!Object.hasOwn(p.calls[0][0][3],"Fonction_elu"));
    assert.deepEqual(p.errors,[]);
  }finally{p.cleanup();}
});
domTest("l’ouverture individuelle des services reste mémorisée après un filtre",async()=>{
  const p=await page();try{
    click(p.doc,"Tout développer");await settle();
    const first=p.doc.querySelector(".directory-service");const id=first.dataset.serviceId;first.open=false;await settle();
    input(p,"#active-filter","","change");await settle();
    assert.equal(p.doc.querySelector(`.directory-service[data-service-id="${id}"]`).open,false);
    assert.equal(p.doc.querySelectorAll(".directory-service[open]").length,2);
  }finally{p.cleanup();}
});
