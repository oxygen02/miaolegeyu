#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成喵了个鱼参赛总结PDF - 使用fpdf2和中文字体
"""

from fpdf import FPDF
import re

class PDF(FPDF):
    def __init__(self):
        super().__init__()
        # 添加中文字体
        self.add_font('NotoSansSC', '', 'NotoSansSC-Regular.ttf', uni=True)
        self.add_font('NotoSansSC', 'B', 'NotoSansSC-Regular.ttf', uni=True)
        
    def header(self):
        # 标题
        if self.page_no() == 1:
            self.set_font('NotoSansSC', 'B', 20)
            self.set_text_color(255, 107, 107)  # #FF6B6B
            self.cell(0, 20, '喵了个鱼 - Trae编程比赛参赛总结', new_x="LMARGIN", new_y="NEXT", align='C')
            self.set_font('NotoSansSC', '', 12)
            self.set_text_color(90, 74, 66)  # #5A4A42
            self.cell(0, 10, '微信小程序开发案例', new_x="LMARGIN", new_y="NEXT", align='C')
            self.ln(10)
        
    def footer(self):
        # 页脚
        self.set_y(-15)
        self.set_font('NotoSansSC', '', 8)
        self.set_text_color(128, 128, 128)
        self.cell(0, 10, f'第 {self.page_no()} 页', align='C')

    def chapter_title(self, title, level=1):
        # 章节标题
        if level == 1:
            self.set_font('NotoSansSC', 'B', 16)
            self.set_text_color(255, 107, 107)
            self.ln(10)
            self.cell(0, 12, title, new_x="LMARGIN", new_y="NEXT")
            self.line(10, self.get_y(), 200, self.get_y())
            self.ln(5)
        elif level == 2:
            self.set_font('NotoSansSC', 'B', 13)
            self.set_text_color(90, 74, 66)
            self.ln(8)
            self.cell(0, 10, title, new_x="LMARGIN", new_y="NEXT")
        else:
            self.set_font('NotoSansSC', 'B', 11)
            self.set_text_color(90, 74, 66)
            self.ln(5)
            self.cell(0, 8, title, new_x="LMARGIN", new_y="NEXT")
    
    def chapter_body(self, body):
        # 正文
        self.set_font('NotoSansSC', '', 10)
        self.set_text_color(51, 51, 51)
        self.multi_cell(0, 6, body)
        self.ln()
    
    def code_block(self, code):
        # 代码块
        self.set_font('Courier', '', 7)
        self.set_text_color(51, 51, 51)
        self.set_fill_color(248, 249, 250)
        
        # 分割代码行
        lines = code.split('\n')
        for line in lines[:30]:  # 限制行数避免过长
            # 处理中文字符在Courier字体中的显示问题
            safe_line = line[:90].replace('\t', '    ')
            try:
                self.cell(0, 4, safe_line, new_x="LMARGIN", new_y="NEXT", fill=True)
            except:
                # 如果有无法显示的字符，跳过
                pass
        self.ln(3)

def generate_pdf():
    pdf = PDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    
    # 读取Markdown内容并简化处理
    with open('喵了个鱼_参赛总结.md', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 移除emoji
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
        # 处理代码块（多行）
        elif para.startswith('```'):
            # 找到代码块结束
            code_lines = []
            lines = para.split('\n')
            in_code = False
            for line in lines:
                if line.startswith('```'):
                    in_code = not in_code
                    continue
                if in_code:
                    code_lines.append(line)
            if code_lines:
                pdf.code_block('\n'.join(code_lines))
        # 处理引用
        elif para.startswith('>'):
            pdf.set_font('NotoSansSC', '', 10)
            pdf.set_text_color(102, 102, 102)
            pdf.multi_cell(0, 6, para[1:].strip())
            pdf.ln(2)
        # 处理表格（简化显示）
        elif para.startswith('|'):
            pdf.set_font('NotoSansSC', 'B', 9)
            pdf.set_fill_color(255, 107, 107)
            pdf.set_text_color(255, 255, 255)
            pdf.cell(0, 6, '[表格内容]', new_x="LMARGIN", new_y="NEXT", fill=True)
            pdf.set_text_color(51, 51, 51)
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
    print(f"✅ PDF生成成功！")
    print(f"📄 文件名：{output_file}")
    print(f"📍 位置：/Users/ouyangguoqing/Documents/trae_projects/miaolegeyu1/{output_file}")

if __name__ == '__main__':
    generate_pdf()
