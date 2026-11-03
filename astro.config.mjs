import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import { readdirSync, readFileSync } from 'node:fs';

import cloudflare from "@astrojs/cloudflare";

const SITE = 'https://wadenairn.dev';

/*
  Sitemap <lastmod> per article, read straight from frontmatter (`updated`,
  falling back to `date`). Content collections aren't available at config
  time, hence the regex. File mtimes are no good here — a fresh checkout
  resets them and every page would claim to have changed today.
*/
const articleLastmod = new Map(
  readdirSync('./src/content/articles')
    .filter(file => file.endsWith('.md'))
    .map(file => {
      const source = readFileSync(`./src/content/articles/${file}`, 'utf8');
      const field = name => source.match(new RegExp(`^${name}:\\s*"?([^"\\n]+)"?`, 'm'))?.[1];
      const slug = file.replace(/\.md$/, '');
      return [`${SITE}/articles/${slug}/`, field('updated') ?? field('date')];
    })
);

export default defineConfig({
  site: SITE,
  // Cloudflare serves /articles/x/index.html at /articles/x/ and 307s the
  // slashless form, so every internal link and canonical must carry the slash.
  trailingSlash: 'always',
  integrations: [
    tailwind(),
    sitemap({
      serialize(item) {
        const lastmod = articleLastmod.get(item.url);
        if (lastmod) item.lastmod = new Date(lastmod).toISOString();
        return item;
      },
    }),
  ],
  output: "hybrid",
  adapter: cloudflare()
});
