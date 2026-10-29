// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { unified } from '@astrojs/markdown-remark';

// Change this to your real domain before deploying (used for canonical URLs, sitemap, RSS, OG tags).
const SITE_URL = process.env.SITE_URL ?? 'https://ph22d015.github.io';

export default defineConfig({
  site: SITE_URL,
  // This is a project site, published at https://ph22d015.github.io/webprofile/.
  base: '/webprofile',
  trailingSlash: 'ignore',
  output: 'static',
  integrations: [react(), mdx(), sitemap()],
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  build: {
    // All CSS ships as external files so the CSP never needs 'unsafe-inline'.
    inlineStylesheets: 'never',
  },
  markdown: {
    // Shiki emits inline styles, which a strict CSP blocks. Prism uses classes only.
    syntaxHighlight: 'prism',
    processor: unified({
      remarkPlugins: [remarkMath],
      // MathML output: rendered natively by the browser, no inline styles, no KaTeX CSS/fonts.
      rehypePlugins: [[rehypeKatex, { output: 'mathml' }]],
    }),
  },
  security: {
    // Astro hashes every script/style it emits and writes a <meta> CSP per page.
    // frame-ancestors, HSTS etc. cannot live in <meta>; they are in public/_headers.
    csp: {
      algorithm: 'SHA-256',
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "manifest-src 'self'",
        "worker-src 'none'",
        'upgrade-insecure-requests',
      ],
    },
  },
});
