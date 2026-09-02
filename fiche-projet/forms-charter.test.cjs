const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = (name) => fs.readFileSync(path.join(__dirname, name), "utf8");

test("les formulaires Journal et Modification du projet suivent la charte commune", () => {
  const html = read("index.html");
  const app = read("app.js");
  const css = read("style.css");

  assert.match(html, /class="form-sections" id="edit-fields"/);
  assert.match(html, /class="form-sections" id="tracking-fields"/);
  assert.match(html, /Nouvelle entrée de journal/);
  assert.match(html, /Enregistrer les modifications/);

  for (const section of ["Informations générales", "Classification", "Pilotage", "Calendrier", "Contexte", "Contenu", "Datation"]) {
    assert.match(app, new RegExp(section));
  }
  assert.match(app, /formSection\(1/);
  assert.match(app, /formSection\(4/);
  assert.match(css, /\.form-section__heading>p/);
  assert.match(css, /\.form-sections \.form-grid\{margin:0\}/);
  assert.match(css, /\.calendar-group/);
});
