import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: ({ image }) =>
    z.object({
      title: z.string().max(100),
      description: z.string().max(200),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      category: z.enum(['Lab Notes', 'Research', 'Life']),
      tags: z.array(z.string()).default([]),
      cover: image(),
      coverAlt: z.string(),
      draft: z.boolean().default(false),
    }),
});

export const collections = { blog };
