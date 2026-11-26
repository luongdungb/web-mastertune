// Dark-background versions of the brand logos for the scrolling brand strip.
//   node scripts/prepare-brand-logos.mjs
// Reads the official logos in assets-src/brands/<slug>.png, trims the empty margin, scales to 160px
// tall and writes public/images/brands/dark/<slug>.webp.
// Any part that would be hard to see on the site's near-black (#0b0c0e) - grey or navy lettering -
// is turned white; brand colours with enough contrast (reds, yellow, gold, the Italian flag) stay.
import sharp from 'sharp';
import { readdir, mkdir, rm } from 'node:fs/promises';

const SRC = 'assets-src/brands', OUT = 'public/images/brands/dark';
const BG_LUM = 0.0039; // relative luminance of #0b0c0e
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const contrast = (l) => (l + 0.05) / (BG_LUM + 0.05);

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
for (const f of await readdir(SRC)) {
  if (!/\.(png|webp)$/i.test(f)) continue;
  const slug = f.replace(/\.\w+$/, '');
  const { data, info } = await sharp(`${SRC}/${f}`).ensureAlpha().trim({ threshold: 1 })
    .resize({ height: 160, width: 640, fit: 'inside', withoutEnlargement: true })
    .raw().toBuffer({ resolveWithObject: true });
  let changed = 0, solid = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 8) continue;
    solid++;
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    const c = contrast(lum(r, g, b));
    // neutrals need real contrast to read as lettering; saturated colours only need to be visible
    if (sat < 0.35 ? c < 5 : c < 2.6) {
      const v = Math.round(225 + (lum(r, g, b) ** 0.5) * 30);
      data[i] = data[i + 1] = data[i + 2] = Math.min(255, v);
      changed++;
    }
  }
  await sharp(data, { raw: info }).webp({ quality: 92, alphaQuality: 100 }).toFile(`${OUT}/${slug}.webp`);
  console.log(slug, `${info.width}x${info.height}`, `${Math.round((changed / solid) * 100)}% lightened`);
}
