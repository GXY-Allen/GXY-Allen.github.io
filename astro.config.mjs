import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';

// 插件及共用图片工具的指纹：改动后清掉旧的文章渲染缓存。
const pluginsDir = new URL('./src/plugins/', import.meta.url);
const pluginFiles = [
  ...readdirSync(pluginsDir).sort().map((f) => new URL(f, pluginsDir)),
  new URL('./src/utils/remote-images.mjs', import.meta.url),
];
const pluginsHash = createHash('sha1')
  .update(pluginFiles.map((file) => file.pathname + readFileSync(file, 'utf8')).join(''))
  .digest('hex')
  .slice(0, 12);

// 带上指纹导入，插件改动后本地预览重启时一定加载新代码（不会用到内存里的旧版本）
const { default: remarkBlog } = await import(`./src/plugins/remark-blog.mjs?v=${pluginsHash}`);
const { default: rehypeBlog } = await import(`./src/plugins/rehype-blog.mjs?v=${pluginsHash}`);

/** 本地预览时，改了 src/plugins 里的文件也会自动重启并重新渲染文章 */
const watchPlugins = {
  name: 'watch-plugins',
  hooks: {
    'astro:config:setup': ({ addWatchFile }) => {
      for (const file of pluginFiles) addWatchFile(file);
    },
  },
};

export default defineConfig({
  site: 'https://gxy-allen.github.io',
  trailingSlash: 'ignore',
  integrations: [sitemap(), watchPlugins],
  // 鼠标悬停（或键盘聚焦）站内链接时就预取那一页，点下去不用再等网络
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  markdown: {
    syntaxHighlight: { type: 'shiki', excludeLangs: ['math', 'mermaid'] },
    shikiConfig: {
      themes: { light: 'github-light', dark: 'one-dark-pro' },
      defaultColor: false,
      wrap: false,
    },
    processor: unified({
      remarkPlugins: [remarkMath, [remarkBlog, { cacheKey: pluginsHash, imageDomains: ['raw.githubusercontent.com'] }]],
      rehypePlugins: [[rehypeKatex, { strict: false, throwOnError: false }], [rehypeBlog, { cacheKey: pluginsHash }]],
      remarkRehype: {
        footnoteLabel: '脚注',
        footnoteBackLabel: '返回正文',
      },
      smartypants: false,
    }),
  },
  image: {
    // 图床（GitHub 仓库）里的图片在构建时下载并转成 WebP、写好宽高，避免加载时页面跳动
    domains: ['raw.githubusercontent.com'],
    // 生成多种尺寸，手机只下载小图
    layout: 'constrained',
    responsiveStyles: false,
    breakpoints: [480, 800, 1200, 1600],
  },
});
