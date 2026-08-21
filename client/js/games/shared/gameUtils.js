const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

export function addFullscreenBtn(container) {
  if (!document.fullscreenEnabled) return null;
  const btn = document.createElement('button');
  btn.className = 'game-fullscreen-btn';
  btn.textContent = '⛶';
  btn.title = 'Plein écran (F)';
  btn.style.cssText = 'position:absolute;top:8px;right:8px;z-index:50;width:40px;height:40px;border-radius:8px;background:rgba(0,0,0,0.6);color:#fff;border:1px solid rgba(255,255,255,0.2);font-size:1.4rem;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)';
  btn.addEventListener('click', toggleFs);
  container.appendChild(btn);

  function toggleFs() {
    if (document.fullscreenElement) document.exitFullscreen();
    else container.requestFullscreen().catch(() => {});
  }
  const onFs = () => { btn.textContent = document.fullscreenElement ? '✕' : '⛶'; };
  document.addEventListener('fullscreenchange', onFs);

  // Keyboard shortcut: F to toggle fullscreen
  const onKey = (e) => {
    if (e.key === 'f' || e.key === 'F') {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      e.preventDefault();
      toggleFs();
    }
  };
  document.addEventListener('keydown', onKey);

  return () => {
    document.removeEventListener('fullscreenchange', onFs);
    document.removeEventListener('keydown', onKey);
  };
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
