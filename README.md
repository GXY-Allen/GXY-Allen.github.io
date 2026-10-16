# A11en's Blog

基于 [Astro](https://astro.build) 的个人博客，部署在 GitHub Pages：<https://gxy-allen.github.io>

毛玻璃三栏布局 · 亮/暗主题 · 背景与主题色可自定义 · 全文搜索 · 分类树 / 标签 / 专栏 · 写作热力图 · 看板娘 · 手机电脑都适配。

---

## 第一次使用

1. 安装 [Node.js](https://nodejs.org)（22 或更新版本）
2. 仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**（只需要设置一次）
3. 双击 `预览.bat`，第一次会自动安装依赖，然后浏览器打开 <http://localhost:4321>

## 写文章（最常用）

1. 在 `src/content/posts/` 下找一个分类文件夹（没有就新建一个），放进你的 `.md` 文件
   - 有本地图片的文章，建议 **一篇文章一个文件夹**：`分类/文章名/index.md` + 图片
2. 双击 `预览.bat` 看效果（保存后自动刷新）
3. 双击 `发布.bat`：自动检查 → 提交 → 推送，一两分钟后网站更新

也可以用命令：

```bash
npm run dev                          # 本地预览
npm run new "文章标题" 技术/前端      # 新建文章模板
npm run publish                      # 一键发布
npm run build                        # 只构建，不发布
```

### 文章开头信息（全部可选）

```yaml
---
title: 标题            # 不写就用正文第一个 # 标题，再没有就用文件名
date: 2026-10-17 20:30 # 不写就用第一次提交的时间（北京时间）
tags: [Git, 工具]
category: 技术/前端    # 不写就用所在文件夹
description: 摘要      # 不写就自动截取
cover: ./cover.jpg    # 封面，不写就用文中第一张图
series: 专栏名         # 加入专栏
seriesOrder: 1
pinned: true          # 首页置顶
draft: true           # 草稿，只在本地预览显示
---
```

### 图片写法（都支持）

| 写法 | 例子 |
| --- | --- |
| 相对路径 | `![](./photo.jpg)`、`![](images/a.png)` |
| Typora 默认 | `![](文章名.assets/a.png)` |
| Obsidian | `![[a.png]]` |
| HTML（可控制大小） | `<img src="./a.png" width="400">` |
| 外链 / 图床 | `![](https://...)` |

本地图片构建时会自动压缩成 WebP。路径写错不会导致发布失败，构建日志里会出现 `[图片缺失]` 提示。

**Typora 设置**：偏好设置 → 图像 → 插入图片时「复制图片到 `./${filename}.assets` 文件夹」，勾选「优先使用相对路径」。

## 分类

- **文件夹就是分类**，可以多级嵌套：`posts/技术/前端/xx.md` → 分类「技术 / 前端」
- 想给分类加图标、简介、排序：在分类文件夹里放 `_category.yml`

```yaml
name: 技术
icon: 💻
description: 编程与工具笔记
order: 1
```

## 自定义外观

改 `src/site.config.ts`：标题、头像、简介、导航、社交链接、公告、默认主题色、背景图、每页篇数、看板娘 / 访问统计 / 热力图开关。

- 换背景：图片放到 `public/images/`，在 `backgrounds` 里加一项并改 `appearance.background`
- 关于页：`src/content/pages/about.md`
- 看板娘台词：`public/live2d/waifu-tips.json`

访客也可以点右上角 🎨 自己调颜色、背景、字号（只保存在他们自己的浏览器里）。

## 目录结构

```text
src/
├── site.config.ts        ← 站点配置（最常改）
├── content/
│   ├── posts/            ← 文章（文件夹 = 分类）
│   └── pages/about.md    ← 关于页
├── components/           ← 页面组件
├── layouts/              ← 页面骨架（三栏布局）
├── pages/                ← 路由
├── plugins/              ← Markdown 插件（图片路径兼容等）
├── scripts/              ← 浏览器端交互脚本
├── styles/               ← 样式
└── utils/                ← 文章数据处理
public/                   ← 原样复制的静态文件（背景图、头像、favicon）
scripts/                  ← new-post / publish 命令
.github/workflows/        ← 自动部署
```

`src/content/posts/博客指南/` 是使用说明，看完可以整个删掉。
