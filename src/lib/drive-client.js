/**
 * Google Drive image client.
 *
 * Abstracts the public-image URL pattern that Drive exposes via the
 * `lh3.googleusercontent.com/d/<id>=w<width>` endpoint, plus an in-memory
 * preload cache so each photo is only fetched once per session.
 *
 * The client is decoupled from any DOM and any specific slideshow logic —
 * it can be unit-tested or reused for a different consumer.
 *
 * @typedef {object} DriveImageRef
 * @property {string} id          - Drive file ID (28-44 chars).
 *
 * @typedef {object} ResolvedImage
 * @property {string} id          - Drive file ID.
 * @property {string} url         - Full-size CDN URL.
 * @property {string} thumb       - Thumbnail CDN URL.
 */

import { CONFIG } from "./config.js";

const CDN_HOST = "https://lh3.googleusercontent.com";

/**
 * Build a CDN URL for a Drive file ID at a given pixel width.
 * @param {string} id
 * @param {number} width
 * @returns {string}
 */
export function buildImageUrl(id, width) {
  if (!id || typeof id !== "string") {
    throw new TypeError(`drive-client: invalid id "${id}"`);
  }
  if (!Number.isFinite(width) || width <= 0) {
    throw new TypeError(`drive-client: invalid width "${width}"`);
  }
  return `${CDN_HOST}/d/${id}=w${width}`;
}

/**
 * Resolve a manifest row into the URLs we'll actually fetch.
 * @param {DriveImageRef} ref
 * @returns {ResolvedImage}
 */
export function resolveImage(ref) {
  return {
    id: ref.id,
    url: buildImageUrl(ref.id, CONFIG.imageWidths.full),
    thumb: buildImageUrl(ref.id, CONFIG.imageWidths.thumb),
  };
}

/**
 * Stateful client — keeps a per-URL preload cache so we don't re-decode the
 * same image twice. Returned `HTMLImageElement`s can be reused for direct
 * `drawImage`/`backgroundImage` consumption.
 */
export class DriveClient {
  /** @type {Map<string, Promise<HTMLImageElement | null>>} */
  #pending = new Map();
  /** @type {Map<string, HTMLImageElement>} */
  #ready = new Map();

  /**
   * Fetch the manifest JSON.
   * @param {string} [url] - Override manifest URL (defaults to CONFIG.manifestUrl).
   * @returns {Promise<ResolvedImage[]>}
   */
  async loadManifest(url = CONFIG.manifestUrl) {
    // Cache-bust against stale Pages CDN responses.
    const bust = `${url}?v=${Date.now()}`;
    const res = await fetch(bust, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Manifest request failed: HTTP ${res.status}`);
    }
    const data = await res.json();
    if (!Array.isArray(data?.images)) {
      throw new Error("Manifest missing `images` array");
    }
    return data.images.map(resolveImage);
  }

  /**
   * Preload a single image URL. Idempotent and de-duplicating: concurrent
   * calls for the same URL share the same in-flight Promise.
   * @param {string} url
   * @returns {Promise<HTMLImageElement | null>} - null on load failure.
   */
  preload(url) {
    if (this.#ready.has(url)) {
      return Promise.resolve(this.#ready.get(url));
    }
    if (this.#pending.has(url)) {
      return this.#pending.get(url);
    }
    const promise = new Promise((resolve) => {
      const img = new Image();
      img.referrerPolicy = "no-referrer";
      img.decoding = "async";
      img.onload = () => {
        this.#ready.set(url, img);
        this.#pending.delete(url);
        resolve(img);
      };
      img.onerror = () => {
        this.#pending.delete(url);
        resolve(null);
      };
      img.src = url;
    });
    this.#pending.set(url, promise);
    return promise;
  }

  /** True once `url` has finished decoding. */
  isReady(url) {
    return this.#ready.has(url);
  }

  /**
   * Fetch an image as a Blob so the caller can `URL.createObjectURL` it
   * (for downloads, sharing, etc.). Falls back to opening in a new tab if
   * CORS prevents a direct fetch.
   * @param {string} url
   * @returns {Promise<Blob>}
   */
  async fetchBlob(url) {
    const res = await fetch(url, { mode: "cors", referrerPolicy: "no-referrer" });
    if (!res.ok) {
      throw new Error(`Image fetch failed: HTTP ${res.status}`);
    }
    return res.blob();
  }
}
