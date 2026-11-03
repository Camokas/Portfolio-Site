import type { PreviewMedia } from "../data/projectPreviews";
import { localizedMediaUrl } from "./localizedMediaClient";
import { choosePreviewMotion } from "./previewBudget.mjs";

// Общий интервал после первой смены (миллисекунды).
const MEDIA_INTERVAL_MS = 3500;
let modelModule: typeof import("./modelPreview") | undefined;
const controllers = new Set<MediaPreview>();
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const coarsePointer = matchMedia("(pointer: coarse)");
function refreshPlayback() {
 const candidates = [...controllers].flatMap(owner => {
  const element = owner.prepared.get(owner.index), item = owner.items[owner.index];
  if (!owner.running || !element || !item || (item.kind !== "model" && !(element instanceof HTMLVideoElement))) return [];
  const rect = owner.getBoundingClientRect();
  return [{id: owner, kind: element instanceof HTMLVideoElement ? "video" : "model", pixels: (item.width ?? Infinity) * (item.height ?? Infinity),
   engaged: owner.hovered || owner.focused, visible: owner.visibleFraction, priority: owner.visibleFraction * 10 - Math.abs((rect.top + rect.bottom) / 2 - innerHeight / 2) / Math.max(innerHeight, 1)}];
 });
 const selected = choosePreviewMotion(candidates, {limit: coarsePointer.matches || navigator.hardwareConcurrency <= 4 ? 1 : 2,
  reduced: reducedMotion.matches, saveData: (navigator as Navigator & {connection?: {saveData?: boolean}}).connection?.saveData});
 // Stop old owners before handing their GPU/video slot to another card.
 for (const owner of controllers) for (const [index, element] of owner.prepared) {
  if (selected.has(owner) && index === owner.index) continue;
  modelModule?.updateModelPreview(element, false);
  if (element instanceof HTMLVideoElement) {
   element.pause();
   if (!owner.running && element.querySelector("source")) { element.replaceChildren(); element.load(); }
  }
 }
 for (const owner of selected as Set<MediaPreview>) {
  const element = owner.prepared.get(owner.index)!;
  if (element instanceof HTMLVideoElement) {
   if (!element.querySelector("source")) {
    for (const source of owner.items[owner.index].sources ?? []) { const node = document.createElement("source"); node.src = localizedMediaUrl(source.src); node.type = source.type; element.append(node); }
   }
   if (element.paused) void element.play().catch(() => {});
  } else modelModule?.updateModelPreview(element, true);
 }
}
reducedMotion.addEventListener("change", refreshPlayback);
coarsePointer.addEventListener("change", refreshPlayback);

class MediaPreview extends HTMLElement {
	items: PreviewMedia[] = [];
	index = -1;
	visible = false;
	visibleFraction = 0;
	hovered = false;
	focused = false;
	timer?: ReturnType<typeof setTimeout>;
	// Каждая карточка получает свою первую задержку один раз при создании.
	nextDelay = 1000 + Math.floor(Math.random() * 4001);
	deadline = 0;
	observer?: IntersectionObserver;
	events?: AbortController;
	failed = new Set<number>();
	prepared = new Map<number, HTMLElement>();
	shownInCycle = new Set<number>();
	pending = new Set<number>();
	get running() { return this.visible && !document.hidden && this.isConnected; }
	connectedCallback() {
		this.items = JSON.parse(this.dataset.items ?? "[]");
		if (!this.items.length) return;
		controllers.add(this);
		this.events = new AbortController();
		const options = { signal: this.events.signal };
		const card = this.parentElement!;
		card.addEventListener("pointerenter", () => { this.hovered = true; refreshPlayback(); }, options);
		card.addEventListener("pointerleave", () => { this.hovered = false; refreshPlayback(); }, options);
		card.addEventListener("focusin", () => { this.focused = true; refreshPlayback(); }, options);
		card.addEventListener("focusout", () => { this.focused = false; refreshPlayback(); }, options);
		document.addEventListener("visibilitychange", () => this.sync(), options);
		document.addEventListener("portfolio:language-change", () => {
			for (const element of this.prepared.values()) {
				if (element instanceof HTMLImageElement) {
					const src = localizedMediaUrl(element.src);
					if (element.src !== new URL(src, document.baseURI).href) element.src = src;
				}
				if (element instanceof HTMLVideoElement) {
					let changed = false;
					for (const source of element.querySelectorAll("source")) {
						const src = localizedMediaUrl(source.src);
						if (source.src !== new URL(src, document.baseURI).href) { source.src = src; changed = true; }
					}
					if (element.poster) element.poster = localizedMediaUrl(element.poster);
					if (changed) element.load();
				}
			}
			this.updateVideo();
		}, options);
		const initial = this.querySelector<HTMLImageElement>("img.slide");
		if (initial && (this.items[0].kind === "image" || this.items[0].kind === "shaderGraph")) {
			this.prepared.set(0, initial); this.index = 0;
			this.shownInCycle.add(0);
		}
		this.observer = new IntersectionObserver(([entry]) => {
			this.visible = entry.isIntersecting;
			this.visibleFraction = entry.intersectionRatio;
			this.sync();
		}, { threshold: [0, 0.05, 0.35, 0.65, 0.95] });
		this.observer.observe(this);
	}
	disconnectedCallback() {
		controllers.delete(this);
		this.stopTimer(); this.observer?.disconnect(); this.events?.abort();
		this.prepared.forEach((element) => this.release(element));
		this.prepared.clear();
		refreshPlayback();
	}
	sync() {
		this.updateVideo();
		if (!this.running) { this.stopTimer(); return; }
		this.preload();
		if (this.items.length > 1 && this.timer === undefined) {
			this.deadline = performance.now() + this.nextDelay;
			this.timer = setTimeout(() => {
				this.timer = undefined;
				this.advance();
				this.nextDelay = MEDIA_INTERVAL_MS;
				this.sync();
			}, this.nextDelay);
		}
	}
	stopTimer() {
		if (this.timer === undefined) return;
		// Продолжаем оставшееся время при возвращении карточки на экран.
		this.nextDelay = Math.max(0, this.deadline - performance.now());
		clearTimeout(this.timer);
		this.timer = undefined;
	}
	updateVideo() { refreshPlayback(); }

	preload() {
		if (!this.running) return;
		// Keep only the current slide and two random ready/loading candidates.
		let candidates = this.items.map((_, index) => index).filter(index => index !== this.index && !this.failed.has(index) && !this.shownInCycle.has(index));
		if (!candidates.length) candidates = this.items.map((_, index) => index).filter(index => index !== this.index && !this.failed.has(index));
		candidates = candidates.filter(index => !this.prepared.has(index) && !this.pending.has(index));
		while (candidates.length && this.pending.size + this.prepared.size < 3 && this.pending.size < 2) {
			const index = candidates.splice(Math.floor(Math.random() * candidates.length), 1)[0];
			this.pending.add(index);
			void this.prepare(this.items[index], index).then((element) => {
				if (!this.isConnected) { this.release(element); return; }
				this.prepared.set(index, element);
				if (this.index < 0 && this.running) this.show(index);
			}).catch((error) => {
				this.failed.add(index);
				console.warn("[Portfolio preview] Skipping unavailable media:", this.items[index].src, error);
			}).finally(() => { this.pending.delete(index); this.preload(); });
		}
	}

	advance() {
		if (!this.running) return;
		// Finish every non-failed item before starting another random cycle.
		const remaining = this.items.map((_, index) => index)
			.filter(index => !this.shownInCycle.has(index) && !this.failed.has(index));
		if (!remaining.length) {
			this.shownInCycle.clear();
		}
		const candidates = [...this.prepared.keys()]
			.filter(index => index !== this.index && !this.shownInCycle.has(index));
		if (candidates.length) {
			this.show(candidates[Math.floor(Math.random() * candidates.length)]);
		}
		this.preload();
	}
	show(index: number) {
		const element = this.prepared.get(index)!;
		const old = [...this.querySelectorAll<HTMLElement>(".slide")].filter((node) => node !== element);
		element.className = `slide${this.items[index].kind === "model" ? " model" : this.items[index].kind === "code" ? " code-preview" : this.items[index].kind === "shaderGraph" ? " graph-preview" : ""}`;
		this.querySelector(".preview-layers")?.append(element);
		element.classList.add("active");
		// Explicit keyframes also work when a detached, cached element is reused.
		if (!reducedMotion.matches) element.animate([{ opacity: 0 }, { opacity: 1 }], {
			duration: 1200, easing: "cubic-bezier(0.4, 0, 0.2, 1)",
		});
		old.forEach((node) => {
			node.classList.remove("active");
			if (!reducedMotion.matches) node.animate([{ opacity: 1 }, { opacity: 0 }], {
				duration: 1200, easing: "cubic-bezier(0.4, 0, 0.2, 1)",
			});
		});
		for (const [oldIndex, oldElement] of this.prepared) {
			if (oldIndex === index || !old.includes(oldElement)) continue;
			modelModule?.updateModelPreview(oldElement, false);
			if (oldElement instanceof HTMLVideoElement) oldElement.pause();
			this.prepared.delete(oldIndex);
		}
		setTimeout(() => old.forEach((node) => { node.remove(); this.release(node); }), 1250);
		this.index = index;
		this.shownInCycle.add(index);
		modelModule?.updateModelPreview(element, false, this.timer === undefined ? MEDIA_INTERVAL_MS : Math.max(1, this.deadline - performance.now()));
		this.updateVideo();
	}
	release(element: HTMLElement) {
		modelModule?.releaseModelPreview(element);
		if (element instanceof HTMLVideoElement) { element.pause(); element.removeAttribute("src"); element.replaceChildren(); element.load(); }
	}
	async prepare(item: PreviewMedia, index: number): Promise<HTMLElement> {
		if (item.kind === "code") {
			const template = this.querySelector<HTMLTemplateElement>(`template[data-preview-code="${index}"]`);
			const element = template?.content.firstElementChild?.cloneNode(true);
			if (!(element instanceof HTMLElement)) throw new Error("Code preview unavailable");
			return element;
		}
		if (item.kind === "video") {
			const video = document.createElement("video");
			video.muted = true; video.defaultMuted = true; video.playsInline = true; video.loop = true;
			video.preload = "none"; video.tabIndex = -1; video.setAttribute("aria-hidden", "true");
			video.disablePictureInPicture = true;
			if (item.poster) video.poster = localizedMediaUrl(item.poster);
			// Sources are attached only after winning the shared playback budget.
			return video;
		}
		if (item.kind === "model") {
			try { modelModule ??= await import("./modelPreview"); return await modelModule.createModelPreview(item.src); }
			catch (error) { if (item.poster) return this.image(item.poster); throw error; }
		}
		return this.image(item.src);
	}
	async image(src: string) {
		const image = new Image(); image.alt = ""; image.decoding = "async";
		const loaded = this.ready(image, "load"); image.src = localizedMediaUrl(src); await loaded; return image;
	}
	ready(element: HTMLImageElement | HTMLVideoElement, event: string): Promise<void> {
		return new Promise((resolve, reject) => {
			const finish = (error = false) => {
				clearTimeout(timeout); element.removeEventListener(event, success); element.removeEventListener("error", fail);
				error ? reject(new Error("Preview unavailable")) : resolve();
			};
			const success = () => finish(); const fail = () => finish(true);
			const timeout = setTimeout(fail, 12000);
			element.addEventListener(event, success, { once: true }); element.addEventListener("error", fail, { once: true });
		});
	}
}

if (!customElements.get("media-preview")) customElements.define("media-preview", MediaPreview);
