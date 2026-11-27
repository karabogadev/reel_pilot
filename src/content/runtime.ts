/**
 * The engine behind every feature.
 *
 * Does not depend on Instagram's class names or selectors. It has four inputs:
 *   1. media events in the capture phase (they do not bubble, but can be captured on document)
 *   2. a single requestAnimationFrame loop (active video + UI position)
 *   3. chrome.storage.local (single source of truth; the popup writes there too)
 *   4. the keyboard and the UI's own pointer events
 *
 * It is the only place that writes `playbackRate` and the only place that advances the feed.
 * Features state intents (boost, gates, actions) through the context instead.
 */
import { pickActive } from '../core/active.ts';
import { formatSpeed } from '../core/format.ts';
import { messages, resolveLang, type Messages } from '../core/i18n.ts';
import { isTypingTarget, keyAction, type Action } from '../core/keys.ts';
import { clampTime, decideEnd, effectiveRate } from '../core/playback.ts';
import { routeOf } from '../core/route.ts';
import { clamp, normalizeSettings, stepSpeed } from '../core/settings.ts';
import type { Diagnostics, Route, Settings } from '../shared/types.ts';
import { createOverlay, type Overlay } from './overlay.ts';

const ACTIVE_CHECK_EVERY = 15; // frames; ~4 Hz
const ADVANCE_CHECK_MS = 600;
const MAX_FRAME_MS = 1000;

type Handler<T extends Action['type']> = (action: Extract<Action, { type: T }>) => void;

/** What a feature gets to work with. Features never import each other. */
export interface Ctx {
  readonly overlay: Overlay;
  /** Aborted when the runtime shuts down; pass it to every addEventListener. */
  readonly signal: AbortSignal;
  settings(): Settings;
  /** The strings for the language picked in the popup. */
  t(): Messages;
  active(): HTMLVideoElement | null;
  route(): Route;
  seekTo(time: number): void;
  setBoost(on: boolean): void;
  /** The element that scrolls the feed `video` sits in, if any. */
  scroller(video: HTMLVideoElement): HTMLElement | null;
  /** Jumps past `video` right away, down (1) or up (-1) the feed. */
  skip(video: HTMLVideoElement, dir: 1 | -1): void;
  /** Runs when a shortcut or a button triggers `type`. */
  handle<T extends Action['type']>(type: T, handler: Handler<T>): void;
  /** Auto-advance asks every gate at the end of a reel; a non-null reason keeps the reel on screen. */
  gate(reason: () => string | null): void;
  /** Runs when a different reel becomes active (another video, or a new source in a reused one). */
  onReel(listener: (video: HTMLVideoElement | null) => void): void;
  /** Runs every frame while a reel is active. `dtMs` is the time since the previous frame. */
  onFrame(listener: (video: HTMLVideoElement, dtMs: number) => void): void;
}

export interface Runtime extends Ctx {
  start(): void;
  diagnostics(): Diagnostics;
}

export function createRuntime(version: string): Runtime {
  const videos = document.getElementsByTagName('video'); // live collection
  const unlooped = new WeakSet<HTMLVideoElement>(); // videos whose loop we turned off
  const rateFix = { since: 0, count: 0 };
  const stats = { ended: 0, advances: 0, skips: 0, scrollIntoViewFallbacks: 0, endOfFeedReplays: 0, loopForced: 0, rateFixes: 0, sourceSwaps: 0 };
  const lifetime = new AbortController();
  const handlers = new Map<string, (action: Action) => void>();
  const gates: Array<() => string | null> = [];
  const reelListeners: Array<(video: HTMLVideoElement | null) => void> = [];
  const frameListeners: Array<(video: HTMLVideoElement, dtMs: number) => void> = [];

  let settings = normalizeSettings(null);
  let active: HTMLVideoElement | null = null;
  let activeSource = '';
  let plays = 0; // how many times the active reel has played through
  let feed = false;
  let boosting = false;
  let frameNo = 0;
  let lastFrameAt = 0;

  const route = (): Route => routeOf(location.pathname);
  const t = (): Messages => messages(resolveLang(settings.lang, navigator.language));
  const dispatch = (action: Action): void => handlers.get(action.type)?.(action);

  const overlay = createOverlay({
    onSeek: (ratio) => {
      if (active && Number.isFinite(active.duration)) seekTo(ratio * active.duration);
    },
    onSpeedStep: (dir) => dispatch({ type: 'speed', dir }),
    onSpeedReset: () => dispatch({ type: 'resetSpeed' }),
    onToggleAuto: () => dispatch({ type: 'toggleAuto' }),
    onToggleLock: () => dispatch({ type: 'toggleLock' }),
    onToggleFullscreen: () => dispatch({ type: 'toggleFullscreen' }),
  });

  // ---- Settings -------------------------------------------------------------

  function renderState(): void {
    overlay.setState({
      speedLabel: formatSpeed(settings.speed),
      offSpeed: settings.speed !== 1,
      autoAdvance: settings.autoAdvance,
      feed,
      text: t(),
    });
  }

  function applySettings(next: unknown): void {
    settings = normalizeSettings(next);
    for (const v of videos) applySpeed(v);
    renderState();
  }

  function update(patch: Partial<Settings>): void {
    applySettings({ ...settings, ...patch });
    // After the extension is reloaded, the script left on an old page cannot write to storage;
    // the frame loop notices the dead context and shuts everything down.
    chrome.storage.local.set({ settings }).catch(() => {});
  }

  const onStorageChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string): void => {
    if (area === 'local' && changes.settings) applySettings(changes.settings.newValue);
  };

  // ---- Speed ----------------------------------------------------------------

  const targetRate = (): number => effectiveRate(settings.speed, boosting);

  function applySpeed(v: HTMLVideoElement): void {
    if (!route().enabled) return;
    // When a new source loads, playbackRate falls back to defaultPlaybackRate.
    if (v.defaultPlaybackRate !== settings.speed) v.defaultPlaybackRate = settings.speed;
    // 0 is the player's own pause while buffering; leave it alone.
    const rate = targetRate();
    if (v.playbackRate !== rate && v.playbackRate !== 0) v.playbackRate = rate;
  }

  function onRateChange(v: HTMLVideoElement): void {
    if (v.playbackRate === targetRate() || v.playbackRate === 0) return;
    // If Instagram undoes every correction, do not fight it forever.
    const now = performance.now();
    if (now - rateFix.since > 1000) {
      rateFix.since = now;
      rateFix.count = 0;
    }
    if (++rateFix.count > 8) return;
    stats.rateFixes += 1;
    applySpeed(v);
  }

  function setSpeed(speed: number): void {
    update({ speed });
    overlay.toast(formatSpeed(settings.speed));
  }

  function setBoost(on: boolean): void {
    if (on === boosting) return;
    boosting = on;
    for (const v of videos) applySpeed(v);
    overlay.badge(on ? `${formatSpeed(targetRate())} ▸▸` : null);
  }

  // ---- Seeking --------------------------------------------------------------

  function seekTo(time: number): void {
    if (active && Number.isFinite(active.duration)) active.currentTime = clampTime(time, active.duration);
  }

  function seekBy(dir: 1 | -1): void {
    if (!active || !Number.isFinite(active.duration)) return;
    seekTo(active.currentTime + dir * settings.seekStep);
    overlay.toast(t().seek(dir, settings.seekStep));
  }

  // ---- Active video ---------------------------------------------------------

  /**
   * Is the video covered by a foreign layer (login wall, share sheet, modal)?
   * The reel's own layers share an ancestor about the size of the video; a modal only meets it near the page root.
   */
  function isCovered(v: HTMLVideoElement, rect: DOMRect): boolean {
    const x = clamp(rect.left + rect.width / 2, 0, window.innerWidth - 1);
    const y = clamp(rect.top + rect.height / 2, 0, window.innerHeight - 1);
    let common = document.elementFromPoint(x, y);
    while (common && !common.contains(v)) common = common.parentElement;
    if (!common) return true;
    const c = common.getBoundingClientRect();
    return c.width > rect.width * 2 || c.height > rect.height * 2;
  }

  function centeredVideo(): HTMLVideoElement | null {
    const rects = Array.from(videos, (v) => v.getBoundingClientRect());
    const i = pickActive(rects, window.innerHeight);
    const v = videos[i];
    const rect = rects[i];
    return v && rect && !isCovered(v, rect) ? v : null;
  }

  /** A reel is identified by its element and its source: Instagram may reuse elements and swap the source. */
  function trackActive(v: HTMLVideoElement | null): void {
    const source = v?.currentSrc ?? '';
    const swapped = v === active && source !== activeSource && source !== '' && activeSource !== '';
    if (v === active && !swapped) {
      activeSource = source || activeSource;
      return;
    }
    if (swapped) stats.sourceSwaps += 1;
    active = v;
    activeSource = source;
    plays = 0;
    for (const listener of reelListeners) listener(v);
  }

  /** Auto-advance needs the video to fire `ended`; when it is off, give Instagram's setting back. */
  function syncLoop(v: HTMLVideoElement): void {
    const want = feed && settings.autoAdvance;
    if (want && v.loop) {
      v.loop = false;
      unlooped.add(v);
      stats.loopForced += 1;
    } else if (!want && unlooped.has(v)) {
      v.loop = true;
      unlooped.delete(v);
    }
  }

  // ---- Auto-advance ---------------------------------------------------------

  function replay(v: HTMLVideoElement): void {
    v.currentTime = 0;
    v.play().catch(() => {});
  }

  /** The video's scrollable ancestor and that ancestor's direct child containing the video (the slide). */
  function scrollContext(v: HTMLVideoElement): { scroller: HTMLElement; slide: Element } | null {
    for (let child: Element = v, el = v.parentElement; el; child = el, el = el.parentElement) {
      if (el.scrollHeight > el.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(el).overflowY)) {
        return { scroller: el, slide: child };
      }
    }
    return null;
  }

  /**
   * Scrolls the feed one reel past `v`. If the reel is still on screen after each try (`stuck`), falls back to
   * scrolling the neighbouring video into view, and finally hands over to `atEnd`.
   */
  function scrollOn(v: HTMLVideoElement, dir: 1 | -1, behavior: ScrollBehavior, stuck: () => boolean, atEnd: () => void): void {
    const ctx = scrollContext(v);
    if (ctx) {
      // scroll-snap settles on the next reel; this works even if the next video is not rendered yet.
      const step = ctx.slide.getBoundingClientRect().height || ctx.scroller.clientHeight;
      ctx.scroller.scrollBy({ top: dir * step, behavior });
    }
    setTimeout(() => {
      if (!stuck()) return;
      const list = Array.from(videos);
      const next = list[list.indexOf(v) + dir];
      if (next) {
        stats.scrollIntoViewFallbacks += 1;
        next.scrollIntoView({ behavior, block: 'center' });
      }
      setTimeout(() => stuck() && atEnd(), ADVANCE_CHECK_MS);
    }, ADVANCE_CHECK_MS);
  }

  function advance(v: HTMLVideoElement): void {
    stats.advances += 1;
    const behavior: ScrollBehavior = document.hidden ? 'instant' : 'smooth';
    const stuck = (): boolean => v.isConnected && v.ended && centeredVideo() === v;
    scrollOn(v, 1, behavior, stuck, () => {
      stats.endOfFeedReplays += 1;
      replay(v); // end of the feed: keep looping and try again on the next end
    });
  }

  function skip(v: HTMLVideoElement, dir: 1 | -1): void {
    stats.skips += 1;
    const stuck = (): boolean => v.isConnected && centeredVideo() === v;
    scrollOn(v, dir, 'instant', stuck, () => {}); // nothing past it: it stays hidden and paused
  }

  function onEnded(e: Event): void {
    const v = e.target as HTMLVideoElement;
    if (v !== active || !settings.autoAdvance || !route().feed) return;
    // Instagram restarts the video itself on `ended`; here the decision is ours.
    e.stopImmediatePropagation();
    stats.ended += 1;
    plays += 1;
    const holds = gates.map((reason) => reason()).filter((reason) => reason !== null);
    if (decideEnd(plays, settings.loops, holds) === 'replay') {
      replay(v);
      return;
    }
    plays = 0;
    advance(v);
  }

  function toggleAuto(): void {
    update({ autoAdvance: !settings.autoAdvance });
    overlay.toast(t().autoAdvanceState(settings.autoAdvance));
  }

  // ---- Frame loop -----------------------------------------------------------

  function shutdown(): void {
    lifetime.abort();
    overlay.destroy();
    try {
      chrome.storage.onChanged.removeListener(onStorageChanged);
    } catch {
      // The extension context is already gone; there is nothing left to detach from.
    }
  }

  function tick(): void {
    if (lifetime.signal.aborted) return;
    // The extension was reloaded or updated: this copy is orphaned and must stop touching the page.
    if (!chrome.runtime?.id) return shutdown();
    requestAnimationFrame(tick);

    const now = performance.now();
    const dt = Math.min(now - lastFrameAt, MAX_FRAME_MS);
    lastFrameAt = now;

    const r = route();
    if (!r.enabled) {
      trackActive(null);
      overlay.hide();
      return;
    }
    if (r.feed !== feed) {
      feed = r.feed;
      renderState();
    }
    if (frameNo++ % ACTIVE_CHECK_EVERY === 0 || (active && !active.isConnected)) trackActive(centeredVideo());
    if (!active) {
      overlay.hide();
      return;
    }
    syncLoop(active);
    for (const listener of frameListeners) listener(active, dt);
    overlay.frame(active.getBoundingClientRect(), active.currentTime, active.duration);
  }

  // ---- Wiring ---------------------------------------------------------------

  function start(): void {
    const onMedia = (type: string, handler: (e: Event) => void): void =>
      document.addEventListener(
        type,
        (e) => {
          if (e.target instanceof HTMLVideoElement) handler(e);
        },
        { capture: true, signal: lifetime.signal },
      );

    for (const type of ['play', 'loadedmetadata', 'emptied']) onMedia(type, (e) => applySpeed(e.target as HTMLVideoElement));
    // A new source in the active element is a new reel: the play counter starts over.
    for (const type of ['loadstart', 'emptied']) {
      onMedia(type, (e) => {
        if (e.target === active) plays = 0;
      });
    }
    onMedia('ratechange', (e) => onRateChange(e.target as HTMLVideoElement));
    onMedia('ended', onEnded);

    window.addEventListener(
      'keydown',
      (e) => {
        if (!settings.shortcuts || !active) return;
        if (isTypingTarget(e.composedPath()[0] as Element | undefined)) return;
        const action = keyAction(e, route());
        if (!action || !handlers.has(action.type)) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        dispatch(action);
      },
      { capture: true, signal: lifetime.signal },
    );

    handlers.set('seek', (a) => seekBy((a as Extract<Action, { type: 'seek' }>).dir));
    handlers.set('speed', (a) => setSpeed(stepSpeed(settings.speed, (a as Extract<Action, { type: 'speed' }>).dir)));
    handlers.set('resetSpeed', () => setSpeed(1));
    handlers.set('toggleAuto', toggleAuto);

    // Typing a comment must never be interrupted by the feed moving on.
    gates.push(() => (isTypingTarget(document.activeElement as HTMLElement | null) ? 'typing' : null));

    chrome.storage.local.get('settings').then((stored) => applySettings(stored.settings));
    chrome.storage.onChanged.addListener(onStorageChanged);
    lastFrameAt = performance.now();
    requestAnimationFrame(tick);
  }

  function diagnostics(): Diagnostics {
    const ctx = active ? scrollContext(active) : null;
    return {
      version,
      route: route(),
      settings,
      videos: Array.from(videos, (v) => ({
        active: v === active,
        loop: v.loop,
        loopAttr: v.hasAttribute('loop'),
        paused: v.paused,
        duration: Math.round(v.duration) || 0,
        rate: v.playbackRate,
        source: v.currentSrc.startsWith('blob:') ? 'blob' : v.currentSrc ? 'url' : 'none',
      })),
      scroller: ctx ? { snap: getComputedStyle(ctx.scroller).scrollSnapType, slides: ctx.scroller.children.length } : null,
      stats: { ...stats },
    };
  }

  return {
    overlay,
    signal: lifetime.signal,
    settings: () => settings,
    t,
    active: () => active,
    route,
    seekTo,
    setBoost,
    scroller: (v) => scrollContext(v)?.scroller ?? null,
    skip,
    handle: (type, handler) => void handlers.set(type, handler as (action: Action) => void),
    gate: (reason) => void gates.push(reason),
    onReel: (listener) => void reelListeners.push(listener),
    onFrame: (listener) => void frameListeners.push(listener),
    start,
    diagnostics,
  };
}
