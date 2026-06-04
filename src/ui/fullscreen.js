/**
 * Vendor-agnostic fullscreen toggle.
 */

export function isFullscreen() {
  // @ts-ignore — webkit prefix not in lib.dom
  return Boolean(document.fullscreenElement || document.webkitFullscreenElement);
}

export function toggleFullscreen(target = document.documentElement) {
  if (isFullscreen()) {
    // @ts-ignore
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    exit?.call(document);
  } else {
    // @ts-ignore
    const req = target.requestFullscreen || target.webkitRequestFullscreen;
    req?.call(target);
  }
}
