import type { IconName } from "./icons";

export const directionSlugs = [
	"game-development",
	"3d-modeling",
	"music-sound",
	"drawing",
	"video-editing",
	"motion-design",
	"programming",
	"animation",
	"shading",
] as const;

export type DirectionSlug = (typeof directionSlugs)[number];

export interface Direction {
	slug: DirectionSlug;
	title: string;
	description: string;
	icon: IconName;
}

export const directions = [
	{
		slug: "game-development",
		title: "Game Development",
		description: "Games, prototypes, mechanics, and interactive systems.",
		icon: "gamepad-2",
	},
	{
		slug: "3d-modeling",
		title: "3D Modeling",
		description: "Models, materials, renders, and real-time presentation.",
		icon: "box",
	},
	{
		slug: "music-sound",
		title: "Music & Sound",
		description: "Music, sound design, and audio experiments.",
		icon: "audio-lines",
	},
	{
		slug: "drawing",
		title: "Drawing",
		description: "Illustrations, sketches, and visual studies.",
		icon: "palette",
	},
	{
		slug: "video-editing",
		title: "Video Editing",
		description: "Editing, compositing, and visual storytelling.",
		icon: "clapperboard",
	},
	{
		slug: "motion-design",
		title: "Motion Design",
		description: "Motion graphics, titles, and animated design.",
		icon: "wand-sparkles",
	},
	{
		slug: "programming",
		title: "Programming",
		description: "Applications, tools, experiments, and source code.",
		icon: "code-2",
	},
	{
		slug: "animation",
		title: "Animation",
		description: "Character, object, and procedural animation.",
		icon: "person-standing",
	},
	{
		slug: "shading",
		title: "Shading",
		description: "Materials, shaders, and real-time visual effects.",
		icon: "blend",
	},
] satisfies readonly Direction[];
