// Minimal DOM helper — avoids framework overhead
export function el(tag, attrs = {}, ...children) {
  const element = document.createElement(tag);

  for (const [key, val] of Object.entries(attrs)) {
    if (key === 'class' || key === 'className') {
      element.className = val;
    } else if (key === 'style' && typeof val === 'object') {
      Object.assign(element.style, val);
    } else if (key.startsWith('on') && typeof val === 'function') {
      element.addEventListener(key.slice(2).toLowerCase(), val);
    } else if (key === 'dataset') {
      Object.assign(element.dataset, val);
    } else if (key === 'html') {
      // skip — handled below
    } else {
      element.setAttribute(key, val);
    }
  }

  for (const child of children) {
    if (child == null || child === false) continue;
    if (typeof child === 'string' || typeof child === 'number') {
      element.appendChild(document.createTextNode(String(child)));
    } else if (child instanceof Node) {
      element.appendChild(child);
    }
  }

  return element;
}

// Toast notification system
const toastContainer = (() => {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = el('div', { class: 'toast-container' });
    document.body.appendChild(container);
  }
  return container;
})();

export function showToast(message, type = 'info', duration = 3000) {
  const toast = el('div', { class: `toast toast-${type}` }, message);
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'fadeOut 200ms ease forwards';
    setTimeout(() => toast.remove(), 200);
  }, duration);
}

export function showModal(content, onClose) {
  const overlay = el('div', { class: 'modal-overlay', onClick: (e) => {
    if (e.target === overlay) close();
  }});
  const modal = el('div', { class: 'modal' });

  if (typeof content === 'string') {
    modal.innerHTML = content;
  } else {
    modal.appendChild(content);
  }

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  function close() {
    overlay.style.animation = 'fadeOut 150ms ease forwards';
    setTimeout(() => {
      overlay.remove();
      onClose?.();
    }, 150);
  }

  return close;
}
