// Convert downloaded images to web-sized WebP. Originals are moved to data-raw/ (not published).
import sharp from 'sharp';
import { readdir, mkdir, rename } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const jobs = [
  { src: 'public/images/products', out: 'public/images/p', width: 900, bg: '#ffffff' },
  { src: 'public/images/site', out: 'public/images/s', width: 2000 },
];
for (const { src, out, width, bg } of jobs) {
  if (!existsSync(src)) continue;
  await mkdir(out, { recursive: true });
  const keep = `data-raw/originals/${src.split('/').pop()}`;
  await mkdir(keep, { recursive: true });
  let n = 0;
  for (const f of await readdir(src)) {
    const base = f.replace(/\.\w+$/, '');
    let img = sharp(`${src}/${f}`).rotate().resize({ width, withoutEnlargement: true });
    if (bg) img = img.flatten({ background: bg }); // product shots: transparent PNG -> white studio bg
    await img.webp({ quality: 80 }).toFile(`${out}/${base}.webp`);
    await rename(`${src}/${f}`, `${keep}/${f}`);
    n++;
  }
  console.log(src, '->', out, n);
}
