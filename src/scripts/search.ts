/** 站内搜索（Pagefind，构建时生成索引；开发模式下退回到标题搜索） */
import { navigate } from 'astro:transitions/client';
import { $, $$, activity } from './util';

interface Hit {
  url: string;
  title: string;
  excerpt: string;
}

let pagefind: any = null;
let pagefindFailed = false;

async function getPagefind() {
  if (pagefind || pagefindFailed) return pagefind;
  try {
    const url = '/pagefind/pagefind.js';
    pagefind = await import(/* @vite-ignore */ url);
    await pagefind.options({ excerptLength: 40 });
    pagefind.init();
  } catch {
    pagefindFailed = true;
    pagefind = null;
  }
  return pagefind;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

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
        for (const w of words) title = title.replace(new RegExp(esc(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), (m) => `<mark>${m}</mark>`);
        hits.push({ url: p.u, title, excerpt: '' });
      }
    }
  return hits;
}

async function runSearch(q: string): Promise<Hit[]> {
  const pf = await getPagefind();
  if (!pf) return titleSearch(q);
  const res = await pf.search(q);
  const data = await Promise.all(res.results.slice(0, 12).map((r: any) => r.data()));
  return data.map((d: any) => ({
    url: d.url,
    title: esc(d.meta?.title ?? d.url),
    excerpt: d.excerpt,
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
    if (pagefindFailed) out.insertAdjacentHTML('beforeend', '<p class="search-tip">（本地开发模式只搜索标题，构建后支持全文搜索）</p>');
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
  getPagefind();
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
