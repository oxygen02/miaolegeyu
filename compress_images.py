#!/usr/bin/env python3
from PIL import Image
import os

images_to_compress = [
    ("faqijucan.png", 800),
    ("maoweiba.png", 800),
    ("cat-fish-logo.png", 800),
    ("loading-cat.png", 800),
    ("daohang.png", 800),
    ("nimenlaiding2.png", 800),
    ("yutangpindan.png", 800),
    ("taiyaki-icon.png", 800),
    ("lunbozhanwei.png", 600),
    ("wotiaohaole1.png", 600),
    ("juze_avatar.png", 600),
    ("fish-icon.png", 600),
    ("paw-home-icon.png", 600),
    ("cat-avatar-icon.png", 500),
    ("angry-cat.png", 400),
    ("cat-decoration.png", 400),
    ("happy-cat-icon.png", 300),
    ("love-cat-icon.png", 300),
    ("lunbozhanwei2.png", 400),
    ("peeking-cat-icon.png", 300),
    ("singleclaw.png", 300),
    ("sleeping-cat-icon.png", 300),
    ("wink-cat-icon.png", 200),
    ("wxhlfangun.png", 400),
    ("cat-paw-icon.png", 300)
]

os.chdir("/Users/ouyangguoqing/Documents/trae_projects/miaolegeyu1/miniprogram/assets/images")

total_original = 0
total_new = 0

for img_name, max_width in images_to_compress:
    if os.path.exists(img_name):
        try:
            img = Image.open(img_name)
            original_size = os.path.getsize(img_name)
            
            # 计算新尺寸
            w, h = img.size
            if w > max_width:
                ratio = max_width / w
                new_w = max_width
                new_h = int(h * ratio)
                img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
            
            # 保存，优化压缩
            img.save(img_name, "PNG", optimize=True)
            
            new_size = os.path.getsize(img_name)
            total_original += original_size
            total_new += new_size
            print(f"✓ {img_name}: {original_size/1024:.0f}KB → {new_size/1024:.0f}KB")
        except Exception as e:
            print(f"✗ {img_name}: {e}")
    else:
        print(f"- {img_name}: not found")

print(f"\n总计: {total_original/1024/1024:.1f}MB → {total_new/1024/1024:.1f}MB")
print("压缩完成！")
