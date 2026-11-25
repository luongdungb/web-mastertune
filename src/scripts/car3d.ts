// Real-time 3D car for the "Âm thanh, từng vị trí" section.
// Loaded on demand (dynamic import) so three.js never blocks the first paint.
import {
  ACESFilmicToneMapping, CanvasTexture, Color, DirectionalLight, DoubleSide, Mesh, MeshBasicMaterial, MeshPhysicalMaterial,
  PerspectiveCamera, Plane, PlaneGeometry, PointLight, PMREMGenerator, Raycaster, Scene, SRGBColorSpace, Spherical, Vector3, WebGLRenderer,
  type Material, type MeshStandardMaterial, type Object3D,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

type SpotDef = { id: string; pos: [number, number, number] };

// Model: "Generic Sedan Car" by Márcio Meireles (CC BY 4.0). +Z = front, +X = driver side, +Y = up, metres.
const MODEL_URL = '/models/sedan.glb';
const TARGET = new Vector3(0, 0.55, 0);
const CAR_LENGTH = 5.0;
const CAR_WIDTH = 2.2;               // incl. mirrors
const CUT_HEIGHT = 1.2;              // roof is cut away above the window line so the cabin shows from above
const DEFAULT_PHI = 0.22;            // angle from straight overhead
const DEFAULT_THETA = Math.PI / 2;   // camera on the car's side: car reads horizontally, nose to the left

export async function mountCar(stage: HTMLElement, host: HTMLElement, getActive: () => string) {
  const spots: SpotDef[] = JSON.parse(stage.dataset.spots ?? '[]');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.localClippingEnabled = true;
  host.appendChild(renderer.domElement);

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.6;

  const key = new DirectionalLight(new Color('#dfe8ff'), 1.4);
  key.position.set(-2, 6, 3);
  scene.add(key);
  // soft cabin light so the seats read from above, like a studio cutaway render
  const cabin = new PointLight(new Color('#b8ccff'), 3, 3.6, 1.6);
  cabin.position.set(0, 1.25, 0);
  scene.add(cabin);

  const camera = new PerspectiveCamera(28, 1, 0.1, 100);

  // --- model
  const draco = new DRACOLoader().setDecoderPath('/vendor/draco/');
  const loader = new GLTFLoader().setDRACOLoader(draco);
  const gltf = await loader.loadAsync(MODEL_URL);
  const car = gltf.scene;

  const cut = [new Plane(new Vector3(0, -1, 0), CUT_HEIGHT)];
  const paint = new MeshPhysicalMaterial({
    name: 'paint', color: new Color('#121821'), metalness: 0.5, roughness: 0.3,
    clearcoat: 1, clearcoatRoughness: 0.05, side: DoubleSide, clippingPlanes: cut,
  });
  const occluders: Object3D[] = [];
  car.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh) return;
    let isGlass = false;
    const fix = (m: Material): Material => {
      if (m.name === 'Car_Paint_-_All_Colors') return paint;
      if (/Glass/i.test(m.name) && !/Red/i.test(m.name)) {
        const g = m as MeshStandardMaterial;
        g.transparent = true;
        g.opacity = 0.12;
        g.color = new Color('#9fb3c8');
        g.roughness = 0.04;
        g.metalness = 0;
        g.depthWrite = false;
        isGlass = true;
      }
      m.clippingPlanes = cut;
      m.side = DoubleSide; // inner faces stay solid where the roof is cut
      return m;
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(fix) : fix(mesh.material);
    if (!isGlass) occluders.push(mesh);
  });
  scene.add(car);

  // soft contact shadow under the car
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 256;
  const ctx = shadowCanvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
  grad.addColorStop(0, 'rgba(0,0,0,0.85)');
  grad.addColorStop(0.55, 'rgba(0,0,0,0.45)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const shadow = new Mesh(new PlaneGeometry(CAR_WIDTH * 1.35, CAR_LENGTH * 1.2), new MeshBasicMaterial({ map: new CanvasTexture(shadowCanvas), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, 0.002, 0);
  scene.add(shadow);

  // --- controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(TARGET);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.55;
  controls.minPolarAngle = 0.12;
  controls.maxPolarAngle = 1.25;
  renderer.domElement.style.touchAction = 'pan-y'; // vertical swipes still scroll the page on phones

  let radius = 8;
  const fit = () => {
    const w = host.clientWidth;
    const h = host.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const vfov = (camera.fov * Math.PI) / 180;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    // car length must fit across, car width must fit vertically
    // wide screens keep side gutters free for the annotation card
    const share = matchMedia('(min-width: 1100px)').matches ? 0.97 : 0.68;
    const byWidth = (CAR_LENGTH * share) / Math.tan(hfov / 2);
    const byHeight = (CAR_WIDTH * 0.85) / Math.tan(vfov / 2);
    radius = Math.max(byWidth, byHeight);
    camera.updateProjectionMatrix();
  };
  fit();

  const sph = new Spherical(radius, DEFAULT_PHI, DEFAULT_THETA);
  const placeCamera = (s: Spherical) => {
    camera.position.setFromSpherical(s).add(TARGET);
    camera.lookAt(TARGET);
  };
  // intro: settle down from overhead — the section's single orchestrated moment
  const introStart = performance.now();
  const introMs = reduceMotion ? 0 : 1800;
  const from = new Spherical(radius * 1.18, 0.14, DEFAULT_THETA - 0.5);
  placeCamera(reduceMotion ? sph : from);
  controls.update();
  let introDone = reduceMotion;

  new ResizeObserver(() => {
    fit();
    if (introDone) {
      const offset = camera.position.clone().sub(TARGET).setLength(radius);
      camera.position.copy(TARGET).add(offset);
    }
  }).observe(host);

  // --- hotspots + callout
  const buttons = new Map<string, HTMLElement>();
  stage.querySelectorAll<HTMLElement>('.spot[data-spot]').forEach((b) => { buttons.set(b.dataset.spot!, b); b.hidden = false; });
  const callouts = new Map<string, HTMLElement>();
  stage.querySelectorAll<HTMLElement>('.callout[data-info]').forEach((c) => callouts.set(c.dataset.info!, c));
  const world = spots.map((s) => ({ id: s.id, v: new Vector3(...s.pos) }));
  const tmp = new Vector3();
  const ray = new Raycaster();
  const occluded = new Set<string>();
  const stackedQuery = matchMedia('(max-width: 1099px)'); // callout sits under the car below this width
  const leader = stage.querySelector<SVGLineElement>('[data-leader] line');

  const updateOcclusion = () => {
    occluded.clear();
    for (const s of world) {
      const dir = tmp.copy(s.v).sub(camera.position);
      const dist = dir.length();
      ray.set(camera.position, dir.normalize());
      ray.far = dist - 0.06;
      if (ray.intersectObjects(occluders, false).length) occluded.add(s.id);
    }
  };

  const updateOverlay = () => {
    const w = host.clientWidth;
    const h = host.clientHeight;
    const hostTop = host.offsetTop;
    for (const s of world) {
      tmp.copy(s.v).project(camera);
      const x = ((tmp.x + 1) / 2) * w;
      const y = ((1 - tmp.y) / 2) * h + hostTop;
      const b = buttons.get(s.id);
      if (b) {
        b.style.transform = `translate(${x}px, ${y}px)`;
        b.classList.toggle('occluded', occluded.has(s.id));
      }
      if (s.id === getActive() && !stackedQuery.matches) {
        // annotation in the side gutter: front points on the left, rear points on the right
        const c = callouts.get(s.id);
        if (c) {
          const cw = c.offsetWidth;
          const ch = c.offsetHeight;
          const onLeft = x < w / 2;
          const left = onLeft ? 24 : w - cw - 24;
          const top = Math.min(Math.max(y - ch / 2, hostTop + 8), hostTop + h - ch - 8);
          c.style.transform = `translate(${left}px, ${top}px)`;
          if (leader) {
            const ex = onLeft ? left + cw : left;
            const ey = Math.min(Math.max(y, top + 20), top + ch - 20);
            leader.setAttribute('x1', String(ex));
            leader.setAttribute('y1', String(ey));
            leader.setAttribute('x2', String(x));
            leader.setAttribute('y2', String(y));
          }
        }
      }
    }
  };

  // --- loop (only while the section is on screen)
  let visible = true;
  let frame = 0;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) loop(); }).observe(stage);
  let running = false;
  const loop = () => {
    if (running) return;
    running = true;
    const tick = (now: number) => {
      if (!visible) { running = false; return; }
      if (!introDone) {
        const t = Math.min((now - introStart) / introMs, 1);
        const e = 1 - Math.pow(1 - t, 3);
        placeCamera(new Spherical(
          from.radius + (radius - from.radius) * e,
          from.phi + (DEFAULT_PHI - from.phi) * e,
          from.theta + (DEFAULT_THETA - from.theta) * e,
        ));
        if (t >= 1) introDone = true;
      }
      controls.update();
      if (frame++ % 8 === 0) updateOcclusion();
      renderer.render(scene, camera);
      updateOverlay();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  window.addEventListener('mt:spot', () => updateOverlay());
  loop();
}
