/**
 * 博客专用 rehype 插件：
 *  - 代码块加上标题栏（语言 + 复制按钮），长代码可折叠
 *  - mermaid 代码块转成待渲染的图表容器
 *  - 外链新窗口打开
 *  - 表格包一层，窄屏可横向滚动
 *  - 图片懒加载
 */
import { visit, SKIP } from 'unist-util-visit';

const text = (node) =>
  node.type === 'text' ? node.value : (node.children ?? []).map(text).join('');

const el = (tagName, properties, children = []) => ({ type: 'element', tagName, properties, children });

const LANG_NAMES = { js: 'javascript', ts: 'typescript', sh: 'shell', py: 'python', md: 'markdown', yml: 'yaml' };
const COLLAPSE_LINES = 30;

export default function rehypeBlog() {
  return (tree) => {
    let firstImage = true;
    visit(tree, 'element', (node, index, parent) => {
      if (!parent || index == null) return;

      if (node.tagName === 'pre') {
        const code = node.children.find((c) => c.type === 'element' && c.tagName === 'code');
        const classes = [...(node.properties?.className ?? []), ...(code?.properties?.className ?? [])].map(String);
        let lang = node.properties?.dataLanguage ?? classes.find((c) => c.startsWith('language-'))?.slice(9) ?? '';

        if (lang === 'mermaid') {
          parent.children[index] = el('div', { className: ['mermaid-block'] }, [
            el('pre', { className: ['mermaid'] }, [{ type: 'text', value: text(code ?? node) }]),
          ]);
          return SKIP;
        }

        lang = LANG_NAMES[lang] ?? lang;
        if (lang === 'plaintext' || lang === 'txt') lang = 'text';
        const lines = text(code ?? node).replace(/\n$/, '').split('\n').length;
        const collapsible = lines > COLLAPSE_LINES;
        parent.children[index] = el(
          'div',
          { className: ['code-block', ...(collapsible ? ['collapsible', 'collapsed'] : [])], dataLang: lang || 'text' },
          [
            el('div', { className: ['code-head'] }, [
              el('span', { className: ['code-dots'], ariaHidden: 'true' }, [el('i', {}), el('i', {}), el('i', {})]),
              el('span', { className: ['code-lang'] }, [{ type: 'text', value: lang || 'text' }]),
              el('button', { className: ['code-copy'], type: 'button', ariaLabel: '复制代码' }, [{ type: 'text', value: '复制' }]),
            ]),
            node,
            ...(collapsible
              ? [el('button', { className: ['code-expand'], type: 'button' }, [{ type: 'text', value: `展开全部 ${lines} 行` }])]
              : []),
          ],
        );
        return SKIP;
      }

      if (node.tagName === 'p') {
        const kids = node.children.filter((c) => !(c.type === 'text' && !c.value.trim()));
        if (kids.length && kids.every((c) => c.type === 'element' && c.tagName === 'img')) {
          node.properties.className = [...(node.properties.className ?? []), 'img-p'];
        }
      }
      if (node.tagName === 'a' && typeof node.properties?.href === 'string') {
        if (/^https?:\/\//.test(node.properties.href)) {
          node.properties.target = '_blank';
          node.properties.rel = ['noopener', 'noreferrer'];
        }
      }
      if (node.tagName === 'img') {
        if (firstImage) {
          node.properties.loading = 'eager';
          node.properties.fetchpriority = 'high';
        } else node.properties.loading ??= 'lazy';
        node.properties.decoding ??= 'async';
        firstImage = false;
      }
      if (node.tagName === 'table') {
        parent.children[index] = el('div', { className: ['table-wrap'] }, [node]);
        return SKIP;
      }
    });
  };
}
