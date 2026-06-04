/**
 * Centralized DOM ref lookup. One place that knows what IDs exist in
 * `index.html`, so the rest of the code never has to grep for them.
 * Fails fast in dev if an element is missing.
 */

/**
 * @param {string} id
 * @returns {HTMLElement}
 */
function byId(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`dom: missing element #${id}`);
  return el;
}

export function collectRefs() {
  return Object.freeze({
    stage:        byId("stage"),
    layerA:       byId("layerA"),
    layerB:       byId("layerB"),
    ambient:      byId("ambient"),
    loader:       byId("loader"),

    ringFg:       byId("ring-fg"),
    counter:      byId("counter"),
    caption:      byId("caption"),
    filmstrip:    byId("filmstrip"),
    toast:        byId("toast"),
    helpModal:    byId("help-modal"),

    btnPause:      byId("btn-pause"),
    btnShuffle:    byId("btn-shuffle"),
    btnFullscreen: byId("btn-fullscreen"),
    btnDownload:   byId("btn-download"),
    btnHelp:       byId("btn-help"),
    btnCloseHelp:  byId("btn-close-help"),
    navPrev:       byId("nav-prev"),
    navNext:       byId("nav-next"),
  });
}

/** @typedef {ReturnType<typeof collectRefs>} DomRefs */
