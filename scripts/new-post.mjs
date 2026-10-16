#!/usr/bin/env node
/**
 * 新建文章
 *   npm run new "文章标题"
 *   npm run new "文章标题" 技术/前端
 * 会生成 src/content/posts/<分类>/<标题>/index.md 和一个 images 文件夹
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const [title, category = ''] = process.argv.slice(2);
if (!title) {
  console.log('用法：npm run new "文章标题" [分类/子分类]');
  console.log('例如：npm run new "CSS 笔记" 技术/前端');
  process.exit(1);
}

const safe = (s) => s.replace(/[\\/:*?"<>|#%]/g, '-').trim();
const dir = join('src', 'content', 'posts', ...category.split('/').filter(Boolean).map(safe), safe(title));
if (existsSync(dir)) {
  console.error(`✗ 已经存在：${dir}`);
  process.exit(1);
}
mkdirSync(join(dir, 'images'), { recursive: true });

const now = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 16).replace('T', ' ');
const file = join(dir, 'index.md');
writeFileSync(
  file,
  `---
title: ${title}
date: ${now}
tags: []
# description: 一句话摘要（不写就自动截取正文）
# cover: ./images/cover.jpg
# series: 专栏名
# pinned: true
# draft: true
---

在这里开始写正文。

<!-- 图片放进旁边的 images 文件夹，然后这样引用：![图片说明](./images/图片名.png) -->
`,
  'utf8',
);
writeFileSync(join(dir, 'images', '.gitkeep'), '');

console.log(`✓ 已创建：${relative('.', file)}`);
console.log('  图片放进同目录的 images 文件夹，然后运行 npm run dev 预览，写完双击「发布.bat」');
