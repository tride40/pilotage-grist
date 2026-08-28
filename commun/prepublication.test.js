"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const pages = [
  "index.html", "accueil/index.html", "dashboard/index.html", "fiche-projet/index.html",
  "reunions/index.html", "actions/index.html", "consignes/index.html",
  "interlocuteurs/index.html", "point-hebdomadaire/index.html", "diagnostic-v3/index.html",
];

function localReferences(html) {
  return [...html.matchAll(/(?:href|src)=["']([^"']+)["']/g)]
    .map((match) => match[1].split(/[?#]/)[0])
    .filter((value) => value && !value.startsWith("#") && !/^[a-z]+:/i.test(value));
}

test("toutes les ressources locales référencées par les pages existent", () => {
  const missing = [];
  for (const page of pages) {
    const absolutePage = path.join(root, page);
    const html = fs.readFileSync(absolutePage, "utf8");
    for (const reference of localReferences(html)) {
      const target = path.resolve(path.dirname(absolutePage), reference);
      if (!fs.existsSync(target)) missing.push(`${page} -> ${reference}`);
    }
  }
  assert.deepEqual(missing, []);
});

test("la page technique référence chaque module publié", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  for (const folder of ["accueil", "dashboard", "fiche-projet", "reunions", "actions", "consignes", "interlocuteurs", "point-hebdomadaire", "diagnostic-v3"]) {
    assert.match(html, new RegExp(`href=["']${folder}/["']`), `${folder} doit être accessible`);
  }
  assert.doesNotMatch(html, />Prévu</);
});

test("l’accueil ne présente plus les indicateurs supprimés de la V3", () => {
  const html = fs.readFileSync(path.join(root, "accueil", "index.html"), "utf8");
  assert.doesNotMatch(html, /avancement de tous les projets/i);
  assert.doesNotMatch(html, /responsables, priorités/i);
});

test("la fiche projet bloque l’écriture si les règles V3 ne sont pas chargées", () => {
  const source = fs.readFileSync(path.join(root, "fiche-projet/app.js"), "utf8");
  assert.match(source, /function projectRules\(\)/);
  assert.match(source, /Les règles de validation V3 ne sont pas chargées/);
  assert.doesNotMatch(source, /PilotageV3Rules\?\.projectErrors\(next\)\|\|\[\]/);
});
