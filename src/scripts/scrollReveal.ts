// Hide only units below the viewport; content above it always stays visible.
const preference = matchMedia("(prefers-reduced-motion: reduce)");
const targets = [...document.querySelectorAll<HTMLElement>([
	"main .section-heading", "main .direction-grid > li", "main .about",
	"main .contact-heading", "main .contact-content",
	".project-content > .project-media-group", ".timeline-card > ul",
	".project-grid > li",
	".software-grid > li", ".software-story",
].join(","))];
const animations = new Map<HTMLElement, Animation>();
let observer: IntersectionObserver | undefined;

function reveal(element: HTMLElement, animate = true, delay = 0): void {
	if (!animate) {
		animations.get(element)?.cancel();
		animations.delete(element);
	}
	if (!element.hasAttribute("data-reveal-pending")) return;
	element.removeAttribute("data-reveal-pending");
	if (!animate || preference.matches || !element.animate) return;
	try {
		const animation = element.animate([
			{opacity: 0, transform: "translateY(22px)"},
			{opacity: .35, transform: "translateY(12px)", offset: .4},
			{opacity: 1, transform: "translateY(0)"},
		], {duration: 1100, delay, easing: "cubic-bezier(.22,.45,.25,1)", fill: "both"});
		animations.set(element, animation);
		animation.onfinish = () => { animations.delete(element); animation.cancel(); };
	} catch { /* A failed effect must never hide the content. */ }
}
function revealAll(): void {
	observer?.disconnect();
	observer = undefined;
	for (const element of targets) reveal(element, false);
	for (const animation of animations.values()) animation.cancel();
	animations.clear();
}
if (!preference.matches && "IntersectionObserver" in window) {
	try {
		observer = new IntersectionObserver(entries => {
			if (!observer || preference.matches) return;
			let incoming = 0;
			for (const entry of entries) {
				const element = entry.target as HTMLElement;
				if (!entry.isIntersecting) {
					if (entry.boundingClientRect.top >= (entry.rootBounds?.bottom ?? innerHeight)) {
						if (!element.contains(document.activeElement)) {
							animations.get(element)?.cancel();
							animations.delete(element);
							element.setAttribute("data-reveal-pending", "");
						}
					} else reveal(element, false);
					continue;
				}
				// A small, bounded stagger only for grids; text/media pairs move together.
				const grid = element.matches(".direction-grid > li, .project-grid > li");
				reveal(element, true, grid ? Math.min(incoming++ * 40, 80) : 0);
			}
		}, {threshold: 0});
		for (const element of targets) {
			const bounds = element.getBoundingClientRect();
			// Never conceal the first screen or content above the restored scroll position.
			if (!bounds.height || bounds.top >= innerHeight) element.setAttribute("data-reveal-pending", "");
			observer.observe(element);
		}
	} catch { revealAll(); }
}
document.addEventListener("focusin", event => {
	if (!(event.target instanceof Element)) return;
	const element = event.target.closest<HTMLElement>("[data-reveal-pending]");
	if (element) reveal(element, false);
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
		if (rect.height && rect.top < innerHeight) reveal(element, false);
		else if (!element.contains(document.activeElement)) {
			animations.get(element)?.cancel();
			animations.delete(element);
			element.setAttribute("data-reveal-pending", "");
		}
	}
};
addEventListener("scroll", () => {
	const jumped = Math.abs(scrollY - previousY) > innerHeight * .6;
	previousY = scrollY;
	if (jumped && !jumpFrame) jumpFrame = requestAnimationFrame(reconcileJump);
}, {passive:true});
addEventListener("resize", () => {
	if (!jumpFrame) jumpFrame = requestAnimationFrame(reconcileJump);
}, {passive:true});
