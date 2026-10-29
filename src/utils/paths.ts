/** 文章文件相对 posts 目录的路径 -> 文章 id（也是 URL 的一部分） */
export function postIdFromPath(entry: string): string {
  const parts = entry.replace(/\\/g, '/').replace(/\.mdx?$/i, '').split('/');
  if (parts.length > 1 && parts[parts.length - 1].toLowerCase() === 'index') parts.pop();
  return parts.map(slugSegment).join('/');
}

/** 保留中文，只替换 URL 里有特殊含义或不美观的字符 */
export function slugSegment(s: string): string {
  const slug = s
    .trim()
    .replace(/[\s_/]+/g, '-')
    .replace(/[?#%\\:*"<>|'`^{}[\]]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  // 标签和专栏只有一层路由；空名称或 . / .. 也不能成为路径片段。
  return slug && !/^\.+$/.test(slug) ? slug : `item-${Array.from(s, (c) => c.codePointAt(0)!.toString(16)).join('-') || 'empty'}`;
}

/** 文章文件相对 posts 目录的路径 -> 分类路径（文件夹即分类） */
export function categoryFromPath(entry: string): string[] {
  const parts = entry.replace(/\\/g, '/').split('/');
  const file = parts.pop() ?? '';
  // posts/技术/我的文章/index.md：「我的文章」是文章自己的文件夹，不算分类
  if (/^index\.mdx?$/i.test(file)) parts.pop();
  return parts.filter(Boolean);
}

export const categoryUrl = (path: string[] | string) =>
  `/categories/${(Array.isArray(path) ? path : path.split('/')).map(slugSegment).join('/')}/`;
export const tagUrl = (tag: string) => `/tags/${slugSegment(tag)}/`;
export const seriesUrl = (name: string) => `/series/${slugSegment(name)}/`;
export const postUrl = (id: string) => `/posts/${id}/`;
