export type Lang = 'tr' | 'en';
/** 'auto' follows the browser's language. */
export type LangSetting = Lang | 'auto';

/** User settings, stored under the `settings` key in chrome.storage.local. */
export interface Settings {
  autoAdvance: boolean;
  /** How many times a reel plays before auto-advance moves on (1–5). */
  loops: number;
  speed: number;
  /** Seconds per arrow-key seek. */
  seekStep: number;
  shortcuts: boolean;
  /** Take a break after this many reels; 0 turns the limit off. */
  stopAfterReels: number;
  /** Take a break after this many minutes of playback; 0 turns the limit off. */
  stopAfterMinutes: number;
  /** Hide ads on the Reels feed and jump past them. */
  skipAds: boolean;
  /** Language of the popup and the in-page UI. */
  lang: LangSetting;
}

export interface Route {
  /** Does the extension run on this page at all. */
  enabled: boolean;
  /** Is it the Reels feed (auto-advance and arrow-key seeking). */
  feed: boolean;
}

/** An A-B loop on the active reel, in seconds. `b` is null until the end point is set. */
export interface AbLoop {
  a: number;
  b: number | null;
}

/** What "Copy diagnostics" in the popup reports. Contains no URLs, reel codes or account names. */
export interface Diagnostics {
  version: string;
  route: Route;
  settings: Settings;
  videos: Array<{
    active: boolean;
    loop: boolean;
    loopAttr: boolean;
    paused: boolean;
    duration: number;
    rate: number;
    source: 'blob' | 'url' | 'none';
  }>;
  scroller: { snap: string; slides: number } | null;
  stats: Record<string, number>;
}

export type Message = { type: 'diag' };
