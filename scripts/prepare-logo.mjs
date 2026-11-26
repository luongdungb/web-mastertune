// Cut the official chrome logo (transparent PNG: wordmark above the two M pillars) into web assets.
//   node scripts/prepare-logo.mjs [source.png]
// The wordmark and the pillars never overlap: MASTER sits above the pillar tips, TUNE sits between them.
import sharp from 'sharp';

const SRC = process.argv[2] ?? 'assets-src/logo-mastertune.png';
const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;

// geometry of the 1684x1191 source; scaled if a larger export is used
const s = W / 1684;
const MASTER_BOTTOM = 362 * s;  // row under "MASTER" (its drop shadow included)
const TUNE = { x0: 555 * s, x1: 1165 * s, y1: 505 * s }; // box holding "TUNE", clear of the pillar tips
const SHADOW_END = 600 * s;      // TUNE's soft shadow fades out here, between the pillars
// inner edges of the pillars run diagonally from (380,365) and (1320,365), ~1.088 px per row
const leftEdge = (y) => (380 + (y / s - 365) * 1.088) * s;
const rightEdge = (y) => (1320 - (y / s - 365) * 1.088) * s;
const between = (x, y, m) => x > leftEdge(y) + m * s && x < rightEdge(y) - m * s;
const isWord = (x, y) => y < MASTER_BOTTOM || (y < TUNE.y1 && x >= TUNE.x0 && x <= TUNE.x1) || (y < SHADOW_END && between(x, y, 18));

const part = (keep) => {
  const buf = Buffer.from(data);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!keep(x, y)) buf[(y * W + x) * 4 + 3] = 0;
  return buf;
};
const bbox = (buf, min = 24) => {
  let x0 = W, x1 = 0, y0 = H, y1 = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (buf[(y * W + x) * 4 + 3] > min) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
};
const raw = (buf) => sharp(buf, { raw: { width: W, height: H, channels: 4 } });

const word = part(isWord);
// above the TUNE line only the pillar tips (and their edge shadow) belong to the mark
const mark = part((x, y) => !isWord(x, y) && (y >= TUNE.y1 || !between(x, y, 18)));
const wordBox = bbox(word), markBox = bbox(mark), fullBox = bbox(data);

const out = 'public/brand';
const webp = { quality: 90, alphaQuality: 95, effort: 6 };
// header pieces at 2x of the 72px slot
await raw(word).extract(wordBox).resize({ height: 144 }).webp(webp).toFile(`${out}/wordmark-72.webp`);
await raw(mark).extract(markBox).resize({ height: 144 }).webp(webp).toFile(`${out}/mark-72.webp`);
await raw(Buffer.from(data)).extract(fullBox).resize({ width: 640 }).webp(webp).toFile(`${out}/logo-320.webp`);
await raw(word).extract(wordBox).resize({ height: 240 }).png({ compressionLevel: 9 }).toFile(`${out}/wordmark.png`);
await raw(mark).extract(markBox).resize({ height: 320 }).png({ compressionLevel: 9 }).toFile(`${out}/mark.png`);
await raw(Buffer.from(data)).extract(fullBox).resize({ width: 1040 }).png({ compressionLevel: 9 }).toFile(`${out}/logo.png`);

// favicon / app icons: chrome M on a deep slate tile so it reads in light and dark browser chrome
const markIcon = await raw(mark).extract(markBox).resize({ width: 196, height: 176, fit: 'inside' }).png().toBuffer();
const tile = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a3a4a"/><stop offset="1" stop-color="#0d1117"/></linearGradient></defs><rect width="256" height="256" rx="56" fill="url(#g)"/></svg>`);
const icon = await sharp(tile).composite([{ input: markIcon, gravity: 'center' }]).png().toBuffer();
for (const [size, name] of [[512, 'icon-512.png'], [180, 'apple-touch-icon.png'], [64, 'favicon-64.png']]) {
  await sharp(icon).resize(size).png().toFile(`${out}/${name}`);
}
const r = (b) => (b.width / b.height).toFixed(3);
console.log({ wordBox, markBox, fullBox, ratio: { word: r(wordBox), mark: r(markBox), full: r(fullBox) } });
