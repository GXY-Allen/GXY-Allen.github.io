/** 文章页：代码块、标题锚点、目录高亮、图片灯箱、Mermaid、复制链接 */
import { $, $$, copyText, motionOn, toast } from './util';
import { themeSettled } from './ui';

/* ---------------- 代码块 ---------------- */
document.addEventListener('click', async (e) => {
  const t = e.target as Element;
  const copyBtn = t.closest<HTMLButtonElement>('.code-copy');
  if (copyBtn) {
    const code = copyBtn.closest('.code-block')?.querySelector('pre');
    if (!code) return;
    const ok = await copyText(code.innerText.replace(/\n$/, ''));
    copyBtn.textContent = ok ? '已复制 ✓' : '复制失败';
    copyBtn.classList.toggle('copied', ok);
    setTimeout(() => {
      copyBtn.textContent = '复制';
      copyBtn.classList.remove('copied');
    }, 1800);
    return;
  }
  const expand = t.closest<HTMLButtonElement>('.code-expand');
  if (expand) {
    const block = expand.closest('.code-block')!;
    const collapsed = block.classList.toggle('collapsed');
    const lines = block.querySelectorAll('pre .line').length;
    expand.textContent = collapsed ? `展开全部 ${lines} 行` : '收起代码';
    if (collapsed) block.scrollIntoView({ block: 'nearest', behavior: motionOn() ? 'smooth' : 'auto' });
    return;
  }
  if (t.closest('[data-copy-link]')) {
    const ok = await copyText(decodeURI(location.href.split('#')[0]));
    toast(ok ? '链接已复制，快去分享吧～' : '复制失败，请手动复制地址栏');
    return;
  }
  const img = t.closest<HTMLImageElement>('.prose img');
  if (img && !img.closest('a')) openLightbox(img);
});

function initAnchors() {
  for (const h of $$('.prose :is(h2, h3, h4)[id]')) {
    if (h.querySelector('.heading-anchor')) continue;
    const a = document.createElement('a');
    a.className = 'heading-anchor';
    a.href = `#${h.id}`;
    a.setAttribute('aria-label', '本节链接');
    a.textContent = '#';
    h.appendChild(a);
  }
}

/* ---------------- 目录 ---------------- */
let headings: HTMLElement[] = [];
let lastActive: string | null = null;

function updateToc(force = false) {
  if (!headings.length) return;
  const offset = 110;
  let idx = -1;
  for (let i = 0; i < headings.length; i++) {
    if (headings[i].getBoundingClientRect().top - offset <= 0) idx = i;
    else break;
  }
  const activeId = idx >= 0 ? headings[idx].id : '';
  if (!force && activeId === lastActive) return;
  lastActive = activeId;
  for (const toc of $$('.toc')) {
    let found = false;
    for (const a of $$<HTMLAnchorElement>('a[data-slug]', toc)) {
      const on = a.dataset.slug === activeId;
      a.classList.toggle('active', on);
      a.classList.toggle('passed', !found && !on && idx >= 0);
      if (on) {
        found = true;
        const box = a.closest<HTMLElement>('.toc-scroll');
        if (box && box.offsetParent) {
          const top = a.offsetTop - box.clientHeight / 2 + a.offsetHeight / 2;
          box.scrollTo({ top, behavior: motionOn() ? 'smooth' : 'auto' });
        }
      }
    }
  }
}

let lastPct = '';
window.addEventListener('blog:scroll', ((e: CustomEvent<{ p: number }>) => {
  if (!headings.length) return;
  updateToc();
  const pct = `${Math.round(e.detail.p * 100)}%`;
  if (pct === lastPct) return;
  lastPct = pct;
  $$('.toc-percent').forEach((el) => (el.textContent = pct));
}) as EventListener);

function initToc() {
  headings = $$<HTMLElement>('.prose :is(h2, h3, h4)[id]');
  lastActive = null;
  updateToc(true);
}

/* ---------------- 图片灯箱 ---------------- */
let lbSource: HTMLImageElement | null = null;

function flip(from: DOMRect, to: DOMRect) {
  const s = from.width / to.width;
  const dx = from.left + from.width / 2 - (to.left + to.width / 2);
  const dy = from.top + from.height / 2 - (to.top + to.height / 2);
  return `translate(${dx}px, ${dy}px) scale(${s})`;
}

function openLightbox(img: HTMLImageElement) {
  const box = $('#lightbox');
  const big = $<HTMLImageElement>('.lightbox-img', box ?? document);
  if (!box || !big) return;
  lbSource = img;
  big.src = img.currentSrc || img.src;
  big.alt = img.alt;
  $('.lightbox-caption', box)!.textContent = img.alt || '';
  box.classList.add('open');
  box.setAttribute('aria-hidden', 'false');
  if (!motionOn()) return;
  const animate = () => {
    const from = img.getBoundingClientRect();
    const to = big.getBoundingClientRect();
    if (!to.width) return;
    big.animate([{ transform: flip(from, to), borderRadius: '12px' }, { transform: 'none' }], {
      duration: 420,
      easing: 'cubic-bezier(.22,1,.36,1)',
    });
  };
  if (big.complete && big.naturalWidth) animate();
  else big.onload = animate;
}

function closeLightbox() {
  const box = $('#lightbox');
  const big = $<HTMLImageElement>('.lightbox-img', box ?? document);
  if (!box?.classList.contains('open') || !big) return;
  const done = () => {
    box.classList.remove('open');
    box.setAttribute('aria-hidden', 'true');
  };
  if (motionOn() && lbSource && document.body.contains(lbSource)) {
    const from = lbSource.getBoundingClientRect();
    const to = big.getBoundingClientRect();
    box.classList.remove('open');
    big.animate([{ transform: 'none' }, { transform: flip(from, to) }], {
      duration: 320,
      easing: 'cubic-bezier(.22,1,.36,1)',
    }).onfinish = done;
  } else done();
  lbSource = null;
}

document.addEventListener('click', (e) => {
  if ((e.target as Element).closest('#lightbox')) closeLightbox();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeLightbox();
});
document.addEventListener('astro:before-swap', closeLightbox);

/* ---------------- Mermaid ---------------- */
const MERMAID = 'https://cdn.jsdelivr.net/npm/mermaid@11.17.2/dist/mermaid.esm.min.mjs';
let mermaidMod: any = null;
let mermaidQueue = Promise.resolve();
let mermaidIO: IntersectionObserver | null = null;

/** 依次渲染（同时调用 mermaid.run 会互相干扰）；渲染过的图表留着源码，换明暗时可以重画 */
function renderMermaid(blocks: HTMLElement[]) {
  mermaidQueue = mermaidQueue.then(async () => {
    blocks = blocks.filter((b) => b.isConnected);
    if (!blocks.length) return;
    try {
      mermaidMod ??= (await import(/* @vite-ignore */ MERMAID)).default;
      const dark = document.documentElement.dataset.theme === 'dark';
      mermaidMod.initialize({ startOnLoad: false, theme: dark ? 'dark' : 'default', securityLevel: 'strict', fontFamily: 'inherit' });
      for (const b of blocks) {
        b.dataset.src ??= b.textContent ?? '';
        b.removeAttribute('data-processed');
        b.textContent = b.dataset.src;
      }
      await mermaidMod.run({ nodes: blocks });
    } catch (err) {
      console.warn('Mermaid 渲染失败', err);
    }
  });
}

/** 换页动画（.page-enter）播完再继续：加载、渲染 Mermaid 是几十毫秒的长任务，放在动画期间会卡顿 */
function afterPageEnter() {
  return new Promise<void>((resolve) => {
    const main = $('.main');
    if (!main?.classList.contains('page-enter')) return resolve();
    main.addEventListener('animationend', function done(e) {
      if (e.target !== main) return;
      main.removeEventListener('animationend', done);
      resolve();
    });
    setTimeout(resolve, 800);
  });
}

/* Mermaid 约 1MB：图表滚到附近才加载、渲染，大多数时候换页时根本不用它 */
function observeMermaid() {
  mermaidIO?.disconnect();
  // site.config.ts 里关掉了流程图（features.mermaid）：只显示源码
  if ($('.post[data-mermaid="off"]')) return;
  const blocks = $$<HTMLElement>('pre.mermaid');
  if (!blocks.length) return;
  const entered = afterPageEnter();
  mermaidIO = new IntersectionObserver(
    (entries) => {
      const near = entries.filter((en) => en.isIntersecting).map((en) => en.target as HTMLElement);
      if (!near.length) return;
      near.forEach((b) => mermaidIO?.unobserve(b));
      entered.then(() => renderMermaid(near));
    },
    { rootMargin: '600px 0px' },
  );
  blocks.forEach((b) => mermaidIO!.observe(b));
}

let lastTheme = '';
window.addEventListener('blog:settings', () => {
  const t = document.documentElement.dataset.theme ?? '';
  if (t === lastTheme) return;
  lastTheme = t;
  // 只重画已经画过的，还没滚到的以后画时自然用新的配色；等明暗切换的动画播完再画，免得动画卡顿
  const drawn = $$<HTMLElement>('pre.mermaid[data-src]');
  if (drawn.length) themeSettled().then(() => renderMermaid(drawn));
});

export function initPost() {
  if (!$('.prose')) return;
  initAnchors();
  initToc();
  lastTheme = document.documentElement.dataset.theme ?? '';
  observeMermaid();
}
