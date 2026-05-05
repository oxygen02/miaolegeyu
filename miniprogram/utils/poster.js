/**
 * 结果分享海报绘制工具
 */

class PosterGenerator {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.width = 750;
    this.height = 960;
  }

  /**
   * 初始化画布
   */
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
          
          // 设置画布尺寸（考虑设备像素比）
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

  /**
   * 加载图片（双保险：优先 createImage，失败则 downloadFile）
   */
  async loadImage(canvas, src) {
    if (!src || src.startsWith('/')) {
      return src;
    }

    console.log('[海报 loadImage] 开始加载:', src);

    // 方案1: Canvas createImage
    try {
      const img = canvas.createImage();
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('timeout')), 10000);
        img.onload = () => { clearTimeout(timeout); resolve(); };
        img.onerror = (e) => { clearTimeout(timeout); reject(e); };
        img.src = src;
      });
      console.log('[海报 loadImage] createImage 成功:', src);
      return img;
    } catch (e) {
      console.warn('[海报 loadImage] createImage 失败:', e.message, '尝试 downloadFile');
    }

    // 方案2: wx.downloadFile + createImage from local path
    try {
      const dlRes = await new Promise((resolve, reject) => {
        wx.downloadFile({
          url: src,
          success: (res) => {
            if (res.statusCode === 200) {
              resolve(res.tempFilePath);
            } else {
              reject(new Error(`HTTP ${res.statusCode}`));
            }
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
      console.log('[海报 loadImage] downloadFile+createImage 成功:', src);
      return img;
    } catch (e2) {
      console.error('[海报 loadImage] 全部加载方式均失败:', e2.message);
      return null;
    }
  }

  /**
   * 绘制圆角矩形
   */
  drawRoundRect(x, y, w, h, r, fillStyle) {
    const ctx = this.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    if (fillStyle) {
      ctx.fillStyle = fillStyle;
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * 绘制文字（自动换行）
   */
  drawText(text, x, y, maxWidth, lineHeight, fontSize, color, align = 'left') {
    const ctx = this.ctx;
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    
    const chars = text.split('');
    let line = '';
    let lineY = y;
    
    for (let i = 0; i < chars.length; i++) {
      const testLine = line + chars[i];
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && i > 0) {
        ctx.fillText(line, x, lineY);
        line = chars[i];
        lineY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, lineY);
    return lineY + lineHeight;
  }

  /**
   * 绘制带描边的文字（支持多行+超长省略）
   */
  drawStrokeText(ctx, text, x, y, maxWidth, maxLines = 1, align = 'center') {
    const chars = String(text).split('');
    let line = '';
    let lines = [];

    for (let i = 0; i < chars.length; i++) {
      const testLine = line + chars[i];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && line !== '') {
        lines.push(line);
        line = chars[i];
        if (lines.length >= maxLines) break;
      } else {
        line = testLine;
      }
    }

    if (lines.length < maxLines) {
      lines.push(line);
    }

    if (chars.length > line.length && lines.length >= maxLines) {
      const lastLine = lines[lines.length - 1];
      if (lastLine.length > 3) {
        lines[lines.length - 1] = lastLine.slice(0, -3) + '...';
      }
    }

    ctx.textAlign = align;
    ctx.textBaseline = 'top';

    const lineHeight = parseInt(ctx.font) * 1.4;
    lines.forEach((lineText, index) => {
      const lineY = y + index * lineHeight;
      ctx.strokeStyle = 'rgba(255, 248, 240, 0.95)';
      ctx.lineWidth = 5;
      ctx.strokeText(lineText, x, lineY);
      ctx.fillText(lineText, x, lineY);
    });
  }

  /**
   * 绘制分享海报（带房间号和密码）
   */
  async drawSharePoster(data) {
    const { ctx, width, height, canvas } = this;
    const { roomTitle, roomCode, roomPassword, needPassword, roomTime, roomAddress, qrCodeUrl, winner, restaurantImages } = data;

    console.log('[海报] ========== 开始绘制分享海报 ==========');
    console.log('[海报] 数据:', JSON.stringify({ roomTitle, roomCode, roomTime, roomAddress }));

    // 1. 绘制背景
    console.log('[海报] 步骤1: 绘制背景图...');
    try {
      const bgImg = await this.loadImage(canvas, 'https://636c-cloud1-d5ggnf5wh2d872f3c-1423896909.tcb.qcloud.la/decorations/juze_avatar.png');
      if (bgImg && typeof bgImg === 'object') {
        const scale = Math.max(width / bgImg.width, height / bgImg.height);
        const drawW = bgImg.width * scale;
        const drawH = bgImg.height * scale;
        const drawX = (width - drawW) / 2;
        const drawY = (height - drawH) / 2;
        ctx.drawImage(bgImg, drawX, drawY, drawW, drawH);
        ctx.fillStyle = 'rgba(255, 248, 240, 0.88)';
        ctx.fillRect(0, 0, width, height);
        console.log('[海报] 背景图绘制成功');
      } else {
        throw new Error('背景图对象无效');
      }
    } catch (e) {
      console.error('[海报] 背景图加载失败，使用渐变备用:', e.message);
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#FFF8F0');
      gradient.addColorStop(1, '#FFE4CC');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    // 2. 绘制顶部装饰条
    console.log('[海报] 步骤2: 绘制顶部装饰...');
    const headerGradient = ctx.createLinearGradient(0, 0, width, 160);
    headerGradient.addColorStop(0, '#FFB75E');
    headerGradient.addColorStop(0.5, '#FF9F43');
    headerGradient.addColorStop(1, '#E8913A');
    ctx.fillStyle = headerGradient;
    ctx.fillRect(0, 0, width, 160);

    // 3. 绘制标题
    ctx.font = 'bold 40px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('一起来投票选餐厅', width / 2, 80);

    // 4. 绘制房间标题
    ctx.font = '26px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillText(roomTitle || '聚餐投票', width / 2, 120);

    // 5. 绘制主卡片背景
    console.log('[海报] 步骤3: 绘制主卡片...');
    this.drawRoundRect(40, 180, width - 80, 500, 24, 'rgba(255, 255, 255, 0.95)');

    // 6. 绘制猫头图标
    console.log('[海报] 步骤4: 绘制猫头图标...');
    try {
      const catIcon = await this.loadImage(canvas, 'https://636c-cloud1-d5ggnf5wh2d872f3c-1423896909.tcb.qcloud.la/decorations/cat-fish-logo.png');
      if (catIcon && typeof catIcon === 'object') {
        ctx.save();
        ctx.beginPath();
        ctx.arc(width / 2, 260, 60, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(catIcon, width / 2 - 60, 200, 120, 120);
        ctx.restore();
        console.log('[海报] 猫头图标绘制成功');
      } else {
        throw new Error('猫头图标对象无效');
      }
    } catch (e) {
      console.warn('[海报] 猫头图标加载失败，使用文字替代:', e.message);
      ctx.fillStyle = '#FFF5E9';
      ctx.beginPath();
      ctx.arc(width / 2, 260, 60, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = 'bold 40px sans-serif';
      ctx.fillStyle = '#FF9F43';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('喵', width / 2, 265);
    }

    // 7. 绘制房间号
    console.log('[海报] 步骤5: 绘制房间号...');
    ctx.save();
    ctx.font = '22px sans-serif';
    ctx.fillStyle = '#8A8A8A';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('房间号', width / 2, 350);
    
    ctx.font = 'bold 56px sans-serif';
    ctx.fillStyle = '#3D3D3D';
    ctx.fillText(roomCode || '000000', width / 2, 410);
    ctx.restore();

    // 8. 绘制密码
    let currentY = 440;
    if (needPassword && roomPassword) {
      ctx.save();
      this.drawRoundRect(120, currentY, width - 240, 70, 12, '#FFF5E9');
      ctx.font = '20px sans-serif';
      ctx.fillStyle = '#FF9F43';
      ctx.textAlign = 'center';
      ctx.fillText('房间密码', width / 2, currentY + 28);
      ctx.font = 'bold 36px sans-serif';
      ctx.fillStyle = '#FF9F43';
      ctx.fillText(roomPassword, width / 2, currentY + 58);
      ctx.restore();
      currentY += 90;
    }

    // 9. 绘制时间地点
    console.log('[海报] 步骤6: 绘制时间地点...');
    ctx.save();
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#8A8A8A';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const timeText = roomTime && roomTime !== '待定' ? roomTime : '时间待定';
    const addressText = roomAddress && roomAddress !== '待定' ? roomAddress : '地点待定';
    
    ctx.fillText('时间', width / 2, currentY + 22);
    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = '#3D3D3D';
    ctx.fillText(timeText, width / 2, currentY + 52);
    
    currentY += 70;
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#8A8A8A';
    ctx.fillText('地点', width / 2, currentY + 22);
    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = '#3D3D3D';
    ctx.fillText(addressText, width / 2, currentY + 52);
    ctx.restore();

    // 10. 绘制小程序码
    console.log('[海报] 步骤7: 绘制小程序码...');
    const qrY = height - 200;
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(width / 2, qrY, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    if (qrCodeUrl) {
      try {
        const qrImage = await this.loadImage(canvas, qrCodeUrl);
        if (qrImage && typeof qrImage === 'object') {
          ctx.save();
          ctx.beginPath();
          ctx.arc(width / 2, qrY, 60, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(qrImage, width / 2 - 60, qrY - 60, 120, 120);
          ctx.restore();
          console.log('[海报] 小程序码绘制成功');
        }
      } catch (e) {
        console.error('[海报] 小程序码绘制失败:', e.message);
      }
    }

    // 11. 底部提示
    ctx.save();
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#8A8A8A';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('长按识别小程序码进入投票', width / 2, height - 110);
    ctx.restore();

    console.log('[海报] ========== 分享海报绘制完成 ==========');
    return this.canvas;
  }

  /**
   * 绘制投票结果海报
   */
  async drawResultPoster(data) {
    const { ctx, width, height, canvas } = this;
    const { winner, roomTitle, roomTime, roomAddress, participants, isAnonymous, mode, finalPoster } = data;

    console.log('[海报] ========== 开始绘制结果海报 ==========');
    console.log('[海报] 数据:', JSON.stringify({ 
      mode: mode || 'a',
      winnerName: winner?.name, 
      winnerImage: winner?.image,
      finalPosterImage: finalPoster?.imageUrl,
      roomTitle 
    }));

    // 1. 绘制背景
    console.log('[海报] 步骤1: 绘制背景图...');
    try {
      const bgImg = await this.loadImage(canvas, 'https://636c-cloud1-d5ggnf5wh2d872f3c-1423896909.tcb.qcloud.la/decorations/juze_avatar.png');
      if (bgImg && typeof bgImg === 'object') {
        const scale = Math.max(width / bgImg.width, height / bgImg.height);
        const drawW = bgImg.width * scale;
        const drawH = bgImg.height * scale;
        const drawX = (width - drawW) / 2;
        const drawY = (height - drawH) / 2;
        ctx.drawImage(bgImg, drawX, drawY, drawW, drawH);
        ctx.fillStyle = 'rgba(255, 248, 240, 0.88)';
        ctx.fillRect(0, 0, width, height);
        console.log('[海报] 背景图绘制成功');
      } else {
        throw new Error('背景图对象无效');
      }
    } catch (e) {
      console.error('[海报] 背景图加载失败，使用渐变备用:', e.message);
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#FFF8F0');
      gradient.addColorStop(1, '#FFE4CC');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    // 2. 绘制顶部装饰
    console.log('[海报] 步骤2: 绘制顶部装饰...');
    const headerGradient = ctx.createLinearGradient(0, 0, width, 280);
    headerGradient.addColorStop(0, '#FFB75E');
    headerGradient.addColorStop(0.5, '#FF9F43');
    headerGradient.addColorStop(1, '#E8913A');
    ctx.fillStyle = headerGradient;
    ctx.fillRect(0, 0, width, 280);

    // 3. 绘制标题
    ctx.font = 'bold 48px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('聚餐地点已定', width / 2, 100);

    // 4. 绘制房间标题
    ctx.font = '32px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText(roomTitle || '聚餐投票', width / 2, 150);

    // 5. 绘制主卡片背景
    console.log('[海报] 步骤3: 绘制主卡片...');
    this.drawRoundRect(40, 200, width - 80, 720, 24, '#FFFFFF');

    // 6. 绘制餐厅图片（根据模式区分）
    console.log('[海报] 步骤4: 绘制餐厅图片, mode=', mode || ', winner.image=', winner?.image, ', finalPoster.imageUrl=', finalPoster?.imageUrl);
    
    // 确定图片来源：
    // - 模式A（pick_for_them/a）：用户上传了图片，优先使用 finalPoster.imageUrl（用户选中的主图），其次用 winner.image
    // - 模式B（b）：用户没有上传图片，使用 taiyaki-icon.png 占位图
    const isModeB = mode === 'b';
    let imageToDraw = null;

    if (isModeB) {
      // 模式B：直接使用占位图
      imageToDraw = 'https://636c-cloud1-d5ggnf5wh2d872f3c-1423896909.tcb.qcloud.la/banners/taiyaki-icon.png';
      console.log('[海报] 模式B，使用taiyaki-icon.png作为卡片图片');
    } else {
      // 模式A：使用用户上传的主图（finalPoster.imageUrl > winner.image）
      imageToDraw = finalPoster?.imageUrl || winner?.image || null;
      console.log('[海报] 模式A，使用用户主图:', imageToDraw);
    }

    try {
      if (imageToDraw) {
        const img = await this.loadImage(canvas, imageToDraw);
        if (img && typeof img === 'object') {
          ctx.save();
          this.drawRoundRect(70, 230, width - 140, 320, 16);
          ctx.clip();
          ctx.drawImage(img, 70, 230, width - 140, 320);
          ctx.restore();
          console.log('[海报] 餐厅图片绘制成功, src=', imageToDraw);
        } else {
          throw new Error('图片对象为null');
        }
      } else {
        throw new Error('无图片URL');
      }
    } catch (e) {
      console.error('[海报] 餐厅图片加载失败，使用taiyaki-icon.png作为备选:', e.message);
      try {
        const defaultImg = await this.loadImage(canvas, 'https://636c-cloud1-d5ggnf5wh2d872f3c-1423896909.tcb.qcloud.la/banners/taiyaki-icon.png');
        if (defaultImg && typeof defaultImg === 'object') {
          ctx.save();
          this.drawRoundRect(70, 230, width - 140, 320, 16);
          ctx.clip();
          ctx.drawImage(defaultImg, 70, 230, width - 140, 320);
          ctx.restore();
          console.log('[海报] 默认图片(taiyaki-icon)绘制成功');
        } else {
          throw new Error('默认图片也无效');
        }
      } catch (e2) {
        console.error('[海报] 默认图片也失败:', e2.message);
        ctx.fillStyle = '#F0F0F0';
        ctx.fillRect(70, 230, width - 140, 320);
        ctx.font = '28px sans-serif';
        ctx.fillStyle = '#999999';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(winner?.name || '餐厅信息', width / 2, 390);
      }
    }

    // 7. 绘制餐厅名称
    console.log('[海报] 步骤5: 绘制餐厅名称...');
    const nameY = this.drawText(
      winner?.name || '未知餐厅',
      70, 580, width - 140, 50, 40, '#3D3D3D', 'center'
    );

    // 8. 绘制地址
    ctx.font = '28px sans-serif';
    ctx.fillStyle = '#8A8A8A';
    ctx.textAlign = 'center';
    ctx.fillText(`${winner?.address || roomAddress || ''} · ${winner?.category || '美食'}`, width / 2, nameY + 20);

    // 9. 绘制价格标签
    const priceTag = `人均¥${winner?.price || '--'}`;
    ctx.font = 'bold 28px sans-serif';
    const priceWidth = ctx.measureText(priceTag).width + 40;
    this.drawRoundRect((width - priceWidth) / 2, nameY + 50, priceWidth, 56, 28, '#FFF5E9');
    ctx.fillStyle = '#FF9F43';
    ctx.fillText(priceTag, width / 2, nameY + 90);

    // 10. 绘制投票结果
    console.log('[海报] 步骤6: 绘制投票结果...');
    const resultY = nameY + 180;
    ctx.font = 'bold 72px sans-serif';
    ctx.fillStyle = '#FF9F43';
    ctx.textAlign = 'center';
    ctx.fillText(`${winner?.voteCount || 0}票`, width / 2, resultY);
    
    ctx.font = '28px sans-serif';
    ctx.fillStyle = '#8A8A8A';
    ctx.fillText(`支持率 ${winner?.votePercent || 0}% · ${participants?.length || 0}人参与`, width / 2, resultY + 50);

    // 11. 进度条
    const barY = resultY + 80;
    ctx.fillStyle = '#F0F0F0';
    ctx.beginPath();
    ctx.roundRect(100, barY, width - 200, 16, 8);
    ctx.fill();

    const progress = ((winner?.votePercent || 0)) / 100;
    const gradient2 = ctx.createLinearGradient(100, 0, width - 100, 0);
    gradient2.addColorStop(0, '#FFB347');
    gradient2.addColorStop(1, '#FF9F43');
    ctx.fillStyle = gradient2;
    ctx.beginPath();
    ctx.roundRect(100, barY, (width - 200) * progress, 16, 8);
    ctx.fill();

    // 12. 时间信息
    ctx.font = '26px sans-serif';
    ctx.fillStyle = '#8A8A8A';
    ctx.textAlign = 'center';
    ctx.fillText(`时间: ${roomTime || '待定时间'}`, width / 2, barY + 70);

    // 13. 匿名提示
    if (isAnonymous) {
      ctx.fillStyle = '#F8F4FC';
      ctx.beginPath();
      ctx.roundRect(100, barY + 100, width - 200, 60, 12);
      ctx.fill();
      ctx.font = '24px sans-serif';
      ctx.fillStyle = '#9B59B6';
      ctx.textAlign = 'center';
      ctx.fillText('本次投票为匿名模式', width / 2, barY + 142);
    }

    // 14. 底部提示
    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#BBBBBB';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('长按识别小程序码查看详情', width / 2, height - 120);

    // 15. 小程序码占位
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(width / 2, height - 220, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#EEEEEE';
    ctx.lineWidth = 4;
    ctx.stroke();
    
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#999999';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('小程序码', width / 2, height - 215);

    console.log('[海报] ========== 结果海报绘制完成 ==========');
    return this.canvas;
  }

  /**
   * 生成图片文件
   */
  generateImage() {
    return new Promise((resolve, reject) => {
      const dpr = wx.getSystemInfoSync().pixelRatio;
      console.log('[海报] 导出图片, 尺寸:', this.width, 'x', this.height, ', DPR:', dpr);
      wx.canvasToTempFilePath({
        canvas: this.canvas,
        width: this.width,
        height: this.height,
        destWidth: this.width * dpr,
        destHeight: this.height * dpr,
        fileType: 'png',
        quality: 1,
        success: (res) => {
          console.log('[海报] 导出成功:', res.tempFilePath);
          resolve(res.tempFilePath);
        },
        fail: (err) => {
          console.error('[海报] 导出失败:', err);
          reject(err);
        }
      });
    });
  }

  /**
   * 保存图片到相册
   */
  saveToAlbum(filePath) {
    return new Promise((resolve, reject) => {
      wx.saveImageToPhotosAlbum({
        filePath,
        success: resolve,
        fail: (err) => {
          if (err.errMsg.includes('auth deny')) {
            wx.showModal({
              title: '需要授权',
              content: '开启相册权限后，可将海报保存到手机相册方便分享',
              confirmText: '去开启',
              cancelText: '暂不需要',
              success: (res) => {
                if (res.confirm) {
                  wx.openSetting();
                }
              }
            });
          }
          reject(err);
        }
      });
    });
  }
}

module.exports = PosterGenerator;
