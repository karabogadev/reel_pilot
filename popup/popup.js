/**
 * Reel Pilot — popup.
 * Only reads and writes chrome.storage.local; the content script reacts through storage.onChanged.
 */
(() => {
  'use strict';

  const C = globalThis.ReelPilotCore;
  const $ = (id) => document.getElementById(id);

  let settings = C.normalizeSettings(null);

  function render() {
    $('autoAdvance').checked = settings.autoAdvance;
    $('loops').value = String(settings.loops);
    $('loops').disabled = !settings.autoAdvance;
    $('speed').value = String(settings.speed);
    $('speedValue').textContent = C.formatSpeed(settings.speed);
    $('seekStep').value = String(settings.seekStep);
    $('shortcuts').checked = settings.shortcuts;
    $('keys').classList.toggle('off', !settings.shortcuts);
  }

  function save(patch) {
    settings = C.normalizeSettings({ ...settings, ...patch });
    chrome.storage.local.set({ settings });
    render();
  }

  $('autoAdvance').addEventListener('change', (e) => save({ autoAdvance: e.target.checked }));
  $('loops').addEventListener('change', (e) => save({ loops: e.target.value }));
  $('speed').addEventListener('input', (e) => save({ speed: e.target.value }));
  $('speedReset').addEventListener('click', () => save({ speed: 1 }));
  $('seekStep').addEventListener('change', (e) => save({ seekStep: e.target.value }));
  $('shortcuts').addEventListener('change', (e) => save({ shortcuts: e.target.checked }));

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.settings) return;
    settings = C.normalizeSettings(changes.settings.newValue);
    render();
  });

  chrome.storage.local.get('settings').then((stored) => {
    settings = C.normalizeSettings(stored.settings);
    render();
  });
})();
