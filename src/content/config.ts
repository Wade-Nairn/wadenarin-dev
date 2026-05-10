import { defineCollection, z } from 'astro:content';

const articles = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishOrder: z.number(),
    category: z.enum(['General', 'Technical', 'AI Coding', 'Creative', 'AI Agents']),
    date: z.string(),
  }),
});

export const collections = { articles };
