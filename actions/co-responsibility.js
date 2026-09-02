"use strict";
(function mount(){
  const $=id=>document.getElementById(id);let service=null,result=null,busy=false;
  function controls(){$("check").disabled=busy;$("confirm").disabled=busy;$("install").disabled=busy||!$("confirm").checked||!result?.readyToInstall||result.alreadyInstalled||result.outcomeUncertain;}
  function render(value){result=value;$("findings").replaceChildren(...value.findings.map(text=>{const li=document.createElement("li");li.textContent=text;return li;}));$("status").textContent=value.outcomeUncertain?"Résultat incertain : ne recommencez pas.":value.alreadyInstalled?"Co-responsabilité confirmée : les nouvelles règles sont actives.":value.readyToInstall?`Adaptation prête : ${value.changed} modifications techniques, sans donnée métier.`:"Adaptation bloquée : examinez l’écart affiché.";controls();}
  async function execute(operation){if(busy)return;busy=true;controls();try{render(await operation());}catch(error){result=null;$("status").textContent=error.message;$("findings").replaceChildren();}finally{busy=false;controls();}}
  $("confirm").onchange=controls;
  $("check").onclick=()=>execute(async()=>{if(!window.grist?.docApi)throw Error("Ouvrez cette page comme widget dans le document de base Grist.");await window.grist.ready({requiredAccess:"full"});if(!window.PilotageActionCoResponsibilityMigration?.create)throw Error("Le module d’adaptation manque dans la publication.");service??=window.PilotageActionCoResponsibilityMigration.create({grist:window.grist,mode:window.PilotageGristWrite});return service.inspect();});
  $("install").onclick=()=>{if(busy||$("install").disabled||!service)return;if(!window.confirm("Activer la co-responsabilité des pôles ? Aucune action existante ne sera modifiée."))return;execute(()=>service.install({confirmed:true}));};
  controls();
})();
