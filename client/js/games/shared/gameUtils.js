const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

export function addFullscreenBtn(container) {
  if (!isMobile || !document.fullscreenEnabled) return null;
  const btn = document.createElement('button');
  btn.className = 'game-fullscreen-btn';
  btn.textContent = '⛶';
  btn.title = 'Plein écran';
  btn.style.cssText = 'position:absolute;top:8px;right:8px;z-index:50';
  btn.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else container.requestFullscreen().catch(() => {});
  });
  container.appendChild(btn);
  const onFs = () => {
    btn.textContent = document.fullscreenElement ? '✕' : '⛶';
  };
  document.addEventListener('fullscreenchange', onFs);
  return () => document.removeEventListener('fullscreenchange', onFs);
}

export function acquireWakeLock() {
  let wl = null;
  if ('wakeLock' in navigator) {
    navigator.wakeLock.request('screen').then(w => { wl = w; }).catch(() => {});
  }
  return () => wl?.release().catch(() => {});
}

export function isMobileDevice() {
  return isMobile;
}
