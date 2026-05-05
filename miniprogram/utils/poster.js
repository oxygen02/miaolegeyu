/**
 * 海报绘制工具 V7 - 卡片海报重构
 *
 * 结果海报设计（V7）：
 * - 画布 750x1150
 * - 顶部色带 200px：渐变 + "聚餐地点已定"
 * - 餐厅封面大图 260px：主视觉区，圆角+阴影+底部渐变遮罩+WINNER标签
 * - 信息区：分类标签胶囊 + 地址 + 人均价格
 * - 数据区：80px超大票数 + 环形支持率 + 进度条
 * - 时间胶囊：独立胶囊式时间展示
 * - 小程序码 + 底部品牌
 * - 字体层级：
 *   L0 色带标题 42px bold #FFF
 *   L1 色带副标 22px #FFF 0.75
 *   L2 票数 80px bold #2D2018
 *   L3 餐厅名 26px bold rgba(255,255,255,0.92)（覆盖在图上）
 *   L4 分类标签 18px medium #FF8A65
 *   L5 辅助 20px normal #999488
 *   L6 弱辅助 16px normal #B5AFA5
 * - 配色：珊瑚 #FF8A65 / 橙 #FF9F43 / 金 #FFD54F / 深色 #2D2018
 */

class PosterGenerator {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.width = 750;
    this.height = 1280; // V8: 增加高度避免底部溢出
    this.CDN = 'https://636c-cloud1-d5ggnf5wh2d872f3c-1423896909.tcb.qcloud.la';
    this.IMAGES = {
      catFishLogo: `${this.CDN}/decorations/cat-fish-logo.png`,
      taiyakiIcon: `${this.CDN}/banners/taiyaki-icon.png`,
      juzeAvatar: '/images/juze_avatar.png',
      winkCat: `${this.CDN}/decorations/wink-cat-icon.png`,
    };
  }

  initCanvas(canvasId, context = null) {
    return new Promise((resolve, reject) => {
      const query = context ? context.createSelectorQuery() : wx.createSelectorQuery();
      query.select(`#${canvasId}`)
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res[0]) {
            reject(new Error('canvas not found'));
            return;
          }
          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');
          const dpr = wx.getSystemInfoSync().pixelRatio;
          canvas.width = this.width * dpr;
          canvas.height = this.height * dpr;
          ctx.scale(dpr, dpr);
          this.canvas = canvas;
          this.ctx = ctx;
          resolve({ canvas, ctx });
        });
    });
  }

  async loadImage(canvas, src) {
    if (!src) return null;
    if (src.startsWith('/') || src.startsWith('./') || src.startsWith('../')) {
      try {
        const img = canvas.createImage();
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('timeout')), 10000);
          img.onload = () => { clearTimeout(timeout); resolve(); };
          img.onerror = (e) => { clearTimeout(timeout); reject(e); };
          img.src = src;
        });
        return img;
      } catch (e) { return null; }
    }
    try {
      const img = canvas.createImage();
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('timeout')), 10000);
        img.onload = () => { clearTimeout(timeout); resolve(); };
        img.onerror = (e) => { clearTimeout(timeout); reject(e); };
        img.src = src;
      });
      return img;
    } catch (e) {
      try {
        const dlRes = await new Promise((resolve, reject) => {
          wx.downloadFile({
            url: src,
            success: (res) => {
              if (res.statusCode === 200) resolve(res.tempFilePath);
              else reject(new Error(`HTTP ${res.statusCode}`));
            },
            fail: reject
          });
        });
        const img = canvas.createImage();
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('timeout')), 10000);
          img.onload = () => { clearTimeout(timeout); resolve(); };
          img.onerror = (e) => { clearTimeout(timeout); reject(e); };
          img.src = dlRes;
        });
        return img;
      } catch (e2) {
        console.error('[海报] 图片加载失败:', e2.message);
        return null;
      }
    }
  }

  // ========== 基础绘制方法 ==========

  drawRoundRect(x, y, w, h, r, fillStyle) {
    const ctx = this.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fillStyle) { ctx.fillStyle = fillStyle; ctx.fill(); }
    ctx.restore();
  }

  /** 细线分隔 */
  drawDivider(y, padX) {
    const { ctx, width } = this;
    const lx = padX || 60;
    ctx.fillStyle = '#EDE8E2';
    ctx.fillRect(lx, y, width - lx * 2, 1);
  }

  /** 文字自动换行 + 省略号 */
  drawText(text, x, y, maxWidth, lineHeight, fontSize, color, align, maxLines, weight) {
    const ctx = this.ctx;
    ctx.font = `${weight || 'bold'} ${fontSize}px sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    const chars = String(text).split('');
    const total = chars.length;
    let line = '', lineY = y, lineCount = 0, truncated = false;
    for (let i = 0; i < total; i++) {
      const testLine = line + chars[i];
      if (ctx.measureText(testLine).width > maxWidth && line.length > 0) {
        ctx.fillText(line, x, lineY);
        line = chars[i]; lineY += lineHeight; lineCount++;
        if (lineCount >= maxLines) {
          for (let j = i + 1; j < total; j++) { line += chars[j]; }
          truncated = true; break;
        }
      } else { line = testLine; }
    }
    if (truncated && line.length > 0) {
      while (line.length > 1 && ctx.measureText(line + '...').width > maxWidth) line = line.slice(0, -1);
      ctx.fillText(line + '...', x, lineY);
    } else { ctx.fillText(line, x, lineY); }
    return lineY + lineHeight;
  }

  // ========== 邀请海报 V8 ==========
  /**
   * V8 按设计稿重构：
   * 画布：750x1280
   * 结构：
   *   0-210     珊瑚橙渐变色带 + 波浪底 + 标题
   *   205       猫咪头像（116px直径）
   *   260-      白色大圆角卡片（油画色块+房间号+密码+时间+地点+小程序码+品牌）
   */
  async drawSharePoster(data) {
    const { ctx, width, height, canvas } = this;
    const { roomTitle, roomCode, roomPassword, needPassword, roomTime, roomAddress, qrCodeUrl } = data;
    const cx = width / 2;

    // ==================== 1. 背景 ====================
    ctx.fillStyle = '#FFF5E9';
    ctx.fillRect(0, 0, width, height);

    // ==================== 2. 顶部色带（210px）====================
    const bandH = 210;
    const grad = ctx.createLinearGradient(0, 0, width, 0);
    grad.addColorStop(0, '#FF8A65');
    grad.addColorStop(0.5, '#FF9F43');
    grad.addColorStop(1, '#FFB74D');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, bandH);

    // 色带装饰圆圈
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#FFFFFF';
    [
      { x: 60, y: 45, r: 28 }, { x: width - 70, y: 60, r: 20 },
      { x: 140, y: 160, r: 14 }, { x: width - 120, y: 135, r: 16 },
      { x: cx - 160, y: 85, r: 10 },
    ].forEach(d => {
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();

    // 波浪底边
    ctx.beginPath();
    ctx.moveTo(0, 180);
    ctx.bezierCurveTo(width * 0.15, 160, width * 0.38, 215, cx, 188);
    ctx.bezierCurveTo(width * 0.65, 165, width * 0.85, 210, width, 180);
    ctx.lineTo(width, bandH); ctx.lineTo(0, bandH);
    ctx.closePath(); ctx.fillStyle = grad; ctx.fill();

    // 白色波浪过渡层
    ctx.save(); ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.moveTo(0, 195);
    ctx.bezierCurveTo(width * 0.18, 178, width * 0.42, 225, cx, 200);
    ctx.bezierCurveTo(width * 0.65, 182, width * 0.88, 220, width, 195);
    ctx.lineTo(width, 230); ctx.lineTo(0, 230);
    ctx.closePath(); ctx.fillStyle = '#FFFFFF'; ctx.fill();
    ctx.restore();

    // --- 色带标题 ---
    ctx.font = 'bold 52px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('一起来投票选餐厅', cx, 85);

    // --- 色带副标题 ---
    ctx.font = '22px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText(roomTitle || '喵了个鱼 · 邀请你加入', cx, 135);

    // ==================== 3. 猫咪头像 ====================
    let catLogo = null;
    try { catLogo = await this.loadImage(canvas, this.IMAGES.juzeAvatar); } catch (e) {}
    const avatarCY = 205;
    const avatarR = 58;
    // 白底圆+阴影
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.12)';
    ctx.shadowBlur = 16; ctx.shadowOffsetY = 6;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(cx, avatarCY, avatarR + 6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // 描边
    ctx.strokeStyle = '#FF8A65';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, avatarCY, avatarR + 6, 0, Math.PI * 2); ctx.stroke();
    // 图片（加载失败时绘制默认猫脸）
    if (catLogo) {
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, avatarCY, avatarR, 0, Math.PI * 2); ctx.clip();
      ctx.drawImage(catLogo, cx - avatarR, avatarCY - avatarR, avatarR * 2, avatarR * 2);
      ctx.restore();
    } else {
      this._drawCatIcon(ctx, cx, avatarCY + 2, 22);
    }

    // ==================== 4. 白色大卡片 ====================
    const cardX = 32;
    const cardY = 260;
    const cardW = width - 64;
    const cardH = 880;
    const cardR = 28;

    // 卡片阴影
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.06)';
    ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
    this.drawRoundRect(cardX, cardY, cardW, cardH, cardR, '#FFFFFF');
    ctx.restore();

    // 油画风格背景色块
    this._drawOilPaintBackground(ctx, cx, cardY, cardW, cardH);

    // 像素点装饰
    this._drawPixelDots(ctx, cardX, cardY, cardW, cardH);

    let cy = cardY + 45;

    // === 房间号 ===
    ctx.font = '22px sans-serif';
    ctx.fillStyle = '#999488';
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('房 间 号', cx, cy);
    cy += 18;

    ctx.font = 'bold 80px sans-serif';
    ctx.fillStyle = '#2D2018';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(roomCode || '000000', cx, cy + 40);
    cy += 100;

    // === 密码（可选） ===
    if (needPassword && roomPassword) {
      const pwdText = '密码: ' + roomPassword;
      ctx.font = 'bold 24px sans-serif';
      const pwdW = ctx.measureText(pwdText).width + 48;
      this.drawRoundRect(cx - pwdW / 2, cy, pwdW, 48, 24, '#FFF3E0');
      ctx.fillStyle = '#FF8A65';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(pwdText, cx, cy + 24);
      cy += 65;
    }

    // --- 分隔线 ---
    cy += 8;
    ctx.fillStyle = '#EDE8E2';
    ctx.fillRect(cardX + 40, cy, cardW - 80, 1.5);
    cy += 35;

    // === 时间 ===
    ctx.font = '22px sans-serif';
    ctx.fillStyle = '#999488';
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('时 间', cx, cy);
    cy += 8;
    ctx.font = 'bold 32px sans-serif';
    ctx.fillStyle = '#2D2018';
    const timeText = roomTime && roomTime !== '待定' ? roomTime : '待定';
    ctx.fillText(timeText, cx, cy + 32);
    cy += 75;

    // === 地点 ===
    ctx.font = '22px sans-serif';
    ctx.fillStyle = '#999488';
    ctx.fillText('地 点', cx, cy);
    cy += 8;
    ctx.font = 'bold 32px sans-serif';
    ctx.fillStyle = '#2D2018';
    const addressText = roomAddress && roomAddress !== '待定' ? roomAddress : '待定';
    ctx.fillText(addressText, cx, cy + 32);
    cy += 70;

    // --- 分隔线 ---
    ctx.fillStyle = '#EDE8E2';
    ctx.fillRect(cardX + 40, cy, cardW - 80, 1.5);
    cy += 35;

    // ==================== 5. 小程序码 ====================
    const qrR = 72;
    const qrCY = cy + qrR;
    // 白底圆+阴影
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.06)';
    ctx.shadowBlur = 16; ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(cx, qrCY, qrR, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // 二维码
    if (qrCodeUrl) {
      try {
        const qrImg = await this.loadImage(canvas, qrCodeUrl);
        if (qrImg) {
          ctx.save();
          ctx.beginPath(); ctx.arc(cx, qrCY, qrR - 8, 0, Math.PI * 2); ctx.clip();
          ctx.drawImage(qrImg, cx - qrR + 8, qrCY - qrR + 8, (qrR - 8) * 2, (qrR - 8) * 2);
          ctx.restore();
        }
      } catch (e) {}
    } else {
      ctx.fillStyle = '#F5F0EA';
      ctx.beginPath(); ctx.arc(cx, qrCY, qrR - 8, 0, Math.PI * 2); ctx.fill();
      ctx.font = '16px sans-serif';
      ctx.fillStyle = '#C0BAB0';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('小程序码', cx, qrCY);
    }

    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#999488';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('长按识别加入投票', cx, qrCY + qrR + 18);
    cy = qrCY + qrR + 55;

    // ==================== 6. 底部品牌 ====================
    ctx.fillStyle = '#EDE8E2';
    ctx.fillRect(cardX + 40, cy, cardW - 80, 1);
    cy += 30;

    const logoSize = 44;
    const logoX = cx - 70;
    const logoY = cy;
    // 方形圆角Logo底
    this.drawRoundRect(logoX, logoY, logoSize, logoSize, 10, '#FF8A65');
    // 猫脸简化图标
    this._drawCatIcon(ctx, logoX + logoSize / 2, logoY + logoSize / 2 + 2, 12);

    // 品牌名
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#2D2018';
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('喵了个鱼', logoX + logoSize + 12, logoY + logoSize / 2 + 6);

    // slogan
    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#999488';
    ctx.fillText('让聚餐不再纠结', logoX + logoSize + 12, logoY + logoSize / 2 + 28);

    return this.canvas;
  }

  // ========== 结果海报 V8 ==========
  /**
   * V8 按设计稿重构：
   * 画布：750x1280
   * 结构：
   *   0-210     珊瑚橙渐变色带 + 波浪底 + 标题
   *   205       猫咪头像（116px直径）
   *   260-      白色大圆角卡片（庆祝元素+餐厅名+地址分类+时间+进度条+小程序码+品牌）
   */
  async drawResultPoster(data) {
    const { ctx, width, height, canvas } = this;
    const { winner, roomTitle, roomTime, roomAddress, participants, qrCodeUrl } = data;
    const cx = width / 2;

    // ==================== 1. 背景 ====================
    ctx.fillStyle = '#FFF5E9';
    ctx.fillRect(0, 0, width, height);

    // ==================== 2. 顶部色带（210px）====================
    const bandH = 210;
    const grad = ctx.createLinearGradient(0, 0, width, 0);
    grad.addColorStop(0, '#FF8A65');
    grad.addColorStop(0.5, '#FF9F43');
    grad.addColorStop(1, '#FFB74D');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, bandH);

    // 色带装饰圆圈
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#FFFFFF';
    [
      { x: 60, y: 45, r: 28 }, { x: width - 70, y: 60, r: 20 },
      { x: 140, y: 160, r: 14 }, { x: width - 120, y: 135, r: 16 },
      { x: cx - 160, y: 85, r: 10 },
    ].forEach(d => {
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();

    // 波浪底边
    ctx.beginPath();
    ctx.moveTo(0, 180);
    ctx.bezierCurveTo(width * 0.15, 160, width * 0.38, 215, cx, 188);
    ctx.bezierCurveTo(width * 0.65, 165, width * 0.85, 210, width, 180);
    ctx.lineTo(width, bandH); ctx.lineTo(0, bandH);
    ctx.closePath(); ctx.fillStyle = grad; ctx.fill();

    // 白色波浪过渡层
    ctx.save(); ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.moveTo(0, 195);
    ctx.bezierCurveTo(width * 0.18, 178, width * 0.42, 225, cx, 200);
    ctx.bezierCurveTo(width * 0.65, 182, width * 0.88, 220, width, 195);
    ctx.lineTo(width, 230); ctx.lineTo(0, 230);
    ctx.closePath(); ctx.fillStyle = '#FFFFFF'; ctx.fill();
    ctx.restore();

    // --- 色带标题 ---
    ctx.font = 'bold 52px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('聚餐地点已定', cx, 85);

    // --- 色带副标题 ---
    ctx.font = '22px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText('喵了个鱼 · 投票结果', cx, 135);

    // ==================== 3. 猫咪头像 ====================
    let catLogo = null;
    try { catLogo = await this.loadImage(canvas, this.IMAGES.juzeAvatar); } catch (e) {}
    const avatarCY = 205;
    const avatarR = 58;
    // 白底圆+阴影
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.12)';
    ctx.shadowBlur = 16; ctx.shadowOffsetY = 6;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(cx, avatarCY, avatarR + 6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // 描边
    ctx.strokeStyle = '#FF8A65';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, avatarCY, avatarR + 6, 0, Math.PI * 2); ctx.stroke();
    // 图片（加载失败时绘制默认猫脸）
    if (catLogo) {
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, avatarCY, avatarR, 0, Math.PI * 2); ctx.clip();
      ctx.drawImage(catLogo, cx - avatarR, avatarCY - avatarR, avatarR * 2, avatarR * 2);
      ctx.restore();
    } else {
      this._drawCatIcon(ctx, cx, avatarCY + 2, 22);
    }

    // ==================== 4. 白色大卡片 ====================
    const cardX = 32;
    const cardY = 260;
    const cardW = width - 64;
    const cardH = 880; // 增高避免底部溢出
    const cardR = 28;

    // 卡片阴影
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.06)';
    ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
    this.drawRoundRect(cardX, cardY, cardW, cardH, cardR, '#FFFFFF');
    ctx.restore();

    // 油画风格背景色块 + 像素点
    this._drawOilPaintBackground(ctx, cx, cardY, cardW, cardH);
    this._drawPixelDots(ctx, cardX, cardY, cardW, cardH);

    let cy = cardY + 35;

    // --- 庆祝装饰区（无奖杯） ---
    this._drawCelebrationNoTrophy(ctx, cardX, cy, cardW);
    cy += 50;

    // --- 餐厅名 ---
    ctx.font = 'bold 38px sans-serif';
    ctx.fillStyle = '#2D2018';
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    const restaurantName = winner?.name || '未知餐厅';
    ctx.fillText(restaurantName, cx, cy);
    cy += 50;

    // --- 地址 | 分类 ---
    ctx.font = '22px sans-serif';
    ctx.fillStyle = '#999488';
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    const category = winner?.category || '美食';
    const addrText = (winner?.address || roomAddress || '地址待定') + ' | ' + category;
    ctx.fillText(addrText, cx, cy);
    cy += 48;

    // --- 时间 ---
    ctx.font = 'bold 28px sans-serif';
    ctx.fillStyle = '#2D2018';
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    const timeDisplay = roomTime && roomTime !== '待定' ? roomTime : '待定';
    ctx.fillText('时间: ' + timeDisplay, cx, cy);
    cy += 35;

    // --- 分隔线 ---
    ctx.fillStyle = '#EDE8E2';
    ctx.fillRect(cardX + 40, cy, cardW - 80, 1.5);
    cy += 45;

    // ==================== 5. 投票数据区 ====================
    const voteCount = winner?.voteCount || 0;
    const percent = winner?.votePercent || 0;
    const pCount = participants?.length || 0;

    // 左侧：票数
    const voteY = cy + 55;
    const numStr = String(voteCount);
    ctx.font = 'bold 90px sans-serif';
    ctx.fillStyle = '#FF8A65';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(numStr, cardX + 40, voteY);
    const numW = ctx.measureText(numStr).width;

    ctx.font = 'bold 36px sans-serif';
    ctx.fillStyle = '#2D2018';
    const ticketStr = '票';
    ctx.fillText(ticketStr, cardX + 40 + numW + 10, voteY);
    const ticketW = ctx.measureText(ticketStr).width;

    // 进度条 + 百分比胶囊（自适应票数长度，防止溢出）
    const barH = 28;
    const barY = voteY;
    const capW = 72;
    const capH = 40;
    const leftPad = 40;        // 卡片左内边距
    const rightPad = 40;       // 卡片右内边距
    const ticketGap = 16;      // "票"字与进度条间距
    const barToCapGap = 10;    // 进度条与胶囊间距

    // 计算进度条最大可用宽度
    const usedLeft = leftPad + numW + 10 + ticketW + ticketGap;
    const usedRight = barToCapGap + capW + rightPad;
    const barMaxW = Math.max(barH, cardW - usedLeft - usedRight);
    const barX = cardX + usedLeft;
    const barFillW = barMaxW * (Math.min(percent, 100) / 100);

    // 进度条背景
    this.drawRoundRect(barX, barY - barH / 2, barMaxW, barH, barH / 2, '#F0EBE4');

    // 进度条填充
    if (barFillW > barH && percent > 0) {
      const barGrad = ctx.createLinearGradient(barX, 0, barX + barFillW, 0);
      barGrad.addColorStop(0, '#FF8A65');
      barGrad.addColorStop(1, '#FF7043');
      this.drawRoundRect(barX, barY - barH / 2, barFillW, barH, barH / 2, barGrad);
    }

    // 百分比胶囊
    const capX = barX + barMaxW + barToCapGap;
    const capY = barY - capH / 2;
    this.drawRoundRect(capX, capY, capW, capH, capH / 2, '#FF8A65');
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(percent + '%', capX + capW / 2, capY + capH / 2);

    cy = voteY + 55;

    // --- 支持率说明文字 ---
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#999488';
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('支持率 ' + percent + '% · ' + pCount + '人参与', cx, cy);
    cy += 55;

    // ==================== 6. 小程序码 ====================
    const qrR = 72;
    const qrCY = cy + qrR;
    // 白底圆+阴影
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.06)';
    ctx.shadowBlur = 16; ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(cx, qrCY, qrR, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // 二维码
    if (qrCodeUrl) {
      try {
        const qrImg = await this.loadImage(canvas, qrCodeUrl);
        if (qrImg) {
          ctx.save();
          ctx.beginPath(); ctx.arc(cx, qrCY, qrR - 8, 0, Math.PI * 2); ctx.clip();
          ctx.drawImage(qrImg, cx - qrR + 8, qrCY - qrR + 8, (qrR - 8) * 2, (qrR - 8) * 2);
          ctx.restore();
        }
      } catch (e) {}
    } else {
      ctx.fillStyle = '#F5F0EA';
      ctx.beginPath(); ctx.arc(cx, qrCY, qrR - 8, 0, Math.PI * 2); ctx.fill();
      ctx.font = '16px sans-serif';
      ctx.fillStyle = '#C0BAB0';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('小程序码', cx, qrCY);
    }

    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#999488';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('长按识别查看详情', cx, qrCY + qrR + 18);
    cy = qrCY + qrR + 55;

    // ==================== 7. 底部品牌 ====================
    // 分隔线
    ctx.fillStyle = '#EDE8E2';
    ctx.fillRect(cardX + 40, cy, cardW - 80, 1);
    cy += 30;

    const logoSize = 44;
    const logoX = cx - 70;
    const logoY = cy;
    // 方形圆角Logo底
    this.drawRoundRect(logoX, logoY, logoSize, logoSize, 10, '#FF8A65');
    // 猫脸简化图标
    this._drawCatIcon(ctx, logoX + logoSize / 2, logoY + logoSize / 2 + 2, 12);

    // 品牌名
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#2D2018';
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('喵了个鱼', logoX + logoSize + 12, logoY + logoSize / 2 + 6);

    // slogan
    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#999488';
    ctx.fillText('让聚餐不再纠结', logoX + logoSize + 12, logoY + logoSize / 2 + 28);

    return this.canvas;
  }

  /** 绘制像素点装饰 */
  _drawPixelDots(ctx, cardX, cardY, cardW, cardH) {
    const pixels = [
      { x: cardX + cardW * 0.20, y: cardY + cardH * 0.12, s: 6, c: '#FF8A65' },
      { x: cardX + cardW * 0.82, y: cardY + cardH * 0.30, s: 8, c: '#81D4FA' },
      { x: cardX + cardW * 0.35, y: cardY + cardH * 0.48, s: 6, c: '#FFD54F' },
      { x: cardX + cardW * 0.75, y: cardY + cardH * 0.72, s: 5, c: '#A5D6A7' },
      { x: cardX + cardW * 0.45, y: cardY + cardH * 0.88, s: 7, c: '#FFAB91' },
      { x: cardX + cardW * 0.55, y: cardY + cardH * 0.18, s: 6, c: '#CE93D8' },
      { x: cardX + cardW * 0.08, y: cardY + cardH * 0.65, s: 4, c: '#80CBC4' },
      { x: cardX + cardW * 0.90, y: cardY + cardH * 0.60, s: 6, c: '#FFCC80' },
    ];
    ctx.save();
    pixels.forEach(p => {
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.roundRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s, 1);
      ctx.fill();
    });
    ctx.restore();
  }

  // ========== 油画风背景绘制 ==========

  /** 绘制油画风色块背景（变形椭圆 + 笔触 + 飞白）*/
  _drawOilPaintBackground(ctx, cx, cardY, cardW, cardH) {
    const oilBlobs = [
      { x: cx - 50,  y: cardY + 100, w: 370, h: 135, rot: -13, color: 'rgb(255,138,101)', a: 0.07 },
      { x: cx + 135, y: cardY + 235, w: 310, h: 105, rot: 11,  color: 'rgb(255,213,79)',  a: 0.055 },
      { x: cx - 95,  y: cardY + 380, w: 390, h: 115, rot: -9,  color: 'rgb(255,159,67)',  a: 0.05 },
      { x: cx + 105, y: cardY + 510, w: 330, h: 98,  rot: 8,   color: 'rgb(255,183,77)', a: 0.05 },
      { x: cx - 35,  y: cardY + 630, w: 290, h: 92,  rot: -6,  color: 'rgb(255,138,101)', a: 0.04 },
      { x: cx + 95,  y: cardY + 155, w: 300, h: 115, rot: 9,   color: 'rgb(100,181,246)', a: 0.06 },
      { x: cx - 115, y: cardY + 310, w: 350, h: 100, rot: -10, color: 'rgb(144,202,249)', a: 0.05 },
      { x: cx + 145, y: cardY + 440, w: 310, h: 108, rot: 6,   color: 'rgb(100,181,246)', a: 0.045 },
      { x: cx - 75,  y: cardY + 570, w: 270, h: 88,  rot: -7,  color: 'rgb(144,202,249)', a: 0.045 },
    ];
    oilBlobs.forEach(b => {
      this._drawOilBlob(ctx, b.x, b.y, b.w, b.h, b.rot, b.color, b.a);
    });
    // 笔触 + 飞白
    const brushAreas = [
      { x: cx + 55,  y: cardY + 175, w: 230, h: 95,  rot: 17,  color: 'rgb(255,138,101)', a: 0.03 },
      { x: cx - 75,  y: cardY + 345, w: 210, h: 80,  rot: -13, color: 'rgb(100,181,246)', a: 0.025 },
      { x: cx + 115, y: cardY + 490, w: 190, h: 70,  rot: 10,  color: 'rgb(255,213,79)',  a: 0.02 },
    ];
    brushAreas.forEach(b => {
      this._drawBrushMarks(ctx, b.x, b.y, b.w, b.h, b.rot, b.color, b.a);
      this._drawDryDots(ctx, b.x, b.y, b.w, b.h, b.rot, b.color, b.a * 0.5);
    });
  }

  /** 不规则变形椭圆色块（多层厚涂）*/
  _drawOilBlob(ctx, x, y, w, h, rot, baseColor, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot * Math.PI / 180);
    const rgb = baseColor.match(/\d+/g).map(Number);
    for (let layer = 0; layer < 4; layer++) {
      const a = alpha * (1 - layer * 0.22);
      const ox = (layer - 2) * w * 0.04;
      const oy = (layer - 2) * h * 0.03;
      const rw = w * (1 + layer * 0.03) / 2;
      const rh = h * (1 + layer * 0.02) / 2;
      ctx.save();
      ctx.globalAlpha = Math.max(a, 0.008);
      const r = Math.max(0, Math.min(255, rgb[0] + (layer - 1) * 10));
      const g = Math.max(0, Math.min(255, rgb[1] + (layer - 1) * 8));
      const b = Math.max(0, Math.min(255, rgb[2] + (layer - 1) * 5));
      ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
      ctx.beginPath();
      const steps = 32;
      for (let i = 0; i <= steps; i++) {
        const angle = (i / steps) * Math.PI * 2;
        const deform = 1 + Math.sin(angle * 3 + layer) * 0.10 + Math.cos(angle * 5 + 0.7 + layer) * 0.07;
        const px = ox + Math.cos(angle) * rw * deform;
        const py = oy + Math.sin(angle) * rh * deform;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  /** 弯曲笔触（二次贝塞尔曲线模拟笔刷痕）*/
  _drawBrushMarks(ctx, x, y, w, h, rot, baseColor, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot * Math.PI / 180);
    const rgb = baseColor.match(/\d+/g).map(Number);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < 8; i++) {
      const bx = (Math.random() - 0.5) * w * 0.7;
      const by = (Math.random() - 0.5) * h * 0.5;
      const ex = bx + (Math.random() - 0.4) * w * 0.4;
      const ey = by + (Math.random() - 0.4) * h * 0.3;
      const cpx = (bx + ex) / 2 + (Math.random() - 0.5) * 20;
      const cpy = (by + ey) / 2 + (Math.random() - 0.5) * 14;
      ctx.save();
      ctx.globalAlpha = alpha * (0.35 + Math.random() * 0.65);
      const lr = Math.min(255, rgb[0] + 18 + Math.random() * 22) | 0;
      const lg = Math.min(255, rgb[1] + 18 + Math.random() * 18) | 0;
      const lb = Math.min(255, rgb[2] + 12 + Math.random() * 18) | 0;
      ctx.strokeStyle = 'rgb(' + lr + ',' + lg + ',' + lb + ')';
      ctx.lineWidth = 1 + Math.random() * 3.5;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(cpx, cpy, ex, ey);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  /** 飞白干笔触（小点状纹理）*/
  _drawDryDots(ctx, x, y, w, h, rot, color, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot * Math.PI / 180);
    ctx.globalAlpha = alpha;
    for (let i = 0; i < 14; i++) {
      const dx = (Math.random() - 0.5) * w * 0.75;
      const dy = (Math.random() - 0.5) * h * 0.55;
      const size = 0.8 + Math.random() * 3;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(dx, dy, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

    // ========== 私有绘制方法：庆祝元素 ==========

  /** 绘制简化金色奖杯 */
  _drawTrophy(ctx, x, y, size) {
    ctx.save();
    ctx.fillStyle = '#FFD54F';
    ctx.strokeStyle = '#F9A825';
    ctx.lineWidth = 2;
    // 杯身（梯形）
    ctx.beginPath();
    ctx.moveTo(x - size * 0.35, y + size * 0.2);
    ctx.lineTo(x + size * 0.35, y + size * 0.2);
    ctx.lineTo(x + size * 0.25, y + size * 0.65);
    ctx.lineTo(x - size * 0.25, y + size * 0.65);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // 杯顶椭圆（简化为矩形）
    ctx.fillStyle = '#FFD54F';
    ctx.beginPath();
    ctx.roundRect(x - size * 0.4, y + size * 0.1, size * 0.8, size * 0.15, 3);
    ctx.fill();
    ctx.stroke();
    // 把手（左）
    ctx.beginPath();
    ctx.arc(x - size * 0.55, y + size * 0.4, size * 0.18, -0.5, 0.5 * Math.PI);
    ctx.stroke();
    // 把手（右）
    ctx.beginPath();
    ctx.arc(x + size * 0.55, y + size * 0.4, size * 0.18, Math.PI - 0.5, Math.PI + 0.5);
    ctx.stroke();
    // 底座
    ctx.fillStyle = '#FFD54F';
    ctx.beginPath();
    ctx.roundRect(x - size * 0.4, y + size * 0.65, size * 0.8, size * 0.15, 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(x - size * 0.5, y + size * 0.8, size, size * 0.12, 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  /** 绘制金星 */
  _drawStar(ctx, cx, cy, r, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      // 内凹点
      const innerAngle = angle + Math.PI / 5;
      const ix = cx + r * 0.4 * Math.cos(innerAngle);
      const iy = cy + r * 0.4 * Math.sin(innerAngle);
      ctx.lineTo(ix, iy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /** 绘制庆祝装饰区（星星、彩带、彩点，无奖杯） */
  _drawCelebrationNoTrophy(ctx, cardX, y, cardW) {
    const cx = cardX + cardW / 2;
    // 大星星
    this._drawStar(ctx, cardX + 70, y + 15, 10, '#FFD54F');
    this._drawStar(ctx, cardX + cardW - 65, y + 18, 8, '#FFD54F');
    // 小星星
    this._drawStar(ctx, cardX + 130, y - 2, 5, '#FFE082');
    this._drawStar(ctx, cardX + cardW - 110, y + 30, 4, '#FFE082');
    this._drawStar(ctx, cardX + 50, y + 32, 4, '#FFE082');
    // 彩带（简化为弯曲条带）
    this._drawRibbon(ctx, cardX + 25, y + 25, 18, 8, '#FF8A65', -25);
    this._drawRibbon(ctx, cardX + cardW - 20, y + 22, 14, 6, '#81D4FA', 30);
    this._drawRibbon(ctx, cardX + 45, y + 45, 12, 5, '#FFD54F', -40);
    this._drawRibbon(ctx, cardX + cardW - 40, y + 42, 13, 5, '#FF8A65', 35);
    // 小彩点
    const confetti = [
      { x: cardX + 100, y: y + 38, c: '#81D4FA', r: 3 },
      { x: cardX + cardW - 80, y: y + 10, c: '#FF8A65', r: 2 },
      { x: cardX + 160, y: y + 28, c: '#FFD54F', r: 2 },
      { x: cardX + cardW - 140, y: y + 35, c: '#A5D6A7', r: 3 },
      { x: cardX + 85, y: y + 6, c: '#FFD54F', r: 2 },
      { x: cardX + cardW - 100, y: y + 45, c: '#81D4FA', r: 2 },
    ];
    confetti.forEach(p => {
      ctx.fillStyle = p.c;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    });
  }

  /** 绘制庆祝装饰区（星星、奖杯、彩带、彩点） */
  _drawCelebration(ctx, cardX, y, cardW) {
    const cx = cardX + cardW / 2;
    // 大星星
    this._drawStar(ctx, cardX + 70, y + 25, 14, '#FFD54F');
    this._drawStar(ctx, cardX + cardW - 65, y + 30, 11, '#FFD54F');
    // 小星星
    this._drawStar(ctx, cardX + 130, y - 5, 7, '#FFE082');
    this._drawStar(ctx, cardX + cardW - 110, y + 50, 6, '#FFE082');
    this._drawStar(ctx, cardX + 50, y + 55, 5, '#FFE082');
    // 奖杯
    this._drawTrophy(ctx, cx, y + 30, 55);
    // 彩带（简化为弯曲条带）
    this._drawRibbon(ctx, cardX + 25, y + 40, 22, 10, '#FF8A65', -25);
    this._drawRibbon(ctx, cardX + cardW - 20, y + 35, 18, 8, '#81D4FA', 30);
    this._drawRibbon(ctx, cardX + 45, y + 70, 14, 6, '#FFD54F', -40);
    this._drawRibbon(ctx, cardX + cardW - 40, y + 65, 16, 7, '#FF8A65', 35);
    // 小彩点
    const confetti = [
      { x: cardX + 100, y: y + 60, c: '#81D4FA', r: 4 },
      { x: cardX + cardW - 80, y: y + 15, c: '#FF8A65', r: 3 },
      { x: cardX + 160, y: y + 45, c: '#FFD54F', r: 3 },
      { x: cardX + cardW - 140, y: y + 55, c: '#A5D6A7', r: 4 },
      { x: cardX + 85, y: y + 10, c: '#FFD54F', r: 2 },
      { x: cardX + cardW - 100, y: y + 70, c: '#81D4FA', r: 3 },
    ];
    confetti.forEach(p => {
      ctx.fillStyle = p.c;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    });
  }

  /** 绘制彩带 */
  _drawRibbon(ctx, x, y, w, h, color, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot * Math.PI / 180);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h / 2);
    ctx.quadraticCurveTo(-w / 4, -h, 0, -h / 2);
    ctx.quadraticCurveTo(w / 4, -h, w / 2, -h / 2);
    ctx.lineTo(w / 2, h / 2);
    ctx.quadraticCurveTo(w / 4, h, 0, h / 2);
    ctx.quadraticCurveTo(-w / 4, h, -w / 2, h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /** 绘制底部品牌猫脸简化图标 */
  _drawCatIcon(ctx, cx, cy, r) {
    ctx.save();
    // 脸
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    // 左耳
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.8, cy - r * 0.6);
    ctx.lineTo(cx - r * 1.1, cy - r * 1.4);
    ctx.lineTo(cx - r * 0.3, cy - r * 0.8);
    ctx.closePath(); ctx.fill();
    // 右耳
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.8, cy - r * 0.6);
    ctx.lineTo(cx + r * 1.1, cy - r * 1.4);
    ctx.lineTo(cx + r * 0.3, cy - r * 0.8);
    ctx.closePath(); ctx.fill();
    // 眼睛
    ctx.fillStyle = '#FF8A65';
    ctx.beginPath(); ctx.arc(cx - r * 0.35, cy - r * 0.1, r * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * 0.35, cy - r * 0.1, r * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  generateImage() {
    return new Promise((resolve, reject) => {
      const dpr = wx.getSystemInfoSync().pixelRatio;
      wx.canvasToTempFilePath({
        canvas: this.canvas,
        width: this.width,
        height: this.height,
        destWidth: this.width * dpr,
        destHeight: this.height * dpr,
        fileType: 'png',
        quality: 1,
        success: (res) => resolve(res.tempFilePath),
        fail: (err) => reject(err)
      });
    });
  }

  saveToAlbum(filePath) {
    return new Promise((resolve, reject) => {
      wx.saveImageToPhotosAlbum({
        filePath,
        success: resolve,
        fail: (err) => {
          if (err.errMsg.includes('auth deny')) {
            wx.showModal({
              title: '需要授权',
              content: '开启相册权限后，可将海报保存到手机相册',
              confirmText: '去开启',
              cancelText: '暂不需要',
              success: (res) => { if (res.confirm) wx.openSetting(); }
            });
          }
          reject(err);
        }
      });
    });
  }
}

module.exports = PosterGenerator;
