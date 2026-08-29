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

test("le formulaire utilise un seul champ Fonction pour tous les interlocuteurs", () => {
  const html = fs.readFileSync(path.join(root, "interlocuteurs/index.html"), "utf8");
  const source = fs.readFileSync(path.join(root, "interlocuteurs/app.js"), "utf8");
  assert.equal((html.match(/>Fonction</g) || []).length, 1);
  assert.doesNotMatch(html, /Type externe/);
  assert.doesNotMatch(source, /formData\.get\("Type_interlocuteur"\)/);
});

test("les widgets V3 ne dépendent plus de Type_interlocuteur", () => {
  for (const file of ["interlocuteurs/app.js", "fiche-projet/app.js", "reunions/app.js"]) {
    const source = fs.readFileSync(path.join(root, file), "utf8");
    assert.doesNotMatch(source, /Type_interlocuteur/, file);
  }
});

test("les actions conservent seulement la recherche de l’attributaire", () => {
  const html = fs.readFileSync(path.join(root, "actions/index.html"), "utf8");
  const source = fs.readFileSync(path.join(root, "actions/app.js"), "utf8");
  assert.equal((html.match(/data-person-picker=/g) || []).length, 1);
  assert.doesNotMatch(html, /name="Demandee_par"/);
  assert.match(source, /Demandee_par:author/);
  assert.match(source, /function renderPersonPicker/);
  assert.doesNotMatch(html, /name="people_search"/);
});

test("les auteurs des créations sont déterminés silencieusement", () => {
  const instructionsHtml = fs.readFileSync(path.join(root, "consignes/index.html"), "utf8");
  const instructionsSource = fs.readFileSync(path.join(root, "consignes/app.js"), "utf8");
  const meetingsSource = fs.readFileSync(path.join(root, "reunions/app.js"), "utf8");
  const projectSource = fs.readFileSync(path.join(root, "fiche-projet/app.js"), "utf8");
  assert.doesNotMatch(instructionsHtml, /name="Emetteur"/);
  assert.match(instructionsSource, /Emetteur: author/);
  assert.doesNotMatch(meetingsSource, /\["Saisi_par","Saisi par","person"\]/);
  assert.doesNotMatch(meetingsSource, /\["Demandeur","Modification demandée par"/);
  assert.match(meetingsSource, /values\.Demandeur=author/);
  assert.doesNotMatch(projectSource, /\["Demandee_par", "Demandée par", "person"\]/);
  assert.match(projectSource, /values\.Demandee_par=currentPersonId\(\)/);
  assert.match(projectSource, /author: pick\("Saisi_par", "Auteur"\)/);
});

test("l’annuaire permet de gérer les services municipaux", () => {
  const html = fs.readFileSync(path.join(root, "interlocuteurs/index.html"), "utf8");
  const source = fs.readFileSync(path.join(root, "interlocuteurs/app.js"), "utf8");
  for (const id of ["open-services", "services-dialog", "service-form", "service-agents"]) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(source, /SERVICE_TABLE="SERVICES"/);
  assert.match(source, /function saveService/);
  assert.match(source, /function personServiceNames/);
  assert.match(source, /function serviceMembershipActions/);
  assert.doesNotMatch(source, /function personServicesSection/);
  assert.match(source, /\["Services",personServiceNames\(person\)\]/);
  assert.match(source, /function isMunicipalAgent/);
  assert.match(source, /ui\.personServicesField\.hidden=!agent/);
  assert.match(source, /async function createPerson/);
  assert.doesNotMatch(source, /Service\(s\) municipal\(aux\)/);
  assert.match(html, /id="person-services-field"/);
  assert.match(source, /input\.type="checkbox";input\.name="Services_municipaux"/);
  assert.match(html, /<fieldset[^>]+id="person-services-field"/);
  assert.doesNotMatch(html, /Service\(s\) municipal\(aux\)/);
});

test("l’accueil identifie le compte Grist via une ligne technique temporaire", () => {
  const html = fs.readFileSync(path.join(root, "accueil/index.html"), "utf8");
  const peopleHtml = fs.readFileSync(path.join(root, "interlocuteurs/index.html"), "utf8");
  const source = fs.readFileSync(path.join(root, "commun/current-user.js"), "utf8");
  assert.match(html, /commun\/current-user\.js/);
  assert.match(html, /id="identity-card"/);
  assert.doesNotMatch(peopleHtml, /Utilisateur reconnu|id="current-user"/);
  assert.match(source, /CONTEXTE_UTILISATEUR/);
  assert.match(source, /\["AddRecord", CONTEXT_TABLE/);
  assert.match(source, /\["RemoveRecord", CONTEXT_TABLE/);
  assert.match(source, /Cle_session/);
  assert.match(source, /Email_Grist/);
});

test("la synthèse globale ne se présente plus comme un écran personnel", () => {
  const html = fs.readFileSync(path.join(root, "point-hebdomadaire/index.html"), "utf8");
  const source = fs.readFileSync(path.join(root, "point-hebdomadaire/app.js"), "utf8");
  assert.match(html, /Point de pilotage/);
  assert.doesNotMatch(html, /Mon pilotage|Synthèse personnelle|Exporter mon point/);
  assert.doesNotMatch(source, /Projet inconnu|Projet sans nom/);
});

test("l’annuaire signale les réunions potentiellement dupliquées", () => {
  const source = fs.readFileSync(path.join(root, "interlocuteurs/app.js"), "utf8");
  assert.match(source, /function isPossibleMeetingDuplicate/);
  assert.match(source, /Doublon possible à vérifier/);
  assert.doesNotMatch(source, /Projet inconnu|Projet sans nom/);
});

test("les actions de désactivation demandent une confirmation", () => {
  const source = fs.readFileSync(path.join(root, "interlocuteurs/app.js"), "utf8");
  assert.match(source, /window\.confirm\(`Désactiver \$\{personName\(person\)\}/);
  assert.match(source, /window\.confirm\(`Désactiver \$\{name\}/);
  assert.match(source, /function showFormError/);
  assert.match(source, /setAttribute\("role","alert"\)/);
});

test("tous les écrans chargent les styles d’accessibilité courants", () => {
  const pages = ["index.html", "accueil/index.html", "actions/index.html", "consignes/index.html", "dashboard/index.html", "diagnostic-v3/index.html", "fiche-projet/index.html", "interlocuteurs/index.html", "point-hebdomadaire/index.html", "reunions/index.html"];
  for (const page of pages) {
    const html = fs.readFileSync(path.join(root, page), "utf8");
    assert.match(html, /components\.css\?v=12/, page);
  }
  const css = fs.readFileSync(path.join(root, "commun/components.css"), "utf8");
  assert.match(css, /\.button:focus-visible/);
  assert.match(css, /summary:focus-visible/);
});

test("le tableau de bord distingue les données incomplètes des vraies valeurs", () => {
  const html = fs.readFileSync(path.join(root, "dashboard/index.html"), "utf8");
  const source = fs.readFileSync(path.join(root, "dashboard/app.js"), "utf8");
  const css = fs.readFileSync(path.join(root, "dashboard/style.css"), "utf8");
  assert.match(html, /app\.js\?v=13/);
  assert.match(source, /Projet à nommer/);
  assert.match(source, /Informations à compléter/);
  assert.match(source, /function projectObjective/);
  assert.match(source, /card\.classList\.toggle\("kpi-card--empty"/);
  assert.doesNotMatch(source, /Projet sans nom/);
  assert.match(css, /\.kpi-card--empty/);
  assert.match(css, /\.dashboard \{[^}]*margin-top: 0/);
  assert.doesNotMatch(css, /\.dashboard \{[^}]*margin-top:\s*calc\([^}]*-1/);
});
