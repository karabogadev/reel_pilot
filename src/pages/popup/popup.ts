/**
 * Popup. Only reads and writes chrome.storage.local; the content script reacts through storage.onChanged.
 * The one exception is "Copy diagnostics", which asks the active tab's content script for a report.
 */
import { formatSpeed } from '../../core/format.ts';
import { normalizeSettings } from '../../core/settings.ts';
import type { Diagnostics, Message, Settings } from '../../shared/types.ts';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const input = (id: string): HTMLInputElement => $<HTMLInputElement>(id);
const select = (id: string): HTMLSelectElement => $<HTMLSelectElement>(id);

let settings = normalizeSettings(null);

function render(): void {
  input('autoAdvance').checked = settings.autoAdvance;
  select('loops').value = String(settings.loops);
  select('loops').disabled = !settings.autoAdvance;
  input('speed').value = String(settings.speed);
  $('speedValue').textContent = formatSpeed(settings.speed);
  select('seekStep').value = String(settings.seekStep);
  select('stopAfterReels').value = String(settings.stopAfterReels);
  select('stopAfterMinutes').value = String(settings.stopAfterMinutes);
  input('shortcuts').checked = settings.shortcuts;
  $('keys').classList.toggle('off', !settings.shortcuts);
}

function save(patch: Partial<Record<keyof Settings, unknown>>): void {
  settings = normalizeSettings({ ...settings, ...patch });
  void chrome.storage.local.set({ settings });
  render();
}

input('autoAdvance').addEventListener('change', (e) => save({ autoAdvance: (e.target as HTMLInputElement).checked }));
input('shortcuts').addEventListener('change', (e) => save({ shortcuts: (e.target as HTMLInputElement).checked }));
input('speed').addEventListener('input', (e) => save({ speed: (e.target as HTMLInputElement).value }));
$('speedReset').addEventListener('click', () => save({ speed: 1 }));
for (const key of ['loops', 'seekStep', 'stopAfterReels', 'stopAfterMinutes'] as const) {
  select(key).addEventListener('change', (e) => save({ [key]: (e.target as HTMLSelectElement).value }));
}

$('diag').addEventListener('click', async () => {
  const status = $('diagStatus');
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id === undefined) throw new Error('no tab');
    const report: Diagnostics = await chrome.tabs.sendMessage(tab.id, { type: 'diag' } satisfies Message);
    await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    status.textContent = 'Kopyalandı';
  } catch {
    status.textContent = 'Açık bir Instagram sekmesi yok';
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes.settings) return;
  settings = normalizeSettings(changes.settings.newValue);
  render();
});

void chrome.storage.local.get('settings').then((stored) => {
  settings = normalizeSettings(stored.settings);
  render();
});
