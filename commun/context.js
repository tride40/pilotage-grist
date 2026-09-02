"use strict";

(function exposePilotageContext() {
  const PROJECT_PAGE_URL = "https://grist.numerique.gouv.fr/o/docs/f8iwcexDATAw/Pilotage-des-projets/p/10";
  const PROJECT_STORAGE_KEY = "pilotage-grist:selected-project";
  const params = new URLSearchParams(window.location.search);
  // Les paramètres de la page Grist ne sont pas transmis à son widget.
  // Transmettre le projet aux réunions dans cette fenêtre, une seule fois.
  const MEETING_CONTEXT_KEY = "pilotage-grist:meeting-navigation";
  function pendingMeetingProject() {
    if (!/\/reunions\/(?:index\.html)?$/.test(window.location.pathname || "")) return "";
    try {
      const pending = JSON.parse(sessionStorage.getItem(MEETING_CONTEXT_KEY) || "null");
      sessionStorage.removeItem(MEETING_CONTEXT_KEY);
      return pending && Date.now() - pending.at < 60000 ? String(pending.id) : "";
    } catch (_) { return ""; }
  }
  const projectId = params.get("projectId") || params.get("projet") || pendingMeetingProject();
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
    return window.PilotageNavigation?.applicationUrl(PROJECT_PAGE_URL) || `${PROJECT_PAGE_URL}?style=singlePage`;
  }

  function projectToolUrl(tool, actualProjectId) {
    if (params.get("demo") === "1" && window.self === window.top) {
      return url(tool === "actions" ? "../actions/actions.html" : "../reunions/", { projectId: actualProjectId, mode: "project" });
    }
    return window.PilotageNavigation.pageUrl(tool);
  }

  function rememberToolProject(tool, project) {
    rememberProject(project);
    if (tool === "meetings" && project?.id) {
      try { sessionStorage.setItem(MEETING_CONTEXT_KEY, JSON.stringify({ id: project.id, at: Date.now() })); } catch (_) { /* Le sélecteur de projet reste disponible. */ }
    }
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

  window.PilotageContext = Object.freeze({ projectId, mode, isProjectMode: mode === "project", url, selectProject, isValidProjectContext, rememberProject, projectPageUrl, configureProjectReturn, projectToolUrl, rememberToolProject });
}());
