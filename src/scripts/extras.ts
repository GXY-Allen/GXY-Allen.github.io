/** 第三方小功能：不蒜子访问统计、Live2D 看板娘 */
import { SITE } from '../site.config';
import { $, $$, blog, finePointer } from './util';

/* ---------------- 不蒜子 ---------------- */
const BSZ_SRC = 'https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js';
let bszTimer = 0;

function initBusuanzi() {
  if (!SITE.features.busuanzi) return;
  const targets = $$('.bsz[data-bsz]');
  if (!targets.length) return;
  // 不蒜子只认固定 id，所以放一组隐藏的源节点，拿到数字后再复制到页面各处
  let src = $('#bsz-src');
  if (!src) {
    src = document.createElement('div');
    src.id = 'bsz-src';
    src.hidden = true;
    document.body.appendChild(src);
  }
  src.innerHTML = ['site_pv', 'site_uv', 'page_pv'].map((k) => `<span id="busuanzi_value_${k}"></span>`).join('');
  $$('script[data-bsz-script]').forEach((s) => s.remove());
  const s = document.createElement('script');
  s.src = BSZ_SRC;
  s.async = true;
  s.referrerPolicy = 'no-referrer-when-downgrade';
  s.dataset.bszScript = '';
  document.body.appendChild(s);

  clearInterval(bszTimer);
  const started = Date.now();
  bszTimer = window.setInterval(() => {
    const val = (k: string) => document.getElementById(`busuanzi_value_${k}`)?.textContent?.trim();
    if (val('site_pv')) {
      clearInterval(bszTimer);
      for (const el of $$('.bsz[data-bsz]')) {
        const v = val(el.dataset.bsz!);
        el.textContent = v ? Number(v).toLocaleString() : '-';
      }
    } else if (Date.now() - started > 8000) {
      clearInterval(bszTimer);
      // 统计服务连不上时隐藏，避免一直显示省略号
      $$('.bsz-item').forEach((el) => el.classList.add('hidden'));
    }
  }, 300);
}

/* ---------------- Live2D 看板娘 ---------------- */
const L2D = 'https://fastly.jsdelivr.net/npm/live2d-widgets@1.0.1/dist/';
let l2dState: 'idle' | 'loading' | 'ready' = 'idle';

function wantLive2d() {
  const cfg = SITE.features.live2d;
  const s = blog().read();
  return cfg.enable && s.live2d && s.motion && innerWidth >= cfg.minWidth && finePointer();
}

const loadCss = (href: string) =>
  new Promise<void>((resolve, reject) => {
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    l.onload = () => resolve();
    l.onerror = reject;
    document.head.appendChild(l);
  });
const loadModule = (src: string) =>
  new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.type = 'module';
    s.src = src;
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });

function adopt() {
  const host = $('#waifu-host');
  if (!host) return;
  for (const id of ['waifu', 'waifu-toggle']) {
    const n = document.getElementById(id);
    if (n && n.parentElement !== host) host.appendChild(n);
  }
}

function setVisible(on: boolean) {
  const host = $('#waifu-host');
  if (host) host.style.display = on ? '' : 'none';
}

async function loadLive2d() {
  if (l2dState !== 'idle') return;
  l2dState = 'loading';
  try {
    // 模型贴图来自 CDN，需要以跨域方式加载
    const OriginalImage = window.Image;
    const Patched = function (this: unknown, ...args: [number?, number?]) {
      const img = new OriginalImage(...args);
      img.crossOrigin = 'anonymous';
      return img;
    } as unknown as typeof Image;
    Patched.prototype = OriginalImage.prototype;
    window.Image = Patched;

    await Promise.all([loadCss(L2D + 'waifu.css'), loadModule(L2D + 'waifu-tips.js')]);
    new MutationObserver(adopt).observe(document.body, { childList: true });
    window.initWidget?.({
      waifuPath: '/live2d/waifu-tips.json',
      cubism2Path: L2D + 'live2d.min.js',
      cubism5Path: 'https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js',
      modelId: SITE.features.live2d.modelId,
      tools: ['hitokoto', 'switch-model', 'switch-texture', 'photo', 'info', 'quit'],
      logLevel: 'error',
      drag: false,
    });
    adopt();
    l2dState = 'ready';
  } catch (err) {
    console.warn('看板娘加载失败（可能是网络原因）', err);
    l2dState = 'idle';
  }
}

function initLive2d() {
  const want = wantLive2d();
  if (want) {
    setVisible(true);
    if (l2dState === 'idle') {
      const start = () => loadLive2d();
      'requestIdleCallback' in window ? (window as any).requestIdleCallback(start, { timeout: 3000 }) : setTimeout(start, 1500);
    }
  } else setVisible(false);
}

window.addEventListener('blog:settings', initLive2d);
let l2dResize = 0;
window.addEventListener('resize', () => {
  clearTimeout(l2dResize);
  l2dResize = window.setTimeout(initLive2d, 300);
});

export function initExtras() {
  initBusuanzi();
  initLive2d();
}
