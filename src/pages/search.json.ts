import { NAV, sitePath } from '@/consts';
import { publications, timeline } from '@/data/cv';
import { getPosts } from '@/lib/posts';

// Compact search index generated at build time. Keys are short to keep the file small.
export async function GET() {
  const posts = await getPosts();
  const pageDescriptions: Record<string, string> = {
    '/': 'Home',
    '/about/': 'About me, languages, hobbies and contact',
    '/research/': 'Research themes, expertise and interactive thin-film demo',
    '/publications/': 'Journal and conference publications with BibTeX',
    '/cv/': 'Education, research, teaching, conferences and awards',
    '/blog/': 'All blog posts',
    '/gallery/': 'Photography',
  };

  const index = [
    ...NAV.map((n) => ({ t: n.label, d: pageDescriptions[n.href] ?? '', u: sitePath(n.href), k: 'Page', x: '' })),
    ...posts.map((p) => ({
      t: p.data.title,
      d: p.data.description,
      u: sitePath(`/blog/${p.id}/`),
      k: p.data.category,
      x: `${p.data.tags.join(' ')} ${(p.body ?? '').replace(/\s+/g, ' ').slice(0, 2000)}`,
    })),
    ...publications.map((p) => ({ t: p.title, d: `${p.venue} (${p.year})`, u: sitePath(`/publications/#${p.id}`), k: 'Publication', x: `${p.authors} ${p.tags.join(' ')}` })),
    ...timeline.map((e) => ({ t: e.title, d: `${e.org} · ${e.when}`, u: sitePath('/cv/'), k: 'CV', x: `${e.detail ?? ''} ${(e.points ?? []).join(' ')}` })),
  ];

  return new Response(JSON.stringify(index), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
