import type { PreviewMedia } from "../data/projectPreviews";

class MediaPreview extends HTMLElement {
	items: PreviewMedia[] = [];
	index = -1;
	visible = false;
	timer?: ReturnType<typeof setInterval>;
	observer?: IntersectionObserver;
	events?: AbortController;
	failed = new Set<number>();
	prepared = new Map<number, HTMLImageElement | HTMLVideoElement>();
	pending = new Set<number>();
	get running() { return this.visible && !document.hidden && this.isConnected; }
	connectedCallback() {
		this.items = JSON.parse(this.dataset.items ?? "[]");
		if (!this.items.length) return;
		this.events = new AbortController();
		const options = { signal: this.events.signal };
		document.addEventListener("visibilitychange", () => this.sync(), options);
		const initial = this.querySelector<HTMLImageElement>("img.slide");
		if (initial && this.items[0].kind === "image") {
			this.prepared.set(0, initial); this.index = 0;
		}
		this.observer = new IntersectionObserver(([entry]) => {
			this.visible = entry.isIntersecting;
			this.sync();
		}, { threshold: 0.05 });
		this.observer.observe(this);
	}
	disconnectedCallback() {
		clearInterval(this.timer); this.timer = undefined; this.observer?.disconnect(); this.events?.abort();
		this.prepared.forEach((element) => this.release(element));
		this.prepared.clear();
	}
	sync() {
		this.updateVideo();
		if (!this.running) { clearInterval(this.timer); this.timer = undefined; return; }
		this.preload();
		if (this.items.length > 1 && !this.timer) {
			this.timer = setInterval(() => this.advance(), 2000);
		}
	}
	updateVideo() {
		this.prepared.forEach((element, index) => {
			if (!(element instanceof HTMLVideoElement)) return;
			if (this.running && index === this.index) void element.play().catch(() => {});
			else element.pause();
		});
	}
	preload() {
		if (!this.running) return;
		// Slow video/model loading never blocks the slideshow clock.
		for (let step = 1; step <= this.items.length && this.pending.size < 2; step++) {
			const index = (this.index + step) % this.items.length;
			if (this.prepared.has(index) || this.pending.has(index) || this.failed.has(index)) continue;
			this.pending.add(index);
			void this.prepare(this.items[index]).then((element) => {
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
		for (let step = 1; step <= this.items.length; step++) {
			const next = (this.index + step) % this.items.length;
			if (next !== this.index && this.prepared.has(next)) { this.show(next); break; }
		}
		this.preload();
	}
	show(index: number) {
		const element = this.prepared.get(index)!;
		const old = [...this.querySelectorAll<HTMLElement>(".slide")].filter((node) => node !== element);
		element.className = `slide${this.items[index].kind === "model" ? " model" : ""}`;
		this.querySelector(".preview-layers")?.append(element);
		element.classList.add("active");
		// Explicit keyframes also work when a detached, cached element is reused.
		element.animate([{ opacity: 0 }, { opacity: 1 }], {
			duration: 1200, easing: "cubic-bezier(0.4, 0, 0.2, 1)",
		});
		old.forEach((node) => {
			node.classList.remove("active");
			node.animate([{ opacity: 1 }, { opacity: 0 }], {
				duration: 1200, easing: "cubic-bezier(0.4, 0, 0.2, 1)",
			});
		});
		setTimeout(() => old.forEach((node) => node.remove()), 1250);
		this.index = index;
		this.updateVideo();
	}
	release(element: HTMLImageElement | HTMLVideoElement) {
		if (element instanceof HTMLVideoElement) { element.pause(); element.removeAttribute("src"); element.replaceChildren(); element.load(); }
	}
	async prepare(item: PreviewMedia): Promise<HTMLImageElement | HTMLVideoElement> {
		if (item.kind === "video") {
			const video = document.createElement("video");
			video.muted = true; video.defaultMuted = true; video.playsInline = true; video.loop = true;
			video.preload = "auto"; video.tabIndex = -1; video.setAttribute("aria-hidden", "true");
			if (item.poster) video.poster = item.poster;
			for (const source of item.sources ?? []) {
				const node = document.createElement("source"); node.src = source.src; node.type = source.type; video.append(node);
			}
			try { await this.ready(video, "loadeddata"); return video; }
			catch {
				video.pause(); video.replaceChildren(); video.load();
				if (item.poster) return this.image(item.poster);
				throw new Error("Video unavailable");
			}
		}
		const src = item.kind === "model"
			? item.poster ?? await (await import("./modelPreview")).modelPreview(item.src)
			: item.src;
		return this.image(src);
	}
	async image(src: string) {
		const image = new Image(); image.alt = ""; image.decoding = "async";
		const loaded = this.ready(image, "load"); image.src = src; await loaded; return image;
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
