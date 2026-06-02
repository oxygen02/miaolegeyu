// 弹幕组件 - 简化版：纯CSS动画 + 3条轨道居中
const { checkContentWithToast } = require('../../utils/contentSecurity');

// HTML特殊字符转义表
const HTML_ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

Component({
  properties: {
    visible: { type: Boolean, value: true },
    presetDanmaku: { type: Array, value: [] },
    userAvatar: { type: String, value: '' },
    defaultDuration: { type: Number, value: 8 }
  },

  data: {
    danmakuList: [],
    inputValue: '',
    btnReady: false,
    _internalAvatar: '',
    paused: false,
    autoTimer: null,
    uniqueIdCounter: 0,
    colorPool: ['pink', 'orange', 'blue', 'green', 'purple']
  },

  lifetimes: {
    attached() {
      this._loadAvatar();
      this._startAuto();
    },
    detached() {
      this._stopAuto();
    }
  },

  observers: {
    userAvatar(v) { if (v) this.setData({ _internalAvatar: v }); }
  },

  methods: {
    // ---- 头像加载 ----
    _loadAvatar() {
      if (this.properties.userAvatar) return this.setData({ _internalAvatar: this.properties.userAvatar });
      try {
        const u = wx.getStorageSync('userInfo');
        if (u && u.avatarUrl) return this.setData({ _internalAvatar: u.avatarUrl });
      } catch(e) {}
      const app = getApp();
      if (app?.globalData?.userInfo?.avatarUrl) this.setData({ _internalAvatar: app.globalData.userInfo.avatarUrl });
    },

    // ---- 输入 & 发送 ----
    onInput(e) {
      const val = e.detail.value || '';
      this.setData({
        inputValue: val,
        btnReady: val.trim().length > 0
      });
    },

    async sendDanmaku() {
      const t = this.data.inputValue.trim();
      if (!t) return;
      
      // 内容安全检查
      const isContentSafe = await checkContentWithToast(t);
      if (!isContentSafe) {
        return;
      }
      
      // XSS防护：HTML转义
      const safeText = t.replace(/[&<>"']/g, char => HTML_ESCAPE_MAP[char]);
      
      this._add(safeText, true);
      this.setData({ inputValue: '', btnReady: false });
      this.triggerEvent('send', { text: t });
    },

    // ---- 核心添加弹幕（纯CSS驱动）----
    _add(text, isUser = false) {
      // 限制同时存在的弹幕数量，避免性能问题
      if (this.data.danmakuList.length >= 6) {
        // 移除最旧的弹幕
        const oldest = this.data.danmakuList[0];
        this._remove(oldest.uniqueId);
      }

      const id = `dm_${this.data.uniqueIdCounter++}_${Date.now()}`;
      const dur = 7 + Math.random() * 4; // 7~11秒
      const list = this.data.danmakuList.slice();
      list.push({
        uniqueId: id,
        text,
        trackIndex: Math.floor(Math.random() * 3), // 3条轨道
        show: true,
        duration: dur,
        avatar: isUser ? (this.data._internalAvatar || '') : '',
        color: this.data.colorPool[Math.floor(Math.random() * this.data.colorPool.length)]
      });
      this.setData({ danmakuList: list });

      // 超时自动清理
      setTimeout(() => this._remove(id), (dur + 1.5) * 1000);
    },

    _remove(id) {
      this.setData({
        danmakuList: this.data.danmakuList.filter(d => d.uniqueId !== id)
      });
    },

    onTrackTap() {
      this.setData({ paused: !this.data.paused });
      this.triggerEvent('tappaused', { paused: this.data.paused });
    },
    stopPropagation() {},

    // ---- 自动播放 ----
    _startAuto() {
      if (this.data.autoTimer) return;
      
      // 优先使用云端配置，如果没有则使用本地兜底数据
      const presets = this.properties.presetDanmaku.length > 0
        ? this.properties.presetDanmaku
        : null; // 云端配置优先，null表示需要加载云端
      
      if (presets) {
        this._startAutoWithPresets(presets);
      } else {
        this._loadCloudPresets();
      }
    },

    // 从云端加载预设弹幕
    _loadCloudPresets() {
      // 本地兜底数据（用于云端加载失败时）
      const localPresets = [
        '这家店味道太棒了！👍', '环境不错，推荐推荐~', '性价比很高！！',
        '会再来光顾的 🐟', '服务态度超好 ❤️', '排队也值得！',
        '人均消费很合理', '菜品摆盘精致 ✨', '适合朋友聚会',
        '停车方便 👍', '下次带家人来', '宝藏店铺发现！',
        '辣度刚刚好 🔥', '甜品必点！', '拍照超出片 📸'
      ];

      // 尝试从云端获取弹幕配置
      const app = getApp();
      if (app.globalData.danmakuPresets && app.globalData.danmakuPresets.length > 0) {
        this._startAutoWithPresets(app.globalData.danmakuPresets);
        return;
      }

      // 如果云端配置未加载，延迟尝试一次
      setTimeout(() => {
        const app2 = getApp();
        if (app2.globalData.danmakuPresets && app2.globalData.danmakuPresets.length > 0) {
          this._startAutoWithPresets(app2.globalData.danmakuPresets);
        } else {
          // 使用本地兜底数据
          this._startAutoWithPresets(localPresets);
        }
      }, 500);
    },

    // 使用预设弹幕开始自动播放
    _startAutoWithPresets(presets) {
      let i = 0;
      const next = () => {
        this.data.autoTimer = setTimeout(() => {
          const item = presets[i];
          const text = typeof item === 'string' ? item : (item.text || '');
          this._add(text, false);
          i = (i + 1) % presets.length;
          next();
        }, 2500 + Math.random() * 1500); // 2.5~4秒间隔，避免卡顿
      };
      setTimeout(next, 300);
    },

    _stopAuto() {
      if (this.data.autoTimer) { clearTimeout(this.data.autoTimer); this.data.autoTimer = null; }
    }
  }
});
