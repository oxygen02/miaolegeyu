/**
 * 结果分享海报绘制工具
 */

class PosterGenerator {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.width = 750;
    this.height = 1200;
  }

  /**
   * 初始化画布
   * @param {string} canvasId - canvas的id
   * @param {object} context - 组件上下文（可选，在组件中传入this）
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
   * 下载图片到本地
   */
  downloadImage(url) {
    return new Promise((resolve, reject) => {
      if (!url || url.startsWith('/')) {
        // 本地图片直接使用
        resolve(url);
        return;
      }
      wx.downloadFile({
        url,
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.tempFilePath);
          } else {
            reject(new Error('download failed'));
          }
        },
        fail: reject
      });
    });
  }

  /**
   * 绘制圆角矩形
   */
  drawRoundRect(x, y, w, h, r, fillStyle) {
    const ctx = this.ctx;
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
   * 绘制分享海报（带房间号和密码）
   */
  async drawSharePoster(data) {
    const { ctx, width, height } = this;
    const { roomTitle, roomCode, roomPassword, needPassword, roomTime, roomAddress, qrCodeUrl, winner, restaurantImages } = data;

    // 1. 绘制背景（根据是否选定餐厅显示不同背景）
    if (winner && winner.image) {
      // 已选定餐厅 - 使用餐厅图片作为背景
      try {
        const bgImage = await this.downloadImage(winner.image);
        ctx.drawImage(bgImage, 0, 0, width, height);
        // 添加半透明遮罩
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, width, height);
      } catch (e) {
        // 下载失败使用渐变背景
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#FFF8F0');
        gradient.addColorStop(1, '#FFE4CC');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      }
    } else if (restaurantImages && restaurantImages.length > 0) {
      // 未选定餐厅 - 多张餐厅图层叠
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#FFF8F0');
      gradient.addColorStop(1, '#FFE4CC');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      
      // 绘制层叠的餐厅图片
      const imgSize = 200;
      const positions = [
        { x: 50, y: 300, rotate: -15 },
        { x: width - 250, y: 350, rotate: 10 },
        { x: width / 2 - 100, y: 400, rotate: 5 }
      ];
      
      for (let i = 0; i < Math.min(restaurantImages.length, 3); i++) {
        try {
          const img = await this.downloadImage(restaurantImages[i]);
          ctx.save();
          ctx.translate(positions[i].x + imgSize / 2, positions[i].y + imgSize / 2);
          ctx.rotate(positions[i].rotate * Math.PI / 180);
          ctx.drawImage(img, -imgSize / 2, -imgSize / 2, imgSize, imgSize);
          ctx.restore();
        } catch (e) {
          // 忽略下载失败的图片
        }
      }
    } else {
      // 默认渐变背景
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#FFF8F0');
      gradient.addColorStop(1, '#FFE4CC');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    // 2. 绘制顶部装饰条
    const headerGradient = ctx.createLinearGradient(0, 0, width, 180);
    headerGradient.addColorStop(0, '#FFB75E');
    headerGradient.addColorStop(0.5, '#FF9F43');
    headerGradient.addColorStop(1, '#E8913A');
    ctx.fillStyle = headerGradient;
    ctx.fillRect(0, 0, width, 180);

    // 3. 绘制标题
    ctx.font = 'bold 44px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText('一起来投票选餐厅', width / 2, 90);

    // 4. 绘制房间标题
    ctx.font = '28px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillText(roomTitle || '聚餐投票', width / 2, 135);

    // 5. 绘制主卡片背景（半透明白色）
    this.drawRoundRect(40, 200, width - 80, 560, 24, 'rgba(255, 255, 255, 0.95)');

    // 6. 绘制猫头图标（使用图片）
    try {
      const catIcon = await this.downloadImage('https://636c-cloud1-d5ggnf5wh2d872f3c-1423896909.tcb.qcloud.la/decorations/cat-fish-logo.png');
      ctx.save();
      ctx.beginPath();
      ctx.arc(width / 2, 290, 70, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(catIcon, width / 2 - 70, 220, 140, 140);
      ctx.restore();
    } catch (e) {
      // 如果图片下载失败，使用圆形背景+文字
      ctx.fillStyle = '#FFF5E9';
      ctx.beginPath();
      ctx.arc(width / 2, 290, 70, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = 'bold 48px sans-serif';
      ctx.fillStyle = '#FF9F43';
      ctx.fillText('喵', width / 2, 305);
    }

    // 7. 绘制房间号
    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#8A8A8A';
    ctx.fillText('房间号', width / 2, 400);
    
    ctx.font = 'bold 64px sans-serif';
    ctx.fillStyle = '#3D3D3D';
    ctx.fillText(roomCode || '000000', width / 2, 470);

    // 8. 绘制密码（如果需要）
    let currentY = 510;
    if (needPassword && roomPassword) {
      // 密码背景
      ctx.fillStyle = '#FFF5E9';
      this.drawRoundRect(120, currentY, width - 240, 80, 12, '#FFF5E9');
      
      ctx.font = '22px sans-serif';
      ctx.fillStyle = '#FF9F43';
      ctx.fillText('房间密码', width / 2, currentY + 32);
      
      ctx.font = 'bold 40px sans-serif';
      ctx.fillStyle = '#FF9F43';
      ctx.fillText(roomPassword, width / 2, currentY + 68);
      
      currentY += 100;
    }

    // 9. 绘制时间地点（使用文字标签+内容）
    ctx.font = '22px sans-serif';
    ctx.fillStyle = '#8A8A8A';
    const timeText = roomTime && roomTime !== '待定' ? roomTime : '时间待定';
    const addressText = roomAddress && roomAddress !== '待定' ? roomAddress : '地点待定';
    
    // 时间
    ctx.fillText('时间', width / 2, currentY + 25);
    ctx.font = 'bold 26px sans-serif';
    ctx.fillStyle = '#3D3D3D';
    ctx.fillText(timeText, width / 2, currentY + 55);
    
    // 地点
    currentY += 70;
    ctx.font = '22px sans-serif';
    ctx.fillStyle = '#8A8A8A';
    ctx.fillText('地点', width / 2, currentY + 25);
    ctx.font = 'bold 26px sans-serif';
    ctx.fillStyle = '#3D3D3D';
    ctx.fillText(addressText, width / 2, currentY + 55);

    // 10. 绘制小程序码
    const qrY = height - 280;
    // 小程序码背景圆
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(width / 2, qrY, 90, 0, Math.PI * 2);
    ctx.fill();
    
    // 绘制小程序码图片
    if (qrCodeUrl) {
      try {
        const qrImage = await this.downloadImage(qrCodeUrl);
        ctx.save();
        ctx.beginPath();
        ctx.arc(width / 2, qrY, 80, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(qrImage, width / 2 - 80, qrY - 80, 160, 160);
        ctx.restore();
      } catch (e) {
        // 小程序码下载失败，显示占位文字
        ctx.font = '20px sans-serif';
        ctx.fillStyle = '#999999';
        ctx.fillText('小程序码', width / 2, qrY + 8);
      }
    } else {
      // 没有小程序码URL，显示占位
      ctx.font = '20px sans-serif';
      ctx.fillStyle = '#999999';
      ctx.fillText('小程序码', width / 2, qrY + 8);
    }

    // 11. 绘制底部提示
    ctx.font = '22px sans-serif';
    ctx.fillStyle = '#8A8A8A';
    ctx.fillText('长按识别小程序码进入房间', width / 2, height - 140);

    return this.canvas;
  }

  /**
   * 绘制投票结果海报
   */
  async drawResultPoster(data) {
    const { ctx, width, height } = this;
    const { winner, roomTitle, roomTime, roomAddress, participants, isAnonymous } = data;

    // 1. 绘制背景
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#FFF8F0');
    gradient.addColorStop(1, '#FFE4CC');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 2. 绘制顶部装饰
    const headerGradient = ctx.createLinearGradient(0, 0, width, 200);
    headerGradient.addColorStop(0, '#FFB75E');
    headerGradient.addColorStop(0.5, '#FF9F43');
    headerGradient.addColorStop(1, '#E8913A');
    ctx.fillStyle = headerGradient;
    ctx.fillRect(0, 0, width, 280);

    // 3. 绘制标题
    ctx.font = 'bold 48px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText('聚餐地点已定', width / 2, 100);

    // 4. 绘制房间标题
    ctx.font = '32px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText(roomTitle || '聚餐投票', width / 2, 150);

    // 5. 绘制主卡片背景
    this.drawRoundRect(40, 200, width - 80, 720, 24, '#FFFFFF');

    // 6. 绘制餐厅图片
    try {
      const imgPath = await this.downloadImage(winner.image);
      const img = this.canvas.createImage();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imgPath;
      });
      
      // 图片圆角裁剪
      ctx.save();
      this.drawRoundRect(70, 230, width - 140, 320, 16);
      ctx.clip();
      ctx.drawImage(img, 70, 230, width - 140, 320);
      ctx.restore();
    } catch (e) {
      // 图片加载失败时显示占位
      ctx.fillStyle = '#F0F0F0';
      ctx.fillRect(70, 230, width - 140, 320);
      ctx.font = '28px sans-serif';
      ctx.fillStyle = '#999999';
      ctx.textAlign = 'center';
      ctx.fillText('餐厅图片', width / 2, 390);
    }

    // 7. 绘制餐厅名称
    const nameY = this.drawText(
      winner.name,
      70, 580, width - 140, 50, 40, '#3D3D3D', 'center'
    );

    // 8. 绘制地址
    ctx.font = '28px sans-serif';
    ctx.fillStyle = '#8A8A8A';
    ctx.textAlign = 'center';
    ctx.fillText(`${winner.address || roomAddress} · ${winner.category || '美食'}`, width / 2, nameY + 20);

    // 9. 绘制价格标签
    const priceTag = `人均¥${winner.price || '--'}`;
    ctx.font = 'bold 28px sans-serif';
    const priceWidth = ctx.measureText(priceTag).width + 40;
    this.drawRoundRect((width - priceWidth) / 2, nameY + 50, priceWidth, 56, 28, '#FFF5E9');
    ctx.fillStyle = '#FF9F43';
    ctx.fillText(priceTag, width / 2, nameY + 90);

    // 10. 绘制投票结果
    const resultY = nameY + 180;
    ctx.font = 'bold 72px sans-serif';
    ctx.fillStyle = '#FF9F43';
    ctx.fillText(`${winner.voteCount || 0}票`, width / 2, resultY);
    
    ctx.font = '28px sans-serif';
    ctx.fillStyle = '#8A8A8A';
    ctx.fillText(`支持率 ${winner.votePercent || 0}% · ${participants?.length || 0}人参与`, width / 2, resultY + 50);

    // 11. 绘制进度条背景
    const barY = resultY + 80;
    ctx.fillStyle = '#F0F0F0';
    ctx.beginPath();
    ctx.roundRect(100, barY, width - 200, 16, 8);
    ctx.fill();

    // 12. 绘制进度条
    const progress = (winner.votePercent || 0) / 100;
    const gradient2 = ctx.createLinearGradient(100, 0, width - 100, 0);
    gradient2.addColorStop(0, '#FFB347');
    gradient2.addColorStop(1, '#FF9F43');
    ctx.fillStyle = gradient2;
    ctx.beginPath();
    ctx.roundRect(100, barY, (width - 200) * progress, 16, 8);
    ctx.fill();

    // 13. 绘制时间信息
    ctx.font = '26px sans-serif';
    ctx.fillStyle = '#8A8A8A';
    ctx.fillText(`时间: ${roomTime || '待定时间'}`, width / 2, barY + 70);

    // 14. 绘制匿名提示
    if (isAnonymous) {
      ctx.fillStyle = '#F8F4FC';
      ctx.beginPath();
      ctx.roundRect(100, barY + 100, width - 200, 60, 12);
      ctx.fill();
      ctx.font = '24px sans-serif';
      ctx.fillStyle = '#9B59B6';
      ctx.fillText('本次投票为匿名模式', width / 2, barY + 142);
    }

    // 15. 绘制底部提示
    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#BBBBBB';
    ctx.fillText('长按识别小程序码查看详情', width / 2, height - 120);

    // 16. 绘制小程序码占位
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(width / 2, height - 220, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#EEEEEE';
    ctx.lineWidth = 4;
    ctx.stroke();
    
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#999999';
    ctx.fillText('小程序码', width / 2, height - 215);

    return this.canvas;
  }

  /**
   * 生成图片文件
   */
  generateImage() {
    return new Promise((resolve, reject) => {
      wx.canvasToTempFilePath({
        canvas: this.canvas,
        success: (res) => resolve(res.tempFilePath),
        fail: reject
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
