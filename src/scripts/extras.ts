/** 第三方小功能：不蒜子访问统计 */
import { SITE } from '../site.config';
import { $, $$ } from './util';

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

export function initExtras() {
  initBusuanzi();
}
