/** 侧栏组件：分类树折叠、日历、热力图、运行天数 */
import { navigate } from 'astro:transitions/client';
import { $, $$, activity, rafThrottle, ymd, type DayActivity } from './util';

/* ---------------- 分类树 ---------------- */
const CAT_KEY = 'blog-cat-open';
const readOpen = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(CAT_KEY) || '[]');
  } catch {
    return [];
  }
};

document.addEventListener('click', (e) => {
  const btn = (e.target as Element).closest('.cat-toggle');
  if (!btn) return;
  const item = btn.closest<HTMLElement>('.cat-item');
  if (!item) return;
  const open = !item.classList.contains('open');
  const key = item.dataset.key!;
  // 两份分类树（侧栏 + 抽屉）同步
  $$(`.cat-item[data-key="${CSS.escape(key)}"]`).forEach((el) => {
    el.classList.toggle('open', open);
    el.querySelector(':scope > .cat-row .cat-toggle')?.setAttribute('aria-expanded', String(open));
  });
  const set = new Set(readOpen());
  open ? set.add(key) : set.delete(key);
  try {
    localStorage.setItem(CAT_KEY, JSON.stringify([...set]));
  } catch {}
});

function initCategoryTree() {
  for (const key of readOpen()) {
    $$(`.cat-item.has-children[data-key="${CSS.escape(key)}"]`).forEach((el) => {
      el.classList.add('open');
      el.querySelector(':scope > .cat-row .cat-toggle')?.setAttribute('aria-expanded', 'true');
    });
  }
}

/* ---------------- 日历 ---------------- */
let calYear = 0;
let calMonth = 0;

function goDay(day: string, data: DayActivity) {
  if (data.posts.length === 1) navigate(data.posts[0].u);
  else navigate(`/archives/#d-${day}`);
}

function renderCalendar(dir: 'left' | 'right' | null = null) {
  for (const box of $$('.calendar')) renderCalendarIn(box, dir);
}

function renderCalendarIn(box: HTMLElement, dir: 'left' | 'right' | null) {
  const grid = $('.cal-grid', box);
  if (!grid) return;
  const act = activity();
  const today = ymd(new Date());
  const first = new Date(calYear, calMonth, 1);
  const offset = (first.getDay() + 6) % 7; // 周一开头
  const start = new Date(calYear, calMonth, 1 - offset);
  const cells: string[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    if (i >= 35 && d.getMonth() !== calMonth) break;
    const key = ymd(d);
    const a = act[key];
    const cls = ['cal-day'];
    if (d.getMonth() !== calMonth) cls.push('other');
    if (key === today) cls.push('today');
    if (a) cls.push('has');
    const tip = a ? a.posts.map((p) => p.t).join('、') : '';
    cells.push(
      a
        ? `<button class="${cls.join(' ')}" data-day="${key}" title="${tip.replace(/"/g, '&quot;')}">${d.getDate()}</button>`
        : `<span class="${cls.join(' ')}">${d.getDate()}</span>`,
    );
  }
  grid.innerHTML = cells.join('');
  const title = $('.cal-title', box);
  if (title) title.textContent = `${calYear} 年 ${calMonth + 1} 月`;
  if (dir) {
    grid.classList.remove('slide-left', 'slide-right');
    void grid.offsetWidth;
    grid.classList.add(`slide-${dir}`);
  }
}

document.addEventListener('click', (e) => {
  const t = e.target as Element;
  const nav = t.closest<HTMLElement>('[data-cal]');
  if (nav) {
    const a = nav.dataset.cal;
    if (a === 'today') {
      const now = new Date();
      calYear = now.getFullYear();
      calMonth = now.getMonth();
      renderCalendar('right');
    } else {
      calMonth += a === 'next' ? 1 : -1;
      if (calMonth < 0) (calMonth = 11), calYear--;
      if (calMonth > 11) (calMonth = 0), calYear++;
      renderCalendar(a === 'next' ? 'right' : 'left');
    }
    return;
  }
  const day = t.closest<HTMLElement>('.cal-day[data-day], .hm-cell[data-day]');
  if (day) {
    const key = day.dataset.day!;
    const a = activity()[key];
    if (a) goDay(key, a);
  }
});

/* ---------------- 热力图 ---------------- */
let tipEl: HTMLElement | null = null;
const hideTip = () => {
  tipEl?.remove();
  tipEl = null;
};

function level(a?: DayActivity) {
  if (!a) return 0;
  const byWords = a.w >= 6000 ? 4 : a.w >= 3000 ? 3 : a.w >= 1200 ? 2 : 1;
  return Math.min(4, Math.max(byWords, a.n >= 3 ? 3 : 1));
}

export function renderHeatmap() {
  for (const box of $$('.heatmap')) renderHeatmapIn(box);
}

function renderHeatmapIn(box: HTMLElement) {
  const grid = $('.hm-grid', box);
  const months = $('.hm-months', box);
  if (!grid || !months) return;
  const width = grid.clientWidth || box.clientWidth - 32;
  if (width <= 0) return;
  const scale = parseFloat(getComputedStyle(document.documentElement).fontSize) / 16 || 1;
  const CELL = 11 * scale;
  const GAP = 3 * scale;
  const weeks = Math.max(12, Math.min(53, Math.floor((width + GAP) / (CELL + GAP))));
  grid.style.gridTemplateColumns = `repeat(${weeks}, 1fr)`;
  const act = activity();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dow = (today.getDay() + 6) % 7;
  const start = new Date(today);
  start.setDate(today.getDate() - dow - (weeks - 1) * 7);
  const cells: string[] = [];
  const labels: string[] = [];
  let total = 0;
  let words = 0;
  let lastMonth = -1;
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const day = new Date(start);
      day.setDate(start.getDate() + w * 7 + d);
      const key = ymd(day);
      const a = act[key];
      if (d === 0 && day.getMonth() !== lastMonth) {
        lastMonth = day.getMonth();
        if (w < weeks - 2) labels.push(`<span style="left:${(w / weeks) * 100}%">${day.getMonth() + 1}月</span>`);
      }
      if (day > today) {
        cells.push('<i class="hm-cell future"></i>');
        continue;
      }
      if (a) {
        total += a.n;
        words += a.w;
      }
      cells.push(`<i class="hm-cell" data-l="${level(a)}" data-day="${key}"></i>`);
    }
  }
  grid.innerHTML = cells.join('');
  months.innerHTML = labels.join('');
  const sum = $('.hm-summary', box);
  if (sum) sum.textContent = `近 ${weeks} 周 · ${total} 篇 · ${words.toLocaleString()} 字`;
}

document.addEventListener('pointerover', (e) => {
  const cell = (e.target as Element).closest<HTMLElement>('.hm-cell[data-day]');
  if (!cell) return hideTip();
  const key = cell.dataset.day!;
  const a = activity()[key];
  const [y, m, d] = key.split('-');
  const text = a ? `${y}年${+m}月${+d}日 · ${a.n} 篇 · ${a.w.toLocaleString()} 字` : `${y}年${+m}月${+d}日 · 没有发文`;
  hideTip();
  tipEl = document.createElement('div');
  tipEl.className = 'tooltip';
  tipEl.textContent = a?.posts.length ? `${text}\n${a.posts[0].t}` : text;
  tipEl.style.whiteSpace = 'pre';
  const r = cell.getBoundingClientRect();
  tipEl.style.left = `${Math.min(innerWidth - 140, Math.max(140, r.left + r.width / 2))}px`;
  tipEl.style.top = `${r.top}px`;
  document.body.appendChild(tipEl);
});
document.addEventListener('scroll', hideTip, { passive: true });

let resizeTimer = 0;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(renderHeatmap, 150);
});

/* ---------------- 运行天数 ---------------- */
function initSince() {
  for (const el of $$('[data-since]')) {
    const since = new Date(el.dataset.since + 'T00:00:00+08:00').getTime();
    el.textContent = String(Math.max(1, Math.floor((Date.now() - since) / 86400000) + 1));
  }
}

/* ---------------- 侧栏上下边缘渐隐 ---------------- */
// 侧栏内容超出时，滚动区域的上下边缘做渐隐，而不是生硬截断。
// 遮罩加在每张卡片上（加在整个侧栏上会让卡片的毛玻璃模糊失效），按卡片在可视区的位置计算。
const wide = window.matchMedia('(min-width: 1280px)');
const FADE = 48; // 渐隐区高度（px）
const EXT = 48; // 遮罩向卡片上下多延伸的距离，避免阴影被切掉（与 CSS 中 --fe 一致）
let fadeRO: ResizeObserver | null = null;

function fadeEdges(side: HTMLElement) {
  const cards = Array.from(side.querySelectorAll<HTMLElement>(':scope > .side-inner > *'));
  if (!wide.matches) {
    for (const c of cards) c.classList.remove('edge-fade');
    return;
  }
  // 读：先读出所有位置（offsetTop 不受悬停/动画的 transform 影响，遮罩不会抖动）
  const top = side.scrollTop;
  const h = side.clientHeight;
  const max = side.scrollHeight - h;
  // 已经滚到顶/底时不渐隐；离边缘越近渐隐越浅，过渡自然
  const ft = Math.min(FADE, Math.max(0, top));
  const fb = Math.min(FADE, Math.max(0, max - top));
  const pos = cards.map((c) => [c.offsetTop - top, c.offsetHeight]);
  // 写
  cards.forEach((c, i) => {
    const [y, ch] = pos[i];
    // 只处理可见且碰到渐隐区的卡片（完全滚出去的不用加遮罩）
    const hit = y < h && y + ch > 0 && ((ft > 0 && y < ft) || (fb > 0 && y + ch > h - fb));
    c.classList.toggle('edge-fade', hit);
    if (!hit) return;
    const o = EXT - y;
    c.style.setProperty('--f0', `${o}px`);
    c.style.setProperty('--f1', `${o + ft}px`);
    c.style.setProperty('--f2', `${o + h - fb}px`);
    c.style.setProperty('--f3', `${o + h}px`);
  });
}

function initEdgeFade() {
  // 侧栏高度或内容变化（窗口缩放、展开分类、切换月份等）时重新计算
  fadeRO?.disconnect();
  fadeRO =
    'ResizeObserver' in window
      ? new ResizeObserver((es) => new Set(es.map((e) => e.target.closest<HTMLElement>('.side'))).forEach((s) => s && fadeEdges(s)))
      : null;
  for (const side of $$<HTMLElement>('.side')) {
    const run = rafThrottle(() => fadeEdges(side));
    side.addEventListener('scroll', run, { passive: true });
    fadeRO?.observe(side);
    const inner = $('.side-inner', side);
    if (inner) fadeRO?.observe(inner);
    fadeEdges(side);
  }
}
wide.addEventListener('change', () => $$<HTMLElement>('.side').forEach(fadeEdges));

export function initSidebar() {
  initCategoryTree();
  const now = new Date();
  if (!calYear) {
    calYear = now.getFullYear();
    calMonth = now.getMonth();
  }
  renderCalendar();
  renderHeatmap();
  initSince();
  initEdgeFade();
  hideTip();
}

