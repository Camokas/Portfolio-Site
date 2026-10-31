import { readdirSync } from "node:fs";
import { join } from "node:path";
import videoMetadata from "./videoMetadata.json";

export function localizedMedia() {
	const files: string[] = [];
	function scan(directory: string, prefix = "") {
		for (const entry of readdirSync(directory, { withFileTypes: true })) {
			const path = prefix + entry.name;
			if (entry.isDirectory()) scan(join(directory, entry.name), path + "/");
			else files.push(path);
		}
	}
	scan("public");
	const available = new Set(files);
	const pairs = files.flatMap(path => {
		if (!/ENVer\.[^.]+$/i.test(path)) return [];
		const ru = path.replace(/ENVer(?=\.[^.]+$)/i, "RUVer");
		return available.has(ru) ? [{ en: path, ru }] : [];
	});
	const videos = videoMetadata as Record<string, {poster:string}>;
	return [...pairs, ...pairs.flatMap(pair => {
		const en = videos[pair.en]?.poster, ru = videos[pair.ru]?.poster;
		return en && ru ? [{en,ru}] : [];
	})];
}
