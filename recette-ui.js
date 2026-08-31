"use strict";

(function mount() {
  const $ = id => document.getElementById(id);
  const form = $("task-form"), workspace = $("workspace"), editor = $("editor");
  let service, data = { tasks: [], projects: [] }, selected = null, busy = false, scroll = 0;
  function node(tag, text, className = "") {
    const item = document.createElement(tag); item.textContent = text; item.className = className; return item;
  }
  function button(text, run, className = "", label = text) {
    const item = node("button", text, `button button--secondary ${className}`);
    item.type = "button"; item.setAttribute("aria-label", label); item.onclick = run; return item;
  }
  function dateValue(value) { return typeof value === "number" && Number.isFinite(value) ? new Date(value * 1000).toISOString().slice(0, 10) : ""; }
  function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
  function forget() {
    service?.clear(); data = { tasks: [], projects: [] }; selected = null;
    workspace.hidden = editor.hidden = true; $("tasks").replaceChildren(); form.reset();
    form.elements.projectId.replaceChildren(new Option("Indépendante d’un projet", "0"));
  }
  function render() {
    const completed = $("filter").value === "done", list = data.tasks.filter(task => task.Terminee === completed);
    const container = $("tasks"); container.replaceChildren();
    $("count").textContent = `${list.length} tâche${list.length > 1 ? "s" : ""} ${completed ? "terminée" : "à faire"}${completed && list.length > 1 ? "s" : ""}`;
    if (!list.length) container.append(node("p", completed ? "Aucune tâche terminée pour le moment." : "Rien à faire ici pour le moment. Ajoutez votre première tâche personnelle.", "task-card"));
    list.forEach((task, index) => {
      const card = node("article", "", `task-card${completed ? " done" : ""}`), meta = node("div", "", "task-meta");
      card.append(node("h3", task.Intitule));
      const project = data.projects.find(row => row.id === task.Projet);
      meta.append(node("span", task.Projet ? project?.Nom_projet || "Projet non accessible" : "Indépendante"));
      const deadline = dateValue(task.Echeance);
      if (deadline) meta.append(node("span", `${!completed && deadline < today() ? "En retard · " : "Échéance · "}${new Date(deadline + "T12:00:00").toLocaleDateString("fr-FR")}`, !completed && deadline < today() ? "late" : ""));
      card.append(meta);
      if (task.Note) card.append(node("p", task.Note));
      const actions = node("div", "", "task-actions");
      actions.append(button(completed ? "Remettre à faire" : "Terminer", () => run(() => service.complete(task.id, !completed))), button("Modifier", () => open(task)));
      for (const [text, direction, label] of [["↑", -1, "Monter"], ["↓", 1, "Descendre"]]) {
        const move = button(text, () => run(() => service.move(task.id, direction)), "", `${label} la tâche : ${task.Intitule}`);
        move.disabled = direction < 0 ? index === 0 : index === list.length - 1; actions.append(move);
      }
      actions.append(button("Supprimer", () => {
        if (window.confirm(`Supprimer définitivement « ${task.Intitule} » ? Vous pouvez aussi la marquer terminée pour la conserver.`)) run(() => service.remove(task.id));
      }, "delete"));
      card.append(actions); container.append(card);
    });
  }
  function back() {
    if (busy) return;
    editor.hidden = true; workspace.hidden = false; form.reset(); selected = null;
    $("new-task").focus({ preventScroll: true }); window.scrollTo(0, scroll);
  }
  function open(task = null) {
    if (busy) return;
    selected = task?.id ?? null; scroll = window.scrollY;
    form.reset(); $("form-error").textContent = "";
    form.elements.title.value = task?.Intitule || ""; form.elements.note.value = task?.Note || "";
    form.elements.deadline.value = dateValue(task?.Echeance);
    const project = form.elements.projectId;
    project.replaceChildren(new Option("Indépendante d’un projet", "0"), ...data.projects.map(row => new Option(row.Nom_projet || "Projet sans nom", row.id)));
    if (task?.Projet && !data.projects.some(row => row.id === task.Projet)) project.append(new Option("Projet non accessible — choisir un autre rattachement", task.Projet));
    project.value = String(task?.Projet || 0);
    $("editor-title").textContent = task ? "Modifier ma tâche" : "Nouvelle tâche";
    workspace.hidden = true; editor.hidden = false; form.elements.title.focus();
  }
  async function run(operation, returnToList = false) {
    if (busy) return;
    busy = true; $("status").textContent = "Enregistrement…"; $("form-error").textContent = "";
    const controls = [...document.querySelectorAll("main button, main input, main select, main textarea")];
    const disabled = controls.map(control => control.disabled); controls.forEach(control => { control.disabled = true; });
    try {
      data = await operation();
      if (window.PilotageTestMode.isReadOnly()) throw Error("Le mode test a changé. Rechargez la page.");
      render(); $("status").textContent = "Enregistré dans votre espace personnel.";
      busy = false; if (returnToList) back();
    } catch (error) {
      // On mutation errors, discard private snapshots and uncertain drafts;
      // reloading verifies revocation and avoids duplicate blind retries.
      forget(); $("status").textContent = error.message;
    } finally { busy = false; controls.forEach((control, index) => { control.disabled = disabled[index]; }); }
  }
  async function load() {
    if (busy) return;
    busy = true; $("reload").disabled = true; forget(); $("status").textContent = "Lecture de vos tâches personnelles…";
    try {
      if (!window.grist?.docApi) throw Error("Ouvrez cette page comme widget dans le document de recette Grist.");
      await window.grist.ready({ requiredAccess: "full" });
      service = window.RecetteTasks.create({ grist: window.grist, mode: window.PilotageTestMode, identify: () => window.PilotageCurrentUser.identify() });
      data = await service.initialize();
      render(); workspace.hidden = false; $("status").textContent = "Vos tâches sont enregistrées dans Grist, sans notification partagée.";
    } catch (error) { forget(); $("status").textContent = error.message; }
    finally { busy = false; $("reload").disabled = false; }
  }
  $("new-task").onclick = () => open(); $("back").onclick = $("cancel").onclick = back;
  $("reload").onclick = load; $("filter").onchange = render;
  form.onsubmit = event => {
    event.preventDefault(); if (!form.reportValidity() || busy) return;
    const input = { title: form.elements.title.value, note: form.elements.note.value, projectId: Number(form.elements.projectId.value), deadline: form.elements.deadline.value || null };
    // Validate before entering mutation path so field errors keep the draft.
    if (!input.title.trim()) { $("form-error").textContent = "L’intitulé est obligatoire."; return; }
    run(() => service.save(selected, input), true);
  };
  window.addEventListener("storage", () => {
    if (window.PilotageTestMode?.isReadOnly()) { forget(); $("status").textContent = "Mode test modifié : les tâches privées ont été masquées. Rechargez la page."; }
  });
  // No private task or draft is persisted in browser storage.
  load();
})();
