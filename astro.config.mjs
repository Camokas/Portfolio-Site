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
	security: {
		csp: {
			algorithm: 'SHA-384',
			directives: [
				"default-src 'self'",
				"base-uri 'none'",
				"object-src 'none'",
				"form-action 'none'",
				"frame-src 'self'",
				"connect-src 'self' https://api.github.com",
				"font-src 'self'",
				"img-src 'self' data: blob:",
				"media-src 'self' https: blob:",
				"worker-src 'self' blob:",
				"manifest-src 'self'",
				"upgrade-insecure-requests",
			],
			styleDirective: {
				resources: [
					{ resource: "'self'", kind: 'element' },
					{ resource: "'unsafe-inline'", kind: 'attribute' },
				],
			},
		},
	},
	markdown: { processor: unified({ remarkPlugins: [remarkMediaGroups] }) },
	integrations: [mdx()],
});
