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
    
    # 首页左侧留空
    page_html = page_html.replace('{{ sidebar_left }}', "")

    # 右侧填充日历
    page_html = page_html.replace('{{ calendar_widget }}', common_context['calendar'])

    # 填入文章列表
    page_html = page_html.replace('{{ content }}', "<h1>文章列表</h1>" + index_list_html)
    
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(page_html)
    print("[首页] index.html 生成完毕")