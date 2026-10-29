export const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
export const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) =>
  Array.from(root.querySelectorAll<T>(sel));

export interface Settings {
  mode: 'auto' | 'light' | 'dark';
  primary: string;
  bg: string;
  bgCustom: string;
  bgBlur: number;
  cardOpacity: number;
  fontSize: number;
  motion: boolean;
}

interface BlogApi {
  read(): Settings;
  save(patch: Partial<Settings>): void;
  reset(): void;
  apply(): void;
  defaults: Settings;
  backgrounds: { id: string; type: string; value: string }[];
}

declare global {
  interface Window {
    __blog: BlogApi;
  }
}

export const blog = () => window.__blog;
export const motionOn = () => document.documentElement.dataset.motion !== 'off';
export const finePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

export function toast(msg: string) {
  $$('.toast').forEach((t) => t.remove());
  const t = document.createElement('div');
  t.className = 'toast';
  t.setAttribute('role', 'status');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2300);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    const focused = document.activeElement;
    try {
      ta.select();
      return document.execCommand('copy');
    } catch {
      return false;
    } finally {
      ta.remove();
      if (focused instanceof HTMLElement) focused.focus({ preventScroll: true });
    }
  }
}

/** 弹层打开时接住焦点，Tab 留在弹层中，关闭时回到原来的按钮。 */
export function trapFocus(container: HTMLElement) {
  const previous = document.activeElement;
  const focusable = () => $$<HTMLElement>('a[href], button, input, select, textarea, [tabindex]', container)
    .filter((el) => el.tabIndex >= 0 && !el.matches(':disabled') && !el.closest('[inert]') && el.getClientRects().length > 0);
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const items = focusable();
    const first = items[0];
    const last = items[items.length - 1];
    if (!first) {
      e.preventDefault();
      return;
    }
    if (e.shiftKey && (document.activeElement === first || !container.contains(document.activeElement))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (document.activeElement === last || !container.contains(document.activeElement))) {
      e.preventDefault();
      first.focus();
    }
  };
  document.addEventListener('keydown', onKey);
  // 抽屉、设置面板、目录、灯箱靠 visibility 过渡显示，刚加上 .open 时还算隐藏，focus() 会落空：落空就下一帧再试
  let released = false;
  let tries = 0;
  const focusIn = () => {
    if (released) return;
    (focusable()[0] ?? container).focus({ preventScroll: true });
    if (!container.contains(document.activeElement) && ++tries < 10) requestAnimationFrame(focusIn);
  };
  focusIn();
  return (restore = true) => {
    released = true;
    document.removeEventListener('keydown', onKey);
    if (restore && previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
  };
}

export interface DayActivity {
  n: number;
  w: number;
  posts: { t: string; u: string }[];
}

let activityNode: Element | null = null;
let activityCache: Record<string, DayActivity> = {};
export function activity(): Record<string, DayActivity> {
  const node = $('#activity-data');
  if (node === activityNode) return activityCache;
  activityNode = node;
  try {
    activityCache = JSON.parse(node?.textContent || '{}');
  } catch {
    activityCache = {};
  }
  return activityCache;
}

export const pad = (n: number) => String(n).padStart(2, '0');
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function rafThrottle<T extends (...a: any[]) => void>(fn: T): T {
  let queued = false;
  let latest: Parameters<T>;
  return ((...args: any[]) => {
    latest = args as Parameters<T>;
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      fn(...latest);
    });
  }) as T;
}
