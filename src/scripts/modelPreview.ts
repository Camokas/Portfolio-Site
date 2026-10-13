// Render each model once per page, serially. Cards retain only a PNG, not a WebGL scene.
const cache = new Map<string, Promise<string>>();
let queue: Promise<unknown> = Promise.resolve();

export function modelPreview(src: string): Promise<string> {
	const existing = cache.get(src);
	if (existing) return existing;
	const result = queue.then(() => renderPreview(src));
	queue = result.catch(() => undefined);
	cache.set(src, result);
	return result;
}

async function renderPreview(src: string): Promise<string> {
	const THREE = await import("three");
	const scene = new THREE.Scene();
	let renderer: import("three").WebGLRenderer | undefined;
	const dispose = (root: import("three").Object3D) => {
		const resources = new Set<{ dispose(): void }>();
		const bitmaps = new Set<ImageBitmap>();
		root.traverse((node) => {
			if (!(node instanceof THREE.Mesh || node instanceof THREE.LineSegments || node instanceof THREE.Points)) return;
			resources.add(node.geometry);
			for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
				resources.add(material);
				for (const value of Object.values(material)) {
					if (!(value instanceof THREE.Texture)) continue;
					resources.add(value);
					if (typeof ImageBitmap !== "undefined" && value.image instanceof ImageBitmap) bitmaps.add(value.image);
				}
			}
		});
		resources.forEach((resource) => resource.dispose());
		bitmaps.forEach((bitmap) => bitmap.close());
	};
	try {
		let model: import("three").Object3D;
		if (src) {
			const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
			let expired = false;
			let timeout: ReturnType<typeof setTimeout> | undefined;
			try {
				model = await Promise.race([
					new GLTFLoader().loadAsync(src).then((gltf) => {
						if (expired) dispose(gltf.scene);
						return gltf.scene;
					}),
					new Promise<never>((_, reject) => { timeout = setTimeout(() => {
						expired = true; reject(new Error("Model preview timed out"));
					}, 20000); }),
				]);
			} finally { clearTimeout(timeout); }
		} else {
			model = new THREE.Mesh(new THREE.IcosahedronGeometry(1.25, 2),
				new THREE.MeshStandardMaterial({ color: 0xe8e8e8, metalness: 0.15, roughness: 0.38 }));
		}
		scene.add(model);
		model.traverse((node) => {
			if (node instanceof THREE.Mesh && !node.geometry.attributes.normal) node.geometry.computeVertexNormals();
		});
		const bounds = new THREE.Box3().setFromObject(model);
		const size = bounds.getSize(new THREE.Vector3());
		const extent = Math.max(size.x, size.y, size.z);
		if (!Number.isFinite(extent) || extent <= 0) throw new Error("Empty model");
		model.position.sub(bounds.getCenter(new THREE.Vector3()));
		const wrapper = new THREE.Group();
		wrapper.add(model); wrapper.scale.setScalar(2.5 / extent); scene.add(wrapper);
		const light = new THREE.DirectionalLight(0xffffff, 3.2);
		light.position.set(4, 6, 3);
		scene.add(new THREE.HemisphereLight(0xffffff, 0x202020, 2.4), light);
		const camera = new THREE.PerspectiveCamera(42, 640 / 360, 0.1, 100);
		camera.position.set(3.6, 2.5, 4.6).multiplyScalar(0.8);
		camera.lookAt(0, 0, 0);
		const canvas = document.createElement("canvas");
		const context = canvas.getContext("webgl2", { alpha: true, antialias: true })
			?? canvas.getContext("webgl2", { alpha: true, antialias: false });
		if (!context) throw new Error("WebGL unavailable");
		renderer = new THREE.WebGLRenderer({ canvas, context, alpha: true });
		renderer.setSize(640, 360, false);
		renderer.setClearColor(0x000000, 0);
		renderer.render(scene, camera);
		return canvas.toDataURL("image/png");
	} finally {
		dispose(scene);
		renderer?.dispose();
		renderer?.forceContextLoss();
	}
}
