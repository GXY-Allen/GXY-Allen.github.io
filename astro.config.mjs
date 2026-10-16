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
    // 允许优化 GitHub 图床里的远程图片尺寸推断
    domains: [],
  },
  vite: {
    build: { chunkSizeWarningLimit: 1500 },
  },
});
