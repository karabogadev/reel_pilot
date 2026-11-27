export interface RectLike {
  top: number;
  bottom: number;
  width: number;
}

/**
 * Picks the active video: wide enough, on screen, and with its vertical centre
 * closest to the viewport centre. Returns -1 when there is none.
 */
export function pickActive(rects: readonly RectLike[], viewportHeight: number, minWidth = 200): number {
  const center = viewportHeight / 2;
  let best = -1;
  let bestDistance = Infinity;
  rects.forEach((r, i) => {
    if (r.width <= minWidth || r.bottom <= 0 || r.top >= viewportHeight) return;
    const distance = Math.abs((r.top + r.bottom) / 2 - center);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  });
  return best;
}
