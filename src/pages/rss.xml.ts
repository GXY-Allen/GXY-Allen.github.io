import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE } from '../site.config';
import { getPosts } from '../utils/posts';

export async function GET(context: APIContext) {
  const posts = await getPosts();
  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site ?? SITE.url,
    items: posts.slice(0, 30).map((p) => ({
      title: p.title,
      pubDate: p.date,
      description: p.description,
      link: p.url,
      categories: [...p.category, ...p.tags],
    })),
    customData: `<language>${SITE.lang}</language>`,
  });
}
