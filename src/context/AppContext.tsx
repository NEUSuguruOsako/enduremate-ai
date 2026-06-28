import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  type ReactNode,
} from 'react'
import { calculateVDOT } from '../pages/Profile'
import { useNotification } from './NotificationContext'
import { calculateFitnessDecay, type FitnessDecayResult } from '../services/fitnessDecay'

// ========================
// 类型定义
// ========================

export interface UserProfile {
  name: string
  avatar: string
  age: number | null
  gender: '男' | '女' | null
  height: number | null // cm
  weight: number | null // kg
  runningYears: number | null
  goal: string
  vdot: number | null
  vo2max: number | null
  // PRD 扩展字段
  injuryHistory: string
  restingHr: number | null      // 静息心率 bpm
  maxTrainingDaysPerWeek: number | null
  maxSingleDistance: number | null
}

export interface TrainingItem {
  id: string
  day: string
  title: string
  type: 'rest' | 'easy' | 'tempo' | 'interval' | 'lsd' | 'strength' | 'progression' | 'fartlek' | 'hill'
  distance?: number
  duration?: number
  pace?: string
  hrZone?: string
  zoneColor: string
  insight: string
  status: 'pending' | 'completed' | 'skipped'
  feedback?: 'easy' | 'normal' | 'tired'
  week: number
}

export interface TrainingRecord {
  id: string
  date: string
  type: string
  distance: number
  duration: string
  avgPace: string
  avgHr: number
  maxHr: number
  calories: number
  fileName?: string
  sourceFileId?: string
  // PRD 扩展字段
  dynamics?: RunningDynamics
  laps?: LapData[]
  timeSeries?: TimeSeriesPoint[]
  injuryParts?: InjuryBodyPart[]
  injurySeverity?: string
  injuryDescription?: string
}

export interface AIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isStreaming?: boolean
}

export interface TrainingMetrics {
  ctl: number | null
  atl: number | null
  injuryRisk: '低风险' | '中风险' | '高风险' | '无数据'
  fatigueScore: number | null
  weeklyDistance: number | null
  totalRuns: number | null
  riskMessages?: string[]  // PRD 5.1 风险消息
  activeInjuryParts?: string[]  // 当前活跃伤病部位（全局同步）
  activeInjuryCount?: number    // 活跃伤病数量
}

export interface UploadedFile {
  id: string
  name: string
  size: string
  date: string
  parsedRecords: TrainingRecord[]
}

// ========================
// 扩展类型定义（PRD 功能支持）
// ========================

/** 单圈数据 */
export interface LapData {
  lapIndex: number
  distance: number       // km
  duration: number       // seconds
  avgPace: number        // sec/km
  avgHr?: number
  maxHr?: number
}

/** 时间序列数据点 */
export interface TimeSeriesPoint {
  time: number           // 时间（秒）- 用于图表 X 轴
  timeSec: number        // 距离开始的秒数
  distance: number       // km
  pace?: number          // 实时配速 sec/km
  hr?: number            // 心率 bpm
  heartRate?: number     // 心率 bpm (兼容)
  cadence?: number       // 步频 spm
  elevation?: number     // 海拔 m
  altitude?: number      // 海拔 m (兼容)
  lat?: number
  lon?: number
}

/** 跑步动力学数据 */
export interface RunningDynamics {
  cadence: number        // 平均步频 spm
  avgCadence?: number    // 平均步频 spm (兼容)
  strideLength: number   // 平均步幅 m
  avgStepLength?: number // 平均步幅 m (兼容)
  verticalOscillation?: number  // 垂直振幅 cm
  avgVerticalOscillation?: number
  verticalRatio?: number
  avgVerticalRatio?: number
  groundContactTime?: number    // 触地时间 ms
  avgStanceTime?: number
  power?: number          // 跑步功率 W
  avgPower?: number
  maxPower?: number
  totalAscent?: number
  totalDescent?: number
  avgTemperature?: number
}

/** 伤痛部位 */
export type InjuryBodyPart =
  | 'knee' | 'ankle' | 'achilles' | 'shin' | 'calf'
  | 'hamstring' | 'quadriceps' | 'hip' | 'foot' | 'lower_back'
  | 'groin' | 'it_band' | 'plantar'
  | '膝盖' | '小腿' | '足底' | '跟腱' | '髋部'
  | '脚踝' | '臀部' | '腰部' | '其他'

/** 伤痛记录 */
export interface InjuryRecord {
  id: string
  date: string
  parts: InjuryBodyPart[]
  severity: 'mild' | 'moderate' | 'severe'
  description: string
  trainingId?: string   // 关联的训练 ID
  recovered: boolean
}

/** 训练聊天消息（用于 TrainingAnalysis 的 per-training 聊天） */
export interface TrainingChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isStreaming?: boolean
}

interface AppState {
  profile: UserProfile
  trainings: TrainingItem[]
  trainingRecords: TrainingRecord[]
  aiMessages: AIMessage[]
  isAIChatOpen: boolean
  selectedTraining: TrainingItem | null
  selectedRecord: TrainingRecord | null
  metrics: TrainingMetrics
  currentPhase: number
  currentWeek: number
  uploadedFiles: UploadedFile[]
  isProfileComplete: boolean
  hasTrainingData: boolean
  injuryRecords: InjuryRecord[]  // 伤痛记录
  detailSourcePath: string  // 训练详情页的来源页面路径
  decay: FitnessDecayResult | null  // 水平衰减评估结果
  decayDismissed: boolean  // 衰减弹窗是否已被关闭
}

interface AppContextValue extends AppState {
  toggleAIChat: () => void
  sendAIMessage: (content: string) => void
  setAiMessages: React.Dispatch<React.SetStateAction<AIMessage[]>>
  updateTrainingFeedback: (
    id: string,
    feedback: 'easy' | 'normal' | 'tired',
  ) => void
  completeTraining: (id: string) => void
  selectTraining: (training: TrainingItem | null) => void
  selectRecord: (record: TrainingRecord | null) => void
  addTrainingRecord: (record: Omit<TrainingRecord, 'id'>) => void
  setPhase: (phase: number) => void
  nextWeek: () => void
  prevWeek: () => void
  addUploadedFile: (file: UploadedFile) => void
  removeUploadedFile: (fileId: string) => void
  updateProfile: (updates: Partial<UserProfile>) => void
  unreadNotifications: number
  setUnreadNotifications: (n: number) => void
  /** 从上传文件解析训练记录并更新所有相关数据 */
  processParsedData: (records: TrainingRecord[], fileId: string) => void
  /** 基于训练记录估算VDOT */
  estimateVDOT: () => number | null
  /** AI生成训练计划并设置 */
  generateAndSetTrainingPlan: () => void
  /** 更新训练项 */
  updateTraining: (id: string, updates: Partial<TrainingItem>) => void
  /** 删除训练项 */
  deleteTraining: (id: string) => void
  // PRD 扩展方法
  addTraining: (training: TrainingItem) => void
  setTrainings: React.Dispatch<React.SetStateAction<TrainingItem[]>>
  addInjuryRecord: (record: Omit<InjuryRecord, 'id'>) => void
  updateInjuryRecord: (id: string, updates: Partial<InjuryRecord>) => void
  updateRecordInjury: (recordId: string, injury: { parts: InjuryBodyPart[]; severity: string; description: string }) => void
  setDetailSourcePath: (path: string) => void
  planAutoGenerated: boolean
  setPlanAutoGenerated: React.Dispatch<React.SetStateAction<boolean>>
  autoGenReason: string
  setAutoGenReason: React.Dispatch<React.SetStateAction<string>>
  dismissAutoGenNotice: () => void
  decay: FitnessDecayResult | null
  decayDismissed: boolean
  dismissDecayNotice: () => void
}

// ========================
// localStorage 持久化工具
// ========================

const STORAGE_KEY = 'enduremate_data'
const STORAGE_MAX_SIZE = 4.5 * 1024 * 1024 // 4.5MB 警戒线（localStorage 上限约 5MB）
const STORAGE_LIGHT_KEY = 'enduremate_data_light' // 精简存储的备份 key

interface StoredData {
  profile: UserProfile
  trainings: TrainingItem[]
  trainingRecords: TrainingRecord[]
  injuryRecords: InjuryRecord[]
  uploadedFiles: UploadedFile[]
  currentPhase: number
  currentWeek: number
  planAutoGenerated: boolean
  autoGenReason: string
}

/** 精简版数据结构（去掉 timeSeries/laps/dynamics 等大字段） */
interface StoredDataLight {
  profile: UserProfile
  trainings: TrainingItem[]
  trainingRecords: Array<Omit<TrainingRecord, 'timeSeries' | 'laps' | 'dynamics'>>
  injuryRecords: InjuryRecord[]
  uploadedFiles: Array<Omit<UploadedFile, 'parsedRecords'>>
  currentPhase: number
  currentWeek: number
  planAutoGenerated: boolean
  autoGenReason: string
}

interface SaveResult {
  success: boolean
  sizeKB: number
  degraded: boolean  // 是否降级存储（丢弃了部分数据）
  error?: string
}

function loadFromStorage(): StoredData | null {
  try {
    // 优先读取完整版
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) {
      const parsed = JSON.parse(data) as StoredData
      console.log(`[Persist] 从 ${STORAGE_KEY} 加载 — profile:${!!parsed.profile?.name} records:${parsed.trainingRecords?.length ?? 0} plans:${parsed.trainings?.length ?? 0}`)
      return parsed
    }
    // 回退到精简版
    const lightData = localStorage.getItem(STORAGE_LIGHT_KEY)
    if (lightData) {
      const parsed = JSON.parse(lightData) as StoredData
      console.log(`[Persist] 从 ${STORAGE_LIGHT_KEY}(精简版) 加载 — profile:${!!parsed.profile?.name} records:${parsed.trainingRecords?.length ?? 0}`)
      return parsed
    }
    console.log('[Persist] localStorage 中无 enduremate_data 数据')
  } catch (err) {
    console.error('[Persist] 加载数据失败:', err)
  }
  return null
}

function getJSONSizeKB(data: unknown): number {
  try {
    return new Blob([JSON.stringify(data)]).size / 1024
  } catch {
    return Infinity
  }
}

function saveToStorage(data: StoredData): SaveResult {
  let json: string
  try {
    json = JSON.stringify(data)
  } catch (err) {
    console.error('[Persist] JSON.stringify 失败:', err)
    return { success: false, sizeKB: 0, degraded: false, error: '数据序列化失败' }
  }
  const sizeKB = new Blob([json]).size / 1024

  // 尝试正常保存
  try {
    localStorage.setItem(STORAGE_KEY, json)
    // 同时保存精简版作为备份
    trySaveLight(data)
    console.log(`[Persist] 完整版保存成功 (${sizeKB.toFixed(1)}KB)`)
    return { success: true, sizeKB, degraded: false }
  } catch (e) {
    // QuotaExceededError 或其他存储错误
    const errMsg = e instanceof Error ? e.message : String(e)
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      console.warn(`[Persist] 完整数据过大 (${sizeKB.toFixed(0)}KB)，触发 QuotaExceededError，降级存储...`)
    } else {
      console.error(`[Persist] localStorage.setItem 失败 (${sizeKB.toFixed(0)}KB):`, errMsg, e)
    }

    // 降级：去掉 timeSeries、laps、dynamics 等大字段
    const lightData: StoredDataLight = {
      ...data,
      trainingRecords: data.trainingRecords.map((r) => {
        const { timeSeries, laps, dynamics, ...rest } = r
        return rest
      }),
      uploadedFiles: data.uploadedFiles.map((f) => {
        const { parsedRecords, ...rest } = f
        return rest
      }),
    }

    const lightSizeKB = getJSONSizeKB(lightData)

    try {
      localStorage.setItem(STORAGE_LIGHT_KEY, JSON.stringify(lightData))
      // 清除可能残留的旧完整版
      try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
      console.log(`[Persist] 精简版保存成功 (${lightSizeKB.toFixed(1)}KB)`)
      return { success: true, sizeKB: lightSizeKB, degraded: true }
    } catch (e2) {
      console.error('[Persist] 精简版也无法保存:', e2)
      return { success: false, sizeKB, degraded: false, error: '存储空间不足，请导出数据后清理浏览器缓存' }
    }
  }
}

/** 保存精简版备份（忽略错误） */
function trySaveLight(data: StoredData): void {
  try {
    const lightData: StoredDataLight = {
      ...data,
      trainingRecords: data.trainingRecords.map((r) => {
        const { timeSeries, laps, dynamics, ...rest } = r
        return rest
      }),
      uploadedFiles: data.uploadedFiles.map((f) => {
        const { parsedRecords, ...rest } = f
        return rest
      }),
    }
    localStorage.setItem(STORAGE_LIGHT_KEY, JSON.stringify(lightData))
  } catch { /* 静默忽略 */ }
}

/** 获取当前 localStorage 使用量 (KB) */
export function getStorageUsageKB(): number {
  let total = 0
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('enduremate_')) {
      total += (localStorage.getItem(key)?.length ?? 0) * 2 / 1024 // 近似 UTF-16
    }
  }
  return total
}

// ========================
// 空初始状态（零示例数据）
// ========================

const emptyProfile: UserProfile = {
  name: '',
  avatar: '',
  age: null,
  gender: null,
  height: null,
  weight: null,
  runningYears: null,
  goal: '',
  vdot: null,
  vo2max: null,
  injuryHistory: '',
  restingHr: null,
  maxTrainingDaysPerWeek: null,
  maxSingleDistance: null,
}

const emptyMetrics: TrainingMetrics = {
  ctl: null,
  atl: null,
  injuryRisk: '无数据',
  fatigueScore: null,
  weeklyDistance: null,
  totalRuns: null,
}

// ========================
// 文件解析模拟器（基于真实跑步数据模型）
// ========================

/**
 * 各训练类型的真实数据参数表
 * 每种类型有固定的配速范围和距离范围，符合实际跑步规律
 */
const TRAINING_TYPE_PROFILES: Record<string, {
  typeName: string
  distances: number[]        // 常见距离选项 (km)
  paceRange: [number, number] // 配速范围 [min/km, max/km] (秒)
  hrRange: [number, number]   // 心率范围 [min, max] bpm
  description: string
}> = {
  easy: {
    typeName: '轻松跑',
    distances: [5, 6, 8, 10, 12],
    paceRange: [330, 390],      // 5:30 ~ 6:30 /km
    hrRange: [125, 148],
    description: '恢复性有氧跑',
  },
  lsd: {
    typeName: '长距离跑',
    distances: [14, 16, 18, 20, 22, 25, 28, 30],
    paceRange: [340, 420],      // 5:40 ~ 7:00 /km
    hrRange: [135, 155],
    description: '耐力基础训练',
  },
  tempo: {
    typeName: '乳酸阈值跑',
    distances: [5, 6, 8, 10, 12],
    paceRange: [275, 320],      // 4:35 ~ 5:20 /km
    hrRange: [158, 175],
    description: '乳酸阈值训练',
  },
  interval: {
    typeName: '间歇跑',
    distances: [6, 8, 10, 12],
    paceRange: [240, 280],      // 4:00 ~ 4:40 /km
    hrRange: [165, 185],
    description: 'VO2max 间歇训练',
  },
  recovery: {
    typeName: '恢复跑',
    distances: [3, 4, 5, 6],
    paceRange: [360, 420],      // 6:00 ~ 7:00 /km
    hrRange: [110, 135],
    description: '极低强度恢复',
  },
  progression: {
    typeName: '渐进跑',
    distances: [8, 10, 12],
    paceRange: [300, 360],      // 5:00 ~ 6:00 /km
    hrRange: [140, 165],
    description: '配速递增训练',
  },
  fartlek: {
    typeName: '法特莱克',
    distances: [8, 10, 12, 15],
    paceRange: [290, 370],      // 4:50 ~ 6:10 /km (混合配速)
    hrRange: [135, 170],
    description: '变速跑游戏',
  },
  hill: {
    typeName: '坡道重复',
    distances: [6, 8, 10],
    paceRange: [300, 360],      // 5:00 ~ 6:00 /km
    hrRange: [150, 178],
    description: '力量+速度复合训练',
  },
  race: {
    typeName: '比赛/测试',
    distances: [5, 10, 21.1, 42.2], // 含半马全马
    paceRange: [250, 330],       // 根据距离自动调整
    hrRange: [168, 188],
    description: '正式比赛或能力测试',
  },
  strength: {
    typeName: '力量训练',
    distances: [0],
    paceRange: [0, 0],
    hrRange: [95, 130],
    description: '核心及下肢力量',
  },
  core: {
    typeName: '核心训练',
    distances: [0],
    paceRange: [0, 0],
    hrRange: [90, 125],
    description: '核心稳定性训练',
  },
}

/** 根据文件名推断训练类型 */
function detectTrainingType(fileName: string): keyof typeof TRAINING_TYPE_PROFILES {
  const lower = fileName.toLowerCase()

  // 精确匹配关键词
  if (lower.includes('marathon') || lower.includes('full') || lower.includes('42') || lower.includes('全马')) return 'race'
  if (lower.includes('half') || lower.includes('21') || lower.includes('半马')) return 'race'
  if (lower.includes('10k') || lower.includes('10000')) return 'race'
  if (lower.includes('5k') || lower.includes('5000')) return 'race'
  if (lower.includes('tempo') || lower.includes('threshold') || lower.includes('阈值') || lower.includes('节奏')) return 'tempo'
  if (lower.includes('interval') || lower.includes('interv') || lower.includes('间歇') || lower.includes('亚索')) return 'interval'
  if (lower.includes('lsd') || lower.includes('long') || lower.includes('longrun') || lower.includes('长距') || lower.includes('LSD')) return 'lsd'
  if (lower.includes('recovery') || lower.includes('recover') || lower.includes('恢复') || lower.includes('cool')) return 'recovery'
  if (lower.includes('progression') || lower.includes('progress') || lower.includes('渐进') || lower.includes('递增')) return 'progression'
  if (lower.includes('fartlek') || lower.includes('变速') || lower.includes('法特莱克')) return 'fartlek'
  if (lower.includes('hill') || lower.includes('hillrepeat') || lower.includes('坡道') || lower.includes('爬坡')) return 'hill'
  if (lower.includes('core') || lower.includes('corework') || lower.includes('核心')) return 'core'
  if (lower.includes('strength') || lower.includes('gym') || lower.includes('力量') || lower.includes('str')) return 'strength'

  // 默认：根据文件名长度/特征做概率推断
  const hash = fileName.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  const rand = hash % 10
  if (rand < 4) return 'easy'       // 40% 概率轻松跑
  if (rand < 6) return 'lsd'        // 20% 长距离
  if (rand < 7) return 'tempo'     // 10% 节奏跑
  if (rand < 8) return 'interval'  // 10% 间歇跑
  if (rand < 9) return 'recovery'  // 10% 恢复跑
  return 'easy'                      // 默认轻松跑
}

/**
 * 在指定范围内选取一个值，带微小随机扰动（±3%）
 */
function pickWithVariance(value: number, variancePercent: number = 3): number {
  const variance = value * (variancePercent / 100) * (Math.random() * 2 - 1)
  return Math.round((value + variance) * 10) / 10
}

/**
 * 从日期偏移量生成合理的日期字符串
 * 最近60天内的随机日期，偏向近期（最近2周概率更高）
 */
function generateRealisticDate(): string {
  const now = Date.now()
  // 70% 概率在最近14天，30% 在 14-60 天前
  const daysAgo = Math.random() < 0.7
    ? Math.floor(Math.random() * 14)
    : 14 + Math.floor(Math.random() * 46)

  const date = new Date(now - daysAgo * 24 * 60 * 60 * 1000)
  return date.toISOString().split('T')[0]
}

function generateTimeSeries(distance: number, totalSeconds: number, avgPaceSec: number, avgHr: number, maxHr: number): TimeSeriesPoint[] {
  const points: TimeSeriesPoint[] = []
  const numPoints = Math.max(30, Math.min(200, Math.round(totalSeconds / 3)))
  
  const elevationBase = Math.floor(Math.random() * 100)
  
  for (let i = 0; i < numPoints; i++) {
    const progress = i / (numPoints - 1)
    const timeSec = Math.round(progress * totalSeconds)
    const distKm = Math.round(progress * distance * 10) / 10
    
    const paceVariation = Math.sin(progress * Math.PI * 4 + Math.random() * 0.5) * 15 + (Math.random() - 0.5) * 20
    const currentPace = Math.max(180, Math.min(480, avgPaceSec + paceVariation))
    
    const hrVariation = Math.sin(progress * Math.PI * 6 + Math.random()) * 8 + (Math.random() - 0.5) * 6
    const currentHr = Math.max(avgHr - 15, Math.min(maxHr + 5, avgHr + hrVariation))
    
    const cadenceBase = Math.round(160 + Math.random() * 30)
    const cadenceVariation = Math.sin(progress * Math.PI * 8) * 5 + (Math.random() - 0.5) * 8
    const currentCadence = Math.max(140, Math.min(200, cadenceBase + cadenceVariation))
    
    const elevationVariation = Math.sin(progress * Math.PI * 3) * 15 + Math.sin(progress * Math.PI * 7) * 8
    const currentElevation = Math.max(0, elevationBase + elevationVariation)

    points.push({
      time: timeSec,
      timeSec,
      distance: distKm,
      pace: currentPace,
      heartRate: Math.round(currentHr),
      hr: Math.round(currentHr),
      cadence: Math.round(currentCadence),
      altitude: Math.round(currentElevation),
      elevation: Math.round(currentElevation),
    })
  }
  
  return points
}

export function parseTrainingFile(
  fileName: string,
): TrainingRecord[] {
  const typeKey = detectTrainingType(fileName)
  const profile = TRAINING_TYPE_PROFILES[typeKey]

  // 根据类型选择距离（从该类型常见距离中选一个）
  const distOptions = profile.distances
  const rawDistance = distOptions[Math.floor(Math.random() * distOptions.length)]

  // 比赛类型特殊处理：距离决定配速
  let targetPaceSec: number
  if (typeKey === 'race') {
    if (rawDistance >= 42) targetPaceSec = pickWithVariance(270)   // 全马 ~4:30
    else if (rawDistance >= 21) targetPaceSec = pickWithVariance(255) // 半马 ~4:15
    else if (rawDistance >= 10) targetPaceSec = pickWithVariance(240) // 10K ~4:00
    else targetPaceSec = pickWithVariance(225)                       // 5K ~3:45
  } else {
    // 其他类型：从配速范围内取值，距离越长配速越慢（线性插值）
    const [paceMin, paceMax] = profile.paceRange
    const distIndex = distOptions.indexOf(rawDistance) / (distOptions.length - 1 || 1)
    // 距离越长 → 配速越慢（靠近 paceMax）
    targetPaceSec = Math.round(paceMin + (paceMax - paceMin) * distIndex * 0.6 + Math.random() * (paceMax - paceMin) * 0.4)
  }

  const distance = Math.round(rawDistance * 10) / 10
  const avgPaceSec = Math.max(180, Math.min(480, targetPaceSec)) // clamp to reasonable range

  // 时长由距离×配速精确计算
  const totalSeconds = Math.round(distance * avgPaceSec)
  const durationMin = totalSeconds / 60
  const hours = Math.floor(durationMin / 60)
  const mins = Math.round(durationMin % 60)
  const durationStr = `${hours}:${mins.toString().padStart(2, '0')}`

  // 配速格式化
  const paceMinVal = Math.floor(avgPaceSec / 60)
  const paceSecVal = avgPaceSec % 60
  const paceStr = distance > 0 ? `${paceMinVal}:${paceSecVal.toString().padStart(2, '0')}` : '-'

  // 心率：在类型范围内选取，与配速正相关（越快心率越高）
  const [hrMin, hrMax] = profile.hrRange
  const intensityFactor = (avgPaceSec - 240) / 180 // 归一化强度因子
  const baseHr = Math.round(hrMin + (hrMax - hrMin) * Math.max(0, Math.min(1, 1 - intensityFactor)))
  const avgHr = pickWithVariance(baseHr, 4)
  const maxHr = avgHr + Math.round(8 + Math.random() * 16)

  // 热量：基于距离和平均心率的合理估算
  const calories = distance > 0
    ? Math.round(distance * (55 + (avgHr - 120) * 0.4) + Math.random() * 20)
    : Math.round(durationMin * (4 + Math.random() * 2))

  // 生成真实日期
  const dateStr = generateRealisticDate()

  // 生成逐点时间序列数据
  const timeSeries = distance > 0 ? generateTimeSeries(distance, totalSeconds, avgPaceSec, avgHr, maxHr) : undefined

  return [
    {
      id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      date: dateStr,
      type: profile.typeName,
      distance,
      duration: durationStr,
      avgPace: paceStr,
      avgHr,
      maxHr,
      calories,
      fileName,
      timeSeries,
    },
  ]
}

// ========================
// 指标计算器（基于训练记录动态计算）
// ========================

function calculateMetrics(records: TrainingRecord[], injuryRecords?: InjuryRecord[]): TrainingMetrics {
  if (records.length === 0) return { ...emptyMetrics }

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

  const recentRecords = records.filter((r) => new Date(r.date) >= weekAgo)
  const previousWeekRecords = records.filter((r) => {
    const d = new Date(r.date)
    return d >= twoWeeksAgo && d < weekAgo
  })
  const allRecords = records

  // 周跑量
  const weeklyDistance = recentRecords.reduce((sum, r) => sum + r.distance, 0)
  const previousWeeklyDistance = previousWeekRecords.reduce((sum, r) => sum + r.distance, 0)

  // 周跑量增幅风险检测（PRD 5.1）
  const riskMessages: string[] = []
  if (previousWeeklyDistance > 0) {
    const increase = ((weeklyDistance - previousWeeklyDistance) / previousWeeklyDistance) * 100
    if (increase > 15) {
      riskMessages.push(`⚠️ 周跑量增幅 ${increase.toFixed(1)}% 超过 15%，伤病风险显著上升`)
    }
  }

  // 连续高强度训练检测（只检查最近两周内的数据）
  const twoWeekRecords = records.filter((r) => new Date(r.date) >= twoWeeksAgo)
  const recentHighIntensityCount = twoWeekRecords.filter((r) =>
    r.type.includes('间歇') || r.type.includes('阈值') || r.type.includes('节奏'),
  ).length
  if (recentHighIntensityCount >= 2) {
    riskMessages.push('⚠️ 近期高强度训练频率较高，建议安排恢复跑或休息')
  }

  // 总训练次数
  const totalRuns = allRecords.length

  // CTL 近似：基于最近4周的训练负荷
  const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000)
  const fourWeekRecords = records.filter((r) => new Date(r.date) >= fourWeeksAgo)
  const ctlRaw = fourWeekRecords.reduce((sum, r) => {
    const load = r.distance * (1 + (r.avgHr - 120) / 80)
    return sum + load
  }, 0)
  const ctl = Math.round(ctlRaw / 4)

  // ATL 近似：基于最近1周
  const atlRaw = recentRecords.reduce((sum, r) => {
    const load = r.distance * (1 + (r.avgHr - 120) / 80)
    return sum + load
  }, 0)
  const atl = Math.round(atlRaw)

  // 疲劳分：只有当CTL大于0时才计算，避免除以0的情况
  const fatigueScore = atl !== null && ctl !== null && ctl > 0 
    ? Math.round(Math.max(0, ((atl - ctl) / ctl) * 50 + 40)) 
    : null

  // 伤病风险
  let injuryRisk: TrainingMetrics['injuryRisk'] = '低风险'
  // 只有当有有效数据时才进行风险评估
  if (fatigueScore !== null) {
    if (fatigueScore > 75) injuryRisk = '高风险'
    else if (fatigueScore > 55) injuryRisk = '中风险'
  } else if (records.length === 0) {
    // 无训练记录时显示无数据
    injuryRisk = '无数据'
  } else if (ctl === 0 || ctl === null) {
    // 有记录但CTL为0（近期无训练），风险应为低风险
    injuryRisk = '低风险'
  }

  // 如果有风险消息，提升风险等级
  if (riskMessages.length > 0 && injuryRisk === '低风险') {
    injuryRisk = '中风险'
  }

  // 纳入伤病记录的风险评估
  let activeInjuryParts: string[] = []
  let activeInjuryCount = 0
  if (injuryRecords && injuryRecords.length > 0) {
    const activeInjuries = injuryRecords.filter(r => !r.recovered)
    activeInjuryCount = activeInjuries.length
    activeInjuryParts = [...new Set(activeInjuries.flatMap(r => r.parts))]

    // 活跃伤病提升风险等级
    if (activeInjuryCount > 0 && injuryRisk === '低风险') {
      const hasSevere = activeInjuries.some(r => r.severity === 'severe')
      injuryRisk = hasSevere ? '高风险' : '中风险'
    }
    if (activeInjuryCount >= 3) {
      injuryRisk = '高风险'
      riskMessages.push(`⚠️ 存在 ${activeInjuryCount} 处活跃伤病（${activeInjuryParts.join('、')}），强烈建议降低训练强度`)
    }
  }

  return {
    ctl,
    atl,
    injuryRisk,
    fatigueScore,
    weeklyDistance: weeklyDistance || null,
    totalRuns,
    riskMessages: riskMessages.length > 0 ? riskMessages : undefined,
    activeInjuryParts: activeInjuryParts.length > 0 ? activeInjuryParts : undefined,
    activeInjuryCount: activeInjuryCount > 0 ? activeInjuryCount : undefined,
  }
}

// ========================
// VDOT 估算工具（基于训练记录）
// ========================

/**
 * 基于训练记录估算 VDOT
 * 分析用户的训练数据，找到各距离下的最佳表现，然后换算成等效VDOT
 */
export function estimateVDOTFromRecords(records: TrainingRecord[]): number | null {
  if (records.length === 0) return null

  // 过滤出有效的跑步记录（有配速数据且距离>0）
  const validRecords = records.filter(r => 
    r.distance > 0 && r.avgPace && r.avgPace !== '-'
  )

  if (validRecords.length === 0) return null

  // 将配速字符串转换为秒/公里
  function parsePace(paceStr: string): number {
    const parts = paceStr.split(':')
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1])
    }
    return 0
  }

  // 找到各距离范围的最佳配速（取最快的3次平均）
  const groupedRecords: Record<string, { distance: number; paceSec: number }[]> = {
    short: [],   // 3-8km (接近5K)
    medium: [],  // 8-16km (接近10K)
    long: [],    // 16-28km (接近半马)
    marathon: [], // 28+km (全马范围)
  }

  for (const record of validRecords) {
    const paceSec = parsePace(record.avgPace)
    if (paceSec === 0) continue
    if (record.distance < 3) continue

    if (record.distance <= 8) {
      groupedRecords.short.push({ distance: record.distance, paceSec })
    } else if (record.distance <= 16) {
      groupedRecords.medium.push({ distance: record.distance, paceSec })
    } else if (record.distance <= 28) {
      groupedRecords.long.push({ distance: record.distance, paceSec })
    } else {
      groupedRecords.marathon.push({ distance: record.distance, paceSec })
    }
  }

  // 获取每组中最快的N次的平均配速
  function getBestAveragePace(group: { distance: number; paceSec: number }[], minCount: number = 1) {
    if (group.length < minCount) return null
    // 按配速排序（越快越靠前）
    const sorted = [...group].sort((a, b) => a.paceSec - b.paceSec)
    // 取最快的3次或全部（如果少于3次）
    const take = Math.min(3, sorted.length)
    const best = sorted.slice(0, take)
    const avgPace = best.reduce((sum, r) => sum + r.paceSec, 0) / best.length
    const avgDistance = best.reduce((sum, r) => sum + r.distance, 0) / best.length
    return { distance: avgDistance, paceSec: avgPace }
  }

  // 计算各距离的等效VDOT，然后取加权平均值
  const vdotCandidates: { vdot: number; weight: number }[] = []

  // 标准距离定义
  const standardDistances = {
    short: { targetDist: 5, minRecords: 1, weight: 1.0 },
    medium: { targetDist: 10, minRecords: 1, weight: 0.8 },
    long: { targetDist: 21.0975, minRecords: 1, weight: 0.6 },
    marathon: { targetDist: 42.195, minRecords: 1, weight: 0.4 },
  }

  for (const [key, config] of Object.entries(standardDistances)) {
    const best = getBestAveragePace(groupedRecords[key as keyof typeof groupedRecords], config.minRecords)
    if (best) {
      // 使用Jack Daniels标准距离进行配速校正
      const vdot = calculateVDOT(best.distance, (best.paceSec * best.distance) / 60)
      if (vdot >= 25 && vdot <= 85) {
        vdotCandidates.push({ vdot, weight: config.weight })
      }
    }
  }

  if (vdotCandidates.length === 0) return null

  // 计算加权平均值
  let weightedSum = 0
  let totalWeight = 0
  
  vdotCandidates.forEach(({ vdot, weight }) => {
    weightedSum += vdot * weight
    totalWeight += weight
  })

  const estimatedVDOT = Math.round((weightedSum / totalWeight) * 10) / 10
  
  return estimatedVDOT
}

// ========================
// AI 动态回复引擎（基于实际数据）
// ========================

// 共享 Mock 回复模块（与 AIAssistant 共用）
import { generateDynamicAIReply } from '../services/mockReplies'
// 训练计划生成器
import { generateTrainingPlan, getRecommendedTemplate } from '../services/trainingPlanGenerator'

let messageIdCounter = 0

function generateMsgId(): string {
  return `msg_${Date.now()}_${++messageIdCounter}`
}

// ========================
// Context 创建
// ========================

const AppContext = createContext<AppContextValue | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const storedData = loadFromStorage()
  const isInitialized = useRef(false)
  const notify = useNotification()
  const notifyRef = useRef(notify)
  notifyRef.current = notify // 始终指向最新 notify，避免 effect 依赖变化
  const lastSaveErrorRef = useRef(false) // 防止重复弹通知

  // 初始化诊断日志
  if (!isInitialized.current) {
    console.log('[Persist] 初始化 — localStorage 数据:', storedData ? {
      hasProfile: !!storedData.profile?.name,
      trainingCount: storedData.trainingRecords?.length ?? 0,
      planCount: storedData.trainings?.length ?? 0,
    } : 'null（无数据）')
    console.log('[Persist] 当前所有 enduremate_ keys:', 
      Object.keys(localStorage).filter(k => k.startsWith('enduremate_')))
  }

  // ---- 状态：从localStorage加载或使用默认值 ----
  const [profile, setProfile] = useState<UserProfile>(
    storedData?.profile || { ...emptyProfile }
  )
  const [trainings, setTrainings] = useState<TrainingItem[]>(
    storedData?.trainings || []
  )
  const [trainingRecords, setTrainingRecords] = useState<TrainingRecord[]>(
    storedData?.trainingRecords || []
  )
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([])
  const [isAIChatOpen, setIsAIChatOpen] = useState(false)
  const [selectedTraining, setSelectedTraining] = useState<TrainingItem | null>(null)
  const [selectedRecord, setSelectedRecord] = useState<TrainingRecord | null>(null)
  const [metrics, setMetrics] = useState<TrainingMetrics>({ ...emptyMetrics })
  const [currentPhase, setCurrentPhase] = useState(
    storedData?.currentPhase ?? 0
  )
  const [currentWeek, setCurrentWeek] = useState(
    storedData?.currentWeek ?? 1
  )
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(
    storedData?.uploadedFiles || []
  )
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [injuryRecords, setInjuryRecords] = useState<InjuryRecord[]>(
    storedData?.injuryRecords || []
  )
  const [detailSourcePath, setDetailSourcePath] = useState('')
  const [planAutoGenerated, setPlanAutoGenerated] = useState(
    storedData?.planAutoGenerated ?? false
  )
  const [autoGenReason, setAutoGenReason] = useState(
    storedData?.autoGenReason ?? ''
  )
  const [decayDismissed, setDecayDismissed] = useState(false)

  // ---- 衰减评估：基于训练记录和训练计划实时计算 ----
  const decay = useMemo(() => {
    return calculateFitnessDecay(profile, trainingRecords, trainings)
  }, [profile.vdot, profile.age, profile.runningYears, trainingRecords.length, trainings.length])

  // ---- 控制器 ----
  const dismissDecayNotice = useCallback(() => {
    setDecayDismissed(true)
  }, [])

  // ---- 初始化：从加载的数据计算指标 ----
  useEffect(() => {
    if (trainingRecords.length > 0) {
      setMetrics(calculateMetrics(trainingRecords, injuryRecords))
    }
  }, [])

  // ---- 自动训练计划生成（15条训练记录后触发） ----
  const AUTO_GEN_THRESHOLD = 15
  useEffect(() => {
    if (
      trainingRecords.length >= AUTO_GEN_THRESHOLD &&
      trainings.length === 0 &&
      profile.goal &&
      profile.goal !== ''
    ) {
      const template = getRecommendedTemplate(profile.goal, profile, decay?.decayLevel)
      const effectiveVDOT = decay?.decayedVDOT ?? profile.vdot
      const newPlan = generateTrainingPlan(template, profile, undefined, injuryRecords, effectiveVDOT ?? undefined)
      setTrainings(newPlan)
      setPlanAutoGenerated(true)
      const decayNote = decay
        ? `（因距上次训练已过 ${decay.gapDays} 天，已按衰减后水平 VDOT ${decay.decayedVDOT} 调整强度）`
        : ''
      setAutoGenReason(
        `检测到你已有 ${trainingRecords.length} 条训练记录，系统已根据你的 VDOT（${effectiveVDOT ?? '待评估'}）和目标「${profile.goal}」自动生成训练计划。${decayNote}`
      )
    }
  }, [trainingRecords.length])

  // ---- 持久化：数据变化时保存到localStorage ----
  useEffect(() => {
    // 跳过首次挂载（避免用空状态覆盖已有存储数据）
    if (!isInitialized.current) {
      isInitialized.current = true
      console.log('[Persist] 首次挂载完成，跳过自动保存')
      return
    }

    const dataToSave = {
      profile,
      trainings,
      trainingRecords,
      injuryRecords,
      uploadedFiles,
      currentPhase,
      currentWeek,
      planAutoGenerated,
      autoGenReason,
    }
    console.log(`[Persist] 触发保存 — profile:${!!profile.name} records:${trainingRecords.length} plans:${trainings.length}`)
    const result = saveToStorage(dataToSave)
    console.log(`[Persist] 保存结果 — success:${result.success} sizeKB:${result.sizeKB.toFixed(0)} degraded:${result.degraded}`)

    if (!result.success) {
      // 存储完全失败（精简版也塞不下），弹通知告知用户
      if (!lastSaveErrorRef.current) {
        lastSaveErrorRef.current = true
        notifyRef.current.error(
          '数据保存失败',
          result.error || '浏览器存储空间不足，请导出数据后清理浏览器缓存'
        )
      }
    } else {
      // 恢复成功时清除错误标记
      if (lastSaveErrorRef.current) {
        lastSaveErrorRef.current = false
        notifyRef.current.success('数据存储已恢复正常')
      }
      // 降级通知（只弹一次）
      if (result.degraded) {
        if (!lastSaveErrorRef.current) {
          lastSaveErrorRef.current = true
          notifyRef.current.warning(
            '部分数据已精简存储',
            `训练详情图表数据过大，已去除逐点数据以节省空间。训练概要数据完整保留，不影响核心功能。`
          )
          // 恢复标记（降级通知只需弹一次）
          setTimeout(() => { lastSaveErrorRef.current = false }, 3000)
        }
      }
    }
  }, [profile, trainings, trainingRecords, injuryRecords, uploadedFiles, currentPhase, currentWeek, planAutoGenerated, autoGenReason])

  // 派生状态
  const isProfileComplete =
    profile.name !== '' &&
    profile.age !== null &&
    profile.gender !== null &&
    profile.height !== null &&
    profile.weight !== null

  const hasTrainingData = trainingRecords.length > 0

  // ---- Actions ----

  const toggleAIChat = useCallback(() => {
    setIsAIChatOpen((prev) => !prev)
  }, [])

  // 发送消息 + 动态 AI 回复（带流式效果模拟）
  const sendAIMessage = useCallback(
    (content: string) => {
      const userMsg: AIMessage = {
        id: generateMsgId(),
        role: 'user',
        content,
        timestamp: new Date(),
      }
      setAiMessages((prev) => [...prev, userMsg])

      // 创建流式占位消息
      const streamId = generateMsgId()
      const streamMsg: AIMessage = {
        id: streamId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      }
      setAiMessages((prev) => [...prev, streamMsg])

      // 模拟打字效果
      const fullReply = generateDynamicAIReply(content, {
        profile,
        metrics,
        records: trainingRecords,
        files: uploadedFiles,
        injuryRecords,
        decay,
      })
      let charIndex = 0
      const charsPerTick = Math.max(2, Math.floor(fullReply.length / 30))

      const tick = setInterval(() => {
        charIndex += charsPerTick
        if (charIndex >= fullReply.length) {
          clearInterval(tick)
          setAiMessages((prev) =>
            prev.map((m) =>
              m.id === streamId
                ? { ...m, content: fullReply, isStreaming: false }
                : m,
            ),
          )
        } else {
          setAiMessages((prev) =>
            prev.map((m) =>
              m.id === streamId
                ? { ...m, content: fullReply.slice(0, charIndex), isStreaming: true }
                : m,
            ),
          )
        }
      }, 40)
    },
    [profile, metrics, trainingRecords, uploadedFiles, injuryRecords],
  )

  const updateTrainingFeedback = useCallback(
    (id: string, feedback: 'easy' | 'normal' | 'tired') => {
      setTrainings((prev) =>
        prev.map((t) => (t.id === id ? { ...t, feedback } : t)),
      )
    },
    [],
  )

  const completeTraining = useCallback((id: string) => {
    setTrainings((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: 'completed' as const } : t)),
    )
  }, [])

  const selectTraining = useCallback((training: TrainingItem | null) => {
    setSelectedTraining(training)
  }, [])

  const selectRecord = useCallback((record: TrainingRecord | null) => {
    setSelectedRecord(record)
  }, [])

  const addTrainingRecord = useCallback(
    (record: Omit<TrainingRecord, 'id'>) => {
      const newRecord: TrainingRecord = {
        ...record,
        id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      }
      setTrainingRecords((prev) => {
        const updated = [newRecord, ...prev]
        // 自动重新计算指标（含伤病数据）
        setMetrics(calculateMetrics(updated, injuryRecords))
        return updated
      })
    },
    [injuryRecords],
  )

  // 核心：处理上传文件解析后的数据
  const processParsedData = useCallback(
    (records: TrainingRecord[], _fileId: string) => {
      setTrainingRecords((prev) => {
        const updated = [...records, ...prev]
        setMetrics(calculateMetrics(updated, injuryRecords))
        
        if (profile.vdot === null || profile.vdot === undefined) {
          const estimatedVDOT = estimateVDOTFromRecords(updated)
          if (estimatedVDOT !== null) {
            setProfile((currentProfile) => ({
              ...currentProfile,
              vdot: estimatedVDOT,
              vo2max: estimatedVDOT,
            }))
          }
        }
        
        return updated
      })
    },
    [profile.vdot, injuryRecords],
  )

  const setPhase = useCallback((phase: number) => {
    setCurrentPhase(phase)
  }, [])

  const nextWeek = useCallback(() => {
    setCurrentWeek((prev) => prev + 1)
  }, [])

  const prevWeek = useCallback(() => {
    setCurrentWeek((prev) => Math.max(prev - 1, 1))
  }, [])

  const addUploadedFile = useCallback((file: UploadedFile) => {
    setUploadedFiles((prev) => [file, ...prev])
  }, [])

  const removeUploadedFile = useCallback((fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId))
  }, [])

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfile((prev) => ({ ...prev, ...updates }))
  }, [])

  // ---- PRD 扩展方法 ----

  const addTraining = useCallback((training: TrainingItem) => {
    setTrainings((prev) => [...prev, training])
  }, [])

  const generateAndSetTrainingPlan = useCallback(() => {
    const template = getRecommendedTemplate(profile.goal, profile, decay?.decayLevel)
    const newPlan = generateTrainingPlan(template, profile, undefined, injuryRecords, decay?.decayedVDOT)
    setTrainings(newPlan)
  }, [profile, injuryRecords, decay])

  const updateTraining = useCallback((id: string, updates: Partial<TrainingItem>) => {
    setTrainings((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    )
  }, [])

  const deleteTraining = useCallback((id: string) => {
    setTrainings((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addInjuryRecord = useCallback(
    (record: Omit<InjuryRecord, 'id'>) => {
      const newRecord: InjuryRecord = {
        ...record,
        id: `injury_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      }
      setInjuryRecords((prev) => [newRecord, ...prev])
    },
    [],
  )

  const updateInjuryRecord = useCallback(
    (id: string, updates: Partial<InjuryRecord>) => {
      setInjuryRecords((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...updates } : r)),
      )
    },
    [],
  )

  const updateRecordInjury = useCallback(
    (recordId: string, injury: { parts: InjuryBodyPart[]; severity: string; description: string }) => {
      // 1. 预计算新的 InjuryRecord（用于metrics重算）
      let newInjuryRecord: InjuryRecord | null = null
      if (injury.parts.length > 0) {
        const severityMap: Record<string, 'mild' | 'moderate' | 'severe'> = {
          '轻微': 'mild',
          '中等': 'moderate',
          '严重': 'severe',
        }
        const record = trainingRecords.find(r => r.id === recordId)
        newInjuryRecord = {
          id: `injury_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          date: record?.date || new Date().toISOString().split('T')[0],
          parts: injury.parts,
          severity: severityMap[injury.severity] || 'mild',
          description: injury.description,
          trainingId: recordId,
          recovered: false,
        }
      }

      // 合并伤病记录（包含即将新增的）用于metrics重算
      const futureInjuryRecords = newInjuryRecord
        ? [newInjuryRecord, ...injuryRecords]
        : injuryRecords

      // 2. 更新训练记录 + 自动重算指标（含伤病数据）
      setTrainingRecords((prev) => {
        const updated = prev.map((r) =>
          r.id === recordId
            ? {
                ...r,
                injuryParts: injury.parts,
                injurySeverity: injury.severity,
                injuryDescription: injury.description,
              }
            : r,
        )
        setMetrics(calculateMetrics(updated, futureInjuryRecords))
        return updated
      })

      // 3. 如果有不适部位，创建全局 InjuryRecord（伤病同步全局）
      if (newInjuryRecord) {
        setInjuryRecords((prev) => [newInjuryRecord!, ...prev])
      }
    },
    [trainingRecords, injuryRecords],
  )

  const dismissAutoGenNotice = useCallback(() => {
    setPlanAutoGenerated(false)
    setAutoGenReason('')
  }, [])

  // ---- Context Value (useMemo 避免不必要重渲染) ----

  const value: AppContextValue = useMemo(() => ({
    profile,
    trainings,
    trainingRecords,
    aiMessages,
    setAiMessages,
    isAIChatOpen,
    selectedTraining,
    selectedRecord,
    metrics,
    currentPhase,
    currentWeek,
    uploadedFiles,
    isProfileComplete,
    hasTrainingData,
    injuryRecords,
    detailSourcePath,
    toggleAIChat,
    sendAIMessage,
    updateTrainingFeedback,
    completeTraining,
    selectTraining,
    selectRecord,
    addTrainingRecord,
    setPhase,
    nextWeek,
    prevWeek,
    addUploadedFile,
    removeUploadedFile,
    updateProfile,
    unreadNotifications,
    setUnreadNotifications,
    processParsedData,
    estimateVDOT: () => estimateVDOTFromRecords(trainingRecords),
    generateAndSetTrainingPlan,
    updateTraining,
    deleteTraining,
    addTraining,
    setTrainings,
    addInjuryRecord,
    updateInjuryRecord,
    updateRecordInjury,
    setDetailSourcePath,
    planAutoGenerated,
    setPlanAutoGenerated,
    autoGenReason,
    setAutoGenReason,
    dismissAutoGenNotice,
    decay,
    decayDismissed,
    dismissDecayNotice,
  }), [
    profile, trainings, trainingRecords, aiMessages, setAiMessages,
    isAIChatOpen, selectedTraining, selectedRecord, metrics,
    currentPhase, currentWeek, uploadedFiles,
    isProfileComplete, hasTrainingData, injuryRecords, detailSourcePath,
    toggleAIChat, sendAIMessage, updateTrainingFeedback, completeTraining,
    selectTraining, selectRecord, addTrainingRecord, setPhase,
    nextWeek, prevWeek, addUploadedFile, removeUploadedFile,
    updateProfile, unreadNotifications, setUnreadNotifications,
    processParsedData, trainingRecords, addTraining, setTrainings,
    addInjuryRecord, updateInjuryRecord, updateRecordInjury, setDetailSourcePath,
    planAutoGenerated, setPlanAutoGenerated, autoGenReason, setAutoGenReason, dismissAutoGenNotice,
    decay, decayDismissed, dismissDecayNotice,
  ])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

// ---- Hook ----

export function useAppContext(): AppContextValue {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider')
  }
  return context
}
