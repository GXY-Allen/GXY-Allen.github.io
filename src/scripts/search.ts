/** 站内搜索：构建时生成全文索引（search-index.json），按原文逐字匹配。
 *  不用分词，所以「博客」「预览」这类词、任意中文片段都能搜到 */
import { navigate } from 'astro:transitions/client';
import { $, $$, activity } from './util';

interface Doc {
  url: string;
  title: string;
  desc: string;
  tags: string;
  text: string;
}

interface Hit {
  url: string;
  title: string;
  excerpt: string;
}

let docsPromise: Promise<Doc[]> | null = null;
let indexFailed = false;

function loadDocs(): Promise<Doc[]> {
  docsPromise ??= fetch('/search-index.json')
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((docs: Doc[]) => {
      indexFailed = false;
      return docs;
    })
    .catch(() => {
      indexFailed = true;
      docsPromise = null; // 下次搜索时再试
      return [];
    });
  return docsPromise;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** 转义 HTML，并给关键词套上 <mark> */
function highlight(s: string, re: RegExp): string {
  let out = '';
  let last = 0;
  for (const m of s.matchAll(re)) {
    out += esc(s.slice(last, m.index)) + `<mark>${esc(m[0])}</mark>`;
    last = m.index! + m[0].length;
  }
  return out + esc(s.slice(last));
}

/** 正文里第一处关键词前后的一段 */
function snippet(text: string, pattern: string, re: RegExp): string {
  const at = new RegExp(pattern, 'i').exec(text)?.index;
  if (at === undefined) return '';
  const start = Math.max(0, at - 20);
  const end = Math.min(text.length, at + 70);
  return (start > 0 ? '…' : '') + highlight(text.slice(start, end), re) + (end < text.length ? '…' : '');
}

/** 出现次数（最多数到 5 次） */
function count(hay: string, w: string): number {
  let n = 0;
  for (let i = hay.indexOf(w); i >= 0 && n < 5; i = hay.indexOf(w, i + w.length)) n++;
  return n;
}

/** 退回方案：在标题里找 */
function titleSearch(q: string): Hit[] {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const seen = new Set<string>();
  const hits: Hit[] = [];
  for (const day of Object.values(activity()))
    for (const p of day.posts) {
      const t = p.t.toLowerCase();
      if (!seen.has(p.u) && words.every((w) => t.includes(w))) {
        seen.add(p.u);
        let title = esc(p.t);
        for (const w of words) title = title.replace(new RegExp(escRe(esc(w)), 'gi'), (m) => `<mark>${m}</mark>`);
        hits.push({ url: p.u, title, excerpt: '' });
      }
    }
  return hits;
}

/** 空格分开的每个词都要出现（标题、摘要、分类标签或正文里都算），标题里出现的排在前面 */
async function runSearch(q: string): Promise<Hit[]> {
  const docs = await loadDocs();
  if (!docs.length) return titleSearch(q);
  const words = [...new Set(q.toLowerCase().split(/\s+/).filter(Boolean))];
  const pattern = words
    .sort((a, b) => b.length - a.length)
    .map(escRe)
    .join('|');
  const re = new RegExp(pattern, 'gi');
  const scored: { doc: Doc; score: number }[] = [];
  for (const doc of docs) {
    const title = doc.title.toLowerCase();
    const meta = `${doc.desc} ${doc.tags}`.toLowerCase();
    const text = doc.text.toLowerCase();
    let score = 0;
    for (const w of words) {
      const s = (title.includes(w) ? 10 : 0) + (meta.includes(w) ? 3 : 0) + count(text, w);
      if (!s) {
        score = 0;
        break;
      }
      score += s;
    }
    if (score) scored.push({ doc, score });
  }
  // 同分时保持索引里的顺序（新文章在前）
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 12).map(({ doc }) => ({
    url: doc.url,
    title: highlight(doc.title, re),
    excerpt: snippet(doc.text, pattern, re) || highlight(doc.desc, re),
  }));
}

function bind(root: HTMLElement) {
  if (root.dataset.searchBound) return;
  root.dataset.searchBound = '1';
  const input = $<HTMLInputElement>('.search-input', root)!;
  const out = $('.search-results', root)!;
  const tip = out.innerHTML;
  let active = -1;
  let seq = 0;
  let timer = 0;

  const setActive = (i: number) => {
    const items = $$('.search-item', out);
    if (!items.length) return;
    active = (i + items.length) % items.length;
    items.forEach((el, j) => el.classList.toggle('active', j === active));
    items[active].scrollIntoView({ block: 'nearest' });
  };

  const doSearch = async () => {
    const q = input.value.trim();
    const my = ++seq;
    if (!q) {
      out.innerHTML = tip;
      return;
    }
    const hits = await runSearch(q);
    if (my !== seq) return;
    active = -1;
    if (!hits.length) {
      out.innerHTML = `<p class="search-tip">没有找到「${esc(q)}」相关的文章</p>`;
      return;
    }
    out.innerHTML = hits
      .map(
        (h, i) => `<a class="search-item" href="${esc(h.url)}" style="animation-delay:${i * 30}ms">
          <div class="search-item-title"><svg class="icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>${h.title}</div>
          ${h.excerpt ? `<div class="search-item-excerpt">${h.excerpt}</div>` : ''}
        </a>`,
      )
      .join('');
    if (indexFailed) out.insertAdjacentHTML('beforeend', '<p class="search-tip">（全文索引没能加载，只搜索了标题）</p>');
  };

  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = window.setTimeout(doSearch, 160);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(active + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(active - 1);
    } else if (e.key === 'Enter') {
      const items = $$<HTMLAnchorElement>('.search-item', out);
      const target = items[active] ?? items[0];
      if (target) {
        e.preventDefault();
        navigate(target.getAttribute('href')!);
      }
    }
  });
}

window.addEventListener('blog:open', ((e: CustomEvent<string>) => {
  if (e.detail !== 'search') return;
  const modal = $('#search-modal');
  if (!modal) return;
  bind(modal);
  loadDocs();
  setTimeout(() => $<HTMLInputElement>('.search-input', modal)?.focus(), 60);
}) as EventListener);

export function initSearch() {
  const page = $('[data-search-page]');
  if (page) {
    bind(page);
    const q = new URLSearchParams(location.search).get('q');
    const input = $<HTMLInputElement>('.search-input', page)!;
    if (q) {
      input.value = q;
      input.dispatchEvent(new Event('input'));
    }
    input.focus();
  }
}
