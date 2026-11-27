import type { AbLoop, Settings } from '../shared/types.ts';
import { clamp, SPEED_MAX } from './settings.ts';

/** Keep seeks this far from the end so a seek never ends the reel and triggers an advance. */
export const END_GUARD = 0.25;
/** Shortest A-B loop worth having, in seconds. */
export const MIN_LOOP = 0.2;
const FRAME_RATE = 30;

export function clampTime(t: number, duration: number): number {
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  return clamp(Number.isFinite(t) ? t : 0, 0, Math.max(0, duration - END_GUARD));
}

/**
 * What to do when the reel reaches its end after `playsDone` full plays.
 * Any hold (typing a comment, stay lock, A-B loop, break) keeps the reel on screen.
 */
export function decideEnd(playsDone: number, loops: number, holds: readonly string[]): 'replay' | 'advance' {
  return holds.length > 0 || playsDone < loops ? 'replay' : 'advance';
}

/** The rate to play at: double the chosen speed (at least 2x) while boost is held. */
export function effectiveRate(speed: number, boosting: boolean): number {
  return boosting ? Math.min(SPEED_MAX, Math.max(2, speed * 2)) : speed;
}

/** The time one frame before or after `t`. */
export function frameTarget(t: number, dir: 1 | -1, duration: number): number {
  return clampTime(t + dir / FRAME_RATE, duration);
}

/** Sets the loop end at `t`. Returns null when the loop would be empty or backwards. */
export function withLoopEnd(loop: AbLoop | null, t: number, duration: number): AbLoop | null {
  const a = loop?.a ?? 0;
  const b = clampTime(t, duration);
  return b >= a + MIN_LOOP ? { a, b } : null;
}

/** Where to jump when playback passes the loop end, or null to keep playing. */
export function loopSeek(t: number, loop: AbLoop | null): number | null {
  return loop && loop.b !== null && t >= loop.b ? loop.a : null;
}

export interface SessionProgress {
  /** Reels seen in this session, including the one on screen. */
  reels: number;
  watchedMs: number;
}

/** Which break limit has been hit, if any. A limit of 0 is off. */
export function limitReached(
  progress: SessionProgress,
  limits: Pick<Settings, 'stopAfterReels' | 'stopAfterMinutes'>,
): 'reels' | 'minutes' | null {
  if (limits.stopAfterReels > 0 && progress.reels > limits.stopAfterReels) return 'reels';
  if (limits.stopAfterMinutes > 0 && progress.watchedMs >= limits.stopAfterMinutes * 60_000) return 'minutes';
  return null;
}
