/**
 * In-page UI.
 * Stays out of Instagram's DOM tree: a single fixed host appended to <html>, with a Shadow DOM.
 * Every frame it is aligned to the active video's on-screen rectangle.
 */
import { formatTime } from '../core/format.ts';
import type { Messages } from '../core/i18n.ts';
import { clamp } from '../core/settings.ts';
import type { AbLoop } from '../shared/types.ts';

const HOT_MS = 2500;

const CSS = `
  :host { all: initial; }
  .root {
    position: fixed; top: 0; left: 0; pointer-events: none; will-change: transform;
    font: 600 12px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #fff; -webkit-font-smoothing: antialiased; user-select: none;
  }
  .root[hidden], [hidden] { display: none !important; }

  .pill {
    position: absolute; top: 10px; left: 10px; display: flex; align-items: center; gap: 2px;
    padding: 3px; border-radius: 999px; background: rgba(18, 18, 18, .66);
    -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
    opacity: 0; transform: translateY(-4px); pointer-events: none;
    transition: opacity .16s ease, transform .16s ease;
  }
  .root.offspeed .pill, .root.locked .pill { opacity: .6; transform: none; }
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
  .toggle { gap: 4px; color: rgba(255, 255, 255, .6); }
  .toggle[aria-pressed="true"] { background: #fff; color: #111; }
  .auto { padding: 0 10px 0 7px; }
  svg { width: 13px; height: 13px; fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }

  .bar { position: absolute; left: 0; right: 0; bottom: 0; height: 10px; pointer-events: auto; cursor: pointer; touch-action: none; }
  .track { position: absolute; left: 0; right: 0; bottom: 0; height: 3px; overflow: hidden; background: rgba(255, 255, 255, .28); transition: height .12s ease; }
  .bar:hover .track, .root.drag .track { height: 5px; }
  .fill { height: 100%; background: #fff; transform-origin: 0 50%; transform: scaleX(0); }
  .range { position: absolute; top: 0; bottom: 0; background: rgba(255, 196, 0, .55); }
  .mark { position: absolute; bottom: 0; width: 2px; height: 9px; margin-left: -1px; background: #ffc400; border-radius: 1px; }
  .time {
    position: absolute; bottom: 14px; left: 0; padding: 5px 7px; border-radius: 6px; white-space: nowrap;
    background: rgba(18, 18, 18, .8); font-variant-numeric: tabular-nums;
    opacity: 0; pointer-events: none; transition: opacity .12s ease;
  }
  .bar:hover .time, .root.drag .time { opacity: 1; }

  .toast, .badge {
    position: absolute; left: 50%; transform: translate(-50%, -50%);
    border-radius: 10px; background: rgba(18, 18, 18, .74); white-space: nowrap; pointer-events: none;
  }
  .toast { top: 50%; padding: 10px 14px; font-size: 15px; opacity: 0; transition: opacity .18s ease; }
  .toast.show { opacity: 1; }
  .badge { top: 28px; padding: 7px 11px; font-size: 13px; }

  .banner {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: min(80%, 260px);
    display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 18px 16px;
    border-radius: 14px; background: rgba(18, 18, 18, .86); text-align: center; pointer-events: auto;
    -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px);
  }
  .banner strong { font-size: 15px; }
  .banner span { font-size: 13px; font-weight: 500; line-height: 1.35; color: rgba(255, 255, 255, .78); }
  .banner button { height: 32px; padding: 0 16px; background: #fff; color: #111; font-size: 13px; }
  .banner button:hover { background: #e9e9e9; }
`;

const ICON_CHEVRONS = 'M6 5l6 6 6-6M6 13l6 6 6-6';
const ICON_LOCK = 'M7 11V8a5 5 0 0110 0v3M6 11h12v9H6z';
const ICON_EXPAND = 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5';
const ICON_COLLAPSE = 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5';

type Child = Node | string;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  children: Child[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'text') node.textContent = value;
    else node.setAttribute(key, value);
  }
  node.append(...children);
  return node;
}

function icon(d: string): SVGSVGElement {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', d);
  svg.append(path);
  return svg;
}

export interface OverlayHandlers {
  onSeek(ratio: number): void;
  onSpeedStep(dir: 1 | -1): void;
  onSpeedReset(): void;
  onToggleAuto(): void;
  onToggleLock(): void;
  onToggleFullscreen(): void;
}

export interface OverlayState {
  speedLabel: string;
  offSpeed: boolean;
  autoAdvance: boolean;
  feed: boolean;
  text: Messages;
}

export interface Banner {
  title: string;
  text: string;
  action: string;
  onAction(): void;
}

export interface Overlay {
  /** Called every frame. Writes to the DOM only when a value changed. */
  frame(rect: DOMRect, currentTime: number, duration: number): void;
  hide(): void;
  setState(state: OverlayState): void;
  setLock(on: boolean): void;
  setFullscreen(on: boolean): void;
  setLoop(loop: AbLoop | null): void;
  toast(text: string): void;
  /** A sticky chip at the top of the video, shown until cleared with null. */
  badge(text: string | null): void;
  /** A centred card with one button, shown until cleared with null. */
  banner(banner: Banner | null): void;
  destroy(): void;
}

export function createOverlay(handlers: OverlayHandlers): Overlay {
  const host = el('div', { id: 'reel-pilot' });
  host.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;pointer-events:none;';
  const shadow = host.attachShadow({ mode: 'open' }); // open so automated QA can reach the controls
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(CSS);
  shadow.adoptedStyleSheets = [sheet];

  // Labels and titles are filled in by setState, in the language picked in the popup.
  const slower = el('button', { class: 'step', tabindex: '-1', text: '−' });
  const speed = el('button', { class: 'speed', tabindex: '-1', text: '1x' });
  const faster = el('button', { class: 'step', tabindex: '-1', text: '+' });
  const sep = el('span', { class: 'sep' });
  const autoLabel = document.createTextNode('');
  const auto = el('button', { class: 'toggle auto', tabindex: '-1', 'aria-pressed': 'false' }, [icon(ICON_CHEVRONS), autoLabel]);
  const lock = el('button', { class: 'toggle lock', tabindex: '-1', 'aria-pressed': 'false' }, [icon(ICON_LOCK)]);
  const fullIcon = icon(ICON_EXPAND);
  const full = el('button', { class: 'toggle full', tabindex: '-1', 'aria-pressed': 'false' }, [fullIcon]);
  const pill = el('div', { class: 'pill' }, [slower, speed, faster, sep, auto, lock, full]);

  const fill = el('div', { class: 'fill' });
  const range = el('div', { class: 'range', hidden: '' });
  const markA = el('div', { class: 'mark', hidden: '' });
  const markB = el('div', { class: 'mark', hidden: '' });
  const time = el('div', { class: 'time' });
  const bar = el('div', { class: 'bar' }, [el('div', { class: 'track' }, [range, fill]), markA, markB, time]);

  const toastEl = el('div', { class: 'toast', role: 'status' });
  const badgeEl = el('div', { class: 'badge', hidden: '' });
  const bannerTitle = el('strong');
  const bannerText = el('span');
  const bannerButton = el('button', { tabindex: '-1' });
  const bannerEl = el('div', { class: 'banner', hidden: '' }, [bannerTitle, bannerText, bannerButton]);

  const rootEl = el('div', { class: 'root', hidden: '' }, [pill, badgeEl, toastEl, bannerEl, bar]);
  shadow.append(rootEl);
  document.documentElement.append(host);

  const listeners = new AbortController();
  const last = { x: NaN, y: NaN, w: NaN, h: NaN, p: NaN, hot: false, marks: '' };
  const geom = { left: 0, width: 1, duration: 0 };
  const pointer = { x: -1, y: -1, at: -Infinity };
  let dragging = false;
  let pendingRatio: number | null = null;
  let toastTimer = 0;
  let loop: AbLoop | null = null;
  let onBannerAction: (() => void) | null = null;

  document.addEventListener(
    'pointermove',
    (e) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.at = performance.now();
    },
    { capture: true, passive: true, signal: listeners.signal },
  );

  // Interactions with our UI must not reach Instagram's document-level listeners.
  for (const type of ['click', 'dblclick', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'contextmenu']) {
    rootEl.addEventListener(type, (e) => e.stopPropagation());
  }
  // Buttons must not steal focus from the page, so keyboard shortcuts keep working.
  for (const group of [pill, bannerEl]) group.addEventListener('mousedown', (e) => e.preventDefault());

  slower.addEventListener('click', () => handlers.onSpeedStep(-1));
  faster.addEventListener('click', () => handlers.onSpeedStep(1));
  speed.addEventListener('click', () => handlers.onSpeedReset());
  auto.addEventListener('click', () => handlers.onToggleAuto());
  lock.addEventListener('click', () => handlers.onToggleLock());
  full.addEventListener('click', () => handlers.onToggleFullscreen());
  bannerButton.addEventListener('click', () => onBannerAction?.());

  const ratioOf = (e: PointerEvent): number => clamp((e.clientX - geom.left) / geom.width, 0, 1);

  function showTime(e: PointerEvent): void {
    const ratio = ratioOf(e);
    time.textContent = `${formatTime(ratio * geom.duration)} / ${formatTime(geom.duration)}`;
    const half = time.offsetWidth / 2;
    const x = clamp(ratio * geom.width, half + 6, Math.max(half + 6, geom.width - half - 6));
    time.style.transform = `translateX(${Math.round(x - half)}px)`;
  }

  const endDrag = (): void => {
    dragging = false;
    rootEl.classList.remove('drag');
  };

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
  bar.addEventListener('pointerup', endDrag);
  bar.addEventListener('pointercancel', endDrag);

  /** Positions the A-B markers as percentages, so they only change with the loop or the duration. */
  function renderMarks(): void {
    const key = loop && geom.duration > 0 ? `${loop.a}|${loop.b}|${geom.duration}` : '';
    if (key === last.marks) return;
    last.marks = key;
    const percent = (t: number): string => `${clamp((t / geom.duration) * 100, 0, 100)}%`;
    markA.hidden = !key;
    markB.hidden = !key || loop?.b == null;
    range.hidden = markB.hidden;
    if (!key || !loop) return;
    markA.style.left = percent(loop.a);
    if (loop.b === null) return;
    markB.style.left = percent(loop.b);
    range.style.left = percent(loop.a);
    range.style.width = percent(loop.b - loop.a);
  }

  function hide(): void {
    if (!rootEl.hidden) rootEl.hidden = true;
    if (dragging) endDrag();
    pendingRatio = null;
  }

  function frame(rect: DOMRect, currentTime: number, duration: number): void {
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

    const p = geom.duration > 0 ? clamp(currentTime / geom.duration, 0, 1) : 0;
    if (!(Math.abs(p - last.p) < 0.0005)) {
      fill.style.transform = `scaleX(${p.toFixed(4)})`;
      last.p = p;
    }
    renderMarks();

    const inside = pointer.x >= rect.left && pointer.x <= rect.right && pointer.y >= rect.top && pointer.y <= rect.bottom;
    const hot = dragging || (inside && (performance.now() - pointer.at < HOT_MS || pill.matches(':hover')));
    if (hot !== last.hot) {
      rootEl.classList.toggle('hot', hot);
      last.hot = hot;
    }
  }

  let feed = false;
  let fullscreen = false;
  let text: Messages | null = null;

  const label = (button: HTMLElement, name: string, key: string): void => {
    button.title = `${name} (${key})`;
    button.setAttribute('aria-label', name);
  };
  const labelFull = (): void => {
    if (text) label(full, fullscreen ? text.exitFullscreen : text.fullscreen, 'T');
  };

  function setText(next: Messages): void {
    if (next === text) return;
    text = next;
    label(slower, next.slower, 'S');
    label(faster, next.faster, 'D');
    speed.title = `${next.resetSpeed} (R)`;
    auto.title = `${next.autoAdvance} (A)`;
    autoLabel.data = next.autoShort;
    label(lock, next.stayOnReel, 'K');
    labelFull();
  }

  return {
    frame,
    hide,
    setState(state) {
      setText(state.text);
      feed = state.feed;
      speed.textContent = state.speedLabel;
      rootEl.classList.toggle('offspeed', state.offSpeed);
      auto.setAttribute('aria-pressed', String(state.autoAdvance));
      auto.hidden = !feed;
      lock.hidden = !feed;
    },
    setLock(on) {
      lock.setAttribute('aria-pressed', String(on));
      rootEl.classList.toggle('locked', on);
    },
    setFullscreen(on) {
      fullscreen = on;
      full.setAttribute('aria-pressed', String(on));
      fullIcon.firstElementChild?.setAttribute('d', on ? ICON_COLLAPSE : ICON_EXPAND);
      labelFull();
    },
    setLoop(next) {
      loop = next;
      renderMarks();
    },
    toast(text) {
      toastEl.textContent = text;
      toastEl.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), 900);
    },
    badge(text) {
      badgeEl.hidden = text === null;
      if (text !== null) badgeEl.textContent = text;
    },
    banner(next) {
      bannerEl.hidden = next === null;
      onBannerAction = next?.onAction ?? null;
      if (!next) return;
      bannerTitle.textContent = next.title;
      bannerText.textContent = next.text;
      bannerButton.textContent = next.action;
    },
    destroy() {
      listeners.abort();
      clearTimeout(toastTimer);
      host.remove();
    },
  };
}
