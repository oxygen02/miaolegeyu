#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成喵了个鱼参赛总结PDF - 使用fpdf2
"""

from fpdf import FPDF
import re

class PDF(FPDF):
    def header(self):
        # 标题
        if self.page_no() == 1:
            self.set_font('Helvetica', 'B', 20)
            self.set_text_color(255, 107, 107)  # #FF6B6B
            self.cell(0, 20, 'Miao Le Ge Yu - Trae Programming Competition Summary', 0, 1, 'C')
            self.set_font('Helvetica', '', 12)
            self.set_text_color(90, 74, 66)  # #5A4A42
            self.cell(0, 10, 'WeChat Mini Program Development Case Study', 0, 1, 'C')
            self.ln(10)
        
    def footer(self):
        # 页脚
        self.set_y(-15)
        self.set_font('Helvetica', 'I', 8)
        self.set_text_color(128, 128, 128)
        self.cell(0, 10, f'Page {self.page_no()}', 0, 0, 'C')

    def chapter_title(self, title, level=1):
        # 章节标题
        if level == 1:
            self.set_font('Helvetica', 'B', 16)
            self.set_text_color(255, 107, 107)
            self.ln(10)
            self.cell(0, 12, title, 0, 1, 'L')
            self.line(10, self.get_y(), 200, self.get_y())
            self.ln(5)
        elif level == 2:
            self.set_font('Helvetica', 'B', 13)
            self.set_text_color(90, 74, 66)
            self.ln(8)
            self.cell(0, 10, title, 0, 1, 'L')
        else:
            self.set_font('Helvetica', 'B', 11)
            self.set_text_color(90, 74, 66)
            self.ln(5)
            self.cell(0, 8, title, 0, 1, 'L')
    
    def chapter_body(self, body):
        # 正文
        self.set_font('Helvetica', '', 10)
        self.set_text_color(51, 51, 51)
        self.multi_cell(0, 6, body)
        self.ln()
    
    def code_block(self, code):
        # 代码块
        self.set_font('Courier', '', 8)
        self.set_text_color(51, 51, 51)
        self.set_fill_color(248, 249, 250)
        
        # 分割代码行
        lines = code.split('\n')
        for line in lines[:50]:  # 限制行数避免过长
            self.cell(0, 5, line[:100], 0, 1, 'L', True)  # 限制每行长度
        self.ln(3)

def generate_pdf():
    pdf = PDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    
    # 读取Markdown内容并简化处理
    with open('喵了个鱼_参赛总结.md', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 移除emoji和特殊字符
    content = re.sub(r'[\U00010000-\U0010ffff]', '', content)
    
    # 分割成段落
    paragraphs = content.split('\n\n')
    
    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
            
        # 处理标题
        if para.startswith('# '):
            pdf.chapter_title(para[2:], level=1)
        elif para.startswith('## '):
            pdf.chapter_title(para[3:], level=2)
        elif para.startswith('### '):
            pdf.chapter_title(para[4:], level=3)
        elif para.startswith('#### '):
            pdf.chapter_title(para[5:], level=4)
        # 处理代码块
        elif para.startswith('```') and para.endswith('```'):
            code = para[3:-3].strip()
            pdf.code_block(code)
        # 处理引用
        elif para.startswith('>'):
            pdf.set_font('Helvetica', 'I', 10)
            pdf.set_text_color(102, 102, 102)
            pdf.multi_cell(0, 6, para[1:].strip())
            pdf.ln(2)
        # 处理普通段落
        else:
            # 移除Markdown标记
            para = re.sub(r'\*\*|__', '', para)  # 粗体
            para = re.sub(r'\*|_', '', para)     # 斜体
            para = re.sub(r'`', '', para)        # 代码
            para = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', para)  # 链接
            
            pdf.chapter_body(para)
    
    # 保存PDF
    output_file = '喵了个鱼_Trae编程比赛参赛总结.pdf'
    pdf.output(output_file)
    print(f"✅ PDF generated successfully!")
    print(f"📄 Filename: {output_file}")
    print(f"📍 Location: /Users/ouyangguoqing/Documents/trae_projects/miaolegeyu1/{output_file}")

if __name__ == '__main__':
    generate_pdf()
