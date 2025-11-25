import os
from markdown_it import MarkdownIt
from core import config  # 导入配置

def build_all_posts(raw_template, common_context):
    md = MarkdownIt().enable('table')
    posts_metadata = []

    home_button_html = """
    <div class="bottom-nav">
        <a href="../index.html" class="nav-btn">
            🏠 返回首页
        </a>
    </div>
    """

    if not os.path.exists(config.OUTPUT_DIR):
        os.makedirs(config.OUTPUT_DIR)

    for filename in os.listdir(config.POSTS_DIR):

        if filename.endswith('.md'):
            name = filename[:-3]
            
            with open(os.path.join(config.POSTS_DIR, filename), 'r', encoding='utf-8') as f:
                md_content = f.read()
            
            html_content = md.render(md_content)
            
            # --- 模板替换 ---
            # 【关键】因为 CSS 搬到了 css/ 文件夹，所以子页面要回到上一级去引用

            # 将模板存入page_html变量里面: 把 href="css/ 替换成 href="../css/
            page_html = raw_template.replace('href="css/', 'href="../css/')

            # 左侧sidebar替换成home_button_html
            page_html = page_html.replace('{{ sidebar_left }}', home_button_html)

            # 右侧calendar_widget替换成common_context['calendar']
            page_html = page_html.replace('{{ calendar_widget }}', common_context['calendar'])
            
            # 记得加上 id="article-content" 配合你的 JS 动画
            page_html = page_html.replace(
                '{{ content }}', 
                f"<div class='card'>{html_content}</div>"
            )

            with open(os.path.join(config.OUTPUT_DIR, f"{name}.html"), 'w', encoding='utf-8') as f:
                f.write(page_html)
            
            print(f"[文章] {name}.html 生成完毕")

            posts_metadata.append({
                'title': name,
                'filename': f"{name}.html"
            })
            
    return posts_metadata