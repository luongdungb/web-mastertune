// Add a product's extra photos + video to the site.
//   node scripts/import-media.mjs <slug> <file> [file...]
// Files keep the given order. Images -> public/images/g/<slug>-N.webp (+ -N-t.webp thumbnail),
// one .mp4 -> public/video/p/<slug>.mp4 (H.264 1080p, faststart) + poster.
// Writes gallery/video into src/data/product-extras.json (specs/install there are left alone).
import sharp from 'sharp';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const [slug, ...files] = process.argv.slice(2);
if (!slug || !files.length) { console.error('usage: node scripts/import-media.mjs <slug> <file> [file...]'); process.exit(1); }
const products = JSON.parse(await readFile('src/data/products.json', 'utf8'));
const product = products.find((p) => p.slug === slug);
if (!product) { console.error('unknown slug', slug); process.exit(1); }

const EXTRAS = 'src/data/product-extras.json';
const extras = existsSync(EXTRAS) ? JSON.parse(await readFile(EXTRAS, 'utf8')) : {};
const entry = extras[slug] ?? {};
const oldAlt = new Map((entry.gallery ?? []).map((g) => [g.src, g.alt]));

await mkdir('public/images/g', { recursive: true });
await mkdir('public/video/p', { recursive: true });
const gallery = [];
let video;
for (const f of files) {
  if (/\.(mp4|mov|webm|mkv)$/i.test(f)) {
    const out = `public/video/p/${slug}.mp4`;
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', f,
      '-vf', "scale='min(1920,iw)':-2", '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', out]);
    const poster = `public/video/p/${slug}-poster.webp`;
    const png = execFileSync('ffmpeg', ['-v', 'error', '-ss', '2', '-i', f, '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-'], { maxBuffer: 64e6 });
    await sharp(png).resize({ width: 1280 }).webp({ quality: 78 }).toFile(poster);
    await sharp(png).resize(240, 240, { fit: 'cover' }).webp({ quality: 72 }).toFile(`public/video/p/${slug}-thumb.webp`);
    video = { src: `/video/p/${slug}.mp4`, poster: `/video/p/${slug}-poster.webp`, thumb: `/video/p/${slug}-thumb.webp` };
    continue;
  }
  const n = gallery.length + 1;
  const src = `/images/g/${slug}-${n}.webp`;
  const img = sharp(f).rotate();
  const { info } = await img.clone().resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#0d1117' }).webp({ quality: 80 }).toFile(`public${src}`).then((info) => ({ info }));
  await img.clone().resize(240, 240, { fit: 'cover' }).flatten({ background: '#0d1117' }).webp({ quality: 72 }).toFile(`public/images/g/${slug}-${n}-t.webp`);
  gallery.push({ src, thumb: `/images/g/${slug}-${n}-t.webp`, w: info.width, h: info.height, alt: oldAlt.get(src) ?? `${product.name}, ảnh ${n + 1}` });
}

extras[slug] = { ...entry, gallery, ...(video ? { video } : {}) };
await writeFile(EXTRAS, JSON.stringify(extras, null, 2) + '\n');
console.log(slug, `${gallery.length} images`, video ? '+ video' : '');
