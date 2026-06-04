/**
 * Tiny transient notification controller. Single element, queued by replace.
 */

export class Toast {
  /** @param {HTMLElement} el */
  constructor(el) {
    this.el = el;
    /** @type {ReturnType<typeof setTimeout> | null} */
    this._hideTimer = null;
  }

  /** Show a message for `durationMs`, replacing any previous toast. */
  show(message, durationMs = 1800) {
    this.el.textContent = message;
    this.el.classList.add("show");
    if (this._hideTimer) clearTimeout(this._hideTimer);
    this._hideTimer = setTimeout(() => this.hide(), durationMs);
  }

  hide() {
    this.el.classList.remove("show");
    if (this._hideTimer) {
      clearTimeout(this._hideTimer);
      this._hideTimer = null;
    }
  }
}
