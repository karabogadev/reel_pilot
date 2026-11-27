const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../src/core.js');

test('normalizeSpeed: rounds to the step, clamps, falls back to 1x on junk', () => {
  assert.equal(C.normalizeSpeed(1.3), 1.25);
  assert.equal(C.normalizeSpeed(1.4), 1.5);
  assert.equal(C.normalizeSpeed(0), 0.25);
  assert.equal(C.normalizeSpeed(99), 4);
  assert.equal(C.normalizeSpeed('2'), 2);
  assert.equal(C.normalizeSpeed('abc'), 1);
  assert.equal(C.normalizeSpeed(undefined), 1);
  assert.equal(C.normalizeSpeed(null), 1);
});

test('stepSpeed: 0.25 steps, stops at the limits', () => {
  assert.equal(C.stepSpeed(1, 1), 1.25);
  assert.equal(C.stepSpeed(1, -1), 0.75);
  assert.equal(C.stepSpeed(4, 1), 4);
  assert.equal(C.stepSpeed(0.25, -1), 0.25);
});

test('normalizeSettings: defaults for empty storage', () => {
  for (const empty of [undefined, null, {}, 'x', 42]) {
    assert.deepEqual(C.normalizeSettings(empty), { ...C.DEFAULTS });
  }
});

test('normalizeSettings: keeps valid values, repairs invalid ones', () => {
  assert.deepEqual(
    C.normalizeSettings({ autoAdvance: false, loops: 3, speed: 1.75, seekStep: 10, shortcuts: false }),
    { autoAdvance: false, loops: 3, speed: 1.75, seekStep: 10, shortcuts: false },
  );
  assert.deepEqual(
    C.normalizeSettings({ autoAdvance: 'yes', loops: 99, speed: -3, seekStep: null, shortcuts: 1, junk: true }),
    { autoAdvance: true, loops: 5, speed: 0.25, seekStep: 5, shortcuts: true },
  );
  assert.equal(C.normalizeSettings({ loops: 0 }).loops, 1);
  assert.equal(C.normalizeSettings({ loops: '2' }).loops, 2);
  assert.equal(C.normalizeSettings({ seekStep: 500 }).seekStep, 30);
});

test('clampTime: stays between 0 and (duration - end guard)', () => {
  assert.equal(C.clampTime(-5, 30), 0);
  assert.equal(C.clampTime(12, 30), 12);
  assert.equal(C.clampTime(30, 30), 29.75);
  assert.equal(C.clampTime(100, 30), 29.75);
  assert.equal(C.clampTime(5, NaN), 0);
  assert.equal(C.clampTime(5, Infinity), 0);
  assert.equal(C.clampTime(NaN, 30), 0);
  assert.equal(C.clampTime(1, 0.1), 0);
});

test('formatTime', () => {
  assert.equal(C.formatTime(0), '0:00');
  assert.equal(C.formatTime(9.9), '0:09');
  assert.equal(C.formatTime(65), '1:05');
  assert.equal(C.formatTime(3725), '1:02:05');
  assert.equal(C.formatTime(NaN), '0:00');
  assert.equal(C.formatTime(-3), '0:00');
});

test('formatSpeed', () => {
  assert.equal(C.formatSpeed(1), '1x');
  assert.equal(C.formatSpeed(1.25), '1.25x');
  assert.equal(C.formatSpeed(0.5), '0.5x');
});

test('pickActive: the visible, wide enough video closest to the centre', () => {
  const vh = 720;
  // From the live Reels feed: slides 660px apart, videos 626px tall.
  const feed = [
    { top: -587, bottom: 39, width: 351 },
    { top: 73, bottom: 699, width: 351 },
    { top: 733, bottom: 1359, width: 351 },
  ];
  assert.equal(C.pickActive(feed, vh), 1);
  assert.equal(C.pickActive(feed.map((r) => ({ ...r, top: r.top - 660, bottom: r.bottom - 660 })), vh), 2);
});

test('pickActive: -1 for small, off-screen or no videos', () => {
  assert.equal(C.pickActive([], 720), -1);
  assert.equal(C.pickActive([{ top: 100, bottom: 300, width: 150 }], 720), -1);
  assert.equal(C.pickActive([{ top: 800, bottom: 1400, width: 351 }], 720), -1);
  assert.equal(C.pickActive([{ top: -700, bottom: -10, width: 351 }], 720), -1);
  // The large video wins even when a small preview sits at the centre.
  assert.equal(
    C.pickActive(
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
  assert.deepEqual(C.routeOf('/reels/'), { enabled: true, feed: true });
  assert.deepEqual(C.routeOf('/reels/Dfx5TRTohNL/'), { enabled: true, feed: true });
  assert.deepEqual(C.routeOf('/reels'), { enabled: true, feed: true });
  assert.deepEqual(C.routeOf('/reel/Dfx5TRTohNL/'), { enabled: true, feed: false });
  assert.deepEqual(C.routeOf('/someuser/reel/Dfx5TRTohNL/'), { enabled: true, feed: false });
  assert.deepEqual(C.routeOf('/'), { enabled: true, feed: false });
  assert.deepEqual(C.routeOf('/reelsfan/'), { enabled: true, feed: false });
  assert.deepEqual(C.routeOf('/stories/someuser/123/'), { enabled: false, feed: false });
});

test('nextAction: advance after N plays', () => {
  assert.equal(C.nextAction(1, 1), 'advance');
  assert.equal(C.nextAction(1, 2), 'replay');
  assert.equal(C.nextAction(2, 2), 'advance');
  assert.equal(C.nextAction(3, 2), 'advance');
});

test('isTypingTarget', () => {
  assert.equal(C.isTypingTarget({ tagName: 'INPUT' }), true);
  assert.equal(C.isTypingTarget({ tagName: 'TEXTAREA' }), true);
  assert.equal(C.isTypingTarget({ tagName: 'DIV', isContentEditable: true }), true);
  assert.equal(C.isTypingTarget({ tagName: 'DIV', isContentEditable: false }), false);
  assert.equal(C.isTypingTarget({ tagName: 'VIDEO' }), false);
  assert.equal(C.isTypingTarget(null), false);
});

test('keyAction: every shortcut on the Reels feed', () => {
  const feed = C.routeOf('/reels/abc/');
  assert.deepEqual(C.keyAction({ code: 'ArrowLeft' }, feed), { type: 'seek', dir: -1 });
  assert.deepEqual(C.keyAction({ code: 'ArrowRight' }, feed), { type: 'seek', dir: 1 });
  assert.deepEqual(C.keyAction({ code: 'KeyS' }, feed), { type: 'speed', dir: -1 });
  assert.deepEqual(C.keyAction({ code: 'KeyD' }, feed), { type: 'speed', dir: 1 });
  assert.deepEqual(C.keyAction({ code: 'KeyR' }, feed), { type: 'resetSpeed' });
  assert.deepEqual(C.keyAction({ code: 'KeyA' }, feed), { type: 'toggleAuto' });
  assert.equal(C.keyAction({ code: 'KeyA', repeat: true }, feed), null);
});

test('keyAction: outside the feed arrows and A are left alone, speed still works', () => {
  const post = C.routeOf('/p/abc/');
  assert.equal(C.keyAction({ code: 'ArrowLeft' }, post), null);
  assert.equal(C.keyAction({ code: 'ArrowRight' }, post), null);
  assert.equal(C.keyAction({ code: 'KeyA' }, post), null);
  assert.deepEqual(C.keyAction({ code: 'KeyD' }, post), { type: 'speed', dir: 1 });
});

test("keyAction: modifier keys, stories and Instagram's own keys are ignored", () => {
  const feed = C.routeOf('/reels/');
  assert.equal(C.keyAction({ code: 'KeyR', metaKey: true }, feed), null);
  assert.equal(C.keyAction({ code: 'KeyS', ctrlKey: true }, feed), null);
  assert.equal(C.keyAction({ code: 'KeyD', altKey: true }, feed), null);
  assert.equal(C.keyAction({ code: 'KeyD' }, C.routeOf('/stories/u/1/')), null);
  for (const code of ['KeyL', 'KeyM', 'KeyN', 'Slash', 'ArrowDown', 'ArrowUp', 'Space']) {
    assert.equal(C.keyAction({ code }, feed), null);
  }
});
