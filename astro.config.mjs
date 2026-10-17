import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkBlog from './src/plugins/remark-blog.mjs';
import rehypeBlog from './src/plugins/rehype-blog.mjs';

export default defineConfig({
  site: 'https://gxy-allen.github.io',
  trailingSlash: 'ignore',
  integrations: [sitemap()],
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  markdown: {
    syntaxHighlight: { type: 'shiki', excludeLangs: ['math', 'mermaid'] },
    shikiConfig: {
      themes: { light: 'github-light', dark: 'one-dark-pro' },
      defaultColor: false,
      wrap: false,
    },
    processor: unified({
      remarkPlugins: [remarkMath, remarkBlog],
      rehypePlugins: [[rehypeKatex, { strict: false, throwOnError: false }], rehypeBlog],
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
  vite: {
    build: { chunkSizeWarningLimit: 1500 },
  },
});
