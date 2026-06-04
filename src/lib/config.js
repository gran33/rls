/**
 * Tunable runtime constants. One file, one place to change behavior.
 * Anything that you might want to tweak when iterating on the UX lives here.
 */
export const CONFIG = Object.freeze({
  /** Time each slide stays visible before auto-advancing. */
  slideDurationMs: 10_000,

  /** Crossfade duration — must match `--t-fade` in tokens.css. */
  fadeDurationMs: 1_600,

  /** Number of neighbors (each direction) to preload around the current slide. */
  preloadRadius: 2,

  /** Image widths requested from Google Drive's CDN. */
  imageWidths: Object.freeze({
    full: 2400,
    thumb: 320,
  }),

  /** Swipe distance (px) required before a touch counts as a navigation gesture. */
  swipeThresholdPx: 50,

  /** Hold duration (ms) for a long-press to toggle play/pause. */
  longPressMs: 550,

  /** Maximum interval (ms) between two taps to count as a double-tap. */
  doubleTapMs: 320,

  /** Haptic feedback (ms) on touch interactions. */
  vibrate: Object.freeze({
    swipe: 8,
    longPress: 15,
  }),

  /** Path (relative to index.html) to the manifest file. */
  manifestUrl: "manifest.json",
});
