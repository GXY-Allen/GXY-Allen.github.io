import os
import markdown

# --- 配置区域 ---
POSTS_DIR = 'posts'        # Markdown 存放目录
OUTPUT_DIR = 'pages'       # 生成的 HTML 存放目录 (新!)
TEMPLATE_FILE = 'template.html'
# ----------------

def build():
    # 1. 确保输出目录存在，如果没有就自动创建
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    # 2. 读取模板
    with open(TEMPLATE_FILE, 'r', encoding='utf-8') as f:
        template_content = f.read()

    index_list_html = ""

    # 3. 遍历并生成文章
    for filename in os.listdir(POSTS_DIR):
        if filename.endswith('.md'):
            name = filename[:-3]
            
            # 读取 MD 内容
            with open(os.path.join(POSTS_DIR, filename), 'r', encoding='utf-8') as f:
                md_content = f.read()
            
            # 转换 Markdown -> HTML
            html_content = markdown.markdown(md_content)
            
            # --- 修正 A: 文章页的 CSS 路径 ---
            # 因为文章在 pages/ 文件夹里，需要往上找一级才能找到根目录的 style.css
            # 我们把模板里的 "style.css" 替换成 "../style.css"
            article_template = template_content.replace('href="style.css"', 'href="../style.css"')
            
            # --- 修正 B: 返回首页的链接 ---
            # 同样，返回首页也需要往上跳一级 "../index.html"
            back_link = '<p><a href="../index.html">← 返回首页</a></p>'
            
            # 组装文章页面
            final_article_html = article_template.replace(
                '{{ content }}', 
                f"{back_link}\n{html_content}"
            )

            # 写入文件到 pages 目录
            output_path = os.path.join(OUTPUT_DIR, f"{name}.html")
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(final_article_html)
            print(f"已生成: {output_path}")

            # --- 修正 C: 首页的跳转链接 ---
            # 首页在根目录，要跳转到 pages/xxx.html
            index_list_html += f"""
            <div class="post-card">
                <h2><a href="{OUTPUT_DIR}/{name}.html">{name}</a></h2>
                <p>点击阅读全文...</p>
            </div>
            """

    # 4. 生成首页 (index.html 依然留在根目录，作为网站入口)
    final_index_html = template_content.replace('{{ content }}', "<h1>文章列表</h1>" + index_list_html)
    
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(final_index_html)
    print("已生成首页: index.html")

if __name__ == '__main__':
    build()