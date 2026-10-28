import { getCollection, type CollectionEntry } from 'astro:content';
import type { ImageMetadata } from 'astro';
import { posix } from 'node:path';
import { getFileDates } from './git-dates';
import { categoryFromPath, categoryUrl, postUrl, seriesUrl, slugSegment, tagUrl } from './paths';

export const UNCATEGORIZED = '未分类';

export interface Post {
  id: string;
  url: string;
  title: string;
  date: Date;
  updated: Date;
  description: string;
  category: string[];
  categoryKey: string;
  tags: string[];
  series?: string;
  seriesOrder?: number;
  cover?: ImageMetadata | string;
  pinned: boolean;
  draft: boolean;
  words: number;
  minutes: number;
  entry: CollectionEntry<'posts'>;
}

/* ---------------- Markdown 文本工具 ---------------- */

const stripCode = (md: string) => md.replace(/^(```|~~~)[\s\S]*?^\1/gm, ' ');

export function firstHeading(md: string): string | undefined {
  const m = stripCode(md).match(/^#\s+(.+?)\s*#*\s*$/m);
  return m ? plain(m[1]) : undefined;
}

/** 把 markdown 粗略转成纯文本 */
export function plain(md: string): string {
  return stripCode(md)
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/!\[\[[^\]]*\]\]/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, '')
    .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, '$1')
    .replace(/^\s*[-*_]{3,}\s*$/gm, ' ')
    .replace(/\|/g, ' ')
    .replace(/&nbsp;|​/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 站内搜索用的纯文本：同 plain，但保留代码块里的内容，方便搜命令和配置 */
export function searchText(md: string): string {
  return plain(md.replace(/^(```|~~~)[^\n]*\n([\s\S]*?)^\1/gm, ' $2 '));
}

export function countWords(md: string): number {
  const text = plain(md);
  const cjk = (text.match(/[㐀-鿿豈-﫿]/g) ?? []).length;
  const latin = (text.replace(/[㐀-鿿豈-﫿]/g, ' ').match(/[A-Za-z0-9_'-]+/g) ?? []).length;
  return cjk + latin;
}

function excerpt(md: string, len = 140): string {
  // 去掉开头的一级标题，避免摘要重复标题
  const body = md.replace(/^\s*#\s+.+$/m, '');
  const t = plain(body);
  return t.length > len ? t.slice(0, len).trimEnd() + '…' : t;
}

function firstImageSrc(md: string): string | undefined {
  const m =
    stripCode(md).match(/!\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/) ??
    stripCode(md).match(/<img[^>]*\ssrc=["']([^"']+)["']/i) ??
    stripCode(md).match(/!\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/);
  return m?.[1];
}

/* ---------------- 本地图片（封面） ---------------- */

const localImages = import.meta.glob<{ default: ImageMetadata }>(
  '/src/content/posts/**/*.{png,jpg,jpeg,webp,gif,avif,PNG,JPG,JPEG,WEBP,GIF,AVIF}',
  { eager: true },
);

function resolveImage(filePath: string, src: string): ImageMetadata | string | undefined {
  if (/^(https?:)?\/\//.test(src) || src.startsWith('data:')) return src;
  if (src.startsWith('/')) return src; // public 目录
  let rel = src.replace(/\\/g, '/');
  try {
    rel = decodeURI(rel);
  } catch {}
  const dir = posix.dirname('/' + filePath.replace(/\\/g, '/'));
  const candidates = [posix.join(dir, rel), posix.join(dir, 'assets', posix.basename(rel))];
  for (const c of candidates) {
    const hit = localImages[c];
    if (hit) return hit.default;
  }
  return undefined;
}

/* ---------------- 文章 ---------------- */

let postsPromise: Promise<Post[]> | null = null;

export function getPosts(): Promise<Post[]> {
  postsPromise ??= loadPosts();
  return postsPromise;
}

async function loadPosts(): Promise<Post[]> {
  const entries = await getCollection('posts');
  const posts = entries.map((entry): Post => {
    const data = entry.data;
    const filePath = entry.filePath ?? '';
    const rel = filePath.replace(/\\/g, '/').replace(/^.*?src\/content\/posts\//, '');
    const body = entry.body ?? '';
    const dates = getFileDates(filePath);
    const fileName = rel.split('/').pop()!.replace(/\.mdx?$/i, '');
    const folderName = rel.split('/').slice(-2, -1)[0];
    const title = data.title ?? firstHeading(body) ?? (fileName.toLowerCase() === 'index' && folderName ? folderName : fileName);
    const category = data.category
      ? data.category.split('/').map((s) => s.trim()).filter(Boolean)
      : categoryFromPath(rel);
    const finalCategory = category.length ? category : [UNCATEGORIZED];
    const words = countWords(body);
    const coverSrc = data.cover ?? firstImageSrc(body);
    return {
      id: entry.id,
      url: postUrl(entry.id),
      title,
      date: data.date ?? dates.created,
      updated: data.updated ?? dates.updated,
      description: data.description ?? excerpt(body),
      category: finalCategory,
      categoryKey: finalCategory.join('/'),
      tags: data.tags ?? [],
      series: data.series,
      seriesOrder: data.seriesOrder,
      cover: coverSrc ? resolveImage(filePath, coverSrc) : undefined,
      pinned: data.pinned ?? false,
      draft: data.draft ?? false,
      words,
      minutes: Math.max(1, Math.round(words / 350)),
      entry,
    };
  });
  return posts
    .filter((p) => import.meta.env.DEV || !p.draft)
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

/** 首页顺序：置顶在前，其余按时间 */
export async function getHomePosts(): Promise<Post[]> {
  const posts = await getPosts();
  return [...posts.filter((p) => p.pinned), ...posts.filter((p) => !p.pinned)];
}

/* ---------------- 分类 ---------------- */

export interface CategoryNode {
  name: string;
  key: string;
  path: string[];
  url: string;
  icon?: string;
  description?: string;
  cover?: ImageMetadata | string;
  order: number;
  /** 包含子分类的文章数 */
  count: number;
  children: CategoryNode[];
  posts: Post[];
}

let treePromise: Promise<CategoryNode[]> | null = null;

export function getCategoryTree(): Promise<CategoryNode[]> {
  treePromise ??= buildCategoryTree();
  return treePromise;
}

async function buildCategoryTree(): Promise<CategoryNode[]> {
  const posts = await getPosts();
  const metas = await getCollection('categories');
  const metaMap = new Map(metas.map((m) => [m.id, m]));
  const root: CategoryNode = { name: '', key: '', path: [], url: '', order: 0, count: 0, children: [], posts: [] };

  const ensure = (path: string[], count = true): CategoryNode => {
    let node = root;
    path.forEach((seg, i) => {
      let child = node.children.find((c) => c.path[i] === seg);
      if (!child) {
        const key = path.slice(0, i + 1).join('/');
        const meta = metaMap.get(key);
        const cover = meta?.data.cover && meta.filePath ? resolveImage(meta.filePath, meta.data.cover) : undefined;
        child = {
          name: meta?.data.name ?? seg,
          key,
          path: path.slice(0, i + 1),
          url: categoryUrl(path.slice(0, i + 1)),
          icon: meta?.data.icon,
          description: meta?.data.description,
          cover,
          order: meta?.data.order ?? 999,
          count: 0,
          children: [],
          posts: [],
        };
        node.children.push(child);
      }
      if (count) child.count++;
      node = child;
    });
    return node;
  };

  for (const p of posts) ensure(p.category).posts.push(p);
  // 有 _category.yml 但还没有文章的分类也显示出来
  for (const m of metas) if (m.id) ensure(m.id.split('/'), false);

  const sort = (nodes: CategoryNode[]) => {
    nodes.sort((a, b) => a.order - b.order || b.count - a.count || a.name.localeCompare(b.name, 'zh'));
    nodes.forEach((n) => sort(n.children));
  };
  sort(root.children);
  // 「未分类」放最后
  root.children.sort((a, b) => Number(a.key === UNCATEGORIZED) - Number(b.key === UNCATEGORIZED));
  return root.children;
}

export function flattenCategories(nodes: CategoryNode[]): CategoryNode[] {
  return nodes.flatMap((n) => [n, ...flattenCategories(n.children)]);
}

/** 某分类及其所有子分类下的文章（按时间倒序） */
export function postsUnder(node: CategoryNode): Post[] {
  return [...node.posts, ...node.children.flatMap(postsUnder)].sort((a, b) => b.date.getTime() - a.date.getTime());
}

/* ---------------- 标签 ---------------- */

export interface TagInfo {
  name: string;
  slug: string;
  url: string;
  posts: Post[];
}

export async function getTags(): Promise<TagInfo[]> {
  const map = new Map<string, TagInfo>();
  for (const p of await getPosts())
    for (const t of p.tags) {
      const slug = slugSegment(t);
      if (!map.has(slug)) map.set(slug, { name: t, slug, url: tagUrl(t), posts: [] });
      map.get(slug)!.posts.push(p);
    }
  return [...map.values()].sort((a, b) => b.posts.length - a.posts.length || a.name.localeCompare(b.name, 'zh'));
}

/* ---------------- 专栏 / 系列 ---------------- */

export interface SeriesInfo {
  name: string;
  slug: string;
  url: string;
  posts: Post[];
  updated: Date;
  words: number;
}

export async function getSeries(): Promise<SeriesInfo[]> {
  const map = new Map<string, SeriesInfo>();
  for (const p of await getPosts()) {
    if (!p.series) continue;
    const slug = slugSegment(p.series);
    if (!map.has(slug)) map.set(slug, { name: p.series, slug, url: seriesUrl(p.series), posts: [], updated: p.date, words: 0 });
    const s = map.get(slug)!;
    s.posts.push(p);
    s.words += p.words;
    if (p.date > s.updated) s.updated = p.date;
  }
  for (const s of map.values())
    s.posts.sort(
      (a, b) => (a.seriesOrder ?? Infinity) - (b.seriesOrder ?? Infinity) || a.date.getTime() - b.date.getTime(),
    );
  return [...map.values()].sort((a, b) => b.updated.getTime() - a.updated.getTime());
}

/* ---------------- 统计 / 日历 / 热力图 ---------------- */

/** 按本地（东八区）日期格式化为 YYYY-MM-DD */
export function dayKey(d: Date): string {
  const t = new Date(d.getTime() + 8 * 3600 * 1000);
  return t.toISOString().slice(0, 10);
}

export function formatDate(d: Date): string {
  return dayKey(d);
}

/** 给日历和热力图用的精简数据 */
export async function getActivity() {
  const days: Record<string, { n: number; w: number; posts: { t: string; u: string }[] }> = {};
  for (const p of await getPosts()) {
    const k = dayKey(p.date);
    days[k] ??= { n: 0, w: 0, posts: [] };
    days[k].n++;
    days[k].w += p.words;
    days[k].posts.push({ t: p.title, u: p.url });
  }
  return days;
}

export async function getStats() {
  const posts = await getPosts();
  const tree = await getCategoryTree();
  const tags = await getTags();
  return {
    posts: posts.length,
    words: posts.reduce((s, p) => s + p.words, 0),
    categories: flattenCategories(tree).length,
    tags: tags.length,
    lastUpdate: posts.reduce((m, p) => (p.updated > m ? p.updated : m), new Date(0)),
  };
}

export function formatWords(n: number): string {
  return n >= 10000 ? (n / 10000).toFixed(1).replace(/\.0$/, '') + ' 万' : n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n);
}

/** 上一篇 / 下一篇（按时间） */
export async function getAdjacent(post: Post) {
  const posts = await getPosts();
  const i = posts.findIndex((p) => p.id === post.id);
  return { newer: i > 0 ? posts[i - 1] : undefined, older: i >= 0 && i < posts.length - 1 ? posts[i + 1] : undefined };
}

/** 相关文章：同标签/同分类加权 */
export async function getRelated(post: Post, n = 3): Promise<Post[]> {
  const posts = await getPosts();
  return posts
    .filter((p) => p.id !== post.id)
    .map((p) => ({
      p,
      score:
        p.tags.filter((t) => post.tags.includes(t)).length * 2 +
        (p.categoryKey === post.categoryKey ? 2 : p.category[0] === post.category[0] ? 1 : 0) +
        (p.series && p.series === post.series ? 1 : 0),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.p.date.getTime() - a.p.date.getTime())
    .slice(0, n)
    .map((x) => x.p);
}
