import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE } from '@/consts';
import { getPosts } from '@/lib/posts';

export async function GET(context: APIContext) {
  const posts = await getPosts();
  return rss({
    title: `${SITE.name} — Blog`,
    description: 'Lab notes, research ideas and personal reflections.',
    site: context.site!,
    items: posts.map((p) => ({
      title: p.data.title,
      description: p.data.description,
      pubDate: p.data.pubDate,
      link: `/blog/${p.id}/`,
      categories: [p.data.category, ...p.data.tags],
    })),
    customData: '<language>en</language>',
  });
}
