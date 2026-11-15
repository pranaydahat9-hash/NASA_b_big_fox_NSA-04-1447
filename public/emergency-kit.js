(() => {
  const el = id => document.getElementById(id);
  const key = 'fox.offline-help.contacts';
  const network = () => { el('network').textContent = navigator.onLine ? 'Ready · Internet available' : 'Offline · Calls/SMS still need mobile signal'; };
  network(); window.addEventListener('online', network); window.addEventListener('offline', network);
  let contacts = [];
  try { const saved = JSON.parse(localStorage.getItem(key) || 'null'); contacts = Array.isArray(saved?.contacts) ? saved.contacts.filter(c => typeof c.name === 'string' && /^\+[1-9]\d{6,14}$/.test(c.phone)).slice(0, 30) : []; el('contact-status').textContent = contacts.length ? `Saved on ${new Date(saved.savedAt).toLocaleString()}.` : 'No contacts saved on this device. While online, save contacts from B fox downloads.'; } catch { el('contact-status').textContent = 'Saved contacts could not be read.'; }
  const render = () => {
    el('contacts').replaceChildren();
    for (const contact of contacts) {
      const row = document.createElement('div'); row.className = 'contact';
      const name = document.createElement('strong'); name.textContent = `${contact.name} · ${contact.phone}`; row.append(name);
      const actions = document.createElement('div'); actions.className = 'contact-actions';
      const call = document.createElement('a'); call.className = 'button secondary'; call.textContent = `Call ${contact.name}`; call.href = `tel:${contact.phone}`;
      const sms = document.createElement('a'); sms.className = 'button'; sms.textContent = `SMS ${contact.name}`; const ios = /iPhone|iPad/.test(navigator.userAgent); sms.href = `sms:${contact.phone}${ios ? '&' : '?'}body=${encodeURIComponent(el('message').value)}`;
      actions.append(call, sms); row.append(actions); el('contacts').append(row);
    }
  };
  render(); el('message').addEventListener('input', render);
  el('clear-contacts').onclick = () => { localStorage.removeItem(key); contacts = []; render(); el('contact-status').textContent = 'Contacts removed from this device. Your B fox account contacts are unchanged.'; };
  el('location').onclick = () => {
    if (!navigator.geolocation) { el('location-status').textContent = 'GPS unavailable on this device. Add your address to the message.'; return; }
    el('location-status').textContent = 'Getting GPS location…';
    navigator.geolocation.getCurrentPosition(p => {
      const coords = `${p.coords.latitude.toFixed(6)},${p.coords.longitude.toFixed(6)}`; const at = new Date(p.timestamp).toISOString();
      el('message').value = `SOS: I need help. Location at ${at}: ${coords} (accuracy ±${Math.round(p.coords.accuracy)} m). https://maps.google.com/?q=${coords}. Please call me or send assistance.`;
      el('location-status').textContent = `GPS: ${coords} · acquired ${new Date(p.timestamp).toLocaleTimeString()}`; render();
    }, () => { el('location-status').textContent = 'GPS unavailable or permission denied. Add your address or landmark to the message.'; }, {enableHighAccuracy:true,timeout:20000,maximumAge:0});
  };
  let audio, oscillator, gain, timer;
  const stop = () => { clearInterval(timer); try { oscillator?.stop(); audio?.close(); navigator.vibrate?.(0); } catch {} oscillator = null; el('sound').textContent = 'Start local distress sound'; el('sound').setAttribute('aria-pressed','false'); el('sound-status').textContent = 'Sound is off.'; };
  el('sound').onclick = async () => {
    if (oscillator) { stop(); return; }
    try {
      const Audio = window.AudioContext || window.webkitAudioContext; if (!Audio) throw new Error('no audio');
      audio = new Audio(); await audio.resume(); oscillator = audio.createOscillator(); gain = audio.createGain(); gain.gain.value = 0.12; oscillator.frequency.value = 900; oscillator.connect(gain).connect(audio.destination); oscillator.start();
      let high = false; timer = setInterval(() => { if (!oscillator || !audio) return; high = !high; oscillator.frequency.setValueAtTime(high ? 1200 : 900, audio.currentTime); try { navigator.vibrate?.(150); } catch {} },500);
      el('sound').textContent = 'Stop local distress sound'; el('sound').setAttribute('aria-pressed','true'); el('sound-status').textContent = 'Sound playing on this phone only. No message sent.';
    } catch { stop(); el('sound-status').textContent = 'Sound unavailable. Use your voice, whistle or the HELP signal.'; }
  };
  window.addEventListener('pagehide',stop);
  el('visible').onclick = () => { el('help-signal').hidden = false; el('close-visible').focus(); };
  el('close-visible').onclick = () => { el('help-signal').hidden = true; el('visible').focus(); };
})();