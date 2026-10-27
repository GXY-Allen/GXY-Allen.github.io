import { getPosts, searchText } from '../utils/posts';

/** 站内搜索的全文索引：浏览器里按原文逐字匹配，中文不用分词，任意片段都能搜到 */
export async function GET() {
  const posts = await getPosts();
  const docs = posts.map((p) => ({
    url: p.url,
    title: p.title,
    desc: p.description,
    tags: [...p.category, ...p.tags, p.series ?? ''].join(' '),
    // 正文开头的一级标题就是文章标题，不再重复放进正文
    text: searchText((p.entry.body ?? '').replace(/^\s*#\s+.+$/m, '')),
  }));
  return new Response(JSON.stringify(docs), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
