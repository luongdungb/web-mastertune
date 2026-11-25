// Pack the cleaned sedan into one Draco-compressed GLB for the website.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, draco, resample } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(),
  'draco3d.encoder': await draco3d.createEncoderModule(),
});
const doc = await io.read('data-raw/sedan-clean/scene.gltf');
await doc.transform(dedup(), prune(), resample(), weld(), draco({ quantizePosition: 14 }));
await io.write('public/models/sedan.glb', doc);
const r = doc.getRoot();
console.log('meshes', r.listMeshes().length, 'materials', r.listMaterials().length, 'skins', r.listSkins().length, 'animations', r.listAnimations().length);
