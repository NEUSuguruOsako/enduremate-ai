/**
 * 用户水平衰减评估引擎
 *
 * 基于运动生理学文献（停训/Detraining 研究）建立衰减模型：
 * - VO2max（最大摄氧量）衰减
 * - 肌肉耐力衰减
 * - 乳酸阈值衰减
 * - 速度能力衰减
 *
 * 考虑个体差异因子：年龄、训练年限、停训前训练频率
 */

import type { UserProfile, TrainingRecord, TrainingItem } from '../context/AppContext'

// ========================
// 类型定义
// ========================

export interface DecayDimension {
  vo2max: number       // 百分比，如 12 表示衰减 12%
  endurance: number    // 肌肉耐力衰减%
  threshold: number    // 乳酸阈值衰减%
  speed: number        // 速度能力衰减%
}

export type DecayLevel = 'none' | 'mild' | 'moderate' | 'significant' | 'severe'

export interface FitnessDecayResult {
  /** 衰减后等效VDOT */
  decayedVDOT: number
  /** 原始VDOT */
  originalVDOT: number
  /** 距上次训练天数 */
  gapDays: number
  /** 最后训练日期 */
  lastTrainingDate: string
  /** 各维度衰减百分比 */
  decayPercentage: DecayDimension
  /** 衰减等级 */
  decayLevel: DecayLevel
  /** 总体衰减百分比（各维度加权平均） */
  totalDecayPercent: number
  /** 建议恢复过渡周数 */
  recoveryWeeks: number
  /** 推荐训练模板ID */
  recommendedTemplate: string
  /** 中文摘要 */
  summary: string
}

// ========================
// 衰减模型常量
// ========================

/** 衰减触发阈值（天数） */
export const DECAY_THRESHOLD_DAYS = 7

/** 各停训时长区间的维度衰减范围 [min%, max%] */
interface DecayRange {
  daysMin: number
  daysMax: number
  vo2max: [number, number]
  endurance: [number, number]
  threshold: [number, number]
  speed: [number, number]
}

const DECAY_RANGES: DecayRange[] = [
  { daysMin: 0, daysMax: 7, vo2max: [0, 0], endurance: [0, 0], threshold: [0, 0], speed: [0, 0] },
  { daysMin: 8, daysMax: 14, vo2max: [1, 2], endurance: [2, 3], threshold: [1, 2], speed: [0, 1] },
  { daysMin: 15, daysMax: 30, vo2max: [4, 7], endurance: [6, 10], threshold: [5, 8], speed: [3, 5] },
  { daysMin: 31, daysMax: 60, vo2max: [7, 12], endurance: [10, 18], threshold: [8, 15], speed: [6, 10] },
  { daysMin: 61, daysMax: 90, vo2max: [12, 18], endurance: [18, 25], threshold: [15, 22], speed: [10, 16] },
  { daysMin: 91, daysMax: Infinity, vo2max: [18, 25], endurance: [25, 35], threshold: [22, 30], speed: [16, 22] },
]

/** 衰减等级判定 */
function getDecayLevel(totalDecay: number): DecayLevel {
  if (totalDecay <= 0) return 'none'
  if (totalDecay <= 5) return 'mild'
  if (totalDecay <= 12) return 'moderate'
  if (totalDecay <= 20) return 'significant'
  return 'severe'
}

/** 衰减等级对应的中文标签 */
const DECAY_LEVEL_LABELS: Record<DecayLevel, string> = {
  none: '无衰减',
  mild: '轻度衰减',
  moderate: '中度衰减',
  significant: '显著衰减',
  severe: '严重衰减',
}

// ========================
// 个体调整因子
// ========================

/**
 * 年龄衰减因子
 * 年龄越大，停训后水平下降越快
 */
function getAgeFactor(age: number | null): number {
  if (age === null) return 1.0
  if (age < 30) return 0.9
  if (age <= 40) return 1.0
  if (age <= 50) return 1.15
  return 1.3
}

/**
 * 训练年限因子
 * 训练年限越短（基础越不牢），停训后退步越快
 */
function getExperienceFactor(runningYears: number | null): number {
  if (runningYears === null) return 1.0
  if (runningYears < 1) return 1.2
  if (runningYears <= 3) return 1.0
  return 0.85
}

/**
 * 停训前训练频率因子
 * 从训练记录中分析停训前4周的平均每周训练次数
 */
function getFrequencyFactor(records: TrainingRecord[], lastDate: Date): number {
  const fourWeeksBefore = new Date(lastDate.getTime() - 28 * 24 * 60 * 60 * 1000)
  const recentRecords = records.filter(r => {
    const d = new Date(r.date)
    return d >= fourWeeksBefore && d <= lastDate
  })
  const avgPerWeek = recentRecords.length / 4
  if (avgPerWeek < 3) return 1.15
  if (avgPerWeek <= 5) return 1.0
  return 0.9
}

/** 总体个体因子 */
function getIndividualFactor(
  profile: UserProfile,
  records: TrainingRecord[],
  lastDate: Date,
): number {
  const ageFactor = getAgeFactor(profile.age)
  const expFactor = getExperienceFactor(profile.runningYears)
  const freqFactor = getFrequencyFactor(records, lastDate)

  // 三个因子相乘，限制在 0.6-1.5 范围内
  const combined = ageFactor * expFactor * freqFactor
  return Math.max(0.6, Math.min(1.5, combined))
}

// ========================
// 核心计算
// ========================

/**
 * 在 [min, max] 区间内，根据ratio线性插值
 */
function lerpRange(min: number, max: number, ratio: number): number {
  return Math.round((min + (max - min) * ratio) * 10) / 10
}

/**
 * 根据停训天数计算各维度衰减
 */
function computeDecayDimensions(gapDays: number): DecayDimension {
  for (const range of DECAY_RANGES) {
    if (gapDays >= range.daysMin && gapDays <= range.daysMax) {
      // 区间内线性插值
      const totalDays = range.daysMax - range.daysMin || 1
      const ratio = (gapDays - range.daysMin) / totalDays
      return {
        vo2max: lerpRange(range.vo2max[0], range.vo2max[1], ratio),
        endurance: lerpRange(range.endurance[0], range.endurance[1], ratio),
        threshold: lerpRange(range.threshold[0], range.threshold[1], ratio),
        speed: lerpRange(range.speed[0], range.speed[1], ratio),
      }
    }
  }
  // 超出定义范围 (>INFINITY)，使用最后一个区间最大值
  const last = DECAY_RANGES[DECAY_RANGES.length - 1]
  return {
    vo2max: last.vo2max[1],
    endurance: last.endurance[1],
    threshold: last.threshold[1],
    speed: last.speed[1],
  }
}

/** 维度权重（用于计算总体衰减百分比） */
const DIMENSION_WEIGHTS = { vo2max: 0.35, endurance: 0.30, threshold: 0.20, speed: 0.15 }

// ========================
// 检测最后训练日期
// ========================

/**
 * 从训练记录 + 训练计划完成状态中，综合判断最后有效训练日
 */
export function detectLastTrainingDate(
  trainingRecords: TrainingRecord[],
  trainings: TrainingItem[],
): { date: Date; source: 'record' | 'plan' } | null {
  let lastDate: Date | null = null
  let source: 'record' | 'plan' = 'record'

  // 1. 从训练记录中找最晚日期
  if (trainingRecords.length > 0) {
    const dates = trainingRecords.map(r => new Date(r.date))
    lastDate = new Date(Math.max(...dates.map(d => d.getTime())))
  }

  // 2. 从训练计划中找最近完成的训练
  if (trainings.length > 0) {
    const completedTrainings = trainings.filter(t => t.status === 'completed')
    if (completedTrainings.length > 0) {
      // 训练计划没有具体日期，用今天作为代理
      // 如果有 completed 的训练，说明用户近期有在按计划训练
      const today = new Date()
      if (!lastDate || today > lastDate) {
        lastDate = today
        source = 'plan'
      }
    } else {
      // 检查是否有 pending 的训练——说明计划还在进行中
      const pendingTrainings = trainings.filter(t => t.status === 'pending')
      if (pendingTrainings.length > 0 && !lastDate) {
        // 仅有pending无历史记录，不认为有有效训练
        return null
      }
    }
  }

  return lastDate ? { date: lastDate, source } : null
}

// ========================
// 主计算函数
// ========================

/**
 * 计算用户水平衰减
 *
 * @param profile 用户档案
 * @param trainingRecords 训练记录
 * @param trainings 训练计划（用于检测完成情况）
 * @returns 衰减结果，若无衰减返回 null
 */
export function calculateFitnessDecay(
  profile: UserProfile,
  trainingRecords: TrainingRecord[],
  trainings: TrainingItem[],
): FitnessDecayResult | null {
  // 1. 检测最后训练日期
  const lastTraining = detectLastTrainingDate(trainingRecords, trainings)
  if (!lastTraining) return null

  // 2. 计算距今天数
  const now = new Date()
  const gapMs = now.getTime() - lastTraining.date.getTime()
  const gapDays = Math.floor(gapMs / (24 * 60 * 60 * 1000))

  // 3. 未超过阈值，无衰减
  if (gapDays <= DECAY_THRESHOLD_DAYS) return null

  // 4. 计算基础衰减
  const baseDecay = computeDecayDimensions(gapDays)

  // 5. 个体因子调整
  const factor = getIndividualFactor(profile, trainingRecords, lastTraining.date)

  const decayPercentage: DecayDimension = {
    vo2max: Math.round(baseDecay.vo2max * factor * 10) / 10,
    endurance: Math.round(baseDecay.endurance * factor * 10) / 10,
    threshold: Math.round(baseDecay.threshold * factor * 10) / 10,
    speed: Math.round(baseDecay.speed * factor * 10) / 10,
  }

  // 6. 总体衰减（加权）
  const totalDecay = Math.round(
    (decayPercentage.vo2max * DIMENSION_WEIGHTS.vo2max +
     decayPercentage.endurance * DIMENSION_WEIGHTS.endurance +
     decayPercentage.threshold * DIMENSION_WEIGHTS.threshold +
     decayPercentage.speed * DIMENSION_WEIGHTS.speed) * 10
  ) / 10

  // 7. 衰减后VDOT
  const originalVDOT = profile.vdot ?? 40
  const decayedVDOT = Math.max(25, Math.round(originalVDOT * (1 - totalDecay / 100) * 10) / 10)

  // 8. 等级与建议
  const decayLevel = getDecayLevel(totalDecay)

  let recoveryWeeks: number
  let recommendedTemplate: string

  switch (decayLevel) {
    case 'none':
      recoveryWeeks = 0
      recommendedTemplate = 'current'
      break
    case 'mild':
      recoveryWeeks = 1
      recommendedTemplate = 'current_85pct'
      break
    case 'moderate':
      recoveryWeeks = 2
      recommendedTemplate = 'current_70pct'
      break
    case 'significant':
      recoveryWeeks = 3
      recommendedTemplate = 'aerobic_rebuild_6w_short'
      break
    case 'severe':
      recoveryWeeks = 4
      recommendedTemplate = 'aerobic_rebuild_6w'
      break
  }

  // 9. 生成摘要
  const templateLabel =
    recommendedTemplate === 'aerobic_rebuild_6w' ? '有氧基础重建6周（完整）' :
    recommendedTemplate === 'aerobic_rebuild_6w_short' ? '有氧基础重建（精简版）' :
    recommendedTemplate === 'current_70pct' ? '当前计划70%强度' :
    recommendedTemplate === 'current_85pct' ? '当前计划85%强度' :
    '当前计划'

  const summary = totalDecay <= 5
    ? `距上次训练 ${gapDays} 天，水平轻度下降，调整 ${recoveryWeeks} 周即可恢复`
    : totalDecay <= 12
      ? `距上次训练 ${gapDays} 天，各维度能力有明显下降，建议用 ${templateLabel} 过渡 ${recoveryWeeks} 周`
      : totalDecay <= 20
        ? `距上次训练 ${gapDays} 天，水平显著下降，必须降低强度，用 ${templateLabel} 过渡 ${recoveryWeeks} 周`
        : `距上次训练 ${gapDays} 天，水平严重衰减，应从 ${templateLabel} 开始，过渡 ${recoveryWeeks} 周后逐步恢复`

  return {
    decayedVDOT,
    originalVDOT,
    gapDays,
    lastTrainingDate: lastTraining.date.toISOString().split('T')[0],
    decayPercentage,
    decayLevel,
    totalDecayPercent: totalDecay,
    recoveryWeeks,
    recommendedTemplate,
    summary,
  }
}

/**
 * 构建衰减评估的 Prompt 注入段落
 */
export function buildDecayPromptSection(decay: FitnessDecayResult): string {
  const levelEmoji: Record<DecayLevel, string> = {
    none: '🟢',
    mild: '🟢',
    moderate: '🟡',
    significant: '🟡',
    severe: '🔴',
  }
  const levelLabel = DECAY_LEVEL_LABELS[decay.decayLevel]

  return `
【水平衰减评估】
- 距上次训练已过 ${decay.gapDays} 天（最后训练：${decay.lastTrainingDate}）
- 衰减等级：${levelEmoji[decay.decayLevel]} ${levelLabel}
- 等效 VDOT：${decay.originalVDOT} → ${decay.decayedVDOT}（下降 ${decay.totalDecayPercent}%）
- 各维度衰减：
  · VO2max（最大摄氧量）：-${decay.decayPercentage.vo2max}%
  · 肌肉耐力：-${decay.decayPercentage.endurance}%
  · 乳酸阈值：-${decay.decayPercentage.threshold}%
  · 速度能力：-${decay.decayPercentage.speed}%
- 恢复建议：建议先以衰减后水平（VDOT ${decay.decayedVDOT}）为基准，过渡 ${decay.recoveryWeeks} 周后再逐步恢复
- 摘要：${decay.summary}
- ⚠️ 请基于衰减后的水平（VDOT ${decay.decayedVDOT}）给出训练建议，不要直接使用用户的历史最佳数据（VDOT ${decay.originalVDOT}）。配速应相应放慢，距离应相应缩短，强度应相应降低。`
}

/**
 * 根据衰减等级获取调整后的强度系数（用于训练计划生成）
 */
export function getDecayIntensityFactor(decay: FitnessDecayResult): number {
  switch (decay.decayLevel) {
    case 'none': return 1.0
    case 'mild': return 0.85
    case 'moderate': return 0.70
    case 'significant': return 0.55
    case 'severe': return 0.40
  }
}
