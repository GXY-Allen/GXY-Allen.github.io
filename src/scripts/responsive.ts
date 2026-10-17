/**
 * 手机/平板（<1024px）：把左右侧栏的卡片移进左上角菜单；宽屏时再移回去。
 * 只移动同一份元素，不重复渲染，页面更轻。
 */
import { $, $$ } from './util';
import { renderHeatmap } from './sidebar';

const mobile = window.matchMedia('(max-width: 1023.98px)');
/** 这些留在原处：目录和搜索框在手机上有单独的入口 */
const STAY = '.toc, .search-box';

function place() {
  const top = $('#drawer .drawer-slot-top');
  const slot = $('#drawer .drawer-slot');
  const homes = { left: $('.side-left .side-inner'), right: $('.side-right .side-inner') };
  if (!top || !slot || !homes.left || !homes.right) return;

  // 第一次运行时记下每张卡片原来的位置
  for (const side of ['left', 'right'] as const) {
    Array.from(homes[side].children).forEach((el, i) => {
      const h = el as HTMLElement;
      if (!h.dataset.home) {
        h.dataset.home = side;
        h.dataset.order = String(i);
      }
    });
  }
  const cards = $$<HTMLElement>('[data-home]')
    .filter((el) => !el.matches(STAY))
    .sort((a, b) => (a.dataset.home === b.dataset.home ? +a.dataset.order! - +b.dataset.order! : a.dataset.home === 'left' ? -1 : 1));

  const inDrawer = cards.length > 0 && cards[0].closest('#drawer') !== null;
  if (mobile.matches && !inDrawer) {
    for (const el of cards) (el.classList.contains('profile') ? top : slot).appendChild(el);
  } else if (!mobile.matches && inDrawer) {
    for (const el of cards) homes[el.dataset.home as 'left' | 'right']!.appendChild(el);
  } else return;
  renderHeatmap();
}

// 变宽时立刻移回侧栏；变窄时等第一次打开菜单再搬（不占用页面加载时间）
mobile.addEventListener('change', () => {
  if (!mobile.matches) place();
});
window.addEventListener('blog:open', ((e: CustomEvent<string>) => {
  if (e.detail === 'drawer') place();
}) as EventListener);

export function initResponsive() {
  if (!mobile.matches) place();
}
