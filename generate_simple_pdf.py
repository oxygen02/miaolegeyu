#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成喵了个鱼参赛总结PDF - 使用reportlab
"""

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import re

def generate_pdf():
    # 创建PDF文档
    doc = SimpleDocTemplate(
        "喵了个鱼_Trae编程比赛参赛总结.pdf",
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm
    )
    
    # 获取样式
    styles = getSampleStyleSheet()
    
    # 创建自定义样式
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#FF6B6B'),
        spaceAfter=30,
        alignment=1  # 居中
    )
    
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Normal'],
        fontSize=14,
        textColor=colors.HexColor('#5A4A42'),
        spaceAfter=20,
        alignment=1
    )
    
    heading1_style = ParagraphStyle(
        'CustomH1',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#FF6B6B'),
        spaceAfter=12,
        spaceBefore=20
    )
    
    heading2_style = ParagraphStyle(
        'CustomH2',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#5A4A42'),
        spaceAfter=10,
        spaceBefore=15
    )
    
    heading3_style = ParagraphStyle(
        'CustomH3',
        parent=styles['Heading3'],
        fontSize=12,
        textColor=colors.HexColor('#5A4A42'),
        spaceAfter=8,
        spaceBefore=12
    )
    
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['Normal'],
        fontSize=10,
        leading=16,
        spaceAfter=10
    )
    
    code_style = ParagraphStyle(
        'CodeStyle',
        parent=styles['Code'],
        fontSize=8,
        leading=12,
        leftIndent=20,
        textColor=colors.HexColor('#333333'),
        backColor=colors.HexColor('#f8f9fa')
    )
    
    # 构建文档内容
    story = []
    
    # 标题
    story.append(Paragraph("喵了个鱼 - Trae编程比赛参赛总结", title_style))
    story.append(Paragraph("微信小程序开发案例", subtitle_style))
    story.append(Spacer(1, 0.3*inch))
    
    # 读取Markdown内容
    with open('喵了个鱼_参赛总结.md', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 移除emoji
    content = re.sub(r'[\U00010000-\U0010ffff]', '', content)
    
    # 按行处理
    lines = content.split('\n')
    i = 0
    code_buffer = []
    in_code_block = False
    
    while i < len(lines):
        line = lines[i].strip()
        
        # 处理代码块
        if line.startswith('```'):
            if in_code_block:
                # 结束代码块
                if code_buffer:
                    code_text = '<br/>'.join(code_buffer[:30])  # 限制行数
                    story.append(Paragraph(code_text, code_style))
                    code_buffer = []
                in_code_block = False
            else:
                in_code_block = True
            i += 1
            continue
        
        if in_code_block:
            # 转义HTML特殊字符
            safe_line = line.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            code_buffer.append(safe_line)
            i += 1
            continue
        
        # 处理标题
        if line.startswith('# '):
            story.append(Paragraph(line[2:], heading1_style))
        elif line.startswith('## '):
            story.append(Paragraph(line[3:], heading2_style))
        elif line.startswith('### '):
            story.append(Paragraph(line[4:], heading3_style))
        elif line.startswith('#### '):
            story.append(Paragraph(line[5:], heading3_style))
        # 处理引用
        elif line.startswith('>'):
            quote_text = line[1:].strip()
            quote_para = Paragraph(f"<i>{quote_text}</i>", body_style)
            story.append(quote_para)
        # 处理表格行（跳过，因为reportlab表格较复杂）
        elif line.startswith('|'):
            pass  # 跳过表格
        # 处理分隔线
        elif line == '---':
            story.append(Spacer(1, 0.2*inch))
        # 处理普通段落
        elif line:
            # 处理Markdown标记
            # 粗体
            line = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', line)
            line = re.sub(r'__(.+?)__', r'<b>\1</b>', line)
            # 斜体
            line = re.sub(r'\*(.+?)\*', r'<i>\1</i>', line)
            line = re.sub(r'_(.+?)_', r'<i>\1</i>', line)
            # 代码
            line = re.sub(r'`(.+?)`', r'<code>\1</code>', line)
            # 链接
            line = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', line)
            
            story.append(Paragraph(line, body_style))
        else:
            # 空行
            story.append(Spacer(1, 0.1*inch))
        
        i += 1
    
    # 生成PDF
    doc.build(story)
    print("✅ PDF生成成功！")
    print("📄 文件名：喵了个鱼_Trae编程比赛参赛总结.pdf")
    print("📍 位置：/Users/ouyangguoqing/Documents/trae_projects/miaolegeyu1/喵了个鱼_Trae编程比赛参赛总结.pdf")

if __name__ == '__main__':
    generate_pdf()
