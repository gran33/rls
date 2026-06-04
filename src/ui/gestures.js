/**
 * Touch gesture recognizer. Translates raw touch events into semantic
 * callbacks (swipe-left/right, double-tap, long-press) so the slideshow
 * logic stays clean.
 */

import { CONFIG } from "../lib/config.js";

/**
 * @typedef {object} GestureHandlers
 * @property {() => void} [onSwipeLeft]
 * @property {() => void} [onSwipeRight]
 * @property {() => void} [onDoubleTap]
 * @property {() => void} [onLongPress]
 */

export class GestureRecognizer {
  /** @param {HTMLElement} target @param {GestureHandlers} handlers */
  constructor(target, handlers) {
    this.target = target;
    this.handlers = handlers;

    this._startX = 0;
    this._startY = 0;
    this._startT = 0;
    this._lastTapT = 0;
    /** @type {ReturnType<typeof setTimeout> | null} */
    this._longPressTimer = null;

    this._onStart = this._onStart.bind(this);
    this._onMove = this._onMove.bind(this);
    this._onEnd = this._onEnd.bind(this);
  }

  attach() {
    this.target.addEventListener("touchstart", this._onStart, { passive: true });
    this.target.addEventListener("touchmove", this._onMove, { passive: true });
    this.target.addEventListener("touchend", this._onEnd, { passive: true });
  }

  detach() {
    this.target.removeEventListener("touchstart", this._onStart);
    this.target.removeEventListener("touchmove", this._onMove);
    this.target.removeEventListener("touchend", this._onEnd);
  }

  _clearLongPress() {
    if (this._longPressTimer) {
      clearTimeout(this._longPressTimer);
      this._longPressTimer = null;
    }
  }

  /** @param {TouchEvent} e */
  _onStart(e) {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    this._startX = t.clientX;
    this._startY = t.clientY;
    this._startT = performance.now();
    this._longPressTimer = setTimeout(() => {
      this.handlers.onLongPress?.();
      navigator.vibrate?.(CONFIG.vibrate.longPress);
    }, CONFIG.longPressMs);
  }

  _onMove() {
    this._clearLongPress();
  }

  /** @param {TouchEvent} e */
  _onEnd(e) {
    this._clearLongPress();
    if (e.changedTouches.length !== 1) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - this._startX;
    const dy = t.clientY - this._startY;
    const dt = performance.now() - this._startT;

    const isHorizontal = Math.abs(dx) > Math.abs(dy);
    const isSwipe = Math.abs(dx) > CONFIG.swipeThresholdPx;
    if (isHorizontal && isSwipe) {
      navigator.vibrate?.(CONFIG.vibrate.swipe);
      if (dx < 0) this.handlers.onSwipeLeft?.();
      else this.handlers.onSwipeRight?.();
      return;
    }

    const isTap = dt < 250 && Math.abs(dx) < 10 && Math.abs(dy) < 10;
    if (!isTap) return;

    const now = performance.now();
    if (now - this._lastTapT < CONFIG.doubleTapMs) {
      this.handlers.onDoubleTap?.();
      this._lastTapT = 0;
    } else {
      this._lastTapT = now;
    }
  }
}
