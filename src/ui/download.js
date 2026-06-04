/**
 * Save a Blob to disk with a given filename.
 */

/**
 * @param {Blob} blob
 * @param {string} filename
 */
export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser a beat to commit the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

/**
 * Padded filename like `our-kids-04.jpg`.
 * @param {number} index1Based
 */
export function photoFilename(index1Based) {
  return `our-kids-${String(index1Based).padStart(2, "0")}.jpg`;
}
