import test from 'node:test';
import assert from 'node:assert/strict';
import { isAdMarker, matchAds } from '../src/core/ads.ts';

test('isAdMarker: exact labels anywhere, call-to-actions only inside a button', () => {
  for (const label of ['Ad', 'Sponsored', 'Reklam', 'Sponsorlu', '  Ad  ']) assert.equal(isAdMarker(label, false), true, label);
  assert.equal(isAdMarker('Get offer', true), true);
  assert.equal(isAdMarker('Shop Now', true), true);
  assert.equal(isAdMarker('Teklifi Al', true), true);
  assert.equal(isAdMarker('INSTALL NOW', true), true);
  assert.equal(isAdMarker('Get offer', false), false);
  for (const text of ['ad', 'AD', 'Add', 'Ad campaign tips', 'Sponsored by nobody', 'reklam', 'Follow', '']) {
    assert.equal(isAdMarker(text, true), false, text);
  }
});

test('matchAds: a marker belongs to the video on its horizontal band', () => {
  // The live desktop layout: videos stacked 660px apart, info column to the left of each video.
  const videos = [
    { top: -587, bottom: 39, left: 350, right: 1022 },
    { top: 73, bottom: 699, left: 350, right: 1022 },
    { top: 733, bottom: 1359, left: 350, right: 1022 },
  ];
  const adLabelBesideSecond = { top: 650, bottom: 664, left: 44, right: 60 };
  assert.deepEqual(matchAds(videos, [adLabelBesideSecond]), [-1, 0, -1]);
  const ctaOverThird = { top: 1200, bottom: 1240, left: 380, right: 600 };
  assert.deepEqual(matchAds(videos, [adLabelBesideSecond, ctaOverThird]), [-1, 0, 1]);
});

test('matchAds: markers far to the side or between reels match nothing', () => {
  const videos = [{ top: 73, bottom: 699, left: 350, right: 1022 }];
  assert.deepEqual(matchAds(videos, [{ top: 300, bottom: 320, left: 1700, right: 1720 }]), [-1]);
  assert.deepEqual(matchAds(videos, [{ top: 700, bottom: 730, left: 400, right: 420 }]), [-1]);
  assert.deepEqual(matchAds([], [{ top: 0, bottom: 10, left: 0, right: 10 }]), []);
});
