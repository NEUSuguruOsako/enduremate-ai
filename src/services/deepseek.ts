/**
 * DeepSeek API Service
 * Provides real AI conversation capabilities via DeepSeek API.
 */

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'
// Note: In production, this should be proxied through backend to avoid exposing API key

export interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
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
const SYSTEM_PROMPT = `你是 EndureMate AI，一个专业的马拉松训练分析助手。你的核心职责：

【身份定位】
- 你是一位拥有丰富经验的跑步教练和运动科学分析师
- 你专注于严肃跑者的马拉松备赛需求（5K/10K/半马/全马）
- 你的建议必须基于运动科学原理，有据可循

【回答原则】
1. 专业性：所有建议基于运动科学（训练负荷、心率区间、乳酸阈值、VDOT等）
2. 安全性：始终把防伤放在第一位，宁可保守也不要激进
3. 可解释性：每条建议都要说明"为什么"，不给出无依据的结论
4. 数据驱动：当用户有训练数据时，结合具体数据分析；没有数据时给出通用专业建议
5. 不懂就说不懂：不要编造数据或给出模糊的套话

【知识领域】
- 马拉松周期化训练（基础期→进展期→巅峰期→减量期）
- 心率训练区间（五区体系）
- 训练负荷管理（CTL/ATL/TSB模型）
- VDOT跑力评估与配速推算
- 跑步伤病预防与恢复
- 营养与补给策略
- 赛前减量与比赛策略

【禁止行为】
- 不要给出医疗诊断建议（建议就医时明确说明）
- 不要推荐未经科学验证的训练方法
- 不要过度承诺效果
- 不要用过于口语化或不专业的表达

【回复格式】
- 使用清晰的分段结构
- 关键数据用加粗标注
- 重要提示用 emoji 标记（🟢安全 🟡注意 🔴警告）
- 适当使用表格展示对比信息`

interface ProfileContext {
  name: string
  age: number | null
  gender: string | null
  goal: string
  vdot: number | null
}

interface MetricsContext {
  ctl: number | null
  atl: number | null
  injuryRisk: string
  fatigueScore: number | null
  weeklyDistance: number | null
}

/**
 * Build context-aware system messages based on user data
 */
function buildSystemPromptWithContext(
  profile: ProfileContext | undefined,
  metrics: MetricsContext | undefined,
  recordsCount: number,
): string {
  let contextSection = ''

  if (profile && profile.name) {
    contextSection += `\n\n【当前用户信息】\n`
    contextSection += `- 姓名: ${profile.name}\n`
    if (profile.age) contextSection += `- 年龄: ${profile.age}岁\n`
    if (profile.gender) contextSection += `- 性别: ${profile.gender}\n`
    if (profile.goal) contextSection += `- 备赛目标: ${profile.goal}\n`
    if (profile.vdot) contextSection += `- VDOT: ${profile.vdot}\n`
  }

  if (metrics && (metrics.ctl !== null || recordsCount > 0)) {
    contextSection += `\n\n【当前训练数据】\n`
    contextSection += `- 累计训练记录: ${recordsCount}条\n`
    if (metrics.ctl !== null) {
      contextSection += `- CTL(长期负荷): ${metrics.ctl}\n`
      contextSection += `- ATL(短期负荷): ${metrics.atl}\n`
      contextSection += `- 疲劳评分: ${metrics.fatigueScore}/100\n`
      contextSection += `- 伤病风险: ${metrics.injuryRisk}\n`
      if (metrics.weeklyDistance !== null) {
        contextSection += `- 本周跑量: ${metrics.weeklyDistance}km\n`
      }
    }
  }

  if (!contextSection) {
    contextSection += '\n\n【当前状态】新用户，暂无个人数据和训练记录。请引导用户了解产品功能并收集基本信息。'
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
): AsyncGenerator<string> {
  const messages: DeepSeekMessage[] = [
    {
      role: 'system',
      content: buildSystemPromptWithContext(profile, metrics, recordsCount ?? 0),
    },
    ...history.slice(-10), // Keep last 10 messages for context
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
      temperature: 0.7,
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
): Promise<string> {
  const messages: DeepSeekMessage[] = [
    {
      role: 'system',
      content: buildSystemPromptWithContext(profile, metrics, recordsCount ?? 0),
    },
    ...history.slice(-10),
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
      temperature: 0.7,
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
