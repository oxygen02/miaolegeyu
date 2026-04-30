#!/usr/bin/env python3
"""恢复关键图标到本地"""

from PIL import Image
import os

output_dir = "/Users/ouyangguoqing/Documents/trae_projects/miaolegeyu1/miniprogram/assets/images"
os.makedirs(output_dir, exist_ok=True)

# 需要恢复的关键图标 (文件名, 颜色)
key_icons = [
    ("faqijucan.png", "#FF9F43"),
    ("cat-paw-icon.png", "#FFB347"),
    ("yutangpindan.png", "#54A0FF"),
    ("love-cat-icon.png", "#FF6B6B"),
    ("juze_avatar.png", "#FF9F43"),
    ("cat-avatar-icon.png", "#FFA502"),
    ("singleclaw.png", "#FF9F43"),
    ("gaizhang.png", "#FF6B6B"),
    ("lunbozhanwei.png", "#FFE4B5"),
    ("paw-home-icon.png", "#FF9F43"),
    ("fish-icon.png", "#54A0FF"),
    ("daohang.png", "#3D3D3D"),
    ("wotiaohaole1.png", "#FF9F43"),
    ("nimenlaiding2.png", "#54A0FF"),
]

for filename, color in key_icons:
    filepath = os.path.join(output_dir, filename)
    if not os.path.exists(filepath):
        # 创建 200x200 的纯色图片
        img = Image.new('RGB', (200, 200), color)
        img.save(filepath, 'PNG', optimize=True)
        print(f"✓ 创建占位图: {filename}")
    else:
        print(f"- 已存在: {filename}")

print(f"\n已恢复关键图标到: {output_dir}")
