// Collect raw product data from the current mastertune.vn site (OpenCart).
// Output: data-raw/products.json — raw text; specs are extracted in a later step.
import { writeFile } from 'node:fs/promises';

const BASE = 'https://mastertune.vn';
const CATEGORY_PAGES = ['/steg', '/dls', '/audiocircle', '/amply'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const decode = (s) => s
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
const text = (html) => decode(html
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/<(br|\/p|\/li|\/h\d|\/tr|\/div)[^>]*>/gi, '\n')
  .replace(/<[^>]+>/g, ''))
  .split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');

async function get(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (site migration script)' } });
      if (res.ok) return await res.text();
    } catch {}
    await sleep(1000 * (i + 1));
  }
  throw new Error('fetch failed ' + url);
}

const urls = new Map();
for (const page of CATEGORY_PAGES) {
  const html = await get(`${BASE}${page}?limit=500`);
  for (const m of html.matchAll(/<div class="product-thumb[\s\S]*?<h3><a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
    const url = m[1].replace(/\?.*$/, '');
    if (!urls.has(url)) urls.set(url, decode(m[2]).trim());
  }
  await sleep(400);
}
console.log('product urls:', urls.size);

const products = [];
let i = 0;
for (const [url, name] of urls) {
  i++;
  const html = await get(url);
  const crumbs = [...html.matchAll(/<ul class="breadcrumb"[^>]*>([\s\S]*?)<\/ul>/g)][0]?.[1] ?? '';
  const breadcrumb = [...crumbs.matchAll(/<a[^>]*>([\s\S]*?)<\/a>/g)].map((c) => text(c[1]));
  const descHtml = html.match(/id="tab-description"[^>]*>([\s\S]*?)<div class="tab-pane|id="tab-description"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/);
  const description = text(descHtml?.[1] ?? descHtml?.[2] ?? '');
  const images = [...new Set([...html.matchAll(/href="(https:\/\/mastertune\.vn\/image\/[^"]+\.(?:jpe?g|png|webp))"[^>]*class="thumbnail/gi)].map((m) => m[1]))];
  const ogImage = html.match(/property="og:image" content="([^"]+)"/)?.[1];
  products.push({ url, name, breadcrumb, images: images.length ? images : (ogImage ? [ogImage] : []), description });
  if (i % 20 === 0) console.log(`${i}/${urls.size}`);
  await sleep(300);
}
await writeFile(new URL('../data-raw/products.json', import.meta.url), JSON.stringify(products, null, 2));
console.log('saved', products.length);
