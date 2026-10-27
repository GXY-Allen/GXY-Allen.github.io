/** 视觉特效：滚动显现、卡片 3D 倾斜、横幅视差、打字机 */
import { $, $$, finePointer, motionOn } from './util';

let io: IntersectionObserver | null = null;

function initReveal() {
  io?.disconnect();
  if (!motionOn() || !('IntersectionObserver' in window)) return;
  const candidates = [...$$('[data-reveal]:not(.revealed)'), ...$$('.prose > *')];
  // 先一次性读取位置（避免读写交替导致反复重排），首屏内的元素直接显示
  const limit = innerHeight * 0.92;
  const below = candidates.filter((el) => el.getBoundingClientRect().top > limit);
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
   旧画面盖在新页面上淡出，但只露出正文栏和侧栏里有变化的卡片（遮罩见 animations.css），其余地方直接就是新页面。
   侧栏卡片前后位置、大小都一样的保持不动；新出现或挪了位置的，旧的随旧画面淡出、新的稍后淡入，不会叠出重影 */
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

const maskBox = (x: number, y: number, w: string, h: string) => `linear-gradient(#000 0 0) ${x}px ${y}px / ${w} ${h} no-repeat`;
const sameBox = (a: DOMRect, b: DOMRect) =>
  Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1 && Math.abs(a.width - b.width) < 1 && Math.abs(a.height - b.height) < 1;

document.addEventListener('astro:before-swap', () => {
  oldCards = sideCards();
});

document.addEventListener('astro:after-swap', () => {
  // 换页时侧栏已经显示过，不再重复入场动画
  $$('.side [data-reveal], .drawer [data-reveal]').forEach((el) => el.classList.add('revealed'));
  const main = $('.main');
  if (!main) return;
  // 正文栏：左右各延伸到它和侧栏之间空隙的中线
  const m = main.getBoundingClientRect();
  let left = 0;
  let right = Infinity;
  for (const side of $$('.side-inner')) {
    const s = side.getBoundingClientRect();
    if (!s.width) continue;
    if (s.right <= m.left) left = Math.max(left, (s.right + m.left) / 2);
    else if (s.left >= m.right) right = Math.min(right, (m.right + s.left) / 2);
  }
  const layers = [maskBox(left, 0, right === Infinity ? `calc(100% - ${left}px)` : `${right - left}px`, '100%')];
  const kept = new Set<string>();
  for (const c of sideCards()) {
    const old = oldCards.find((o) => o.key === c.key);
    if (old && sameBox(old.r, c.r)) kept.add(c.key);
    else if (motionOn()) playOnce(c.el, 'side-enter');
  }
  // 变了的旧卡片（连同一圈阴影）随旧画面一起淡出
  for (const { key, r } of oldCards) if (!kept.has(key)) layers.push(maskBox(r.x - 12, r.y - 12, `${r.width + 24}px`, `${r.height + 24}px`));
  document.documentElement.style.setProperty('--vt-old-mask', layers.join(', '));
  oldCards = [];
  // 新页面的正文从下方滑入
  if (motionOn()) playOnce(main, 'page-enter');
});
