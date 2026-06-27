/**
 * DeepSeek API Service
 * Provides real AI conversation capabilities via DeepSeek API.
 */

import { buildDecayPromptSection, type FitnessDecayResult } from './fitnessDecay'

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'
// Note: In production, this should be proxied through backend to avoid exposing API key

export interface DeepSeekChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** 兼容旧代码 */
export type DeepSeekMessage = DeepSeekChatMessage

export interface ProfileContext {
  name: string
  age: number | null
  gender: string | null
  goal: string
  vdot: number | null
  weight?: number | null
  height?: number | null
  injuryHistory?: string
  restingHr?: number | null
  runningYears?: number | null
}

export interface MetricsContext {
  ctl: number | null
  atl: number | null
  injuryRisk: string
  fatigueScore: number | null
  weeklyDistance: number | null
  riskMessages?: string[]
}

export interface InjuryFeedbackContext {
  parts: string[]
  severity: string
  description: string
}

export interface InjuryRecordContext {
  parts: string[]
  severity: string
  description: string
  date: string
  recovered: boolean
  trainingId?: string
}

export interface RecentRunContext {
  date: string
  type: string
  distance: number
  avgPace: string
  avgHr: number
  injuryParts?: string[]
  injuryDescription?: string
}

interface DeepSeekResponse {
  id: string
  choices: Array<{
    index: number
    message: {
      role: string
      content: string
    }
    delta?: {
      content?: string
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * System prompt that defines the AI's persona and constraints
 */
const SYSTEM_PROMPT = `你是 EndureMate AI，一位经验丰富的马拉松训练科学顾问。你的知识体系基于 Jack Daniels《跑步方程式》、Matt Fitzgerald《80/20跑步法》、Dr. Andrew Coggan 训练负荷模型等权威理论。

【角色定位】
你是跑者的专属教练，不是泛化 AI。你只专注于：长跑训练科学、马拉松备赛、运动生理学、跑步伤病预防。超出这个范围的问题，请明确说"这不在我的专业范围内"。

【核心能力】
1. VDOT 系统：Jack Daniels VDOT ≈ VO2max（ml/kg/min），是跑步能力的综合指标。VDOT 每提升1，全马成绩约快4-5分钟。VDOT 55 对应5km约18:20，全马约3:11。
2. 训练区间（5区间体系）：
   - Z1 恢复区：最大摄氧配速的 59-65%，HRR 50-60%，对话式舒适
   - Z2 有氧基础：最大摄氧配速的 65-75%，HRR 60-75%，是耐力引擎核心，80%时间应在此区
   - Z3 马拉松配速：VDOT 的 75-83%，HRR 75-82%，专项配速适应
   - Z4 乳酸阈值：VDOT 的 83-88%，HRR 82-90%，节奏跑/阈值跑区间
   - Z5 VO2max：VDOT 的 95-102%，HRR 90-100%，5km 比赛配速，每周不超过 2 次
3. CTL/ATL/TSB（Performance Manager Chart）：
   - CTL（Fitness）= 42天指数加权平均训练负荷，每天衰减因子 e^(-1/42)
   - ATL（Fatigue）= 7天指数加权平均，每天衰减因子 e^(-1/7)
   - TSB（Form）= CTL - ATL；>5 状态好，-5~5 平衡，<-15 过度疲劳
   - 安全跑量增幅：每周不超过10%（黄金法则）
4. 80/20 法则：80%训练量应在低强度（Z1-Z2），20%在中高强度（Z3-Z5）
5. 周期化训练：基础期（8-12周）→ 进展期（4-8周）→ 巅峰期（2-4周）→ 减量期（2-3周）
6. 跑步伤病：跑者膝、足底筋膜炎、髂胫束综合征——均与跑量过快增长、力量不足有关

【回答规范】
1. 专业且可操作：给出具体配速（如"5:30-6:00/km"）、具体课表（如"4×1200m @ Z4 配速"），而非模糊建议
2. 数据驱动：有用户数据时必须引用具体数字，不用"某个值"代替
3. 引用依据：建议较复杂时说明理论来源（如"根据 Daniels VDOT 表"）
4. 诚实面对不确定性：如果无法基于有限数据作出判断，明确说明需要哪些额外信息
5. 安全第一：有伤病风险信号时，第一建议永远是减量或休息，而非继续训练

【格式规范】
- 使用 Markdown 格式：**加粗**关键数据，表格展示对比数据
- 用 🟢/🟡/🔴 表示安全/注意/警告级别
- 回答结构：问题诊断 → 具体建议 → 注意事项
- 长回答分章节，每个章节有明确小标题

【禁止行为】
- 不给出医疗诊断（"可能是应力性骨折"可以说，但"你骨折了"不行）
- 不凭空编造数据（如果没有数据，明确说"需要上传数据才能分析"）
- 不给出超出跑步训练范畴的建议
- 不对没有依据的话题过度自信`

/**
 * Build context-aware system messages based on user data
 */
function buildSystemPromptWithContext(
  profile: ProfileContext | undefined,
  metrics: MetricsContext | undefined,
  recordsCount: number,
  recentRuns?: RecentRunContext[],
  injuryRecords?: InjuryRecordContext[],
  decay?: FitnessDecayResult | null,
): string {
  let contextSection = ''

  if (profile && profile.name) {
    contextSection += `\n\n---\n【当前用户档案】\n`
    contextSection += `- 姓名: ${profile.name}\n`
    if (profile.age) contextSection += `- 年龄: ${profile.age}岁\n`
    if (profile.gender) contextSection += `- 性别: ${profile.gender}\n`
    if (profile.weight) contextSection += `- 体重: ${profile.weight}kg\n`
    if (profile.height) contextSection += `- 身高: ${profile.height}cm\n`
    if (profile.restingHr) contextSection += `- 静息心率: ${profile.restingHr} bpm（用于精准计算心率区间）\n`
    if (profile.goal) contextSection += `- 备赛目标: ${profile.goal}\n`
    if (profile.injuryHistory) contextSection += `- 伤病史: ${profile.injuryHistory}\n`
    if (profile.vdot) {
      contextSection += `- VDOT: ${profile.vdot}（VO2max ≈ ${profile.vdot} ml/kg/min）\n`
      contextSection += `- 能力等级: ${
        profile.vdot >= 60 ? '精英跑者（全马 sub-3 能力）' :
        profile.vdot >= 55 ? '进阶跑者（全马 sub-3:30 能力）' :
        profile.vdot >= 50 ? '中高级跑者（全马 sub-4 能力）' :
        profile.vdot >= 45 ? '中级跑者（全马 sub-4:30 能力）' :
        profile.vdot >= 40 ? '初中级跑者（全马 sub-5 能力）' : '初级跑者'
      }\n`
    } else {
      contextSection += `- VDOT: 未测算（建议用比赛成绩测算）\n`
    }
  }

  if (metrics && (metrics.ctl !== null || recordsCount > 0)) {
    contextSection += `\n【训练负荷数据】\n`
    contextSection += `- 累计训练记录: ${recordsCount}条\n`
    if (metrics.ctl !== null) {
      const tsb = (metrics.ctl ?? 0) - (metrics.atl ?? 0)
      contextSection += `- CTL（长期体能/Fitness）: ${metrics.ctl}\n`
      contextSection += `- ATL（近期疲劳/Fatigue）: ${metrics.atl}\n`
      contextSection += `- TSB（训练状态/Form）: ${tsb.toFixed(1)} → ${
        tsb > 10 ? '🟢 状态良好，适合比赛或高强度训练' :
        tsb > -5 ? '🟡 平衡状态，正常训练' :
        tsb > -15 ? '🟡 轻度疲劳，注意恢复' : '🔴 过度疲劳，建议减量'
      }\n`
      contextSection += `- 伤病风险: ${metrics.injuryRisk}\n`
      if (metrics.weeklyDistance !== null) {
        contextSection += `- 本周跑量: ${metrics.weeklyDistance}km\n`
      }
    }
    if (metrics.riskMessages && metrics.riskMessages.length > 0) {
      contextSection += `\n【自动风险识别】\n`
      metrics.riskMessages.forEach(msg => {
        contextSection += `- ${msg}\n`
      })
    }
  }

  if (recentRuns && recentRuns.length > 0) {
    contextSection += `\n【最近${Math.min(recentRuns.length, 5)}次训练】\n`
    recentRuns.slice(0, 5).forEach((run, i) => {
      contextSection += `${i + 1}. ${run.date} | ${run.type} | ${run.distance}km @ ${run.avgPace}/km`
      if (run.avgHr > 0) contextSection += ` | ${run.avgHr}bpm`
      if (run.injuryParts && run.injuryParts.length > 0) {
        contextSection += ` | ⚠️ 记录不适: ${run.injuryParts.join('、')}`
      }
      contextSection += '\n'
    })
  }

  // 伤病记录上下文（完整注入）
  if (injuryRecords && injuryRecords.length > 0) {
    const activeInjuries = injuryRecords.filter(r => !r.recovered)
    if (activeInjuries.length > 0) {
      const allParts = [...new Set(activeInjuries.flatMap(r => r.parts))]
      const hasSevere = activeInjuries.some(r => r.severity === 'severe')
      contextSection += `\n【伤病记录（活跃）】\n`
      contextSection += `- 活跃伤病数：${activeInjuries.length}条\n`
      contextSection += `- 不适部位：${allParts.join('、')}\n`
      contextSection += `- 严重程度：${hasSevere ? '🔴 存在严重伤病' : '🟡 有轻微到中度不适'}\n`
      activeInjuries.forEach((inj, i) => {
        const sevLabel = inj.severity === 'severe' ? '严重' : inj.severity === 'moderate' ? '中度' : '轻微'
        contextSection += `  ${i + 1}. [${sevLabel}] ${inj.parts.join('、')}`
        if (inj.description) contextSection += ` - ${inj.description}`
        contextSection += '\n'
      })
      contextSection += `- ⚠️ 训练计划已根据伤病情况自动调整\n`
    }
  }

  // 衰减评估注入
  if (decay) {
    contextSection += buildDecayPromptSection(decay)
  }

  if (!contextSection) {
    contextSection += '\n\n【当前状态】新用户，暂无个人数据和训练记录。请引导用户了解产品功能并收集基本信息。建议：1.去「个人档案」填写基本信息和训练目标；2.在「分析中心」上传 FIT/GPX/TCX 运动数据文件。'
  }

  return SYSTEM_PROMPT + contextSection
}

/**
 * Send a message to DeepSeek API and get streaming response
 * Uses fetch with ReadableStream for real-time token-by-token output
 */
export async function* streamChatToDeepSeek(
  userMessage: string,
  apiKey: string,
  history: DeepSeekMessage[],
  profile?: ProfileContext,
  metrics?: MetricsContext,
  recordsCount?: number,
  recentRuns?: RecentRunContext[],
  injuryRecords?: InjuryRecordContext[],
  decay?: FitnessDecayResult | null,
): AsyncGenerator<string> {
  const messages: DeepSeekMessage[] = [
    {
      role: 'system',
      content: buildSystemPromptWithContext(profile, metrics, recordsCount ?? 0, recentRuns, injuryRecords, decay),
    },
    ...history.slice(-12), // Keep last 12 messages for context
    { role: 'user', content: userMessage },
  ]

  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      temperature: 0.5, // 降低随机性，让回答更稳定专业
      max_tokens: 2048,
      stream: true, // Enable streaming
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error?.message || `API请求失败 (${response.status})`)
  }

  // Parse SSE (Server-Sent Events) stream
  const reader = response.body?.getReader()
  if (!reader) throw new Error('无法读取响应流')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || '' // Keep incomplete line in buffer

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed === 'data: [DONE]') continue

      if (trimmed.startsWith('data: ')) {
        try {
          const json: DeepSeekResponse = JSON.parse(trimmed.slice(6))
          const delta = json.choices[0]?.delta?.content
          if (delta) {
            yield delta // Yield each token chunk
          }
        } catch {
          // Skip malformed chunks
        }
      }
    }
  }
}

/**
 * Non-streaming version (fallback)
 */
export async function chatWithDeepSeek(
  userMessage: string,
  apiKey: string,
  history: DeepSeekMessage[],
  profile?: ProfileContext,
  metrics?: MetricsContext,
  recordsCount?: number,
  recentRuns?: RecentRunContext[],
  injuryRecords?: InjuryRecordContext[],
  decay?: FitnessDecayResult | null,
): Promise<string> {
  const messages: DeepSeekMessage[] = [
    {
      role: 'system',
      content: buildSystemPromptWithContext(profile, metrics, recordsCount ?? 0, recentRuns, injuryRecords, decay),
    },
    ...history.slice(-12),
    { role: 'user', content: userMessage },
  ]

  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      temperature: 0.5,
      max_tokens: 2048,
      stream: false,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error?.message || `API请求失败 (${response.status})`)
  }

  const data: DeepSeekResponse = await response.json()
  return data.choices[0]?.message?.content || '抱歉，我暂时无法回答这个问题。'
}

/**
 * Validate API key format (basic check)
 */
export function isValidApiKey(key: string): boolean {
  // DeepSeek keys start with 'sk-' and are reasonably long
  return /^sk-[a-zA-Z0-9]{20,}$/.test(key)
}
