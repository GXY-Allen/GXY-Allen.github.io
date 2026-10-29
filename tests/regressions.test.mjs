import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync, mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { resolve, relative, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { transformWithOxc } from 'vite';
import { parse as parseYaml } from 'yaml';
import remarkBlog from '../src/plugins/remark-blog.mjs';
import rehypeBlog from '../src/plugins/rehype-blog.mjs';
import { getRemoteImageSize } from '../src/utils/remote-images.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (file) => readFileSync(resolve(root, file), 'utf8');
async function script(file, expose, globals = {}) {
  const { code } = await transformWithOxc(read(file), file);
  const context = vm.createContext(globals);
  vm.runInContext(code.replace(/^import .*;\s*$/gm, '').replace(/\bexport (?=(?:function|const|async))/g, '') + `\nglobalThis.api = {${expose}};`, context);
  return context.api;
}

function boot(stored = '{}', blocked = false) {
  const listeners = new Map();
  const media = new Map();
  const storage = new Map([['blog-settings', stored]]);
  const document = {
    documentElement: { dataset: {}, style: { setProperty() {} } },
    querySelector: () => null,
    addEventListener() {},
  };
  const window = {
    innerWidth: 1024,
    matchMedia: (query) => ({ matches: false, addEventListener: (_, fn) => media.set(query, fn) }),
    addEventListener: (name, fn) => listeners.set(name, fn),
    dispatchEvent() {},
  };
  const context = vm.createContext({
    window, document,
    CustomEvent: class { constructor(type, detail) { this.type = type; this.detail = detail; } },
    localStorage: {
      getItem: (key) => { if (blocked) throw Error('denied'); return storage.get(key) ?? null; },
      setItem: (key, value) => { if (blocked) throw Error('denied'); storage.set(key, value); },
      removeItem: (key) => { if (blocked) throw Error('denied'); storage.delete(key); },
    },
    settingsDefaults: { mode: 'auto', primary: '#5b8def', bg: 'photo', bgBlur: 0, cardOpacity: 0.78, fontSize: 17 },
    backgrounds: [{ id: 'photo', type: 'image', value: '/photo.webp' }],
  });
  const source = read('src/layouts/BaseLayout.astro').match(/<script is:inline define:vars=\{\{ settingsDefaults, backgrounds \}\}>([\s\S]*?)<\/script>/)[1];
  vm.runInContext(source, context);
  return { api: window.__blog, document, storage, media, listeners };
}

test('损坏的外观设置恢复默认值，异常数值限制在有效范围', () => {
  for (const bad of ['null', '[]', '"text"', '{broken']) assert.equal(boot(bad).api.read().mode, 'auto');
  const { api } = boot(JSON.stringify({ primary: 12, mode: 'invalid', bgCustom: 4, bgBlur: -5, cardOpacity: 7, fontSize: null, motion: 'false' }));
  assert.equal(api.read().primary, '#5b8def');
  assert.equal(api.read().bgBlur, 0);
  assert.equal(api.read().cardOpacity, 1);
  assert.equal(api.read().fontSize, 17);
  assert.equal(api.read().motion, true);
});

test('浏览器禁止存储时仍可切换外观并恢复默认值', () => {
  const { api, document } = boot('{}', true);
  api.save({ mode: 'dark', fontSize: 20 });
  assert.equal(document.documentElement.dataset.theme, 'dark');
  assert.equal(api.read().fontSize, 20);
  api.reset();
  assert.equal(api.read().mode, 'auto');
  assert.equal(api.read().fontSize, 17);
});

test('修改颜色不覆盖系统动画偏好，跨标签页设置同步生效', () => {
  const { api, storage, media, listeners } = boot();
  api.save({ primary: '#123456' });
  assert.equal(Object.hasOwn(JSON.parse(storage.get('blog-settings')), 'motion'), false);
  media.get('(prefers-reduced-motion: reduce)')({ matches: true });
  assert.equal(api.read().motion, false);
  storage.set('blog-settings', '{"mode":"dark"}');
  listeners.get('storage')({ key: 'blog-settings' });
  assert.equal(api.read().mode, 'dark');
});

test('路径片段不会把标签变成多层路由或目录跳转', async () => {
  const api = await script('src/utils/paths.ts', 'tagUrl, seriesUrl, postIdFromPath');
  for (const value of ['a/b', '..', '.', '???', '']) {
    const url = api.tagUrl(value);
    assert.match(url, /^\/tags\/[^/]+\/$/);
    assert.equal(new URL(url, 'https://example.com').pathname, url);
  }
  assert.equal(api.postIdFromPath('技术\\测试文章\\index.md'), '技术/测试文章');
});

test('新建文章正确引用特殊标题，并拒绝逃离文章目录', () => {
  const temporary = mkdtempSync(resolve(tmpdir(), 'blog-regression-'));
  try {
    const title = '标题: "引号" & 特殊字符\n第二行';
    const run = (...args) => spawnSync(process.execPath, [resolve(root, 'scripts/new-post.mjs'), ...args], { cwd: temporary, encoding: 'utf8' });
    assert.equal(run(title, '技术').status, 0);
    const folder = readdirSync(resolve(temporary, 'src/content/posts/技术'))[0];
    const text = readFileSync(resolve(temporary, 'src/content/posts/技术', folder, 'index.md'), 'utf8');
    assert.equal(parseYaml(text.split('---')[1]).title, title);
    assert.equal(run('不能越界', '../../outside').status, 1);
  } finally {
    const rel = relative(resolve(tmpdir()), temporary);
    assert.ok(rel.startsWith('blog-regression-') && !rel.includes(sep) && !rel.startsWith('..'));
    rmSync(temporary, { recursive: true, force: true });
  }
});

test('远程图片离线时回退并合并请求，成功时读取真实图片尺寸', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  try {
    globalThis.fetch = async () => { calls++; throw Error('offline'); };
    const results = await Promise.all([getRemoteImageSize('https://test.invalid/offline.png'), getRemoteImageSize('https://test.invalid/offline.png')]);
    assert.deepEqual(results, [null, null]);
    assert.equal(calls, 1);
    globalThis.fetch = async () => new Response(readFileSync(resolve(root, 'src/content/posts/博客指南/Markdown示例/html.png')));
    const size = await getRemoteImageSize('https://test.invalid/valid.png');
    assert.ok(size.width > 0 && size.height > 0);
  } finally { globalThis.fetch = original; }
});

test('缺失的 public 图片不会使高度推断失败；Obsidian 数字开头说明不是宽度', async () => {
  const tree = { type: 'root', children: [
    { type: 'html', value: '<img src="/missing-test.png" height="200">' },
    { type: 'paragraph', children: [{ type: 'text', value: '![[https://example.com/a.png|2026 年示意图]]' }] },
  ] };
  await remarkBlog()(tree, { path: resolve(root, 'src/content/posts/技术/Git指南.md') });
  const missing = tree.children[0].children[0];
  assert.match(missing.data.hProperties.style, /max-height:200px/);
  const image = tree.children[1].children[0];
  assert.equal(image.alt, '2026 年示意图');
  assert.equal(image.data?.hProperties?.width, undefined);
});

test('表格内的外链和图片同样处理；离线图片退出 Astro 优化列表', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => { throw Error('offline'); };
    const url = 'https://offline.invalid/a.png';
    const md = { type: 'root', children: [{ type: 'image', url, alt: '' }] };
    await remarkBlog({ imageDomains: ['offline.invalid'] })(md, { path: resolve(root, 'src/content/posts/技术/Git指南.md') });
    const image = { type: 'element', tagName: 'img', properties: { src: url, ...md.children[0].data.hProperties }, children: [] };
    const link = { type: 'element', tagName: 'a', properties: { href: 'https://example.com' }, children: [] };
    const tree = { type: 'root', children: [{ type: 'element', tagName: 'table', properties: {}, children: [image, link] }] };
    const file = { data: { astro: { remoteImagePaths: [url] } } };
    rehypeBlog()(tree, file);
    assert.equal(tree.children[0].tagName, 'div');
    assert.equal(link.properties.target, '_blank');
    assert.equal(image.properties.loading, 'eager');
    assert.deepEqual(file.data.astro.remoteImagePaths, []);
  } finally { globalThis.fetch = original; }
});

function searchFixture() {
  const handlers = {};
  const windowHandlers = {};
  const timers = new Map();
  let nextTimer = 0;
  const navigations = [];
  const input = { value: '', addEventListener: (name, fn) => { handlers[name] = fn; } };
  const out = { innerHTML: '', setAttribute() {}, insertAdjacentHTML() {} };
  const element = { dataset: {}, isConnected: true };
  const globals = {
    $: (selector) => selector === '.search-input' ? input : out,
    $$: () => [...out.innerHTML.matchAll(/href="([^"]+)"/g)].map((m) => ({ getAttribute: () => m[1], classList: { remove() {}, toggle() {} }, scrollIntoView() {} })),
    activity: () => ({}), navigate: (url) => navigations.push(url),
    window: { addEventListener: (name, fn) => { windowHandlers[name] = fn; }, removeEventListener() {}, setTimeout: (fn) => { timers.set(++nextTimer, fn); return nextTimer; } },
    document: { addEventListener() {} }, clearTimeout: (id) => timers.delete(id),
    fetch: async () => ({ ok: true, json: async () => [
      { url: '/old/', title: '旧文章', desc: '', tags: '', text: '' },
      { url: '/new/', title: '新文章', desc: '', tags: '', text: '' },
    ] }),
  };
  const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
  const enter = (isComposing = false) => handlers.keydown({ key: 'Enter', isComposing, preventDefault() {} });
  const inputText = (text) => { input.value = text; handlers.input({ isComposing: false }); };
  const render = async () => { const pending = [...timers.values()]; timers.clear(); for (const fn of pending) await fn(); await flush(); };
  return { handlers, windowHandlers, navigations, input, out, element, globals, inputText, enter, flush, render };
}

test('中文输入法确认不会打开文章，防抖期间 Enter 只打开新查询结果', async () => {
  const f = searchFixture();
  const api = await script('src/scripts/search.ts', 'bind', f.globals);
  api.bind(f.element);
  f.inputText('旧');
  await f.render();
  f.enter(true);
  assert.deepEqual(f.navigations, []);
  f.inputText('新');
  // 旧结果留着不闪，但 Enter 只打开新查询的结果
  assert.match(f.out.innerHTML, /href="\/old\/"/);
  f.enter();
  await f.flush();
  assert.deepEqual(f.navigations, ['/new/']);
});

test('搜索请求完成前离开页面不会跳转到过时结果', async () => {
  const f = searchFixture();
  const api = await script('src/scripts/search.ts', 'bind', f.globals);
  api.bind(f.element);
  f.inputText('旧');
  f.enter();
  f.element.isConnected = false;
  await f.flush();
  assert.deepEqual(f.navigations, []);
});

test('搜索弹窗关闭后不会被尚未完成的 Enter 请求强制跳转', async () => {
  const f = searchFixture();
  f.element.id = 'search-modal';
  const api = await script('src/scripts/search.ts', 'bind', f.globals);
  api.bind(f.element);
  f.inputText('旧');
  f.enter();
  f.windowHandlers['blog:close']({ detail: 'search' });
  await f.flush();
  assert.deepEqual(f.navigations, []);
});

test('鼠标高频移动合并到一帧，并采用最后一次坐标', async () => {
  const frames = [];
  const api = await script('src/scripts/util.ts', 'rafThrottle', { requestAnimationFrame: (fn) => frames.push(fn) });
  const calls = [];
  const throttled = api.rafThrottle((value) => calls.push(value));
  throttled(1); throttled(2); throttled(3);
  assert.equal(frames.length, 1);
  frames[0]();
  assert.deepEqual(calls, [3]);
});
