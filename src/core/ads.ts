/**
 * Ad detection, without Instagram's class names: an ad reel carries a visible "Ad" / "Sponsored" label or an
 * ad call-to-action ("Get offer") on the same horizontal band as its video, either over the video or in the
 * info column beside it. Whole-text matches only (labels also case-sensitive), so captions and usernames don't
 * trip it.
 */

const LABELS = new Set(['Ad', 'Ads', 'Sponsored', 'Reklam', 'Sponsorlu']);

/**
 * Call-to-action buttons only ads have, lower-cased: Instagram writes them both as "Shop now" and "Shop Now".
 * Counted only inside a link or button.
 */
const CTAS = new Set([
  'get offer',
  'shop now',
  'install now',
  'book now',
  'order now',
  'get quote',
  'teklifi al',
  'teklif al',
  'hemen alışveriş yap',
  'alışveriş yap',
  'şimdi yükle',
  'hemen yükle',
  'şimdi rezervasyon yap',
  'hemen sipariş ver',
]);

/** Is this piece of text, alone in its element, an ad marker? */
export function isAdMarker(text: string, inButton: boolean): boolean {
  const t = text.trim();
  return LABELS.has(t) || (inButton && CTAS.has(t.toLowerCase()));
}

export interface Box {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/** How far beside the video the info column may sit. */
const SIDE_REACH = 520;

/**
 * For each video, the index of the first marker on its horizontal band (vertical centre inside the video,
 * horizontally within reach), or -1 when it has none. A marker with an empty box is not rendered (it sits in a
 * hidden part of the page, such as the home feed kept behind Reels) and matches nothing.
 */
export function matchAds(videos: Box[], markers: Box[]): number[] {
  return videos.map((v) =>
    markers.findIndex((m) => {
      if (m.bottom <= m.top || m.right <= m.left) return false;
      const y = (m.top + m.bottom) / 2;
      return y >= v.top && y <= v.bottom && m.right >= v.left - SIDE_REACH && m.left <= v.right + SIDE_REACH;
    }),
  );
}
