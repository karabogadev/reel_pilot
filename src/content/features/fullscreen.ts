/**
 * Full screen for the whole page. Instagram only sees a bigger window, so its layout, scroll snapping and
 * playback (which pause a reel they think is off screen) keep working, and so do auto-advance and our UI.
 * Putting just the feed scroller in full screen lifts it out of the page and breaks all of that.
 */
import type { Ctx } from '../runtime.ts';

export function fullscreen(ctx: Ctx): void {
  ctx.handle('toggleFullscreen', () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
  });
  document.addEventListener('fullscreenchange', () => ctx.overlay.setFullscreen(document.fullscreenElement !== null), {
    signal: ctx.signal,
  });
}
