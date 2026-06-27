/**
 * 训练模板库 & 计划生成引擎
 * PRD 模块3.1-3.4
 * 
 * 包含：
 * - 标准训练模板（半马12周、全马16周、5K/10K速度、有氧重建）
 * - 安全约束规则
 * - 自适应调课机制
 * - 计划可解释化
 * - VDOT配速计算（基于Jack Daniels Running Formula）
 */

import type { TrainingItem, UserProfile, InjuryRecord } from '../context/AppContext'

// ========================
// VDOT配速计算 (Jack Daniels Running Formula)
// ========================

/** 根据VDOT计算各训练区间的实际配速 (秒/公里) */
function getPacesFromVDOT(vdot: number) {
  // VDOT与各强度配速的对应关系 (VDOT -> [easy, marathon, threshold, interval, rep])
  // 基于Jack Daniels Running Formula
  const vdotPaceTable: Record<number, { easy: number; marathon: number; threshold: number; interval: number; rep: number }> = {
    30: { easy: 420, marathon: 370, threshold: 345, interval: 310, rep: 280 },
    35: { easy: 390, marathon: 340, threshold: 318, interval: 288, rep: 260 },
    40: { easy: 360, marathon: 315, threshold: 295, interval: 267, rep: 240 },
    45: { easy: 336, marathon: 294, threshold: 275, interval: 250, rep: 225 },
    50: { easy: 315, marathon: 275, threshold: 258, interval: 235, rep: 212 },
    55: { easy: 298, marathon: 259, threshold: 243, interval: 222, rep: 200 },
    60: { easy: 282, marathon: 245, threshold: 230, interval: 210, rep: 190 },
    65: { easy: 270, marathon: 233, threshold: 218, interval: 200, rep: 182 },
  }

  // 找到最近的两个VDOT值做线性插值
  const keys = Object.keys(vdotPaceTable).map(Number).sort((a, b) => a - b)
  let lower = keys[0], upper = keys[keys.length - 1]

  for (let i = 0; i < keys.length - 1; i++) {
    if (vdot >= keys[i] && vdot <= keys[i + 1]) {
      lower = keys[i]
      upper = keys[i + 1]
      break
    }
  }

  if (vdot <= lower) return vdotPaceTable[lower]
  if (vdot >= upper) return vdotPaceTable[upper]

  const ratio = (vdot - lower) / (upper - lower)
  const lp = vdotPaceTable[lower]
  const hp = vdotPaceTable[upper]

  return {
    easy: Math.round(lp.easy + (hp.easy - lp.easy) * ratio),
    marathon: Math.round(lp.marathon + (hp.marathon - lp.marathon) * ratio),
    threshold: Math.round(lp.threshold + (hp.threshold - lp.threshold) * ratio),
    interval: Math.round(lp.interval + (hp.interval - lp.interval) * ratio),
    rep: Math.round(lp.rep + (hp.rep - lp.rep) * ratio),
  }
}

/** 将秒/公里转换为显示用的配速字符串 如 5:45 */
function formatPace(paceSec: number): string {
  const min = Math.floor(paceSec / 60)
  const sec = paceSec % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

/** 获取轻松跑配速范围 (Z2，约VDOT easy配速的±15秒) */
function getEasyPaceRange(paces: { easy: number }): string {
  const slow = formatPace(paces.easy + 15)
  const fast = formatPace(paces.easy - 15)
  return `${fast}-${slow}`
}

/** 获取节奏跑配速范围 (Z3-Z4 threshold) */
function getTempoPaceRange(paces: { threshold: number }): string {
  const fast = formatPace(paces.threshold - 5)
  const slow = formatPace(paces.threshold + 5)
  return `${fast}-${slow}`
}

/** 获取间歇跑配速范围 (Z5 interval) */
function getIntervalPaceRange(paces: { interval: number }): string {
  const fast = formatPace(paces.interval - 5)
  const slow = formatPace(paces.interval + 5)
  return `${fast}-${slow}`
}

/** 获取马拉松配速范围 */
function getMarathonPaceRange(paces: { marathon: number }): string {
  const fast = formatPace(paces.marathon - 5)
  const slow = formatPace(paces.marathon + 5)
  return `${fast}-${slow}`
}

/** 获取恢复跑配速 (慢于easy配速) */
function getRecoveryPaceRange(paces: { easy: number }): string {
  const fast = formatPace(paces.easy + 10)
  const slow = formatPace(paces.easy + 30)
  return `${fast}-${slow}`
}

/** 获取心率区间描述 */
function getHrZoneDescription(intensity: DayPattern['intensity'], profile: UserProfile): string {
  const maxHr = profile.age ? Math.round(220 - profile.age) : 190
  const restHr = profile.restingHr || 60
  const hrReserve = maxHr - restHr

  const zones: Record<string, string> = {
    recovery: `Z1 恢复区间 ${Math.round(restHr + hrReserve * 0.5)}-${Math.round(restHr + hrReserve * 0.6)}bpm`,
    easy: `Z2 有氧区间 ${Math.round(restHr + hrReserve * 0.6)}-${Math.round(restHr + hrReserve * 0.7)}bpm`,
    moderate: `Z3 节奏区间 ${Math.round(restHr + hrReserve * 0.7)}-${Math.round(restHr + hrReserve * 0.8)}bpm`,
    threshold: `Z4 乳酸阈值 ${Math.round(restHr + hrReserve * 0.8)}-${Math.round(restHr + hrReserve * 0.87)}bpm`,
    vo2max: `Z5 最大摄氧量 ${Math.round(restHr + hrReserve * 0.87)}-${Math.round(restHr + hrReserve * 1.0)}bpm`,
    none: '',
  }

  return zones[intensity] || ''
}

// ========================
// 训练模板库 (PRD 3.1)
// ========================

export interface TrainingTemplate {
  id: string
  name: string
  description: string
  totalWeeks: number
  targetDistance: string
  phases: TemplatePhase[]
}

export interface TemplatePhase {
  name: string
  weeks: number
  description: string
  pattern: WeeklyPattern
}

export interface WeeklyPattern {
  days: DayPattern[]
}

export interface DayPattern {
  type: 'rest' | 'easy' | 'tempo' | 'interval' | 'lsd' | 'progression' | 'fartlek' | 'hill' | 'strength'
  distanceKm?: number
  durationMin?: number
  intensity: 'recovery' | 'easy' | 'moderate' | 'threshold' | 'vo2max' | 'none'
  reps?: string
  insight: string
}

/** 半马12周入门备赛计划 */
const halfMarathonBeginner: TrainingTemplate = {
  id: 'half_beginner_12w',
  name: '半马入门12周',
  description: '适合能连续跑步5km的跑者，循序渐进备战半程马拉松',
  totalWeeks: 12,
  targetDistance: '半马 21.1km',
  phases: [
    {
      name: '基础积累',
      weeks: 4,
      description: '建立有氧基础，逐步增加跑量',
      pattern: {
        days: [
          { type: 'rest', intensity: 'none', insight: '休息恢复，肌肉修复' },
          { type: 'easy', distanceKm: 8, intensity: 'easy', insight: '轻松有氧跑，建立基础耐力' },
          { type: 'strength', durationMin: 30, intensity: 'none', insight: '核心及下肢力量训练' },
          { type: 'easy', distanceKm: 8, intensity: 'easy', insight: '有氧基础训练' },
          { type: 'fartlek', distanceKm: 8, intensity: 'moderate', reps: '8×(1分钟快+1分钟慢)', insight: '法特莱克变速跑，提升速度感知和心肺适应' },
          { type: 'lsd', distanceKm: 16, intensity: 'easy', insight: '长距离慢跑，建立耐力引擎' },
          { type: 'rest', intensity: 'none', insight: '休息日，充分恢复' },
        ]
      }
    },
    {
      name: '能力提升',
      weeks: 4,
      description: '引入强度训练，提升乳酸阈值',
      pattern: {
        days: [
          { type: 'rest', intensity: 'none', insight: '休息恢复' },
          { type: 'easy', distanceKm: 8, intensity: 'easy', insight: '轻松有氧跑' },
          { type: 'tempo', distanceKm: 10, intensity: 'threshold', insight: '乳酸阈值训练，提升清除乳酸能力' },
          { type: 'easy', distanceKm: 6, intensity: 'recovery', insight: '恢复性慢跑' },
          { type: 'interval', distanceKm: 10, intensity: 'vo2max', reps: '6×800m, 间歇2分钟', insight: 'VO2max间歇训练，提升最大摄氧量' },
          { type: 'lsd', distanceKm: 20, intensity: 'easy', insight: '长距离慢跑，接近半马距离的95%' },
          { type: 'rest', intensity: 'none', insight: '休息日' },
        ]
      }
    },
    {
      name: '专项强化',
      weeks: 3,
      description: '比赛配速训练，适应比赛节奏',
      pattern: {
        days: [
          { type: 'rest', intensity: 'none', insight: '休息恢复' },
          { type: 'easy', distanceKm: 8, intensity: 'easy', insight: '有氧基础训练' },
          { type: 'tempo', distanceKm: 12, intensity: 'moderate', insight: '半马配速跑，适应比赛节奏' },
          { type: 'easy', distanceKm: 6, intensity: 'recovery', insight: '恢复跑' },
          { type: 'interval', distanceKm: 10, intensity: 'vo2max', reps: '5×1000m, 间歇3分钟', insight: '速度耐力训练' },
          { type: 'lsd', distanceKm: 22, intensity: 'easy', insight: '长距离慢跑，超过半马距离建立信心' },
          { type: 'rest', intensity: 'none', insight: '休息日' },
        ]
      }
    },
    {
      name: '减量备战',
      weeks: 1,
      description: '减少训练量，充分休息备战',
      pattern: {
        days: [
          { type: 'rest', intensity: 'none', insight: '减量期：减少训练刺激' },
          { type: 'easy', distanceKm: 5, intensity: 'easy', insight: '保持有氧感觉' },
          { type: 'tempo', distanceKm: 4, intensity: 'moderate', insight: '短距离配速跑，保持速度感' },
          { type: 'rest', intensity: 'none', insight: '充分休息' },
          { type: 'easy', distanceKm: 3, intensity: 'recovery', insight: '赛前轻松跑，保持肌肉弹性' },
          { type: 'rest', intensity: 'none', insight: '赛前休息，保证比赛日最佳状态' },
          { type: 'rest', intensity: 'none', insight: '明天比赛！' },
        ]
      }
    }
  ]
}

/** 全马16周进阶备赛计划 */
const fullMarathonAdvanced: TrainingTemplate = {
  id: 'full_advanced_16w',
  name: '全马进阶16周',
  description: '适合有半马经验的跑者，目标全马完赛或PB',
  totalWeeks: 16,
  targetDistance: '全马 42.2km',
  phases: [
    {
      name: '基础积累',
      weeks: 5,
      description: '建立有氧基础，逐步增加跑量至周35km',
      pattern: {
        days: [
          { type: 'rest', intensity: 'none', insight: '休息恢复' },
          { type: 'easy', distanceKm: 8, intensity: 'easy', insight: '有氧基础跑' },
          { type: 'strength', durationMin: 30, intensity: 'none', insight: '核心及下肢力量训练' },
          { type: 'easy', distanceKm: 10, intensity: 'easy', insight: '有氧基础训练' },
          { type: 'fartlek', distanceKm: 10, intensity: 'moderate', reps: '10×(1分钟快+1分钟慢)', insight: '法特莱克变速跑，提升心肺适应' },
          { type: 'lsd', distanceKm: 16, intensity: 'easy', insight: '长距离慢跑，建立耐力基础' },
          { type: 'rest', intensity: 'none', insight: '休息日' },
        ]
      }
    },
    {
      name: '能力提升',
      weeks: 5,
      description: '引入强度训练，周跑量增至45km',
      pattern: {
        days: [
          { type: 'rest', intensity: 'none', insight: '休息恢复' },
          { type: 'easy', distanceKm: 8, intensity: 'easy', insight: '恢复跑' },
          { type: 'tempo', distanceKm: 10, intensity: 'threshold', insight: '乳酸阈值训练，提升清除乳酸能力' },
          { type: 'easy', distanceKm: 6, intensity: 'recovery', insight: '轻松恢复跑' },
          { type: 'interval', distanceKm: 10, intensity: 'vo2max', reps: '6×1000m, 间歇3分钟', insight: 'VO2max间歇训练，提升最大摄氧量' },
          { type: 'lsd', distanceKm: 24, intensity: 'easy', insight: '长距离慢跑，接近全马距离的57%' },
          { type: 'rest', intensity: 'none', insight: '休息日' },
        ]
      }
    },
    {
      name: '巅峰强化',
      weeks: 4,
      description: '最大跑量和强度，模拟比赛节奏',
      pattern: {
        days: [
          { type: 'rest', intensity: 'none', insight: '休息恢复' },
          { type: 'easy', distanceKm: 10, intensity: 'easy', insight: '有氧基础训练' },
          { type: 'tempo', distanceKm: 14, intensity: 'moderate', insight: '全马配速长距离跑，模拟比赛节奏' },
          { type: 'easy', distanceKm: 8, intensity: 'recovery', insight: '恢复跑' },
          { type: 'interval', distanceKm: 12, intensity: 'vo2max', reps: '5×1600m, 间歇3分钟', insight: '高强度间歇，提升速度耐力' },
          { type: 'lsd', distanceKm: 32, intensity: 'easy', insight: '最长距离慢跑，接近全马75%' },
          { type: 'rest', intensity: 'none', insight: '休息日' },
        ]
      }
    },
    {
      name: '减量备战',
      weeks: 2,
      description: '减少训练量至巅峰期的60%，充分恢复',
      pattern: {
        days: [
          { type: 'rest', intensity: 'none', insight: '减量期：减少训练刺激' },
          { type: 'easy', distanceKm: 6, intensity: 'easy', insight: '保持有氧感觉' },
          { type: 'tempo', distanceKm: 6, intensity: 'moderate', insight: '短距离全马配速跑' },
          { type: 'rest', intensity: 'none', insight: '充分休息' },
          { type: 'easy', distanceKm: 4, intensity: 'recovery', insight: '赛前轻松跑' },
          { type: 'rest', intensity: 'none', insight: '赛前休息' },
          { type: 'rest', intensity: 'none', insight: '明天比赛！保持最佳状态' },
        ]
      }
    }
  ]
}

/** 5K/10K速度专项训练计划 */
const speedTraining8w: TrainingTemplate = {
  id: 'speed_8w',
  name: '5K/10K速度专项8周',
  description: '适合有一定跑步基础，想提升5K/10K成绩的跑者',
  totalWeeks: 8,
  targetDistance: '5K/10K',
  phases: [
    {
      name: '速度基础',
      weeks: 3,
      description: '引入间歇训练，唤醒速度基因',
      pattern: {
        days: [
          { type: 'rest', intensity: 'none', insight: '休息恢复' },
          { type: 'easy', distanceKm: 6, intensity: 'easy', insight: '有氧基础跑' },
          { type: 'interval', distanceKm: 7, intensity: 'vo2max', reps: '8×400m, 间歇90秒', insight: '短距离间歇，提升跑步经济性' },
          { type: 'rest', intensity: 'none', insight: '主动恢复' },
          { type: 'tempo', distanceKm: 6, intensity: 'threshold', insight: '阈值跑，建立速度耐力' },
          { type: 'lsd', distanceKm: 10, intensity: 'easy', insight: '长距离慢跑，维持有氧基础' },
          { type: 'rest', intensity: 'none', insight: '休息日' },
        ]
      }
    },
    {
      name: '速度强化',
      weeks: 3,
      description: '增加间歇距离和配速要求',
      pattern: {
        days: [
          { type: 'rest', intensity: 'none', insight: '休息恢复' },
          { type: 'easy', distanceKm: 6, intensity: 'easy', insight: '恢复跑' },
          { type: 'interval', distanceKm: 8, intensity: 'vo2max', reps: '6×800m, 间歇2分钟', insight: '中距离间歇，提升VO2max' },
          { type: 'rest', intensity: 'none', insight: '主动恢复' },
          { type: 'tempo', distanceKm: 8, intensity: 'threshold', insight: '高强度阈值跑' },
          { type: 'lsd', distanceKm: 12, intensity: 'easy', insight: '长距离慢跑' },
          { type: 'rest', intensity: 'none', insight: '休息日' },
        ]
      }
    },
    {
      name: '赛前减量',
      weeks: 2,
      description: '减少训练量，保持速度感',
      pattern: {
        days: [
          { type: 'rest', intensity: 'none', insight: '减量期' },
          { type: 'easy', distanceKm: 5, intensity: 'easy', insight: '保持有氧感觉' },
          { type: 'interval', distanceKm: 5, intensity: 'vo2max', reps: '4×400m@比赛配速, 间歇90秒', insight: '赛前短间歇，保持速度感' },
          { type: 'rest', intensity: 'none', insight: '休息' },
          { type: 'easy', distanceKm: 3, intensity: 'recovery', insight: '轻松跑' },
          { type: 'rest', intensity: 'none', insight: '赛前休息' },
          { type: 'rest', intensity: 'none', insight: '明天比赛！' },
        ]
      }
    }
  ]
}

/** 有氧基础重建计划 */
const aerobicRebuild6w: TrainingTemplate = {
  id: 'aerobic_rebuild_6w',
  name: '有氧基础重建6周',
  description: '适合伤后回归或长时间停跑后的有氧重建',
  totalWeeks: 6,
  targetDistance: '有氧基础',
  phases: [
    {
      name: '适应恢复',
      weeks: 2,
      description: '低强度恢复，唤醒跑步习惯',
      pattern: {
        days: [
          { type: 'rest', intensity: 'none', insight: '休息恢复' },
          { type: 'easy', distanceKm: 3, intensity: 'recovery', insight: '极低强度慢跑，让身体重新适应跑步冲击' },
          { type: 'rest', intensity: 'none', insight: '休息日' },
          { type: 'easy', distanceKm: 3, intensity: 'recovery', insight: '轻松有氧跑' },
          { type: 'strength', durationMin: 20, intensity: 'none', insight: '核心力量训练，预防二次伤病' },
          { type: 'rest', intensity: 'none', insight: '休息日' },
          { type: 'rest', intensity: 'none', insight: '休息日' },
        ]
      }
    },
    {
      name: '逐步增加',
      weeks: 2,
      description: '缓慢增加跑量，周增幅不超过10%',
      pattern: {
        days: [
          { type: 'rest', intensity: 'none', insight: '休息恢复' },
          { type: 'easy', distanceKm: 4, intensity: 'recovery', insight: '逐步增加距离' },
          { type: 'rest', intensity: 'none', insight: '休息日' },
          { type: 'easy', distanceKm: 5, intensity: 'easy', insight: '有氧基础跑' },
          { type: 'fartlek', distanceKm: 5, intensity: 'moderate', reps: '6×(1分钟快+2分钟慢)', insight: '温和变速跑' },
          { type: 'rest', intensity: 'none', insight: '休息日' },
          { type: 'rest', intensity: 'none', insight: '休息日' },
        ]
      }
    },
    {
      name: '巩固基础',
      weeks: 2,
      description: '稳定跑量，巩固有氧能力',
      pattern: {
        days: [
          { type: 'rest', intensity: 'none', insight: '休息恢复' },
          { type: 'easy', distanceKm: 6, intensity: 'easy', insight: '有氧基础跑' },
          { type: 'tempo', distanceKm: 5, intensity: 'moderate', insight: '温和节奏跑，感受速度' },
          { type: 'rest', intensity: 'none', insight: '休息日' },
          { type: 'easy', distanceKm: 6, intensity: 'easy', insight: '有氧基础训练' },
          { type: 'lsd', distanceKm: 10, intensity: 'easy', insight: '恢复长距离能力' },
          { type: 'rest', intensity: 'none', insight: '休息日' },
        ]
      }
    }
  ]
}

/** 所有可用模板 */
export const trainingTemplates: TrainingTemplate[] = [
  halfMarathonBeginner,
  fullMarathonAdvanced,
  speedTraining8w,
  aerobicRebuild6w,
]

// ========================
// 安全约束规则 (PRD 3.2)
// ========================

export interface SafetyViolation {
  rule: string
  description: string
  severity: 'warning' | 'error'
}

/**
 * 检查周计划是否违反安全约束
 */
export function checkSafetyConstraints(weekTrainings: TrainingItem[]): SafetyViolation[] {
  const violations: SafetyViolation[] = []

  // 过滤掉休息日
  const activeDays = weekTrainings.filter(t => t.type !== 'rest')
  
  // 规则1: 高强度训练不超过2次/周
  const highIntensityDays = activeDays.filter(t => 
    t.type === 'interval' || t.type === 'tempo' || t.type === 'hill'
  )
  if (highIntensityDays.length > 2) {
    violations.push({
      rule: '高强度频次',
      description: `本周高强度训练 ${highIntensityDays.length} 次，超过安全上限（2次/周）`,
      severity: 'error'
    })
  }

  // 规则2: 高强度训练不连续排布
  const sortedDays = weekTrainings.map(t => ({
    dayIndex: ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'].indexOf(t.day),
    ...t
  })).sort((a, b) => a.dayIndex - b.dayIndex)
  
  for (let i = 0; i < sortedDays.length - 1; i++) {
    const curr = sortedDays[i]
    const next = sortedDays[i + 1]
    if (curr.dayIndex + 1 === next.dayIndex &&
        (curr.type === 'interval' || curr.type === 'tempo' || curr.type === 'hill') &&
        (next.type === 'interval' || next.type === 'tempo' || next.type === 'hill')) {
      violations.push({
        rule: '连续高强度',
        description: `${curr.day}和${next.day}连续安排高强度训练，中间应安排休息或轻松跑`,
        severity: 'error'
      })
    }
  }

  // 规则3: 检查是否有LSD（每周应固定排布）
  void activeDays.some(t => t.type === 'lsd') // hasLSD check
  // 规则4: 长距离后应有恢复日
  const lsdIndex = sortedDays.findIndex(t => t.type === 'lsd')
  if (lsdIndex >= 0 && lsdIndex < sortedDays.length - 1) {
    const nextDay = sortedDays[lsdIndex + 1]
    if (nextDay.type !== 'rest' && nextDay.type !== 'easy') {
      violations.push({
        rule: 'LSD后恢复',
        description: `长距离跑后次日应安排休息或轻松恢复跑`,
        severity: 'warning'
      })
    }
  }

  return violations
}

/**
 * 检查周跑量增幅是否超过10%
 */
export function checkWeeklyVolumeIncrease(
  currentWeekDistance: number,
  previousWeekDistance: number
): SafetyViolation | null {
  if (previousWeekDistance <= 0) return null
  const increasePercent = ((currentWeekDistance - previousWeekDistance) / previousWeekDistance) * 100
  if (increasePercent > 10) {
    return {
      rule: '跑量增幅',
      description: `本周跑量较上周增加 ${Math.round(increasePercent)}%，超过安全上限（10%）。建议减少至 ${Math.round(previousWeekDistance * 1.1)}km 以内`,
      severity: 'warning'
    }
  }
  return null
}

// ========================
// 自适应调课机制 (PRD 3.3)
// ========================

export type UserStatus = '正常' | '熬夜' | '疲惫' | '轻微不适' | '生病'

/**
 * 根据用户状态调整训练强度
 */
export function adjustForUserStatus(
  trainings: TrainingItem[],
  status: UserStatus
): TrainingItem[] {
  if (status === '正常') return trainings

  const intensityReduction: Record<UserStatus, number> = {
    '正常': 1,
    '熬夜': 0.85,
    '疲惫': 0.75,
    '轻微不适': 0.7,
    '生病': 0.5,
  }

  const factor = intensityReduction[status]

  return trainings.map(t => {
    if (t.type === 'rest') return t

    let adjustedDistance = t.distance
    let adjustedInsight = t.insight

    if (status === '生病') {
      // 生病：高强度训练改为休息或极轻量
      if (t.type === 'interval' || t.type === 'tempo' || t.type === 'hill') {
        return {
          ...t,
          type: 'rest' as const,
          title: '休息',
          distance: undefined,
          insight: `因身体不适，原${t.type === 'interval' ? '间歇跑' : t.type === 'tempo' ? '节奏跑' : '坡道跑'}已改为休息。身体恢复优先。`
        }
      }
      // 轻松跑/恢复跑改为极轻量或休息
      if (t.type === 'lsd' || (t.distance && t.distance > 8)) {
        return {
          ...t,
          type: 'easy' as const,
          distance: 3,
          insight: '因身体不适，长距离已缩短为30分钟轻松慢跑。'
        }
      }
    }

    // 其他状态：按比例降低距离
    if (adjustedDistance && adjustedDistance > 0) {
      adjustedDistance = Math.max(3, Math.round(adjustedDistance * factor * 10) / 10)
    }

    const statusLabels: Record<UserStatus, string> = {
      '正常': '',
      '熬夜': '因昨晚睡眠不足',
      '疲惫': '因近期疲劳积累',
      '轻微不适': '因身体轻微不适',
      '生病': '因身体不适',
    }

    adjustedInsight = `${statusLabels[status]}，${adjustedInsight}（训练量调整为${Math.round(factor * 100)}%）`

    return {
      ...t,
      distance: adjustedDistance,
      insight: adjustedInsight,
    }
  })
}

/**
 * 根据用户反馈调整后续训练
 */
export function adjustBasedOnFeedback(
  trainings: TrainingItem[],
  feedback: 'easy' | 'normal' | 'tired',
  fatigueScore: number | null
): TrainingItem[] {
  if (feedback === 'normal') return trainings

  return trainings.map(t => {
    if (t.type === 'rest') return t

    let adjustedInsight = t.insight

    if (feedback === 'easy') {
      // 轻松完成 → 适度增加下次训练量
      if (t.distance && t.distance > 0) {
        const increased = Math.min(t.distance * 1.1, t.distance + 2)
        adjustedInsight = `上次训练轻松完成，本次训练量适度增加。${t.insight}`
        return { ...t, distance: Math.round(increased * 10) / 10, insight: adjustedInsight }
      }
    } else if (feedback === 'tired') {
      // 疲惫未完成 → 降低训练强度
      if (t.type === 'interval' || t.type === 'tempo') {
        adjustedInsight = `上次训练有些吃力，本次高强度训练已降低配速要求。${t.insight}`
        return { ...t, type: 'easy' as const, insight: adjustedInsight }
      }
      if (t.distance && t.distance > 0) {
        const reduced = Math.max(3, t.distance * 0.8)
        adjustedInsight = `上次训练有些吃力，本次训练量适当降低。${t.insight}`
        return { ...t, distance: Math.round(reduced * 10) / 10, insight: adjustedInsight }
      }
    }

    // 疲劳评分高时额外降低（rest已在上面return）
    if (fatigueScore && fatigueScore > 70 && t.type !== 'easy') {
      return { ...t, type: 'easy' as const, insight: `疲劳评分偏高(${fatigueScore})，降低训练强度。${t.insight}` }
    }

    return t
  })
}

// ========================
// 漏课智能顺延 (PRD 3.3)
// ========================

/**
 * 将未完成的训练标记为skipped，不堆积
 */
export function handleMissedTraining(trainings: TrainingItem[], missedIds: string[]): TrainingItem[] {
  return trainings.map(t => {
    if (missedIds.includes(t.id)) {
      return {
        ...t,
        status: 'skipped' as const,
        insight: t.insight ? `（已跳过）${t.insight}` : '（已跳过）'
      }
    }
    return t
  })
}

// ========================
// 计划生成引擎 (PRD 3.4)
// ========================

const dayNames = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日']

const typeLabelMap: Record<string, string> = {
  rest: '休息',
  easy: '轻松跑',
  tempo: '节奏跑',
  interval: '间歇跑',
  lsd: '长距离慢跑',
  progression: '渐进跑',
  fartlek: '法特莱克',
  hill: '坡道重复',
  strength: '力量训练',
}

const zoneColorMap: Record<string, string> = {
  rest: 'bg-surface-variant',
  easy: 'bg-primary',
  tempo: 'bg-[#EF4444]',
  interval: 'bg-[#EF4444]',
  lsd: 'bg-[#F59E0B]',
  progression: 'bg-primary',
  fartlek: 'bg-primary',
  hill: 'bg-[#EF4444]',
  strength: 'bg-surface-variant',
}

/** 根据 DayPattern.intensity 和训练类型，计算实际配速字符串 */
function computePaceForDay(
  dayPattern: DayPattern,
  paces: ReturnType<typeof getPacesFromVDOT>
): string | undefined {
  if (dayPattern.intensity === 'none') return undefined

  switch (dayPattern.type) {
    case 'easy':
      return dayPattern.intensity === 'recovery'
        ? getRecoveryPaceRange(paces)
        : getEasyPaceRange(paces)
    case 'tempo':
      return dayPattern.intensity === 'threshold'
        ? getTempoPaceRange(paces)
        : getMarathonPaceRange(paces)
    case 'interval':
    case 'hill':
      return getIntervalPaceRange(paces)
    case 'lsd':
      return getEasyPaceRange(paces)
    case 'fartlek':
      return getMarathonPaceRange(paces)
    case 'progression':
      return getEasyPaceRange(paces)
    default:
      return undefined
  }
}

/**
 * 根据活跃伤病记录，生成伤病限制规则
 */
export function getInjuryRestrictions(injuryRecords: InjuryRecord[]): {
  maxDistanceFactor: number    // 距离限制系数（0.5-1.0）
  disabledTypes: string[]     // 禁止的训练类型
  avoidHills: boolean         // 避免坡道训练
  avoidLongRuns: boolean      // 避免长距离
  advice: string[]            // 伤病相关建议
} {
  const activeInjuries = injuryRecords.filter(r => !r.recovered)
  if (activeInjuries.length === 0) {
    return { maxDistanceFactor: 1.0, disabledTypes: [], avoidHills: false, avoidLongRuns: false, advice: [] }
  }

  const restrictions = {
    maxDistanceFactor: 1.0,
    disabledTypes: [] as string[],
    avoidHills: false,
    avoidLongRuns: false,
    advice: [] as string[],
  }

  // 分析伤病部位，生成对应限制
  const allParts = new Set<string>()
  activeInjuries.forEach(inj => inj.parts.forEach(p => allParts.add(p)))

  // 膝盖伤：禁止坡道、减少长距离、降低整体距离
  if (allParts.has('膝盖') || allParts.has('knee')) {
    restrictions.disabledTypes.push('hill')
    restrictions.avoidHills = true
    restrictions.avoidLongRuns = true
    restrictions.maxDistanceFactor = Math.min(restrictions.maxDistanceFactor, 0.7)
    restrictions.advice.push('膝盖不适：避免坡道训练和长距离跑，减少步幅冲击')
  }

  // 小腿/胫骨伤：减少跑量，避免速度训练
  if (allParts.has('小腿') || allParts.has('calf') || allParts.has('shin') || allParts.has('胫骨')) {
    restrictions.maxDistanceFactor = Math.min(restrictions.maxDistanceFactor, 0.6)
    restrictions.disabledTypes.push('interval')
    restrictions.disabledTypes.push('hill')
    restrictions.advice.push('小腿/胫骨不适：大幅减少跑量，暂停间歇训练')
  }

  // 足底/跟腱伤：避免长距离和高强度
  if (allParts.has('足底') || allParts.has('plantar') || allParts.has('跟腱') || allParts.has('achilles')) {
    restrictions.maxDistanceFactor = Math.min(restrictions.maxDistanceFactor, 0.65)
    restrictions.avoidLongRuns = true
    restrictions.disabledTypes.push('interval')
    restrictions.advice.push('足底/跟腱不适：暂停间歇跑，缩短长距离跑距离')
  }

  // 髋部/臀部伤：避免坡道和节奏跑
  if (allParts.has('髋部') || allParts.has('hip') || allParts.has('臀部')) {
    restrictions.disabledTypes.push('hill')
    restrictions.avoidHills = true
    restrictions.maxDistanceFactor = Math.min(restrictions.maxDistanceFactor, 0.75)
    restrictions.advice.push('髋部/臀部不适：避免坡道训练，适度降低跑量')
  }

  // 脚踝伤：避免速度训练和坡道
  if (allParts.has('脚踝') || allParts.has('ankle')) {
    restrictions.disabledTypes.push('hill')
    restrictions.avoidHills = true
    restrictions.disabledTypes.push('interval')
    restrictions.maxDistanceFactor = Math.min(restrictions.maxDistanceFactor, 0.7)
    restrictions.advice.push('脚踝不适：避免坡道和间歇训练，降低冲击')
  }

  // 腰部伤：降低整体强度
  if (allParts.has('腰部') || allParts.has('lower_back')) {
    restrictions.maxDistanceFactor = Math.min(restrictions.maxDistanceFactor, 0.8)
    restrictions.advice.push('腰部不适：注意跑姿，适当降低训练强度')
  }

  // 严重伤病进一步收紧限制
  const hasSevere = activeInjuries.some(i => i.severity === 'severe')
  if (hasSevere) {
    restrictions.maxDistanceFactor = Math.min(restrictions.maxDistanceFactor, 0.5)
    restrictions.disabledTypes.push('tempo')
    restrictions.advice.push('存在严重伤病：强烈建议以恢复跑为主，暂停所有高强度训练')
  }

  // 多部位受伤进一步收紧
  if (allParts.size >= 3) {
    restrictions.maxDistanceFactor = Math.min(restrictions.maxDistanceFactor, 0.5)
    restrictions.disabledTypes.push('tempo')
    restrictions.disabledTypes.push('interval')
    restrictions.advice.push('多部位不适：建议大幅降低训练量，优先恢复')
  }

  // 去重
  restrictions.disabledTypes = [...new Set(restrictions.disabledTypes)]

  return restrictions
}

/**
 * 根据模板和用户档案生成完整训练计划
 * 现在支持伤病数据和VDOT水平的联动
 */
export function generateTrainingPlan(
  template: TrainingTemplate,
  profile: UserProfile,
  _currentWeek?: number,
  injuryRecords?: InjuryRecord[],
  effectiveVDOT?: number,  // 衰减后VDOT，若传入则覆盖profile.vdot
): TrainingItem[] {
  const trainings: TrainingItem[] = []
  const maxDays = Math.min(profile.maxTrainingDaysPerWeek || 5, 7)

  // 根据VDOT计算各区间配速，优先使用衰减后VDOT
  const vdot = effectiveVDOT ?? profile.vdot ?? 40
  const paces = getPacesFromVDOT(vdot)

  // 获取伤病限制规则
  const restrictions = injuryRecords ? getInjuryRestrictions(injuryRecords) : null

  // 根据VDOT衰减比例计算停训恢复期的周跑量缩放系数
  // 有经验的跑者前2-3周逐步恢复，而不是一刀切降到极低量
  const decayRatio = effectiveVDOT && profile.vdot
    ? effectiveVDOT / profile.vdot  // 例: 0.8 = 衰减20%
    : 1.0
  const needsRecovery = decayRatio < 0.9 // 衰减超过10%才需要恢复缩放

  let weekCounter = 0

  for (const phase of template.phases) {
    for (let w = 0; w < phase.weeks; w++) {
      weekCounter++

      // 恢复期缩放：有经验的跑者前2-3周快速恢复
      // 停训2个月的VDOT 41跑者：W1=75%, W2=88%, W3=100%
      // 停训3个月+：W1=60%, W2=75%, W3=90%, W4=100%
      let volumeScale = 1.0
      if (needsRecovery && weekCounter <= 4) {
        const recoveryWeeks = decayRatio < 0.7 ? 4 : 3  // 衰减大→恢复期更长
        const startScale = Math.max(0.55, decayRatio + 0.05)  // 起始量不低于55%
        const step = (1.0 - startScale) / recoveryWeeks
        volumeScale = Math.min(1.0, startScale + step * (weekCounter - 1))
      }

      // 距离逐步递增（恢复期用更快的增幅10%，稳定期用7%）
      const isRecoveryPhase = needsRecovery && weekCounter <= 4
      const progressRate = isRecoveryPhase ? 0.10 : 0.07
      const weeklyProgressFactor = (1 + (w * progressRate) + ((phase.name === '基础积累' ? 0.03 : 0))) * volumeScale

      for (let d = 0; d < 7; d++) {
        const dayPattern = phase.pattern.days[d]
        if (!dayPattern) continue

        // 如果用户训练天数少于模板天数，部分训练日变为休息
        if (maxDays < 7) {
          const isActiveDay = isTrainingDay(d, dayPattern.type, maxDays)
          if (!isActiveDay && dayPattern.type !== 'rest') {
            continue
          }
        }

        // 伤病限制：跳过被禁止的训练类型
        if (restrictions && restrictions.disabledTypes.includes(dayPattern.type)) {
          // 改为恢复跑而非完全跳过
          if (dayPattern.type !== 'rest') {
            trainings.push({
              id: `tpl_${template.id}_w${weekCounter}_d${d}`,
              day: dayNames[d],
              title: `恢复跑（伤病调整）`,
              type: 'easy',
              distance: 3,
              duration: dayPattern.durationMin,
              pace: getRecoveryPaceRange(paces),
              hrZone: getHrZoneDescription('recovery', profile) || undefined,
              zoneColor: zoneColorMap['easy'],
              insight: `因伤病限制，原${typeLabelMap[dayPattern.type] || dayPattern.type}调整为轻松恢复跑。${restrictions.advice[0] || ''}`,
              status: 'pending',
              week: weekCounter,
            })
            continue
          }
        }

        let distance = dayPattern.distanceKm
          ? Math.round(dayPattern.distanceKm * weeklyProgressFactor * 10) / 10
          : undefined

        // 伤病限制：降低距离
        if (distance && restrictions && restrictions.maxDistanceFactor < 1.0) {
          distance = Math.round(distance * restrictions.maxDistanceFactor * 10) / 10
          distance = Math.max(3, distance) // 最少保留3km
        }

        // 伤病限制：LSD距离限制
        if (distance && restrictions && restrictions.avoidLongRuns && dayPattern.type === 'lsd') {
          distance = Math.min(distance, 12) // LSD最多12km
        }

        // 限制单次最长距离
        if (distance && profile.maxSingleDistance && distance > profile.maxSingleDistance) {
          distance = profile.maxSingleDistance
        }

        const title = dayPattern.type === 'rest'
          ? '休息'
          : distance
            ? `${typeLabelMap[dayPattern.type] || dayPattern.type} ${distance}km`
            : `${typeLabelMap[dayPattern.type] || dayPattern.type}`

        const insight = generateInsight(dayPattern, phase.name, weekCounter, profile)

        // 基于VDOT计算实际配速
        const pace = computePaceForDay(dayPattern, paces)

        // 心率区间描述
        const hrZone = getHrZoneDescription(dayPattern.intensity, profile) || undefined

        trainings.push({
          id: `tpl_${template.id}_w${weekCounter}_d${d}`,
          day: dayNames[d],
          title,
          type: dayPattern.type,
          distance,
          duration: dayPattern.durationMin,
          pace,
          hrZone,
          zoneColor: zoneColorMap[dayPattern.type] || 'bg-primary',
          insight,
          status: 'pending',
          week: weekCounter,
        })
      }
    }
  }

  return trainings
}

/**
 * 判断该天是否应该安排训练
 */
function isTrainingDay(dayIndex: number, type: string, maxDays: number): boolean {
  if (type === 'rest') return false
  
  // 优先保留：周末(5,6)的LSD + 工作日的强度训练 + 1个轻松跑
  const priority = [
    // 周六(6) LSD
    dayIndex === 6 && type === 'lsd',
    // 周日(5) LSD 或 长距离
    dayIndex === 5 && (type === 'lsd' || type === 'tempo'),
    // 周三(2) 强度训练
    dayIndex === 2 && (type === 'interval' || type === 'tempo'),
    // 周一(0) 或 周四(3) 轻松跑
    dayIndex === 3 && type === 'easy',
    // 周二(1) 训练
    dayIndex === 1 && (type !== 'rest'),
    // 周四(3) 任何训练
    dayIndex === 4 && type !== 'rest',
    // 周一(0)
    dayIndex === 0 && type !== 'rest',
  ]

  // 计算优先级匹配数
  const matchCount = priority.filter(Boolean).length

  // 根据maxDays决定保留规则
  if (maxDays <= 3) {
    return matchCount > 0 && matchCount <= 1
  }
  return matchCount > 0
}

/**
 * 生成训练目的说明（可解释化 PRD 3.4）
 */
function generateInsight(
  dayPattern: DayPattern,
  phaseName: string,
  _weekNum: number,
  _profile: UserProfile
): string {
  let insight = dayPattern.insight

  // 添加阶段上下文
  const phaseInsight: Record<string, string> = {
    '基础积累': `当前处于基础积累期，重点是建立有氧基础。`,
    '能力提升': `当前处于能力提升期，开始引入强度训练。`,
    '巅峰强化': `当前处于巅峰强化期，训练量接近峰值。`,
    '减量备战': `当前处于减量备战期，减少训练量充分恢复。`,
    '速度基础': `速度专项基础阶段，重点是唤醒速度能力。`,
    '速度强化': `速度专项强化阶段，提升比赛速度耐力。`,
    '赛前减量': `赛前减量阶段，保持速度感但减少总量。`,
    '适应恢复': `有氧重建适应期，低强度恢复为主。`,
    '逐步增加': `有氧重建增加期，缓慢增加跑量。`,
    '巩固基础': `有氧重建巩固期，稳定跑量巩固能力。`,
  }

  if (phaseInsight[phaseName]) {
    insight = `${phaseInsight[phaseName]}${insight}`
  }

  return insight
}

/**
 * 根据用户目标自动选择推荐模板
 */
export function getRecommendedTemplate(goal: string, profile: UserProfile, _decayLevel?: string): TrainingTemplate {
  const vdot = profile.vdot ?? 40
  const years = profile.runningYears ?? 0

  // 有经验的跑者(VDOT>=35 或 2年+训练史)即使衰减严重也不应该回到初学者模板
  const isExperienced = vdot >= 35 || years >= 2

  if (!goal) {
    return isExperienced ? halfMarathonBeginner : aerobicRebuild6w
  }

  if (goal.includes('半马')) {
    return halfMarathonBeginner
  }
  if (goal.includes('全马')) {
    if (!isExperienced) return halfMarathonBeginner
    return fullMarathonAdvanced
  }
  if (goal.includes('10K') || goal.includes('5K')) return speedTraining8w
  if (goal.includes('有氧')) return aerobicRebuild6w
  if (goal.includes('恢复')) return aerobicRebuild6w

  // 默认根据跑龄判断
  if (isExperienced) return halfMarathonBeginner
  return aerobicRebuild6w
}

/**
 * 生成周训练洞察（疲劳提示、伤病风险等）
 */
export function generateWeeklyInsights(
  weekTrainings: TrainingItem[],
  fatigueScore: number | null,
  _injuryRisk: string,
  injuryParts: string[]
): string[] {
  const insights: string[] = []
  const weekDistance = weekTrainings.reduce((sum, t) => sum + (t.distance || 0), 0)
  const highIntensityCount = weekTrainings.filter(t => 
    t.type === 'interval' || t.type === 'tempo' || t.type === 'hill'
  ).length

  // 疲劳相关洞察
  if (fatigueScore !== null) {
    if (fatigueScore > 70) {
      insights.push(`当前疲劳评分 ${fatigueScore}/100，处于高风险区间。建议将下次高强度训练改为轻松跑或休息。`)
    } else if (fatigueScore > 50) {
      insights.push(`疲劳评分 ${fatigueScore}/100，有轻度疲劳积累。保证充足睡眠和营养摄入。`)
    }
  }

  // 训练量洞察
  if (weekDistance > 50) {
    insights.push(`本周跑量 ${weekDistance.toFixed(1)}km，属于高强度训练周。注意赛后拉伸和泡沫轴放松。`)
  }

  // 高强度频次
  if (highIntensityCount >= 2) {
    insights.push(`本周已安排 ${highIntensityCount} 次高强度训练，已达到安全上限。其余训练日保持轻松有氧。`)
  }

  // 伤病相关洞察
  if (injuryParts.length > 0) {
    insights.push(`近期报告${injuryParts.join('、')}不适。建议减少高强度训练频次，增加恢复跑比例。`)
    if (injuryParts.includes('膝盖')) {
      insights.push('膝盖不适时建议：避免下坡跑、减小步幅、加强股四头肌力量训练。')
    }
    if (injuryParts.includes('小腿')) {
      insights.push('小腿不适时建议：降低跑量、增加小腿拉伸频率、检查跑鞋是否需要更换。')
    }
  }

  if (insights.length === 0) {
    insights.push('训练计划正常进行中，继续保持！')
  }

  return insights
}
