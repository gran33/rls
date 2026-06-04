# Our Kids 💛

An immersive slideshow for the photos in [this Google Drive folder](https://drive.google.com/drive/folders/1PcD3VnHoJz795g_r6Ay4jUrt-qwUj5il).

→ **Live site:** https://gran33.github.io/rls/

## Features

- 🎬 Cinematic full-bleed slideshow — every photo gets a slow Ken-Burns pan + crossfade
- ⏱ Auto-advances every 10 s (with a progress ring so you know when the next one's coming)
- 🌈 Ambient blurred halo of the current image behind it for a movie-poster glow
- 🎞 Film-grain overlay and corner vignette for warmth
- 📱 Mobile-first: swipe to change, double-tap to go fullscreen, long-press to pause, safe-area aware
- ⌨️ Desktop shortcuts: <kbd>Space</kbd> pause • <kbd>←</kbd>/<kbd>→</kbd> nav • <kbd>F</kbd> fullscreen • <kbd>D</kbd> download • <kbd>S</kbd> shuffle • <kbd>?</kbd> help
- ⬇️ Download the currently visible photo with one tap (or press <kbd>D</kbd>)
- ♻️ Respects `prefers-reduced-motion`

## Adding new photos

1. Drop the photos into the [Drive folder](https://drive.google.com/drive/folders/1PcD3VnHoJz795g_r6Ay4jUrt-qwUj5il) and make sure each is shared as **Anyone with the link → Viewer**.
2. Re-run the manifest builder:
   ```bash
   node tools/build-manifest.mjs
   ```
   It scrapes the public folder page and rewrites `manifest.json`.
3. Commit + push. GitHub Pages will redeploy in ~30 s.

## Local preview

Just open `index.html` in a browser, or:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

## Architecture

Plain HTML + CSS + native ES modules. No build step, no framework, no tracking, no runtime dependencies.

```
src/
├── main.js                  composition root — wires everything together
├── lib/
│   ├── config.js            tunable runtime constants
│   ├── drive-client.js      Google Drive image client (URL builder + preload cache)
│   ├── slideshow.js         state machine (index, paused, images) + pub/sub
│   ├── scheduler.js         pausable tick that resumes from where it paused
│   └── dom.js               typed DOM-ref bag, fails fast on missing elements
├── ui/
│   ├── stage.js             two-layer crossfade + ambient halo
│   ├── filmstrip.js         scroll-snapping thumbnail row
│   ├── progress-ring.js     SVG ring driven by the scheduler
│   ├── toast.js             transient notification
│   ├── help-modal.js        modal open/close
│   ├── gestures.js          touch → swipe / double-tap / long-press
│   ├── keyboard.js          key → callback registry
│   ├── fullscreen.js        vendor-prefixed fullscreen toggle
│   └── download.js          Blob → saved file
└── styles/
    ├── tokens.css           design tokens (color, type, motion, spacing)
    ├── base.css             element-level defaults
    ├── stage.css            slideshow layers, halo, grain, vignette
    ├── chrome.css           top bar, nav arrows, caption, progress ring
    ├── components.css       button, thumb, toast, modal
    └── motion.css           prefers-reduced-motion overrides
```

Every JS module documents its inputs / outputs with JSDoc — editors get type hints without a TypeScript toolchain.
