import type { PreviewMedia } from "../data/projectPreviews";

class MediaPreview extends HTMLElement {
	items: PreviewMedia[] = [];
	index = -1;
	visible = false;
	paused = false;
	loading = false;
	timer?: ReturnType<typeof setTimeout>;
	observer?: IntersectionObserver;
	events?: AbortController;
	motion = matchMedia("(prefers-reduced-motion: reduce)");
	failed = new Set<number>();
	get running() { return this.visible && !document.hidden && !this.paused && !this.motion.matches && this.isConnected; }
	connectedCallback() {
		this.items = JSON.parse(this.dataset.items ?? "[]");
		if (!this.items.length) return;
		this.events = new AbortController();
		const options = { signal: this.events.signal };
		const controls = this.querySelector<HTMLElement>(".preview-controls");
		if (controls) controls.hidden = false;
		this.querySelector("[data-pause]")?.addEventListener("click", () => {
			this.paused = !this.paused; this.sync();
		}, options);
		this.querySelector("[data-next]")?.addEventListener("click", () => { void this.advance(); }, options);
		document.addEventListener("visibilitychange", () => this.sync(), options);
		this.motion.addEventListener("change", () => this.sync(), options);
		this.observer = new IntersectionObserver(([entry]) => {
			this.visible = entry.isIntersecting;
			if (this.visible && this.index < 0) void this.advance();
			this.sync();
		}, { threshold: 0.05 });
		this.observer.observe(this);
	}
	disconnectedCallback() {
		clearTimeout(this.timer); this.observer?.disconnect(); this.events?.abort();
		this.querySelectorAll("video").forEach((video) => { video.pause(); video.removeAttribute("src"); video.replaceChildren(); video.load(); });
	}
	sync() {
		clearTimeout(this.timer);
		const button = this.querySelector<HTMLButtonElement>("[data-pause]");
		if (button) {
			button.textContent = this.paused ? "▶" : "Ⅱ";
			button.setAttribute("aria-pressed", String(this.paused));
			button.setAttribute("aria-label", this.paused ? "Resume preview slideshow" : "Pause preview slideshow");
		}
		this.querySelectorAll("video").forEach((video) => {
			if (this.running && video.classList.contains("active")) void video.play().catch(() => {});
			else video.pause();
		});
		if (this.running && !this.loading && this.items.length > 1 && this.failed.size < this.items.length) {
			this.timer = setTimeout(() => { void this.advance(); }, 5000);
		}
	}
	async advance() {
		if (this.loading || !this.isConnected) return;
		clearTimeout(this.timer);
		this.loading = true;
		try {
			for (let attempt = 0; attempt < this.items.length; attempt++) {
				const next = (this.index + 1 + attempt) % this.items.length;
				if (this.failed.has(next)) continue;
				try {
					const item = this.items[next];
					const element = await this.prepare(item);
					if (!this.isConnected) { if (element instanceof HTMLVideoElement) element.pause(); return; }
					const old = [...this.querySelectorAll<HTMLElement>(".slide")];
					element.className = `slide${item.kind === "model" ? " model" : ""}`;
					this.querySelector(".preview-link")?.prepend(element);
					// Establish the transparent starting frame before fading in.
					void element.offsetWidth;
					element.classList.add("active");
					old.forEach((node) => { node.classList.remove("active"); if (node instanceof HTMLVideoElement) node.pause(); });
					setTimeout(() => old.forEach((node) => { node.remove(); if (node instanceof HTMLVideoElement) { node.replaceChildren(); node.removeAttribute("src"); node.load(); } }), 750);
					this.index = next;
					this.querySelector<HTMLElement>(".placeholder")!.hidden = true;
					this.querySelector("[data-counter]")!.textContent = `${next + 1} / ${this.items.length}`;
					this.querySelector("[data-label]")!.textContent = `${item.kind === "model" ? "3D · " : item.kind === "video" ? "Video · " : ""}${item.label}`;
					return;
				} catch (error) {
					this.failed.add(next);
					console.warn("[Portfolio preview] Skipping unavailable media:", this.items[next].src, error);
				}
			}
		} finally { this.loading = false; this.sync(); }
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
