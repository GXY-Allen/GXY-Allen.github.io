import datetime
import calendar

# =========================================
# --- 工具函数 1: 生成日历 ---
# =========================================
def generate_calendar_html():
    now = datetime.datetime.now()
    year = now.year
    month = now.month
    today_date = datetime.date.today()
    
    cal = calendar.Calendar(firstweekday=6)
    weeks = cal.monthdatescalendar(year, month)
    
    month_name = calendar.month_name[month]
    html_lines = []
    html_lines.append(f'<div class="calendar-header">{month_name} {year}</div>')
    html_lines.append('<table class="calendar-table">')
    
    html_lines.append('<thead><tr>')
    week_headers = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    for day in week_headers:
        html_lines.append(f'<th>{day}</th>')
    html_lines.append('</tr></thead>')
    
    html_lines.append('<tbody>')
    for week in weeks:
        html_lines.append('<tr>')
        for day in week:
            classes = []
            if day.month != month:
                classes.append("other-month")
            if day == today_date:
                classes.append("today")
            
            class_str = f' class="{" ".join(classes)}"' if classes else ""
            html_lines.append(f'<td{class_str}>{day.day}</td>')     
        html_lines.append('</tr>')
    html_lines.append('</tbody></table>')
    
    return "\n".join(html_lines)


# =========================================
# --- 工具函数 2: 读取模板 ---
# =========================================
def load_template(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        return f.read()