/**
 * Filmstrip thumbnail row. Builds DOM once from the resolved image list,
 * highlights the active thumb, scroll-snaps it into view.
 *
 * @typedef {import("../lib/drive-client.js").ResolvedImage} ResolvedImage
 */

export class Filmstrip {
  /**
   * @param {HTMLElement} container
   * @param {ResolvedImage[]} images
   * @param {(index: number) => void} onSelect
   */
  constructor(container, images, onSelect) {
    this.container = container;
    this.onSelect = onSelect;
    this._build(images);
  }

  /** Rebuild for a new image order (e.g. after shuffle). */
  rebuild(images) {
    this._build(images);
  }

  _build(images) {
    // textContent='' is safer than innerHTML for clearing.
    this.container.textContent = "";
    const frag = document.createDocumentFragment();
    images.forEach((image, i) => {
      const btn = document.createElement("button");
      btn.className = "thumb";
      btn.type = "button";
      btn.role = "tab";
      btn.setAttribute("aria-label", `Photo ${i + 1}`);
      btn.style.backgroundImage = `url("${image.thumb}")`;
      btn.addEventListener("click", () => this.onSelect(i));
      frag.appendChild(btn);
    });
    this.container.appendChild(frag);
  }

  /** Highlight + center the thumb at `index`. */
  setActive(index) {
    const children = this.container.children;
    for (let i = 0; i < children.length; i++) {
      children[i].classList.toggle("active", i === index);
    }
    const active = children[index];
    if (!(active instanceof HTMLElement)) return;

    const stripRect = this.container.getBoundingClientRect();
    const elRect = active.getBoundingClientRect();
    const offset =
      (elRect.left + elRect.width / 2) -
      (stripRect.left + stripRect.width / 2);
    this.container.scrollBy({ left: offset, behavior: "smooth" });
  }
}
