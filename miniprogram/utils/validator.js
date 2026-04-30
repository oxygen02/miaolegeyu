/**
 * 输入参数校验工具
 */

const Validator = {
  /**
   * 校验字符串
   * @param {string} value - 待校验值
   * @param {object} options - 校验选项
   * @returns {object} - { valid: boolean, message: string }
   */
  string(value, options = {}) {
    const { required = true, minLength = 0, maxLength = Infinity, pattern = null, fieldName = '字段' } = options;
    
    if (required && (value === undefined || value === null || value === '')) {
      return { valid: false, message: `${fieldName}不能为空` };
    }
    
    if (!required && (value === undefined || value === null || value === '')) {
      return { valid: true, message: '' };
    }
    
    const str = String(value).trim();
    
    if (str.length < minLength) {
      return { valid: false, message: `${fieldName}长度不能少于${minLength}个字符` };
    }
    
    if (str.length > maxLength) {
      return { valid: false, message: `${fieldName}长度不能超过${maxLength}个字符` };
    }
    
    if (pattern && !pattern.test(str)) {
      return { valid: false, message: `${fieldName}格式不正确` };
    }
    
    return { valid: true, message: '' };
  },

  /**
   * 校验数字
   * @param {number} value - 待校验值
   * @param {object} options - 校验选项
   * @returns {object} - { valid: boolean, message: string }
   */
  number(value, options = {}) {
    const { required = true, min = -Infinity, max = Infinity, integer = false, fieldName = '字段' } = options;
    
    if (required && (value === undefined || value === null || value === '')) {
      return { valid: false, message: `${fieldName}不能为空` };
    }
    
    if (!required && (value === undefined || value === null || value === '')) {
      return { valid: true, message: '' };
    }
    
    const num = Number(value);
    
    if (isNaN(num)) {
      return { valid: false, message: `${fieldName}必须是数字` };
    }
    
    if (integer && !Number.isInteger(num)) {
      return { valid: false, message: `${fieldName}必须是整数` };
    }
    
    if (num < min) {
      return { valid: false, message: `${fieldName}不能小于${min}` };
    }
    
    if (num > max) {
      return { valid: false, message: `${fieldName}不能大于${max}` };
    }
    
    return { valid: true, message: '' };
  },

  /**
   * 校验数组
   * @param {array} value - 待校验值
   * @param {object} options - 校验选项
   * @returns {object} - { valid: boolean, message: string }
   */
  array(value, options = {}) {
    const { required = true, minLength = 0, maxLength = Infinity, fieldName = '字段' } = options;
    
    if (required && (!value || !Array.isArray(value) || value.length === 0)) {
      return { valid: false, message: `${fieldName}不能为空` };
    }
    
    if (!required && (!value || !Array.isArray(value))) {
      return { valid: true, message: '' };
    }
    
    if (value.length < minLength) {
      return { valid: false, message: `${fieldName}至少需要${minLength}项` };
    }
    
    if (value.length > maxLength) {
      return { valid: false, message: `${fieldName}不能超过${maxLength}项` };
    }
    
    return { valid: true, message: '' };
  },

  /**
   * 校验日期
   * @param {string|Date} value - 待校验值
   * @param {object} options - 校验选项
   * @returns {object} - { valid: boolean, message: string }
   */
  date(value, options = {}) {
    const { required = true, minDate = null, maxDate = null, fieldName = '日期' } = options;
    
    if (required && !value) {
      return { valid: false, message: `${fieldName}不能为空` };
    }
    
    if (!required && !value) {
      return { valid: true, message: '' };
    }
    
    const date = new Date(value);
    
    if (isNaN(date.getTime())) {
      return { valid: false, message: `${fieldName}格式不正确` };
    }
    
    if (minDate && date < new Date(minDate)) {
      return { valid: false, message: `${fieldName}不能早于${minDate}` };
    }
    
    if (maxDate && date > new Date(maxDate)) {
      return { valid: false, message: `${fieldName}不能晚于${maxDate}` };
    }
    
    return { valid: true, message: '' };
  },

  /**
   * 校验房间ID
   * @param {string} roomId - 房间ID
   * @returns {object} - { valid: boolean, message: string }
   */
  roomId(roomId) {
    if (!roomId) {
      return { valid: false, message: '房间ID不能为空' };
    }
    
    if (!/^\d{6}$/.test(String(roomId))) {
      return { valid: false, message: '房间ID必须是6位数字' };
    }
    
    return { valid: true, message: '' };
  },

  /**
   * 校验手机号
   * @param {string} phone - 手机号
   * @returns {object} - { valid: boolean, message: string }
   */
  phone(phone) {
    if (!phone) {
      return { valid: false, message: '手机号不能为空' };
    }
    
    if (!/^1[3-9]\d{9}$/.test(String(phone))) {
      return { valid: false, message: '手机号格式不正确' };
    }
    
    return { valid: true, message: '' };
  },

  /**
   * 校验邮箱
   * @param {string} email - 邮箱
   * @returns {object} - { valid: boolean, message: string }
   */
  email(email) {
    if (!email) {
      return { valid: false, message: '邮箱不能为空' };
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
      return { valid: false, message: '邮箱格式不正确' };
    }
    
    return { valid: true, message: '' };
  },

  /**
   * 批量校验
   * @param {object} data - 待校验数据
   * @param {object} rules - 校验规则
   * @returns {object} - { valid: boolean, errors: object }
   */
  validate(data, rules) {
    const errors = {};
    let valid = true;
    
    for (const [field, rule] of Object.entries(rules)) {
      const value = data[field];
      let result;
      
      switch (rule.type) {
        case 'string':
          result = this.string(value, { ...rule, fieldName: rule.fieldName || field });
          break;
        case 'number':
          result = this.number(value, { ...rule, fieldName: rule.fieldName || field });
          break;
        case 'array':
          result = this.array(value, { ...rule, fieldName: rule.fieldName || field });
          break;
        case 'date':
          result = this.date(value, { ...rule, fieldName: rule.fieldName || field });
          break;
        case 'roomId':
          result = this.roomId(value);
          break;
        case 'phone':
          result = this.phone(value);
          break;
        case 'email':
          result = this.email(value);
          break;
        default:
          result = { valid: true, message: '' };
      }
      
      if (!result.valid) {
        errors[field] = result.message;
        valid = false;
      }
    }
    
    return { valid, errors };
  }
};

module.exports = Validator;
