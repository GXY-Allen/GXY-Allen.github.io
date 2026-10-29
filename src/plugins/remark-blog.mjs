/**
 * 博客专用 remark 插件：
 *  1. 去掉正文开头的一级标题（标题已显示在文章头部）
 *  2. 支持 Obsidian 图片语法 ![[a.png]] / ![[a.png|说明]]
 *  3. 把 md 里单独的 HTML <img> 转成普通图片，本地图片也能被优化
 *  4. 统一图片路径（反斜杠、URL 编码），找不到的本地图片给出中文警告而不是让构建失败
 */
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { visit, SKIP } from 'unist-util-visit';
import { imageMetadata } from 'astro/assets/utils';
import { getRemoteImageSize } from '../utils/remote-images.mjs';

/** 图片原始尺寸缓存（同一张图在多篇文章里只读一次） */
const sizeCache = new Map();
async function naturalSize(url, base) {
  if (url.startsWith('data:')) return null;
  const remote = /^(https?:)?\/\//i.test(url);
  let decoded = url;
  try { decoded = decodeURI(url); } catch {}
  const key = remote ? (url.startsWith('//') ? `https:${url}` : url)
    : url.startsWith('/') ? resolve('public', `.${decoded}`) : resolve(base, decoded);
  if (remote) return getRemoteImageSize(key);
  if (!sizeCache.has(key)) {
    sizeCache.set(
      key,
      readFile(key).then((data) => imageMetadata(data, key)).catch(() => null),
    );
  }
  return sizeCache.get(key);
}

const IMG_TAG = /^\s*<img\b([^>]*?)\/?>\s*$/i;
const OBSIDIAN = /!\[\[([^\]|]+?)(?:\|([^\]]*))?\]\]/g;

function attrs(str) {
  const out = {};
  for (const m of str.matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) {
    out[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? '';
  }
  return out;
}

const isRemote = (u) => /^(https?:)?\/\//i.test(u) || u.startsWith('data:');
const px = (v) => (/^\d+(\.\d+)?$/.test(v) ? `${v}px` : /^\d+(\.\d+)?(px|%|em|rem|vw|vh)$/.test(v) ? v : null);

function imageNode(url, alt, extra) {
  const node = { type: 'image', url, alt: alt ?? '', title: null };
  if (extra) node.data = { hProperties: extra };
  return node;
}

export default function remarkBlog({ imageDomains = [] } = {}) {
  return async (tree, file) => {
    // 1. 去掉开头的一级标题
    const first = tree.children.find((n) => n.type !== 'yaml' && n.type !== 'toml');
    if (first && first.type === 'heading' && first.depth === 1) {
      tree.children.splice(tree.children.indexOf(first), 1);
    }

    // 2. Obsidian 图片语法
    visit(tree, 'text', (node, index, parent) => {
      if (!parent || index == null || !node.value.includes('![[')) return;
      const parts = [];
      let last = 0;
      for (const m of node.value.matchAll(OBSIDIAN)) {
        if (m.index > last) parts.push({ type: 'text', value: node.value.slice(last, m.index) });
        const target = m[1].trim();
        const alt = m[2] && !/^\d+(x\d+)?$/.test(m[2]) ? m[2] : '';
        const width = m[2] && /^\d+(x\d+)?$/.test(m[2]) ? m[2].split('x')[0] : null;
        parts.push(imageNode(encodeURI(target), alt, width ? { width: Number(width) } : undefined));
        last = m.index + m[0].length;
      }
      if (!parts.length) return;
      if (last < node.value.length) parts.push({ type: 'text', value: node.value.slice(last) });
      parent.children.splice(index, 1, ...parts);
      return [SKIP, index + parts.length];
    });

    // 3. 单独的 HTML <img>
    visit(tree, 'html', (node, index, parent) => {
      if (!parent || index == null) return;
      const m = node.value.match(IMG_TAG);
      if (!m) return;
      const a = attrs(m[1]);
      if (!a.src) return;
      // 只取一个数字尺寸，另一边按原图比例计算（同时给两个会被裁剪）
      const props = {};
      const num = (v) => (/^\d+(px)?$/.test(v ?? '') ? parseInt(v, 10) : null);
      if (num(a.width)) props.width = num(a.width);
      else if (num(a.height)) props.height = num(a.height);
      else if (a.width && px(a.width)) props.style = `width:${px(a.width)}`;
      if (a.style) props.style = [props.style, a.style].filter(Boolean).join(';');
      let alt = a.alt ?? '';
      if (/图片无法显示|image|alt/i.test(alt) && alt.length < 12) alt = '';
      const img = imageNode(a.src, alt, Object.keys(props).length ? props : undefined);
      parent.children.splice(index, 1, parent.type === 'paragraph' ? img : { type: 'paragraph', children: [img] });
    });

    // GitHub 风格提示块：> [!TIP] / [!NOTE] / [!WARNING] ...
    const CALLOUTS = { NOTE: '注意', TIP: '提示', IMPORTANT: '重要', WARNING: '警告', CAUTION: '小心' };
    visit(tree, 'blockquote', (node) => {
      const p = node.children[0];
      const t = p?.type === 'paragraph' ? p.children[0] : null;
      const m = t?.type === 'text' ? t.value.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*\n?/i) : null;
      if (!m) return;
      const kind = m[1].toUpperCase();
      t.value = t.value.slice(m[0].length);
      if (!t.value) p.children.shift();
      if (!p.children.length) node.children.shift();
      node.data = { hProperties: { className: ['callout', `callout-${kind.toLowerCase()}`], 'data-title': CALLOUTS[kind] } };
    });

    // 4. 路径规范化 + 检查本地图片是否存在
    const base = file.path ? dirname(file.path) : null;
    visit(tree, 'image', (node, index, parent) => {
      let url = (node.url || '').trim().replace(/\\/g, '/');
      if (!url || isRemote(url) || url.startsWith('/') || !base) {
        node.url = url;
        return;
      }
      let decoded = url;
      try {
        decoded = decodeURI(url);
      } catch {}
      const candidates = [decoded, decoded.replace(/^\.\//, '')];
      // Obsidian 附件常放在 assets/ 或 attachments/ 下
      if (!decoded.includes('/')) candidates.push(`assets/${decoded}`, `attachments/${decoded}`, `images/${decoded}`);
      const found = candidates.find((c) => existsSync(resolve(base, c)));
      if (found) {
        const rel = found.startsWith('.') ? found : `./${found}`;
        node.url = encodeURI(rel);
        return;
      }
      console.warn(`\n[图片缺失] ${file.path} → ${decoded}（请检查图片路径，已用占位符代替）`);
      if (parent && index != null) {
        parent.children[index] = {
          type: 'html',
          value: `<span class="img-missing">图片缺失：${decoded.replace(/[<>&"]/g, '')}</span>`,
        };
      }
    });

    // 5. 只写了高度的图片（如 <img height="400">）：按原图比例换算成宽度。
    //    只给高度时图片会被裁剪；换算成宽度后按比例缩放，不裁剪、不跳动。
    const sizedImages = [];
    visit(tree, 'image', (node) => {
      const hp = node.data?.hProperties;
      const remote = /^(https?:)?\/\//i.test(node.url);
      let optimizedRemote = false;
      if (remote) {
        try { optimizedRemote = imageDomains.includes(new URL(node.url, 'https://localhost').hostname); } catch {}
      }
      if ((hp?.height && !hp.width) || optimizedRemote) sizedImages.push({ node, optimizedRemote });
    });
    await Promise.all(
      sizedImages.map(async ({ node, optimizedRemote }) => {
        node.data ??= {};
        const hp = node.data.hProperties ??= {};
        const size = base ? await naturalSize(node.url, base) : null;
        if (size?.width && size?.height) {
          // 宽高都按原图比例给出（只给一边时另一边会被填成原图尺寸）
          hp.width = Math.min(size.width, hp.width || (hp.height ? Math.round((hp.height * size.width) / size.height) : size.width));
          hp.height = Math.round((hp.width * size.height) / size.width);
        } else {
          if (optimizedRemote) hp.dataRemoteFallback = true;
          if (hp.height) hp.style = [hp.style, `max-height:${hp.height}px;width:auto`].filter(Boolean).join(';');
          delete hp.height;
        }
      }),
    );
  };
}
