// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
	site: 'https://camokas.github.io',
	base: '/Portfolio-Site/',
	trailingSlash: 'always',
	output: 'static',
	integrations: [mdx()],
});
