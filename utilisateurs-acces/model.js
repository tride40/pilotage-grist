"use strict";

(function exposeAccessModel(global) {
  const text = (value) => value === null || value === undefined ? "" : String(value).trim();
  const normalizeEmail = (value) => text(value).toLocaleLowerCase("fr-FR");
  const referenceId = (value) => {
    if (Array.isArray(value)) return value.find((item) => !["L", "R", 0, "0", null, undefined].includes(item)) ?? null;
    return value || null;
  };
  const personName = (person) => text(person?.Nom_complet || [person?.Prenom, person?.Nom].filter(Boolean).join(" ") || "Interlocuteur sans nom");
  const isTrue = (value) => value === true || value === 1 || value === "1";
  const isInternal = (person) => isTrue(person?.Interne_Mairie ?? person?.Interne_Sanguinet);
  const isActive = (person) => !Object.hasOwn(person || {}, "Actif") || isTrue(person.Actif);

  function accountForPerson(accounts, personId) {
    return accounts.find((account) => String(referenceId(account.Interlocuteur)) === String(personId)) || null;
  }

  function emailConflict(accounts, email, accountId = null) {
    const normalized = normalizeEmail(email);
    if (!normalized) return null;
    return accounts.find((account) => normalizeEmail(account.Email) === normalized && String(account.id) !== String(accountId ?? "")) || null;
  }

  function searchablePeople(people, accounts, query = "") {
    const needle = text(query).toLocaleLowerCase("fr-FR");
    return people
      .filter((person) => isInternal(person) && isActive(person))
      .filter((person) => {
        if (!needle) return true;
        return [personName(person), person.Email, person.Fonction, person.Role_interne, person.Organisme]
          .some((value) => text(value).toLocaleLowerCase("fr-FR").includes(needle));
      })
      .sort((left, right) => {
        const leftAccount = accountForPerson(accounts, left.id), rightAccount = accountForPerson(accounts, right.id);
        if (Boolean(leftAccount) !== Boolean(rightAccount)) return leftAccount ? 1 : -1;
        return personName(left).localeCompare(personName(right), "fr");
      });
  }

  function validate({ person, account, accounts, loginEmail }) {
    const errors = [];
    if (!person) errors.push("Sélectionnez un interlocuteur.");
    else {
      if (!isInternal(person)) errors.push("L’interlocuteur doit être interne à la mairie.");
      if (!isActive(person)) errors.push("L’interlocuteur doit être actif.");
    }
    const email = normalizeEmail(loginEmail);
    if (!email) errors.push("Une adresse de connexion Grist est nécessaire.");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("L’adresse de connexion Grist n’est pas valide.");
    const conflict = emailConflict(accounts, email, account?.id);
    if (conflict) errors.push("Cette adresse est déjà utilisée par un autre compte applicatif.");
    return errors;
  }

  global.PilotageAccessModel = Object.freeze({ accountForPerson, emailConflict, isActive, isInternal, normalizeEmail, personName, referenceId, searchablePeople, validate });
})(typeof window === "undefined" ? globalThis : window);
