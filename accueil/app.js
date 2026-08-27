"use strict";

/*
 * Configuration des pages du document Grist.
 * Collez entre les guillemets l'URL complète de chaque page (voir README.md).
 */
const PAGE_URLS = Object.freeze({
  dashboard: "",
  project: "",
  meetings: "",
  instructions: "",
  actions: "",
  contacts: "",
  weekly: "",
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

displayToday();
configureCards();
