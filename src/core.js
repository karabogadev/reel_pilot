/**
 * Reel Pilot — pure logic.
 * Never touches the DOM; the content script, the popup and the Node tests all share this file.
 */
(function (root) {
  'use strict';

  const SPEED_MIN = 0.25;
  const SPEED_MAX = 4;
  const SPEED_STEP = 0.25;
  /** Keep seeks this far from the end so a seek never ends the reel and triggers an advance. */
  const END_GUARD = 0.25;

  const DEFAULTS = Object.freeze({
    autoAdvance: true,
    loops: 1,
    speed: 1,
    seekStep: 5,
    shortcuts: true,
  });

  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

  function int(value, lo, hi, fallback) {
    if (value == null) return fallback;
    const n = Math.round(Number(value));
    return Number.isFinite(n) ? clamp(n, lo, hi) : fallback;
  }

  function normalizeSpeed(value) {
    const n = Number(value);
    if (value == null || !Number.isFinite(n)) return DEFAULTS.speed;
    return clamp(Math.round(n / SPEED_STEP) * SPEED_STEP, SPEED_MIN, SPEED_MAX);
  }

  const stepSpeed = (speed, dir) => normalizeSpeed(speed + dir * SPEED_STEP);

  /** Turns whatever storage returns (empty, outdated, corrupt) into a valid settings object. */
  function normalizeSettings(raw) {
    const r = raw && typeof raw === 'object' ? raw : {};
    return {
      autoAdvance: typeof r.autoAdvance === 'boolean' ? r.autoAdvance : DEFAULTS.autoAdvance,
      loops: int(r.loops, 1, 5, DEFAULTS.loops),
      speed: normalizeSpeed(r.speed),
      seekStep: int(r.seekStep, 1, 30, DEFAULTS.seekStep),
      shortcuts: typeof r.shortcuts === 'boolean' ? r.shortcuts : DEFAULTS.shortcuts,
    };
  }

  function clampTime(t, duration) {
    if (!Number.isFinite(duration) || duration <= 0) return 0;
    return clamp(Number.isFinite(t) ? t : 0, 0, Math.max(0, duration - END_GUARD));
  }

  function formatTime(seconds) {
    const total = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = String(total % 60).padStart(2, '0');
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
  }

  const formatSpeed = (speed) => `${speed}x`;

  /**
   * Picks the active video: wide enough, on screen, and with its vertical centre
   * closest to the viewport centre. Returns -1 when there is none.
   * @param {{top:number,bottom:number,width:number}[]} rects
   */
  function pickActive(rects, viewportHeight, minWidth = 200) {
    const center = viewportHeight / 2;
    let best = -1;
    let bestDistance = Infinity;
    rects.forEach((r, i) => {
      if (r.width <= minWidth || r.bottom <= 0 || r.top >= viewportHeight) return;
      const distance = Math.abs((r.top + r.bottom) / 2 - center);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = i;
      }
    });
    return best;
  }

  /** enabled: does the extension run on this page. feed: is it the Reels feed (auto-advance + arrow keys). */
  function routeOf(pathname) {
    return {
      enabled: !/^\/stories(\/|$)/.test(pathname),
      feed: /^\/reels(\/|$)/.test(pathname),
    };
  }

  /** What to do once the reel has played through `playsDone` times. */
  const nextAction = (playsDone, loops) => (playsDone >= loops ? 'advance' : 'replay');

  const isTypingTarget = (el) =>
    !!el && (el.isContentEditable === true || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName || ''));

  /**
   * Maps a key press to an action. Uses `code`, so it is independent of the keyboard layout.
   * Leaves Instagram's own keys (L, M, N, /) alone.
   */
  function keyAction(ev, route) {
    if (!route.enabled || ev.ctrlKey || ev.metaKey || ev.altKey) return null;
    switch (ev.code) {
      case 'ArrowLeft':
        return route.feed ? { type: 'seek', dir: -1 } : null;
      case 'ArrowRight':
        return route.feed ? { type: 'seek', dir: 1 } : null;
      case 'KeyS':
        return { type: 'speed', dir: -1 };
      case 'KeyD':
        return { type: 'speed', dir: 1 };
      case 'KeyR':
        return { type: 'resetSpeed' };
      case 'KeyA':
        return route.feed && !ev.repeat ? { type: 'toggleAuto' } : null;
      default:
        return null;
    }
  }

  const api = {
    DEFAULTS,
    SPEED_MIN,
    SPEED_MAX,
    SPEED_STEP,
    clamp,
    normalizeSpeed,
    stepSpeed,
    normalizeSettings,
    clampTime,
    formatTime,
    formatSpeed,
    pickActive,
    routeOf,
    nextAction,
    isTypingTarget,
    keyAction,
  };

  root.ReelPilotCore = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(globalThis);
