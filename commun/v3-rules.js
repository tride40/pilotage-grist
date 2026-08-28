"use strict";
(function expose(root,factory){const api=factory();if(typeof module!=="undefined"&&module.exports)module.exports=api;else root.PilotageV3Rules=api})(typeof window!=="undefined"?window:globalThis,()=>{
  const text=value=>String(value??"").trim().toLocaleLowerCase("fr-FR").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  const has=value=>value!==null&&value!==undefined&&String(value).trim()!=="";
  function projectErrors(project){const errors=[],status=text(project?.Statut);if(status==="en cours"){if(!has(project?.Elu_pilote))errors.push("Désignez un Élu pilote avant de passer le projet à En cours.");if(!has(project?.Agent_pilote??project?.Responsable))errors.push("Désignez un Agent pilote avant de passer le projet à En cours.")}if(status==="abandonne"&&!has(project?.Motif_abandon))errors.push("Le motif d’abandon est obligatoire.");return errors}
  const isProjectActive=project=>!["termine","abandonne"].includes(text(project?.Statut));
  const isActionClosed=action=>["realisee","non aboutie"].includes(text(action?.Statut));
  return{normalize:text,projectErrors,isProjectActive,isActionClosed};
});
