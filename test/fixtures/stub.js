window.__store = {};
window.GM_getValue = (k, d) => (k in window.__store ? window.__store[k] : d);
window.GM_setValue = (k, v) => { window.__store[k] = v; };
window.GM_addStyle = css => { const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); };
window.__errors = [];
window.addEventListener('error', e => window.__errors.push(e.message));
