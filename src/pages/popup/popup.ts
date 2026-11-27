/**
 * Popup. Only reads and writes chrome.storage.local; the content script reacts through storage.onChanged.
 * The one exception is "Copy diagnostics", which asks the active tab's content script for a report.
 */
import { formatSpeed } from '../../core/format.ts';
import { isTextKey, messages, resolveLang, type Messages } from '../../core/i18n.ts';
import { normalizeSettings } from '../../core/settings.ts';
import type { Diagnostics, Message, Settings } from '../../shared/types.ts';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const input = (id: string): HTMLInputElement => $<HTMLInputElement>(id);
const select = (id: string): HTMLSelectElement => $<HTMLSelectElement>(id);

let settings = normalizeSettings(null);

const t = (): Messages => messages(resolveLang(settings.lang, navigator.language));

/** Option labels that carry a number, written from each option's value. */
function labelOptions(id: string, label: (n: number) => string): void {
  for (const option of select(id).options) option.textContent = label(Number(option.value));
}

function translate(): void {
  const m = t();
  const lang = resolveLang(settings.lang, navigator.language);
  document.documentElement.lang = lang;
  for (const el of document.querySelectorAll<HTMLElement>('[data-i18n]')) {
    const key = el.dataset.i18n ?? '';
    if (isTextKey(key)) el.textContent = m[key];
  }
  for (const el of document.querySelectorAll<HTMLElement>('[data-i18n-aria]')) {
    const key = el.dataset.i18nAria ?? '';
    if (isTextKey(key)) el.setAttribute('aria-label', m[key]);
  }
  labelOptions('seekStep', m.seconds);
  labelOptions('stopAfterReels', (n) => (n ? m.reels(n) : m.reelsOff));
  labelOptions('stopAfterMinutes', (n) => (n ? m.minutes(n) : m.minutesOff));
  for (const button of document.querySelectorAll<HTMLElement>('[data-lang]')) {
    button.setAttribute('aria-pressed', String(button.dataset.lang === lang));
  }
}

function render(): void {
  translate();
  input('autoAdvance').checked = settings.autoAdvance;
  select('loops').value = String(settings.loops);
  select('loops').disabled = !settings.autoAdvance;
  input('speed').value = String(settings.speed);
  $('speedValue').textContent = formatSpeed(settings.speed);
  select('seekStep').value = String(settings.seekStep);
  select('stopAfterReels').value = String(settings.stopAfterReels);
  select('stopAfterMinutes').value = String(settings.stopAfterMinutes);
  input('shortcuts').checked = settings.shortcuts;
  input('skipAds').checked = settings.skipAds;
  $('keys').classList.toggle('off', !settings.shortcuts);
}

function save(patch: Partial<Record<keyof Settings, unknown>>): void {
  settings = normalizeSettings({ ...settings, ...patch });
  void chrome.storage.local.set({ settings });
  render();
}

input('autoAdvance').addEventListener('change', (e) => save({ autoAdvance: (e.target as HTMLInputElement).checked }));
input('shortcuts').addEventListener('change', (e) => save({ shortcuts: (e.target as HTMLInputElement).checked }));
input('skipAds').addEventListener('change', (e) => save({ skipAds: (e.target as HTMLInputElement).checked }));
input('speed').addEventListener('input', (e) => save({ speed: (e.target as HTMLInputElement).value }));
$('speedReset').addEventListener('click', () => save({ speed: 1 }));
for (const key of ['loops', 'seekStep', 'stopAfterReels', 'stopAfterMinutes'] as const) {
  select(key).addEventListener('change', (e) => save({ [key]: (e.target as HTMLSelectElement).value }));
}

for (const button of document.querySelectorAll<HTMLElement>('[data-lang]')) {
  button.addEventListener('click', () => save({ lang: button.dataset.lang }));
}

$('diag').addEventListener('click', async () => {
  const status = $('diagStatus');
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id === undefined) throw new Error('no tab');
    const report: Diagnostics = await chrome.tabs.sendMessage(tab.id, { type: 'diag' } satisfies Message);
    await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    status.textContent = t().copied;
  } catch {
    status.textContent = t().noInstagramTab;
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
