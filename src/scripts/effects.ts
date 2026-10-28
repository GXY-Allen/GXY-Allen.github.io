/** 视觉特效：滚动显现、卡片 3D 倾斜、横幅视差、打字机 */
import { $, $$, finePointer, motionOn } from './util';
import { layoutSidebar } from './sidebar';
import type { TransitionBeforePreparationEvent } from 'astro:transitions/client';

let io: IntersectionObserver | null = null;

function initReveal() {
  io?.disconnect();
  if (!motionOn() || !('IntersectionObserver' in window)) return;
  const candidates = [...$$('[data-reveal]:not(.revealed)'), ...$$('.prose > *')];
  // 先一次性读取位置（避免读写交替导致反复重排），首屏内的元素直接显示。
  // 换页时正文栏正从下方滑入，要扣掉这段位移，否则首屏底部的内容会被当成在屏幕外藏起来
  const limit = innerHeight * 0.92;
  const main = $('.main');
  const shift = main ? new DOMMatrixReadOnly(getComputedStyle(main).transform).m42 : 0;
  const below = candidates.filter((el) => el.getBoundingClientRect().top - (main?.contains(el) ? shift : 0) > limit);
  io = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        if (en.isIntersecting) {
          en.target.classList.add('revealed');
          io?.unobserve(en.target);
        }
      }
    },
    { rootMargin: '0px 0px -5% 0px', threshold: 0.04 },
  );
  for (const el of below) {
    el.classList.add('will-reveal');
    io.observe(el);
  }
}

function initTilt() {
  if (!finePointer()) return;
  for (const el of $$('[data-tilt]')) {
    if (el.dataset.tiltBound) continue;
    el.dataset.tiltBound = '1';
    el.addEventListener('pointermove', (e) => {
      if (!motionOn()) return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      const amp = r.width > 520 ? 2.2 : 5;
      el.classList.add('tilting');
      el.style.setProperty('--tx', `${((x - 0.5) * amp).toFixed(2)}deg`);
      el.style.setProperty('--ty', `${((0.5 - y) * amp).toFixed(2)}deg`);
      el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
      el.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
    });
    el.addEventListener('pointerleave', () => {
      el.classList.remove('tilting');
      el.style.setProperty('--tx', '0deg');
      el.style.setProperty('--ty', '0deg');
    });
  }
}

/* 横幅视差 */
window.addEventListener('blog:scroll', ((e: CustomEvent<{ y: number }>) => {
  const bg = $('.hero-bg');
  if (!bg || !motionOn()) return;
  const y = e.detail.y;
  if (y > innerHeight) return;
  bg.style.setProperty('--parallax', `${(y * 0.22).toFixed(1)}px`);
}) as EventListener);

/* 打字机 */
let typedTimer = 0;
function initTyped() {
  clearTimeout(typedTimer);
  const box = $('.hero-typed');
  const out = $('.typed-text', box ?? document);
  if (!box || !out) return;
  let list: string[] = [];
  try {
    list = JSON.parse(box.dataset.slogans || '[]');
  } catch {}
  if (!list.length || !motionOn()) return;
  let i = 0;
  let pos = list[0].length;
  let deleting = true;
  const tick = () => {
    if (!document.body.contains(out)) return;
    const word = list[i];
    if (deleting) {
      pos--;
      out.textContent = word.slice(0, Math.max(0, pos));
      if (pos <= 0) {
        deleting = false;
        i = (i + 1) % list.length;
      }
      typedTimer = window.setTimeout(tick, 45);
    } else {
      pos++;
      out.textContent = list[i].slice(0, pos);
      if (pos >= list[i].length) {
        deleting = true;
        typedTimer = window.setTimeout(tick, 2800);
      } else typedTimer = window.setTimeout(tick, 110);
    }
  };
  typedTimer = window.setTimeout(tick, 3200);
}

export function initEffects() {
  initReveal();
  initTilt();
  initTyped();
}

/* ---------------- 换页过渡 ----------------
   不走浏览器的 View Transition（见 BaseLayout.astro）：旧正文上移、卡片淡下去一点后直接换成新页面，新正文从下方滑入、卡片淡回来（animations.css）。
   侧栏卡片前后位置、大小都一样的保持不动；新出现或挪了位置的淡入（.side-enter） */

const within = (p: Promise<unknown>, ms: number) => Promise.race([p, new Promise((r) => setTimeout(r, ms))]);

/** 新页面正文里首屏的图片（封面、文章第一张图）先下载、解码好：它们是同步解码的，换上去第一帧就带着，不会先空一块再冒出来 */
function preloadImages(doc: Document | undefined) {
  const imgs = doc ? [...doc.querySelectorAll<HTMLImageElement>('.main img[loading="eager"]')] : [];
  return Promise.all(
    imgs.map((src) => {
      const img = new Image();
      for (const a of ['sizes', 'srcset', 'src']) {
        const v = src.getAttribute(a);
        if (v) img.setAttribute(a, v);
      }
      return img.decode().catch(() => {});
    }),
  );
}

/* 点击后马上开始离开动画（.page-leave），同时抓取新页面、预载它的首屏图片，都完成才换页，新卡片从同样的不透明度接着淡回来。
   离开动画最多等 0.4 秒（标签页在后台时动画不推进），图片最多多等 0.25 秒（网速慢时不为它拖住换页） */
document.addEventListener('astro:before-preparation', (e) => {
  const ev = e as TransitionBeforePreparationEvent;
  const main = $('.main');
  let left: Promise<unknown> = Promise.resolve();
  if (main && motionOn()) {
    main.classList.add('page-leave');
    const leave = main.getAnimations().find((a) => (a as CSSAnimation).animationName === 'pageLeave');
    if (leave) left = within(leave.finished.catch(() => {}), 400);
  }
  const load = ev.loader;
  ev.loader = async () => {
    try {
      await load();
      await Promise.all([left, within(preloadImages(ev.newDocument), 250)]);
    } catch (err) {
      main?.classList.remove('page-leave');
      throw err;
    }
  };
});
// 换页失败改成整页跳转后，按返回键从缓存恢复的旧页面不能停在离开动画的样子
window.addEventListener('pageshow', (e) => {
  if (e.persisted) $('.main')?.classList.remove('page-leave');
});

interface Card {
  key: string;
  el: Element;
  r: DOMRect;
}
let oldCards: Card[] = [];

/** 侧栏里看得见的卡片；类名相同的卡片在两页之间算同一张 */
function sideCards(): Card[] {
  const seen = new Map<string, number>();
  return $$('.side-inner > *').flatMap((el) => {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return []; // 窄屏时侧栏隐藏
    const cls = [...el.classList].filter((c) => !['revealed', 'will-reveal', 'side-enter'].includes(c)).join('.');
    const n = seen.get(cls) ?? 0;
    seen.set(cls, n + 1);
    return [{ key: `${cls}#${n}`, el, r }];
  });
}

/** 加一个动画类，播完就去掉 */
function playOnce(el: Element, cls: string) {
  el.classList.add(cls);
  const done = (e: Event) => {
    if (e.target !== el) return;
    el.classList.remove(cls);
    el.removeEventListener('animationend', done);
  };
  el.addEventListener('animationend', done);
}

const sameBox = (a: DOMRect, b: DOMRect) =>
  Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1 && Math.abs(a.width - b.width) < 1 && Math.abs(a.height - b.height) < 1;

document.addEventListener('astro:before-swap', () => {
  oldCards = sideCards();
});

document.addEventListener('astro:after-swap', () => {
  // 换页时侧栏已经显示过，不再重复入场动画
  $$('.side [data-reveal], .drawer [data-reveal]').forEach((el) => el.classList.add('revealed'));
  // 分类树展开状态、日历、热力图平时在 page-load 才渲染，先渲染成最终尺寸再测量，否则它们和下面的卡片每次都算"变了"
  layoutSidebar();
  if (motionOn()) {
    for (const c of sideCards()) {
      const old = oldCards.find((o) => o.key === c.key);
      if (!old || !sameBox(old.r, c.r)) playOnce(c.el, 'side-enter');
    }
    // 新页面的正文从下方滑入，卡片淡回来
    const main = $('.main');
    if (main) playOnce(main, 'page-enter');
  }
  oldCards = [];
});
