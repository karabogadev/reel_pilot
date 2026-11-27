import type { Route } from '../shared/types.ts';

export type Action =
  | { type: 'seek'; dir: 1 | -1 }
  | { type: 'speed'; dir: 1 | -1 }
  | { type: 'resetSpeed' }
  | { type: 'toggleAuto' }
  | { type: 'boost' }
  | { type: 'frame'; dir: 1 | -1 }
  | { type: 'copyFrame' }
  | { type: 'loopA' }
  | { type: 'loopB' }
  | { type: 'loopClear' }
  | { type: 'toggleLock' };

export interface KeyLike {
  code: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  repeat?: boolean;
}

export interface TargetLike {
  tagName?: string;
  isContentEditable?: boolean;
}

export const isTypingTarget = (el: TargetLike | null | undefined): boolean =>
  !!el && (el.isContentEditable === true || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName ?? ''));

/**
 * Maps a key press to an action. Uses `code`, so it is independent of the keyboard layout.
 * Leaves Instagram's own keys (L, M, N, /) alone. One-shot actions ignore key repeat.
 */
export function keyAction(ev: KeyLike, route: Route): Action | null {
  if (!route.enabled || ev.ctrlKey || ev.metaKey || ev.altKey) return null;
  const once = <T extends Action>(action: T): T | null => (ev.repeat ? null : action);
  switch (ev.code) {
    case 'ArrowLeft':
      return route.feed ? { type: 'seek', dir: -1 } : null;
    case 'ArrowRight':
      return route.feed ? { type: 'seek', dir: 1 } : null;
    case 'KeyS':
      return { type: 'speed', dir: -1 };
    case 'KeyD':
      return { type: 'speed', dir: 1 };
    case 'KeyR':
      return { type: 'resetSpeed' };
    case 'KeyA':
      return route.feed ? once({ type: 'toggleAuto' }) : null;
    case 'KeyF':
      return { type: 'boost' }; // held: repeats keep it on, keyup releases it
    case 'Comma':
      return { type: 'frame', dir: -1 };
    case 'Period':
      return { type: 'frame', dir: 1 };
    case 'KeyC':
      return once({ type: 'copyFrame' });
    case 'BracketLeft':
      return once({ type: 'loopA' });
    case 'BracketRight':
      return once({ type: 'loopB' });
    case 'Backslash':
      return once({ type: 'loopClear' });
    case 'KeyK':
      return route.feed ? once({ type: 'toggleLock' }) : null;
    default:
      return null;
  }
}
