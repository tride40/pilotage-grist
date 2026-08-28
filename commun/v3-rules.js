"use strict";
(function expose(root,factory){const api=factory();if(typeof module!=="undefined"&&module.exports)module.exports=api;else root.PilotageV3Rules=api})(typeof window!=="undefined"?window:globalThis,()=>{
  const text=value=>String(value??"").trim().toLocaleLowerCase("fr-FR").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  const has=value=>value!==null&&value!==undefined&&String(value).trim()!=="";
  const agent=project=>Object.prototype.hasOwnProperty.call(project||{},"Agent_pilote")?project.Agent_pilote:project?.Responsable;
  function projectErrors(project){const errors=[],status=text(project?.Statut);if(status==="en cours"){if(!has(project?.Elu_pilote))errors.push("Désignez un Élu pilote avant de passer le projet à En cours.");if(!has(agent(project)))errors.push("Désignez un Agent pilote avant de passer le projet à En cours.")}if(status==="abandonne"&&!has(project?.Motif_abandon))errors.push("Le motif d’abandon est obligatoire.");return errors}
  function projectJournalChanges(before={},after={}){const same=(a,b)=>String(a??"")===String(b??""),value=(project,field)=>field==="Agent_pilote"?agent(project):project[field],groups=[{type:"Changement de pilote",fields:["Elu_pilote","Agent_pilote"]},{type:"Changement d’objectif",fields:["Trimestre_objectif","Annee_objectif"]}];return groups.map(group=>({...group,fields:group.fields.filter(field=>!same(value(before,field),value(after,field)))})).filter(group=>group.fields.length)}
  const isProjectActive=project=>!["termine","abandonne"].includes(text(project?.Statut));
  const isActionClosed=action=>["realisee","non aboutie"].includes(text(action?.Statut));
  return{normalize:text,projectErrors,projectJournalChanges,isProjectActive,isActionClosed};
});
