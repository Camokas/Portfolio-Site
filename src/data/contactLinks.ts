export interface ContactLink {
	label: string;
	detail: string;
	description: string;
	href: string;
}

export const contactLinks = [
	{
		label: "GitHub profile",
		detail: "@Camokas",
		description: "Code, experiments, and public repositories.",
		href: "https://github.com/Camokas",
	},
	{
		label: "Website source",
		detail: "Portfolio-Site",
		description: "Development history and source code for this portfolio.",
		href: "https://github.com/Camokas/Portfolio-Site",
	},
] satisfies readonly ContactLink[];
