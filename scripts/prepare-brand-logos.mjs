// Dark-background versions of the brand logos (for the scrolling brand strip).
//   node scripts/prepare-brand-logos.mjs
// Reads public/images/brands/<slug>.webp, writes public/images/brands/dark/<slug>.webp.
// Any part that would be hard to see on the site's near-black (#0b0c0e) - grey lettering, navy -
// is turned white; brand colours with enough contrast (reds, greens, gold, the Italian flag) stay.
import sharp from 'sharp';
import { readdir, mkdir } from 'node:fs/promises';

const SRC = 'public/images/brands', OUT = 'public/images/brands/dark';
const BG_LUM = 0.0039; // relative luminance of #0b0c0e
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const contrast = (l) => (l + 0.05) / (BG_LUM + 0.05);

await mkdir(OUT, { recursive: true });
for (const f of await readdir(SRC)) {
  if (!f.endsWith('.webp')) continue;
  const { data, info } = await sharp(`${SRC}/${f}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let changed = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 8) continue;
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    const c = contrast(lum(r, g, b));
    // neutrals need real contrast to read as lettering; saturated colours only need to be visible
    const weak = sat < 0.35 ? c < 5 : c < 2.6;
    if (weak) {
      // keep the original's shading: lighter source greys stay a touch brighter
      const v = Math.round(225 + (lum(r, g, b) ** 0.5) * 30);
      data[i] = data[i + 1] = data[i + 2] = Math.min(255, v);
      changed++;
    }
  }
  await sharp(data, { raw: info }).webp({ quality: 92, alphaQuality: 100 }).toFile(`${OUT}/${f}`);
  console.log(f, `${Math.round((changed / (info.width * info.height)) * 100)}% of pixels lightened`);
}
