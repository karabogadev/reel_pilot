export function formatTime(seconds: number): string {
  const total = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/** Like formatTime, with hundredths: used while stepping frame by frame. */
export function formatTimePrecise(seconds: number): string {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const hundredths = Math.floor((safe % 1) * 100);
  return `${formatTime(safe)}.${String(hundredths).padStart(2, '0')}`;
}

export const formatSpeed = (speed: number): string => `${speed}x`;
