import { getImage } from "astro:assets";
import type { CollectionEntry } from "astro:content";

export interface PreviewMedia {
	kind: "image" | "video" | "model";
	src: string;
	poster?: string;
	sources?: { src: string; type: string }[];
	label: string;
}

const publicUrl = (src: string) => /^https?:\/\//.test(src)
	? src : `${import.meta.env.BASE_URL}${src.replace(/^\/+/, "")}`;

export async function projectPreviews(project: CollectionEntry<"projects">): Promise<PreviewMedia[]> {
	const { data } = project;
	const images = [data.cover, ...data.gallery.map((item) => item.image)].filter(Boolean);
	const uniqueImages = [...new Map(images.map((image) => [image!.src, image!])).values()];
	const previews: PreviewMedia[] = await Promise.all(uniqueImages.map(async (image) => ({
		kind: "image" as const,
		src: (await getImage({ src: image, width: Math.min(800, image.width) })).src,
		label: data.title,
	})));
	for (const video of data.videos) {
		previews.push({ kind: "video", src: publicUrl(video.sources[0].src),
			sources: video.sources.map((source) => ({ ...source, src: publicUrl(source.src) })),
			poster: video.poster ? (await getImage({ src: video.poster, width: Math.min(800, video.poster.width) })).src : undefined,
			label: video.title });
	}
	for (const model of data.models) {
		previews.push({ kind: "model", src: model.src ? publicUrl(model.src) : "",
			poster: model.poster ? publicUrl(model.poster) : undefined, label: model.title });
	}
	return previews;
}
