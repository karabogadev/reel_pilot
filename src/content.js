/**
 * Reel Pilot — content script.
 *
 * Does not depend on Instagram's class names or selectors. It has four inputs:
 *   1. media events in the capture phase (they do not bubble, but can be captured on document)
 *   2. a single requestAnimationFrame loop (active video + UI position)
 *   3. chrome.storage.local (single source of truth; the popup writes there too)
 *   4. the keyboard and the UI's own pointer events
 */
(() => {
  'use strict';

  if (globalThis.__reelPilotLoaded) return;
  globalThis.__reelPilotLoaded = true;

  const C = globalThis.ReelPilotCore;
  const ACTIVE_CHECK_EVERY = 15; // frames; ~4 Hz
  const ADVANCE_CHECK_MS = 600;

  const videos = document.getElementsByTagName('video'); // live collection
  const unlooped = new WeakSet(); // videos whose loop we turned off
  const rateFix = { since: 0, count: 0 };

  let settings = C.normalizeSettings(null);
  let active = null;
  let plays = 0; // how many times the active reel has played through
  let feed = false;
  let frameNo = 0;

  const route = () => C.routeOf(location.pathname);

  const overlay = globalThis.ReelPilotOverlay.create({
    onSeek: (ratio) => {
      if (active && Number.isFinite(active.duration)) seekTo(ratio * active.duration);
    },
    onSpeedStep: (dir) => setSpeed(C.stepSpeed(settings.speed, dir)),
    onSpeedReset: () => setSpeed(1),
    onToggleAuto: () => toggleAuto(),
  });

  // ---- Settings -------------------------------------------------------------

  function applySettings(next) {
    settings = C.normalizeSettings(next);
    for (const v of videos) applySpeed(v);
    overlay.setState({ speed: settings.speed, autoAdvance: settings.autoAdvance, feed });
  }

  function update(patch) {
    applySettings({ ...settings, ...patch });
    try {
      chrome.storage.local.set({ settings });
    } catch {
      // After the extension is reloaded, the script left on an old page cannot write to storage; the setting still applies on this page.
    }
  }

  chrome.storage.local.get('settings').then((stored) => applySettings(stored.settings));
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.settings) applySettings(changes.settings.newValue);
  });

  // ---- Speed -----------------------------------------------------------------

  function applySpeed(v) {
    if (!route().enabled) return;
    const s = settings.speed;
    // When a new source loads, playbackRate falls back to defaultPlaybackRate.
    if (v.defaultPlaybackRate !== s) v.defaultPlaybackRate = s;
    // 0 is the player's own pause while buffering; leave it alone.
    if (v.playbackRate !== s && v.playbackRate !== 0) v.playbackRate = s;
  }

  function onRateChange(v) {
    if (v.playbackRate === settings.speed || v.playbackRate === 0) return;
    // If Instagram undoes every correction, do not fight it forever.
    const now = performance.now();
    if (now - rateFix.since > 1000) {
      rateFix.since = now;
      rateFix.count = 0;
    }
    if (++rateFix.count <= 8) applySpeed(v);
  }

  function setSpeed(speed) {
    update({ speed });
    overlay.toast(C.formatSpeed(settings.speed));
  }

  // ---- Seeking ---------------------------------------------------------------

  function seekTo(time) {
    if (active && Number.isFinite(active.duration)) active.currentTime = C.clampTime(time, active.duration);
  }

  function seekBy(dir) {
    if (!active || !Number.isFinite(active.duration)) return;
    seekTo(active.currentTime + dir * settings.seekStep);
    overlay.toast(`${dir > 0 ? '+' : '−'}${settings.seekStep} sn`);
  }

  // ---- Active video ---------------------------------------------------------

  /**
   * Is the video covered by a foreign layer (login wall, share sheet, modal)?
   * The reel's own layers share an ancestor about the size of the video; a modal only meets it near the page root.
   */
  function isCovered(v, rect) {
    const x = C.clamp(rect.left + rect.width / 2, 0, window.innerWidth - 1);
    const y = C.clamp(rect.top + rect.height / 2, 0, window.innerHeight - 1);
    let common = document.elementFromPoint(x, y);
    while (common && !common.contains(v)) common = common.parentElement;
    if (!common) return true;
    const c = common.getBoundingClientRect();
    return c.width > rect.width * 2 || c.height > rect.height * 2;
  }

  function centeredVideo() {
    const rects = Array.from(videos, (v) => v.getBoundingClientRect());
    const i = C.pickActive(rects, window.innerHeight);
    return i >= 0 && !isCovered(videos[i], rects[i]) ? videos[i] : null;
  }

  function setActive(v) {
    if (v === active) return;
    active = v;
    plays = 0;
  }

  /** Auto-advance needs the video to fire `ended`; when it is off, give Instagram's setting back. */
  function syncLoop(v) {
    const want = feed && settings.autoAdvance;
    if (want && v.loop) {
      v.loop = false;
      unlooped.add(v);
    } else if (!want && unlooped.has(v)) {
      v.loop = true;
      unlooped.delete(v);
    }
  }

  // ---- Auto-advance ------------------------------------------------------

  function replay(v) {
    v.currentTime = 0;
    v.play().catch(() => {});
  }

  /** The video's scrollable ancestor and that ancestor's direct child containing the video (the slide). */
  function scrollContext(v) {
    for (let child = v, el = v.parentElement; el; child = el, el = el.parentElement) {
      if (el.scrollHeight > el.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(el).overflowY)) {
        return { scroller: el, slide: child };
      }
    }
    return null;
  }

  function nextVideo(v) {
    const list = Array.from(videos);
    return list[list.indexOf(v) + 1] || null;
  }

  function advance(v) {
    const behavior = document.hidden ? 'instant' : 'smooth';
    const stuck = () => v.isConnected && v.ended && centeredVideo() === v;

    const ctx = scrollContext(v);
    if (ctx) {
      // scroll-snap settles on the next reel; this works even if the next video is not rendered yet.
      const step = ctx.slide.getBoundingClientRect().height || ctx.scroller.clientHeight;
      ctx.scroller.scrollBy({ top: step, behavior });
    }
    setTimeout(() => {
      if (!stuck()) return;
      nextVideo(v)?.scrollIntoView({ behavior, block: 'center' });
      setTimeout(() => {
        if (stuck()) replay(v); // end of the feed: keep looping and try again on the next end
      }, ADVANCE_CHECK_MS);
    }, ADVANCE_CHECK_MS);
  }

  function onEnded(e) {
    const v = e.target;
    if (v !== active || !settings.autoAdvance || !route().feed) return;
    // Instagram restarts the video itself on `ended`; here the decision is ours.
    e.stopImmediatePropagation();
    plays += 1;
    if (C.nextAction(plays, settings.loops) === 'replay') {
      replay(v);
      return;
    }
    plays = 0;
    advance(v);
  }

  function toggleAuto() {
    update({ autoAdvance: !settings.autoAdvance });
    overlay.toast(`Otomatik geçiş ${settings.autoAdvance ? 'açık' : 'kapalı'}`);
  }

  // ---- Media events ----------------------------------------------------

  const onMedia = (type, handler) =>
    document.addEventListener(
      type,
      (e) => {
        if (e.target instanceof HTMLVideoElement) handler(e);
      },
      true,
    );

  for (const type of ['play', 'loadedmetadata', 'emptied']) onMedia(type, (e) => applySpeed(e.target));
  // Instagram may reuse <video> elements and swap their source: the counter belongs to the reel, not the element.
  for (const type of ['loadstart', 'emptied']) {
    onMedia(type, (e) => {
      if (e.target === active) plays = 0;
    });
  }
  onMedia('ratechange', (e) => onRateChange(e.target));
  onMedia('ended', onEnded);

  // ---- Keyboard --------------------------------------------------------------

  window.addEventListener(
    'keydown',
    (e) => {
      if (!settings.shortcuts || !active) return;
      if (C.isTypingTarget(e.composedPath()[0])) return;
      const action = C.keyAction(e, route());
      if (!action) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (action.type === 'seek') seekBy(action.dir);
      else if (action.type === 'speed') setSpeed(C.stepSpeed(settings.speed, action.dir));
      else if (action.type === 'resetSpeed') setSpeed(1);
      else if (action.type === 'toggleAuto') toggleAuto();
    },
    true,
  );

  // ---- Frame loop --------------------------------------------------------

  function tick() {
    requestAnimationFrame(tick);
    const r = route();
    if (!r.enabled) {
      setActive(null);
      overlay.hide();
      return;
    }
    if (r.feed !== feed) {
      feed = r.feed;
      overlay.setState({ speed: settings.speed, autoAdvance: settings.autoAdvance, feed });
    }
    if (frameNo++ % ACTIVE_CHECK_EVERY === 0) setActive(centeredVideo());
    if (!active || !active.isConnected) {
      setActive(null);
      overlay.hide();
      return;
    }
    syncLoop(active);
    overlay.frame(active.getBoundingClientRect(), active.currentTime, active.duration);
  }

  requestAnimationFrame(tick);
})();
