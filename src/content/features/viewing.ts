/**
 * Viewing tools for the active reel: hold-to-boost, frame stepping, frame copy,
 * A-B loop and the "stay on this reel" lock.
 */
import { formatTime, formatTimePrecise } from '../../core/format.ts';
import { frameTarget, loopSeek, withLoopEnd } from '../../core/playback.ts';
import type { AbLoop } from '../../shared/types.ts';
import type { Ctx } from '../runtime.ts';

export function viewing(ctx: Ctx): void {
  const { overlay, signal } = ctx;

  // ---- Hold F to boost ------------------------------------------------------

  const release = (): void => ctx.setBoost(false);
  ctx.handle('boost', () => ctx.setBoost(true));
  window.addEventListener('keyup', (e) => e.code === 'KeyF' && release(), { capture: true, signal });
  // A keyup can get lost when focus leaves the page; never stay boosted by accident.
  window.addEventListener('blur', release, { signal });
  document.addEventListener('visibilitychange', release, { signal });

  // ---- Frame by frame -------------------------------------------------------

  // The video we paused for stepping. Instagram tracks play state itself and still believes it is
  // playing, so its own click-to-toggle would do nothing: the next click on the video is ours to handle.
  let stepped: HTMLVideoElement | null = null;

  ctx.handle('frame', ({ dir }) => {
    const v = ctx.active();
    if (!v || !Number.isFinite(v.duration)) return;
    if (!v.paused) {
      v.pause();
      stepped = v;
    }
    v.currentTime = frameTarget(v.currentTime, dir, v.duration);
    overlay.toast(formatTimePrecise(v.currentTime));
  });

  for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
    document.addEventListener(
      type,
      (e) => {
        const v = stepped;
        if (!v || v !== ctx.active() || !(e instanceof MouseEvent)) return;
        const r = v.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
        if ((e.target as Element | null)?.id === 'reel-pilot') return; // our own controls
        e.preventDefault();
        e.stopImmediatePropagation();
        if (type === 'click') v.play().catch(() => {});
      },
      { capture: true, signal },
    );
  }
  document.addEventListener('play', (e) => e.target === stepped && (stepped = null), { capture: true, signal });

  ctx.handle('copyFrame', () => void copyFrame());

  async function copyFrame(): Promise<void> {
    const v = ctx.active();
    if (!v || !v.videoWidth) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = v.videoWidth;
      canvas.height = v.videoHeight;
      canvas.getContext('2d')?.drawImage(v, 0, 0);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('empty frame');
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        overlay.toast(ctx.t().frameCopied);
      } catch {
        // The clipboard needs a focused page and may be blocked by the site; a download always works.
        download(blob, `reel-${formatTime(v.currentTime).replace(':', '-')}.png`);
        overlay.toast(ctx.t().frameDownloaded);
      }
    } catch {
      overlay.toast(ctx.t().frameFailed);
    }
  }

  function download(blob: Blob, name: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  // ---- A-B loop -------------------------------------------------------------

  let loop: AbLoop | null = null;
  const setLoop = (next: AbLoop | null): void => {
    loop = next;
    overlay.setLoop(loop);
  };

  ctx.handle('loopA', () => {
    const v = ctx.active();
    if (!v) return;
    setLoop({ a: v.currentTime, b: null });
    overlay.toast(`A ${formatTime(v.currentTime)}`);
  });
  ctx.handle('loopB', () => {
    const v = ctx.active();
    if (!v) return;
    const next = withLoopEnd(loop, v.currentTime, v.duration);
    if (!next) return overlay.toast(ctx.t().loopEndBeforeStart);
    setLoop(next);
    overlay.toast(ctx.t().loopSet(formatTime(next.a), formatTime(next.b ?? 0)));
  });
  ctx.handle('loopClear', () => {
    if (!loop) return;
    setLoop(null);
    overlay.toast(ctx.t().loopOff);
  });
  ctx.onFrame((v) => {
    const to = loopSeek(v.currentTime, loop);
    if (to !== null) v.currentTime = to;
  });
  ctx.gate(() => (loop?.b != null ? 'loop' : null));

  // ---- Stay on this reel ----------------------------------------------------

  let locked = false;
  const setLock = (on: boolean): void => {
    locked = on;
    overlay.setLock(on);
  };
  ctx.handle('toggleLock', () => {
    setLock(!locked);
    overlay.toast(locked ? ctx.t().stayOnReel : ctx.t().unlocked);
  });
  ctx.gate(() => (locked ? 'lock' : null));

  // The loop and the lock belong to one reel.
  ctx.onReel(() => {
    setLoop(null);
    setLock(false);
    stepped = null;
  });
}
