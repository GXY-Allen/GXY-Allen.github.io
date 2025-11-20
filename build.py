import os
# 【改动 1】导入新库
from markdown_it import MarkdownIt

# --- 配置区域 ---
POSTS_DIR = 'posts'
OUTPUT_DIR = 'pages'
TEMPLATE_FILE = 'template.html'
# ----------------

def build():
    # 1. 创建 pages 文件夹
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    # 2. 读取模板
    with open(TEMPLATE_FILE, 'r', encoding='utf-8') as f:
        raw_template = f.read()

    # 【改动 2】初始化转换器
    # 'gfm-like' 模式意味着：完全像 GitHub 一样渲染
    # 它自动开启了：表格(tables)、代码块(fenced code)、自动链接(url) 等功能
    # 原来的写法（需要安装 linkify-it-py）：
    # md = MarkdownIt('gfm-like')

    # --- 新的写法（不需要任何额外安装）---
    # 使用默认配置（标准 CommonMark），然后手动开启表格支持
    md = MarkdownIt().enable('table')

    index_list_html = ""

    # 3. 遍历文章
    for filename in os.listdir(POSTS_DIR):
        if filename.endswith('.md'):
            name = filename[:-3]
            
            with open(os.path.join(POSTS_DIR, filename), 'r', encoding='utf-8') as f:
                md_content = f.read()
            
            # 【改动 3】使用新库进行渲染
            # 以前是 markdown.markdown(md_content, ...), 现在更简单：
            html_content = md.render(md_content)
            
            # --- 【核心逻辑：处理子页面的相对路径】 (保持不变) ---
            
            # 1. CSS 路径修正
            article_page = raw_template.replace('href="style.css"', 'href="../style.css"')
            
            # 2. 返回首页链接
            back_link = '<p><a href="../index.html">← 返回首页</a></p>'
            
            # 3. 组合内容
            # 给文章内容多包一层 <div class="card">
            final_article_html = article_page.replace(
                '{{ content }}', 
                f"{back_link}\n<div class='card'>{html_content}</div>"
            )

            # 写入 pages 文件夹
            with open(os.path.join(OUTPUT_DIR, f"{name}.html"), 'w', encoding='utf-8') as f:
                f.write(final_article_html)
            
            print(f"已生成文章: pages/{name}.html")

            # --- 【核心逻辑：处理首页列表】 (保持不变) ---
            index_list_html += f"""
            <a href="{OUTPUT_DIR}/{name}.html" class="card-link">
                <div class="post-card">
                    <h2>{name}</h2>
                    <p>点击阅读全文...</p>
                </div>
            </a>
            """

    # 4. 生成首页 (保持不变)
    final_index_html = raw_template.replace('{{ content }}', "<h1>文章列表</h1>" + index_list_html)
    
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(final_index_html)
    print("已生成首页: index.html")

if __name__ == '__main__':
    build()