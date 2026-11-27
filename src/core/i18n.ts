/**
 * Every string the extension shows, in English and Turkish.
 * `tr` is typed as `Messages`, so a key missing from either language is a type error.
 */
import type { Lang, LangSetting } from '../shared/types.ts';

export const LANGS: readonly Lang[] = ['tr', 'en'];

/** 'auto' follows the browser's language: Turkish for tr-*, English for everything else. */
export function resolveLang(setting: LangSetting, uiLanguage: string): Lang {
  if (setting !== 'auto') return setting;
  return /^tr\b/i.test(uiLanguage) ? 'tr' : 'en';
}

const en = {
  // In-page controls
  slower: 'Slower',
  faster: 'Faster',
  resetSpeed: 'Back to 1x',
  autoAdvance: 'Auto-advance',
  autoShort: 'Auto',
  stayOnReel: 'Stay on this reel',
  fullscreen: 'Full screen',
  exitFullscreen: 'Exit full screen',

  // Toasts
  seek: (dir: 1 | -1, seconds: number) => `${dir > 0 ? '+' : '−'}${seconds} s`,
  autoAdvanceState: (on: boolean) => `Auto-advance ${on ? 'on' : 'off'}`,
  frameCopied: 'Frame copied',
  frameDownloaded: 'Frame downloaded',
  frameFailed: 'Couldn’t capture the frame',
  loopEndBeforeStart: 'B has to come after A',
  loopSet: (a: string, b: string) => `Loop ${a}–${b}`,
  loopOff: 'Loop off',
  unlocked: 'Unlocked',
  adSkipped: 'Ad skipped',

  // Break reminder
  breakTitle: 'Time for a break',
  breakReels: (n: number) => `You’ve watched ${n} reels.`,
  breakMinutes: (n: number) => `You’ve been watching for ${n} minutes.`,
  breakContinue: 'Continue',

  // Popup
  language: 'Language',
  autoAdvanceHint: 'Move on when a reel ends',
  loops: 'Plays per reel',
  loopsHint: 'Before moving on',
  speed: 'Speed',
  seekStep: 'Seek step',
  seconds: (n: number) => `${n} s`,
  breakReminder: 'Break reminder',
  breakReminderHint: 'Pause after a number of reels or minutes',
  reelCount: 'Number of reels',
  reelsOff: 'Reels: off',
  reels: (n: number) => `${n} reels`,
  duration: 'Time',
  minutesOff: 'Time: off',
  minutes: (n: number) => `${n} min`,
  skipAds: 'Skip ads',
  skipAdsHint: 'Ads are hidden and the feed jumps past them',
  shortcuts: 'Keyboard shortcuts',
  shortcutList: 'Shortcut list',
  keySeek: 'Seek back / forward',
  keySpeed: 'Slower / faster / 1x',
  keyBoost: 'Hold: double speed',
  keyFrame: 'Previous / next frame',
  keyCopy: 'Copy frame',
  keyLoop: 'A-B loop: start / end / clear',
  keyAuto: 'Toggle auto-advance',
  copyDiagnostics: 'Copy diagnostics',
  copied: 'Copied',
  noInstagramTab: 'No open Instagram tab',
};

export type Messages = typeof en;

const tr: Messages = {
  slower: 'Yavaşlat',
  faster: 'Hızlandır',
  resetSpeed: '1x’e dön',
  autoAdvance: 'Otomatik geçiş',
  autoShort: 'Oto',
  stayOnReel: 'Bu reel’de kal',
  fullscreen: 'Tam ekran',
  exitFullscreen: 'Tam ekrandan çık',

  seek: (dir, seconds) => `${dir > 0 ? '+' : '−'}${seconds} sn`,
  autoAdvanceState: (on) => `Otomatik geçiş ${on ? 'açık' : 'kapalı'}`,
  frameCopied: 'Kare kopyalandı',
  frameDownloaded: 'Kare indirildi',
  frameFailed: 'Kare alınamadı',
  loopEndBeforeStart: 'B, A’dan sonra olmalı',
  loopSet: (a, b) => `Döngü ${a}–${b}`,
  loopOff: 'Döngü kapalı',
  unlocked: 'Kilit açıldı',
  adSkipped: 'Reklam geçildi',

  breakTitle: 'Mola zamanı',
  breakReels: (n) => `${n} reel izledin.`,
  breakMinutes: (n) => `${n} dakikadır izliyorsun.`,
  breakContinue: 'Devam et',

  language: 'Dil',
  autoAdvanceHint: 'Reel bitince sonrakine geç',
  loops: 'Kaç kez oynasın',
  loopsHint: 'Geçmeden önce',
  speed: 'Hız',
  seekStep: 'Sarma adımı',
  seconds: (n) => `${n} sn`,
  breakReminder: 'Mola hatırlat',
  breakReminderHint: 'Reel sayısı ya da süre dolunca duraklat',
  reelCount: 'Reel sayısı',
  reelsOff: 'Reel: kapalı',
  reels: (n) => `${n} reel`,
  duration: 'Süre',
  minutesOff: 'Süre: kapalı',
  minutes: (n) => `${n} dk`,
  skipAds: 'Reklamları geç',
  skipAdsHint: 'Reklamlar gizlenir, akış onları atlar',
  shortcuts: 'Klavye kısayolları',
  shortcutList: 'Kısayol listesi',
  keySeek: 'Geri / ileri sar',
  keySpeed: 'Yavaşlat / hızlandır / 1x',
  keyBoost: 'Basılı tut: 2 kat hız',
  keyFrame: 'Kare kare geri / ileri',
  keyCopy: 'Kareyi kopyala',
  keyLoop: 'A-B döngü: başla / bitir / temizle',
  keyAuto: 'Otomatik geçiş aç/kapa',
  copyDiagnostics: 'Tanılama kopyala',
  copied: 'Kopyalandı',
  noInstagramTab: 'Açık bir Instagram sekmesi yok',
};

const DICTS: Record<Lang, Messages> = { en, tr };

export const messages = (lang: Lang): Messages => DICTS[lang];

/** Keys whose value is plain text, so markup can reference them by name (`data-i18n`). */
export type TextKey = { [K in keyof Messages]: Messages[K] extends string ? K : never }[keyof Messages];

export const isTextKey = (key: string): key is TextKey => typeof en[key as keyof Messages] === 'string';
