// Prepare "Generic Sedan Car" by Márcio Meireles (CC BY 4.0) for the web:
// replace textures that are missing from the download with flat studio materials,
// then the optimise step (gltf-transform) packs it into a Draco-compressed GLB.
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
const SRC = 'data-raw/sedan-src';
const OUT = 'data-raw/sedan-clean';
mkdirSync(`${OUT}/textures`, { recursive: true });
const g = JSON.parse(readFileSync(`${SRC}/scene.gltf`, 'utf8'));

const have = g.images.map((im) => existsSync(`${SRC}/${decodeURIComponent(im.uri)}`));
const texOk = (t) => t != null && have[g.textures[t.index].source];

// flat looks for parts whose textures are missing (linear RGB)
const FLAT = {
  interior: { c: [0.035, 0.05, 0.08], r: 0.75, m: 0 },
  'tire-low': { c: [0.012, 0.012, 0.012], r: 0.92, m: 0 },
  engine: { c: [0.03, 0.03, 0.03], r: 0.6, m: 0.4 },
  'car-bottom': { c: [0.015, 0.015, 0.015], r: 0.9, m: 0 },
  'suspension-pipe-brakes': { c: [0.05, 0.05, 0.05], r: 0.5, m: 0.6 },
  'Metal_-_Chrome_-_Rough': { c: [0.6, 0.6, 0.62], r: 0.25, m: 1 },
  'honeycomb-grill-pattern': { c: [0.01, 0.01, 0.01], r: 0.6, m: 0.2 },
  'honeycomb-grill-pattern-small': { c: [0.01, 0.01, 0.01], r: 0.6, m: 0.2 },
  'MetalStainlessSteelBrushedElongated005_2K': { c: [0.45, 0.46, 0.48], r: 0.35, m: 1 },
  'MetalStainlessSteelBrushedElongated005_2K.001': { c: [0.45, 0.46, 0.48], r: 0.35, m: 1 },
  'Car_Paint_-_All_Colors': { c: [0.01, 0.013, 0.018], r: 0.3, m: 0.5 },
};
for (const m of g.materials) {
  const pbr = (m.pbrMetallicRoughness ??= {});
  const flat = FLAT[m.name];
  for (const key of ['baseColorTexture', 'metallicRoughnessTexture']) if (pbr[key] && (!texOk(pbr[key]) || flat)) delete pbr[key];
  for (const key of ['normalTexture', 'occlusionTexture', 'emissiveTexture']) if (m[key] && !texOk(m[key])) delete m[key];
  if (flat) { pbr.baseColorFactor = [...flat.c, 1]; pbr.roughnessFactor = flat.r; pbr.metallicFactor = flat.m; }
}
// drop unreferenced textures/images so the optimiser doesn't look for missing files
const used = new Set(JSON.stringify(g.materials).match(/"index":\d+/g)?.map((s) => +s.split(':')[1]));
const texMap = new Map(); const newTex = []; const imgMap = new Map(); const newImg = [];
g.textures.forEach((t, i) => {
  if (!used.has(i)) return;
  if (!imgMap.has(t.source)) { imgMap.set(t.source, newImg.length); newImg.push(g.images[t.source]); }
  texMap.set(i, newTex.length); newTex.push({ ...t, source: imgMap.get(t.source) });
});
const fix = (o) => { for (const k in o) { if (k === 'index' && typeof o[k] === 'number' && /Texture$/.test(fix.parent)) o[k] = texMap.get(o[k]); else if (o[k] && typeof o[k] === 'object') { const p = fix.parent; fix.parent = k; fix(o[k]); fix.parent = p; } } };
for (const m of g.materials) { fix.parent = ''; fix(m); }
g.textures = newTex; g.images = newImg;
if (!g.textures.length) { delete g.textures; delete g.images; delete g.samplers; }
g.asset.copyright = '"Generic Sedan Car" by Márcio Meireles, CC BY 4.0 (sketchfab.com/3d-models/generic-sedan-car-58c33766470d46e7b2aed542650494e5). Modified: flat materials, compressed.';
writeFileSync(`${OUT}/scene.gltf`, JSON.stringify(g));
copyFileSync(`${SRC}/scene.bin`, `${OUT}/scene.bin`);
for (const im of g.images ?? []) copyFileSync(`${SRC}/${decodeURIComponent(im.uri)}`, `${OUT}/${decodeURIComponent(im.uri)}`);
copyFileSync(`${SRC}/license.txt`, `${OUT}/license.txt`);
console.log('images kept:', (g.images ?? []).map((i) => i.uri));
