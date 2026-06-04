/**
 * The visual stage: two crossfade layers + ambient halo. Owns the visual
 * transition between two images. No knowledge of timing or input.
 *
 * Two stacked `.layer` elements alternate roles. When a new image comes in,
 * we paint it on the "back" layer, swap classes to crossfade, and on the
 * next frame remember the new back/front assignment.
 *
 * @typedef {import("../lib/drive-client.js").ResolvedImage} ResolvedImage
 */

const KEN_BURNS_VARIANTS = /** @type {const} */ (["kb1", "kb2", "kb3", "kb4"]);

export class Stage {
  /** @param {HTMLElement} layerA @param {HTMLElement} layerB @param {HTMLElement} ambient */
  constructor(layerA, layerB, ambient) {
    /** @type {HTMLElement} */ this.front = layerA;
    /** @type {HTMLElement} */ this.back = layerB;
    /** @type {HTMLElement} */ this.ambient = ambient;
  }

  /**
   * Show `image`. With `animate=false`, jumps without crossfade — useful for
   * the first frame so we don't fade in from black.
   * @param {ResolvedImage} image
   * @param {number} kbSeed - Stable seed so the same image gets the same Ken-Burns variant.
   * @param {{ animate?: boolean }} [opts]
   */
  show(image, kbSeed, opts = {}) {
    const { animate = true } = opts;
    const bg = `url("${image.url}")`;

    // Paint on the back layer.
    this.back.style.backgroundImage = bg;
    this.back.classList.remove(...KEN_BURNS_VARIANTS);
    // Force reflow so the animation restarts cleanly.
    void this.back.offsetWidth;
    this.back.classList.add(KEN_BURNS_VARIANTS[kbSeed % KEN_BURNS_VARIANTS.length]);

    if (animate) {
      this.back.classList.add("show");
      this.front.classList.remove("show");
    } else {
      this.front.classList.remove("show");
      this.back.classList.add("show");
    }
    // Swap roles.
    [this.front, this.back] = [this.back, this.front];

    // Ambient halo mirrors the visible image.
    this.ambient.style.backgroundImage = bg;
    this.ambient.classList.add("on");
  }
}
