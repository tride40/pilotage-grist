"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");

test("la passerelle transmet directement les écritures à Grist", async () => {
  const calls = [];
  const window = {
    grist: {
      docApi: {
        applyUserActions: async (actions) => {
          calls.push(actions);
          return { retValues: [42] };
        },
      },
    },
  };
  const context = vm.createContext({ window });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "grist-write.js"), "utf8"), context);
  const actions = [["AddRecord", "ACTIONS", null, { Action: "Tester" }]];
  const result = await window.PilotageGristWrite.applyUserActions(actions);
  assert.deepEqual(calls, [actions]);
  assert.equal(result.retValues[0], 42);
  assert.equal(window.PilotageGristWrite.isReadOnly(), false);
});

test("aucune page publiée ne charge encore l’ancien mode test", () => {
  const files = [];
  function visit(folder) {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      if (entry.name === "node_modules") continue;
      const absolute = path.join(folder, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (/\.(?:html|js|css|md)$/.test(entry.name) && !entry.name.endsWith(".test.js")) files.push(absolute);
    }
  }
  visit(root);
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(source, /PilotageTestMode|test-mode\.(?:js|css)|pilotage-test-banner|Mode test/i, path.relative(root, file));
  }
});
