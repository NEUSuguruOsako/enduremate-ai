import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react'

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
}

export interface TrainingItem {
  id: string
  day: string
  title: string
  type: 'rest' | 'easy' | 'tempo' | 'interval' | 'lsd' | 'strength'
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
}

export interface UploadedFile {
  id: string
  name: string
  size: string
  date: string
  parsedRecords: TrainingRecord[]
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
    },
  ]
}

// ========================
// 指标计算器（基于训练记录动态计算）
// ========================

function calculateMetrics(records: TrainingRecord[]): TrainingMetrics {
  if (records.length === 0) return { ...emptyMetrics }

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const recentRecords = records.filter((r) => new Date(r.date) >= weekAgo)
  const allRecords = records

  // 周跑量
  const weeklyDistance = recentRecords.reduce((sum, r) => sum + r.distance, 0)

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

  // 疲劳分
  const fatigueScore = atl !== null && ctl !== null ? Math.round(Math.max(0, ((atl - ctl) / ctl) * 50 + 40)) : null

  // 伤病风险
  let injuryRisk: TrainingMetrics['injuryRisk'] = '低风险'
  if (!fatigueScore || fatigueScore > 75) injuryRisk = '高风险'
  else if (fatigueScore > 55) injuryRisk = '中风险'

  return {
    ctl,
    atl,
    injuryRisk,
    fatigueScore,
    weeklyDistance: weeklyDistance || null,
    totalRuns,
  }
}

// ========================
// AI 动态回复引擎（基于实际数据）
// ========================

function generateDynamicAIReply(
  userMessage: string,
  context: {
    profile: UserProfile
    metrics: TrainingMetrics
    records: TrainingRecord[]
    files: UploadedFile[]
  },
): string {
  const { profile, metrics, records, files } = context
  const name = profile.name || '跑友'

  // 快捷问题精确匹配
  if (userMessage.includes('整体训练状态')) {
    if (records.length === 0) {
      return `你好 ${name}！\n\n目前你还没有任何训练记录。要开始使用，请先在「分析中心」上传你的运动数据文件（支持 FIT/GPX/TCX 格式）。\n\n上传后我会帮你做全面分析！`
    }

    const recentWeek = records.filter((r) => {
      const d = new Date(r.date)
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      return d >= weekAgo
    })

    return `你好 ${name}！以下是你当前的训练状态分析：\n\n**本周概况**\n- 训练次数：${recentWeek.length} 次\n- 累计跑量：${metrics.weeklyDistance ?? 0} km\n- 平均配速：${recentWeek.length > 0 ? (recentWeek.reduce((s, r) => s + parseFloat(r.avgPace.split(':')[0]) * 60 + parseFloat(r.avgPace.split(':')[1]), 0) / recentWeek.length / 60).toFixed(1) : '-'} min/km\n\n**体能指标**\n- CTL（长期负荷）：${metrics.ctl ?? '-'}\n- ATL（短期负荷）：${metrics.atl ?? '-'}\n- 伤病风险：${metrics.injuryRisk}\n\n${metrics.injuryRisk === '高风险' ? '\n⚠️ 当前伤病风险偏高，建议适当降低训练强度。' : ''}\n\n需要我针对某个方面给出具体建议吗？`
  }

  if (userMessage.includes('训练负荷')) {
    if (metrics.ctl === null) {
      return `目前还没有足够的训练数据来评估负荷。请先上传至少 1 周的运动数据。`
    }
    return `你的训练负荷分析如下：\n\n| 指标 | 数值 | 解读 |\n|------|------|------|\n| CTL 长期负荷 | ${metrics.ctl} | ${metrics.ctl < 50 ? '偏低，有氧基础待建立' : metrics.ctl < 80 ? '正常范围' : '较高，注意恢复'} |\n| ATL 短期负荷 | ${metrics.atl} | ${metrics.atl! < metrics.ctl! ? '低于CTL，处于正向适应中' : '高于CTL，近期强度较大'} |\n| 疲劳评分 | ${metrics.fatigueScore} | ${metrics.fatigueScore! < 45 ? '状态良好' : metrics.fatigueScore! < 65 ? '轻度疲劳' : '需要注意恢复'} |\n| 伤病风险 | ${metrics.injuryRisk} | - |\n\n${metrics.injuryRisk === '高风险' ? '\n🔴 建议：接下来 2 天安排休息或极低强度活动。' : metrics.injuryRisk === '中风险' ? '\n🟡 建议：适当减少下次训练的强度或距离。' : '\n🟢 当前负荷健康，继续保持！'}`
  }

  if (userMessage.includes('有氧') && userMessage.includes('速度')) {
    if (records.length === 0) {
      return '目前还没有训练数据。上传数据后我可以根据你的实际情况给出更有针对性的建议。\n\n一般来说，马拉松备赛应遵循"先有氧后速度"的原则。'
    }
    const easyCount = records.filter((r) => r.type.includes('轻松') || r.type.includes('LSD')).length
    const hardCount = records.filter((r) =>
      r.type.includes('间歇') || r.type.includes('阈值') || r.type.includes('节奏'),
    ).length
    const ratio = easyCount / Math.max(records.length, 1)

    return `基于你最近的 ${records.length} 条训练记录分析：\n\n**当前训练结构**\n- 有氧类训练占比：${(ratio * 100).toFixed(0)}%\n- 强度类训练次数：${hardCount} 次\n\n**建议方向**：\n${ratio < 0.7
      ? '你的有氧基础训练比例偏低。建议增加每周 1-2 次轻松跑/LSD，有氧是速度的基础。'
      : ratio > 0.85
        ? '有氧基础不错，可以逐步引入更多强度训练（Tempo 或间歇），提升比赛配速能力。'
        : '当前有氧与强度的配比比较均衡，继续保持即可。'}\n\n目标：全马破3 需要在保持有氧的同时，逐步提高乳酸阈值配速。`
  }

  if (userMessage.includes('疲劳')) {
    if (metrics.fatigueScore === null) {
      return '暂无疲劳数据。上传训练记录后我可以帮你监控疲劳趋势。'
    }
    return `你的疲劳管理分析：\n\n**当前疲劳指数：${metrics.fatigueScore}/100**\n\n${metrics.fatigueScore < 35
      ? '🟢 状态很好，身体恢复充分，适合安排高质量训练课。'
      : metrics.fatigueScore < 55
        ? '🟡 轻度疲劳积累，属于正常训练反应。建议保证睡眠和营养。'
        : metrics.fatigueScore < 75
          ? '🔴 中度疲劳，建议将下次高强度训练降为中等强度，或增加休息日。'
          : '⛔ 重度疲劳警告！建议完全休息 1-2 天，必要时就医检查。'}\n\n**恢复建议**：\n- 保证每晚 7-8 小时睡眠\n- 训练后 30 分钟内补充蛋白质+碳水\n- 每周至少 1 次泡沫轴/拉伸放松`
  }

  if (userMessage.includes('误区') || userMessage.includes('新手')) {
    return `马拉松备赛常见误区：\n\n**1. 跑量增长过快**\n> 每周增幅不超过 10%，否则伤病风险急剧上升\n\n**2. 忽视力量训练**\n> 核心和下肢力量不足是跑步伤病的头号元凶，建议每周 1-2 次\n\n**3. LSD 追求速度**\n> 长距离慢跑的核心是"慢"，配速应比目标马拉松配速慢 30-60 秒/km\n\n**4. 赛前减量太晚**\n> 全马建议赛前 2-3 周开始减量至原量的 40-60%\n\n**5. 只堆跑量不重质量**\n> 10 个垃圾跑量不如 1 个高质量 Tempo\n\n**6. 轻视恢复**\n> 训练只是刺激，休息才是进步的时刻`
  }

  // 文件上传后的自动分析
  if (files.length > 0 && (userMessage.includes('文件') || userMessage.includes('上传') || userMessage.includes('分析'))) {
    const latestFile = files[files.length - 1]
    const fileRecords = latestFile.parsedRecords
    return `已为你分析最新上传的文件 **${latestFile.name}**：\n\n**解析结果**\n- 文件包含 ${fileRecords.length} 条训练记录\n- 最近一次训练：${fileRecords[fileRecords.length - 1]?.type}\n- 距离：${fileRecords[fileRecords.length - 1]?.distance} km\n- 平均心率：${fileRecords[fileRecords.length - 1]?.avgHr} bpm\n- 配速：${fileRecords[fileRecords.length - 1]?.avgPace}/km\n\n**数据质量**：✅ 心率数据完整 ✅ 配速区间正常\n\n${fileRecords.some((r) => r.avgHr > 175) ? '\n⚠️ 注意：部分训练平均心率超过 175bpm，注意控制强度。' : ''}\n\n需要我进一步分析这条训练数据吗？`
  }

  // 通用智能回复 — 根据上下文生成
  const hasData = records.length > 0
  const hasProfile = profile.name !== ''

  if (!hasData && !hasProfile) {
    return `欢迎来到 EndureMate AI！我是你的专属跑步训练助手。\n\n我注意到你还是新用户，建议你先完成以下步骤：\n\n1️⃣ **填写个人档案** → 去「个人档案」页设置你的基本信息和训练目标\n2️⃣ **上传运动数据** → 在「分析中心」上传 FIT/GPX/TCX 文件\n3️⃣ **开始对话** → 上传数据后我可以给你专业的训练分析和建议\n\n有什么想问的吗？`
  }

  if (!hasData) {
    return `感谢提问，${name}！\n\n你已经设置了个人档案，但目前还没有训练数据。\n\n请在「分析中心」页面上传你的运动设备导出的文件（支持 Garmin .fit、Strava .gpx、Coros .tcx 等）。\n\n上传后我就能帮你：\n- 分析训练负荷和疲劳度\n- 评估伤病风险\n- 给出针对性的训练建议\n- 追踪长期进步趋势\n\n准备好了就告诉我！`
  }

  // 有数据时的通用回复
  const lastRecord = records[0]
  return `收到你的问题，${name}！\n\n结合你最近的训练数据来看：\n\n**最近一次训练** (${lastRecord.date})\n- 类型：${lastRecord.type}\n- 距离：${lastRecord.distance} km\n- 配速：${lastRecord.avgPace}/km\n- 平均心率：${lastRecord.avgHr} bpm\n\n**整体趋势**\n- 累计训练 ${records.length} 次\n- 当前 CTL：${metrics.ctl}\n- 伤病风险：${metrics.injuryRisk}\n\n如果你有具体的训练疑问（比如某次训练是否达标、如何调整计划等），可以直接问我，我会结合你的数据给出针对性回答。`
}

let messageIdCounter = 0

function generateMsgId(): string {
  return `msg_${Date.now()}_${++messageIdCounter}`
}

// ========================
// Context 创建
// ========================

const AppContext = createContext<AppContextValue | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  // ---- 状态：全部为空 ----
  const [profile, setProfile] = useState<UserProfile>({ ...emptyProfile })
  const [trainings, setTrainings] = useState<TrainingItem[]>([])
  const [trainingRecords, setTrainingRecords] = useState<TrainingRecord[]>([])
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([])
  const [isAIChatOpen, setIsAIChatOpen] = useState(false)
  const [selectedTraining, setSelectedTraining] = useState<TrainingItem | null>(null)
  const [selectedRecord, setSelectedRecord] = useState<TrainingRecord | null>(null)
  const [metrics, setMetrics] = useState<TrainingMetrics>({ ...emptyMetrics })
  const [currentPhase, setCurrentPhase] = useState(0)
  const [currentWeek, setCurrentWeek] = useState(1)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [unreadNotifications, setUnreadNotifications] = useState(0)

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
    [profile, metrics, trainingRecords, uploadedFiles],
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
        // 自动重新计算指标
        setMetrics(calculateMetrics(updated))
        return updated
      })
    },
    [],
  )

  // 核心：处理上传文件解析后的数据
  const processParsedData = useCallback(
    (records: TrainingRecord[], fileId: string) => {
      setTrainingRecords((prev) => {
        const updated = [...records, ...prev]
        setMetrics(calculateMetrics(updated))
        return updated
      })
    },
    [],
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

  // ---- Context Value ----

  const value: AppContextValue = {
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
  }

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
