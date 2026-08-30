/* Tri, recherche et champs du mandat : aucune écriture ni dépendance au DOM. */
(function(root){
  "use strict";
  const O=typeof module!=="undefined"?require("./organisation-model.js"):root.OrganisationModel;
  const FUNCTIONS=["Maire","Adjoint au maire","Conseiller délégué","Conseiller municipal"];
  const collator=new Intl.Collator("fr",{sensitivity:"base",numeric:true});
  const norm=value=>String(value??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
  const internal=p=>O.yes(p?.Interne_Mairie??p?.Interne_Sanguinet);
  const elected=p=>internal(p)&&norm(p.Role_interne)==="elu";
  const agent=p=>internal(p)&&(norm(p.Role_interne)==="agent"||O.dgs(p));
  const category=p=>elected(p)?"elected":agent(p)?"agent":internal(p)?"internal":"external";
  const fullName=p=>[p?.Prenom,p?.Nom].filter(Boolean).join(" ")||p?.Nom_complet||"Interlocuteur sans nom";
  const alphabet=(a,b)=>collator.compare(a.Nom||fullName(a),b.Nom||fullName(b))||collator.compare(a.Prenom||"",b.Prenom||"")||Number(a.id)-Number(b.id);
  const rank=p=>Number.isSafeInteger(Number(p.Rang))&&Number(p.Rang)>0?Number(p.Rang):Infinity;
  const functionOrder=p=>{const n=FUNCTIONS.indexOf(p.Fonction_elu);return n<0?4:n;};
  function electedOrder(a,b){
    const roleDiff=functionOrder(a)-functionOrder(b);if(roleDiff)return roleDiff;
    if(a.Fonction_elu===FUNCTIONS[1]&&b.Fonction_elu===FUNCTIONS[1]&&rank(a)!==rank(b))return rank(a)-rank(b);
    return alphabet(a,b);
  }
  const functionLabel=p=>elected(p)?String(p.Fonction_elu||p.Fonction||"Fonction à renseigner"):String(p.Fonction||"Fonction non renseignée");
  const hasDelegation=p=>elected(p)&&[FUNCTIONS[1],FUNCTIONS[2]].includes(p.Fonction_elu);
  const delegatedRole=value=>[FUNCTIONS[1],FUNCTIONS[2]].includes(value);
  function matches(person,filters,services=[],poles=[]){
    const kind=category(person), query=norm(filters.query), type=filters.type||"";
    if(filters.active==="active"&&!O.active(person))return false;
    if(filters.active==="inactive"&&O.active(person))return false;
    if(type&&kind!==type)return false;
    if(kind==="external"&&!query&&!filters.browseExternal&&type!=="external")return false;
    const links=O.servicesOf(person,services,poles);
    const responsibilities=poles.filter(p=>[Number(p.Responsable),Number(p.Responsable_adjoint)].includes(Number(person.id)));
    const titles=O.responsibilities(person,services,poles);
    const haystack=norm([fullName(person),person.Nom_complet,person.Organisme,person.Fonction,person.Fonction_elu,person.Delegation,person.Role_interne,person.Email,person.Telephone,O.dgs(person)?"DGS Direction générale des services":"",...titles,...responsibilities.map(p=>p.Pole),...links.flatMap(s=>[s.Nom_service,O.poleOf(s,poles)?.Pole])].join(" "));
    return !query||query.split(/\s+/).every(term=>haystack.includes(term));
  }
  function mandateValues(data,current,people){
    const fields={Fonction_elu:String(data.get("Fonction_elu")||""),Delegation:String(data.get("Delegation")||"").trim(),Rang:0};
    if(fields.Fonction_elu&&!FUNCTIONS.includes(fields.Fonction_elu)){
      // Une valeur personnalisée déjà présente n'est pas effacée lors d'une
      // simple modification des coordonnées. Elle peut être reclassée explicitement.
      if(fields.Fonction_elu===current?.Fonction_elu)return {};
      throw Error("Choisissez une fonction d’élu dans la liste.");
    }
    if(!delegatedRole(fields.Fonction_elu))fields.Delegation="";
    if(fields.Fonction_elu===FUNCTIONS[1]){
      const raw=String(data.get("Rang")||"").trim();
      if(raw&&!/^[1-9]\d*$/.test(raw))throw Error("Le rang doit être un nombre entier supérieur ou égal à 1, ou rester vide.");
      fields.Rang=raw?Number(raw):0;
      if(!Number.isSafeInteger(fields.Rang))throw Error("Le rang est trop grand.");
    }
    if(fields.Fonction_elu===FUNCTIONS[0]&&data.get("Actif")==="on"&&people.some(p=>p.id!==current?.id&&elected(p)&&O.active(p)&&p.Fonction_elu===FUNCTIONS[0]))throw Error("Un maire actif est déjà renseigné. Modifiez d’abord sa fonction ou son état.");
    return fields;
  }
  // Placement unique des responsables, indépendant de la recherche de personnes.
  // Les agents sans responsabilité n'ont pas de placement imposé.
  function leadershipPlacements(poles,services){
    const placements=new Map();
    const ordered=rows=>[...rows].sort((a,b)=>collator.compare(a.Nom_service||a.Pole||"",b.Nom_service||b.Pole||"")||Number(a.id)-Number(b.id));
    const assign=(personId,kind,id)=>{personId=Number(personId);if(personId>0&&!placements.has(personId))placements.set(personId,{kind,id:Number(id)});};
    const sortedPoles=ordered(poles);
    for(const p of sortedPoles)assign(p.Responsable,"pole",p.id);
    for(const p of sortedPoles)assign(p.Responsable_adjoint,"pole",p.id);
    for(const s of ordered(services))assign(O.responsible(s,poles),"service",s.id);
    return placements;
  }
  const FIELDS=[
    ["Fonction_elu","Choice","Fonction élu"],
    ["Delegation","Text","Délégation"],
    ["Rang","Int","Rang des adjoints"]
  ];
  function schemaActions(columns){
    const actions=[];
    for(const [colId,type,label] of FIELDS){
      const current=columns.find(c=>c.tableId==="INTERLOCUTEURS"&&c.colId===colId);
      if(current&&(String(current.formula||"").trim()||current.type!==type))throw Error(`Le champ ${label} possède un type ou une formule à vérifier. Aucune modification n’a été effectuée.`);
      if(!current){
        const field={type,label,isFormula:false};
        if(colId==="Fonction_elu")field.widgetOptions=JSON.stringify({choices:FUNCTIONS});
        actions.push(["AddColumn","INTERLOCUTEURS",colId,field]);
      }else{
        const changes={};
        if(O.yes(current.isFormula))Object.assign(changes,{isFormula:false,formula:""});
        if(colId==="Fonction_elu"){
          let options={};try{options=JSON.parse(current.widgetOptions||"{}");}catch{throw Error("La configuration de Fonction élu est illisible. Vérifiez-la dans Grist.");}
          const choices=Array.isArray(options.choices)?options.choices:[];
          if(FUNCTIONS.some(f=>!choices.includes(f)))changes.widgetOptions=JSON.stringify({...options,choices:[...new Set([...choices,...FUNCTIONS])]});
        }
        if(Object.keys(changes).length)actions.push(["ModifyColumn","INTERLOCUTEURS",colId,changes]);
      }
    }
    return actions;
  }
  const api={FUNCTIONS,FIELDS,norm,internal,elected,agent,category,fullName,alphabet,rank,electedOrder,functionLabel,hasDelegation,delegatedRole,matches,mandateValues,schemaActions,leadershipPlacements};
  if(typeof module!=="undefined")module.exports=api;else root.AnnuaireModel=api;
})(typeof window==="undefined"?{}:window);
