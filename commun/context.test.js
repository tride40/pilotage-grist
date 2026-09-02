"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync(require("node:path").join(__dirname, "context.js"), "utf8");

function load(search, topLevel = false) {
  const writes = [];
  const link = { hidden: true, href: "", onclick: null, removeAttribute(name) { if (name === "href") this.href = ""; } };
  const window = { location: { href: `https://example.test/actions/${search}`, search }, self: {}, top: {} };
  if (topLevel) window.self = window.top;
  const localStorage = { setItem(key, value) { writes.push([key, JSON.parse(value)]); } };
  vm.runInNewContext(source, { window, localStorage, URL, URLSearchParams, Date });
  return { context: window.PilotageContext, link, writes };
}

{
  const { context, link, writes } = load("?mode=project&projectId=42");
  assert.equal(context.configureProjectReturn(link, { id: 42, Nom_projet: "Port" }), true);
  assert.equal(link.hidden, false);
  assert.match(link.href, /\/p\/10\?style=singlePage$/);
  assert.match(context.projectPageUrl(42), /\/p\/10\?style=singlePage$/);
  link.onclick();
  assert.deepEqual(writes[0].slice(0, 1), ["pilotage-grist:selected-project"]);
  assert.equal(writes[0][1].id, 42);
}

for (const search of ["?mode=global", "?mode=project&projectId=999"]) {
  const { context, link } = load(search);
  assert.equal(context.configureProjectReturn(link, { id: 42 }), false);
  assert.equal(link.hidden, true);
  assert.equal(link.href, "");
}

{
  const { context, link } = load("?demo=1&mode=project&projectId=42", true);
  context.configureProjectReturn(link, { id: 42 });
  assert.match(link.href, /fiche-projet\/?\?demo=1&projectId=42&mode=project|fiche-projet\/?\?projectId=42&mode=project&demo=1/);
}

console.log("context.js: 4 scénarios validés");
