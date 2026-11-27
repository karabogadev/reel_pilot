/**
 * Ad skipping on the Reels feed. Ads are hidden and muted as soon as they show up in the DOM (usually while
 * they are still the next reel down), and the feed jumps past one the moment it becomes the active reel.
 */
import { isAdMarker, matchAds, type Box } from '../../core/ads.ts';
import type { Ctx } from '../runtime.ts';

const SCAN_MS = 250;
/** What Instagram renders an ad's call-to-action as. */
const CLICKABLE = 'a, button, [role="button"], [role="link"]';

/** What we changed on an ad, so it can be undone if Instagram reuses the element for a normal reel. */
interface Hidden {
  box: HTMLElement;
  muted: boolean;
}

export function ads(ctx: Ctx): void {
  const videos = document.getElementsByTagName('video');
  const hidden = new Map<HTMLVideoElement, Hidden>();
  let sinceScan = SCAN_MS;
  let previous: HTMLVideoElement | null = null;
  let direction: 1 | -1 = 1;
  let skipping: HTMLVideoElement | null = null;

  /** Elements whose own text is an ad label or an ad call-to-action. */
  function markers(): Element[] {
    const found: Element[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.nodeValue ?? '';
      if (text.length > 24 || !text.trim()) continue;
      const el = node.parentElement;
      if (el && isAdMarker(text, !!el.closest(CLICKABLE))) found.push(el);
    }
    return found;
  }

  /**
   * The reel that `marker` belongs to: the closest common ancestor of the video and the marker, if it is reel-sized
   * and holds no other video. Anything bigger means the marker only happens to line up with the video, like a
   * "Sponsored" label on the home feed behind a reel opened on top of it, and it is not this reel's ad.
   */
  function reelBox(video: HTMLVideoElement, marker: Element, rect: DOMRect): HTMLElement | null {
    let box: HTMLElement | null = video.parentElement;
    while (box && !box.contains(marker)) box = box.parentElement;
    if (!box || box.getElementsByTagName('video').length !== 1) return null;
    return box.getBoundingClientRect().height <= rect.height * 1.6 ? box : null;
  }

  /**
   * Can the viewer see `marker` right now? Some layouts keep the info column (with "Shop Now") outside the reel's
   * own box, so ownership cannot be proven from the DOM. A marker that is on screen and not covered by anything
   * is next to the reel the viewer is looking at; one under a reel opened on top of the home feed is covered.
   */
  function onTop(marker: Element, box: Box): boolean {
    const x = (box.left + box.right) / 2;
    const y = (box.top + box.bottom) / 2;
    if (x < 0 || y < 0 || x >= window.innerWidth || y >= window.innerHeight) return false;
    const hit = document.elementFromPoint(x, y);
    return !!hit && (marker.closest(CLICKABLE) ?? marker).contains(hit);
  }

  function hide(video: HTMLVideoElement, box: HTMLElement): void {
    if (!hidden.has(video)) {
      hidden.set(video, { box, muted: video.muted });
      // Opacity keeps the element hit-testable, so the runtime still sees it as the reel on screen.
      box.style.setProperty('opacity', '0', 'important');
    }
    video.muted = true;
    if (!video.paused) video.pause();
  }

  function restore(video: HTMLVideoElement): void {
    const was = hidden.get(video);
    if (!was) return;
    hidden.delete(video);
    was.box.style.removeProperty('opacity');
    video.muted = was.muted;
  }

  function scan(): void {
    const list = Array.from(videos);
    const rects = list.map((v) => v.getBoundingClientRect());
    const found = markers();
    const boxes: Box[] = found.map((m) => m.getBoundingClientRect());
    const owner = (vi: number, mi: number): HTMLElement | null => {
      const video = list[vi];
      const marker = found[mi];
      const rect = rects[vi];
      const markerBox = boxes[mi];
      if (!video || !marker || !rect || !markerBox) return null;
      // Without a reel box of its own, hide only the video: never a container that might be the whole page.
      return reelBox(video, marker, rect) ?? (onTop(marker, markerBox) ? video : null);
    };
    const matches = matchAds(rects, boxes, (vi, mi) => owner(vi, mi) !== null);
    list.forEach((video, i) => {
      const box = owner(i, matches[i] ?? -1);
      if (box) hide(video, box);
      else restore(video);
    });
    for (const video of hidden.keys()) if (!video.isConnected) hidden.delete(video);
  }

  ctx.onReel((video) => {
    // Skip in the direction the viewer is moving, so scrolling up past an ad doesn't bounce back down.
    const list = Array.from(videos);
    if (video && previous && previous.isConnected) direction = list.indexOf(video) < list.indexOf(previous) ? -1 : 1;
    previous = video;
    skipping = null;
    sinceScan = SCAN_MS; // check the new reel straight away
  });

  ctx.onFrame((video, dtMs) => {
    if (!ctx.settings().skipAds || !ctx.route().feed) {
      for (const v of [...hidden.keys()]) restore(v);
      return;
    }
    sinceScan += dtMs;
    if (sinceScan < SCAN_MS) return;
    sinceScan = 0;
    scan();
    if (hidden.has(video) && skipping !== video) {
      skipping = video;
      ctx.overlay.toast(ctx.t().adSkipped);
      ctx.skip(video, direction);
    }
  });
}
