/** 外观设置面板 */
import { $, $$, blog, toast, type Settings } from './util';

function setFill(input: HTMLInputElement) {
  const min = +input.min || 0;
  const max = +input.max || 100;
  input.style.setProperty('--fill', `${((+input.value - min) / (max - min)) * 100}%`);
}

const fmt: Record<string, (v: number) => string> = {
  bgBlur: (v) => `${v}px`,
  cardOpacity: (v) => `${Math.round(v * 100)}%`,
  fontSize: (v) => `${v}px`,
};

function sync() {
  const panel = $('#settings-panel');
  if (!panel) return;
  const s = blog().read();
  $$<HTMLButtonElement>('[data-setting="mode"] button', panel).forEach((b) => b.classList.toggle('active', b.dataset.value === s.mode));
  let preset = false;
  $$<HTMLButtonElement>('[data-setting="primary"] .swatch[data-value]', panel).forEach((b) => {
    const on = b.dataset.value!.toLowerCase() === s.primary.toLowerCase();
    preset ||= on;
    b.classList.toggle('active', on);
  });
  const custom = $<HTMLInputElement>('[data-custom-color]', panel);
  if (custom) {
    custom.value = /^#[0-9a-f]{6}$/i.test(s.primary) ? s.primary : '#5b8def';
    custom.closest('.swatch')?.classList.toggle('active', !preset);
  }
  $$<HTMLElement>('[data-setting="bg"] .bg-option', panel).forEach((b) => b.classList.toggle('active', b.dataset.value === s.bg));
  const url = $<HTMLInputElement>('[data-bg-url]', panel);
  if (url && s.bg === 'custom') url.value = s.bgCustom;
  for (const key of ['bgBlur', 'cardOpacity', 'fontSize'] as const) {
    const input = $<HTMLInputElement>(`input[data-setting="${key}"]`, panel);
    if (input) {
      input.value = String(s[key]);
      setFill(input);
    }
    const out = $(`[data-out="${key}"]`, panel);
    if (out) out.textContent = fmt[key](+s[key]);
  }
  for (const key of ['motion', 'live2d'] as const) {
    const input = $<HTMLInputElement>(`input[data-setting="${key}"]`, panel);
    if (input) input.checked = !!s[key];
  }
}

/** 把本地图片压缩后存进浏览器 */
function loadLocalImage(file: File) {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1920 / img.width);
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      const data = c.toDataURL('image/jpeg', 0.82);
      try {
        localStorage.setItem('blog-bg-upload', data);
        blog().save({ bg: 'upload' });
        toast('背景已更换');
      } catch {
        toast('图片太大了，换一张小一点的试试');
      }
    };
    img.src = reader.result as string;
  };
  reader.readAsDataURL(file);
}

document.addEventListener('click', (e) => {
  const t = e.target as Element;
  if (!t.closest('#settings-panel')) return;
  const mode = t.closest<HTMLElement>('[data-setting="mode"] button');
  if (mode) return blog().save({ mode: mode.dataset.value as Settings['mode'] });
  const sw = t.closest<HTMLElement>('.swatch[data-value]');
  if (sw) return blog().save({ primary: sw.dataset.value });
  const bg = t.closest<HTMLElement>('button.bg-option');
  if (bg) return blog().save({ bg: bg.dataset.value });
  if (t.closest('.bg-upload') && !t.closest('input')) {
    const has = (() => {
      try {
        return !!localStorage.getItem('blog-bg-upload');
      } catch {
        return false;
      }
    })();
    // 已经上传过且当前没在用：直接切回；否则选择新图片
    if (has && blog().read().bg !== 'upload') {
      e.preventDefault();
      blog().save({ bg: 'upload' });
    }
    return;
  }
  if (t.closest('[data-bg-url-apply]')) return applyUrl();
  if (t.closest('[data-settings-reset]')) {
    blog().reset();
    toast('已恢复默认外观');
  }
});

function applyUrl() {
  const input = $<HTMLInputElement>('[data-bg-url]');
  const v = input?.value.trim();
  if (!v) return;
  if (!/^(https?:)?\/\//.test(v) && !v.startsWith('/')) return toast('请输入图片链接');
  blog().save({ bg: 'custom', bgCustom: v });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.target as Element).matches?.('[data-bg-url]')) applyUrl();
});

document.addEventListener('input', (e) => {
  const t = e.target as HTMLInputElement;
  if (!t.closest?.('#settings-panel')) return;
  if (t.matches('[data-custom-color]')) return blog().save({ primary: t.value });
  const key = t.dataset.setting as keyof Settings | undefined;
  if (!key) return;
  if (t.type === 'range') {
    setFill(t);
    blog().save({ [key]: +t.value } as Partial<Settings>);
  }
});

document.addEventListener('change', (e) => {
  const t = e.target as HTMLInputElement;
  if (!t.closest?.('#settings-panel')) return;
  if (t.matches('[data-bg-file]') && t.files?.[0]) {
    loadLocalImage(t.files[0]);
    t.value = '';
    return;
  }
  const key = t.dataset.setting as keyof Settings | undefined;
  if (key && t.type === 'checkbox') blog().save({ [key]: t.checked } as Partial<Settings>);
});

window.addEventListener('blog:settings', sync);

export function initSettings() {
  sync();
}
