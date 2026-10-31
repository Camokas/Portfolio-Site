// Hide only units below the viewport; content above it always stays visible.
const preference = matchMedia("(prefers-reduced-motion: reduce)");
const targets = [...document.querySelectorAll<HTMLElement>([
	"main .section-heading", "main .direction-grid > li", "main .about",
	"main .contact-heading", "main .contact-content",
	".project-content > .project-media-group", ".timeline-card > ul",
	".project-grid > li",
].join(","))];
const animations = new Set<HTMLElement>();
let observer: IntersectionObserver | undefined;
// Use pixels: vertical percentages in rootMargin are based on root width.
const revealLine = () => Math.round(innerHeight * .6);
function stopAnimation(element: HTMLElement): void {
	element.removeAttribute("data-reveal-animating");
	element.style.removeProperty("--reveal-delay");
	animations.delete(element);
}

function reveal(element: HTMLElement, animate = true, delay = 0): void {
	if (!animate) {
		stopAnimation(element);
	}
	if (!element.hasAttribute("data-reveal-pending")) return;
	element.removeAttribute("data-reveal-pending");
	if (!animate || preference.matches) return;
	element.style.setProperty("--reveal-delay", `${delay}ms`);
	element.setAttribute("data-reveal-animating", "");
	animations.add(element);
}
function revealAll(): void {
	observer?.disconnect();
	observer = undefined;
	for (const element of targets) reveal(element, false);
	for (const element of animations) stopAnimation(element);
	animations.clear();
}
if (!preference.matches && "IntersectionObserver" in window) {
	try {
		const observe = () => {
		if (preference.matches) return;
		observer?.disconnect();
		observer = new IntersectionObserver(entries => {
			if (!observer || preference.matches) return;
			let incoming = 0;
			for (const entry of entries) {
				const element = entry.target as HTMLElement;
				if (!entry.isIntersecting) {
					if (entry.boundingClientRect.top >= (entry.rootBounds?.bottom ?? innerHeight)) {
						if (!element.contains(document.activeElement)) {
							stopAnimation(element);
							element.setAttribute("data-reveal-pending", "");
						}
					} else reveal(element, false);
					continue;
				}
				// A small, bounded stagger only for grids; text/media pairs move together.
				const grid = element.matches(".direction-grid > li, .project-grid > li");
				reveal(element, true, grid ? Math.min(incoming++ * 40, 80) : 0);
			}
		}, {threshold: 0, rootMargin: `0px 0px -${innerHeight - revealLine()}px 0px`});
		for (const element of targets) observer.observe(element);
		};
		for (const element of targets) {
			const bounds = element.getBoundingClientRect();
			// Never conceal the first screen or content above the restored scroll position.
			if (!bounds.height || bounds.top >= innerHeight) element.setAttribute("data-reveal-pending", "");
		}
		observe();
		addEventListener("resize", observe, {passive:true});
	} catch { revealAll(); }
}
document.addEventListener("focusin", event => {
	if (!(event.target instanceof Element)) return;
	const element = event.target.closest<HTMLElement>("[data-reveal-pending]");
	if (element) reveal(element, false);
});
document.addEventListener("animationend", event => {
	if (event.animationName === "portfolio-reveal" && event.target instanceof HTMLElement) stopAnimation(event.target);
});
const revealAnchor = () => {
	try {
		const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
		const element = target?.closest<HTMLElement>("[data-reveal-pending]");
		if (element) reveal(element, false);
	} catch { /* Malformed hashes have no effect on the page. */ }
};
window.addEventListener("hashchange", revealAnchor);
window.addEventListener("beforeprint", revealAll);
preference.addEventListener("change", revealAll);
revealAnchor();

// Home/End, anchors, and scrollbar drags can skip an entire viewport between
// observer samples. Reconcile only those jumps, rather than scanning on every tick.
let previousY = scrollY;
let jumpFrame = 0;
const reconcileJump = () => {
	jumpFrame = 0;
	if (!observer || preference.matches) return;
	const bounds = targets.map(element => ({element, rect:element.getBoundingClientRect()}));
	for (const {element,rect} of bounds) {
		if (rect.height && rect.top <= 0) reveal(element, false);
		else if (rect.height && rect.top < revealLine()) reveal(element);
		else if (!element.contains(document.activeElement)) {
			stopAnimation(element);
			element.setAttribute("data-reveal-pending", "");
		}
	}
};
addEventListener("scroll", () => {
	const jumped = Math.abs(scrollY - previousY) > innerHeight * .6;
	const atEnd = scrollY + innerHeight >= document.documentElement.scrollHeight - 2;
	previousY = scrollY;
	if (jumped && !jumpFrame) jumpFrame = requestAnimationFrame(reconcileJump);
	// Short final sections must remain reachable even if they cannot reach the trigger line.
	if (atEnd && observer) {
		for (const element of targets) {
			if (element.hasAttribute("data-reveal-pending") && element.getBoundingClientRect().top < innerHeight) reveal(element);
		}
	}
}, {passive:true});
addEventListener("resize", () => {
	if (!jumpFrame) jumpFrame = requestAnimationFrame(reconcileJump);
}, {passive:true});
