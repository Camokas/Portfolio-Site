import { russianTranslations, type SiteLanguage } from "../data/translations";

const sourceText = new WeakMap<HTMLElement, string>();
const rendered = new WeakMap<HTMLElement, string>();
const destinations: Record<string, string | null> = JSON.parse(document.getElementById("content-references")?.dataset.targets || "{}");
const terms: Record<string, string> = {
	"Adobe Audition": "software/adobe-audition", "Audition": "software/adobe-audition",
	"After Effects": "software/after-effects", "Premiere Pro": "software/premiere-pro",
	"Media Encoder": "software/media-encoder", "OBS": "software/obs",
	"Camoka GameDev Telegram Channel": "socialnetworks/camoka-gamedev-telegram-channel",
};
const pattern = new RegExp(Object.keys(terms).sort((a,b)=>b.length-a.length).join("|"), "g");

export function contentReferences(language: SiteLanguage): void {
	for (const paragraph of document.querySelectorAll<HTMLElement>(".project-content p")) {
		if (!sourceText.has(paragraph)) {
			if (paragraph.children.length) continue;
			const source = paragraph.textContent || "";
			pattern.lastIndex = 0;
			if (!pattern.test(source)) continue;
			sourceText.set(paragraph, source);
			paragraph.dataset.referenceText = "";
		}
		const source = sourceText.get(paragraph)!;
		const text = language === "ru" ? russianTranslations[source.trim()] ?? source : source;
		if (rendered.get(paragraph) === text) continue;
		const fragment = document.createDocumentFragment();
		let offset = 0;
		pattern.lastIndex = 0;
		for (const match of text.matchAll(pattern)) {
			fragment.append(document.createTextNode(text.slice(offset, match.index)));
			const href = destinations[terms[match[0]]];
			if (href) {
				const link = document.createElement("a");
				link.href = href; link.textContent = match[0];
				fragment.append(link);
			} else fragment.append(document.createTextNode(match[0]));
			offset = match.index! + match[0].length;
		}
		fragment.append(document.createTextNode(text.slice(offset)));
		paragraph.replaceChildren(fragment);
		rendered.set(paragraph, text);
	}
}
