import metadata from "./videoMetadata.json";
import { projectAssetUrl } from "./projectAssetPaths.mjs";

export function videoPresentation(src: string, baseUrl: string) {
	const entry = (metadata as Record<string, {width:number; height:number; poster:string}>)[src];
	return entry ? {...entry, poster: projectAssetUrl(entry.poster, baseUrl)} : undefined;
}
