"use strict";

(function exposePilotageContext() {
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

  window.PilotageContext = Object.freeze({ projectId, mode, isProjectMode: mode === "project", url, selectProject });
}());
