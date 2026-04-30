#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成喵了个鱼参赛总结PDF
"""

import markdown
from weasyprint import HTML, CSS
from weasyprint.text.fonts import FontConfiguration

def generate_pdf():
    # 读取Markdown文件
    with open('喵了个鱼_参赛总结.md', 'r', encoding='utf-8') as f:
        md_content = f.read()
    
    # 转换为HTML
    html_content = markdown.markdown(
        md_content,
        extensions=['tables', 'fenced_code', 'toc']
    )
    
    # 添加样式
    css_content = '''
    @page {
        size: A4;
        margin: 2.5cm;
        @bottom-center {
            content: counter(page);
            font-size: 10pt;
            color: #666;
        }
    }
    
    body {
        font-family: "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif;
        font-size: 11pt;
        line-height: 1.8;
        color: #333;
    }
    
    h1 {
        font-size: 24pt;
        color: #FF6B6B;
        text-align: center;
        margin-bottom: 30pt;
        border-bottom: 3px solid #FF6B6B;
        padding-bottom: 10pt;
    }
    
    h2 {
        font-size: 16pt;
        color: #5A4A42;
        margin-top: 25pt;
        margin-bottom: 15pt;
        border-left: 5px solid #FF6B6B;
        padding-left: 10pt;
    }
    
    h3 {
        font-size: 13pt;
        color: #5A4A42;
        margin-top: 20pt;
        margin-bottom: 10pt;
    }
    
    h4 {
        font-size: 12pt;
        color: #666;
        margin-top: 15pt;
        margin-bottom: 8pt;
    }
    
    p {
        margin-bottom: 10pt;
        text-align: justify;
    }
    
    code {
        font-family: "SF Mono", "Monaco", "Inconsolata", "Fira Code", monospace;
        background-color: #f5f5f5;
        padding: 2pt 5pt;
        border-radius: 3pt;
        font-size: 9pt;
        color: #d63384;
    }
    
    pre {
        background-color: #f8f9fa;
        border: 1pt solid #e9ecef;
        border-radius: 5pt;
        padding: 10pt;
        overflow-x: auto;
        margin: 15pt 0;
    }
    
    pre code {
        background-color: transparent;
        padding: 0;
        color: #333;
        font-size: 8pt;
        line-height: 1.5;
    }
    
    blockquote {
        border-left: 4pt solid #FF6B6B;
        margin: 15pt 0;
        padding: 10pt 15pt;
        background-color: #FFF5F5;
        font-style: italic;
    }
    
    table {
        width: 100%;
        border-collapse: collapse;
        margin: 15pt 0;
        font-size: 10pt;
    }
    
    th, td {
        border: 1pt solid #ddd;
        padding: 8pt;
        text-align: left;
    }
    
    th {
        background-color: #FF6B6B;
        color: white;
        font-weight: bold;
    }
    
    tr:nth-child(even) {
        background-color: #f9f9f9;
    }
    
    ul, ol {
        margin: 10pt 0;
        padding-left: 25pt;
    }
    
    li {
        margin-bottom: 5pt;
    }
    
    strong {
        color: #FF6B6B;
        font-weight: bold;
    }
    
    em {
        color: #666;
        font-style: italic;
    }
    
    hr {
        border: none;
        border-top: 2pt solid #eee;
        margin: 20pt 0;
    }
    
    .toc {
        background-color: #f9f9f9;
        padding: 15pt;
        border-radius: 5pt;
        margin-bottom: 20pt;
    }
    
    .toc ul {
        list-style: none;
        padding-left: 0;
    }
    
    .toc li {
        margin-bottom: 3pt;
    }
    
    .toc a {
        color: #333;
        text-decoration: none;
    }
    
    .toc a:hover {
        color: #FF6B6B;
    }
    '''
    
    # 完整的HTML文档
    full_html = f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>喵了个鱼 - Trae编程比赛参赛总结</title>
</head>
<body>
        {html_content}
</body>
</html>'''
    
    # 生成PDF
    font_config = FontConfiguration()
    HTML(string=full_html).write_pdf(
        '喵了个鱼_Trae编程比赛参赛总结.pdf',
        stylesheets=[CSS(string=css_content, font_config=font_config)],
        font_config=font_config
    )
    
    print("✅ PDF生成成功！")
    print("📄 文件名：喵了个鱼_Trae编程比赛参赛总结.pdf")

if __name__ == '__main__':
    generate_pdf()
