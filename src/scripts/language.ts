import { russianTranslations, type SiteLanguage } from "../data/translations";

const STORAGE_KEY = "portfolio-language";
const mediaPairs: { en: string; ru: string }[] = JSON.parse(document.getElementById("localized-media")?.dataset.versions || "[]");
function localizeMedia(language: SiteLanguage): void {
	const attributes = ["src", "poster", "href", "data-full-src", "data-src", "srcset"];
	const base = import.meta.env.BASE_URL;
	for (const element of document.querySelectorAll("img, source, video, audio, a, [data-full-src], [data-src], model-viewer")) {
		let reload = false;
		for (const attribute of attributes) {
			const value = element.getAttribute(attribute);
			if (!value) continue;
			for (const pair of mediaPairs) {
				const matches = [pair.en, pair.ru].some(path => {
					const stem = path.split("/").pop()!.replace(/\.[^.]+$/, "");
					return value.includes(base + path) || (value.includes("/_astro/") && value.includes("/" + stem + "."));
				});
				if (!matches) continue;
				const target = base + pair[language];
				if (value !== target) {
					element.setAttribute(attribute, target);
					if (attribute === "src") reload = true;
				}
				break;
			}
		}
		if (reload) {
			const player = element instanceof HTMLMediaElement ? element : element.parentElement;
			if (player instanceof HTMLMediaElement) {
				player.load();
				if (player.autoplay) void player.play().catch(() => {});
			}
		}
	}
}
const ignoredParents = new Set(["CODE", "PRE", "SCRIPT", "STYLE", "TEXTAREA", "SVG"]);
const originalText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();
const translatedAttributes = ["aria-label", "placeholder", "title", "content"];

function projectWord(count: number): string {
	const mod10 = count % 10;
	const mod100 = count % 100;
	if (mod10 === 1 && mod100 !== 11) return "проект";
	if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "проекта";
	return "проектов";
}

function translatedName(value: string): string {
	return russianTranslations[value] ?? value;
}

function toRussian(value: string): string {
	const direct = russianTranslations[value];
	if (direct) return direct;

	let match = value.match(/^(\d+) projects?$/);
	if (match) {
		const count = Number(match[1]);
		return `${count} ${projectWord(count)}`;
	}

	match = value.match(/^(\d+) of (\d+) projects$/);
	if (match) return `${match[1]} из ${match[2]} проектов`;

	match = value.match(/^Back to (.+)$/);
	if (match) return `Назад: ${translatedName(match[1])}`;

	match = value.match(/^Open (.+)$/);
	if (match) return `Открыть «${translatedName(match[1])}»`;

	match = value.match(/^Project: (.+)$/);
	if (match) return `Проект: ${translatedName(match[1])}`;

	match = value.match(/^Shader Graph: (.+)$/);
	if (match) return `Шейдер-граф: ${translatedName(match[1])}`;

	match = value.match(/^Open image (\d+) of (\d+)$/);
	if (match) return `Открыть изображение ${match[1]} из ${match[2]}`;

	match = value.match(/^Interactive 3D view: (.+)$/);
	if (match) return `Интерактивный 3D-просмотр: ${translatedName(match[1])}`;

	match = value.match(/^(.+) image viewer$/);
	if (match) return `Просмотр изображений: ${translatedName(match[1])}`;

	const titleSuffix = " | Camoka's Portfolio";
	if (value.endsWith(titleSuffix)) {
		return `${translatedName(value.slice(0, -titleSuffix.length))} | Портфолио Camoka`;
	}

	return value;
}

function preserveWhitespace(source: string, translated: string): string {
	const leading = source.match(/^\s*/)?.[0] ?? "";
	const trailing = source.match(/\s*$/)?.[0] ?? "";
	return `${leading}${translated}${trailing}`;
}

function translateTextNode(node: Text, language: SiteLanguage): void {
	if (!node.parentElement || ignoredParents.has(node.parentElement.tagName) || node.parentElement.closest("[data-i18n-ignore]")) return;
	if (!originalText.has(node)) originalText.set(node, node.data);
	const source = originalText.get(node) ?? node.data;
	const trimmed = source.trim();
	if (!trimmed) return;
	const next = language === "ru" ? preserveWhitespace(source, toRussian(trimmed)) : source;
	if (node.data !== next) node.data = next;
}

function translateElementAttributes(element: Element, language: SiteLanguage): void {
	let saved = originalAttributes.get(element);
	if (!saved) {
		saved = new Map();
		originalAttributes.set(element, saved);
	}

	for (const attribute of translatedAttributes) {
		const current = element.getAttribute(attribute);
		if (current === null) continue;
		if (!saved.has(attribute)) saved.set(attribute, current);
		const source = saved.get(attribute) ?? current;
		const next = language === "ru" ? toRussian(source) : source;
		if (current !== next) element.setAttribute(attribute, next);
	}
}

function formatDates(root: Document | Element, language: SiteLanguage): void {
	const locale = language === "ru" ? "ru-RU" : "en";
	root.querySelectorAll<HTMLTimeElement>("time[data-date-format]").forEach((time) => {
		if (!time.dateTime) return;
		const date = new Date(time.dateTime);
		if (Number.isNaN(date.getTime())) return;
		const format = time.dataset.dateFormat;
		const options: Intl.DateTimeFormatOptions = format === "commit"
			? { dateStyle: "medium", timeStyle: "short" }
			: { year: "numeric", month: format === "month-short" ? "short" : "long", timeZone: "UTC" };
		time.textContent = new Intl.DateTimeFormat(locale, options).format(date);
	});
}

function applyLanguage(root: Document | Element = document): void {
	const language = (document.documentElement.lang === "ru" ? "ru" : "en") satisfies SiteLanguage;
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	let node = walker.nextNode();
	while (node) {
		translateTextNode(node as Text, language);
		node = walker.nextNode();
	}
	if (root instanceof Element) translateElementAttributes(root, language);
	root.querySelectorAll("*").forEach((element) => translateElementAttributes(element, language));
	formatDates(root, language);
	localizeMedia(language);
	document.querySelector<HTMLMetaElement>('meta[property="og:locale"]')?.setAttribute("content", language === "ru" ? "ru_RU" : "en_US");

	document.querySelectorAll<HTMLButtonElement>("[data-language]").forEach((button) => {
		const active = button.dataset.language === language;
		button.setAttribute("aria-pressed", String(active));
		button.tabIndex = active ? -1 : 0;
	});
}

function setLanguage(language: SiteLanguage, save = true): void {
	document.documentElement.lang = language;
	document.documentElement.dataset.language = language;
	if (save) {
		try { localStorage.setItem(STORAGE_KEY, language); } catch { /* The switch still works without storage. */ }
	}
	applyLanguage();
	document.dispatchEvent(new CustomEvent("portfolio:language-change", { detail: { language } }));
}

document.querySelectorAll<HTMLButtonElement>("[data-language]").forEach((button) => {
	button.addEventListener("click", () => setLanguage(button.dataset.language === "ru" ? "ru" : "en"));
});

let mutationFrame = 0;
const observer = new MutationObserver((mutations) => {
	if (!mutations.some((mutation) => mutation.addedNodes.length > 0 || mutation.type === "characterData" || mutation.type === "attributes")) return;
	cancelAnimationFrame(mutationFrame);
	mutationFrame = requestAnimationFrame(() => {
		observer.disconnect();
		applyLanguage();
		observer.observe(document.body, {
			attributes: true,
			attributeFilter: [...translatedAttributes, "src", "poster", "srcset", "data-full-src", "data-src"],
			childList: true,
			characterData: true,
			subtree: true,
		});
	});
});

setLanguage(document.documentElement.lang === "ru" ? "ru" : "en", false);
observer.observe(document.body, {
	attributes: true,
	attributeFilter: [...translatedAttributes, "src", "poster", "srcset", "data-full-src", "data-src"],
	childList: true,
	characterData: true,
	subtree: true,
});

