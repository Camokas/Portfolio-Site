// Reveal whole editorial units once. The HTML is visible without JavaScript.
const preference = matchMedia("(prefers-reduced-motion: reduce)");
const targets = [...document.querySelectorAll<HTMLElement>([
	"main .section-heading", "main .direction-grid > li", "main .about",
	"main .contact-heading", "main .contact-content",
	".project-content > .project-media-group", ".timeline-card > ul",
	".project-grid > li",
].join(","))];
const animations = new Map<HTMLElement, Animation>();
let observer: IntersectionObserver | undefined;

function reveal(element: HTMLElement, animate = true, delay = 0): void {
	observer?.unobserve(element);
	if (!element.hasAttribute("data-reveal-pending")) return;
	element.removeAttribute("data-reveal-pending");
	if (!animate || preference.matches || !element.animate) return;
	try {
		const animation = element.animate([
			{opacity: 0, transform: "translateY(14px)"},
			{opacity: 1, transform: "translateY(0)"},
		], {duration: 520, delay, easing: "cubic-bezier(.2,.7,.2,1)", fill: "both"});
		animations.set(element, animation);
		animation.onfinish = () => { animations.delete(element); animation.cancel(); };
	} catch { /* A failed effect must never hide the content. */ }
}
function revealAll(): void {
	observer?.disconnect();
	for (const element of targets) reveal(element, false);
	for (const animation of animations.values()) animation.cancel();
	animations.clear();
}
if (!preference.matches && "IntersectionObserver" in window) {
	try {
		observer = new IntersectionObserver(entries => {
			let incoming = 0;
			for (const entry of entries) {
				if (!entry.isIntersecting) continue;
				const element = entry.target as HTMLElement;
				// A small, bounded stagger only for grids; text/media pairs move together.
				const grid = element.matches(".direction-grid > li, .project-grid > li");
				reveal(element, true, grid ? Math.min(incoming++ * 40, 80) : 0);
			}
		}, {threshold: 0, rootMargin: "0px 0px -28px 0px"});
		for (const element of targets) {
			const bounds = element.getBoundingClientRect();
			// Never conceal the first screen or content above the restored scroll position.
			if (bounds.height && bounds.top < innerHeight) continue;
			element.setAttribute("data-reveal-pending", "");
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
