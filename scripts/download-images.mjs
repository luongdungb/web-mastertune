// Download product images (original size when available) + brand/news images from mastertune.vn
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const products = JSON.parse(await readFile(new URL('../data-raw/products.json', import.meta.url)));
const slug = (u) => u.split('/').pop().replace(/\.html$/, '');
const original = (u) => u.replace('/image/cache/', '/image/').replace(/-\d+x\d+(\.\w+)$/, '$1');

async function fetchImg(url) {
  try {
    const r = await fetch(encodeURI(decodeURI(url)));
    if (!r.ok || !(r.headers.get('content-type') || '').startsWith('image/')) return null;
    return Buffer.from(await r.arrayBuffer());
  } catch { return null; }
}
async function save(dir, name, urls) {
  await mkdir(dir, { recursive: true });
  for (const u of urls) {
    const ext = (u.match(/\.(jpe?g|png|webp)$/i)?.[1] || 'jpg').toLowerCase().replace('jpeg', 'jpg');
    const file = `${dir}/${name}.${ext}`;
    if (existsSync(file)) return file;
    const buf = await fetchImg(u);
    if (buf) { await writeFile(file, buf); return file; }
  }
  return null;
}

const map = {};
let ok = 0;
for (const p of products) {
  const s = slug(p.url);
  const first = p.images[0];
  const f = await save('public/images/products', s, [original(first), first]);
  if (f) { map[s] = f.replace(/^public/, ''); ok++; }
  await sleep(150);
}
await writeFile('data-raw/image-map.json', JSON.stringify(map, null, 2));
console.log('product images', ok, '/', products.length);

const brands = { audiocircle: 'audiocircle-1-2x', steg: 'steg-1-2x', dls: 'logo-2', resolut: 'resolut-1-2x', harrison: 'harrision-2x', nrg: 'nrg-2x', clio: 'clio-posket-2x', zelos: 'logo-zelos1' };
for (const [k, v] of Object.entries(brands)) {
  await save('public/images/brands', k, [`https://mastertune.vn/image/catalog/logo/${v}.png`, `https://mastertune.vn/image/cache/catalog/logo/${v}-300x150.png`]);
}
const misc = {
  'logo-mockup': 'https://mastertune.vn/image/catalog/logo/logo-mockup-on-panel-wall.png',
  'news-hoi-thao-2026': 'https://mastertune.vn/image/catalog/tin-tuc/hoi-thao-hn-2026/nh-453.jpg',
  'news-emma-2025': 'https://mastertune.vn/image/catalog/tin-tuc/emma-2025/batch-anh-67.jpg',
  'news-sunday-drive-2025': 'https://mastertune.vn/image/catalog/tin-tuc/vietmap-hanoi-sunday-drive/z6693286949743-146de07292137da391f1531d06f6bdc6.jpg',
  'training-otopro': 'https://mastertune.vn/image/catalog/tin-tuc/master-tune-training-otopro/434397678-122134323524165603-5582360892584624888-n.jpg',
  'dao-tao': 'https://mastertune.vn/image/catalog/banner/dao-tao2.jpg',
  'danh-gia-chuyen-gia': 'https://mastertune.vn/image/catalog/banner/danh-gia-chuyen-gia.jpeg',
  'banner-sub': 'https://mastertune.vn/image/catalog/banner/banner-sub-3.jpg',
  'banner-slide': 'https://mastertune.vn/image/catalog/revslider_media_folder/z5244524025712-e053b50ffd88750f5019de7538c1c50d.jpg',
  'bg': 'https://mastertune.vn/image/catalog/banner/bg.jpg',
};
for (const [k, v] of Object.entries(misc)) {
  const cached = v.replace('/image/', '/image/cache/').replace(/(\.\w+)$/, '-720x500$1');
  const f = await save('public/images/site', k, [v, cached]);
  console.log(k, f ? 'ok' : 'MISSING');
}
