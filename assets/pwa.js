export function setupPwa(base) {
  const install = document.querySelector('#pwa-install'), status = document.querySelector('#pwa-status'), update = document.querySelector('#pwa-update');
  let prompt, registration;
  const network = () => { status.hidden = navigator.onLine; status.textContent = '目前離線'; };
  const ready = network;
  addEventListener('beforeinstallprompt', event => { event.preventDefault(); prompt = event; install.hidden = false; });
  install.addEventListener('click', async () => { if (!prompt) return; await prompt.prompt(); await prompt.userChoice; prompt = null; install.hidden = true; });
  addEventListener('appinstalled', () => { install.hidden = true; });
  addEventListener('offline', ready);
  addEventListener('online', () => { registration?.active ? ready() : network(); });
  if (!('serviceWorker' in navigator) || !isSecureContext) { status.hidden = true; return; }
  // Vite development imports are transient; test offline support with npm run preview.
  if (import.meta.env?.DEV) { status.hidden = true; return; }
  network();
  navigator.serviceWorker.register(`${base}sw.js`, { scope: base, updateViaCache: 'none' }).then(reg => {
    registration = reg;
    const waiting = () => { if (reg.waiting) update.hidden = false; };
    waiting(); reg.addEventListener('updatefound', () => reg.installing?.addEventListener('statechange', waiting));
    navigator.serviceWorker.ready.then(ready);
    update.addEventListener('click', () => reg.waiting?.postMessage('ACTIVATE'));
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (!update.hidden && !refreshing) { refreshing = true; location.reload(); } });
  }).catch(() => { status.hidden = false; status.textContent = '離線資料未完成，請連線後重新整理重試。'; });
}
