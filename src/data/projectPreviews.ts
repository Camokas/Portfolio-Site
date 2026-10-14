import { getImage } from "astro:assets";
import type { CollectionEntry } from "astro:content";
import { projectAssetUrl } from "./projectAssetPaths.mjs";
import { shaderGraphPreview } from "./shaderGraphPreview.mjs";

export interface PreviewMedia {
	kind: "image" | "video" | "model" | "code" | "shaderGraph";
	src: string;
	poster?: string;
	sources?: { src: string; type: string }[];
	label: string;
	code?: Pick<CollectionEntry<"projects">["data"]["codeSamples"][number], "code" | "language">;
}

const publicUrl = (src: string) => projectAssetUrl(src, import.meta.env.BASE_URL);

export async function projectPreviews(project: CollectionEntry<"projects">): Promise<PreviewMedia[]> {
	const { data } = project;
	const images = [data.coverShowInCards ? data.cover : undefined, ...data.gallery.filter(item => item.showInCards).map((item) => item.image)].filter(Boolean);
	const uniqueImages = [...new Map(images.map((image) => [image!.src, image!])).values()];
	const previews: PreviewMedia[] = await Promise.all(uniqueImages.map(async (image) => ({
		kind: "image" as const,
		src: (await getImage({ src: image, width: Math.min(800, image.width) })).src,
		label: data.title,
	})));
	for (const video of data.videos) {
		if (!video.showInCards) continue;
		previews.push({ kind: "video", src: publicUrl(video.sources[0].src),
			sources: video.sources.map((source) => ({ ...source, src: publicUrl(source.src) })),
			poster: video.poster ? (await getImage({ src: video.poster, width: Math.min(800, video.poster.width) })).src : undefined,
			label: video.title });
	}
	for (const model of data.models) {
		if (!model.showInCards) continue;
		previews.push({ kind: "model", src: model.src ? publicUrl(model.src) : "",
			poster: model.poster ? publicUrl(model.poster) : undefined, label: model.title });
	}
	for (const sample of data.codeSamples) {
		if (!sample.showInCards) continue;
		previews.push({ kind: "code", src: "", label: sample.filename,
			code: { code: sample.code, language: sample.language } });
	}
	for (const graph of data.shaderGraphs) {
		if (!graph.showInCards) continue;
		try { previews.push({ kind: 'shaderGraph', src: shaderGraphPreview(graph.src), label: graph.title }); }
		catch (error) { console.warn(`[Portfolio preview] Cannot preview graph ${graph.src}`, error); }
	}
	return previews;
}
