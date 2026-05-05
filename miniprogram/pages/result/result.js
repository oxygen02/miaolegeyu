const { imagePaths } = require('../../config/imageConfig');
const audioManager = require('../../utils/audioManager');

Page({
  data: {
    roomId: '',
    room: {},
    loading: true,
    isCreator: false,
    voteStats: null, // 投票统计结果
    imagePaths: imagePaths,
    platformAppIds: {
      meituan: 'wxde8ac0a21135c07d',
      dianping: 'wxc0d6fdfa1c166f6c',
      jd: 'wx91d27dbf599dff74'
    }
  },

  onLoad(options) {
    const { roomId } = options;
    this.setData({ roomId });
    this.loadRoomData();
  },

  onShow() {
    if (this.data.roomId) {
      this.loadRoomData();
    }
  },

  async loadRoomData() {
    try {
      this.setData({ loading: true });

      const { result } = await wx.cloud.callFunction({
        name: 'getRoom',
        data: { roomId: this.data.roomId }
      });

      if (result.code !== 0) {
        throw new Error(result.msg);
      }

      const room = result.data;

      // 获取投票统计（Mode B 需要）
      let voteStats = null;
      if (room.mode === 'b' && room.status === 'locked') {
        const statsResult = await wx.cloud.callFunction({
          name: 'countVotes',
          data: { roomId: this.data.roomId }
        });
        if (statsResult.result.code === 0) {
          voteStats = statsResult.result.data;
        }
      }

      this.setData({
        room,
        isCreator: room.isCreator,
        voteStats,
        loading: false
      });

      // 结果页加载完成，播放轻柔喵叫
      if (room.status === 'locked') {
        audioManager.playMeowSoft();
      }
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({ title: err.message || '加载失败', icon: 'none' });
    }
  },

  // 预览海报
  previewPoster() {
    const finalPoster = this.data.room.finalPoster;
    if (finalPoster && finalPoster.imageUrl) {
      wx.previewImage({
        urls: [finalPoster.imageUrl],
        current: finalPoster.imageUrl
      });
    }
  },

  // 跳转到平台小程序
  goToPlatform() {
    const { room, platformAppIds } = this.data;
    const platform = room.finalPoster?.platformSource || room.platform;
    
    if (!platform || !platformAppIds[platform]) {
      wx.showToast({ title: '未知平台', icon: 'none' });
      return;
    }

    const appId = platformAppIds[platform];
    
    wx.navigateToMiniProgram({
      appId,
      path: 'pages/index/index',
      extraData: { from: 'miaolegeyu' },
      success: () => {
        console.log('跳转成功');
      },
      fail: (err) => {
        console.log('跳转失败', err);
        wx.showToast({ title: '跳转失败，请手动打开', icon: 'none' });
      }
    });
  },

  // 复制地址
  copyAddress() {
    const address = this.data.room.finalPoster?.address;
    if (address) {
      wx.setClipboardData({
        data: address,
        success: () => {
          wx.showToast({ title: '地址已复制', icon: 'success' });
        }
      });
    }
  },

  // 导航去店
  openNavigation() {
    const address = this.data.room.finalPoster?.address;
    if (!address) {
      wx.showToast({ title: '暂无地址信息', icon: 'none' });
      return;
    }

    wx.showActionSheet({
      itemList: ['使用高德地图', '使用腾讯地图'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 高德地图
          wx.navigateTo({
            url: `plugin://chooseLocation/index?key=YOUR_AMAP_KEY&referer=miaolegeyu&location=${JSON.stringify({})}&address=${address}`
          });
        } else {
          // 腾讯地图
          wx.openLocation({
            address,
            scale: 18
          });
        }
      }
    });
  },

  // 返回首页
  goHome() {
    wx.switchTab({ url: '/pages/index/index' });
  },

// 去结算
goSettlement() {
wx.navigateTo({
url: `/pages/settlement/settlement?roomId=${this.data.roomId}`
});
},

// 跳转到推荐餐厅页面
goRecommendRestaurant() {
const { roomId, voteStats } = this.data;
const topMatch = voteStats.bestMatches[0];
const cuisineType = `${topMatch.categoryName}-${topMatch.subCategoryName}`;
wx.navigateTo({
url: `/pages/recommend-restaurant/recommend-restaurant?roomId=${roomId}&cuisineType=${encodeURIComponent(cuisineType)}`
});
},

  // 添加到手机日历
  addToCalendar() {
    const { room } = this.data;
    const poster = room.finalPoster;

    if (!poster || !poster.time) {
      wx.showToast({ title: '暂无时间信息', icon: 'none' });
      return;
    }

    // 解析时间字符串，支持多种格式
    const timeStr = poster.time;
    const dateInfo = this.parseTimeString(timeStr);

    if (!dateInfo.startTime) {
      wx.showToast({ title: '时间格式无法识别', icon: 'none' });
      return;
    }

    // 构建日历事件数据
    const eventData = {
      title: room.title || '聚餐',
      startTime: dateInfo.startTime,
      endTime: dateInfo.endTime,
      location: poster.address || '',
      description: `聚餐地点：${poster.name || ''}\n地址：${poster.address || ''}\n来自：喵了个鱼小程序`,
      alarmOffset: 3600 // 提前1小时提醒
    };

    // 调用系统日历 API
    wx.addPhoneCalendar({
      ...eventData,
      success: () => {
        wx.showToast({ title: '已添加到日历', icon: 'success' });
      },
      fail: (err) => {
        console.error('添加日历失败:', err);
        // 如果系统 API 失败，提供备选方案
        this.showCalendarFallback(eventData);
      }
    });
  },

  // 解析时间字符串
  parseTimeString(timeStr) {
    const now = new Date();
    let startTime = '';
    let endTime = '';

    // 尝试匹配 "MM月DD日 HH:MM" 格式
    const pattern1 = /(\d{1,2})月(\d{1,2})日\s*(\d{1,2}):(\d{2})/;
    // 尝试匹配 "YYYY-MM-DD HH:MM" 格式
    const pattern2 = /(\d{4})-(\d{2})-(\d{2})\s*(\d{2}):(\d{2})/;
    // 尝试匹配 "今天/明天 HH:MM" 格式
    const pattern3 = /(今天|明天)\s*(\d{1,2}):(\d{2})/;
    // 尝试匹配纯时间 "HH:MM"
    const pattern4 = /(\d{1,2}):(\d{2})/;

    let match;
    let year = now.getFullYear();
    let month, day, hour, minute;

    if ((match = timeStr.match(pattern1))) {
      month = parseInt(match[1]) - 1;
      day = parseInt(match[2]);
      hour = parseInt(match[3]);
      minute = parseInt(match[4]);
    } else if ((match = timeStr.match(pattern2))) {
      year = parseInt(match[1]);
      month = parseInt(match[2]) - 1;
      day = parseInt(match[3]);
      hour = parseInt(match[4]);
      minute = parseInt(match[5]);
    } else if ((match = timeStr.match(pattern3))) {
      const offset = match[1] === '明天' ? 1 : 0;
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + offset);
      year = targetDate.getFullYear();
      month = targetDate.getMonth();
      day = targetDate.getDate();
      hour = parseInt(match[2]);
      minute = parseInt(match[3]);
    } else if ((match = timeStr.match(pattern4))) {
      // 只有时间，使用今天日期
      month = now.getMonth();
      day = now.getDate();
      hour = parseInt(match[1]);
      minute = parseInt(match[2]);

      // 如果时间已过，假设是明天
      if (hour < now.getHours() || (hour === now.getHours() && minute <= now.getMinutes())) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        year = tomorrow.getFullYear();
        month = tomorrow.getMonth();
        day = tomorrow.getDate();
      }
    } else {
      return { startTime: '', endTime: '' };
    }

    // 构建开始时间
    const startDate = new Date(year, month, day, hour, minute);
    startTime = this.formatCalendarTime(startDate);

    // 默认聚餐时长2小时
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
    endTime = this.formatCalendarTime(endDate);

    return { startTime, endTime };
  },

  // 格式化为日历 API 需要的格式：YYYY-MM-DD HH:MM:SS（使用本地时间）
  formatCalendarTime(date) {
    const pad = (n) => n < 10 ? '0' + n : n;
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
  },

  // 备选方案：当系统日历 API 失败时，提供复制功能
  showCalendarFallback(eventData) {
    const { title, startTime, location, description } = eventData;
    const text = `📅 ${title}\n🕐 ${startTime}\n📍 ${location}\n\n${description}`;

    wx.showModal({
      title: '手动添加到日历',
      content: '系统日历添加失败，您可以复制以下信息手动添加：',
      confirmText: '复制信息',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.setClipboardData({
            data: text,
            success: () => {
              wx.showToast({ title: '已复制，请粘贴到日历', icon: 'success' });
            }
          });
        }
      }
    });
  },

  // 生成分享签名（简单的安全验证）
  generateShareSign(roomId) {
    // 使用房间ID和时间戳生成简单签名
    const timestamp = Date.now();
    // 注意：实际项目中应该使用更复杂的签名算法，这里简化处理
    const sign = `${roomId}_${timestamp}`;
    return { sign, timestamp };
  },

  // 生成小程序码
  async generateQRCodeForPoster() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'generateQRCode',
        data: {
          scene: `roomId=${this.data.roomId}`,
          page: 'pages/vote/vote',
          width: 280
        }
      });
      if (result.code === 0 && result.data) {
        return result.data;
      }
    } catch (err) {
      console.error('生成小程序码失败:', err);
    }
    return '';
  },

  // 生成分享海报（西部通缉令风格 - 严格按照用户规格）
  async generatePoster() {
    try {
      wx.showLoading({ title: '生成海报中...' });

      const { room, voteStats } = this.data;
      const posterData = {
        title: room.title || '神秘聚餐',
        date: room.activityDate || '',
        time: room.activityTime || '',
        location: room.location?.name || room.location || '待定',
        restaurantName: room.finalPoster?.name || room.shopName || '饭店待定',
        roomName: room.finalPoster?.roomName || '',
        mode: room.mode,
        bestMatch: voteStats?.bestMatches?.[0] || null,
        totalVoters: voteStats?.totalVoters || 0
      };

      // 并行获取：云存储图片临时URL + 小程序码
      const cloudImages = [
        imagePaths.misc.juzeAvatar,
        imagePaths.banners.posterBg
      ];
      let tempUrls = {};
      let qrCodeUrl = '';
      try {
        const [{ result: urlResult }, qrResult] = await Promise.all([
          wx.cloud.callFunction({
            name: 'getTempFileURL',
            data: { fileList: cloudImages }
          }),
          this.generateQRCodeForPoster()
        ]);
        qrCodeUrl = qrResult;
        if (urlResult.code === 0 && urlResult.fileList) {
          urlResult.fileList.forEach((item, index) => {
            if (item.tempFileURL) {
              tempUrls[cloudImages[index]] = item.tempFileURL;
            }
          });
        }
      } catch (err) {
        console.error('获取资源失败:', err);
      }

      // 创建离屏画布
      const query = wx.createSelectorQuery();
      query.select('#posterCanvas')
        .fields({ node: true, size: true })
        .exec(async (res) => {
          if (!res[0]) {
            this.showPosterPreview(posterData);
            return;
          }

          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');
          const dpr = wx.getSystemInfoSync().pixelRatio;

          canvas.width = 750 * dpr;
          canvas.height = 1200 * dpr;
          ctx.scale(dpr, dpr);

          // ========== 1. 绘制海报底板（使用 juze_avatar 作为背景图） ==========
          const bgUrl = tempUrls[imagePaths.misc.juzeAvatar];
          const bgImg = bgUrl ? await this.loadImage(canvas, bgUrl) : null;
          if (bgImg) {
            // 保持比例覆盖整个画布
            const imgRatio = bgImg.width / bgImg.height;
            const canvasRatio = 750 / 1200;
            let drawW, drawH, drawX, drawY;
            if (imgRatio > canvasRatio) {
              drawH = 1200;
              drawW = drawH * imgRatio;
              drawX = (750 - drawW) / 2;
              drawY = 0;
            } else {
              drawW = 750;
              drawH = drawW / imgRatio;
              drawX = 0;
              drawY = (1200 - drawH) / 2;
            }
            ctx.drawImage(bgImg, drawX, drawY, drawW, drawH);
            // 添加半透明遮罩，使文字更清晰
            ctx.fillStyle = 'rgba(255, 248, 240, 0.75)';
            ctx.fillRect(0, 0, 750, 1200);
          } else {
            // 底图加载失败，使用牛皮纸色背景
            ctx.fillStyle = '#D4A574';
            ctx.fillRect(0, 0, 750, 1200);
          }

          // ========== 2. 绘制橘猫头像（居中，400x400像素区域） ==========
          const catUrl = tempUrls[imagePaths.misc.juzeAvatar];
          const catImg = catUrl ? await this.loadImage(canvas, catUrl) : null;
          if (catImg) {
            // 深棕色矩形框背景
            ctx.fillStyle = '#3D2914';
            ctx.fillRect(175, 200, 400, 400);
            // 绘制橘猫头像
            ctx.drawImage(catImg, 175, 200, 400, 400);
          }

          // ========== 3. 文字绘制（严格按照用户规格） ==========
          // 1) 固定标题：YOU ARE WANTED（最顶部，距离顶部80px，海报最大字号）
          ctx.fillStyle = '#2C1810'; // 深棕色
          ctx.font = 'bold 72px "PingFang SC"'; // 西部复古粗体，最大字号
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          this.drawStrokeText(ctx, 'YOU ARE WANTED', 375, 80, 600, 1);

          // 2) 聚餐标题（橘猫头像框正下方，距离顶部650px，猫下方40px空白）
          ctx.fillStyle = '#2C1810';
          ctx.font = 'bold 48px "PingFang SC"'; // 仅次于顶部标题
          this.drawStrokeText(ctx, posterData.title.toUpperCase(), 375, 650, 525, 2);

          // 3) 饭店名称（聚餐标题正下方，距离顶部750px）
          ctx.fillStyle = '#2C1810';
          ctx.font = 'bold 40px "PingFang SC"';
          this.drawStrokeText(ctx, posterData.restaurantName.toUpperCase(), 375, 750, 450, 2);

          // 4) 时间 + 地点（横向并排，距离顶部820px，左右分布，中间100px空白）
          // 聚餐时间（左，距离左侧100px）
          ctx.fillStyle = '#5D3A1A'; // 稍浅的深褐色
          ctx.font = 'bold 28px "PingFang SC"'; // 简洁无衬线
          ctx.textAlign = 'left';
          const timeText = posterData.date && posterData.time
            ? `${posterData.date} ${posterData.time}`
            : '时间待定';
          this.drawStrokeText(ctx, timeText, 100, 820, 250, 1, 'left');

          // 聚餐地点（右，距离右侧100px）
          ctx.font = 'bold 28px "PingFang SC"';
          ctx.textAlign = 'right';
          const locationText = posterData.location || '地点待定';
          this.drawStrokeText(ctx, locationText, 650, 820, 250, 1, 'right');

          // 5) 备注信息（时间地点正下方，距离顶部900px）
          ctx.textAlign = 'center';
          
          // 小标题 DETAILS
          ctx.fillStyle = '#2C1810';
          ctx.font = 'bold 26px "PingFang SC"';
          this.drawStrokeText(ctx, 'DETAILS', 375, 900, 500, 1);

          // 具体备注内容（包间信息或最佳匹配）
          ctx.fillStyle = '#5D3A1A';
          ctx.font = '22px "PingFang SC"';
          let detailsText = '';
          if (posterData.roomName) {
            detailsText = `包间：${posterData.roomName}`;
          } else if (posterData.bestMatch) {
            const matchType = posterData.bestMatch.matchType === 'perfect' ? '完美匹配' : '部分匹配';
            detailsText = `${posterData.bestMatch.categoryName}·${posterData.bestMatch.subCategoryName} · ${posterData.bestMatch.voterCount}人${matchType}`;
          } else {
            detailsText = '来自喵了个鱼小程序';
          }
          this.drawStrokeText(ctx, detailsText, 375, 940, 525, 2);

          // ========== 6. 绘制小程序码 ==========
          const qrY = 1120;
          if (qrCodeUrl) {
            try {
              const qrImg = await this.loadImage(canvas, qrCodeUrl);
              if (qrImg) {
                ctx.save();
                // 白色圆形背景
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                ctx.arc(375, qrY, 70, 0, Math.PI * 2);
                ctx.fill();
                // 裁剪圆形绘制小程序码
                ctx.beginPath();
                ctx.arc(375, qrY, 60, 0, Math.PI * 2);
                ctx.clip();
                ctx.drawImage(qrImg, 375 - 60, qrY - 60, 120, 120);
                ctx.restore();
              }
            } catch (e) {
              console.error('小程序码绘制失败:', e);
            }
          }

          // ========== 7. 底部提示文字 ==========
          ctx.save();
          ctx.font = '20px "PingFang SC"';
          ctx.fillStyle = '#8A8A8A';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText('长按识别小程序码进入投票', 375, 1200);
          ctx.restore();

          // ========== 8. 保存图片 ==========
          setTimeout(() => {
            wx.canvasToTempFilePath({
              canvas: canvas,
              x: 0,
              y: 0,
              width: 750,
              height: 1200,
              destWidth: 750 * dpr,
              destHeight: 1200 * dpr,
              fileType: 'png',
              quality: 1,
              success: (res) => {
                wx.hideLoading();
                wx.previewImage({
                  urls: [res.tempFilePath],
                  current: res.tempFilePath
                });
              },
              fail: (err) => {
                console.error('生成海报失败:', err);
                wx.hideLoading();
                this.showPosterPreview(posterData);
              }
            });
          }, 800);
        });
    } catch (err) {
      console.error('生成海报失败:', err);
      wx.hideLoading();
      wx.showToast({ title: '生成海报失败', icon: 'none' });
    }
  },

  // 加载图片（返回 Promise）
  loadImage(canvas, src) {
    return new Promise((resolve) => {
      const img = canvas.createImage();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  },

  // 绘制带描边的文字（支持多行+超长省略）
  drawStrokeText(ctx, text, x, y, maxWidth, maxLines = 1, align = 'center') {
    const chars = String(text).split('');
    let line = '';
    let lines = [];

    // 先计算所有行
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

    // 如果超出最大行数，最后一行加省略号
    if (chars.length > line.length && lines.length >= maxLines) {
      const lastLine = lines[lines.length - 1];
      if (lastLine.length > 3) {
        lines[lines.length - 1] = lastLine.slice(0, -3) + '...';
      }
    }

    // 设置对齐方式
    ctx.textAlign = align;
    ctx.textBaseline = 'top';

    // 绘制每一行（先描边再填充）
    const lineHeight = parseInt(ctx.font) * 1.4;
    lines.forEach((lineText, index) => {
      const lineY = y + index * lineHeight;
      // 白色描边
      ctx.strokeStyle = 'rgba(255, 248, 240, 0.95)';
      ctx.lineWidth = 5;
      ctx.strokeText(lineText, x, lineY);
      // 填充文字
      ctx.fillText(lineText, x, lineY);
    });
  },

  // 简单的海报预览（备用方案）
  showPosterPreview(posterData) {
    const text = `🍽️ ${posterData.title}\n📅 ${posterData.date} ${posterData.time}\n📍 ${posterData.location}\n\n🎯 最佳匹配：${posterData.bestMatch?.categoryName || ''} · ${posterData.bestMatch?.subCategoryName || ''}\n\n—— 来自喵了个鱼小程序 ——`;

    wx.showModal({
      title: '聚餐结果',
      content: text,
      confirmText: '复制分享',
      success: (res) => {
        if (res.confirm) {
          wx.setClipboardData({
            data: text,
            success: () => wx.showToast({ title: '已复制', icon: 'success' })
          });
        }
      }
    });
  },

  // 分享
  onShareAppMessage() {
    const { room, roomId } = this.data;
    const { sign, timestamp } = this.generateShareSign(roomId);

    return {
      title: `【${room.title}】投票结果出炉！`,
      path: `/pages/result/result?roomId=${roomId}&sign=${sign}&t=${timestamp}`,
      imageUrl: room.finalPoster?.imageUrl || ''
    };
  }
});
