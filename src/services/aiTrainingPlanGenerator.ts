/**
 * AI训练计划生成器
 * 基于最新运动科学研究，调用DeepSeek API生成个性化训练计划
 * 
 * 研究依据：
 * 1. British Journal of Sports Medicine 2025 - 单次距离骤增风险研究
 * 2. Jack Daniels Running Formula - VDOT配速系统
 * 3. 80/20法则 - 80%低强度 + 20%高强度
 * 4. 周期化训练理论 - 基础→进展→巅峰→减量
 */

import { chatWithDeepSeek, type ProfileContext, type MetricsContext, type RecentRunContext, type InjuryRecordContext } from './deepseek'
import type { FitnessDecayResult } from './fitnessDecay'

// ========================
// 类型定义
// ========================

export interface AIGeneratedTrainingPlan {
  weeks: AIGeneratedWeek[]
  summary: string
  scientificBasis: string[]
  keyAdjustments: string[]
}

export interface AIGeneratedWeek {
  weekNumber: number
  phase: string
  phaseDescription: string
  weeklyVolume: number
  days: AIGeneratedDay[]
}

export interface AIGeneratedDay {
  dayOfWeek: string
  type: 'rest' | 'easy' | 'tempo' | 'interval' | 'lsd' | 'strength' | 'fartlek' | 'hill' | 'recovery'
  title: string
  distance?: number
  pace?: string
  hrZone?: string
  duration?: number
  insight: string
  safetyNote?: string
}

// ========================
// 训练科学原则（最新研究）
// ========================

const TRAINING_SCIENCE_PRINCIPLES = `
【基于最新研究的训练原则 - 2025年更新】

1. 【单次距离风险控制 - BJSM 2025研究】
   - 核心发现：单次训练距离超过过去30天最长距离10%以上，损伤风险显著飙升
   - 10-30%增长：损伤风险增加64%
   - 30-100%增长：损伤风险增加52%
   - >100%增长：损伤风险增加128%
   - 正确做法：以30天内最长单次距离为基准，每次增幅不超过10%

2. 【停训恢复原则 - 基于实际水平】
   关键：恢复量必须基于用户的VDOT和训练史，不能一刀切！
   一个VDOT 41（半马1:25）的跑者停训59天，第一周跑30-40km是合理的，
   而不是5-6km。肌肉和心肺耐力会在停训期保留，只是速度能力下降。
   
   正确做法：
   - 根据VDOT和历史周跑量推算基准训练量
   - 短期停训(2-7天)：首跑降为基准80%，配速慢1-2分钟/公里
   - 中期停训(8-30天)：前两周基准60-70%，配速慢30-60秒/公里
   - 长期停训(>30天)：前两周基准50-60%，第3-4周逐步恢复到80-90%
   - 有多年训练史(3年+)的跑者：即使停训2个月，恢复速度比新手快2-3倍
   - 停训超过3个月：前两周基准40-50%，第3-4周恢复到70%

3. 【周期化训练 - Mayo Clinic研究】
   - 减量期(Taper)：赛前2周，跑量减少41-60%，保持强度
   - 马拉松减量：赛前19-22天
   - 5K/10K减量：赛前7-10天

4. 【80/20法则 - Matt Fitzgerald】
   - 80%训练量在Z1-Z2低强度区间
   - 20%在Z3-Z5中高强度区间
   - 高强度训练间隔至少48小时

5. 【力量训练整合】
   - 每周至少2次下肢力量训练
   - 重点：单腿蹲、臀桥、北欧腿弯举
   - 可预防50%以上跑步伤病

6. 【恢复与适应】
   - 结缔组织（肌腱、韧带）适应周期比肌肉长2-3倍
   - 每3周大训练量后安排1周减量周（3:1周期）
   - 跑后24小时内关节疼痛不应持续或增加
`

// ========================
// 构建AI提示词
// ========================

function buildTrainingPlanPrompt(
  profile: ProfileContext,
  metrics?: MetricsContext,
  recentRuns?: RecentRunContext[],
  injuryRecords?: InjuryRecordContext[],
  decay?: FitnessDecayResult | null,
  goal?: string,
): string {
  let prompt = `请为我生成一份个性化的跑步训练计划。

【用户档案】
- 年龄: ${profile.age || '未知'}岁
- 性别: ${profile.gender || '未知'}
- 体重: ${profile.weight || '未知'}kg
- 身高: ${profile.height || '未知'}cm
- 静息心率: ${profile.restingHr || 60} bpm
- VDOT: ${profile.vdot || '未测算'}
- 备赛目标: ${goal || profile.goal || '提升有氧能力'}
- 训练史: ${profile.runningYears || 0}年
- 伤病史: ${profile.injuryHistory || '无'}

`

  // 近期训练数据
  if (recentRuns && recentRuns.length > 0) {
    prompt += `【近期训练记录】\n`
    recentRuns.slice(0, 10).forEach((run, i) => {
      prompt += `${i + 1}. ${run.date} | ${run.type} | ${run.distance}km @ ${run.avgPace}/km | ${run.avgHr}bpm\n`
    })
    prompt += '\n'
  }

  // 当前训练负荷
  if (metrics && metrics.ctl !== null) {
    prompt += `【当前训练负荷】
- CTL(长期体能): ${metrics.ctl}
- ATL(近期疲劳): ${metrics.atl}
- TSB(训练状态): ${((metrics.ctl ?? 0) - (metrics.atl ?? 0)).toFixed(1)}
- 本周跑量: ${metrics.weeklyDistance || 0}km
- 伤病风险: ${metrics.injuryRisk}

`
  }

  // 伤病记录
  if (injuryRecords && injuryRecords.length > 0) {
    const activeInjuries = injuryRecords.filter(r => !r.recovered)
    if (activeInjuries.length > 0) {
      prompt += `【活跃伤病】\n`
      activeInjuries.forEach(inj => {
        const sevLabel = inj.severity === 'severe' ? '严重' : inj.severity === 'moderate' ? '中度' : '轻微'
        prompt += `- ${inj.parts.join('、')}: ${sevLabel} (${inj.description || '无描述'})\n`
      })
      prompt += '\n'
    }
  }

  // 体能衰减评估
  if (decay) {
    prompt += `【体能衰减评估】
- 衰减等级: ${decay.decayLevel}
- 衰减天数: ${decay.gapDays}天未跑步
- 原始VDOT: ${decay.originalVDOT}
- 衰减后VDOT: ${decay.decayedVDOT}
- 总体衰减: ${decay.totalDecayPercent}%
- 建议恢复过渡周数: ${decay.recoveryWeeks}周

`
  }

  prompt += TRAINING_SCIENCE_PRINCIPLES

  prompt += `
【请生成训练计划】

要求：
1. 根据用户当前体能水平和目标，设计6-12周的周期化训练计划
2. 第一周的训练量必须基于用户VDOT和训练史推算基准周跑量，然后按停训恢复系数调整
3. VDOT参考值：VDOT 35≈半马1:40（周跑量50-60km），VDOT 40≈半马1:27（周跑量60-70km），VDOT 45≈半马1:18（周跑量70-80km）
4. 即使完全停训，有3年以上训练史的跑者第一周也应达到基准量的50-60%
5. 每周跑量增幅不超过10%，单次训练距离增幅不超过30天最长距离的10%
6. 每周安排至少1-2次休息日，高强度训练不超过2次/周
7. 包含具体的配速建议（基于VDOT或心率区间）
8. 包含力量训练建议
9. 配速参考：轻松跑=VDOT配速+45~60秒/公里，节奏跑=VDOT配速，间歇跑=VDOT配速-5~10秒/公里

请按以下JSON格式输出（只输出JSON，不要其他文字）：

{
  "weeks": [
    {
      "weekNumber": 1,
      "phase": "基础期",
      "phaseDescription": "建立有氧基础，适应跑步节奏",
      "weeklyVolume": 35,
      "days": [
        {
          "dayOfWeek": "星期一",
          "type": "rest",
          "title": "休息",
          "insight": "休息恢复，让身体适应训练刺激"
        },
        {
          "dayOfWeek": "星期二",
          "type": "easy",
          "title": "轻松跑 8km",
          "distance": 8,
          "pace": "6:30-6:50",
          "hrZone": "Z2 有氧区间",
          "insight": "轻松有氧跑，建立基础耐力",
          "safetyNote": "保持能对话的强度"
        }
      ]
    }
  ],
  "summary": "计划概述...",
  "scientificBasis": ["依据1", "依据2"],
  "keyAdjustments": ["调整1", "调整2"]
}

dayOfWeek: 星期一/星期二/星期三/星期四/星期五/星期六/星期日
type: rest/easy/tempo/interval/lsd/strength/fartlek/hill/recovery
phase: 基础期/进展期/巅峰期/减量期

请确保生成的计划是科学、安全、可执行的。

重要提醒：请根据用户实际水平给出合理的训练量。一个VDOT 40+的半马选手，即使停训2个月：
- 第1周应有30-40km跑量，轻松跑8-10km/次
- 第2-3周逐步恢复到50-60km
- 第4-6周恢复到正常训练量60-70km
- 节奏跑、间歇跑等高强度训练在第3-4周引入
- 不要把有训练基础的人当成初学者！`

  return prompt
}

// ========================
// 解析AI返回的JSON
// ========================

function parseAIResponse(response: string): AIGeneratedTrainingPlan {
  // 尝试提取JSON（可能被markdown代码块包裹）
  let jsonStr = response
  
  // 移除markdown代码块
  const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    jsonStr = jsonMatch[1]
  }
  
  // 尝试找到JSON对象
  const objMatch = jsonStr.match(/\{[\s\S]*\}/)
  if (objMatch) {
    jsonStr = objMatch[0]
  }

  try {
    const parsed = JSON.parse(jsonStr)
    
    // 验证和清理数据
    const plan: AIGeneratedTrainingPlan = {
      weeks: (parsed.weeks || []).map((week: Record<string, unknown>) => ({
        weekNumber: week.weekNumber || 1,
        phase: week.phase || '基础期',
        phaseDescription: week.phaseDescription || '',
        weeklyVolume: week.weeklyVolume || 0,
        days: ((week.days as Array<Record<string, unknown>>) || []).map((day: Record<string, unknown>) => ({
          dayOfWeek: day.dayOfWeek || '星期一',
          type: validateDayType(day.type as string),
          title: day.title || '训练',
          distance: day.distance as number | undefined,
          pace: day.pace as string | undefined,
          hrZone: day.hrZone as string | undefined,
          duration: day.duration as number | undefined,
          insight: day.insight || '',
          safetyNote: day.safetyNote as string | undefined,
        })),
      })),
      summary: parsed.summary || 'AI生成的个性化训练计划',
      scientificBasis: parsed.scientificBasis || [],
      keyAdjustments: parsed.keyAdjustments || [],
    }

    return plan
  } catch (e) {
    console.error('解析AI训练计划失败:', e)
    throw new Error('无法解析AI返回的训练计划，请重试')
  }
}

function validateDayType(type: string): AIGeneratedDay['type'] {
  const validTypes: AIGeneratedDay['type'][] = ['rest', 'easy', 'tempo', 'interval', 'lsd', 'strength', 'fartlek', 'hill', 'recovery']
  return validTypes.includes(type as AIGeneratedDay['type']) ? type as AIGeneratedDay['type'] : 'easy'
}

// ========================
// 主函数：生成AI训练计划
// ========================

export async function generateAITrainingPlan(
  apiKey: string,
  profile: ProfileContext,
  metrics?: MetricsContext,
  recentRuns?: RecentRunContext[],
  injuryRecords?: InjuryRecordContext[],
  decay?: FitnessDecayResult | null,
  goal?: string,
): Promise<AIGeneratedTrainingPlan> {
  const prompt = buildTrainingPlanPrompt(profile, metrics, recentRuns, injuryRecords, decay, goal)
  
  // 使用非流式调用获取完整响应
  const response = await chatWithDeepSeek(
    prompt,
    apiKey,
    [], // 无历史对话
    profile,
    metrics,
    recentRuns?.length || 0,
    recentRuns,
    injuryRecords,
    decay,
  )

  return parseAIResponse(response)
}

// ========================
// 转换为应用内部格式
// ========================

import type { TrainingItem } from '../context/AppContext'

const dayNameToIndex: Record<string, number> = {
  '星期一': 0, '星期二': 1, '星期三': 2, '星期四': 3,
  '星期五': 4, '星期六': 5, '星期日': 6,
}

const zoneColorMap: Record<string, string> = {
  rest: 'bg-surface-variant',
  easy: 'bg-primary',
  tempo: 'bg-[#EF4444]',
  interval: 'bg-[#EF4444]',
  lsd: 'bg-[#F59E0B]',
  strength: 'bg-surface-variant',
  fartlek: 'bg-primary',
  hill: 'bg-[#EF4444]',
  recovery: 'bg-primary',
}

/**
 * 将AI生成的计划转换为TrainingItem格式
 */
export function convertToTrainingItems(plan: AIGeneratedTrainingPlan): TrainingItem[] {
  const items: TrainingItem[] = []

  for (const week of plan.weeks) {
    for (const day of week.days) {
      const dayIndex = dayNameToIndex[day.dayOfWeek] ?? 0
      
      items.push({
        id: `ai_plan_w${week.weekNumber}_d${dayIndex}`,
        day: day.dayOfWeek,
        title: day.title,
        type: day.type as TrainingItem['type'],
        distance: day.distance,
        duration: day.duration,
        pace: day.pace,
        hrZone: day.hrZone,
        zoneColor: zoneColorMap[day.type] || 'bg-primary',
        insight: day.insight,
        status: 'pending',
        week: week.weekNumber,
      })
    }
  }

  return items
}
