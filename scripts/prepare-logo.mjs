// Cut the official chrome logo (rendered on a dark textured background) into transparent assets.
// "Unscreen": subtract the dark background level and turn brightness into alpha, so the chrome
// composites naturally on the site's near-black surfaces.
import sharp from 'sharp';
const SRC = '../Logo MasterTune.png';
const BG = 48;      // background level (0-255) treated as fully transparent
const { data, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const out = Buffer.alloc(W * H * 4);
const rowHas = new Array(H).fill(0), colHas = new Array(W).fill(0);
for (let i = 0; i < W * H; i++) {
  const c = [0, 1, 2].map((k) => Math.max(0, (data[i * 3 + k] - BG) / (255 - BG)));
  let a = Math.max(...c);
  a = Math.min(1, a * 1.15);
  for (let k = 0; k < 3; k++) out[i * 4 + k] = a > 0 ? Math.min(255, Math.round((c[k] / Math.max(a, 1e-3)) * 255)) : 0;
  out[i * 4 + 3] = Math.round(a * 255);
  if (a > 0.35) { rowHas[Math.floor(i / W)]++; colHas[i % W]++; }
}
// Split by connected regions: the two M pillars are the two largest solid blobs; everything else
// above the pillars' bottom is lettering (glints included).
const solid = new Uint8Array(W * H);
for (let i = 0; i < W * H; i++) solid[i] = out[i * 4 + 3] > 70 ? 1 : 0;
const label = new Int32Array(W * H).fill(-1);
const sizes = [];
for (let i = 0; i < W * H; i++) {
  if (!solid[i] || label[i] >= 0) continue;
  const id = sizes.length; let n = 0; const stack = [i]; label[i] = id;
  while (stack.length) {
    const p = stack.pop(); n++;
    const x = p % W, y = (p / W) | 0;
    for (const q of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1])
      if (q >= 0 && solid[q] && label[q] < 0) { label[q] = id; stack.push(q); }
  }
  sizes.push(n);
}
const pillarIds = sizes.map((n, id) => [n, id]).sort((x, y) => y[0] - x[0]).slice(0, 2).map(([, id]) => id);
console.log('components', sizes.length, 'pillars', pillarIds.map((id) => sizes[id]));
// lettering = small blobs whose pixels sit in the text band (rows 230-530), grown 3px for soft edges
const TOP = 230, TEXT_BOTTOM = 530;
const isWord = new Uint8Array(W * H);
for (let p = 0; p < W * H; p++) {
  const y = (p / W) | 0;
  if (label[p] >= 0 && !pillarIds.includes(label[p]) && y >= TOP && y <= TEXT_BOTTOM) isWord[p] = 1;
}
for (let pass = 0; pass < 3; pass++) {
  const grow = Uint8Array.from(isWord);
  for (let y = TOP; y < TEXT_BOTTOM; y++) for (let x = 1; x < W - 1; x++) {
    const p = y * W + x;
    if (!isWord[p] && (isWord[p - 1] || isWord[p + 1] || isWord[p - W] || isWord[p + W]) && !pillarIds.includes(label[p])) grow[p] = 1;
  }
  isWord.set(grow);
}
const masked = (keepWord) => {
  const buf = Buffer.from(out);
  for (let p = 0; p < W * H; p++) {
    const y = (p / W) | 0;
    const keep = keepWord ? isWord[p] : (!isWord[p] && y >= 380);
    if (!keep || y < TOP) buf[p * 4 + 3] = 0;
  }
  return buf;
};
const inWord = () => true;
const bbox = (buf) => {
  let x0 = W, x1 = 0, y0 = H, y1 = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (buf[(y * W + x) * 4 + 3] > 90) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const p = 8;
  const left = Math.max(0, x0 - p), top = Math.max(0, y0 - p);
  return { left, top, width: Math.min(W, x1 + p) - left, height: Math.min(H, y1 + p) - top };
};
const raw = (buf) => sharp(buf, { raw: { width: W, height: H, channels: 4 } });
const word = masked(true), mark = masked(false);
const wordBox = bbox(word), markBox = bbox(mark);
const fx0 = Math.min(wordBox.left, markBox.left), fy0 = wordBox.top;
const fullBox = { left: fx0, top: fy0, width: Math.max(wordBox.left + wordBox.width, markBox.left + markBox.width) - fx0, height: markBox.top + markBox.height - fy0 };
const full = Buffer.from(out); for (let p = 0; p < TOP * W; p++) full[p * 4 + 3] = 0;
await raw(word).extract(wordBox).resize({ height: 120 }).png({ compressionLevel: 9 }).toFile('public/brand/wordmark.png');
await raw(mark).extract(markBox).resize({ height: 160 }).png({ compressionLevel: 9 }).toFile('public/brand/mark.png');
await raw(full).extract(fullBox).resize({ width: 520 }).png({ compressionLevel: 9 }).toFile('public/brand/logo.png');
// favicon / app icons: the M on the site's cabin black
const markIcon = await raw(mark).extract(markBox).resize({ width: 200, height: 190, fit: 'inside' }).png().toBuffer();
const icon = await sharp({ create: { width: 256, height: 256, channels: 4, background: '#07090c' } })
  .composite([{ input: markIcon, gravity: 'center' }]).png().toBuffer();
for (const [size, name] of [[512, 'icon-512.png'], [180, 'apple-touch-icon.png'], [64, 'favicon-64.png']]) {
  await sharp(icon).resize(size).png().toFile(`public/brand/${name}`);
}
console.log({ wordBox, markBox, fullBox });
