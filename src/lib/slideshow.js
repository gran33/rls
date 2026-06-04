/**
 * Slideshow state machine.
 *
 * Holds the canonical "what's playing right now" state and exposes pure
 * actions (`next`, `prev`, `goto`, `pause`, `resume`, `shuffle`). UI layers
 * subscribe to `onChange` and reflect the new state.
 *
 * State is intentionally minimal — `index`, `paused`, `images`. Anything
 * derived (preload, progress) is computed by the consumer.
 *
 * @typedef {import("./drive-client.js").ResolvedImage} ResolvedImage
 *
 * @typedef {object} SlideshowState
 * @property {ResolvedImage[]} images
 * @property {number} index
 * @property {boolean} paused
 *
 * @typedef {object} SlideshowChange
 * @property {SlideshowState} state
 * @property {"goto" | "next" | "prev" | "pause" | "resume" | "shuffle" | "init"} reason
 * @property {number} previousIndex
 */

export class Slideshow {
  /** @type {SlideshowState} */
  #state;

  /** @type {Set<(change: SlideshowChange) => void>} */
  #subs = new Set();

  /** @param {ResolvedImage[]} images */
  constructor(images) {
    this.#state = {
      images: [...images],
      index: 0,
      paused: false,
    };
  }

  /** Snapshot of current state. Treat as read-only. */
  get state() {
    return this.#state;
  }

  /** Subscribe to state changes. Returns an unsubscribe function. */
  subscribe(fn) {
    this.#subs.add(fn);
    fn({ state: this.#state, reason: "init", previousIndex: this.#state.index });
    return () => this.#subs.delete(fn);
  }

  /** @param {Partial<SlideshowState>} patch @param {SlideshowChange["reason"]} reason */
  #update(patch, reason) {
    const previousIndex = this.#state.index;
    this.#state = { ...this.#state, ...patch };
    for (const fn of this.#subs) {
      fn({ state: this.#state, reason, previousIndex });
    }
  }

  // ----- Navigation --------------------------------------------------

  /** Jump to a specific index. Wraps around modulo length. */
  goto(index, reason = "goto") {
    const n = this.#state.images.length;
    if (n === 0) return;
    const normalized = ((index % n) + n) % n;
    if (normalized === this.#state.index) return;
    this.#update({ index: normalized }, reason);
  }

  next() {
    this.goto(this.#state.index + 1, "next");
  }

  prev() {
    this.goto(this.#state.index - 1, "prev");
  }

  // ----- Playback ----------------------------------------------------

  setPaused(paused) {
    if (this.#state.paused === paused) return;
    this.#update({ paused }, paused ? "pause" : "resume");
  }

  togglePaused() {
    this.setPaused(!this.#state.paused);
  }

  // ----- Shuffle -----------------------------------------------------

  /**
   * Fisher-Yates shuffle, keeping the currently displayed image visible.
   */
  shuffle() {
    const arr = [...this.#state.images];
    const current = arr[this.#state.index];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    const newIndex = arr.indexOf(current);
    this.#update({ images: arr, index: newIndex }, "shuffle");
  }

  /** The image currently being shown. */
  get current() {
    return this.#state.images[this.#state.index];
  }
}
