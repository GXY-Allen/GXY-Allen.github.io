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

/* 换页时侧栏已经显示过，不再重复入场动画 */
document.addEventListener('astro:after-swap', () => {
  $$('.side [data-reveal], .drawer [data-reveal]').forEach((el) => el.classList.add('revealed'));
});
