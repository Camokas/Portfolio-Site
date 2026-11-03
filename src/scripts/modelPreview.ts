import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { previewDistance } from "./modelPreviewFraming.mjs";

// One GPU context for every card. Only visible, selected slides animate.
interface Resource { root: THREE.Group; size: THREE.Vector3; }
interface State { canvas: HTMLCanvasElement; src: string; resource?: Resource; active: boolean; elapsed: number; duration: number; last: number; aspect: number; animated: boolean; }
const cache = new Map<string, Promise<Resource>>();
const resources = new Map<string, Resource>();
const states = new WeakMap<HTMLElement, State>();
const active = new Set<State>();
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
let renderer: THREE.WebGLRenderer | undefined;
let frame = 0;
let lastFrame = 0;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 100);
const direction = new THREE.Vector3(3.6, 2.5, 4.6).normalize();
scene.add(new THREE.HemisphereLight(0xffffff, 0x202020, 2.4));
const light = new THREE.DirectionalLight(0xffffff, 3.2);
light.position.set(4, 6, 3); scene.add(light);
const solid = new THREE.MeshBasicMaterial({color: 0x252b31, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1});
const wire = new THREE.MeshBasicMaterial({color: 0xc3d4de, wireframe: true});

function dispose(root: THREE.Object3D) {
  const items = new Set<{dispose(): void}>(); const bitmaps = new Set<ImageBitmap>();
  root.traverse(node => {
    if (!(node instanceof THREE.Mesh)) return;
    items.add(node.geometry);
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      items.add(material);
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) {
        items.add(value); if (typeof ImageBitmap !== "undefined" && value.image instanceof ImageBitmap) bitmaps.add(value.image);
      }
    }
  });
  items.forEach(item => item.dispose()); bitmaps.forEach(image => image.close());
}
function prune() {
  const pinned = new Set([...active].map(state => state.src));
  for (const [src, resource] of resources) {
    if (resources.size <= 4) break;
    if (pinned.has(src)) continue;
    resources.delete(src); cache.delete(src); dispose(resource.root);
  }
}
async function load(src: string): Promise<Resource> {
  const existing = cache.get(src);
  if (existing) { const value = resources.get(src); if (value) { resources.delete(src); resources.set(src, value); } return existing; }
  const result = (async () => {
    let expired = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const root = src ? await Promise.race([
        new GLTFLoader().loadAsync(src).then(gltf => { if (expired) dispose(gltf.scene); return gltf.scene; }),
        new Promise<never>((_, reject) => { timeout = setTimeout(() => { expired = true; reject(new Error("Model preview timed out")); }, 20000); }),
      ]) : new THREE.Group().add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.25, 2), new THREE.MeshStandardMaterial({color: 0xe8e8e8})));
      root.traverse(node => { if (node instanceof THREE.Mesh && !node.geometry.attributes.normal) node.geometry.computeVertexNormals(); });
      const bounds = new THREE.Box3().setFromObject(root);
      const size = bounds.getSize(new THREE.Vector3());
      const extent = Math.max(size.x, size.y, size.z);
      if (!Number.isFinite(extent) || extent <= 0) { dispose(root); throw new Error("Empty model"); }
      root.position.sub(bounds.getCenter(new THREE.Vector3()));
      const wrapper = new THREE.Group(); wrapper.add(root); wrapper.scale.setScalar(2.5 / extent);
      const resource = {root: wrapper, size: size.multiplyScalar(2.5 / extent)};
      resources.set(src, resource); return resource;
    } finally { clearTimeout(timeout); }
  })();
  cache.set(src, result);
  void result.catch(() => { cache.delete(src); });
  return result;
}
function gpu() {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({alpha: true, antialias: true});
    renderer.setPixelRatio(1); renderer.setClearColor(0x000000, 0);
    renderer.domElement.addEventListener("webglcontextlost", event => { event.preventDefault(); if (frame) cancelAnimationFrame(frame); frame = 0; });
    renderer.domElement.addEventListener("webglcontextrestored", schedule);
  }
  return renderer;
}
function draw(state: State) {
  const resource = state.resource; if (!resource) return;
  const gpuRenderer = gpu(); if (gpuRenderer.getContext().isContextLost()) return;
  const rect = state.canvas.getBoundingClientRect();
  const aspect = rect.width && rect.height ? rect.width / rect.height : state.aspect;
  const width = Math.min(640, Math.max(240, Math.round(rect.width || 480)));
  const height = Math.max(1, Math.round(width / aspect));
  if (state.canvas.width !== width || state.canvas.height !== height) { state.canvas.width = width; state.canvas.height = height; }
  gpuRenderer.setSize(width, height, false);
  const progress = Math.min(1, state.elapsed / state.duration);
  resource.root.rotation.y = reduced.matches ? 0 : progress * Math.PI * 0.65;
  camera.aspect = aspect;
  camera.position.copy(direction).multiplyScalar(previewDistance(resource.size, aspect, camera.fov, state.animated));
  camera.lookAt(0, 0, 0); camera.updateProjectionMatrix();
  scene.add(resource.root);
  const context = state.canvas.getContext("2d")!;
  context.clearRect(0, 0, width, height);
  const t = reduced.matches ? 0 : THREE.MathUtils.smoothstep(progress, 0.38, 0.72);
  try {
    if (t < 1) {
      scene.overrideMaterial = null; gpuRenderer.render(scene, camera);
      context.globalAlpha = 1 - t; context.drawImage(gpuRenderer.domElement, 0, 0);
    }
    if (t > 0) {
      scene.overrideMaterial = solid; gpuRenderer.render(scene, camera);
      scene.overrideMaterial = wire; gpuRenderer.autoClear = false; gpuRenderer.render(scene, camera);
      gpuRenderer.autoClear = true;
      context.globalAlpha = t; context.drawImage(gpuRenderer.domElement, 0, 0);
    }
  } finally {
    context.globalAlpha = 1; gpuRenderer.autoClear = true; scene.overrideMaterial = null; scene.remove(resource.root);
  }
}
function schedule() { if (!frame && active.size && !document.hidden) frame = requestAnimationFrame(tick); }
function tick(time: number) {
  frame = 0;
  if (document.hidden) return;
  if (time - lastFrame >= 1000 / 24) {
    lastFrame = time;
    for (const state of active) {
      if (!state.canvas.isConnected) { active.delete(state); continue; }
      if (!reduced.matches) state.elapsed += state.last ? Math.min(time - state.last, 150) : 0;
      state.last = time;
      if (state.resource) draw(state);
    }
  }
  if (!reduced.matches) schedule();
}
export async function createModelPreview(src: string, aspect = 16 / 9, animated = true): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  const state: State = {canvas, src, active: false, elapsed: 0, duration: 3500, last: 0, aspect, animated};
  state.resource = await load(src);
  states.set(canvas, state); draw(state); prune();
  return canvas;
}
export function updateModelPreview(element: HTMLElement, running: boolean, duration?: number) {
  const state = states.get(element); if (!state) return;
  if (duration !== undefined) { state.elapsed = 0; state.duration = Math.max(duration, 1); }
  if (!running) { state.active = false; state.last = 0; active.delete(state); if (!active.size && frame) { cancelAnimationFrame(frame); frame = 0; } prune(); return; }
  if (state.active) return;
  state.active = true; state.last = 0; active.add(state);
  if (resources.get(state.src) !== state.resource) {
    state.resource = undefined;
    void load(state.src).then(resource => { if (!state.active) { prune(); return; } state.resource = resource; draw(state); prune(); schedule(); }).catch(() => { state.active = false; active.delete(state); });
  } else draw(state);
  schedule();
}
export function releaseModelPreview(element: HTMLElement) {
  updateModelPreview(element, false); states.delete(element);
  if (element instanceof HTMLCanvasElement) { element.width = 1; element.height = 1; }
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) { if (frame) cancelAnimationFrame(frame); frame = 0; active.forEach(state => { state.last = 0; }); }
  else schedule();
});
reduced.addEventListener("change", () => { for (const state of active) { state.last = 0; draw(state); } schedule(); });
