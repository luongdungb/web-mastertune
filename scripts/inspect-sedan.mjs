import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { getBounds } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'draco3d.decoder': await draco3d.createDecoderModule() });
const doc = await io.read('public/models/sedan.glb');
const scene = doc.getRoot().getDefaultScene();
const f = (v) => v.map((x) => x.toFixed(2)).join(',');
const all = getBounds(scene); console.log('ALL', f(all.min), '|', f(all.max));
const want = /seat|door-front-l|door-rear-l|dashboard|glass|roof|trunk|boot|rear-shelf|pillar|body|windshield|console|column|speaker|floor|hood|trunk/i;
for (const n of doc.getRoot().listNodes()) {
  if (!want.test(n.getName())) continue;
  const b = getBounds(n); if (!isFinite(b.min[0])) continue;
  console.log(n.getName().padEnd(40), f(b.min), '|', f(b.max), n.getMesh() ? '' : '(group)');
}
console.log('materials:', doc.getRoot().listMaterials().map((m) => m.getName()).join(', '));
