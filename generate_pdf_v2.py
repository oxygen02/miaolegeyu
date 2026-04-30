#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成喵了个鱼参赛总结PDF - 使用wkhtmltopdf
"""

import markdown2
import pdfkit

def generate_pdf():
    # 读取Markdown文件
    with open('喵了个鱼_参赛总结.md', 'r', encoding='utf-8') as f:
        md_content = f.read()
    
    # 转换为HTML（使用markdown2以支持表格等扩展）
    html_content = markdown2.markdown(
        md_content,
        extras=['tables', 'fenced-code-blocks', 'header-ids', 'toc']
    )
    
    # 添加样式
    css_content = '''
    <style>
        @page {
            size: A4;
            margin: 2cm;
        }
        
        body {
            font-family: "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.8;
            color: #333;
            padding: 20px;
        }
        
        h1 {
            font-size: 24pt;
            color: #FF6B6B;
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #FF6B6B;
            padding-bottom: 10px;
        }
        
        h2 {
            font-size: 16pt;
            color: #5A4A42;
            margin-top: 25px;
            margin-bottom: 15px;
            border-left: 5px solid #FF6B6B;
            padding-left: 10px;
        }
        
        h3 {
            font-size: 13pt;
            color: #5A4A42;
            margin-top: 20px;
            margin-bottom: 10px;
        }
        
        h4 {
            font-size: 12pt;
            color: #666;
            margin-top: 15px;
            margin-bottom: 8px;
        }
        
        p {
            margin-bottom: 10px;
            text-align: justify;
        }
        
        code {
            font-family: "SF Mono", "Monaco", "Inconsolata", "Fira Code", monospace;
            background-color: #f5f5f5;
            padding: 2px 5px;
            border-radius: 3px;
            font-size: 9pt;
            color: #d63384;
        }
        
        pre {
            background-color: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 5px;
            padding: 10px;
            overflow-x: auto;
            margin: 15px 0;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        
        pre code {
            background-color: transparent;
            padding: 0;
            color: #333;
            font-size: 8pt;
            line-height: 1.5;
        }
        
        blockquote {
            border-left: 4px solid #FF6B6B;
            margin: 15px 0;
            padding: 10px 15px;
            background-color: #FFF5F5;
            font-style: italic;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            font-size: 10pt;
        }
        
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
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
            margin: 10px 0;
            padding-left: 25px;
        }
        
        li {
            margin-bottom: 5px;
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
            border-top: 2px solid #eee;
            margin: 20px 0;
        }
    </style>
    '''
    
    # 完整的HTML文档
    full_html = f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>喵了个鱼 - Trae编程比赛参赛总结</title>
    {css_content}
</head>
<body>
    {html_content}
</body>
</html>'''
    
    # 配置pdfkit选项
    options = {
        'page-size': 'A4',
        'margin-top': '2cm',
        'margin-right': '2cm',
        'margin-bottom': '2cm',
        'margin-left': '2cm',
        'encoding': 'UTF-8',
        'enable-local-file-access': None,
        'footer-center': '[page]',
        'footer-font-size': '10',
    }
    
    try:
        # 生成PDF
        pdfkit.from_string(full_html, '喵了个鱼_Trae编程比赛参赛总结.pdf', options=options)
        print("✅ PDF生成成功！")
        print("📄 文件名：喵了个鱼_Trae编程比赛参赛总结.pdf")
    except Exception as e:
        print(f"❌ 生成失败: {e}")
        print("\n💡 提示：请确保已安装 wkhtmltopdf")
        print("   macOS安装命令: brew install --cask wkhtmltopdf")
        print("   或访问: https://wkhtmltopdf.org/downloads.html")

if __name__ == '__main__':
    generate_pdf()
