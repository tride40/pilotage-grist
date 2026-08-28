"use strict";

(function exposePilotageContext() {
  const PROJECT_PAGE_URL = "https://grist.numerique.gouv.fr/o/docs/f8iwcexDATAw/Pilotage-des-projets/p/10";
  const PROJECT_STORAGE_KEY = "pilotage-grist:selected-project";
  const params = new URLSearchParams(window.location.search);
  const projectId = params.get("projectId") || params.get("projet") || "";
  const mode = params.get("mode") === "project" || projectId ? "project" : "global";

  function url(path, options = {}) {
    const target = new URL(path, window.location.href);
    const id = options.projectId ?? projectId;
    const targetMode = options.mode ?? (id ? "project" : "global");
    if (id) target.searchParams.set("projectId", String(id));
    else target.searchParams.delete("projectId");
    target.searchParams.set("mode", targetMode);
    if (params.get("demo") === "1") target.searchParams.set("demo", "1");
    return target.href;
  }

  function selectProject(projects, preferredId, fallback) {
    const wanted = preferredId || projectId;
    return projects.find((project) => String(project.id) === String(wanted)) || fallback();
  }

  function isValidProjectContext(actualProjectId) {
    return mode === "project" && Boolean(projectId) && String(actualProjectId) === String(projectId);
  }

  function rememberProject(project) {
    if (!project || !project.id) return false;
    try {
      localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify({ id: project.id, name: project.Nom_projet || project.name || "", at: Date.now() }));
      return true;
    } catch (_) { return false; }
  }

  function projectPageUrl(actualProjectId) {
    if (params.get("demo") === "1" && window.self === window.top) return url("../fiche-projet/", { projectId: actualProjectId, mode: "project" });
    return PROJECT_PAGE_URL;
  }

  function configureProjectReturn(link, project) {
    if (!link) return false;
    const valid = isValidProjectContext(project?.id);
    link.hidden = !valid;
    if (!valid) { link.removeAttribute("href"); return false; }
    link.href = projectPageUrl(project.id);
    link.onclick = () => { rememberProject(project); };
    return true;
  }

  window.PilotageContext = Object.freeze({ projectId, mode, isProjectMode: mode === "project", url, selectProject, isValidProjectContext, rememberProject, projectPageUrl, configureProjectReturn });
}());
