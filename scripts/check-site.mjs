#!/usr/bin/env node
/**
 * 检查已构建的静态站点，不发起网络请求，也不修改构建产物。
 * 用法：npm run build && node scripts/check-site.mjs [构建目录]
 * parse5 / fast-xml-parser 本来就在 Astro 的依赖树里；package.json 里也写明了，免得 Astro 升级后不再带上它们。
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'parse5';
import { XMLParser, XMLValidator } from 'fast-xml-parser';

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log('用法：node scripts/check-site.mjs [构建目录，默认 dist]\n请先运行 npm run build。');
  process.exit(0);
}
if (args.length > 1 || args[0]?.startsWith('-')) {
  console.error('参数无效；使用 --help 查看用法。');
  process.exit(1);
}

const root = args[0] ? resolve(args[0]) : fileURLToPath(new URL('../dist/', import.meta.url));
const files = new Set();
const pages = new Map();
const errors = new Set();
let references = 0;
let imageCount = 0;
let searchCount = 0;
let sitemapCount = 0;
let feedCount = 0;
const report = (source, message) => errors.add(`${source}: ${message}`);
const read = (file) => readFileSync(resolve(root, file), 'utf8');
const decode = (value) => {
  try { return decodeURIComponent(value); } catch { return value; }
};
const list = (value) => value == null ? [] : Array.isArray(value) ? value : [value];

function inventory(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = resolve(directory, entry.name);
    if (entry.isDirectory()) inventory(absolute);
    else if (entry.isFile()) files.add(relative(root, absolute).split(sep).join('/'));
  }
}

function visit(node, callback) {
  if (node.tagName) callback(node);
  for (const child of node.childNodes ?? []) visit(child, callback);
  // template.content 不属于当前页面 DOM，内部 ID 不参与页面锚点查找。
}

/** 按 srcset 的 URL / 描述符边界读取，保留 data URL 及文件名里的逗号。 */
function srcsetUrls(value) {
  const urls = [];
  let i = 0;
  while (i < value.length) {
    while (i < value.length && /[\s,]/.test(value[i])) i++;
    const start = i;
    while (i < value.length && !/\s/.test(value[i])) i++;
    let url = value.slice(start, i);
    if (!url) break;
    if (url.endsWith(',')) {
      url = url.replace(/,+$/, '');
    } else {
      let parentheses = 0;
      while (i < value.length) {
        const char = value[i++];
        if (char === '(') parentheses++;
        else if (char === ')') parentheses = Math.max(0, parentheses - 1);
        else if (char === ',' && !parentheses) break;
      }
    }
    if (url) urls.push(url);
  }
  return urls;
}

function parsePage(file) {
  const document = parse(read(file));
  const ids = new Set();
  const names = new Set();
  const links = [];
  let canonical;
  let base;
  visit(document, (node) => {
    const attrs = Object.fromEntries(node.attrs.map(({ name, value }) => [name, value]));
    if (attrs.id) {
      if (ids.has(attrs.id)) report(file, `重复 id ${JSON.stringify(attrs.id)}`);
      ids.add(attrs.id);
    }
    if (node.tagName === 'a' && attrs.name) names.add(attrs.name);
    if (node.tagName === 'img') {
      imageCount++;
      if (!Object.hasOwn(attrs, 'alt')) report(file, `图片缺少 alt：${attrs.src ?? '(动态图片)'}`);
    }
    if (node.tagName === 'base' && attrs.href != null && base === undefined) base = attrs.href;
    if (node.tagName === 'link' && attrs.rel?.split(/\s+/).includes('canonical')) canonical = attrs.href;
    for (const attribute of ['href', 'src', 'poster']) {
      if (attrs[attribute] == null || node.tagName === 'base') continue;
      if (attribute !== 'href' && !attrs[attribute].trim()) {
        report(file, `<${node.tagName}> 的 ${attribute} 为空`);
        continue;
      }
      links.push({ url: attrs[attribute], kind: `${node.tagName}[${attribute}]` });
    }
    for (const attribute of ['srcset', 'imagesrcset']) {
      for (const url of srcsetUrls(attrs[attribute] ?? '')) links.push({ url, kind: `${node.tagName}[${attribute}]` });
    }
  });
  return { ids, names, links, canonical, base };
}

let origin;
function pageUrl(file) {
  // encode 每一个真实文件名片段，避免把文件名中的 #、?、% 解释成 URL 控制符。
  const pathname = file.split('/').map(encodeURIComponent).join('/').replace(/(^|\/)index\.html$/, '$1');
  return new URL(`/${pathname}`, origin);
}

function checkReference(raw, base, source, requireLocal = false) {
  let url;
  try { url = new URL(raw, base); } catch {
    report(source, `无法解析 URL ${JSON.stringify(raw)}`);
    return;
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) {
    if (requireLocal) report(source, `应指向本站构建产物：${raw}`);
    return;
  }
  references++;
  const pathname = decode(url.pathname).replace(/^\/+/, '');
  // 使用实际文件清单精确匹配（包括大小写），避免 Windows 掩盖 Linux 部署时的路径错误。
  const candidates = [pathname, `${pathname.replace(/\/$/, '')}${pathname ? '/' : ''}index.html`];
  const target = candidates.find((candidate) => files.has(candidate));
  if (!target) {
    report(source, `本地目标不存在：${raw}`);
    return;
  }
  const fragment = decode(url.hash.slice(1).split(':~:')[0]);
  const page = pages.get(target);
  if (page && fragment && fragment.toLowerCase() !== 'top' && !page.ids.has(fragment) && !page.names.has(fragment)) {
    report(source, `锚点不存在：${raw}（${target}）`);
  }
  return target;
}

const xmlParser = new XMLParser({ ignoreAttributes: false, parseTagValue: false, trimValues: true });
function readXml(file) {
  const text = read(file);
  const valid = XMLValidator.validate(text);
  if (valid !== true) {
    report(file, `XML 格式错误：${valid.err.msg}`);
    return;
  }
  return xmlParser.parse(text);
}

function checkSitemap(file, seen = new Set()) {
  if (seen.has(file)) return;
  seen.add(file);
  const xml = readXml(file);
  if (!xml) return;
  if (xml.sitemapindex) {
    for (const item of list(xml.sitemapindex.sitemap)) {
      if (typeof item.loc !== 'string' || !item.loc.trim()) {
        report(file, '站点地图条目缺少 loc');
        continue;
      }
      const target = checkReference(item.loc, pageUrl(file), file, true);
      if (target?.endsWith('.xml')) checkSitemap(target, seen);
    }
  } else if (xml.urlset) {
    for (const item of list(xml.urlset.url)) {
      if (typeof item.loc !== 'string' || !item.loc.trim()) {
        report(file, '页面条目缺少 loc');
        continue;
      }
      sitemapCount++;
      checkReference(item.loc, pageUrl(file), file, true);
    }
  } else report(file, '缺少 sitemapindex 或 urlset 根节点');
}

function checkFeed(file) {
  const xml = readXml(file);
  if (!xml) return;
  const channel = xml.rss?.channel;
  if (!channel) return report(file, 'RSS 缺少 channel');
  if (typeof channel.link === 'string') checkReference(channel.link, pageUrl(file), file, true);
  else report(file, 'RSS channel 缺少 link');
  for (const item of list(channel.item)) {
    feedCount++;
    if (typeof item.link !== 'string' || !item.link.trim()) report(file, `RSS 文章缺少 link：${item.title ?? feedCount}`);
    else checkReference(item.link, pageUrl(file), file, true);
  }
}

try {
  inventory(root);
  for (const file of files) if (file.endsWith('.html')) pages.set(file, parsePage(file));
  if (!pages.size) throw new Error(`未找到 HTML 构建产物：${root}。请先运行 npm run build。`);
  const home = pages.get('index.html');
  if (!home?.canonical) throw new Error('首页缺少 canonical，无法确定本站 URL。');
  origin = new URL(home.canonical).origin;
  for (const [file, page] of pages) {
    let base = pageUrl(file);
    if (page.base !== undefined) {
      try { base = new URL(page.base, base); } catch { report(file, `无效 base URL：${page.base}`); }
    }
    for (const link of page.links) checkReference(link.url, base, `${file} ${link.kind}`);
  }

  for (const required of ['search-index.json', 'sitemap-index.xml', 'rss.xml']) {
    if (!files.has(required)) report(required, '缺少必需的构建产物');
  }
  if (files.has('search-index.json')) {
    const docs = JSON.parse(read('search-index.json'));
    if (!Array.isArray(docs)) report('search-index.json', '搜索索引必须是数组');
    else {
      const urls = new Set();
      docs.forEach((doc, i) => {
        searchCount++;
        const label = `search-index.json 第 ${i + 1} 项`;
        if (typeof doc?.url !== 'string' || !doc.url.trim()) return report(label, '缺少文章 URL');
        if (urls.has(doc.url)) report(label, `重复文章 URL：${doc.url}`);
        urls.add(doc.url);
        checkReference(doc.url, pageUrl('search-index.json'), label, true);
      });
    }
  }
  if (files.has('sitemap-index.xml')) checkSitemap('sitemap-index.xml');
  if (files.has('rss.xml')) checkFeed('rss.xml');
} catch (error) {
  report('检查失败', error.message);
}

if (errors.size) {
  console.error(`✗ 站点检查发现 ${errors.size} 个问题：`);
  for (const error of [...errors].slice(0, 60)) console.error(`  - ${error}`);
  if (errors.size > 60) console.error(`  …另有 ${errors.size - 60} 个问题，请修复后重新运行。`);
  process.exitCode = 1;
} else {
  console.log(`✓ 站点检查通过：${pages.size} 个 HTML 页面，${references} 个本地引用，${imageCount} 张图片；搜索 ${searchCount} 篇，站点地图 ${sitemapCount} 页，RSS ${feedCount} 篇。`);
}
