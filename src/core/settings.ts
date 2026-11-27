import type { Settings } from '../shared/types.ts';

export const SPEED_MIN = 0.25;
export const SPEED_MAX = 4;
export const SPEED_STEP = 0.25;

export const DEFAULTS: Readonly<Settings> = Object.freeze({
  autoAdvance: true,
  loops: 1,
  speed: 1,
  seekStep: 5,
  shortcuts: true,
  stopAfterReels: 0,
  stopAfterMinutes: 0,
});

export const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

function int(value: unknown, lo: number, hi: number, fallback: number): number {
  if (value == null) return fallback;
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? clamp(n, lo, hi) : fallback;
}

export function normalizeSpeed(value: unknown): number {
  const n = Number(value);
  if (value == null || !Number.isFinite(n)) return DEFAULTS.speed;
  return clamp(Math.round(n / SPEED_STEP) * SPEED_STEP, SPEED_MIN, SPEED_MAX);
}

export const stepSpeed = (speed: number, dir: number): number => normalizeSpeed(speed + dir * SPEED_STEP);

/** Turns whatever storage returns (empty, outdated, corrupt) into a valid settings object. */
export function normalizeSettings(raw: unknown): Settings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    autoAdvance: typeof r.autoAdvance === 'boolean' ? r.autoAdvance : DEFAULTS.autoAdvance,
    loops: int(r.loops, 1, 5, DEFAULTS.loops),
    speed: normalizeSpeed(r.speed),
    seekStep: int(r.seekStep, 1, 30, DEFAULTS.seekStep),
    shortcuts: typeof r.shortcuts === 'boolean' ? r.shortcuts : DEFAULTS.shortcuts,
    stopAfterReels: int(r.stopAfterReels, 0, 500, DEFAULTS.stopAfterReels),
    stopAfterMinutes: int(r.stopAfterMinutes, 0, 600, DEFAULTS.stopAfterMinutes),
  };
}
