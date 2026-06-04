/**
 * Pausable interval scheduler.
 *
 * `setTimeout` doesn't compose with pause/resume — once you clear it you
 * lose the elapsed time. This wrapper tracks elapsed time so resume picks
 * up where pause left off, which matches what the progress ring shows.
 *
 * Single responsibility: own the timing of one recurring event.
 *
 * @typedef {object} SchedulerStatus
 * @property {number} elapsedMs    - Time inside the current tick.
 * @property {number} durationMs   - Configured tick length.
 * @property {boolean} running
 */

export class PausableScheduler {
  /** @type {number} */ #durationMs;
  /** @type {() => void} */ #onTick;
  /** @type {ReturnType<typeof setTimeout> | null} */ #timer = null;
  /** @type {number} */ #startedAt = 0;
  /** @type {number} */ #carryMs = 0;
  /** @type {boolean} */ #running = false;

  /** @param {number} durationMs @param {() => void} onTick */
  constructor(durationMs, onTick) {
    this.#durationMs = durationMs;
    this.#onTick = onTick;
  }

  /** Start (or restart) a fresh tick from zero. */
  restart() {
    this.cancel();
    this.#carryMs = 0;
    this.#startedAt = performance.now();
    this.#running = true;
    this.#timer = setTimeout(() => {
      this.#running = false;
      this.#onTick();
    }, this.#durationMs);
  }

  /** Cancel without firing. */
  cancel() {
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = null;
    this.#running = false;
    this.#carryMs = 0;
  }

  /** Pause where we are. Resume picks up the remaining time. */
  pause() {
    if (!this.#running) return;
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = null;
    this.#carryMs += performance.now() - this.#startedAt;
    this.#running = false;
  }

  /** Resume from the last pause. No-op if already running. */
  resume() {
    if (this.#running) return;
    const remaining = Math.max(this.#durationMs - this.#carryMs, 50);
    this.#startedAt = performance.now();
    this.#running = true;
    this.#timer = setTimeout(() => {
      this.#running = false;
      this.#onTick();
    }, remaining);
  }

  /** @returns {SchedulerStatus} */
  status() {
    const elapsedMs = this.#running
      ? this.#carryMs + (performance.now() - this.#startedAt)
      : this.#carryMs;
    return {
      elapsedMs: Math.min(elapsedMs, this.#durationMs),
      durationMs: this.#durationMs,
      running: this.#running,
    };
  }
}
