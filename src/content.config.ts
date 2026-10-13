import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { directionSlugs } from "./data/directions";

const projects = defineCollection({
	loader: glob({
		base: "./src/content/projects",
		pattern: "**/*.md",
	}),
	schema: ({ image }) => z.object({
		title: z.string(),
		summary: z.string(),
		direction: z.enum(directionSlugs),
		date: z.coerce.date(),
		tags: z.array(z.string()).default([]),
		cover: image().optional(),
		gallery: z
			.array(
				z.object({
					image: image(),
					alt: z.string(),
					caption: z.string().optional(),
				}),
			)
			.default([]),
		videos: z
			.array(
				z.object({
					title: z.string(),
					caption: z.string().optional(),
					poster: image().optional(),
					preload: z.enum(["none", "metadata", "auto"]).default("metadata"),
					loop: z.boolean().default(false),
					muted: z.boolean().default(false),
					sources: z
						.array(
							z.object({
								src: z.string().min(1),
								type: z.enum(["video/mp4", "video/webm"]),
							}),
						)
						.min(1),
				}),
			)
			.default([]),
		featured: z.boolean().default(false),
		draft: z.boolean().default(false),
		demo: z.boolean().default(false),
	}),
});

export const collections = { projects };
