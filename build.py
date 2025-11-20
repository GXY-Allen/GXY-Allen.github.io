import os
import markdown

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

    index_list_html = ""

    # 3. 遍历文章
    for filename in os.listdir(POSTS_DIR):
        if filename.endswith('.md'):
            name = filename[:-3]
            
            with open(os.path.join(POSTS_DIR, filename), 'r', encoding='utf-8') as f:
                md_content = f.read()
            
            html_content = markdown.markdown(md_content)
            
            # --- 【核心逻辑：处理子页面的相对路径】 ---
            
            # 1. CSS 路径：变成 "去上一级找 style.css"
            article_page = raw_template.replace('href="style.css"', 'href="../style.css"')
            
            # 2. 返回首页链接：变成 "去上一级找 index.html"
            back_link = '<p><a href="../index.html">← 返回首页</a></p>'
            
            # 3. 组合内容
            final_article_html = article_page.replace(
                '{{ content }}', 
                f"{back_link}\n{html_content}"
            )

            # 写入 pages 文件夹
            with open(os.path.join(OUTPUT_DIR, f"{name}.html"), 'w', encoding='utf-8') as f:
                f.write(final_article_html)
            
            print(f"已生成文章: pages/{name}.html")

            # --- 【核心逻辑：处理首页的相对路径】 ---
            
            # 改动点：用 <a class="card-link"> 把整个 div 包起来
            # 注意：我把 href 放在了最外面的 a 标签上
            index_list_html += f"""
            <a href="{OUTPUT_DIR}/{name}.html" class="card-link">
                <div class="post-card">
                    <h2>{name}</h2>
                    <p>点击阅读全文...</p>
                </div>
            </a>
            """

    # 4. 生成首页
    # 首页就在根目录，CSS 路径不需要改，保持 raw_template 原样即可
    final_index_html = raw_template.replace('{{ content }}', "<h1>文章列表</h1>" + index_list_html)
    
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(final_index_html)
    print("已生成首页: index.html")

if __name__ == '__main__':
    build()