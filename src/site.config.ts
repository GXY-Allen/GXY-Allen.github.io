/**
 * ============================================================
 *  站点配置 —— 想改博客的样子，基本只需要改这个文件
 * ============================================================
 */

export interface BackgroundPreset {
  id: string;
  name: string;
  /** image：图片地址（public 目录下的路径或外链）；gradient / color：CSS 值 */
  type: 'image' | 'gradient' | 'color';
  value: string;
  /** 设置面板里的缩略预览（可选，默认用 value） */
  thumb?: string;
}

export const SITE = {
  /** 站点标题 */
  title: "A11en's Blog",
  /** 副标题（显示在首页横幅） */
  subtitle: '记录 · 思考 · 分享',
  /** SEO 描述 */
  description: 'A11en 的个人博客：技术笔记、学习记录与生活随笔。',
  /** 站点地址（GitHub Pages 地址或自定义域名） */
  url: 'https://gxy-allen.github.io',
  /** 网站语言 */
  lang: 'zh-CN',
  /** 建站日期，用于计算「运行天数」 */
  since: '2025-11-19',

  author: {
    name: 'A11en',
    /** 头像：放到 public/images/ 下，然后改这里 */
    avatar: '/images/avatar.svg',
    bio: '保持好奇，持续记录。',
  },

  /** 顶部导航 */
  nav: [
    { name: '首页', href: '/', icon: 'home' },
    { name: '分类', href: '/categories/', icon: 'folder' },
    { name: '标签', href: '/tags/', icon: 'tag' },
    { name: '专栏', href: '/series/', icon: 'layers' },
    { name: '归档', href: '/archives/', icon: 'archive' },
    { name: '关于', href: '/about/', icon: 'user' },
  ],

  /** 社交链接（icon 可选：github / mail / rss / link） */
  social: [
    { name: 'GitHub', icon: 'github', href: 'https://github.com/GXY-Allen' },
    { name: 'RSS', icon: 'rss', href: '/rss.xml' },
    // { name: '邮箱', icon: 'mail', href: 'mailto:you@example.com' },
  ],

  /** 首页横幅打字机标语（随机轮播），留空数组则不显示 */
  slogans: [
    '保持好奇，持续记录。',
    'Stay hungry, stay foolish.',
    '把学过的东西写下来，才算真正学会。',
    '代码是写给人看的，顺便能在机器上运行。',
  ],

  /** 首页横幅图片（留空则用主题渐变） */
  banner: '/images/banner.jpg',

  /** 右栏公告，支持简单 HTML */
  notice: '欢迎来到我的博客！这里记录我的学习笔记和一些想法。点右上角的 🎨 可以切换主题色和背景哦～',

  /** 每页文章数 */
  pageSize: 8,

  /** 外观默认值（访客可以在设置面板里改，改动只保存在他自己的浏览器里） */
  appearance: {
    /** 'auto' 跟随系统 / 'light' / 'dark' */
    mode: 'auto' as 'auto' | 'light' | 'dark',
    /** 默认主题色 */
    primary: '#5b8def',
    /** 设置面板里可选的主题色 */
    primaryPresets: ['#5b8def', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4', '#64748b'],
    /** 默认背景（下面 backgrounds 里的 id） */
    background: 'photo',
    /** 背景模糊（px） */
    backgroundBlur: 0,
    /** 卡片不透明度 0.3 ~ 1 */
    cardOpacity: 0.78,
    /** 正文字号（px） */
    fontSize: 17,
  },

  /** 可选背景。想加自己的图：放到 public/images/ 下，再在这里加一项 */
  backgrounds: [
    { id: 'photo', name: '雪山湖畔', type: 'image', value: '/images/background.jpg', thumb: '/images/background-thumb.jpg' },
    { id: 'aurora', name: '极光', type: 'gradient', value: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 35%, #fbc2eb 70%, #a6c1ee 100%)' },
    { id: 'sunset', name: '晚霞', type: 'gradient', value: 'linear-gradient(160deg, #ffecd2 0%, #fcb69f 45%, #ff9a9e 100%)' },
    { id: 'forest', name: '森林', type: 'gradient', value: 'linear-gradient(160deg, #d4fc79 0%, #96e6a1 50%, #43c6ac 100%)' },
    { id: 'night', name: '星夜', type: 'gradient', value: 'radial-gradient(ellipse at top, #2b3a67 0%, #141e30 55%, #0b1020 100%)' },
    { id: 'paper', name: '纸张', type: 'color', value: '#f3f1ec' },
  ] as BackgroundPreset[],

  /** 功能开关 */
  features: {
    /** Live2D 看板娘（只在宽屏电脑上加载） */
    live2d: {
      enable: true,
      /** 最小屏幕宽度，小于它不加载 */
      minWidth: 1024,
      /** 默认模型序号（对应 public/live2d/waifu-tips.json 里 models 的顺序） */
      modelId: 0,
    },
    /** 不蒜子访问统计（全站 PV/UV、文章阅读量） */
    busuanzi: true,
    /** 发文热力图 */
    heatmap: true,
    /** 文章里出现 ```mermaid 代码块时自动渲染流程图 */
    mermaid: true,
  },
};

export type SiteConfig = typeof SITE;
