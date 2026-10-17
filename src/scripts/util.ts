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
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

export interface DayActivity {
  n: number;
  w: number;
  posts: { t: string; u: string }[];
}

export function activity(): Record<string, DayActivity> {
  try {
    return JSON.parse($('#activity-data')?.textContent || '{}');
  } catch {
    return {};
  }
}

export const pad = (n: number) => String(n).padStart(2, '0');
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function rafThrottle<T extends (...a: any[]) => void>(fn: T): T {
  let queued = false;
  return ((...args: any[]) => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      fn(...args);
    });
  }) as T;
}
