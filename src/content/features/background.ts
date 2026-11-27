/**
 * Background play: Instagram pauses the reel when the tab is hidden and resumes it when the tab comes back,
 * both from `visibilitychange`. A capture listener on window runs before any listener on document, so
 * stopping the event there means Instagram never hears that the tab was hidden.
 */
import type { Ctx } from '../runtime.ts';

export function background(ctx: Ctx): void {
  window.addEventListener(
    'visibilitychange',
    (e) => {
      if (ctx.settings().backgroundPlay && ctx.route().enabled) e.stopImmediatePropagation();
    },
    { capture: true, signal: ctx.signal },
  );
}
