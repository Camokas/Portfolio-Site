import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { directionSlugs } from "./data/directions";
import { isProjectAssetPath, isHttpsMediaUrl } from "./data/projectAssetPaths.mjs";
import { resolve, relative, isAbsolute, sep } from "node:path";
import { realpathSync, statSync } from "node:fs";

const publicRoot = realpathSync(resolve('public'));
const localAsset = z.string().refine(isProjectAssetPath, {
	message: 'Use projects/<project-folder>/<filename>, without public/, ../ or a site prefix',
}).refine(value => {
	if (!isProjectAssetPath(value)) return false;
	try {
		const target = realpathSync(resolve(publicRoot, value));
		const inside = relative(publicRoot, target);
		return inside !== '..' && !inside.startsWith(`..${sep}`) && !isAbsolute(inside) && statSync(target).isFile();
	} catch { return false; }
}, { message: 'Project file is missing from public/ or points outside it (check filename and case)' });
const mediaAsset = z.union([localAsset, z.string().refine(isHttpsMediaUrl, 'External media must use HTTPS without credentials')]);

const projects = defineCollection({
	loader: glob({
		base: "./src/content/projects",
		pattern: "**/*.{md,mdx}",
	}),
	schema: ({ image }) => {
		const projectImage = localAsset.transform(value => `/@fs/${resolve(publicRoot, value).replaceAll('\\', '/')}`).pipe(image());
		return z.object({
		title: z.string(),
		mediaLayout: z.enum(["auto", "inline"]).default("auto"),
		summary: z.string(),
		direction: z.enum(directionSlugs),
		date: z.coerce.date(),
		tags: z.array(z.string()).default([]),
		cover: projectImage.optional(),
		gallery: z
			.array(
				z.object({
					image: projectImage,
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
					poster: projectImage.optional(),
					preload: z.enum(["none", "metadata", "auto"]).default("metadata"),
					loop: z.boolean().default(false),
					autoplay: z.boolean().default(false),
					autoAspect: z.boolean().default(false),
					muted: z.boolean().default(false),
					sources: z
						.array(
							z.object({
								src: mediaAsset,
								type: z.enum(["video/mp4", "video/webm"]),
							}),
						)
						.min(1),
				}),
			)
			.default([]),
		audio: z
			.array(
				z.object({
					title: z.string(),
					artist: z.string().optional(),
					caption: z.string().optional(),
					preload: z.enum(["none", "metadata", "auto"]).default("metadata"),
					sources: z
						.array(
							z.object({
								src: mediaAsset,
								type: z.enum(["audio/mpeg", "audio/ogg", "audio/wav"]),
							}),
						)
						.min(1),
				}),
			)
			.default([]),
		downloads: z
			.array(
				z.object({
					label: z.string(),
					file: localAsset,
					description: z.string().optional(),
					format: z.string(),
					size: z.string().optional(),
				}),
			)
			.default([]),
		links: z
			.array(
				z.object({
					label: z.string(),
					href: z.string().url(),
					description: z.string().optional(),
					kind: z
						.enum(["website", "source", "demo", "store", "documentation"])
						.default("website"),
				}),
			)
			.default([]),
		codeSamples: z
			.array(
				z.object({
					title: z.string(),
					filename: z.string(),
					language: z.enum([
						"astro",
						"bash",
						"cpp",
						"csharp",
						"css",
						"glsl",
						"hlsl",
						"shaderlab",
						"html",
						"js",
						"json",
						"plaintext",
						"python",
						"ts",
					]),
					code: z.string(),
					description: z.string().optional(),
				}),
			)
			.default([]),
		models: z
			.array(
				z.object({
					title: z.string(),
					description: z.string().optional(),
					kind: z.enum(["demo", "glb"]).default("demo"),
					src: mediaAsset.optional(),
					poster: mediaAsset.optional(),
					autoRotate: z.boolean().default(true),
				}).refine((model) => model.kind === "demo" || Boolean(model.src), {
					message: "GLB/glTF models require a src path",
				}),
			)
			.default([]),
		shaderGraphs: z.array(z.object({
			title: z.string(),
			src: localAsset.refine(value => /\.(shadergraph|shadersubgraph)$/i.test(value), 'Use a .shadergraph or .shadersubgraph file'),
			description: z.string().optional(),
		})).default([]),
		featured: z.boolean().default(false),
		draft: z.boolean().default(false),
		demo: z.boolean().default(false),
	});
	},
});

export const collections = { projects };
