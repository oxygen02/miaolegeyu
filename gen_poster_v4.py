from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math, random

W, H = 750, 1500
cx = W // 2

def load_font(path, size):
    try: return ImageFont.truetype(path, size)
    except: return ImageFont.load_default()

# Try to load Chinese-capable font
cn = None
for fp in ['/System/Library/Fonts/STHeiti Medium.ttc',
            '/System/Library/Fonts/STHeiti Light.ttc',
            '/System/Library/Fonts/PingFang.ttc']:
    try:
        cn = load_font(fp, 20)
        # test
        tmp = Image.new('RGB', (10,10))
        ImageDraw.Draw(tmp).text((0,0), '测', font=cn)
        print(f'Using font: {fp}')
        break
    except: continue
if not cn: cn = ImageFont.load_default()

def font(size):
    try: return load_font('/System/Library/Fonts/STHeiti Medium.ttc', size)
    except: return cn

# ==============================================
#  DRAW HELPERS
# ==============================================
def star(d, x, y, r, fill):
    pts = []
    for i in range(5):
        a = (i*2*math.pi/5) - math.pi/2
        pts.append((x + r*math.cos(a), y + r*math.sin(a)))
        ia = a + math.pi/5
        pts.append((x + r*0.38*math.cos(ia), y + r*0.38*math.sin(ia)))
    d.polygon(pts, fill=fill)

def trophy(d, x, y, size, color=(255,213,79), outline=(249,168,37)):
    c = color; o = outline
    d.polygon([(x-size*0.34, y+size*0.18),(x+size*0.34, y+size*0.18),
                (x+size*0.24, y+size*0.68),(x-size*0.24, y+size*0.68)],
               fill=c, outline=o, width=2)
    d.rounded_rectangle([x-size*0.42, y+size*0.08, x+size*0.42, y+size*0.26],
                               radius=3, fill=c, outline=o, width=2)
    d.arc([x-size*0.82, y+size*0.20, x-size*0.28, y+size*0.66],
            -0.5, 2.5, fill=o, width=2)
    d.arc([x+size*0.28, y+size*0.20, x+size*0.82, y+size*0.66],
            0.6, 3.6, fill=o, width=2)
    d.rounded_rectangle([x-size*0.40, y+size*0.66, x+size*0.40, y+size*0.82],
                               radius=2, fill=c, outline=o, width=2)
    d.rounded_rectangle([x-size*0.52, y+size*0.82, x+size*0.52, y+size*0.96],
                               radius=2, fill=c, outline=o, width=2)

def ctext(d, cx, y, text, fill, f, anchor='mm'):
    """Draw centered text, fallback gracefully"""
    try:
        d.text((cx, y), text, fill=fill, font=f, anchor=anchor)
        bb = d.textbbox((cx, y), text, font=f, anchor=anchor)
        return bb[3] + 6
    except Exception as e:
        print(f'Text render error: {e}')
        return y + 30

# ==============================================
#  GENERATE POSTER
# ==============================================
def gen():
    random.seed(42)
    # L0: Background - warm cream
    bg = Image.new('RGBA', (W,H), (255,248,240,255))

    # L1: Atmospheric gradient orbs
    atm = Image.new('RGBA', (W,H), (0,0,0,0))
    ad = ImageDraw.Draw(atm)
    for _ in range(8):
        ox = random.randint(60, W-60)
        oy = random.randint(250, H-200)
        orad = random.randint(160, 320)
        for r in range(orad, 0, -4):
            alpha = int(20 * (1 - r/orad))
            if alpha > 0:
                ad.ellipse([ox-r, oy-r, ox+r, oy+r], fill=(255,159,67, alpha))
    atm = atm.filter(ImageFilter.GaussianBlur(80))
    bg = Image.alpha_composite(bg, atm)

    # L2: Scattered golden dots on bg
    bdl = Image.new('RGBA', (W,H), (0,0,0,0))
    bd = ImageDraw.Draw(bdl)
    dots = [(50,390,6,0.20),(100,1420,4,0.15),(140,1380,9,0.18),
            (W-58,410,5,0.20),(W-108,1440,6,0.15),(W-148,1410,4,0.18),
            (28,720,3,0.12),(W-35,770,4,0.12),(22,950,5,0.10),
            (W-28,920,3,0.10),(65,1120,4,0.08),(W-55,1050,3,0.08),
            (W-88,370,5,0.15),(98,350,4,0.15)]
    for dx,dy,dr,da in dots:
        alpha = int(255 * da)
        bd.ellipse([dx-dr, dy-dr, dx+dr, dy+dr], fill=(255,213,79, alpha))
    bdl = bdl.filter(ImageFilter.GaussianBlur(1))
    bg = Image.alpha_composite(bg, bdl)

    # L3: Coral gradient header
    HDR_H = 330
    hdr = Image.new('RGBA', (W,HDR_H), (0,0,0,0))
    hd = ImageDraw.Draw(hdr)
    for x in range(W):
        t = x / W
        if t < 0.5:
            lt = t*2
            r = int(255*(0.54 + 0.08*lt))
            g = int(255*(0.34 + 0.04*lt))
            b = int(255*(0.40 + 0.08*lt))
        else:
            lt = (t-0.5)*2
            r = int(255*(0.62 + 0.05*lt))
            g = int(255*(0.38 + 0.12*lt))
            b = int(255*(0.48 + 0.18*lt))
        for y in range(HDR_H-1):
            alpha = 255
            if y > HDR_H - 70:
                alpha = int(255 * max(0, 1 - (y - (HDR_H-70))/70))
            hd.point((x,y), fill=(r,g,b, alpha))
    # Decorative circles on header
    for ex,ey,er,ea in [(55,30,90,30),(W-125,42,110,28),(145,228,200,22),
                              (W-145,208,150,25),(35,155,68,20),(W-65,135,75,22)]:
        hd.ellipse([ex,ey,ex+er*2,ey+er*2], fill=(255,255,255,ea))
    hdr = hdr.filter(ImageFilter.GaussianBlur(0.5))
    hdr_full = Image.new('RGBA', (W,H), (0,0,0,0))
    hdr_full.paste(hdr, (0,0))
    bg = Image.alpha_composite(bg, hdr_full)

    # L4: White card with shadow
    CARD_X, CARD_Y, CARD_W, CARD_H = 34, 328, W-68, 1080
    CARD_R = 28
    sh = Image.new('RGBA', (W,H), (0,0,0,0))
    sd = ImageDraw.Draw(sh)
    sd.rounded_rectangle([CARD_X+5, CARD_Y+14, CARD_X+CARD_W+5, CARD_Y+CARD_H+14],
                            radius=CARD_R, fill=(0,0,0,25))
    sh = sh.filter(ImageFilter.GaussianBlur(24))
    bg = Image.alpha_composite(bg, sh)
    card = Image.new('RGBA', (W,H), (0,0,0,0))
    cd = ImageDraw.Draw(card)
    cd.rounded_rectangle([CARD_X, CARD_Y, CARD_X+CARD_W, CARD_Y+CARD_H],
                            radius=CARD_R, fill=(255,255,255,255))
    bg = Image.alpha_composite(bg, card)

    # L5: Card content
    cnt = Image.new('RGBA', (W,H), (0,0,0,0))
    ct = ImageDraw.Draw(cnt)

    # - Celebration elements -
    CY = CARD_Y + 32
    trophy(ct, cx-8, CY, 48)
    star_data = [
        (CARD_X+52, CY+6, 15), (CARD_X+CARD_W-62, CY+4, 13),
        (CARD_X+90, CY+44, 10), (CARD_X+CARD_W-98, CY+42, 11),
        (cx-102, CY, 13), (cx+86, CY+16, 11),
        (CARD_X+145, CY+64, 9), (CARD_X+CARD_W-155, CY+68, 10),
    ]
    for sx,sy,sr in star_data:
        star(ct, sx, sy, sr, (255,213,79,220))
    # Confetti
    random.seed(123)
    ccolors = [(255,138,101),(255,183,77),(255,213,79),(255,159,67),(255,204,128)]
    for i in range(30):
        rx2 = CARD_X + 36 + random.random() * (CARD_W - 72)
        ry2 = CY + 6 + random.random() * 80
        rw2 = 3 + random.random()*10
        rh2 = 10 + random.random()*24
        ang2 = (random.random()-0.5)*60
        conf = Image.new('RGBA', (int(rw2)+8, int(rh2)+8), (0,0,0,0))
        cdf = ImageDraw.Draw(conf)
        a2 = int(120 + random.random()*110)
        cdf.rounded_rectangle([3,3,3+int(rw2),3+int(rh2)], radius=2,
                                fill=(*ccolors[i%5], a2))
        conf = conf.rotate(ang2, expand=True, resample=Image.BICUBIC)
        cnt.paste(conf, (int(rx2-conf.width//2), int(ry2-conf.height//2)), conf)

    # - Text: Restaurant name -
    y = CY + 108
    f1 = font(40)
    y = ctext(ct, cx, y, '大渔铁板烧(海岸城店)', (45,32,24,255), f1)

    # - Address -
    y += 16
    f2 = font(26)
    y = ctext(ct, cx, y, '南山区海德三道  |  日本料理', (102,102,102,255), f2)

    # - Time -
    y += 20
    f3 = font(40)
    y = ctext(ct, cx, y, '时间: 2026-05-10 18:30', (45,32,24,255), f3)

    # - Divider -
    y += 20
    ct.line([(CARD_X+68, y),(CARD_X+CARD_W-68, y)], fill=(237,232,226,255), width=1)
    y += 24

    # - Vote count -
    f4 = font(90)
    y = ctext(ct, cx, y, '8 票', (255,138,101,255), f4)
    y += 8

    # - Support rate -
    f5 = font(24)
    y = ctext(ct, cx, y, '支持率 67%  ·  12人参与', (153,153,153,255), f5)
    y += 20

    # - Progress bar -
    BAR_W = CARD_W - 160
    BAR_X = cx - BAR_W // 2
    BAR_H = 26
    BAR_Y = y
    # Background
    ct.rounded_rectangle([BAR_X, BAR_Y, BAR_X+BAR_W, BAR_Y+BAR_H],
                            radius=13, fill=(240,235,228,255))
    # Gradient fill
    fill_w = int(BAR_W * 0.67)
    for px in range(fill_w):
        t = px / BAR_W
        r = int(255*(0.54 + 0.08*t))
        g = int(255*(0.34 + 0.12*t))
        b = int(255*(0.40 + 0.18*t))
        # Simple fill (no rounded ends for simplicity)
        ct.line([(BAR_X+px, BAR_Y+3),(BAR_X+px, BAR_Y+BAR_H-3)], fill=(r,g,b,255))
    # Percent text
    f6 = font(15)
    y = ctext(ct, BAR_X + fill_w//2, BAR_Y + BAR_H//2, '67%', (255,255,255,255), f6)

    y = BAR_Y + BAR_H + 24

    # - Divider -
    ct.line([(CARD_X+68, y),(CARD_X+CARD_W-68, y)], fill=(237,232,226,255), width=1)
    y += 28

    # - QR code -
    QR_CY = y + 72
    QR_R = 66
    ct.ellipse([cx-QR_R-6, QR_CY-QR_R-6, cx+QR_R+6, QR_CY+QR_R+6],
                outline=(240,235,228,200), width=2)
    ct.ellipse([cx-QR_R, QR_CY-QR_R, cx+QR_R, QR_CY+QR_R],
                fill=(248,245,242,255))
    ct.ellipse([cx-52, QR_CY-52, cx+52, QR_CY+52],
                fill=(224,218,210,255))
    f7 = font(18)
    ctext(ct, cx, QR_CY, '小程序码', (192,186,176,255), f7)
    y_hint = QR_CY + QR_R + 22
    f8 = font(24)
    ctext(ct, cx, y_hint, '长按识别查看详情', (153,153,153,255), f8)

    bg = Image.alpha_composite(bg, cnt)

    # L6: Header text
    ht = Image.new('RGBA', (W,H), (0,0,0,0))
    hd2 = ImageDraw.Draw(ht)
    f9 = font(44)
    ctext(hd2, cx, 90, '聚餐地点已定', (255,255,255,255), f9)
    f10 = font(28)
    ctext(hd2, cx, 152, '周末聚餐大作战', (255,255,255,180), f10)
    bg = Image.alpha_composite(bg, ht)

    # L7: Cat avatar
    av = Image.new('RGBA', (W,H), (0,0,0,0))
    ad2 = ImageDraw.Draw(av)
    AV_CY, AV_R = 306, 54
    # Shadow
    sh2 = Image.new('RGBA', (W,H), (0,0,0,0))
    sd2 = ImageDraw.Draw(sh2)
    sd2.ellipse([cx-AV_R-5, AV_CY-AV_R-3, cx+AV_R+5, AV_CY+AV_R+12], fill=(0,0,0,28))
    sh2 = sh2.filter(ImageFilter.GaussianBlur(12))
    av = Image.alpha_composite(av, sh2)
    ad2.ellipse([cx-AV_R-6, AV_CY-AV_R-6, cx+AV_R+6, AV_CY+AV_R+6], fill=(255,255,255,255))
    ad2.ellipse([cx-AV_R, AV_CY-AV_R, cx+AV_R, AV_CY+AV_R], fill=(240,235,228,255))
    ctext(ad2, cx, AV_CY, '猫头', (192,186,176,255), font(16))
    bg = Image.alpha_composite(bg, av)

    # L8: Footer
    ft = Image.new('RGBA', (W,H), (0,0,0,0))
    fd = ImageDraw.Draw(ft)
    ctext(fd, cx, H-68, '喵了个鱼', (192,186,176,255), font(22))
    ctext(fd, cx, H-40, '一起吃饭，一起快乐', (208,200,190,255), font(20))
    bg = Image.alpha_composite(bg, ft)

    # Save
    final = bg.convert('RGB')
    out = '/Users/ouyangguoqing/Documents/trae_projects/miaolegeyu1/poster_v4_ai_quality.png'
    final.save(out, 'PNG', quality=98)
    print(f'Saved: {out}')
    print(f'Size: {final.size}')
    return out

if __name__ == '__main__':
    gen()
