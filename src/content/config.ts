import { defineCollection, z } from 'astro:content';

const articles = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishOrder: z.number(),
    category: z.enum(['General', 'Technical', 'AI Coding', 'Creative', 'AI Agents']),
    date: z.string(),
    // Set when an article is substantively revised; feeds dateModified + sitemap lastmod.
    updated: z.string().optional(),
  }),
});

export const collections = { articles };
