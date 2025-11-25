import os
from markdown_it import MarkdownIt
from core import config

def build_all_posts(raw_template, common_context):
    # 初始化 markdown 解析器
    md = MarkdownIt().enable('table')
    
    posts_metadata = []

    # 1. 定义左侧底部按钮 (保持不变)
    home_button_html = """
    <div class="bottom-nav">
        <a href="../index.html" class="nav-btn">🏠 返回首页</a>
    </div>
    """
    
    # 2. 定义头像 (保持不变)
    avatar_html = """
    <div class="avatar-container">
        <a href="https://github.com/GXY-Allen" target="_blank">
            <img src="https://github.com/GXY-Allen.png" alt="GXY-Allen" class="avatar-img">
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
            
            # === 【核心修改开始】：手动处理 Token 生成目录 ===
            
            # 1. 解析 Markdown 为 Tokens (中间态)
            tokens = md.parse(md_content)
            
            toc_lines = []
            toc_lines.append('<div class="toc-container">')
            toc_lines.append('<h3>文章目录</h3><ul>')
            
            # 2. 遍历 Tokens，寻找标题
            for i in range(len(tokens)):
                token = tokens[i]
                
                # 如果是标题开始 (h1, h2, h3...)
                if token.type == 'heading_open':
                    # 获取标题文字 (在下一个 inline token 里)
                    title_token = tokens[i+1]
                    title_text = title_token.content
                    
                    # 生成 ID (简单粗暴地用标题文字做 ID，浏览器支持中文 ID)
                    # 你也可以在这里加逻辑，比如把空格变成横杠
                    slug = title_text
                    
                    # 给文章里的标题加上 id 属性，以便跳转
                    token.attrSet('id', slug)
                    
                    # 获取标题级别 (h1, h2...) 用于缩进
                    tag = token.tag  # "h1", "h2"
                    
                    # 生成目录列表项
                    toc_lines.append(f'<li class="toc-item {tag}"><a href="#{slug}">{title_text}</a></li>')
            
            toc_lines.append('</ul></div>')
            toc_html = "".join(toc_lines)
            
            # 3. 渲染修改后的 Tokens 为最终 HTML
            html_content = md.renderer.render(tokens, md.options, {})
            
            # === 【核心修改结束】 ===
            
            
            # --- 模板替换 ---
            page_html = raw_template.replace('href="css/', 'href="../css/')
            
            # 【关键】把 头像 + 目录 + 按钮 拼接到一起
            sidebar_content = avatar_html + toc_html + home_button_html
            page_html = page_html.replace('{{ sidebar_left }}', sidebar_content)
            
            page_html = page_html.replace('{{ calendar_widget }}', common_context['calendar'])
            
            # 移除 id='article-content' 以取消文章内部动画，或者保留看你喜好
            page_html = page_html.replace(
                '{{ content }}', 
                f"<div class='card'>{html_content}</div>"
            )

            with open(os.path.join(config.OUTPUT_DIR, f"{name}.html"), 'w', encoding='utf-8') as f:
                f.write(page_html)
            
            print(f"[文章] {name}.html 生成完毕 (含目录)")

            posts_metadata.append({
                'title': name,
                'filename': f"{name}.html"
            })
            
    return posts_metadata