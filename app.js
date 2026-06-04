/* ====================================================================
   Our Kids — slideshow engine
   - Loads manifest.json (Google Drive file IDs)
   - Crossfade + Ken-Burns between two stacked layers
   - 10s auto-advance with progress ring
   - Keyboard, swipe, double-tap fullscreen, long-press pause
   - Download single (current) and download-all (client-side ZIP)
   ==================================================================== */

(() => {
  "use strict";

  const TICK_MS = 10_000;
  const FADE_MS = 1600;
  const PRELOAD_AHEAD = 2;
  const KB_VARIANTS = ["kb1", "kb2", "kb3", "kb4"];

  // ----- DOM ---------------------------------------------------------
  const $ = (id) => document.getElementById(id);
  const stage      = $("stage");
  const layerA     = $("layerA");
  const layerB     = $("layerB");
  const ambient    = $("ambient");
  const loader     = $("loader");
  const ringFg     = $("ring-fg");
  const counterEl  = $("counter");
  const captionEl  = $("caption");
  const filmstrip  = $("filmstrip");
  const toastEl    = $("toast");
  const helpModal  = $("help-modal");

  const btnPause       = $("btn-pause");
  const btnShuffle     = $("btn-shuffle");
  const btnFullscreen  = $("btn-fullscreen");
  const btnDownload    = $("btn-download");
  const btnDownloadAll = $("btn-download-all");
  const btnHelp        = $("btn-help");
  const btnCloseHelp   = $("btn-close-help");
  const navPrev        = $("nav-prev");
  const navNext        = $("nav-next");

  // ----- State -------------------------------------------------------
  /** @type {Array<{id: string, url: string, thumb: string}>} */
  let images = [];
  let index = 0;
  let activeLayer = layerA;
  let inactiveLayer = layerB;
  let timerId = null;
  let progressRafId = null;
  let progressStart = 0;
  let progressElapsed = 0; // ms elapsed within the current tick
  let paused = false;
  /** Cache of HTMLImageElements indexed by image url. */
  const cache = new Map();

  // ----- Helpers -----------------------------------------------------
  const url = (id, w) => `https://lh3.googleusercontent.com/d/${id}=w${w}`;
  const fullUrl = (id) => url(id, 2400);
  const thumbUrl = (id) => url(id, 320);

  function setCounter() {
    counterEl.textContent = `${index + 1} / ${images.length}`;
  }

  function setCaption() {
    captionEl.textContent = `Photo ${index + 1} of ${images.length}`;
  }

  function showToast(msg, ms = 1800) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toastEl.classList.remove("show"), ms);
  }

  function preload(idx) {
    if (idx < 0 || idx >= images.length) return Promise.resolve();
    const img = images[idx];
    if (cache.has(img.url)) return Promise.resolve(cache.get(img.url));
    return new Promise((resolve) => {
      const el = new Image();
      el.referrerPolicy = "no-referrer";
      el.onload = () => { cache.set(img.url, el); resolve(el); };
      el.onerror = () => resolve(null);
      el.src = img.url;
    });
  }

  function preloadNeighborhood(centerIdx) {
    for (let k = 1; k <= PRELOAD_AHEAD; k++) {
      preload((centerIdx + k) % images.length);
      preload((centerIdx - k + images.length) % images.length);
    }
  }

  function swapLayers() {
    [activeLayer, inactiveLayer] = [inactiveLayer, activeLayer];
  }

  async function show(newIndex, { animate = true } = {}) {
    if (!images.length) return;
    newIndex = ((newIndex % images.length) + images.length) % images.length;
    const target = images[newIndex];

    await preload(newIndex);

    // Stage the new image on the inactive layer, then swap classes.
    inactiveLayer.style.backgroundImage = `url("${target.url}")`;
    // Pick a Ken-Burns variant deterministically per image so it doesn't get jittery.
    inactiveLayer.classList.remove("kb1", "kb2", "kb3", "kb4", "kenburns");
    void inactiveLayer.offsetWidth; // force reflow so animation restarts
    inactiveLayer.classList.add(KB_VARIANTS[newIndex % KB_VARIANTS.length]);

    if (!animate) {
      activeLayer.classList.remove("show");
      inactiveLayer.classList.add("show");
    } else {
      inactiveLayer.classList.add("show");
      activeLayer.classList.remove("show");
    }

    swapLayers();
    index = newIndex;

    // Ambient halo mirrors the current image
    ambient.style.backgroundImage = `url("${target.url}")`;
    ambient.classList.add("on");

    setCounter();
    setCaption();
    syncFilmstrip();
    preloadNeighborhood(index);

    resetProgress();
  }

  function next() { show(index + 1); }
  function prev() { show(index - 1); }

  // ----- Progress ring + auto-advance --------------------------------
  function resetProgress() {
    progressStart = performance.now();
    progressElapsed = 0;
    if (timerId) clearTimeout(timerId);
    if (!paused) {
      timerId = setTimeout(next, TICK_MS);
    }
    cancelAnimationFrame(progressRafId);
    progressRafId = requestAnimationFrame(tickProgress);
  }

  function tickProgress(t) {
    if (paused) {
      // Freeze the dash
      progressRafId = requestAnimationFrame(tickProgress);
      return;
    }
    const elapsed = (t - progressStart) + progressElapsed;
    const p = Math.min(elapsed / TICK_MS, 1);
    const circumference = 2 * Math.PI * 16; // r=16 → ≈ 100.53
    ringFg.style.strokeDashoffset = String(circumference * (1 - p));
    if (p < 1) progressRafId = requestAnimationFrame(tickProgress);
  }

  function setPaused(v) {
    paused = v;
    btnPause.querySelector("path").setAttribute(
      "d",
      paused
        ? "M8 5v14l11-7z"                  // play icon
        : "M6 5h4v14H6zM14 5h4v14h-4z"    // pause icon
    );
    if (paused) {
      if (timerId) { clearTimeout(timerId); timerId = null; }
      // remember how far we got
      progressElapsed += performance.now() - progressStart;
      showToast("Paused");
    } else {
      progressStart = performance.now();
      const remaining = Math.max(TICK_MS - progressElapsed, 200);
      timerId = setTimeout(next, remaining);
      showToast("Playing");
    }
  }

  // ----- Filmstrip ---------------------------------------------------
  function buildFilmstrip() {
    filmstrip.innerHTML = "";
    images.forEach((img, i) => {
      const t = document.createElement("button");
      t.className = "thumb";
      t.role = "tab";
      t.setAttribute("aria-label", `Photo ${i + 1}`);
      t.style.backgroundImage = `url("${img.thumb}")`;
      t.addEventListener("click", () => {
        show(i);
        if (paused) setPaused(false);
      });
      filmstrip.appendChild(t);
    });
  }

  function syncFilmstrip() {
    [...filmstrip.children].forEach((c, i) => {
      c.classList.toggle("active", i === index);
    });
    const active = filmstrip.children[index];
    if (active) {
      const stripRect = filmstrip.getBoundingClientRect();
      const elRect = active.getBoundingClientRect();
      const offset = (elRect.left + elRect.width / 2)
                   - (stripRect.left + stripRect.width / 2);
      filmstrip.scrollBy({ left: offset, behavior: "smooth" });
    }
  }

  // ----- Fullscreen --------------------------------------------------
  function toggleFullscreen() {
    const doc = document;
    const elem = document.documentElement;
    if (!doc.fullscreenElement && !doc.webkitFullscreenElement) {
      (elem.requestFullscreen || elem.webkitRequestFullscreen)?.call(elem);
    } else {
      (doc.exitFullscreen || doc.webkitExitFullscreen)?.call(doc);
    }
  }

  // ----- Download ----------------------------------------------------
  async function downloadCurrent() {
    const img = images[index];
    showToast("Downloading…");
    try {
      const blob = await (await fetch(img.url, { mode: "cors" })).blob();
      saveBlob(blob, `our-kids-${String(index + 1).padStart(2, "0")}.jpg`);
    } catch (err) {
      // Fallback: open in a new tab so the user can save manually.
      window.open(img.url, "_blank", "noopener,noreferrer");
      showToast("Opened in new tab");
    }
  }

  function saveBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function downloadAll() {
    if (typeof JSZip === "undefined") {
      showToast("ZIP library still loading…");
      return;
    }
    showToast(`Zipping ${images.length} photos…`, 60_000);
    const zip = new JSZip();
    let done = 0;
    await Promise.all(images.map(async (img, i) => {
      try {
        const blob = await (await fetch(img.url, { mode: "cors" })).blob();
        zip.file(`our-kids-${String(i + 1).padStart(2, "0")}.jpg`, blob);
      } catch (e) { /* skip on error, keep going */ }
      done++;
      toastEl.textContent = `Zipping ${done} / ${images.length}…`;
    }));
    const blob = await zip.generateAsync({ type: "blob" });
    saveBlob(blob, "our-kids-photos.zip");
    showToast("Saved 💾");
  }

  // ----- Shuffle -----------------------------------------------------
  function shuffle() {
    const current = images[index];
    for (let i = images.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [images[i], images[j]] = [images[j], images[i]];
    }
    index = images.indexOf(current);
    buildFilmstrip();
    syncFilmstrip();
    showToast("Shuffled");
  }

  // ----- Help modal --------------------------------------------------
  function openHelp() { helpModal.setAttribute("aria-hidden", "false"); }
  function closeHelp() { helpModal.setAttribute("aria-hidden", "true"); }

  // ----- Touch gestures ----------------------------------------------
  function bindGestures() {
    let startX = 0, startY = 0, startT = 0, longPressTimer = null, lastTap = 0;
    const SWIPE_PX = 50;

    stage.addEventListener("touchstart", (e) => {
      if (e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startT = performance.now();
      longPressTimer = setTimeout(() => {
        setPaused(!paused);
        if (navigator.vibrate) navigator.vibrate(15);
      }, 550);
    }, { passive: true });

    stage.addEventListener("touchmove", () => {
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    }, { passive: true });

    stage.addEventListener("touchend", (e) => {
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
      if (e.changedTouches.length !== 1) return;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      const dt = performance.now() - startT;
      if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) next(); else prev();
        if (navigator.vibrate) navigator.vibrate(8);
        return;
      }
      // Double-tap → fullscreen
      const now = performance.now();
      if (dt < 250 && Math.abs(dx) < 10 && Math.abs(dy) < 10) {
        if (now - lastTap < 320) {
          toggleFullscreen();
          lastTap = 0;
        } else {
          lastTap = now;
        }
      }
    }, { passive: true });
  }

  // ----- Keyboard ----------------------------------------------------
  function bindKeys() {
    document.addEventListener("keydown", (e) => {
      if (e.target instanceof HTMLInputElement) return;
      switch (e.key) {
        case " ":          e.preventDefault(); setPaused(!paused); break;
        case "ArrowRight": next(); break;
        case "ArrowLeft":  prev(); break;
        case "f": case "F": toggleFullscreen(); break;
        case "d": case "D": downloadCurrent(); break;
        case "s": case "S": shuffle(); break;
        case "?":          openHelp(); break;
        case "Escape":     closeHelp(); break;
      }
    });
  }

  // ----- Boot --------------------------------------------------------
  async function boot() {
    try {
      const res = await fetch(`manifest.json?v=${Date.now()}`);
      const data = await res.json();
      images = (data.images || []).map((row) => ({
        id: row.id,
        url: fullUrl(row.id),
        thumb: thumbUrl(row.id),
      }));
    } catch (err) {
      showToast("Could not load photos manifest 😕", 6000);
      return;
    }

    if (!images.length) {
      showToast("No photos found in manifest", 6000);
      return;
    }

    buildFilmstrip();
    setCounter();
    setCaption();

    // Eagerly load the first image so loader hides quickly
    await preload(0);
    loader.classList.add("hidden");
    show(0, { animate: false });

    bindKeys();
    bindGestures();

    // Buttons
    btnPause.addEventListener("click", () => setPaused(!paused));
    btnShuffle.addEventListener("click", shuffle);
    btnFullscreen.addEventListener("click", toggleFullscreen);
    btnDownload.addEventListener("click", downloadCurrent);
    btnDownloadAll.addEventListener("click", downloadAll);
    btnHelp.addEventListener("click", openHelp);
    btnCloseHelp.addEventListener("click", closeHelp);
    helpModal.addEventListener("click", (e) => {
      if (e.target === helpModal) closeHelp();
    });
    navPrev.addEventListener("click", prev);
    navNext.addEventListener("click", next);

    // Pause when tab is hidden, resume when visible — saves battery
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && !paused) setPaused(true);
    });

    // First-time hint
    showToast("Tap / swipe to explore", 2600);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
