// Pull the public dealer list from mastertune.vn into src/data/dealers.json.
// Regional pages either list dealers directly or link to area pages (khu-vuc-*.html).
import { writeFile } from 'node:fs/promises';

const REGIONS = { 'mien-bac': 'Miền Bắc', 'mien-trung': 'Miền Trung', 'mien-nam': 'Miền Nam' };
const decode = (s) => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
const PROVINCES = ['Hà Nội', 'Hải Phòng', 'Quảng Ninh', 'Bắc Ninh', 'Bắc Giang', 'Hải Dương', 'Hưng Yên', 'Thái Bình', 'Nam Định', 'Ninh Bình', 'Hà Nam', 'Vĩnh Phúc', 'Phú Thọ', 'Thái Nguyên', 'Tuyên Quang', 'Lào Cai', 'Yên Bái', 'Lạng Sơn', 'Cao Bằng', 'Hà Giang', 'Sơn La', 'Điện Biên', 'Lai Châu', 'Hòa Bình', 'Thanh Hóa', 'Nghệ An', 'Hà Tĩnh', 'Quảng Bình', 'Quảng Trị', 'Thừa Thiên Huế', 'Huế', 'Đà Nẵng', 'Quảng Nam', 'Quảng Ngãi', 'Bình Định', 'Phú Yên', 'Khánh Hòa', 'Ninh Thuận', 'Bình Thuận', 'Kon Tum', 'Gia Lai', 'Đắk Lắk', 'Đắk Nông', 'Lâm Đồng', 'Hồ Chí Minh', 'Bình Dương', 'Đồng Nai', 'Bà Rịa', 'Vũng Tàu', 'Tây Ninh', 'Bình Phước', 'Long An', 'Tiền Giang', 'Bến Tre', 'Vĩnh Long', 'Trà Vinh', 'Cần Thơ', 'Hậu Giang', 'Sóc Trăng', 'An Giang', 'Đồng Tháp', 'Kiên Giang', 'Bạc Liêu', 'Cà Mau'];
const fold = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');

function provinceOf(addr) {
  const a = fold(addr);
  if (/tp\.? ?hcm|sai gon|thu duc|ho chi minh/.test(a)) return 'TP. Hồ Chí Minh';
  let best = null;
  let pos = -1;
  for (const p of PROVINCES) {
    const i = a.lastIndexOf(fold(p));
    if (i > pos) { pos = i; best = p; }
  }
  if (best === 'Huế') return 'Thừa Thiên Huế';
  if (best === 'Bà Rịa' || best === 'Vũng Tàu') return 'Bà Rịa - Vũng Tàu';
  if (best === 'Hồ Chí Minh') return 'TP. Hồ Chí Minh';
  return best ?? '';
}

const toLines = (html) => decode(html.slice(html.indexOf('breadcrumb'))
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/<(br|\/p|\/li|\/tr|\/h\d|\/div|\/td)[^>]*>/gi, '\n')
  .replace(/<[^>]+>/g, ''))
  .split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter((l) => l && !/[{};]$|^[#.@]/.test(l));

const get = async (url) => (await fetch(url)).text();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const dealers = [];
const seen = new Set();
function parse(html, region) {
  const lines = toLines(html);
  for (let i = 1; i < lines.length - 1; i++) {
    const phone = lines[i].match(/^S[ĐD]T\s*:?\s*(.+)$/i);
    if (!phone) continue;
    const addr = lines[i + 1].match(/^Địa chỉ\s*:?\s*(.+)$/i);
    const name = lines[i - 1];
    if (!addr || /:/.test(name)) continue;
    const key = `${name}|${phone[1]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const address = addr[1].replace(/\.$/, '').trim();
    dealers.push({ name, phone: phone[1].trim(), address, province: provinceOf(address), region });
  }
}

for (const [slug, region] of Object.entries(REGIONS)) {
  const html = await get(`https://mastertune.vn/dai-ly-${slug}.html`);
  parse(html, region);
  const body = html.slice(html.indexOf('breadcrumb'), html.indexOf('FANPAGE'));
  const areas = [...new Set([...body.matchAll(/href="(?:https:\/\/mastertune\.vn\/)?(khu-vuc-[^"]+\.html)"/g)].map((m) => m[1]))];
  for (const a of areas) {
    parse(await get(`https://mastertune.vn/${a}`), region);
    await sleep(250);
  }
}

await writeFile('src/data/dealers.json', JSON.stringify(dealers, null, 2));
console.log('dealers', dealers.length);
console.table(Object.entries(dealers.reduce((m, d) => ((m[d.province || '?'] = (m[d.province || '?'] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1]));
