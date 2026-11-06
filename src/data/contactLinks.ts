import type { IconName } from "./icons";
import { siteRepository } from "./siteRepository.mjs";

export interface ContactLink {
	label: string;
	detail: string;
	description: string;
	href: string;
	icon: IconName;
}

export const contactLinks = [
	{
		label: "Email",
		detail: "burtsagain06@gmail.com",
		description: "Project enquiries and collaboration.",
		href: "mailto:burtsagain06@gmail.com",
		icon: "mail",
	},
	{
		label: "Telegram",
		detail: "@TheCamoka",
		description: "Send me a direct message.",
		href: "https://t.me/TheCamoka",
		icon: "external-link",
	},
	{
		label: "GitHub profile",
		detail: "@Camokas",
		description: "Code, experiments, and public repositories.",
		href: "https://github.com/Camokas",
		icon: "code-2",
	},
	{
		label: "Website source",
		detail: siteRepository.name,
		description: "Development history and source code for this portfolio.",
		href: siteRepository.url,
		icon: "file-code-2",
	},
] satisfies readonly ContactLink[];
