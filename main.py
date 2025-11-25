from core import config
from core import tools
from core import builder_posts
from core import builder_index

def main():
    print("=== 开始构建博客 ===")
    
    # 1. 准备公共资源
    # 注意：因为是从根目录运行 main.py，所以 config 里的相对路径依然有效
    raw_template = tools.load_template(config.TEMPLATE_FILE)
    calendar_html = tools.generate_calendar_html()
    
    context = {
        'calendar': calendar_html
    }
    
    # 2. 生成文章页
    posts_data = builder_posts.build_all_posts(raw_template, context)
    
    # 3. 生成首页
    builder_index.build_index_page(posts_data, raw_template, context)
    
    print("=== 构建成功！ ===")

if __name__ == '__main__':
    main()