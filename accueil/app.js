"use strict";

/*
 * Configuration des pages du document Grist.
 * Collez entre les guillemets l'URL complète de chaque page (voir README.md).
 */
const PAGE_URLS = Object.freeze({
  dashboard: "https://grist.numerique.gouv.fr/o/docs/f8iwcexDATAw/Pilotage-des-projets/p/9",
  project: "https://grist.numerique.gouv.fr/o/docs/f8iwcexDATAw/Pilotage-des-projets/p/10",
  meetings: "https://grist.numerique.gouv.fr/o/docs/f8iwcexDATAw/Pilotage-des-projets/p/11",
  instructions: "https://grist.numerique.gouv.fr/o/docs/f8iwcexDATAw/Pilotage-des-projets/p/12",
  actions: "https://grist.numerique.gouv.fr/o/docs/f8iwcexDATAw/Pilotage-des-projets/p/13",
  contacts: "https://grist.numerique.gouv.fr/o/docs/f8iwcexDATAw/Pilotage-des-projets/p/14",
  weekly: "https://grist.numerique.gouv.fr/o/docs/f8iwcexDATAw/Pilotage-des-projets/p/15",
});

const DEMO_URLS = Object.freeze({
  dashboard: "../dashboard/",
  project: "../fiche-projet/",
  meetings: "../reunions/",
  instructions: "../consignes/",
  actions: "../actions/",
  contacts: "../interlocuteurs/",
  weekly: "../point-hebdomadaire/",
});

function isDemoMode() {
  const params = new URLSearchParams(window.location.search);
  return params.get("demo") === "1" && window.self === window.top;
}

function safeUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value, window.location.href);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch (_) {
    return null;
  }
}

function configureCards() {
  const urls = isDemoMode() ? DEMO_URLS : PAGE_URLS;
  document.querySelectorAll("[data-page]").forEach((card) => {
    const url = safeUrl(urls[card.dataset.page]);
    const status = card.querySelector(".link-status");
    if (url) {
      card.href = url;
      status.textContent = "";
      card.setAttribute("aria-label", `${card.querySelector("strong").textContent} — ouvrir la page`);
      return;
    }
    card.removeAttribute("href");
    card.removeAttribute("target");
    card.classList.add("is-unconfigured");
    card.setAttribute("aria-disabled", "true");
    card.setAttribute("tabindex", "-1");
    status.textContent = "Lien à configurer";
    card.addEventListener("click", (event) => event.preventDefault());
  });
}

function displayToday() {
  const element = document.querySelector("#current-date");
  const today = new Date();
  element.dateTime = today.toISOString().slice(0, 10);
  element.textContent = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(today);
}

function columnarToRecords(columns) {
  const names = Object.keys(columns || {}).filter((name) => Array.isArray(columns[name]));
  const length = Math.max(0, ...names.map((name) => columns[name].length));
  return Array.from({ length }, (_, index) => Object.fromEntries(names.map((name) => [name, columns[name][index]])));
}

function referenceIds(value) {
  return [...new Set((Array.isArray(value) ? value : [value]).filter((item) => item !== "L" && item !== "R" && item !== null && item !== undefined && String(item).trim()).map(String))];
}

function personName(person) {
  return String(person?.Nom_complet || [person?.Prenom, person?.Nom].filter(Boolean).join(" ") || "Interlocuteur").trim();
}

function renderIdentity(identity, services) {
  if (!identity?.person) return;
  const person = identity.person;
  const name = personName(person);
  const linkedServices = services
    .filter((service) => referenceIds(service.Agents).includes(String(person.id)) || referenceIds(service.Responsable).includes(String(person.id)))
    .map((service) => String(service.Nom_service || "Service").trim())
    .sort((a, b) => a.localeCompare(b, "fr"));
  document.querySelector("#identity-avatar").textContent = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  document.querySelector("#identity-name").textContent = name;
  document.querySelector("#identity-role").textContent = [...new Set([person.Role_interne, person.Fonction].filter(Boolean).map((value) => String(value).trim()))].join(" · ") || "Utilisateur";
  const serviceLine = document.querySelector("#identity-services");
  serviceLine.textContent = linkedServices.join(" · ");
  serviceLine.hidden = linkedServices.length === 0;
  document.querySelector("#identity-card").hidden = false;
}

async function identifyCurrentUser() {
  if (isDemoMode() || !window.grist?.docApi || !window.PilotageCurrentUser) return;
  try {
    await Promise.resolve(window.grist.ready({ requiredAccess: "full" }));
    const identity = await window.PilotageCurrentUser.identify();
    const services = columnarToRecords(await window.grist.docApi.fetchTable("SERVICES"));
    renderIdentity(identity, services);
  } catch (error) {
    console.warn("Identification de l’utilisateur impossible", error);
  }
}

displayToday();
configureCards();
identifyCurrentUser();
