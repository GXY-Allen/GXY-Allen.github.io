import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { postIdFromPath } from './utils/paths';

/** 允许 `tags: a` 或 `tags: [a, b]` 或 `tags: a, b` 几种写法 */
const stringList = z.preprocess((v) => {
  if (v == null || v === '') return [];
  if (Array.isArray(v)) return v.map(String);
  return String(v)
    .split(/[,，、]/)
    .map((s) => s.trim())
    .filter(Boolean);
}, z.array(z.string()));

/** 没写时区的日期按北京时间处理，例如 2025-11-20 或 2025-11-20 16:45 */
const localDate = z.preprocess((v) => {
  if (typeof v !== 'string') return v;
  let s = v.trim().replace(/\//g, '-');
  if (/[zZ]$|[+-]\d\d:?\d\d$/.test(s)) return s;
  s = s.replace(' ', 'T');
  if (!s.includes('T')) s += 'T00:00';
  return s + '+08:00';
}, z.coerce.date());

const posts = defineCollection({
  loader: glob({
    base: './src/content/posts',
    pattern: ['**/*.md', '!**/_*'],
    generateId: ({ entry, data }) => (typeof data.slug === 'string' && data.slug ? data.slug : postIdFromPath(entry)),
  }),
  // 所有字段都是可选的：直接丢一个 md 进来也能发布
  schema: z.object({
    title: z.string().optional(),
    date: localDate.optional(),
    updated: localDate.optional(),
    description: z.string().optional(),
    category: z.string().optional(),
    tags: stringList.optional(),
    series: z.string().optional(),
    seriesOrder: z.number().optional(),
    cover: z.string().optional(),
    pinned: z.boolean().optional(),
    draft: z.boolean().optional(),
    slug: z.string().optional(),
  }),
});

const categories = defineCollection({
  loader: glob({
    base: './src/content/posts',
    pattern: '**/_category.{yml,yaml}',
    generateId: ({ entry }) => entry.replace(/\\/g, '/').split('/').slice(0, -1).join('/'),
  }),
  schema: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    icon: z.string().optional(),
    order: z.number().optional(),
    cover: z.string().optional(),
  }),
});

const pages = defineCollection({
  loader: glob({ base: './src/content/pages', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
  }),
});

export const collections = { posts, categories, pages };
