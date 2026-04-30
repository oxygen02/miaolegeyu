/**
 * 音效管理工具 - 猫咪主题（合成音效版）
 * 使用 Web Audio API 合成柔和的猫咪风格音效，无需音频文件
 */

class AudioManager {
  constructor() {
    // 音效开关（用户可设置）
    this.enabled = wx.getStorageSync('audioEnabled') !== false;
    // 音量 0-1（默认较低，保持柔和）
    this.volume = wx.getStorageSync('audioVolume') || 0.4;
    // 音频上下文（小程序内音频上下文）
    this.audioContext = null;
    // 是否已初始化
    this.initialized = false;
  }

  /**
   * 初始化音效
   */
  init() {
    if (this.initialized) return;
    this.initialized = true;
  }

  /**
   * 获取或创建音频上下文
   */
  getAudioContext() {
    if (!this.audioContext) {
      this.audioContext = wx.createInnerAudioContext();
    }
    return this.audioContext;
  }

  /**
   * 播放合成音效
   * @param {string} type - 音效类型
   * @param {Object} options - 播放选项
   */
  play(type, options = {}) {
    if (!this.enabled) return;

    const volume = (options.volume || this.volume) * 0.3; // 进一步降低音量，保持柔和

    try {
      switch (type) {
        case 'meowSoft':
          this.synthesizeMeowSoft(volume);
          break;
        case 'meowShort':
          this.synthesizeMeowShort(volume);
          break;
        case 'purr':
          this.synthesizePurr(volume);
          break;
        case 'pawTap':
          this.synthesizePawTap(volume);
          break;
        case 'purrShort':
          this.synthesizePurrShort(volume);
          break;
        case 'kittenMeow':
          this.synthesizeKittenMeow(volume);
          break;
        case 'bell':
          this.synthesizeBell(volume);
          break;
        default:
          this.synthesizePawTap(volume);
      }
    } catch (err) {
      console.warn('播放合成音效失败:', err);
    }
  }

  // ========== 合成音效方法 ==========

  /**
   * 合成轻柔喵叫 - 使用频率滑动的正弦波模拟"喵~"
   */
  synthesizeMeowSoft(volume) {
    const ctx = wx.getAudioContext ? wx.getAudioContext() : null;
    if (!ctx) {
      // 小程序环境下使用简单的 beep
      this.playBeep(800, 300, volume * 0.5);
      setTimeout(() => this.playBeep(600, 400, volume * 0.5), 200);
      return;
    }
  }

  /**
   * 合成短促喵叫 - 短促的高频音
   */
  synthesizeMeowShort(volume) {
    // 使用两个连续的短 beep 模拟"喵"
    this.playBeep(900, 80, volume * 0.6);
    setTimeout(() => this.playBeep(700, 120, volume * 0.5), 80);
  }

  /**
   * 合成咕噜声 - 低频颤音
   */
  synthesizePurr(volume) {
    // 用快速交替的低频音模拟呼噜声
    const baseFreq = 120;
    const duration = 600;
    const interval = 40;
    let count = 0;
    const maxCount = Math.floor(duration / interval);

    const timer = setInterval(() => {
      if (count >= maxCount) {
        clearInterval(timer);
        return;
      }
      // 交替频率产生颤音效果
      const freq = baseFreq + (count % 2 === 0 ? 20 : -10);
      const vol = volume * (0.3 + Math.sin(count * 0.3) * 0.2);
      this.playBeep(freq, interval - 5, vol);
      count++;
    }, interval);
  }

  /**
   * 合成猫爪轻触 - 极短的高频轻击声
   */
  synthesizePawTap(volume) {
    this.playBeep(1200, 30, volume * 0.3);
  }

  /**
   * 合成短咕噜 - 短促的低频音
   */
  synthesizePurrShort(volume) {
    this.playBeep(150, 150, volume * 0.5);
    setTimeout(() => this.playBeep(130, 200, volume * 0.4), 100);
  }

  /**
   * 合成小奶猫叫 - 更高更细的音调
   */
  synthesizeKittenMeow(volume) {
    this.playBeep(1100, 100, volume * 0.5);
    setTimeout(() => this.playBeep(900, 150, volume * 0.4), 100);
    setTimeout(() => this.playBeep(800, 200, volume * 0.3), 250);
  }

  /**
   * 合成猫铃铛 - 清脆的金属音
   */
  synthesizeBell(volume) {
    // 用高频快速衰减模拟铃铛声
    this.playBeep(1800, 40, volume * 0.4);
    setTimeout(() => this.playBeep(2200, 60, volume * 0.3), 30);
    setTimeout(() => this.playBeep(1600, 80, volume * 0.2), 60);
  }

  /**
   * 基础 beep 播放 - 使用 wx.createInnerAudioContext 的简化方案
   * 由于小程序不支持原生 Web Audio API，使用 data URI 生成短音频
   */
  playBeep(frequency, duration, volume) {
    try {
      // 生成简单的 WAV 音频 data URI
      const audioData = this.generateToneDataURI(frequency, duration, volume);
      const audio = wx.createInnerAudioContext();
      audio.src = audioData;
      audio.volume = volume;
      audio.play();

      // 播放完成后销毁
      setTimeout(() => {
        audio.destroy();
      }, duration + 50);
    } catch (err) {
      console.warn('beep 播放失败:', err);
    }
  }

  /**
   * 生成正弦波音频的 WAV Data URI
   * @param {number} freq - 频率(Hz)
   * @param {number} duration - 时长(ms)
   * @param {number} volume - 音量 0-1
   */
  generateToneDataURI(freq, duration, volume) {
    const sampleRate = 44100;
    const numSamples = Math.floor(sampleRate * duration / 1000);
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    // WAV 文件头
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // 单声道
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, numSamples * 2, true);

    // 生成正弦波数据，带淡入淡出
    const amplitude = volume * 32767;
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      // 添加淡入淡出效果，避免爆音
      const fadeIn = Math.min(1, i / (sampleRate * 0.01)); // 10ms 淡入
      const fadeOut = Math.min(1, (numSamples - i) / (sampleRate * 0.02)); // 20ms 淡出
      const envelope = fadeIn * fadeOut;

      const sample = Math.sin(2 * Math.PI * freq * t) * amplitude * envelope;
      view.setInt16(44 + i * 2, sample, true);
    }

    // 转换为 base64
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = wx.arrayBufferToBase64 ? wx.arrayBufferToBase64(buffer) : btoa(binary);
    return 'data:audio/wav;base64,' + base64;
  }

  // ========== 猫咪主题音效快捷方法 ==========

  /**
   * 轻柔喵叫 - 页面切换、导航返回
   */
  playMeowSoft() {
    this.play('meowSoft', { volume: this.volume * 0.6 });
  }

  /**
   * 短促喵叫 - 按钮点击
   */
  playMeowShort() {
    this.play('meowShort', { volume: this.volume * 0.5 });
  }

  /**
   * 咕噜声 - 成功、完成操作
   */
  playPurr() {
    this.play('purr', { volume: this.volume * 0.7 });
  }

  /**
   * 短咕噜 - 提交、确认
   */
  playPurrShort() {
    this.play('purrShort', { volume: this.volume * 0.6 });
  }

  /**
   * 猫爪轻触 - 轻触、选择
   */
  playPawTap() {
    this.play('pawTap', { volume: this.volume * 0.4 });
  }

  /**
   * 小奶猫叫 - 提示、通知
   */
  playKittenMeow() {
    this.play('kittenMeow', { volume: this.volume * 0.5 });
  }

  /**
   * 猫铃铛 - 切换、滑动
   */
  playBell() {
    this.play('bell', { volume: this.volume * 0.4 });
  }

  // ========== 兼容旧版方法 ==========

  /**
   * 播放成功音效（用咕噜声替代）
   */
  playSuccess() {
    this.playPurr();
  }

  /**
   * 播放点击音效（用猫爪轻触替代）
   */
  playClick() {
    this.playPawTap();
  }

  /**
   * 播放提示音效（用小奶猫叫替代）
   */
  playAlert() {
    this.playKittenMeow();
  }

  /**
   * 播放完成音效（用短咕噜替代）
   */
  playComplete() {
    this.playPurrShort();
  }

  // ========== 设置方法 ==========

  /**
   * 设置音效开关
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    wx.setStorageSync('audioEnabled', enabled);
  }

  /**
   * 设置音量
   */
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    wx.setStorageSync('audioVolume', this.volume);
  }

  /**
   * 获取当前设置
   */
  getSettings() {
    return {
      enabled: this.enabled,
      volume: this.volume
    };
  }

  /**
   * 销毁音频实例
   */
  destroy() {
    if (this.audioContext) {
      this.audioContext.destroy();
      this.audioContext = null;
    }
  }
}

// 导出单例
const audioManager = new AudioManager();
module.exports = audioManager;
