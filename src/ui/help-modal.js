/**
 * Help modal open/close + dismissal-on-backdrop.
 */

export class HelpModal {
  /** @param {HTMLElement} root @param {HTMLElement} closeBtn */
  constructor(root, closeBtn) {
    this.root = root;
    closeBtn.addEventListener("click", () => this.close());
    root.addEventListener("click", (e) => {
      if (e.target === root) this.close();
    });
  }

  open() {
    this.root.setAttribute("aria-hidden", "false");
  }

  close() {
    this.root.setAttribute("aria-hidden", "true");
  }

  toggle() {
    if (this.root.getAttribute("aria-hidden") === "false") this.close();
    else this.open();
  }
}
