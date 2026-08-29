"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("l’identité est résolue puis la ligne technique est supprimée", async () => {
  const calls = [];
  let sessionKey = "";
  const window = {
    crypto: { randomUUID: () => "session-test" },
    console,
    grist: { docApi: {
      async applyUserActions(actions) {
        calls.push(actions);
        if (actions[0][0] === "AddRecord") { sessionKey = actions[0][3].Cle_session; return { retValues: [41] }; }
        return {};
      },
      async fetchTable(table) {
        assert.equal(table, "CONTEXTE_UTILISATEUR");
        return { id: [41], Cle_session: [sessionKey], Email_Grist: ["agent@sanguinet.fr"], Interlocuteur: [7] };
      },
    } },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "current-user.js"), "utf8"), { window, console });
  const identity = await window.PilotageCurrentUser.identify({ people: [{ id: 7, Email: "agent@sanguinet.fr", Nom: "Agent" }] });
  assert.equal(identity.personId, 7);
  assert.equal(identity.person.Nom, "Agent");
  assert.equal(JSON.stringify(calls[0][0].slice(0, 3)), JSON.stringify(["AddRecord", "CONTEXTE_UTILISATEUR", null]));
  assert.equal(JSON.stringify(calls[1][0]), JSON.stringify(["RemoveRecord", "CONTEXTE_UTILISATEUR", 41]));
});

test("une création est refusée sans interlocuteur reconnu", () => {
  const window = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "current-user.js"), "utf8"), { window, console });
  assert.throws(() => window.PilotageCurrentUser.requirePersonId(null), /aucun interlocuteur/);
});
