/** 全局交互：弹层、主题切换、快捷键、导航栏、滚动进度、点击涟漪 */
import type { TransitionBeforePreparationEvent } from 'astro:transitions/client';
import { $, $$, blog, motionOn, rafThrottle } from './util';

type PanelName = 'drawer' | 'settings' | 'search' | 'toc';
const panelSel: Record<PanelName, string> = {
  drawer: '#drawer',
  settings: '#settings-panel',
  search: '#search-modal',
  toc: '#toc-popover',
};
let current: PanelName | null = null;

export function openPanel(name: PanelName) {
  if (current) closePanel();
  const el = $(panelSel[name]);
  if (!el) return;
  current = name;
  el.classList.add('open');
  el.setAttribute('aria-hidden', 'false');
  const ov = $(`[data-overlay="${name}"]`);
  if (ov) {
    ov.hidden = false;
    requestAnimationFrame(() => ov.classList.add('show'));
  }
  if (name !== 'toc') document.documentElement.classList.add('lock');
  $(`[data-open="${name}"]`)?.setAttribute('aria-expanded', 'true');
  window.dispatchEvent(new CustomEvent('blog:open', { detail: name }));
}

export function closePanel() {
  if (!current) return;
  const name = current;
  current = null;
  const el = $(panelSel[name]);
  el?.classList.remove('open');
  el?.setAttribute('aria-hidden', 'true');
  const ov = $(`[data-overlay="${name}"]`);
  if (ov) {
    ov.classList.remove('show');
    setTimeout(() => {
      if (!ov.classList.contains('show')) ov.hidden = true;
    }, 320);
  }
  document.documentElement.classList.remove('lock');
  $(`[data-open="${name}"]`)?.setAttribute('aria-expanded', 'false');
  window.dispatchEvent(new CustomEvent('blog:close', { detail: name }));
}

let switching: ViewTransition | null = null;
/** 明暗切换的圆形扩散播完（没在切换时立刻完成）。重活放到这之后做，动画期间新画面不会变、不用每帧重画 */
export const themeSettled = (): Promise<unknown> => switching?.finished.catch(() => {}) ?? Promise.resolve();

/* 圆形扩散有两种画法，看起来一样（逐像素比对过）：
   Chrome / Edge 里把新画面放进一个 border-radius: 50% 的正方形窗口，窗口从点击处长大，object-position 让画面始终对齐屏幕（.theme-window）。
   这几个浏览器会把 clip-path 动画的圆形蒙版每帧重新光栅化一遍，再带着整页毛玻璃重新合成，实测帧率只有窗口画法的六七成。
   其他浏览器没法验证窗口画法，仍用 clip-path */
const windowReveal = 'userAgentData' in navigator;

function toggleTheme(e: MouseEvent) {
  const root = document.documentElement;
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  const run = () => blog().save({ mode: next });
  // document 上的 startViewTransition 被 BaseLayout 藏起来了（换页不用它），这里直接用原型上的
  const vt = (Document.prototype as any).startViewTransition;
  if (!vt || !motionOn()) return run();
  const x = e.clientX || innerWidth - 60;
  const y = e.clientY || 30;
  const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  // .theme-switching 和新主题在同一次样式计算里生效：整页样式只算一遍，颜色、阴影的过渡也不会启动（animations.css）
  const t: ViewTransition = vt.call(document, () => {
    root.classList.add('theme-switching');
    root.classList.toggle('theme-window', windowReveal);
    run();
  });
  switching = t;
  t.ready
    .then(() => {
      // fill: forwards：动画播完到浏览器拆掉切换画面之间还会画一帧，这一帧要停在终点。
      // 否则圆形窗口退回 CSS 里的 0 大小，整屏露出旧主题的截图，切换结束时闪一下
      const timing: KeyframeAnimationOptions = {
        duration: 550,
        easing: 'cubic-bezier(.22,1,.36,1)',
        fill: 'forwards',
        pseudoElement: '::view-transition-new(root)',
      };
      if (windowReveal)
        root.animate(
          {
            width: ['0px', `${2 * r}px`],
            height: ['0px', `${2 * r}px`],
            left: [`${x}px`, `${x - r}px`],
            top: [`${y}px`, `${y - r}px`],
            objectPosition: [`${-x}px ${-y}px`, `${r - x}px ${r - y}px`],
          },
          timing,
        );
      else root.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] }, timing);
    })
    .catch(() => {});
  // 连点时前一次切换会提前结束，这时不能把下一次还要用的类去掉
  t.finished.finally(() => {
    if (switching !== t) return;
    switching = null;
    root.classList.remove('theme-switching', 'theme-window');
  });
}

/* ---------------- 一次性注册的全局事件 ---------------- */

document.addEventListener('click', (e) => {
  const t = e.target as Element;
  const opener = t.closest<HTMLElement>('[data-open]');
  if (opener) {
    e.preventDefault();
    const name = opener.dataset.open as PanelName;
    if (current === name) closePanel();
    else openPanel(name);
    return;
  }
  if (t.closest('[data-close]') || t.closest('[data-overlay]')) {
    closePanel();
    return;
  }
  const action = t.closest<HTMLElement>('[data-action]')?.dataset.action;
  if (action === 'toggle-theme') return toggleTheme(e as MouseEvent);
  if (action === 'top') return window.scrollTo({ top: 0, behavior: motionOn() ? 'smooth' : 'auto' });

  if (current === 'toc' && (t.closest('.toc-popover a') || !t.closest('.toc-popover'))) closePanel();
  if (current === 'drawer' && t.closest('.drawer a')) closePanel();
});

document.addEventListener('keydown', (e) => {
  const target = e.target as HTMLElement;
  const typing = target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    if (current === 'search') closePanel();
    else openPanel('search');
  } else if (e.key === '/' && !typing && !current) {
    e.preventDefault();
    openPanel('search');
  } else if (e.key === 'Escape' && current) {
    closePanel();
  }
});

/* 点击涟漪 */
document.addEventListener('pointerdown', (e) => {
  if (!motionOn() || e.button !== 0) return;
  const host = (e.target as Element).closest<HTMLElement>('[data-ripple], .btn, .icon-btn, .fab, .page-btn');
  if (!host) return;
  const r = host.getBoundingClientRect();
  const size = Math.max(r.width, r.height) * 2.2;
  const span = document.createElement('span');
  span.className = 'ripple';
  span.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
  host.appendChild(span);
  setTimeout(() => span.remove(), 650);
});

/* 滚动：阅读进度、回到顶部（顶栏始终固定显示） */
const onScroll = rafThrottle(() => {
  // 读：先把需要的位置都读出来
  const y = window.scrollY;
  const article = $('.post');
  let p: number;
  if (article) {
    const r = article.getBoundingClientRect();
    const total = r.height - innerHeight * 0.6;
    p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 1;
  } else {
    const max = document.documentElement.scrollHeight - innerHeight;
    p = max > 0 ? y / max : 0;
  }
  // 目录高亮等也在这里读位置
  window.dispatchEvent(new CustomEvent('blog:scroll', { detail: { y, p } }));

  // 写：最后统一修改页面
  $('#read-progress')?.style.setProperty('--progress', String(p));
  const fab = $('.fab-top');
  if (fab) {
    fab.classList.toggle('show', y > 400);
    fab.style.setProperty('--p', String(Math.round(p * 100)));
  }
});
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll, { passive: true });

document.addEventListener('astro:before-swap', () => {
  if (current) {
    const name = current;
    current = null;
    window.dispatchEvent(new CustomEvent('blog:close', { detail: name }));
  }
});

/* 网站更新过（版本号对不上）：直接整页打开新页面，不把新版本拼到还在运行的旧脚本上，
   否则旧标签页里第一次换页可能出现显示问题，要刷新才消失 */
document.addEventListener('astro:before-preparation', (e) => {
  const ev = e as TransitionBeforePreparationEvent;
  const load = ev.loader;
  ev.loader = async () => {
    await load();
    const build = (doc: Document) => doc.querySelector('meta[name="build"]')?.getAttribute('content');
    if (build(ev.newDocument) !== build(document)) ev.preventDefault();
  };
});

/* ---------------- 每次换页执行 ---------------- */

function initNavIndicator() {
  const nav = $('.nav');
  const ind = $('.nav-indicator', nav ?? document);
  if (!nav || !ind) return;
  const moveTo = (a: HTMLElement | null) => {
    if (!a) {
      ind.style.opacity = '0';
      return;
    }
    ind.style.opacity = '1';
    ind.style.width = `${a.offsetWidth}px`;
    ind.style.transform = `translateX(${a.offsetLeft}px)`;
  };
  const active = () => $<HTMLElement>('.nav-link.active', nav);
  // 先无动画定位到当前项
  ind.style.transition = 'none';
  moveTo(active());
  requestAnimationFrame(() => (ind.style.transition = ''));
  $$<HTMLElement>('.nav-link', nav).forEach((a) => a.addEventListener('mouseenter', () => moveTo(a)));
  nav.addEventListener('mouseleave', () => moveTo(active()));
}

/* 记录页脚实际高度，侧栏据此在底部预留空间（页脚换行、缩放、换页时自动更新） */
let footerObserver: ResizeObserver | null = null;
function trackFooterHeight() {
  const footer = $('.site-footer');
  if (!footer) return;
  const set = () => document.documentElement.style.setProperty('--footer-h', `${footer.offsetHeight}px`);
  set();
  footerObserver?.disconnect();
  if ('ResizeObserver' in window) {
    footerObserver = new ResizeObserver(set);
    footerObserver.observe(footer);
  }
}

export function initUI() {
  initNavIndicator();
  trackFooterHeight();
  onScroll();
}
