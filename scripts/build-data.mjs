// Turn raw scraped pages (data-raw/products.json) into a clean catalog: src/data/products.json
// Keeps specs only (key: value lines, install position, warranty) — no marketing copy.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const raw = JSON.parse(await readFile('data-raw/products.json', 'utf8'));

const BRANDS = {
  steg: { name: 'STEG', origin: 'Italia' },
  dls: { name: 'DLS', origin: 'Thụy Điển' },
  audiocircle: { name: 'Audiocircle', origin: 'Đức' },
  abyss: { name: 'ABYSS', origin: '' },
  resolut: { name: 'Resolut', origin: '' },
  'ks-audio': { name: 'KS Audio', origin: '', aliases: ['ksaudio', 'kingsub'] },
  vinsub: { name: 'Vinsub', origin: '' },
  harrison: { name: 'Harrison', origin: '' },
  clio: { name: 'CLIO', origin: '' },
  'golden-acoustics': { name: 'Golden Acoustics', origin: '' },
  bos: { name: 'BOS', origin: '' },
  nrg: { name: 'NRG', origin: 'Hàn Quốc' },
};

const CATEGORIES = [
  ['dsp', 'Amply / DSP', /dsp|bộ xử lý/i],
  ['sub-dien', 'Sub điện', /sub điện|sub gầm|active sub|acw\d/i],
  ['subwoofer', 'Loa subwoofer', /sub ?woofer|sub hơi|loa sub/i],
  ['amply', 'Amply', /amply|amplifier|ampli\b/i],
  ['mid-treble', 'Loa mid / treble', /mid-?treb|treble|tweeter|midrange|mid-range|trung tâm|\bmid\b/i],
  ['loa-canh', 'Loa cánh', /loa cánh|2[ -]?way|3[ -]?way|component|đồng trục|coaxial|loa/i],
  ['phu-kien', 'Phụ kiện', /tụ|capacitor|dây|cáp|cable/i],
];

const slugify = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function brandOf(p) {
  const hay = `${p.breadcrumb.slice(2).join(' ')} ${p.name}`.toLowerCase();
  for (const [slug, b] of Object.entries(BRANDS)) {
    if ([b.name, ...(b.aliases ?? [])].some((n) => hay.includes(n.toLowerCase()))) return slug;
  }
  return null;
}
function categoryOf(p) {
  const crumb = p.breadcrumb.slice(2, -1).join(' ');
  const name = p.name;
  if (/tụ|capacitor/i.test(name)) return 'phu-kien';
  for (const [slug, , re] of CATEGORIES) if (re.test(crumb)) return slug;
  for (const [slug, , re] of CATEGORIES) if (re.test(name)) return slug;
  return 'phu-kien';
}

// Canonical Vietnamese labels so the same spec lines up across brands (compare table, cards).
const KEY_ALIASES = [
  [/^v?công suất( loa| định mức| rms)?$|^(rms power|nominal power|output power rating|rms \(4 ?ohm\))$/i, 'Công suất'],
  [/^(maximum power|max power|công suất (tối đa|cực đại|max))$/i, 'Công suất tối đa'],
  [/^(tr[ợở] kháng|impedance|nom\.? impedance|nominal impedance)$/i, 'Trở kháng'],
  [/^(độ nhạy|sensitivity( \(.*\))?)$/i, 'Độ nhạy'],
  [/^(dải tần( hoạt động)?|tần số (hoạt động|đáp ứng)|frequency (range|response))$/i, 'Dải tần'],
  [/^(trọng lượng|weight)$/i, 'Trọng lượng'],
  [/^(kích thước|kich thước|dimensions?)$/i, 'Kích thước'],
  [/^(số kênh|channels?|number of channels|số lượng kênh)$/i, 'Số kênh'],
  [/^(signal-to-noise ratio|s\/n rati?on? .*|tỷ lệ tín hiệu\/nhiễu)$/i, 'Tỷ lệ tín hiệu/nhiễu'],
];
const canonKey = (k) => { for (const [re, label] of KEY_ALIASES) if (re.test(k.trim())) return label; return k; };

const SKIP_KEY = /^(hãy tham gia|đăng ký|like|lưu ý|chú ý|xem thêm|tham khảo|liên hệ|hotline|website|link)/i;
function extract(desc) {
  const lines = desc.split('\n').map((l) => l.trim()).filter(Boolean);
  const specs = [];
  let install = '';
  let warranty = '';
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^vị trí lắp đặt/i.test(l)) {
      const inline = l.split(/[:：]/)[1]?.trim();
      install = inline || lines[i + 1] || '';
      continue;
    }
    const w = l.match(/bảo hành\s+(\d+\s*(năm|tháng))/i);
    if (w && !warranty) warranty = w[1];
    const m = l.match(/^([^:：]{2,48})[:：]\s*(.{1,160})$/);
    if (!m) continue;
    const k = m[1].replace(/^[-•*+\s]+/, '').trim();
    const v = m[2].trim();
    if (!v || SKIP_KEY.test(k) || /https?:/.test(v) || k.split(' ').length > 7) continue;
    if (/^thông số|^thông tin/i.test(k)) continue;
    const key = canonKey(k);
    specs.push({ k: key.charAt(0).toUpperCase() + key.slice(1), v });
  }
  // de-duplicate same key/value pairs
  const seen = new Set();
  return {
    specs: specs.filter((s) => { const id = `${s.k}|${s.v}`; if (seen.has(id)) return false; seen.add(id); return true; }).slice(0, 24),
    install: install.replace(/\.$/, ''),
    warranty,
  };
}

const products = [];
for (const p of raw) {
  const brand = brandOf(p);
  if (!brand) { console.warn('no brand:', p.name); continue; }
  const slug = p.url.split('/').pop().replace(/\.html$/, '');
  const image = `/images/p/${slug}.webp`;
  if (!existsSync(`public${image}`)) console.warn('missing image', slug);
  const series = p.breadcrumb.slice(2, -1).join(' › ');
  products.push({
    slug,
    name: p.name.replace(/\s+/g, ' ').trim(),
    brand,
    category: categoryOf(p),
    series,
    image,
    ...extract(p.description),
    source: p.url,
  });
}

const categories = CATEGORIES.map(([slug, label]) => ({ slug, label, count: products.filter((p) => p.category === slug).length }));
const brands = Object.entries(BRANDS).map(([slug, b]) => ({
  slug, ...b,
  logo: existsSync(`public/images/brands/${slug}.webp`) ? `/images/brands/${slug}.webp` : null,
  count: products.filter((p) => p.brand === slug).length,
})).filter((b) => b.count > 0);

await mkdir('src/data', { recursive: true });
await writeFile('src/data/products.json', JSON.stringify(products, null, 2));
await writeFile('src/data/categories.json', JSON.stringify(categories, null, 2));
await writeFile('src/data/brands.json', JSON.stringify(brands, null, 2));
console.log('products', products.length);
console.table(categories);
console.table(brands.map(({ slug, count, logo }) => ({ slug, count, logo: !!logo })));
console.log('no specs:', products.filter((p) => !p.specs.length).length);
