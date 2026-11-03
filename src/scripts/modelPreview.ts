import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { previewDistance } from "./modelPreviewFraming.mjs";

interface Resource { root: THREE.Group; size: THREE.Vector3; }
interface State { element: HTMLElement; image: HTMLImageElement; src: string; resource?: Resource; slot?: Slot; active: boolean; elapsed: number; duration: number; last: number; distance: number; aspect: number; }
interface Slot { renderer: THREE.WebGLRenderer; state?: State; }
const resources = new Map<string, Resource>();
const pending = new Map<string, Promise<Resource>>();
const posters = new Map<string, string>();
const states = new WeakMap<HTMLElement, State>();
const slots: Slot[] = [];
const active = new Set<State>();
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
let timer: ReturnType<typeof setTimeout> | undefined;
let frame = 0, fps = 20, slowFrames = 0, suspended = false;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 100);
const direction = new THREE.Vector3(3.6, 2.5, 4.6).normalize();
scene.add(new THREE.HemisphereLight(0xffffff, 0x202020, 2.4));
const light = new THREE.DirectionalLight(0xffffff, 3.2);
light.position.set(4, 6, 3); scene.add(light);
const solid = new THREE.MeshBasicMaterial({color: 0x252b31, transparent: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1});
const wire = new THREE.MeshBasicMaterial({color: 0xc3d4de, transparent: true, wireframe: true});
function dispose(root: THREE.Object3D) {
 const items = new Set<{dispose(): void}>(), images = new Set<ImageBitmap>();
 root.traverse(node => {
  if (!(node instanceof THREE.Mesh)) return; items.add(node.geometry);
  for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
   items.add(material);
   for (const value of Object.values(material)) if (value instanceof THREE.Texture) {
    items.add(value); if (typeof ImageBitmap !== "undefined" && value.image instanceof ImageBitmap) images.add(value.image);
   }
  }
 });
 items.forEach(item => item.dispose()); images.forEach(image => image.close());
}
function prune() {
 const pinned = new Set([...active].map(state => state.src));
 for (const [src, resource] of resources) {
  if (resources.size <= 6) break;
  if (pinned.has(src)) continue;
  resources.delete(src); dispose(resource.root);
 }
}
async function load(src: string): Promise<Resource> {
 const cached = resources.get(src);
 if (cached) { resources.delete(src); resources.set(src, cached); return cached; }
 const existing = pending.get(src); if (existing) return existing;
 const promise = (async () => {
  let expired = false, timeout: ReturnType<typeof setTimeout> | undefined;
  try {
   const root = src ? await Promise.race([
    new GLTFLoader().loadAsync(src).then(gltf => { if (expired) dispose(gltf.scene); return gltf.scene; }),
    new Promise<never>((_, reject) => { timeout = setTimeout(() => { expired = true; reject(new Error("Model preview timed out")); }, 20000); }),
   ]) : new THREE.Group().add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.25, 2), new THREE.MeshStandardMaterial({color: 0xe8e8e8})));
   root.traverse(node => { if (node instanceof THREE.Mesh && !node.geometry.attributes.normal) node.geometry.computeVertexNormals(); });
   const bounds = new THREE.Box3().setFromObject(root), size = bounds.getSize(new THREE.Vector3());
   const extent = Math.max(size.x, size.y, size.z);
   if (!Number.isFinite(extent) || extent <= 0) { dispose(root); throw new Error("Empty model"); }
   root.position.sub(bounds.getCenter(new THREE.Vector3()));
   const wrapper = new THREE.Group(); wrapper.add(root); wrapper.scale.setScalar(2.5 / extent);
   const resource = {root: wrapper, size: size.multiplyScalar(2.5 / extent)};
   resources.set(src, resource); return resource;
  } finally { clearTimeout(timeout); }
 })();
 pending.set(src, promise);
 try { return await promise; } finally { pending.delete(src); }
}
function makeSlot(): Slot {
 // Fixed small GPU buffer: CSS scales it to the card. No resize/readback per frame.
 const renderer = new THREE.WebGLRenderer({alpha: true, antialias: false, powerPreference: "low-power"});
 renderer.setPixelRatio(1); renderer.setSize(360, 240, false); renderer.setClearColor(0x000000, 0);
 renderer.domElement.className = "model-live-canvas";
 const slot = {renderer} as Slot; slots.push(slot);
 renderer.domElement.addEventListener("webglcontextlost", event => { event.preventDefault(); suspended = true; for (const state of [...active]) stop(state, false); });
 return slot;
}
function render(slot: Slot, resource: Resource, aspect: number, distance: number, progress: number) {
 const renderer = slot.renderer;
 if (renderer.getContext().isContextLost()) return;
 resource.root.rotation.y = progress * Math.PI * 0.65;
 camera.aspect = aspect; camera.position.copy(direction).multiplyScalar(distance); camera.lookAt(0, 0, 0); camera.updateProjectionMatrix();
 scene.add(resource.root);
 const blend = THREE.MathUtils.smoothstep(progress, 0.38, 0.72);
 try {
  scene.overrideMaterial = null; renderer.render(scene, camera);
  if (blend > 0) {
   // All compositing stays on the GPU; no drawImage(WebGL canvas) readback.
   solid.opacity = blend; wire.opacity = blend;
   renderer.autoClear = false; renderer.clearDepth();
   scene.overrideMaterial = solid; renderer.render(scene, camera);
   scene.overrideMaterial = wire; renderer.render(scene, camera);
  }
 } finally { renderer.autoClear = true; scene.overrideMaterial = null; scene.remove(resource.root); }
}
function fit(state: State) {
 const rect = state.element.getBoundingClientRect();
 state.aspect = rect.width && rect.height ? rect.width / rect.height : 1.5;
 if (state.resource) state.distance = previewDistance(state.resource.size, state.aspect, camera.fov, true);
}
const resize = new ResizeObserver(entries => {
 for (const entry of entries) { const state = states.get(entry.target as HTMLElement); if (state) fit(state); }
});
export async function modelThumbnail(src: string, aspect = 1.2): Promise<string> {
 const key = src + "|" + aspect;
 const cached = posters.get(key); if (cached) return cached;
 const resource = await load(src);
 const slot = slots.find(slot => !slot.state) ?? slots[0] ?? makeSlot();
 render(slot, resource, aspect, previewDistance(resource.size, aspect, 42), 0);
 const url = slot.renderer.domElement.toDataURL("image/png"); // Once per model, never in animation loop.
 if (slot.state?.resource) render(slot, slot.state.resource, slot.state.aspect, slot.state.distance, Math.min(1, slot.state.elapsed / slot.state.duration));
 posters.set(key, url); if (posters.size > 48) posters.delete(posters.keys().next().value!);
 prune(); return url;
}
export async function createModelPreview(src: string): Promise<HTMLElement> {
 const element = document.createElement("div"), image = new Image();
 image.src = await modelThumbnail(src, 1.5); image.alt = ""; image.className = "model-still"; element.append(image);
 states.set(element, {element, image, src, active: false, elapsed: 0, duration: 3500, last: 0, distance: 5, aspect: 1.5});
 resize.observe(element); return element;
}
function stop(state: State, snapshot = true) {
 const slot = state.slot;
 if (slot) {
  if (snapshot && !document.hidden && !slot.renderer.getContext().isContextLost()) {
   try { state.image.src = slot.renderer.domElement.toDataURL("image/png"); state.image.classList.add("model-frozen"); } catch { /* Keep initial still. */ }
  }
  slot.renderer.domElement.remove(); slot.state = undefined; state.slot = undefined;
 }
 state.image.hidden = false;
 state.active = false; state.last = 0; active.delete(state);
 if (!active.size) { if (timer !== undefined) clearTimeout(timer); timer = undefined; if (frame) cancelAnimationFrame(frame); frame = 0; }
 prune();
}
export function updateModelPreview(element: HTMLElement, running: boolean, duration?: number) {
 const state = states.get(element); if (!state) return;
 if (duration !== undefined) { state.elapsed = 0; state.duration = Math.max(duration, 1); }
 if (!running || reduced.matches || suspended) { if (state.active) stop(state); return; }
 if (state.active) return;
 const slot = slots.find(slot => !slot.state) ?? (slots.length < 2 ? makeSlot() : undefined);
 if (!slot) return;
 state.active = true; state.slot = slot; slot.state = state; active.add(state);
 void load(state.src).then(resource => {
  if (!state.active || state.slot !== slot) { prune(); return; }
  state.resource = resource; fit(state); state.last = 0;
  element.append(slot.renderer.domElement); schedule();
 }).catch(() => stop(state));
}
function schedule() {
 if (timer !== undefined || frame || !active.size || document.hidden || suspended) return;
 timer = setTimeout(() => { timer = undefined; frame = requestAnimationFrame(tick); }, 1000 / fps);
}
function tick(time: number) {
 frame = 0; if (document.hidden) return;
 const start = performance.now();
 for (const state of [...active]) {
  if (!state.element.isConnected) { stop(state, false); continue; }
  state.elapsed += state.last ? Math.min(time - state.last, 200) : 0; state.last = time;
  if (state.resource && state.slot) {
   render(state.slot, state.resource, state.aspect, state.distance, Math.min(1, state.elapsed / state.duration));
   state.image.hidden = true;
  }
 }
 const cost = performance.now() - start;
 if (cost > 16) slowFrames++; else slowFrames = Math.max(0, slowFrames - 1);
 if (slowFrames >= 8) { if (fps === 20) { fps = 10; slowFrames = 0; } else { suspended = true; for (const state of [...active]) stop(state); } }
 schedule();
}
export function releaseModelPreview(element: HTMLElement) {
 const state = states.get(element); if (!state) return;
 stop(state, false); resize.unobserve(element); states.delete(element);
}
document.addEventListener("visibilitychange", () => {
 if (document.hidden) { if (timer !== undefined) clearTimeout(timer); timer = undefined; if (frame) cancelAnimationFrame(frame); frame = 0; active.forEach(state => { state.last = 0; }); }
 else schedule();
});
reduced.addEventListener("change", () => { for (const state of [...active]) stop(state); });
