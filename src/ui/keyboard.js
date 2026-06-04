/**
 * Keyboard binding registry. Each key string maps to a callback. Skips
 * events originating from form controls so we don't hijack typing.
 *
 * @typedef {Record<string, () => void>} KeyMap
 */

export class KeyboardBindings {
  /** @param {KeyMap} bindings */
  constructor(bindings) {
    /** @type {KeyMap} */
    this.bindings = bindings;
    this._onKey = this._onKey.bind(this);
  }

  attach() {
    document.addEventListener("keydown", this._onKey);
  }

  detach() {
    document.removeEventListener("keydown", this._onKey);
  }

  /** @param {KeyboardEvent} e */
  _onKey(e) {
    const target = e.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      return;
    }
    const handler = this.bindings[e.key];
    if (handler) {
      e.preventDefault();
      handler();
    }
  }
}
