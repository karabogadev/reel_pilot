/**
 * Full screen for the feed, not the video: auto-advance, ad skipping and the in-page controls keep working.
 * On a page without a feed scroller (a single post), the whole page goes full screen instead.
 */
import type { Ctx } from '../runtime.ts';

const isTransparent = (color: string): boolean => color === 'transparent' || /,\s*0\)$/.test(color);

export function fullscreen(ctx: Ctx): void {
  const { overlay, signal } = ctx;
  /** The feed scroller in full screen, with the inline styles it had before we touched them. */
  let styled: { el: HTMLElement; background: string; scrollPaddingTop: string } | null = null;

  ctx.handle('toggleFullscreen', () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      return;
    }
    const v = ctx.active();
    const target = (v && ctx.scroller(v)) ?? document.documentElement;
    target.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
  });

  function pageBackground(): string {
    for (const el of [document.body, document.documentElement]) {
      const color = getComputedStyle(el).backgroundColor;
      if (!isTransparent(color)) return color;
    }
    return '#000';
  }

  function restore(): void {
    if (!styled) return;
    styled.el.style.background = styled.background;
    styled.el.style.scrollPaddingTop = styled.scrollPaddingTop;
    styled = null;
  }

  function fit(el: HTMLElement): void {
    if (styled?.el !== el) {
      restore();
      styled = { el, background: el.style.background, scrollPaddingTop: el.style.scrollPaddingTop };
      // A transparent scroller shows the browser's black backdrop, and Instagram's dark text would vanish on it.
      if (isTransparent(getComputedStyle(el).backgroundColor)) el.style.background = pageBackground();
    }
    // Slides are sized for the page with its header, so they are shorter than the screen: centre the snapped one.
    let slide: Element | null = ctx.active();
    while (slide && slide.parentElement !== el) slide = slide.parentElement;
    const gap = slide ? el.clientHeight - slide.getBoundingClientRect().height : 0;
    el.style.scrollPaddingTop = gap > 0 ? `${Math.round(gap / 2)}px` : styled.scrollPaddingTop;
  }

  function sync(): void {
    const el = document.fullscreenElement;
    if (el instanceof HTMLElement && el !== document.documentElement) fit(el);
    else restore();
    overlay.mount(el ?? document.documentElement);
    overlay.setFullscreen(el !== null);
  }

  document.addEventListener('fullscreenchange', sync, { signal });
  window.addEventListener('resize', () => styled && document.fullscreenElement === styled.el && fit(styled.el), { signal });
}
