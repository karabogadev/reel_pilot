/**
 * Reel Pilot — in-page UI.
 * Stays out of Instagram's DOM tree: a single fixed host appended to <html>, with a Shadow DOM.
 * Every frame it is aligned to the active video's on-screen rectangle.
 */
(function (root) {
  'use strict';

  const C = root.ReelPilotCore;
  const HOT_MS = 2500;

  const CSS = `
    :host { all: initial; }
    .root {
      position: fixed; top: 0; left: 0; pointer-events: none; will-change: transform;
      font: 600 12px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #fff; -webkit-font-smoothing: antialiased; user-select: none;
    }
    .root[hidden] { display: none; }

    .pill {
      position: absolute; top: 10px; left: 10px; display: flex; align-items: center; gap: 2px;
      padding: 3px; border-radius: 999px; background: rgba(18, 18, 18, .66);
      -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
      opacity: 0; transform: translateY(-4px); pointer-events: none;
      transition: opacity .16s ease, transform .16s ease;
    }
    .root.offspeed .pill { opacity: .6; transform: none; }
    .root.hot .pill { opacity: 1; transform: none; pointer-events: auto; }

    button {
      all: unset; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center;
      min-width: 26px; height: 26px; padding: 0 6px; border-radius: 999px; cursor: pointer;
      font: inherit; color: inherit; font-variant-numeric: tabular-nums;
    }
    button:hover { background: rgba(255, 255, 255, .16); }
    button:active { background: rgba(255, 255, 255, .26); }
    .step { font-size: 15px; }
    .speed { min-width: 46px; }
    .sep { width: 1px; height: 14px; margin: 0 3px; background: rgba(255, 255, 255, .22); }
    .auto { gap: 4px; padding: 0 10px 0 7px; color: rgba(255, 255, 255, .6); }
    .auto[hidden], .sep[hidden] { display: none; }
    .auto[aria-pressed="true"] { background: #fff; color: #111; }
    .auto svg { width: 13px; height: 13px; fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }

    .bar { position: absolute; left: 0; right: 0; bottom: 0; height: 10px; pointer-events: auto; cursor: pointer; touch-action: none; }
    .track { position: absolute; left: 0; right: 0; bottom: 0; height: 3px; overflow: hidden; background: rgba(255, 255, 255, .28); transition: height .12s ease; }
    .bar:hover .track, .root.drag .track { height: 5px; }
    .fill { height: 100%; background: #fff; transform-origin: 0 50%; transform: scaleX(0); }
    .time {
      position: absolute; bottom: 14px; left: 0; padding: 5px 7px; border-radius: 6px; white-space: nowrap;
      background: rgba(18, 18, 18, .8); font-variant-numeric: tabular-nums;
      opacity: 0; pointer-events: none; transition: opacity .12s ease;
    }
    .bar:hover .time, .root.drag .time { opacity: 1; }

    .toast {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      padding: 10px 14px; border-radius: 10px; background: rgba(18, 18, 18, .74); font-size: 15px;
      white-space: nowrap; opacity: 0; pointer-events: none; transition: opacity .18s ease;
    }
    .toast.show { opacity: 1; }
  `;

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs || {})) {
      if (key === 'text') node.textContent = value;
      else node.setAttribute(key, value);
    }
    for (const child of children || []) node.append(child);
    return node;
  }

  function chevronsIcon() {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', 'M6 5l6 6 6-6M6 13l6 6 6-6');
    svg.append(path);
    return svg;
  }

  /**
   * @param {{onSeek:(ratio:number)=>void, onSpeedStep:(dir:number)=>void, onSpeedReset:()=>void, onToggleAuto:()=>void}} handlers
   */
  function create(handlers) {
    const host = el('div', { id: 'reel-pilot' });
    host.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;pointer-events:none;';
    const shadow = host.attachShadow({ mode: 'open' }); // open so automated QA can reach the controls
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(CSS);
    shadow.adoptedStyleSheets = [sheet];

    const slower = el('button', { class: 'step', tabindex: '-1', title: 'Yavaşlat (S)', 'aria-label': 'Yavaşlat', text: '−' });
    const speed = el('button', { class: 'speed', tabindex: '-1', title: "1x'e dön (R)", text: '1x' });
    const faster = el('button', { class: 'step', tabindex: '-1', title: 'Hızlandır (D)', 'aria-label': 'Hızlandır', text: '+' });
    const sep = el('span', { class: 'sep' });
    const auto = el('button', { class: 'auto', tabindex: '-1', title: 'Otomatik geçiş (A)', 'aria-pressed': 'false' }, [chevronsIcon(), 'Oto']);
    const pill = el('div', { class: 'pill' }, [slower, speed, faster, sep, auto]);
    const fill = el('div', { class: 'fill' });
    const time = el('div', { class: 'time' });
    const bar = el('div', { class: 'bar' }, [el('div', { class: 'track' }, [fill]), time]);
    const toastEl = el('div', { class: 'toast', role: 'status' });
    const rootEl = el('div', { class: 'root', hidden: '' }, [pill, toastEl, bar]);
    shadow.append(rootEl);
    document.documentElement.append(host);

    const last = { x: NaN, y: NaN, w: NaN, h: NaN, p: NaN, hot: false };
    const geom = { left: 0, width: 1, duration: 0 };
    const pointer = { x: -1, y: -1, at: -Infinity };
    let dragging = false;
    let pendingRatio = null;
    let toastTimer = 0;

    document.addEventListener(
      'pointermove',
      (e) => {
        pointer.x = e.clientX;
        pointer.y = e.clientY;
        pointer.at = performance.now();
      },
      { capture: true, passive: true },
    );

    // Interactions with our UI must not reach Instagram's document-level listeners.
    for (const type of ['click', 'dblclick', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'contextmenu']) {
      rootEl.addEventListener(type, (e) => e.stopPropagation());
    }
    // Buttons must not steal focus from the page, so keyboard shortcuts keep working.
    pill.addEventListener('mousedown', (e) => e.preventDefault());

    slower.addEventListener('click', () => handlers.onSpeedStep(-1));
    faster.addEventListener('click', () => handlers.onSpeedStep(1));
    speed.addEventListener('click', () => handlers.onSpeedReset());
    auto.addEventListener('click', () => handlers.onToggleAuto());

    const ratioOf = (e) => C.clamp((e.clientX - geom.left) / geom.width, 0, 1);

    function showTime(e) {
      const ratio = ratioOf(e);
      time.textContent = `${C.formatTime(ratio * geom.duration)} / ${C.formatTime(geom.duration)}`;
      const half = time.offsetWidth / 2;
      const x = C.clamp(ratio * geom.width, half + 6, Math.max(half + 6, geom.width - half - 6));
      time.style.transform = `translateX(${Math.round(x - half)}px)`;
    }

    bar.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      bar.setPointerCapture(e.pointerId);
      dragging = true;
      rootEl.classList.add('drag');
      showTime(e);
      handlers.onSeek(ratioOf(e));
    });
    bar.addEventListener('pointermove', (e) => {
      showTime(e);
      if (dragging) pendingRatio = ratioOf(e); // at most one seek per frame
    });
    const endDrag = () => {
      dragging = false;
      rootEl.classList.remove('drag');
    };
    bar.addEventListener('pointerup', endDrag);
    bar.addEventListener('pointercancel', endDrag);

    function hide() {
      if (!rootEl.hidden) rootEl.hidden = true;
      if (dragging) endDrag();
      pendingRatio = null;
    }

    /** Called every frame. Writes to the DOM only when a value changed. */
    function frame(rect, currentTime, duration) {
      if (rect.width <= 0 || rect.bottom <= 0 || rect.top >= window.innerHeight) return hide();
      if (rootEl.hidden) rootEl.hidden = false;

      const x = Math.round(rect.left);
      const y = Math.round(rect.top);
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      if (x !== last.x || y !== last.y) {
        rootEl.style.transform = `translate(${x}px, ${y}px)`;
        last.x = x;
        last.y = y;
      }
      if (w !== last.w || h !== last.h) {
        rootEl.style.width = `${w}px`;
        rootEl.style.height = `${h}px`;
        last.w = w;
        last.h = h;
      }
      geom.left = rect.left;
      geom.width = rect.width;
      geom.duration = Number.isFinite(duration) ? duration : 0;

      if (pendingRatio !== null) {
        handlers.onSeek(pendingRatio);
        pendingRatio = null;
      }

      const p = geom.duration > 0 ? C.clamp(currentTime / geom.duration, 0, 1) : 0;
      if (!(Math.abs(p - last.p) < 0.0005)) {
        fill.style.transform = `scaleX(${p.toFixed(4)})`;
        last.p = p;
      }

      const inside = pointer.x >= rect.left && pointer.x <= rect.right && pointer.y >= rect.top && pointer.y <= rect.bottom;
      const hot = dragging || (inside && (performance.now() - pointer.at < HOT_MS || pill.matches(':hover')));
      if (hot !== last.hot) {
        rootEl.classList.toggle('hot', hot);
        last.hot = hot;
      }
    }

    function setState(state) {
      speed.textContent = C.formatSpeed(state.speed);
      rootEl.classList.toggle('offspeed', state.speed !== 1);
      auto.setAttribute('aria-pressed', String(state.autoAdvance));
      auto.hidden = !state.feed;
      sep.hidden = !state.feed;
    }

    function toast(text) {
      toastEl.textContent = text;
      toastEl.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toastEl.classList.remove('show'), 900);
    }

    return { frame, hide, setState, toast };
  }

  root.ReelPilotOverlay = { create };
})(globalThis);
