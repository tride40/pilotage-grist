/* Suppression volontaire d'une fiche sans références. Aucun effacement en cascade. */
"use strict";
(() => {
  const zone = document.createElement("section");
  zone.className = "person-delete-zone";
  zone.hidden = true;
  const heading = textElement("h3", "Suppression définitive");
  const explanation = textElement("p", "Retire définitivement cette fiche de l’annuaire. Pour conserver son historique, désactivez plutôt l’interlocuteur. Les fiches encore utilisées ne peuvent pas être supprimées.");
  const remove = button("Supprimer définitivement", "secondary", deleteSelected);
  remove.id = "delete-person";
  zone.append(heading, explanation, remove);
  ui.form.querySelector(".form-grid").append(zone);
  const originalOpen = openForm;
  openForm = function(person = null) {
    originalOpen(person);
    zone.hidden = !person;
  };

  // La démonstration utilise uniquement ses propres données fictives.
  function demoSnapshot() {
    const tables = {INTERLOCUTEURS:state.people, SERVICES:state.services,
      POLES:window.MunicipalOrganisation.getPoles(), PROJETS:state.projects,
      REUNIONS:state.meetings, ACTIONS:state.actions, CONSIGNES_POLITIQUES:state.instructions};
    const fields = {
      SERVICES:["Agents","Responsable","Responsable_designe"],
      POLES:["Responsable","Responsable_adjoint"],
      PROJETS:["Responsable","Agent_pilote","Elu_pilote","Agents_associes","Elus_associes","Interlocuteurs_externes"],
      REUNIONS:["Participants","Interlocuteurs","Organisateur"],
      ACTIONS:["Responsable","Agent_responsable","Elu_responsable"],
      CONSIGNES_POLITIQUES:["Responsable","Emetteur","Elu_emetteur","Destinataires"]
    };
    return {tables, columns:Object.entries(fields).flatMap(([tableId, names])=>names.map(colId=>({tableId,colId})))};
  }

  async function snapshot() {
    if (state.demo) return demoSnapshot();
    const api = window.grist.docApi;
    const fetch = async name => {
      const raw = await withTimeout(api.fetchTable(name), `vérification de ${name}`);
      if (!raw || !Array.isArray(raw.id)) throw Error(`Impossible de vérifier la table ${name}. Aucune suppression effectuée.`);
      return columnarToRecords(raw);
    };
    // Relire les métadonnées : les références d'autres widgets comptent aussi.
    const [tableRows, columnRows] = await Promise.all([fetch("_grist_Tables"),fetch("_grist_Tables_column")]);
    if (!tableRows.some(t=>t.tableId===TABLE) || !columnRows.length) throw Error("Structure du document inaccessible. Aucune suppression effectuée.");
    const tableNames = new Map(tableRows.map(t=>[t.id,t.tableId]));
    const columns = columnRows.filter(c=>["Ref:INTERLOCUTEURS","RefList:INTERLOCUTEURS"].includes(c.type))
      .map(c=>({...c,tableId:tableNames.get(c.parentId)}));
    if (columns.some(c=>!c.tableId)) throw Error("Une référence ne peut pas être vérifiée. Aucune suppression effectuée.");
    const names = [...new Set([TABLE,...columns.map(c=>c.tableId)])];
    const tables = Object.fromEntries(await Promise.all(names.map(async name=>[name,await fetch(name)])));
    return {tables,columns};
  }

  async function check(id) {
    const {tables,columns} = await snapshot();
    const person = tables[TABLE].find(row=>Number(row.id)===id);
    if (!person) throw Error("Cette fiche n’existe plus. Fermez le formulaire et actualisez l’annuaire.");
    if (isTrue(person.Est_DGS)) throw Error("Cette personne est identifiée comme DGS. Désignez sa remplaçante ou son remplaçant avant de supprimer sa fiche.");
    const links = [];
    for (const column of columns) {
      const rows = tables[column.tableId];
      // Une cellule masquée ou en erreur n'est jamais assimilée à une absence de lien.
      if (!state.demo && rows.some(row=>!Object.hasOwn(row,column.colId) ||
          (Array.isArray(row[column.colId]) && row[column.colId][0]!=="L"))) {
        throw Error(`La référence ${column.tableId} — ${column.label || column.colId} est inaccessible ou en erreur. Aucune suppression effectuée.`);
      }
      const count = rows.filter(row=>!(column.tableId===TABLE && Number(row.id)===id) && hasReference(row[column.colId],id)).length;
      if (count) links.push(`${column.tableId} — ${column.label || column.colId} (${count})`);
    }
    if (links.length) throw Error(`Suppression impossible : cet interlocuteur est encore utilisé dans ${links.join(" ; ")}. Désactivez sa fiche pour conserver ces liens, ou corrigez d’abord ses rattachements.`);
    return person;
  }

  async function deleteSelected() {
    if (state.busy || !state.selected || !ui.dialog.open) return;
    const id = Number(state.selected.id);
    state.busy = true;
    disable(true);
    let submitted = false, deleted = false;
    try {
      const person = await check(id);
      if (!window.confirm(`Supprimer définitivement la fiche de « ${personName(person)} » ?\n\nCe n’est pas une désactivation. La fiche sera retirée de l’annuaire. Les modifications non enregistrées seront perdues.`)) return;
      // Vérifier à nouveau après la confirmation, notamment les nouveaux liens.
      await check(id);
      if (state.demo) {
        state.people = state.people.filter(row=>Number(row.id)!==id);
      } else {
        submitted = true;
        await window.PilotageTestMode.applyUserActions([["RemoveRecord",TABLE,id]]);
      }
      deleted = true;
      state.selected = null;
      ui.dialog.close();
      if (ui.detail.open) ui.detail.close();
      if (state.demo) render();
      else await reload(null);
      feedback("L’interlocuteur a été supprimé définitivement de l’annuaire.");
    } catch (error) {
      if (deleted) {
        fatal("Fiche supprimée — actualisation nécessaire", "La suppression a réussi, mais l’annuaire n’a pas pu être rechargé. Actualisez la page avant de poursuivre.");
      } else {
        const prefix = submitted ? "La suppression n’a pas été confirmée. Vérifiez l’annuaire avant de réessayer. " : "";
        showFormError(ui.dialog, new Error(prefix + exactError(error)));
      }
    } finally {
      state.busy = false;
      disable(false);
    }
  }
})();
