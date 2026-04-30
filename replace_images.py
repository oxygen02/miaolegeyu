#!/usr/bin/env python3
"""
批量替换所有页面的图片引用，改为使用云存储路径
"""

import os
import re

# 图片映射规则
IMAGE_MAPPINGS = {
    # 图标
    'about.png': 'imagePaths.icons.about',
    'history.png': 'imagePaths.icons.history',
    'setting.png': 'imagePaths.icons.setting',
    'gexingtouxiang.png': 'imagePaths.icons.gexingtouxiang',
    'hudong.png': 'imagePaths.icons.hudong',
    'tuijian.png': 'imagePaths.icons.tuijian',
    'toupiaojuece.png': 'imagePaths.icons.toupiaojuece',
    'juze_avatar.png': 'imagePaths.icons.juzeAvatar',
    'daohang.png': 'imagePaths.icons.daohang',
    'chongxuan.png': 'imagePaths.icons.chongxuan',
    'gaizhang.png': 'imagePaths.icons.gaizhang',
    
    # 装饰图
    'cat-fish-logo.png': 'imagePaths.decorations.catFishLogo',
    'loading-cat.png': 'imagePaths.decorations.loadingCat',
    'cat-decoration.png': 'imagePaths.decorations.catDecoration',
    'cat-avatar-icon.png': 'imagePaths.decorations.catAvatarIcon',
    'happy-cat-icon.png': 'imagePaths.decorations.happyCatIcon',
    'love-cat-icon.png': 'imagePaths.decorations.loveCatIcon',
    'peeking-cat-icon.png': 'imagePaths.decorations.peekingCatIcon',
    'sleeping-cat-icon.png': 'imagePaths.decorations.sleepingCatIcon',
    'wink-cat-icon.png': 'imagePaths.decorations.winkCatIcon',
    'angry-cat.png': 'imagePaths.decorations.angryCat',
    
    # 横幅
    'faqijucan.png': 'imagePaths.banners.faqijucan',
    'nimenlaiding2.png': 'imagePaths.banners.nimenlaiding2',
    'yutangpindan.png': 'imagePaths.banners.yutangpindan',
    'taiyaki-icon.png': 'imagePaths.banners.taiyakiIcon',
    'maoweiba.png': 'imagePaths.banners.maoweiba',
    'wotiaohaole1.png': 'imagePaths.banners.wotiaohaole1',
    'lunbozhanwei.png': 'imagePaths.banners.lunbozhanwei',
    'lunbozhanwei2.png': 'imagePaths.banners.lunbozhanwei2',
    
    # 其他
    'singleclaw.png': 'imagePaths.misc.singleclaw',
    'wxhlfangun.png': 'imagePaths.misc.wxhlfangun',
    'cat-paw-icon.png': 'imagePaths.misc.catPawIcon',
    'paw-home-icon.png': 'imagePaths.misc.pawHomeIcon',
    'fish-icon.png': 'imagePaths.misc.fishIcon',
}

def add_imagepaths_import(js_content):
    """在 JS 文件开头添加 imagePaths 导入"""
    if 'imagePaths' in js_content:
        return js_content
    
    import_line = "const { imagePaths } = require('../../config/imageConfig');\n\n"
    
    # 找到 Page({ 的位置
    page_match = re.search(r'(Page\(\{)', js_content)
    if page_match:
        # 在 Page({ 之前插入导入
        pos = page_match.start()
        return js_content[:pos] + import_line + js_content[pos:]
    
    return import_line + js_content

def add_imagepaths_to_data(js_content):
    """在 data 中添加 imagePaths"""
    # 检查是否已经有 imagePaths
    if 'imagePaths:' in js_content or 'imagePaths :' in js_content:
        return js_content
    
    # 查找 data: { 的位置
    data_match = re.search(r'data:\s*\{', js_content)
    if data_match:
        # 在 data: { 后面添加 imagePaths
        insert_pos = data_match.end()
        # 检查 data 是否为空
        after_data = js_content[insert_pos:].lstrip()
        if after_data.startswith('}'):
            # data: {} 是空的
            new_content = js_content[:insert_pos] + '\n    imagePaths: imagePaths' + js_content[insert_pos:]
        else:
            # data: { 已经有内容
            new_content = js_content[:insert_pos] + '\n    imagePaths: imagePaths,' + js_content[insert_pos:]
        return new_content
    
    return js_content

def replace_wxml_images(wxml_content):
    """替换 WXML 中的图片路径"""
    # 匹配 src="/assets/images/xxx.png" 的模式
    pattern = r'src="/assets/images/([^"]+)"'
    
    def replace_match(match):
        filename = match.group(1)
        if filename in IMAGE_MAPPINGS:
            return f'src="{{{{{IMAGE_MAPPINGS[filename]}}}}}"'
        return match.group(0)
    
    return re.sub(pattern, replace_match, wxml_content)

def process_page(page_path):
    """处理单个页面"""
    js_file = os.path.join(page_path, os.path.basename(page_path) + '.js')
    wxml_file = os.path.join(page_path, os.path.basename(page_path) + '.wxml')
    
    if os.path.exists(js_file):
        with open(js_file, 'r', encoding='utf-8') as f:
            js_content = f.read()
        
        # 检查是否有图片引用
        if '/assets/images/' in js_content:
            js_content = add_imagepaths_import(js_content)
            js_content = add_imagepaths_to_data(js_content)
            
            with open(js_file, 'w', encoding='utf-8') as f:
                f.write(js_content)
            print(f"✓ 修改 JS: {js_file}")
    
    if os.path.exists(wxml_file):
        with open(wxml_file, 'r', encoding='utf-8') as f:
            wxml_content = f.read()
        
        if '/assets/images/' in wxml_content:
            new_content = replace_wxml_images(wxml_content)
            if new_content != wxml_content:
                with open(wxml_file, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"✓ 修改 WXML: {wxml_file}")

def main():
    pages_dir = '/Users/ouyangguoqing/Documents/trae_projects/miaolegeyu1/miniprogram/pages'
    
    # 遍历所有页面
    for page_name in os.listdir(pages_dir):
        page_path = os.path.join(pages_dir, page_name)
        if os.path.isdir(page_path):
            try:
                process_page(page_path)
            except Exception as e:
                print(f"✗ 错误 {page_name}: {e}")
    
    print("\n完成！所有页面已更新为云存储图片路径。")

if __name__ == '__main__':
    main()
