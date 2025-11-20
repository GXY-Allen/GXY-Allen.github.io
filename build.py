import os
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

    # 初始化转换器 (保持你之前的配置)
    # 使用默认配置（标准 CommonMark），然后手动开启表格支持
    md = MarkdownIt().enable('table')

    index_list_html = ""

    # --- 【新增】定义左侧底部按钮的 HTML ---
    # 注意 href="../index.html" 因为文章在子目录里
    home_button_html = """
    <div class="bottom-nav">
        <a href="../index.html" class="nav-btn">
            🏠 返回首页
        </a>
    </div>
    """

    # 3. 遍历文章
    for filename in os.listdir(POSTS_DIR):
        if filename.endswith('.md'):
            name = filename[:-3]
            
            with open(os.path.join(POSTS_DIR, filename), 'r', encoding='utf-8') as f:
                md_content = f.read()
            
            # 使用新库进行渲染
            html_content = md.render(md_content)
            
            # --- 【核心逻辑：处理子页面的相对路径】 ---
            
            # 1. CSS 路径修正
            article_page = raw_template.replace('href="style.css"', 'href="../style.css"')
            
            # 2. 【新增】填充左边栏：放入首页按钮
            # 这里把模板里的 {{ sidebar_left }} 替换成了我们定义的按钮代码
            article_page = article_page.replace('{{ sidebar_left }}', home_button_html)
            
            # 3. 组合内容
            # 【修改点】删除了原来的 back_link 变量，现在直接用 card 包裹内容
            final_article_html = article_page.replace(
                '{{ content }}', 
                f"<div class='card'>{html_content}</div>"
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

    # 4. 生成首页
    # 【新增】首页不需要"返回首页"按钮，所以把左边栏坑位替换为空字符串
    final_index_html = raw_template.replace('{{ sidebar_left }}', "")
    
    final_index_html = final_index_html.replace('{{ content }}', "<h1>文章列表</h1>" + index_list_html)
    
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(final_index_html)
    print("已生成首页: index.html")

if __name__ == '__main__':
    build()