/**
 * Break reminder: after N reels or M minutes of playback on the Reels feed,
 * pause and wait for the viewer to choose to continue.
 */
import { limitReached, type SessionProgress } from '../../core/playback.ts';
import type { Ctx } from '../runtime.ts';

export function session(ctx: Ctx): void {
  const progress: SessionProgress = { reels: 0, watchedMs: 0 };
  let onBreak = false;

  function resume(): void {
    onBreak = false;
    progress.reels = 1; // the reel on screen is the first of the new session
    progress.watchedMs = 0;
    ctx.overlay.banner(null);
    ctx.active()?.play().catch(() => {});
  }

  function check(): void {
    if (onBreak) return;
    const hit = limitReached(progress, ctx.settings());
    if (!hit) return;
    onBreak = true;
    ctx.active()?.pause();
    const { stopAfterReels, stopAfterMinutes } = ctx.settings();
    const t = ctx.t();
    ctx.overlay.banner({
      title: t.breakTitle,
      text: hit === 'reels' ? t.breakReels(stopAfterReels) : t.breakMinutes(stopAfterMinutes),
      action: t.breakContinue,
      onAction: resume,
    });
  }

  ctx.onReel((video) => {
    if (!video || !ctx.route().feed) return;
    progress.reels += 1;
    check();
  });

  ctx.onFrame((video, dtMs) => {
    if (!ctx.route().feed) return;
    if (onBreak) {
      // Instagram autoplays whatever scrolls into view; the break holds until "Devam et".
      if (!video.paused) video.pause();
      return;
    }
    if (!video.paused) {
      progress.watchedMs += dtMs;
      check();
    }
  });

  ctx.gate(() => (onBreak ? 'break' : null));
}
