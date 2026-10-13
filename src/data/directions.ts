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
}

export const directions = [
	{
		slug: "game-development",
		title: "Game Development",
		description: "Games, prototypes, mechanics, and interactive systems.",
	},
	{
		slug: "3d-modeling",
		title: "3D Modeling",
		description: "Models, materials, renders, and real-time presentation.",
	},
	{
		slug: "music-sound",
		title: "Music & Sound",
		description: "Music, sound design, and audio experiments.",
	},
	{
		slug: "drawing",
		title: "Drawing",
		description: "Illustrations, sketches, and visual studies.",
	},
	{
		slug: "video-editing",
		title: "Video Editing",
		description: "Editing, compositing, and visual storytelling.",
	},
	{
		slug: "motion-design",
		title: "Motion Design",
		description: "Motion graphics, titles, and animated design.",
	},
	{
		slug: "programming",
		title: "Programming",
		description: "Applications, tools, experiments, and source code.",
	},
	{
		slug: "animation",
		title: "Animation",
		description: "Character, object, and procedural animation.",
	},
	{
		slug: "shading",
		title: "Shading",
		description: "Materials, shaders, and real-time visual effects.",
	},
] satisfies readonly Direction[];
