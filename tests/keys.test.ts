import test from 'node:test';
import assert from 'node:assert/strict';
import { isTypingTarget, keyAction } from '../src/core/keys.ts';
import { routeOf } from '../src/core/route.ts';

const feed = routeOf('/reels/abc/');
const post = routeOf('/p/abc/');

test('isTypingTarget', () => {
  assert.equal(isTypingTarget({ tagName: 'INPUT' }), true);
  assert.equal(isTypingTarget({ tagName: 'TEXTAREA' }), true);
  assert.equal(isTypingTarget({ tagName: 'DIV', isContentEditable: true }), true);
  assert.equal(isTypingTarget({ tagName: 'DIV', isContentEditable: false }), false);
  assert.equal(isTypingTarget({ tagName: 'VIDEO' }), false);
  assert.equal(isTypingTarget(null), false);
});

test('keyAction: every v0.1 shortcut on the Reels feed', () => {
  assert.deepEqual(keyAction({ code: 'ArrowLeft' }, feed), { type: 'seek', dir: -1 });
  assert.deepEqual(keyAction({ code: 'ArrowRight' }, feed), { type: 'seek', dir: 1 });
  assert.deepEqual(keyAction({ code: 'KeyS' }, feed), { type: 'speed', dir: -1 });
  assert.deepEqual(keyAction({ code: 'KeyD' }, feed), { type: 'speed', dir: 1 });
  assert.deepEqual(keyAction({ code: 'KeyR' }, feed), { type: 'resetSpeed' });
  assert.deepEqual(keyAction({ code: 'KeyA' }, feed), { type: 'toggleAuto' });
  assert.equal(keyAction({ code: 'KeyA', repeat: true }, feed), null);
});

test('keyAction: outside the feed arrows and A are left alone, speed still works', () => {
  assert.equal(keyAction({ code: 'ArrowLeft' }, post), null);
  assert.equal(keyAction({ code: 'ArrowRight' }, post), null);
  assert.equal(keyAction({ code: 'KeyA' }, post), null);
  assert.deepEqual(keyAction({ code: 'KeyD' }, post), { type: 'speed', dir: 1 });
});

test("keyAction: modifier keys, stories and Instagram's own keys are ignored", () => {
  assert.equal(keyAction({ code: 'KeyR', metaKey: true }, feed), null);
  assert.equal(keyAction({ code: 'KeyS', ctrlKey: true }, feed), null);
  assert.equal(keyAction({ code: 'KeyD', altKey: true }, feed), null);
  assert.equal(keyAction({ code: 'KeyC', metaKey: true }, feed), null, 'Cmd+C must stay copy');
  assert.equal(keyAction({ code: 'KeyD' }, routeOf('/stories/u/1/')), null);
  for (const code of ['KeyL', 'KeyM', 'KeyN', 'Slash', 'ArrowDown', 'ArrowUp', 'Space']) {
    assert.equal(keyAction({ code }, feed), null);
  }
});

test('keyAction: viewing pack shortcuts', () => {
  assert.deepEqual(keyAction({ code: 'KeyF' }, feed), { type: 'boost' });
  assert.deepEqual(keyAction({ code: 'KeyF', repeat: true }, feed), { type: 'boost' }, 'held key keeps boosting');
  assert.deepEqual(keyAction({ code: 'Comma' }, feed), { type: 'frame', dir: -1 });
  assert.deepEqual(keyAction({ code: 'Period', repeat: true }, feed), { type: 'frame', dir: 1 });
  assert.deepEqual(keyAction({ code: 'KeyC' }, feed), { type: 'copyFrame' });
  assert.deepEqual(keyAction({ code: 'BracketLeft' }, feed), { type: 'loopA' });
  assert.deepEqual(keyAction({ code: 'BracketRight' }, feed), { type: 'loopB' });
  assert.deepEqual(keyAction({ code: 'Backslash' }, feed), { type: 'loopClear' });
  assert.deepEqual(keyAction({ code: 'KeyK' }, feed), { type: 'toggleLock' });
});

test('keyAction: one-shot actions ignore key repeat; the lock is feed-only', () => {
  for (const code of ['KeyC', 'BracketLeft', 'BracketRight', 'Backslash', 'KeyK']) {
    assert.equal(keyAction({ code, repeat: true }, feed), null);
  }
  assert.equal(keyAction({ code: 'KeyK' }, post), null);
  assert.deepEqual(keyAction({ code: 'KeyC' }, post), { type: 'copyFrame' });
});
