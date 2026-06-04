/**
 * SVG progress ring driver. Reads from a PausableScheduler each frame and
 * paints the stroke-dashoffset.
 *
 * @typedef {import("../lib/scheduler.js").PausableScheduler} Scheduler
 */

const RADIUS = 16;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export class ProgressRing {
  /** @param {SVGCircleElement | HTMLElement} fgEl  @param {Scheduler} scheduler */
  constructor(fgEl, scheduler) {
    this.fg = fgEl;
    this.scheduler = scheduler;
    /** @type {number} */ this._raf = 0;
    this._frame = this._frame.bind(this);
  }

  start() {
    this._raf = requestAnimationFrame(this._frame);
  }

  stop() {
    cancelAnimationFrame(this._raf);
    this._raf = 0;
  }

  _frame() {
    const { elapsedMs, durationMs } = this.scheduler.status();
    const progress = Math.min(elapsedMs / durationMs, 1);
    this.fg.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - progress));
    this._raf = requestAnimationFrame(this._frame);
  }
}
