from core import config # 导入配置

def build_index_page(posts_metadata, raw_template, common_context):
    index_list_html = ""
    
    for post in posts_metadata:
        link = f"{config.OUTPUT_DIR}/{post['filename']}"
        title = post['title']
        
        index_list_html += f"""
        <a href="{link}" class="card-link">
            <div class="post-card">
                <h2>{title}</h2>
                <p>点击阅读全文...</p>
            </div>
        </a>
        """

    page_html = raw_template
    # 首页就在根目录，所以 CSS 路径不用动，保持 template 里的 href="css/..." 即可
    
    # 首页左侧：填入头像
    # 【修改】定义头像 HTML
    avatar_html = """
    <div class="avatar-container">
        <a href="https://github.com/GXY-Allen" target="_blank">
            <img src="https://github.com/GXY-Allen.png" alt="GXY-Allen" class="avatar-img">
        </a>
    </div>
    """
    # 【修改】将头像填入 sidebar_left
    page_html = page_html.replace('{{ sidebar_left }}', avatar_html)

    # 右侧填充日历
    page_html = page_html.replace('{{ calendar_widget }}', common_context['calendar'])

    # 填入文章列表
    # 【修改】加上 id='article-content'，让首页列表也能触发滚动渐入特效
    page_html = page_html.replace(
        '{{ content }}', 
        f"<div id='article-content'><h1>文章列表</h1>{index_list_html}</div>"
    )
    
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(page_html)
    print("[首页] index.html 生成完毕")