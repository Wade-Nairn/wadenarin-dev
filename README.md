# wadenairn.dev

Personal site and blog. Built with Astro, Tailwind, and deployed to [wadenairn.dev](https://wadenairn.dev).

## Stack

- [Astro](https://astro.build) — static site generator
- [Tailwind CSS](https://tailwindcss.com) — utility styles
- [Web3Forms](https://web3forms.com) — contact form

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Content

Articles live in `src/content/articles/` as markdown files with the following frontmatter:

```md
---
title: "Article Title"
description: "Short description"
slug: "/articles/article-slug"
publishOrder: 1
category: "General" | "Technical" | "AI Coding" | "Creative" | "AI Agents"
date: "2025-01-01"
---
```

## Contact Form

The contact form uses Web3Forms. The access key is set in `src/pages/contact.astro`. Generate a new key at [web3forms.com](https://web3forms.com).
