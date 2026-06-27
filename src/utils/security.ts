/**
 * 安全防护工具函数
 * 包含输入验证、XSS防护、数据清洗等功能
 */

// ========================
// XSS 防护
// ========================

/**
 * HTML 实体编码映射
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
}

/**
 * 对字符串进行 HTML 转义，防止 XSS 攻击
 * @param str 需要转义的字符串
 * @returns 转义后的安全字符串
 */
export function escapeHtml(str: string): string {
  if (!str) return ''
  return str.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char)
}

/**
 * 移除 HTML 标签，只保留纯文本
 * @param str 包含 HTML 的字符串
 * @returns 纯文本字符串
 */
export function stripHtml(str: string): string {
  if (!str) return ''
  return str.replace(/<[^>]*>/g, '')
}

/**
 * 清理用户输入，移除潜在的恶意内容
 * @param input 用户输入
 * @returns 清理后的安全输入
 */
export function sanitizeInput(input: string): string {
  if (!input) return ''
  
  // 移除 HTML 标签
  let cleaned = stripHtml(input)
  
  // 移除 JavaScript 事件处理器
  cleaned = cleaned.replace(/on\w+\s*=/gi, '')
  
  // 移除潜在的脚本注入
  cleaned = cleaned.replace(/javascript:/gi, '')
  cleaned = cleaned.replace(/data:/gi, '')
  cleaned = cleaned.replace(/vbscript:/gi, '')
  
  // 限制长度
  const MAX_LENGTH = 10000
  if (cleaned.length > MAX_LENGTH) {
    cleaned = cleaned.slice(0, MAX_LENGTH)
  }
  
  return cleaned.trim()
}

// ========================
// 输入验证
// ========================

/**
 * 验证邮箱格式
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * 验证手机号格式（中国大陆）
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^1[3-9]\d{9}$/
  return phoneRegex.test(phone)
}

/**
 * 验证 URL 格式
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * 验证用户名格式
 * 规则：2-20个字符，只允许中文、英文、数字、下划线
 */
export function isValidUsername(name: string): boolean {
  const nameRegex = /^[\u4e00-\u9fa5a-zA-Z0-9_]{2,20}$/
  return nameRegex.test(name)
}

/**
 * 验证数字范围
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max
}

/**
 * 验证是否为正整数
 */
export function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0
}

/**
 * 验证日期格式 (YYYY-MM-DD)
 */
export function isValidDate(dateStr: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(dateStr)) return false
  
  const date = new Date(dateStr)
  return !isNaN(date.getTime())
}

/**
 * 验证配速格式 (MM:SS)
 */
export function isValidPace(paceStr: string): boolean {
  const paceRegex = /^\d{1,2}:\d{2}$/
  if (!paceRegex.test(paceStr)) return false
  
  const parts = paceStr.split(':')
  const mins = parseInt(parts[0], 10)
  const secs = parseInt(parts[1], 10)
  
  return mins >= 0 && mins <= 30 && secs >= 0 && secs < 60
}

/**
 * 验证时长格式 (HH:MM 或 MM:SS)
 */
export function isValidDuration(durationStr: string): boolean {
  const durationRegex = /^\d{1,2}:\d{2}$/
  if (!durationRegex.test(durationStr)) return false
  
  const parts = durationStr.split(':')
  const first = parseInt(parts[0], 10)
  const second = parseInt(parts[1], 10)
  
  return first >= 0 && second >= 0 && second < 60
}

// ========================
// 数据清洗
// ========================

/**
 * 清洗并验证训练记录输入
 */
export function sanitizeTrainingInput(data: {
  distance?: number
  duration?: string
  avgPace?: string
  avgHr?: number
  maxHr?: number
}): {
  valid: boolean
  errors: string[]
  data: typeof data
} {
  const errors: string[] = []
  const cleanedData = { ...data }

  // 验证距离
  if (data.distance !== undefined) {
    if (!isInRange(data.distance, 0, 200)) {
      errors.push('距离必须在 0-200 km 之间')
    }
  }

  // 验证时长
  if (data.duration !== undefined && data.duration !== '-') {
    if (!isValidDuration(data.duration)) {
      errors.push('时长格式不正确')
    }
  }

  // 验证配速
  if (data.avgPace !== undefined && data.avgPace !== '-') {
    if (!isValidPace(data.avgPace)) {
      errors.push('配速格式不正确')
    }
  }

  // 验证心率
  if (data.avgHr !== undefined) {
    if (!isInRange(data.avgHr, 30, 220)) {
      errors.push('平均心率必须在 30-220 bpm 之间')
    }
  }

  if (data.maxHr !== undefined) {
    if (!isInRange(data.maxHr, 30, 250)) {
      errors.push('最大心率必须在 30-250 bpm 之间')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    data: cleanedData,
  }
}

/**
 * 清洗文件名，移除潜在危险字符
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName) return ''
  
  // 移除路径遍历字符
  let cleaned = fileName.replace(/\.\./g, '')
  
  // 移除特殊字符
  cleaned = cleaned.replace(/[<>:"|?*\x00-\x1f]/g, '')
  
  // 限制长度
  if (cleaned.length > 255) {
    cleaned = cleaned.slice(0, 255)
  }
  
  return cleaned.trim()
}

/**
 * 验证文件类型是否为允许的运动数据格式
 */
export function isValidFileType(fileName: string): boolean {
  const allowedExtensions = ['fit', 'gpx', 'tcx']
  const ext = fileName.split('.').pop()?.toLowerCase()
  return ext ? allowedExtensions.includes(ext) : false
}

/**
 * 验证文件大小是否在允许范围内
 * @param size 文件大小（字节）
 * @param maxSize 最大大小（MB）
 */
export function isValidFileSize(size: number, maxSize: number = 50): boolean {
  const maxBytes = maxSize * 1024 * 1024
  return size > 0 && size <= maxBytes
}

// ========================
// 安全配置
// ========================

/**
 * 安全配置常量
 */
export const SECURITY_CONFIG = {
  // 输入长度限制
  MAX_NAME_LENGTH: 50,
  MAX_EMAIL_LENGTH: 255,
  MAX_DESCRIPTION_LENGTH: 1000,
  MAX_FILENAME_LENGTH: 255,
  
  // 文件上传限制
  MAX_FILE_SIZE_MB: 50,
  ALLOWED_FILE_TYPES: ['fit', 'gpx', 'tcx'],
  
  // 心率范围
  MIN_HR: 30,
  MAX_HR: 220,
  MAX_MAX_HR: 250,
  
  // 距离范围
  MAX_DISTANCE_KM: 200,
  
  // 会话配置
  SESSION_EXPIRY_DAYS: 7,
  TOKEN_REFRESH_THRESHOLD_HOURS: 24,
}

// ========================
// CSRF 防护（用于未来后端集成）
// ========================

/**
 * 生成 CSRF Token
 */
export function generateCsrfToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * 存储 CSRF Token
 */
export function setCsrfToken(token: string): void {
  sessionStorage.setItem('csrf_token', token)
}

/**
 * 获取 CSRF Token
 */
export function getCsrfToken(): string | null {
  return sessionStorage.getItem('csrf_token')
}

/**
 * 验证 CSRF Token
 */
export function validateCsrfToken(token: string): boolean {
  const storedToken = getCsrfToken()
  return storedToken === token
}