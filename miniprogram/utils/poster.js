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
      juzeAvatar: `${this.CDN}/icons/juze_avatar.png`,
      winkCat: `${this.CDN}/decorations/wink-cat-icon.png`,
    };
  }

  /**
   * 兼容 roundRect - 微信小程序 Canvas roundRect 在某些基础库版本不支持单个数字作为 radius
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   * @param {number|number[]} r - 圆角半径，可以是单个数字或数组
   */
  _roundRect(ctx, x, y, w, h, r) {
    // 将单个数字转换为数组格式以兼容旧版本
    const radius = Array.isArray(r) ? r : [r, r, r, r];
    try {
      ctx.roundRect(x, y, w, h, radius);
    } catch (e) {
      // 如果 roundRect 不支持，使用自定义路径绘制圆角矩形
      const rVal = Array.isArray(r) ? r[0] : r;
      const rv = Math.min(rVal, w / 2, h / 2);
      ctx.moveTo(x + rv, y);
      ctx.arcTo(x + w, y, x + w, y + h, rv);
      ctx.arcTo(x + w, y + h, x, y + h, rv);
      ctx.arcTo(x, y + h, x, y, rv);
      ctx.arcTo(x, y, x + w, y, rv);
      ctx.closePath();
    }
  }

  /**
   * 绘制虚拟小程序码（当真实小程序码生成失败时使用）
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} cx - 中心x坐标
   * @param {number} cy - 中心y坐标
   * @param {number} r - 半径
   */
  _drawVirtualQRCode(ctx, cx, cy, r) {
    const size = r * 2;
    const x = cx - r;
    const y = cy - r;
    const cellSize = size / 7;

    // 白底
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // 绘制二维码样式的网格
    ctx.fillStyle = '#2D2018';

    // 三个定位角（回字形）
    const drawPositionPattern = (px, py) => {
      // 外框 7x7
      ctx.fillRect(px, py, cellSize * 3, cellSize * 3);
      // 内白框 5x5
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(px + cellSize, py + cellSize, cellSize, cellSize);
      // 中心黑点 3x3
      ctx.fillStyle = '#2D2018';
      ctx.fillRect(px + cellSize * 1.2, py + cellSize * 1.2, cellSize * 0.6, cellSize * 0.6);
    };

    // 左上
    drawPositionPattern(x + cellSize * 0.5, y + cellSize * 0.5);
    // 右上
    drawPositionPattern(x + size - cellSize * 3.5, y + cellSize * 0.5);
    // 左下
    drawPositionPattern(x + cellSize * 0.5, y + size - cellSize * 3.5);

    // 随机填充一些数据点
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 7; col++) {
        // 跳过定位角区域
        if ((row < 3 && col < 3) || (row < 3 && col > 3) || (row > 3 && col < 3)) continue;
        if (Math.random() > 0.5) {
          ctx.fillStyle = '#2D2018';
          ctx.fillRect(x + cellSize * col + cellSize * 0.2, y + cellSize * row + cellSize * 0.2, cellSize * 0.6, cellSize * 0.6);
        }
      }
    }

    // 中心绘制小程序图标（简化版）
    ctx.fillStyle = '#07C160';
    ctx.beginPath();
    ctx.arc(cx, cy, cellSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(cx - cellSize * 0.3, cy - cellSize * 0.2, cellSize * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + cellSize * 0.3, cy - cellSize * 0.2, cellSize * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy + cellSize * 0.3, cellSize * 0.3, 0, Math.PI);
    ctx.fill();
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
      console.error('[海报] 图片加载失败:', e.message);
      return null;
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

  // ========== 结果海报 V10 ==========
  async drawResultPoster(data) {
    const { ctx, width, height, canvas } = this;
    const { winner, roomTitle, roomTime, roomAddress, participants, qrCodeUrl, creatorAvatar } = data;
    const cx = width / 2;

    // ==================== 1. 背景 ====================
    ctx.fillStyle = '#FFF5E9';
    ctx.fillRect(0, 0, width, height);

    // ==================== 2. 顶部色带（200px）====================
    const bandH = 200;
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
      { x: 140, y: 140, r: 14 }, { x: width - 120, y: 115, r: 16 },
      { x: cx - 160, y: 65, r: 10 },
    ].forEach(d => {
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();

    // 波浪底边
    ctx.beginPath();
    ctx.moveTo(0, 170);
    ctx.bezierCurveTo(width * 0.15, 150, width * 0.38, 205, cx, 178);
    ctx.bezierCurveTo(width * 0.65, 155, width * 0.85, 200, width, 170);
    ctx.lineTo(width, bandH); ctx.lineTo(0, bandH);
    ctx.closePath(); ctx.fillStyle = grad; ctx.fill();

    // 白色波浪过渡层
    ctx.save(); ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.moveTo(0, 185);
    ctx.bezierCurveTo(width * 0.18, 168, width * 0.42, 215, cx, 190);
    ctx.bezierCurveTo(width * 0.65, 172, width * 0.88, 210, width, 185);
    ctx.lineTo(width, 220); ctx.lineTo(0, 220);
    ctx.closePath(); ctx.fillStyle = '#FFFFFF'; ctx.fill();
    ctx.restore();

    // --- 色带标题 ---
    ctx.font = 'bold 52px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('聚餐地点已定', cx, 80);

    // --- 色带副标题 ---
    ctx.font = '24px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText('喵了个鱼 · 投票结果', cx, 130);

    // ==================== 3. 创建者头像 ====================
    let avatarImg = null;
    if (creatorAvatar) {
      try { avatarImg = await this.loadImage(canvas, creatorAvatar); } catch (e) {}
    }
    if (!avatarImg) {
      try { avatarImg = await this.loadImage(canvas, this.IMAGES.juzeAvatar); } catch (e) {}
    }

    const avatarCY = 235;
    const avatarR = 52;

    // 白底圆+阴影
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.12)';
    ctx.shadowBlur = 16; ctx.shadowOffsetY = 6;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(cx, avatarCY, avatarR + 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // 描边
    ctx.strokeStyle = '#FF8A65';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, avatarCY, avatarR + 5, 0, Math.PI * 2); ctx.stroke();

    // 图片（加载失败时绘制默认猫脸）
    if (avatarImg) {
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, avatarCY, avatarR, 0, Math.PI * 2); ctx.clip();
      ctx.drawImage(avatarImg, cx - avatarR, avatarCY - avatarR, avatarR * 2, avatarR * 2);
      ctx.restore();
    } else {
      this._drawCatIcon(ctx, cx, avatarCY + 2, 22);
    }

    // ==================== 4. 白色大卡片 ====================
    const cardX = 32;
    const cardY = 300;
    const cardW = width - 64;
    const cardH = 820;
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

    let cy = cardY + 55;

    // === 餐厅名 ===
    const shopName = winner?.name || '饭店待定';
    ctx.font = 'bold 44px sans-serif';
    ctx.fillStyle = '#2D2018';
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(shopName, cx, cy);
    cy += 60;

    // === 地址分类 ===
    const category = winner?.category || '美食';
    const addrText = (winner?.address || roomAddress || '地址待定') + ' | ' + category;
    ctx.font = 'bold 28px sans-serif';
    ctx.fillStyle = '#999488';
    ctx.fillText(addrText, cx, cy);
    cy += 55;

    // --- 时间 ---
    ctx.font = 'bold 28px sans-serif';
    ctx.fillStyle = '#2D2018';
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    const timeDisplay = roomTime && roomTime.trim() !== '' && roomTime !== '待定' ? roomTime : '待定';
    ctx.fillText('时间: ' + timeDisplay, cx, cy);
    cy += 55;

    // --- 分隔线 ---
    ctx.fillStyle = '#EDE8E2';
    ctx.fillRect(cardX + 40, cy, cardW - 80, 1.5);
    cy += 45;

    // ==================== 5. 投票数据区 ====================
    const voteCount = winner?.voteCount || 0;
    const percent = winner?.votePercent || 0;
    const pCount = participants?.length || 0;

    // 左侧：票数
    const voteY = cy + 50;
    const numStr = String(voteCount);
    ctx.font = 'bold 80px sans-serif';
    ctx.fillStyle = '#FF8A65';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(numStr, cardX + 40, voteY);
    const numW = ctx.measureText(numStr).width;

    ctx.font = 'bold 28px sans-serif';
    ctx.fillStyle = '#2D2018';
    ctx.fillText('票', cardX + 48 + numW, voteY + 4);

    // 右侧：环形支持率
    const ringX = cardX + cardW - 110;
    const ringR = 45;
    const ringWidth = 8;

    // 背景环
    ctx.beginPath();
    ctx.arc(ringX, voteY, ringR, 0, Math.PI * 2);
    ctx.strokeStyle = '#F0EBE4';
    ctx.lineWidth = ringWidth;
    ctx.stroke();

    // 进度环
    const angle = (percent / 100) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.arc(ringX, voteY, ringR, -Math.PI / 2, angle);
    ctx.strokeStyle = '#FF8A65';
    ctx.lineWidth = ringWidth;
    ctx.lineCap = 'round';
    ctx.stroke();

    // 百分比文字
    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = '#2D2018';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(Math.round(percent) + '%', ringX, voteY);

    cy = voteY + 70;

    // 进度条背景
    const barH = 16;
    const barY = cy;
    this.drawRoundRect(cardX + 40, barY, cardW - 80, barH, barH / 2, '#F0EBE4');

    // 进度条填充
    const fillW = Math.max(barH, (cardW - 80) * (percent / 100));
    this.drawRoundRect(cardX + 40, barY, fillW, barH, barH / 2, '#FF8A65');

    cy += 40;

    // 参与人数
    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#999488';
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(`${pCount} 人参与投票`, cx, cy);
    cy += 50;

    // --- 分隔线 ---
    ctx.fillStyle = '#EDE8E2';
    ctx.fillRect(cardX + 40, cy, cardW - 80, 1.5);
    cy += 40;

    // ==================== 6. 小程序码 ====================
    const qrSize = 140;
    const qrY = cy;
    const qrX = cx - qrSize / 2;

    // 白底圆角矩形背景+阴影
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.06)';
    ctx.shadowBlur = 12; ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#FFFFFF';
    this.drawRoundRect(qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 12, '#FFFFFF');
    ctx.restore();

    // 二维码（方形显示，不裁剪）
    if (qrCodeUrl) {
      try {
        const qrImg = await this.loadImage(canvas, qrCodeUrl);
        if (qrImg) {
          ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
        }
      } catch (e) {}
    } else {
      // 绘制虚拟小程序码
      this._drawVirtualQRCode(ctx, cx, qrY + qrSize / 2, qrSize / 2 - 4);
    }

    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#999488';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('长按识别查看详情', cx, qrY + qrSize + 20);
    cy = qrY + qrSize + 60;

    // ==================== 7. 底部品牌 ====================
    // 分隔线
    ctx.fillStyle = '#EDE8E2';
    ctx.fillRect(cardX + 40, cy, cardW - 80, 1);
    cy += 20;

    const logoSize = 44;
    const logoX = cx - 70;
    const logoY = cy;

    // 尝试加载并绘制Logo图片
    let logoImg = null;
    try { logoImg = await this.loadImage(canvas, this.IMAGES.juzeAvatar); } catch (e) {}

        // 绘制橘色圆角矩形底
    this.drawRoundRect(logoX, logoY, logoSize, logoSize, 10, '#FF8A65');

    if (logoImg) {
      // 在橘色底上绘制头像（缩小一点，露出橘色边框）
      const padding = 3;
      ctx.save();
      this._roundRect(ctx, logoX + padding, logoY + padding, logoSize - padding * 2, logoSize - padding * 2, 8);
      ctx.clip();
      ctx.drawImage(logoImg, logoX + padding, logoY + padding, logoSize - padding * 2, logoSize - padding * 2);
      ctx.restore();
    } else {
      // 降级：绘制猫脸简化图标
      this._drawCatIcon(ctx, logoX + logoSize / 2, logoY + logoSize / 2 + 2, 12);
    }

    // 品牌名
    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = '#2D2018';
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('喵了个鱼', logoX + logoSize + 12, logoY + logoSize / 2 + 4);

    // slogan
    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#999488';
    ctx.fillText('让聚餐不再纠结', logoX + logoSize + 12, logoY + logoSize / 2 + 28);

    return this.canvas;
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
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot * Math.PI / 180);
      ctx.globalAlpha = b.a;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, b.w / 2, b.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  /** 绘制像素点装饰 */
  _drawPixelDots(ctx, cardX, cardY, cardW, cardH) {
    const pixels = [
      { x: cardX + cardW * 0.15, y: cardY + cardH * 0.12, s: 6, c: '#FF8A65' },
      { x: cardX + cardW * 0.85, y: cardY + cardH * 0.08, s: 5, c: '#FFD54F' },
      { x: cardX + cardW * 0.75, y: cardY + cardH * 0.35, s: 7, c: '#FF8A65' },
      { x: cardX + cardW * 0.25, y: cardY + cardH * 0.42, s: 4, c: '#80CBC4' },
      { x: cardX + cardW * 0.92, y: cardY + cardH * 0.55, s: 6, c: '#CE93D8' },
      { x: cardX + cardW * 0.08, y: cardY + cardH * 0.62, s: 5, c: '#FFAB91' },
      { x: cardX + cardW * 0.65, y: cardY + cardH * 0.78, s: 7, c: '#FFD54F' },
      { x: cardX + cardW * 0.35, y: cardY + cardH * 0.88, s: 5, c: '#80CBC4' },
      { x: cardX + cardW * 0.55, y: cardY + cardH * 0.95, s: 4, c: '#FFCC80' },
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
      this._roundRect(ctx, p.x - p.s / 2, p.y - p.s / 2, p.s, p.s, 1);
      ctx.fill();
    });
    ctx.restore();
  }

  // ========== 装饰元素绘制 ==========

  /** 绘制简化猫脸图标（用于降级显示） */
  _drawCatIcon(ctx, x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#FFFFFF';

    // 猫头
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();

    // 耳朵
    ctx.beginPath();
    ctx.moveTo(-size * 0.7, -size * 0.5);
    ctx.lineTo(-size * 0.9, -size * 1.2);
    ctx.lineTo(-size * 0.2, -size * 0.8);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(size * 0.7, -size * 0.5);
    ctx.lineTo(size * 0.9, -size * 1.2);
    ctx.lineTo(size * 0.2, -size * 0.8);
    ctx.closePath();
    ctx.fill();

    // 眼睛
    ctx.fillStyle = '#2D2018';
    ctx.beginPath();
    ctx.arc(-size * 0.35, -size * 0.15, size * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(size * 0.35, -size * 0.15, size * 0.12, 0, Math.PI * 2);
    ctx.fill();

    // 鼻子
    ctx.fillStyle = '#FF8A65';
    ctx.beginPath();
    ctx.arc(0, size * 0.1, size * 0.08, 0, Math.PI * 2);
    ctx.fill();

    // 嘴巴
    ctx.strokeStyle = '#2D2018';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, size * 0.18);
    ctx.quadraticCurveTo(-size * 0.2, size * 0.4, -size * 0.35, size * 0.25);
    ctx.moveTo(0, size * 0.18);
    ctx.quadraticCurveTo(size * 0.2, size * 0.4, size * 0.35, size * 0.25);
    ctx.stroke();

    ctx.restore();
  }

  /** 绘制奖杯图标 */
  _drawTrophy(ctx, x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#FFD54F';
    ctx.strokeStyle = '#FFA726';
    ctx.lineWidth = 2;

    // 杯身
    ctx.beginPath();
    ctx.moveTo(-size * 0.25, -size * 0.35);
    ctx.lineTo(size * 0.25, -size * 0.35);
    ctx.lineTo(size * 0.35, size * 0.2);
    ctx.lineTo(-size * 0.35, size * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 杯顶椭圆（简化为矩形）
    ctx.fillStyle = '#FFD54F';
    ctx.beginPath();
    this._roundRect(ctx, x - size * 0.4, y + size * 0.1, size * 0.8, size * 0.15, 3);
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
    this._roundRect(ctx, x - size * 0.4, y + size * 0.65, size * 0.8, size * 0.15, 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    this._roundRect(ctx, x - size * 0.5, y + size * 0.8, size, size * 0.12, 2);
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
      const angle = (i * 4 * Math.PI / 5) - Math.PI / 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ========== 图片导出 ==========

  async generateImage() {
    return new Promise((resolve, reject) => {
      wx.canvasToTempFilePath({
        canvas: this.canvas,
        success: (res) => resolve(res.tempFilePath),
        fail: reject
      });
    });
  }

  async saveToAlbum(filePath) {
    return new Promise((resolve, reject) => {
      wx.saveImageToPhotosAlbum({
        filePath,
        success: resolve,
        fail: (err) => {
          if (err.errMsg.includes('auth deny') || err.errMsg.includes('authorize')) {
            wx.showModal({
              title: '需要授权',
              content: '请允许保存图片到相册',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  wx.openSetting({
                    success: (settingRes) => {
                      if (settingRes.authSetting['scope.writePhotosAlbum']) {
                        wx.saveImageToPhotosAlbum({ filePath, success: resolve, fail: reject });
                      } else {
                        reject(new Error('用户未授权'));
                      }
                    }
                  });
                } else {
                  reject(new Error('用户取消授权'));
                }
              }
            });
          } else {
            reject(err);
          }
        }
      });
    });
  }
}

module.exports = PosterGenerator;
