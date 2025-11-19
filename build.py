import os
import markdown

# 配置
POSTS_DIR = 'posts'
TEMPLATE_FILE = 'template.html'
OUTPUT_FILE = 'index.html'

def build_blog():
    print("开始生成博客...")
    
    # 1. 读取模板
    with open(TEMPLATE_FILE, 'r', encoding='utf-8') as f:
        template_content = f.read()

    # 2. 读取并转换 Markdown 文章
    posts_html = ""
    # 获取所有md文件
    files = [f for f in os.listdir(POSTS_DIR) if f.endswith('.md')]
    
    for filename in files:
        filepath = os.path.join(POSTS_DIR, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            md_content = f.read()
            # 将 Markdown 转为 HTML
            html_content = markdown.markdown(md_content)
            
            # 包装成卡片样式
            post_card = f"""
            <div class="card">
                <span class="date">{filename}</span>
                {html_content}
            </div>
            """
            posts_html += post_card

    # 3. 替换模板内容
    final_html = template_content.replace('{{ posts_content }}', posts_html)

    # 4. 写入最终的 index.html
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(final_html)
    
    print("生成完毕！index.html 已更新。")

if __name__ == '__main__':
    build_blog()