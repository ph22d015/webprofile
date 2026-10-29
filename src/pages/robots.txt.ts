import type { APIRoute } from 'astro';
import { sitePath } from '@/consts';

export const GET: APIRoute = ({ site }) =>
  new Response(
    `User-agent: *\nAllow: ${sitePath('/')}\nDisallow: ${sitePath('/search.json')}\n\nSitemap: ${new URL(sitePath('/sitemap-index.xml'), site).href}\n`,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
