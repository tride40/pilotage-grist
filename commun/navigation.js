"use strict";

/* Les liens de l’application restent dans Grist, en mode éditable page seule. */
(function exposeNavigation(root) {
  const documentUrl = "https://grist.numerique.gouv.fr/o/docs/f8iwcexDATAw/Pilotage-des-projets";
  const pages = Object.freeze({ home: 16, dashboard: 9, project: 10, meetings: 11, actions: 37, contacts: 14, weekly: 15 });
  function applicationUrl(value) {
    const url = new URL(value, documentUrl + "/");
    const base = new URL(documentUrl);
    if (url.origin === base.origin && (url.pathname === base.pathname || url.pathname.startsWith(base.pathname + "/"))) {
      url.searchParams.delete("embed");
      url.searchParams.set("style", "singlePage");
    }
    return url.href;
  }
  function pageUrl(page) {
    if (!Object.hasOwn(pages, page)) throw new Error("Page inconnue : " + page);
    return applicationUrl(documentUrl + "/p/" + pages[page]);
  }
  root.PilotageNavigation = Object.freeze({ pageUrl, applicationUrl });
}(typeof window === "undefined" ? globalThis : window));
