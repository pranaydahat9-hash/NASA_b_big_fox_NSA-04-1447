import { isAppPreview } from './offline-help-policy';
export async function registerOfflineHelp() {
  if (!('serviceWorker' in navigator)) return;
  const refused = !import.meta.env.PROD || window.self !== window.top || isAppPreview(window.location.hostname) || new URL(window.location.href).searchParams.get('sw') === 'off';
  if (refused) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.filter(reg => [reg.active, reg.waiting, reg.installing].some(worker => worker && new URL(worker.scriptURL).pathname === '/sw.js')).map(reg => reg.unregister()));
    return;
  }
  await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  await navigator.serviceWorker.ready;
  if (!navigator.serviceWorker.controller) await new Promise<void>(resolve => {
    const done = () => { navigator.serviceWorker.removeEventListener('controllerchange', done); resolve(); };
    navigator.serviceWorker.addEventListener('controllerchange', done, { once: true });
    setTimeout(done, 5000);
  });
  if (navigator.serviceWorker.controller) await fetch('/emergency-kit.html').catch(() => {});
}