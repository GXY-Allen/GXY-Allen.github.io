/** 全局交互：弹层、主题切换、快捷键、导航栏、滚动进度、点击涟漪 */
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

export const isOpen = (name?: PanelName) => (name ? current === name : current !== null);

function toggleTheme(e: MouseEvent) {
  const root = document.documentElement;
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  const run = () => blog().save({ mode: next });
  const vt = (document as any).startViewTransition;
  if (!vt || !motionOn()) return run();
  const x = e.clientX || innerWidth - 60;
  const y = e.clientY || 30;
  const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  root.classList.add('theme-switching');
  const t = vt.call(document, run);
  t.ready
    .then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 550, easing: 'cubic-bezier(.22,1,.36,1)', pseudoElement: '::view-transition-new(root)' },
      );
    })
    .catch(() => {});
  t.finished.finally(() => root.classList.remove('theme-switching'));
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

/* 滚动：顶栏自动隐藏、阅读进度、回到顶部 */
let lastY = window.scrollY;
const onScroll = rafThrottle(() => {
  const y = window.scrollY;
  const topbar = $('#topbar');
  if (topbar) {
    const delta = y - lastY;
    if (y < 120 || delta < -6) topbar.classList.remove('hide');
    else if (delta > 6 && !current) topbar.classList.add('hide');
  }
  lastY = y;

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
  $('#read-progress')?.style.setProperty('--progress', String(p));
  const fab = $('.fab-top');
  if (fab) {
    fab.classList.toggle('show', y > 400);
    fab.style.setProperty('--p', String(Math.round(p * 100)));
  }
  window.dispatchEvent(new CustomEvent('blog:scroll', { detail: { y, p } }));
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

export function initUI() {
  initNavIndicator();
  lastY = window.scrollY;
  onScroll();
}
