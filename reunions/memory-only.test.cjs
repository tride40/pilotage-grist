"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = __dirname;
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const source = fs.readFileSync(path.join(root, "app.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const demo = fs.readFileSync(path.join(root, "demo-data.js"), "utf8");

test("une réunion reste rattachée à un projet sans objet métier lié", () => {
  assert.match(source, /REQUIRED_TABLES=\["PROJETS","REUNIONS","INTERLOCUTEURS"\]/);
  assert.match(source, /!hasValue\(fields\.Projet\)\|\|!hasValue\(fields\.Objet\)/);
  for (const forbidden of ["FOLLOWUPS", "followup", "Reunion_origine", "Origine_reunion", "Objets liés"]) {
    assert.doesNotMatch(`${html}\n${source}\n${styles}\n${demo}`, new RegExp(forbidden, "i"));
  }
});

test("l’ordre du jour facultatif fonctionne avec la colonne canonique et l’ancien champ", () => {
  assert.match(source, /AGENDA_COLUMNS=\["Ordre_du_jour","Ordre_jour","Agenda","Points_cles"\]/);
  assert.match(html, /Ordre du jour/);
  assert.match(html, /facultatif/);
  assert.match(demo, /Ordre_du_jour/);
});

test("les formulaires nouvelle réunion et modification suivent la charte commune", () => {
  for (const id of ["meeting-general-fields", "meeting-agenda-fields", "meeting-participant-fields", "meeting-report-fields"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /form-step__number">1</);
  assert.match(html, /form-step__number">4</);
  assert.match(source, /meeting\?"Modifier la réunion":"Nouvelle réunion"/);
  assert.match(source, /meeting\?"Enregistrer les modifications":"Créer la réunion"/);
  assert.match(styles, /\.meeting-form-scroll\{[^}]*overflow-y:auto/);
  assert.match(styles, /\.meeting-form-actions\{[^}]*border-top/);
  assert.match(styles, /#meeting-dialog\{[^}]*height:min/);
});

