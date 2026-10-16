---
title: Markdown 写作示例
date: 2026-10-17 10:00
tags: [博客, Markdown]
series: 博客使用指南
seriesOrder: 2
cover: ./cover.png
---

这篇文章展示博客支持的所有 Markdown 写法，写文章时可以当作参考。点开图片可以**放大预览**。

## 文字

普通段落里可以有 **粗体**、*斜体*、~~删除线~~、`行内代码`、<u>下划线</u>、<mark>高亮</mark> 和 [链接](https://github.com)。

> 引用：把学过的东西写下来，才算真正学会。
>
> 引用里也可以有 **格式**。

## 列表

- 无序列表
  - 可以嵌套
- 第二项

1. 有序列表
2. 第二项

- [x] 任务列表：已完成
- [ ] 任务列表：未完成

## 图片：各种写法都支持

### 同目录图片

```markdown
![同目录图片](./photo.jpg)
```

![同目录图片](./photo.jpg)

### Typora 风格的 assets 文件夹

```markdown
![Typora](assets/typora.png)
```

![Typora](assets/typora.png)

### Obsidian 语法

```markdown
![[obsidian.png]]
```

![[obsidian.png]]

### HTML 标签（可以控制大小）

```html
<img src="./html.png" width="420">
```

<img src="./html.png" width="420">

### 外链图片（图床）

外链图片原样显示，例如 `![](https://...)`。

## 代码

```js
// 代码块右上角有「复制」按钮，左上角显示语言
function greet(name) {
  const time = new Date().getHours() < 12 ? '早上好' : '你好';
  return `${time}，${name}！`;
}
console.log(greet('A11en'));
```

```python
def fib(n: int) -> list[int]:
    a, b, out = 0, 1, []
    for _ in range(n):
        out.append(a)
        a, b = b, a + b
    return out
```

```bash
git add .
git commit -m "新增文章"
git push
```

## 表格

| 功能 | 写法 | 说明 |
| :--- | :---: | ---: |
| 粗体 | `**文字**` | 左对齐 |
| 代码 | `` `code` `` | 居中 |
| 链接 | `[文字](地址)` | 右对齐 |

## 数学公式

行内公式：质能方程 $E = mc^2$，求和 $\sum_{i=1}^{n} i = \frac{n(n+1)}{2}$。

块级公式：

$$
\int_{-\infty}^{+\infty} e^{-x^2}\,dx = \sqrt{\pi}
$$

## 流程图（Mermaid）

```mermaid
graph LR
  A[写 Markdown] --> B[双击 发布.bat]
  B --> C[GitHub Actions 构建]
  C --> D[网站更新 🎉]
```

## 脚注

博客使用 Astro 构建[^1]，部署在 GitHub Pages 上[^2]。

[^1]: Astro 是一个面向内容网站的静态站点生成器。
[^2]: GitHub Pages 是免费的静态网站托管服务。

## 分隔线

---

以上就是全部写法啦。
