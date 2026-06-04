/**
 * Composition root.
 *
 * Pulls together: Drive client → Slideshow state → Stage / Filmstrip /
 * ProgressRing UI → input (Keyboard / Gestures). No business logic lives
 * here; this file is purely glue.
 */

import { CONFIG } from "./lib/config.js";
import { DriveClient } from "./lib/drive-client.js";
import { Slideshow } from "./lib/slideshow.js";
import { PausableScheduler } from "./lib/scheduler.js";
import { collectRefs } from "./lib/dom.js";

import { Stage } from "./ui/stage.js";
import { Filmstrip } from "./ui/filmstrip.js";
import { ProgressRing } from "./ui/progress-ring.js";
import { Toast } from "./ui/toast.js";
import { GestureRecognizer } from "./ui/gestures.js";
import { KeyboardBindings } from "./ui/keyboard.js";
import { HelpModal } from "./ui/help-modal.js";
import { toggleFullscreen } from "./ui/fullscreen.js";
import { saveBlob, photoFilename } from "./ui/download.js";

/** SVG path for the pause icon. */
const ICON_PAUSE = "M6 5h4v14H6zM14 5h4v14h-4z";
/** SVG path for the play icon. */
const ICON_PLAY = "M8 5v14l11-7z";

async function boot() {
  const refs = collectRefs();
  const toast = new Toast(refs.toast);

  // ----- Load images ----------------------------------------------------
  const driveClient = new DriveClient();
  let images;
  try {
    images = await driveClient.loadManifest();
  } catch (err) {
    console.error(err);
    toast.show("Could not load photos manifest 😕", 6_000);
    return;
  }
  if (!images.length) {
    toast.show("No photos found in manifest", 6_000);
    return;
  }

  // ----- Core state + scheduler ----------------------------------------
  const slideshow = new Slideshow(images);
  const scheduler = new PausableScheduler(CONFIG.slideDurationMs, () => {
    slideshow.next();
  });

  // ----- UI components --------------------------------------------------
  const stage = new Stage(refs.layerA, refs.layerB, refs.ambient);
  const ring = new ProgressRing(refs.ringFg, scheduler);
  const filmstrip = new Filmstrip(refs.filmstrip, slideshow.state.images, (i) => {
    slideshow.goto(i);
    if (slideshow.state.paused) slideshow.setPaused(false);
  });

  const helpModal = new HelpModal(refs.helpModal, refs.btnCloseHelp);

  // ----- Render reaction to state changes -------------------------------
  slideshow.subscribe(({ state, reason }) => {
    const image = state.images[state.index];

    // Visual swap (skip animation on the very first frame).
    stage.show(image, state.index, { animate: reason !== "init" });

    // Counter, caption, filmstrip highlight.
    refs.counter.textContent = `${state.index + 1} / ${state.images.length}`;
    refs.caption.textContent = `Photo ${state.index + 1} of ${state.images.length}`;
    filmstrip.setActive(state.index);

    // Preload neighborhood so the next swap is instant.
    preloadAround(driveClient, state, CONFIG.preloadRadius);

    // Restart the timer on any navigation; pause/resume handle their own.
    if (reason === "init" || reason === "next" || reason === "prev" ||
        reason === "goto" || reason === "shuffle") {
      if (state.paused) scheduler.cancel();
      else scheduler.restart();
    } else if (reason === "pause") {
      scheduler.pause();
      toast.show("Paused");
    } else if (reason === "resume") {
      scheduler.resume();
      toast.show("Playing");
    }

    // Sync pause-button icon.
    const path = refs.btnPause.querySelector("path");
    if (path) path.setAttribute("d", state.paused ? ICON_PLAY : ICON_PAUSE);

    // Rebuild filmstrip after shuffle (image order changed).
    if (reason === "shuffle") {
      filmstrip.rebuild(state.images);
      filmstrip.setActive(state.index);
      toast.show("Shuffled");
    }
  });

  // ----- Eager first-frame preload --------------------------------------
  await driveClient.preload(images[0].url);
  refs.loader.classList.add("hidden");
  // Trigger the first render (subscribe already fired with `init`).
  // No further action needed; ring + scheduler are started below.

  ring.start();

  // ----- Buttons --------------------------------------------------------
  refs.btnPause.addEventListener("click", () => slideshow.togglePaused());
  refs.btnShuffle.addEventListener("click", () => slideshow.shuffle());
  refs.btnFullscreen.addEventListener("click", () => toggleFullscreen());
  refs.btnDownload.addEventListener("click", () => downloadCurrent(driveClient, slideshow, toast));
  refs.btnHelp.addEventListener("click", () => helpModal.open());
  refs.navPrev.addEventListener("click", () => slideshow.prev());
  refs.navNext.addEventListener("click", () => slideshow.next());

  // ----- Keyboard -------------------------------------------------------
  new KeyboardBindings({
    " ":          () => slideshow.togglePaused(),
    ArrowRight:   () => slideshow.next(),
    ArrowLeft:    () => slideshow.prev(),
    f: () => toggleFullscreen(),
    F: () => toggleFullscreen(),
    d: () => downloadCurrent(driveClient, slideshow, toast),
    D: () => downloadCurrent(driveClient, slideshow, toast),
    s: () => slideshow.shuffle(),
    S: () => slideshow.shuffle(),
    "?": () => helpModal.open(),
    Escape: () => helpModal.close(),
  }).attach();

  // ----- Touch ----------------------------------------------------------
  new GestureRecognizer(refs.stage, {
    onSwipeLeft:  () => slideshow.next(),
    onSwipeRight: () => slideshow.prev(),
    onDoubleTap:  () => toggleFullscreen(),
    onLongPress:  () => slideshow.togglePaused(),
  }).attach();

  // ----- Visibility: pause on hidden tab --------------------------------
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && !slideshow.state.paused) {
      slideshow.setPaused(true);
    }
  });

  // ----- First-time hint ------------------------------------------------
  toast.show("Tap / swipe to explore", 2_600);
}

/**
 * @param {DriveClient} client
 * @param {import("./lib/slideshow.js").Slideshow} slideshow
 * @param {Toast} toast
 */
async function downloadCurrent(client, slideshow, toast) {
  const image = slideshow.current;
  const filename = photoFilename(slideshow.state.index + 1);
  toast.show("Downloading…");
  try {
    const blob = await client.fetchBlob(image.url);
    saveBlob(blob, filename);
  } catch (err) {
    console.warn("Direct download failed; opening in new tab.", err);
    window.open(image.url, "_blank", "noopener,noreferrer");
    toast.show("Opened in new tab");
  }
}

/**
 * @param {DriveClient} client
 * @param {import("./lib/slideshow.js").SlideshowState} state
 * @param {number} radius
 */
function preloadAround(client, state, radius) {
  const n = state.images.length;
  for (let k = 1; k <= radius; k++) {
    client.preload(state.images[(state.index + k) % n].url);
    client.preload(state.images[(state.index - k + n) % n].url);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
