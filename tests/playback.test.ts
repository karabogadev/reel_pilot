import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampTime,
  decideEnd,
  effectiveRate,
  frameTarget,
  limitReached,
  loopSeek,
  withLoopEnd,
} from '../src/core/playback.ts';

test('clampTime: stays between 0 and (duration - end guard)', () => {
  assert.equal(clampTime(-5, 30), 0);
  assert.equal(clampTime(12, 30), 12);
  assert.equal(clampTime(30, 30), 29.75);
  assert.equal(clampTime(100, 30), 29.75);
  assert.equal(clampTime(5, NaN), 0);
  assert.equal(clampTime(5, Infinity), 0);
  assert.equal(clampTime(NaN, 30), 0);
  assert.equal(clampTime(1, 0.1), 0);
});

test('decideEnd: advance after N plays', () => {
  assert.equal(decideEnd(1, 1, []), 'advance');
  assert.equal(decideEnd(1, 2, []), 'replay');
  assert.equal(decideEnd(2, 2, []), 'advance');
  assert.equal(decideEnd(3, 2, []), 'advance');
});

test('decideEnd: any hold keeps the reel on screen', () => {
  assert.equal(decideEnd(1, 1, ['typing']), 'replay');
  assert.equal(decideEnd(9, 1, ['lock']), 'replay');
  assert.equal(decideEnd(2, 2, ['loop', 'break']), 'replay');
});

test('effectiveRate: boost doubles the speed, at least 2x, at most 4x', () => {
  assert.equal(effectiveRate(1, false), 1);
  assert.equal(effectiveRate(1.5, false), 1.5);
  assert.equal(effectiveRate(1, true), 2);
  assert.equal(effectiveRate(0.5, true), 2);
  assert.equal(effectiveRate(1.5, true), 3);
  assert.equal(effectiveRate(2, true), 4);
  assert.equal(effectiveRate(3, true), 4);
});

test('frameTarget: one frame at 30 fps, clamped to the reel', () => {
  assert.ok(Math.abs(frameTarget(10, 1, 30) - (10 + 1 / 30)) < 1e-9);
  assert.ok(Math.abs(frameTarget(10, -1, 30) - (10 - 1 / 30)) < 1e-9);
  assert.equal(frameTarget(0, -1, 30), 0);
  assert.equal(frameTarget(29.9, 1, 30), 29.75);
});

test('withLoopEnd: needs an end after the start', () => {
  assert.deepEqual(withLoopEnd({ a: 5, b: null }, 9, 30), { a: 5, b: 9 });
  assert.deepEqual(withLoopEnd(null, 9, 30), { a: 0, b: 9 }, 'no start yet: loop from the beginning');
  assert.equal(withLoopEnd({ a: 5, b: null }, 5.1, 30), null);
  assert.equal(withLoopEnd({ a: 5, b: null }, 3, 30), null);
  assert.deepEqual(withLoopEnd({ a: 5, b: null }, 30, 30), { a: 5, b: 29.75 }, 'end never reaches the reel end');
  assert.deepEqual(withLoopEnd({ a: 5, b: 9 }, 12, 30), { a: 5, b: 12 }, 'end can be moved');
});

test('loopSeek: jumps back to the start once playback passes the end', () => {
  const loop = { a: 5, b: 9 };
  assert.equal(loopSeek(7, loop), null);
  assert.equal(loopSeek(9, loop), 5);
  assert.equal(loopSeek(9.4, loop), 5);
  assert.equal(loopSeek(2, loop), null, 'seeking before the start is allowed');
  assert.equal(loopSeek(20, { a: 5, b: null }), null);
  assert.equal(loopSeek(20, null), null);
});

test('limitReached: 0 means no limit', () => {
  const off = { stopAfterReels: 0, stopAfterMinutes: 0 };
  assert.equal(limitReached({ reels: 999, watchedMs: 9e9 }, off), null);
});

test('limitReached: breaks on arriving at the reel after the limit, or once the minutes are used up', () => {
  const limits = { stopAfterReels: 10, stopAfterMinutes: 5 };
  assert.equal(limitReached({ reels: 10, watchedMs: 0 }, limits), null);
  assert.equal(limitReached({ reels: 11, watchedMs: 0 }, limits), 'reels');
  assert.equal(limitReached({ reels: 3, watchedMs: 299_999 }, limits), null);
  assert.equal(limitReached({ reels: 3, watchedMs: 300_000 }, limits), 'minutes');
});
