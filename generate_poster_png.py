from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math, random

random.seed(42)

W, H = 750, 1500
cx = W // 2
CN_FONT = '/System/Library/Fonts/STHeiti Medium.ttc'
OUTLINE_FONT = '/System/Library/Fonts/STHeiti Medium.ttc'

# Preload all fonts
F = {}
for name, path, size in [
    ('hero', CN_FONT, 42), ('title', CN_FONT, 38), ('sub', CN_FONT, 26),
    ('addr', CN_FONT, 24), ('num', CN_FONT, 86), ('stat', CN_FONT, 22),
    ('small', CN_FONT, 20), ('tiny', CN_FONT, 18), ('bar', CN_FONT, 14),
    ('brand', CN_FONT, 20), ('slogan', CN_FONT, 18),
]:
    F[name] = ImageFont.truetype(path, size)

def draw_star(d, x, y, r, fill):
    pts = []
    for i in range(5):
        a = (i * 2 * math.pi / 5) - math.pi / 2
        pts.append((x + r * math.cos(a), y + r * math.sin(a)))
        ia = a + math.pi / 5
        pts.append((x + r * 0.4 * math.cos(ia), y + r * 0.4 * math.sin(ia)))
    d.polygon(pts, fill=fill)

def draw_trophy(d, x, y, size):
    gold = (255, 213, 79)
    outline = (249, 168, 37)
    # Cup body
    d.polygon([
        (x-size*0.35, y+size*0.2), (x+size*0.35, y+size*0.2),
        (x+size*0.25, y+size*0.65), (x-size*0.25, y+size*0.65)
    ], fill=gold, outline=outline)
    # Cup top
    d.rounded_rectangle([x-size*0.4, y+size*0.1, x+size*0.4, y+size*0.25], radius=3, fill=gold, outline=outline)
    # Handles
    d.arc([x-size*0.75, y+size*0.22, x-size*0.35, y+size*0.58], -0.5, 2.5, fill=outline, width=2)
    d.arc([x+size*0.35, y+size*0.22, x+size*0.75, y+size*0.58], 0.6, 3.6, fill=outline, width=2)
    # Base
    d.rounded_rectangle([x-size*0.4, y+size*0.65, x+size*0.4, y+size*0.8], radius=2, fill=gold, outline=outline)
    d.rounded_rectangle([x-size*0.5, y+size*0.8, x+size*0.5, y+size*0.92], radius=2, fill=gold, outline=outline)

def centered_text(d, y, text, font, fill):
    bb = d.textbbox((0, 0), text, font=font)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    d.text((cx - tw // 2, y), text, fill=fill, font=font)
    return y + th + 8

# ============ BUILD POSTER ============

# L1: Background base
bg = Image.new('RGBA', (W, H), (255, 248, 240, 255))

# L2: Atmospheric warm gradient circles (background image layer)
atmo = Image.new('RGBA', (W, H), (0, 0, 0, 0))
ad = ImageDraw.Draw(atmo)
for _ in range(10):
    ax = random.randint(50, W-50)
    ay = random.randint(200, H-100)
    ar = random.randint(130, 300)
    for r in range(ar, 0, -3):
        alpha = int(20 * (1 - r / ar))
        ad.ellipse([ax-r, ay-r, ax+r, ay+r], fill=(255, 159, 67, alpha))

# Golden scattered dots
for dx, dy, dr, da in [
    (45,350,6,0.2),(95,1400,4,0.15),(130,1380,8,0.18),
    (W-55,380,5,0.2),(W-100,1440,6,0.15),(W-140,1410,4,0.18),
    (25,700,3,0.12),(W-30,750,4,0.12),(18,920,5,0.1),
    (W-25,900,3,0.1),(60,1100,4,0.08),(W-50,1050,3,0.08),
    (W-80,350,5,0.15),(80,320,4,0.15),
]:
    ad.ellipse([dx-dr,dy-dr,dx+dr,dy+dr], fill=(255,213,79,int(255*da)))

# Background stars
for sx,sy,sr,sa in [(120,1370,9,50),(70,340,7,40),(W-80,310,6,40),(15,890,5,30),(W-100,1450,6,40)]:
    draw_star(ad, sx, sy, sr, (255,213,79,sa))

atmo = atmo.filter(ImageFilter.GaussianBlur(1))
bg = Image.alpha_composite(bg, atmo)

# L3: Header gradient band with transparency
hdr = Image.new('RGBA', (W, 360), (0,0,0,0))
hd = ImageDraw.Draw(hdr)
for x in range(W):
    ratio = x / W
    if ratio < 0.5:
        t = ratio * 2
        r = int(255 * (0.54 + 0.08 * t))
        g = int(255 * (0.34 + 0.04 * t))
        b = int(255 * (0.40 + 0.08 * t))
    else:
        t = (ratio - 0.5) * 2
        r = int(255 * (0.62 + 0.05 * t))
        g = int(255 * (0.38 + 0.12 * t))
        b = int(255 * (0.48 + 0.18 * t))
    for y in range(290):
        alpha = 255
        if y > 250: alpha = int(255 * max(0, 1 - (y-250)/40))
        hd.line([(x,y),(x,y)], fill=(r,g,b,alpha))

# Header decorative circles
for ex,ey,er in [(50,30,130),(W-120,40,110),(140,220,200),(W-140,200,150),(30,150,70),(W-60,130,70)]:
    hd.ellipse([ex,ey,ex+er*2,ey+er*2], fill=(255,255,255,25))

hdr = hdr.filter(ImageFilter.GaussianBlur(0.5))

# Place header on full canvas
hdr_full = Image.new('RGBA', (W, H), (0,0,0,0))
hdr_full.paste(hdr, (0,0), hdr)
bg = Image.alpha_composite(bg, hdr_full)

# L4: White card + shadow
card_x, card_y, card_w, card_h = 36, 340, W-72, 1040
card_r = 28

shd = Image.new('RGBA', (W, H), (0,0,0,0))
ImageDraw.Draw(shd).rounded_rectangle(
    [card_x+4, card_y+12, card_x+card_w+4, card_y+card_h+12],
    radius=card_r, fill=(0,0,0,22)
)
shd = shd.filter(ImageFilter.GaussianBlur(20))

crd = Image.new('RGBA', (W, H), (0,0,0,0))
ImageDraw.Draw(crd).rounded_rectangle([card_x, card_y, card_x+card_w, card_y+card_h], radius=card_r, fill=(255,255,255,255))

bg = Image.alpha_composite(bg, shd)
bg = Image.alpha_composite(bg, crd)

# L5: Card content (celebrations + text)
cnt = Image.new('RGBA', (W, H), (0,0,0,0))
cd = ImageDraw.Draw(cnt)

# Trophy
draw_trophy(cd, cx, card_y+55, 44)

# Stars
for sx,sy,sr in [
    (card_x+55,card_y+50,13),(card_x+card_w-60,card_y+45,11),
    (card_x+85,card_y+80,8),(card_x+card_w-95,card_y+78,9),
    (cx-95,card_y+42,11),(cx+75,card_y+52,9),
    (card_x+140,card_y+100,7),(card_x+card_w-150,card_y+105,8),
]:
    draw_star(cd, sx, sy, sr, (255,213,79,220))

# Confetti
random.seed(123)
conf_colors = [(255,138,101),(255,183,77),(255,213,79),(255,159,67),(255,204,128)]
for i in range(25):
    ccx = card_x + 40 + random.random() * (card_w-80)
    ccy = card_y + 35 + random.random() * 65
    cw, ch = 4+random.random()*8, 12+random.random()*18
    ang = (random.random()-0.5)*55
    conf = Image.new('RGBA', (int(cw)+6, int(ch)+6), (0,0,0,0))
    cdf = ImageDraw.Draw(conf)
    alpha = int(140+random.random()*100)
    cdf.rounded_rectangle([3,3,3+int(cw),3+int(ch)], radius=2, fill=conf_colors[i%5]+(alpha,))
    conf = conf.rotate(ang, expand=True, resample=Image.BICUBIC)
    cnt.paste(conf, (int(ccx-conf.width//2), int(ccy-conf.height//2)), conf)

# Text: Restaurant name 38px
y = card_y + 135
bb = cd.textbbox((0,0), '大渔铁板烧(海岸城店)', font=F['title'])
tw = bb[2]-bb[0]
cd.text((cx-tw//2, y), '大渔铁板烧(海岸城店)', fill=(45,32,24,255), font=F['title'])
y += 55

# Address 24px
bb = cd.textbbox((0,0), '南山区海德三道  |  日本料理', font=F['addr'])
tw = bb[2]-bb[0]
cd.text((cx-tw//2, y), '南山区海德三道  |  日本料理', fill=(102,102,102,255), font=F['addr'])
y += 58

# Time 38px
bb = cd.textbbox((0,0), '时间: 2026-05-10 18:30', font=F['title'])
tw = bb[2]-bb[0]
cd.text((cx-tw//2, y), '时间: 2026-05-10 18:30', fill=(45,32,24,255), font=F['title'])
y += 62

# Divider
cd.line([(card_x+60,y),(card_x+card_w-60,y)], fill=(237,232,226,255), width=1)
y += 52

# Vote count 86px
bb = cd.textbbox((0,0), '8 票', font=F['num'])
tw = bb[2]-bb[0]
cd.text((cx-tw//2, y), '8 票', fill=(255,138,101,255), font=F['num'])
y += 105

# Support rate 22px
bb = cd.textbbox((0,0), '支持率 67%  ·  12人参与', font=F['stat'])
tw = bb[2]-bb[0]
cd.text((cx-tw//2, y), '支持率 67%  ·  12人参与', fill=(153,153,153,255), font=F['stat'])
y += 40

# Progress bar 24px
bar_w = card_w - 140
bar_x = cx - bar_w//2
bar_h = 24
cd.rounded_rectangle([bar_x,y,bar_x+bar_w,y+bar_h], radius=12, fill=(240,235,228,255))

fill_w = int(bar_w * 0.67)
# Draw gradient fill directly with proper rounded ends
for x in range(fill_w):
    ratio = x/bar_w
    r = int(255*(0.54+0.08*ratio))
    g = int(255*(0.34+0.12*ratio))
    b = int(255*(0.40+0.18*ratio))
    # Only draw if within rounded area
    if x < 12 or x > fill_w - 12:
        # Skip edge pixels for rounded effect
        if x < 12:
            h = int(math.sqrt(144 - (12-x)**2) * 2)
            cd.line([(bar_x+x, y+bar_h//2-h//2), (bar_x+x, y+bar_h//2+h//2)], fill=(r,g,b,255))
        else:
            h = int(math.sqrt(144 - (x-(fill_w-12))**2) * 2)
            cd.line([(bar_x+x, y+bar_h//2-h//2), (bar_x+x, y+bar_h//2+h//2)], fill=(r,g,b,255))
    else:
        cd.line([(bar_x+x,y),(bar_x+x,y+bar_h)], fill=(r,g,b,255))

bb = cd.textbbox((0,0), '67%', font=F['bar'])
tw, th = bb[2]-bb[0], bb[3]-bb[1]
cd.text((bar_x+fill_w//2-tw//2, y+bar_h//2-th//2-1), '67%', fill=(255,255,255,255), font=F['bar'])
y += 60

# Divider
cd.line([(card_x+60,y),(card_x+card_w-60,y)], fill=(237,232,226,255), width=1)
y += 58

# QR code large circle
qr_cy = y + 70
qr_r = 62
cd.ellipse([cx-qr_r-6,qr_cy-qr_r-6,cx+qr_r+6,qr_cy+qr_r+6], outline=(240,235,228,200), width=2)
cd.ellipse([cx-qr_r,qr_cy-qr_r,cx+qr_r,qr_cy+qr_r], fill=(248,245,242,255))
cd.ellipse([cx-50,qr_cy-50,cx+50,qr_cy+50], fill=(224,218,210,255))
bb = cd.textbbox((0,0), '小程序码', font=F['tiny'])
tw, th = bb[2]-bb[0], bb[3]-bb[1]
cd.text((cx-tw//2, qr_cy-th//2), '小程序码', fill=(192,186,176,255), font=F['tiny'])

y = qr_cy + qr_r + 20
bb = cd.textbbox((0,0), '长按识别查看详情', font=F['stat'])
tw = bb[2]-bb[0]
cd.text((cx-tw//2, y), '长按识别查看详情', fill=(153,153,153,255), font=F['stat'])

bg = Image.alpha_composite(bg, cnt)

# L6: Header text
ht = Image.new('RGBA', (W,H), (0,0,0,0))
hdd = ImageDraw.Draw(ht)
bb = hdd.textbbox((0,0), '聚餐地点已定', font=F['hero'])
tw, th = bb[2]-bb[0], bb[3]-bb[1]
hdd.text((cx-tw//2, 85-th//2), '聚餐地点已定', fill=(255,255,255,255), font=F['hero'])

bb = hdd.textbbox((0,0), '周末聚餐大作战', font=F['sub'])
tw, th = bb[2]-bb[0], bb[3]-bb[1]
hdd.text((cx-tw//2, 150-th//2), '周末聚餐大作战', fill=(255,255,255,int(255*0.85)), font=F['sub'])
bg = Image.alpha_composite(bg, ht)

# L7: Cat avatar
av = Image.new('RGBA', (W,H), (0,0,0,0))
avd = ImageDraw.Draw(av)
av_cy, av_r = 288, 52
# Shadow
avs = Image.new('RGBA', (W,H), (0,0,0,0))
ImageDraw.Draw(avs).ellipse([cx-av_r-4,av_cy-av_r-2,cx+av_r+4,av_cy+av_r+10], fill=(0,0,0,25))
avs = avs.filter(ImageFilter.GaussianBlur(10))
av.paste(avs, (0,0), avs)
avd.ellipse([cx-av_r-5,av_cy-av_r-5,cx+av_r+5,av_cy+av_r+5], fill=(255,255,255,255))
avd.ellipse([cx-av_r,av_cy-av_r,cx+av_r,av_cy+av_r], fill=(240,235,228,255))
bb = avd.textbbox((0,0), '猫头', font=F['tiny'])
tw, th = bb[2]-bb[0], bb[3]-bb[1]
avd.text((cx-tw//2, av_cy-th//2), '猫头', fill=(192,186,176,255), font=F['tiny'])
bg = Image.alpha_composite(bg, av)

# L8: Footer brand
ft = Image.new('RGBA', (W,H), (0,0,0,0))
ftd = ImageDraw.Draw(ft)
bb = ftd.textbbox((0,0), '喵了个鱼', font=F['brand'])
tw = bb[2]-bb[0]
ftd.text((cx-tw//2, H-62), '喵了个鱼', fill=(192,186,176,255), font=F['brand'])
bb = ftd.textbbox((0,0), '一起吃饭，一起快乐', font=F['slogan'])
tw = bb[2]-bb[0]
ftd.text((cx-tw//2, H-36), '一起吃饭，一起快乐', fill=(208,200,190,255), font=F['slogan'])
bg = Image.alpha_composite(bg, ft)

# Save
final = bg.convert('RGB')
out = '/Users/ouyangguoqing/Documents/trae_projects/miaolegeyu1/poster_warm_verdict.png'
final.save(out, 'PNG')
print(f'Saved: {out} ({final.size[0]}x{final.size[1]})')
