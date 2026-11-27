// Generates icons/icon-{16,32,48,128}.png with no dependencies: `node scripts/make-icons.mjs`.
// A rounded gradient square with a white fast-forward mark, anti-aliased by supersampling.
import { deflateSync, crc32 } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const SIZES = [16, 32, 48, 128];
const SAMPLES = 4;
const FROM = [124, 58, 237]; // violet, top-left
const TO = [236, 72, 153]; // pink, bottom-right
const RADIUS = 0.23;
const TRIANGLES = [
  [[0.22, 0.27], [0.22, 0.73], [0.52, 0.5]],
  [[0.5, 0.27], [0.5, 0.73], [0.8, 0.5]],
];

const edge = (a, b, p) => (p[0] - a[0]) * (b[1] - a[1]) - (p[1] - a[1]) * (b[0] - a[0]);

function inTriangle([a, b, c], p) {
  const d1 = edge(a, b, p);
  const d2 = edge(b, c, p);
  const d3 = edge(c, a, p);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}

function inRoundedSquare([x, y]) {
  const dx = Math.max(RADIUS - x, x - (1 - RADIUS), 0);
  const dy = Math.max(RADIUS - y, y - (1 - RADIUS), 0);
  return dx * dx + dy * dy <= RADIUS * RADIUS;
}

/** Colour of one sample point in unit coordinates, as premultiplied [r, g, b, a]. */
function sample(p) {
  if (!inRoundedSquare(p)) return [0, 0, 0, 0];
  if (TRIANGLES.some((t) => inTriangle(t, p))) return [255, 255, 255, 1];
  const t = (p[0] + p[1]) / 2;
  return [...FROM.map((from, i) => from + (TO[i] - from) * t), 1];
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  const out = Buffer.alloc(body.length + 8);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), body.length + 4);
  return out;
}

function png(size) {
  const raw = Buffer.alloc(size * (size * 4 + 1)); // each row starts with filter byte 0
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sum = [0, 0, 0, 0];
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const c = sample([(x + (sx + 0.5) / SAMPLES) / size, (y + (sy + 0.5) / SAMPLES) / size]);
          for (let i = 0; i < 3; i++) sum[i] += c[i] * c[3];
          sum[3] += c[3];
        }
      }
      const at = y * (size * 4 + 1) + 1 + x * 4;
      for (let i = 0; i < 3; i++) raw[at + i] = sum[3] ? Math.round(sum[i] / sum[3]) : 0;
      raw[at + 3] = Math.round((sum[3] / (SAMPLES * SAMPLES)) * 255);
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(new URL('../icons/', import.meta.url), { recursive: true });
for (const size of SIZES) {
  writeFileSync(new URL(`../icons/icon-${size}.png`, import.meta.url), png(size));
  console.log(`icons/icon-${size}.png`);
}
