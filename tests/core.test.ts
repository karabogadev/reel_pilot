import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, normalizeSettings, normalizeSpeed, stepSpeed } from '../src/core/settings.ts';
import { formatSpeed, formatTime, formatTimePrecise } from '../src/core/format.ts';
import { pickActive } from '../src/core/active.ts';
import { routeOf } from '../src/core/route.ts';

test('normalizeSpeed: rounds to the step, clamps, falls back to 1x on junk', () => {
  assert.equal(normalizeSpeed(1.3), 1.25);
  assert.equal(normalizeSpeed(1.4), 1.5);
  assert.equal(normalizeSpeed(0), 0.25);
  assert.equal(normalizeSpeed(99), 4);
  assert.equal(normalizeSpeed('2'), 2);
  assert.equal(normalizeSpeed('abc'), 1);
  assert.equal(normalizeSpeed(undefined), 1);
  assert.equal(normalizeSpeed(null), 1);
});

test('stepSpeed: 0.25 steps, stops at the limits', () => {
  assert.equal(stepSpeed(1, 1), 1.25);
  assert.equal(stepSpeed(1, -1), 0.75);
  assert.equal(stepSpeed(4, 1), 4);
  assert.equal(stepSpeed(0.25, -1), 0.25);
});

test('normalizeSettings: defaults for empty storage', () => {
  for (const empty of [undefined, null, {}, 'x', 42]) {
    assert.deepEqual(normalizeSettings(empty), { ...DEFAULTS });
  }
});

test('normalizeSettings: keeps valid values, repairs invalid ones', () => {
  const valid = {
    autoAdvance: false,
    loops: 3,
    speed: 1.75,
    seekStep: 10,
    shortcuts: false,
    stopAfterReels: 20,
    stopAfterMinutes: 15,
    lang: 'en' as const,
  };
  assert.deepEqual(normalizeSettings(valid), valid);
  assert.deepEqual(
    normalizeSettings({ autoAdvance: 'yes', loops: 99, speed: -3, seekStep: null, shortcuts: 1, junk: true }),
    { ...DEFAULTS, loops: 5, speed: 0.25 },
  );
  assert.equal(normalizeSettings({ loops: 0 }).loops, 1);
  assert.equal(normalizeSettings({ loops: '2' }).loops, 2);
  assert.equal(normalizeSettings({ seekStep: 500 }).seekStep, 30);
  assert.equal(normalizeSettings({ stopAfterReels: -4 }).stopAfterReels, 0);
  assert.equal(normalizeSettings({ stopAfterMinutes: 'x' }).stopAfterMinutes, 0);
  assert.equal(normalizeSettings({ lang: 'de' }).lang, 'auto');
  assert.equal(normalizeSettings({ lang: 'tr' }).lang, 'tr');
});

test('normalizeSettings: settings saved by v0.1 gain the new fields', () => {
  const v01 = { autoAdvance: true, loops: 2, speed: 1.5, seekStep: 5, shortcuts: true };
  assert.deepEqual(normalizeSettings(v01), { ...v01, stopAfterReels: 0, stopAfterMinutes: 0, lang: 'auto' });
});

test('formatTime', () => {
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(9.9), '0:09');
  assert.equal(formatTime(65), '1:05');
  assert.equal(formatTime(3725), '1:02:05');
  assert.equal(formatTime(NaN), '0:00');
  assert.equal(formatTime(-3), '0:00');
});

test('formatTimePrecise: adds hundredths', () => {
  assert.equal(formatTimePrecise(0), '0:00.00');
  assert.equal(formatTimePrecise(12.375), '0:12.37');
  assert.equal(formatTimePrecise(65.5), '1:05.50');
  assert.equal(formatTimePrecise(NaN), '0:00.00');
});

test('formatSpeed', () => {
  assert.equal(formatSpeed(1), '1x');
  assert.equal(formatSpeed(1.25), '1.25x');
  assert.equal(formatSpeed(0.5), '0.5x');
});

test('pickActive: the visible, wide enough video closest to the centre', () => {
  const vh = 720;
  // From the live Reels feed: slides 660px apart, videos 626px tall.
  const feed = [
    { top: -587, bottom: 39, width: 351 },
    { top: 73, bottom: 699, width: 351 },
    { top: 733, bottom: 1359, width: 351 },
  ];
  assert.equal(pickActive(feed, vh), 1);
  assert.equal(pickActive(feed.map((r) => ({ ...r, top: r.top - 660, bottom: r.bottom - 660 })), vh), 2);
});

test('pickActive: -1 for small, off-screen or no videos', () => {
  assert.equal(pickActive([], 720), -1);
  assert.equal(pickActive([{ top: 100, bottom: 300, width: 150 }], 720), -1);
  assert.equal(pickActive([{ top: 800, bottom: 1400, width: 351 }], 720), -1);
  assert.equal(pickActive([{ top: -700, bottom: -10, width: 351 }], 720), -1);
  // The large video wins even when a small preview sits at the centre.
  assert.equal(
    pickActive(
      [
        { top: 300, bottom: 420, width: 120 },
        { top: 0, bottom: 300, width: 400 },
      ],
      720,
    ),
    1,
  );
});

test('routeOf', () => {
  assert.deepEqual(routeOf('/reels/'), { enabled: true, feed: true });
  assert.deepEqual(routeOf('/reels/Dfx5TRTohNL/'), { enabled: true, feed: true });
  assert.deepEqual(routeOf('/reels'), { enabled: true, feed: true });
  assert.deepEqual(routeOf('/reel/Dfx5TRTohNL/'), { enabled: true, feed: false });
  assert.deepEqual(routeOf('/someuser/reel/Dfx5TRTohNL/'), { enabled: true, feed: false });
  assert.deepEqual(routeOf('/'), { enabled: true, feed: false });
  assert.deepEqual(routeOf('/reelsfan/'), { enabled: true, feed: false });
  assert.deepEqual(routeOf('/stories/someuser/123/'), { enabled: false, feed: false });
});
