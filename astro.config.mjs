// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import { unified } from '@astrojs/markdown-remark';
import remarkMediaGroups from './src/plugins/remark-media-groups.mjs';

// https://astro.build/config
export default defineConfig({
	site: 'https://camokas.github.io',
	base: '/Portfolio-Site/',
	trailingSlash: 'always',
	output: 'static',
	markdown: { processor: unified({ remarkPlugins: [remarkMediaGroups] }) },
	integrations: [mdx()],
});
