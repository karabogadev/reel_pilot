import test from 'node:test';
import assert from 'node:assert/strict';
import { isTextKey, LANGS, messages, resolveLang } from '../src/core/i18n.ts';

test('resolveLang: an explicit choice wins, auto follows the browser', () => {
  assert.equal(resolveLang('en', 'tr-TR'), 'en');
  assert.equal(resolveLang('tr', 'en-US'), 'tr');
  assert.equal(resolveLang('auto', 'tr-TR'), 'tr');
  assert.equal(resolveLang('auto', 'tr'), 'tr');
  assert.equal(resolveLang('auto', 'en-GB'), 'en');
  assert.equal(resolveLang('auto', 'de'), 'en');
  assert.equal(resolveLang('auto', ''), 'en');
});

test('messages: every language has every key, with the same kind of value', () => {
  const keys = Object.keys(messages('en')).sort();
  for (const lang of LANGS) {
    const m = messages(lang);
    assert.deepEqual(Object.keys(m).sort(), keys, lang);
    for (const key of keys) {
      const value = m[key as keyof typeof m];
      assert.equal(typeof value, typeof messages('en')[key as keyof typeof m], `${lang}.${key}`);
      if (typeof value === 'string') assert.ok(value.length > 0, `${lang}.${key} is empty`);
    }
  }
});

test('messages: numbers and directions end up in the text', () => {
  assert.equal(messages('en').seek(1, 5), '+5 s');
  assert.equal(messages('tr').seek(-1, 5), '−5 sn');
  assert.equal(messages('en').autoAdvanceState(false), 'Auto-advance off');
  assert.equal(messages('tr').breakReels(20), '20 reel izledin.');
});

test('isTextKey: only plain-text keys can be used from markup', () => {
  assert.equal(isTextKey('speed'), true);
  assert.equal(isTextKey('seek'), false);
  assert.equal(isTextKey('nope'), false);
});
