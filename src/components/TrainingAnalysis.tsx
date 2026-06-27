import React, { useState, useRef, useEffect, useCallback } from 'react'
import { usePrivacy } from '../context/PrivacyContext'
import type { TrainingRecord, TrainingChatMessage, TrainingItem } from '../context/AppContext'
import type { UserProfile, TrainingMetrics } from '../context/AppContext'

interface TrainingAnalysisProps {
  record: TrainingRecord | TrainingItem
  profile: UserProfile
  metrics: TrainingMetrics
}

/** 判断是已完成的训练记录还是未来的训练计划 */
function isTrainingRecord(obj: TrainingRecord | TrainingItem): obj is TrainingRecord {
  return 'avgPace' in obj && 'avgHr' in obj
}

// 已完成训练的快捷问题
const QUICK_QUESTIONS_COMPLETED = [
  '本节课的训练目的是什么？',
  '本次训练整体质量是否达标？',
  '心率/配速数据是否异常？',
  '是否存在过度训练风险？',
  '下次同类型训练怎么调整？',
]

// 未来课表的快捷问题
const QUICK_QUESTIONS_FUTURE = [
  '本节课的训练目的是什么？',
  '本节课的强度适配逻辑是什么？',
  '我该如何完成这节课？',
  '如果无法完成有什么替代方案？',
  '比赛前本节课需要注意什么？',
]

function generateMsgId(): string {
  return `tc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/** 简单的 Markdown 渲染函数 */
function renderMarkdown(text: string): React.ReactNode {
  // 按行分割
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  
  let inList = false
  let listItems: React.ReactNode[] = []
  
  const processInline = (line: string): React.ReactNode => {
    // 处理 **加粗**
    const parts = line.split(/(\*\*[^*]+\*\*)/)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
      }
      return part
    })
  }
  
  lines.forEach((line, idx) => {
    const trimmed = line.trim()
    
    // 空行
    if (trimmed === '') {
      if (inList && listItems.length > 0) {
        elements.push(<ul key={`list-${idx}`} className="list-disc pl-5 my-2 space-y-1">{listItems}</ul>)
        listItems = []
        inList = false
      }
      return
    }
    
    // 分隔线 ---
    if (trimmed === '---' || trimmed === '***') {
      elements.push(<hr key={idx} className="my-3 border-border-subtle" />)
      return
    }
    
    // 标题 ### 或 【标题】
    if (trimmed.startsWith('### ')) {
      elements.push(<h3 key={idx} className="font-semibold text-text-primary mt-3 mb-1">{trimmed.slice(4)}</h3>)
      return
    }
    if (trimmed.startsWith('【') && trimmed.endsWith('】')) {
      elements.push(<h4 key={idx} className="font-semibold text-text-primary mt-3 mb-1">{trimmed}</h4>)
      return
    }
    
    // 列表项 - 或 *
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      inList = true
      listItems.push(<li key={idx} className="text-text-primary">{processInline(trimmed.slice(2))}</li>)
      return
    }
    
    // 普通段落
    if (inList && listItems.length > 0) {
      elements.push(<ul key={`list-${idx}`} className="list-disc pl-5 my-2 space-y-1">{listItems}</ul>)
      listItems = []
      inList = false
    }
    elements.push(<p key={idx} className="my-1">{processInline(trimmed)}</p>)
  })
  
  // 结束时如果有未关闭的列表
  if (listItems.length > 0) {
    elements.push(<ul key="list-end" className="list-disc pl-5 my-2 space-y-1">{listItems}</ul>)
  }
  
  return <div className="prose prose-sm max-w-none">{elements}</div>
}

/** 构建单训练专属 System Prompt */
function buildTrainingAnalysisPrompt(
  record: TrainingRecord | TrainingItem,
  profile: UserProfile,
  metrics: TrainingMetrics,
): string {
  const name = profile.name || '跑友'
  const isCompleted = isTrainingRecord(record)

  // ===== 训练数据 =====
  let dataSection = ''

  if (isCompleted) {
    const rec = record as TrainingRecord
    dataSection += `【本次训练数据（已完成）】\n`
    dataSection += `- 日期：${rec.date}\n`
    dataSection += `- 类型：${rec.type}\n`
    dataSection += `- 距离：${rec.distance.toFixed(1)} km\n`
    dataSection += `- 时长：${rec.duration}\n`
    dataSection += `- 平均配速：${rec.avgPace}/km\n`
    dataSection += `- 平均心率：${rec.avgHr} bpm\n`
    dataSection += `- 最大心率：${rec.maxHr} bpm\n`
    dataSection += `- 消耗热量：${rec.calories} kcal\n`

    // 跑步动态
    if (rec.dynamics) {
      dataSection += `\n【跑步动态】\n`
      const c = rec.dynamics.avgCadence ?? rec.dynamics.cadence ?? 0
      const sl = rec.dynamics.avgStepLength ?? rec.dynamics.strideLength ?? 0
      const vo = rec.dynamics.avgVerticalOscillation ?? rec.dynamics.verticalOscillation ?? 0
      const vr = rec.dynamics.avgVerticalRatio ?? rec.dynamics.verticalRatio ?? 0
      const st = rec.dynamics.avgStanceTime ?? rec.dynamics.groundContactTime ?? 0
      const ap = rec.dynamics.avgPower ?? rec.dynamics.power ?? 0
      if (c > 0) dataSection += `- 平均步频：${c} spm\n`
      if (sl > 0) dataSection += `- 平均步幅：${sl} mm\n`
      if (vo > 0) dataSection += `- 垂直振幅：${vo} mm\n`
      if (vr > 0) dataSection += `- 垂直比率：${vr}%\n`
      if (st > 0) dataSection += `- 触地时间：${st} ms\n`
      if (ap > 0) dataSection += `- 平均功率：${ap} W\n`
    }

    // 圈数据
    if (rec.laps && rec.laps.length > 0) {
      dataSection += `\n【圈/公里数据】（共${rec.laps.length}圈）\n`
      rec.laps.forEach((lap, i) => {
        const paceMin = Math.floor(lap.avgPace / 60)
        const paceSec = Math.round(lap.avgPace % 60)
        dataSection += `  ${i + 1}. ${lap.distance.toFixed(1)}km ${lap.duration}s @ ${paceMin}:${paceSec.toString().padStart(2, '0')}/km ${lap.avgHr}bpm\n`
      })
    }

    // 伤病反馈
    if (rec.injuryParts && rec.injuryParts.length > 0) {
      dataSection += `\n【本次训练伤病反馈】\n`
      dataSection += `- 不适部位：${rec.injuryParts.join('、')}\n`
      dataSection += `- 严重程度：${rec.injurySeverity || '未标注'}\n`
      if (rec.injuryDescription) dataSection += `- 描述：${rec.injuryDescription}\n`
    }
  } else {
    // 未来训练：只有计划
    const item = record as TrainingItem
    dataSection += `【本次训练计划（未执行）】\n`
    dataSection += `- 训练日：${item.day}\n`
    dataSection += `- 课程名称：${item.title}\n`
    dataSection += `- 训练类型：${item.type}\n`
    if (item.distance) dataSection += `- 计划距离：${item.distance} km\n`
    if (item.pace) dataSection += `- 目标配速：${item.pace}/km\n`
    if (item.hrZone) dataSection += `- 目标心率区间：${item.hrZone}\n`
    if (item.insight) dataSection += `- 训练目的说明：${item.insight}\n`
    dataSection += `\n（注意：这是一节未来的训练课，尚未执行，没有真实数据。请围绕训练目的、完成策略、注意事项回答。）\n`
  }

  // ===== 用户档案 =====
  let profileSection = `\n【用户档案】\n`
  profileSection += `- 姓名：${name}\n`
  if (profile.age) profileSection += `- 年龄：${profile.age}岁\n`
  if (profile.gender) profileSection += `- 性别：${profile.gender}\n`
  if (profile.vdot) {
    const hrmax = Math.round(208 - 0.7 * (profile.age || 30))
    const rhr = profile.restingHr || 55
    const zones = [
      { name: 'Z1 恢复', low: Math.round(rhr + (hrmax - rhr) * 0.50), high: Math.round(rhr + (hrmax - rhr) * 0.60) },
      { name: 'Z2 有氧', low: Math.round(rhr + (hrmax - rhr) * 0.60), high: Math.round(rhr + (hrmax - rhr) * 0.75) },
      { name: 'Z3 马拉松', low: Math.round(rhr + (hrmax - rhr) * 0.75), high: Math.round(rhr + (hrmax - rhr) * 0.82) },
      { name: 'Z4 阈值', low: Math.round(rhr + (hrmax - rhr) * 0.82), high: Math.round(rhr + (hrmax - rhr) * 0.90) },
      { name: 'Z5 VO2max', low: Math.round(rhr + (hrmax - rhr) * 0.90), high: hrmax },
    ]
    profileSection += `- VDOT：${profile.vdot}（VO2max ≈ ${profile.vdot} ml/kg/min）\n`
    profileSection += `- 心率区间（HRmax=${hrmax}，静息HR=${rhr}）：\n`
    zones.forEach((z) => {
      profileSection += `  · ${z.name}：${z.low}-${z.high} bpm\n`
    })
  }
  if (profile.goal) profileSection += `- 备赛目标：${profile.goal}\n`
  if (profile.injuryHistory) profileSection += `- 伤病史：${profile.injuryHistory}\n`

  // ===== 训练负荷背景 =====
  let metricsSection = ''
  if (metrics.ctl !== null) {
    const tsb = (metrics.ctl ?? 0) - (metrics.atl ?? 0)
    metricsSection += `\n【训练负荷背景】\n`
    metricsSection += `- CTL（长期体能）：${metrics.ctl}\n`
    metricsSection += `- ATL（近期疲劳）：${metrics.atl}\n`
    metricsSection += `- TSB（训练压力平衡）：${tsb.toFixed(1)}\n`
    metricsSection += `- 伤病风险：${metrics.injuryRisk}\n`
  }

  // ===== System Prompt =====
  const isFuture = !isCompleted
  const formatInstructions = isCompleted ? `
【回答格式要求】
1. 重点分析本次训练数据：步频、步幅、心率、配速等指标，找出不足之处
2. 回答结构清晰，使用【】标记章节标题
3. 每个分析点独立成段，避免大段文字
4. 数据指标与改进建议对应

示例格式：
【数据分析】
- 步频：XXX spm，低于推荐值170-180，建议提高
- 心率：平均XXX bpm，处于ZX区间，强度适中

【不足之处】
- 步频偏低，影响跑步经济性
- 后半程配速下降明显

【改进建议】
- 使用节拍器训练，目标170+ spm
- 下次训练前半程适当放慢
` : ''

  const systemPrompt = `你是 EndureMate AI 的单训练专属教练。${isFuture ? '用户正在查看一节未来的训练课（尚未执行），请围绕训练目的、完成策略、注意事项进行回答。' : '用户正在复盘一节已完成的训练，请结合真实数据给出专业分析。'}

【回答约束】
1. 严格绑定当前单次训练${isFuture ? '计划' : '数据'}，不延伸无关内容
2. 结合用户跑力、训练负荷背景作答
3. 不随意生成新课表，不虚构数据
4. 专业、可操作、有具体建议
${formatInstructions}
${dataSection}
${profileSection}
${metricsSection}`

  return systemPrompt
}

// ========================
// 单训练AI分析组件
// ========================

export default function TrainingAnalysis({ record, profile, metrics: _metrics }: TrainingAnalysisProps) {
  const { getActiveApiConfig } = usePrivacy()
  const [expanded, setExpanded] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [_isStreaming, setIsStreaming] = useState(false)
  const [chatHistory, setChatHistory] = useState<TrainingChatMessage[]>(() => {
    // 从 localStorage 恢复当前训练的对话记录
    try {
      const key = `enduremate_training_chat_${(record as TrainingRecord).id || (record as TrainingItem).id || 'default'}`
      const saved = localStorage.getItem(key)
      if (saved) return JSON.parse(saved) as TrainingChatMessage[]
    } catch {}
    return []
  })

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const isCompleted = isTrainingRecord(record)
  const quickQuestions = isCompleted ? QUICK_QUESTIONS_COMPLETED : QUICK_QUESTIONS_FUTURE

  // 持久化对话记录
  useEffect(() => {
    try {
      const key = `enduremate_training_chat_${(record as TrainingRecord).id || (record as TrainingItem).id || 'default'}`
      localStorage.setItem(key, JSON.stringify(chatHistory))
    } catch {}
  }, [chatHistory, record])

  // 自动滚动
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  const handleSend = useCallback(async (content: string) => {
    if (!content.trim() || isSending) return

    const userMsg: TrainingChatMessage = {
      id: generateMsgId(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    }
    setChatHistory((prev) => [...prev, userMsg])
    setInputValue('')
    setIsSending(true)
    setIsStreaming(true)

    const systemPrompt = buildTrainingAnalysisPrompt(record, profile, _metrics)
    const activeConfig = getActiveApiConfig()

    if (!activeConfig) {
      // 无 API Key：本地 Mock 分析
      const mockReply = generateMockTrainingAnalysis(record, profile, _metrics)
      setIsStreaming(false)
      setChatHistory((prev) => [...prev, {
        id: generateMsgId(),
        role: 'assistant',
        content: mockReply,
        timestamp: new Date(),
      }])
      setIsSending(false)
      return
    }

    // 调用 AI API
    abortControllerRef.current = new AbortController()
    try {
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...chatHistory.filter(m => m.role !== 'assistant' || !m.isStreaming).map(m => ({
          role: m.role,
          content: m.content,
        })),
        { role: 'user' as const, content },
      ]

      const response = await fetch(activeConfig.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeConfig.key}`,
        },
        body: JSON.stringify({
          model: activeConfig.model,
          messages,
          temperature: 0.5,
          stream: false,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status}`)
      }

      const data = await response.json()
      const reply = data.choices?.[0]?.message?.content || '抱歉，AI 暂时无法回答。'

      setChatHistory((prev) => [...prev, {
        id: generateMsgId(),
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
      }])
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setChatHistory((prev) => [...prev, {
          id: generateMsgId(),
          role: 'assistant',
          content: `⚠️ API 调用失败：${err.message}\n\n请确保 API Key 正确，或检查网络连接。`,
          timestamp: new Date(),
        }])
      }
    } finally {
      setIsSending(false)
      setIsStreaming(false)
    }
  }, [record, profile, _metrics, isSending, chatHistory, getActiveApiConfig])

  // 清除对话
  const handleClearChat = () => {
    setChatHistory([])
    try {
      const key = `enduremate_training_chat_${(record as TrainingRecord).id || (record as TrainingItem).id || 'default'}`
      localStorage.removeItem(key)
    } catch {}
  }

  return (
    <div className="border-t border-border-subtle pt-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-tertiary-container">smart_toy</span>
          <h4 className="font-body-md font-semibold text-text-primary">
            单训练 AI 分析
          </h4>
          {!isCompleted && (
            <span className="font-body-xs bg-status-warning/20 text-status-warning px-2 py-0.5 rounded">
              未来课表
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleClearChat}
            className="text-xs text-secondary hover:text-primary transition-colors cursor-pointer border-none bg-transparent"
            title="清除对话"
          >
            清除
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer border-none bg-transparent"
          >
            {expanded ? '收起' : '展开'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-4">
          {/* 快捷提问 */}
          {chatHistory.length === 0 && (
            <div>
              <p className="font-body-sm text-secondary mb-2">
                {isCompleted ? '关于本次训练，你可以问我：' : '关于本节课，你可以问我：'}
              </p>
              <div className="flex flex-wrap gap-2">
                {quickQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    disabled={isSending}
                    className="px-3 py-2 bg-primary/10 text-primary rounded-lg text-xs hover:bg-primary/20 transition-colors cursor-pointer border-none disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 对话历史 */}
          {chatHistory.length > 0 && (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
              {chatHistory.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary text-on-primary rounded-tr-sm'
                      : 'bg-surface-container-high rounded-tl-sm'
                  }`}>
                    {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
                    {msg.isStreaming && (
                      <span className="inline-block w-2 h-4 bg-primary/60 ml-0.5 animate-pulse" />
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* 输入框 */}
          <div className="flex gap-2">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend(inputValue)
                }
              }}
              placeholder={isCompleted ? '问关于本次训练的问题...' : '问关于本节课的问题...'}
              disabled={isSending}
              rows={1}
              className="flex-1 px-4 py-2.5 bg-surface-container-low border border-border-subtle rounded-xl text-text-primary text-sm focus:ring-2 focus:ring-primary outline-none resize-none disabled:opacity-50"
            />
            <button
              onClick={() => handleSend(inputValue)}
              disabled={!inputValue.trim() || isSending}
              className="px-4 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-medium hover:brightness-110 transition-all cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {isSending ? (
                <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
              ) : (
                <span className="material-symbols-outlined text-[18px]">send</span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ========================
// 本地 Mock 分析（无 API Key 时的降级方案）
// ========================

function generateMockTrainingAnalysis(
  record: TrainingRecord | TrainingItem,
  _profile: UserProfile,
  _metrics: TrainingMetrics,
): string {
  const isCompleted = isTrainingRecord(record)

  if (isCompleted) {
    const rec = record as TrainingRecord
    // 已完成训练的 Mock 分析
    let reply = `【${rec.date} ${rec.type} 训练分析】\n\n`
    reply += `📊 基础数据\n`
    reply += `- 距离：${rec.distance} km\n`
    reply += `- 配速：${rec.avgPace}/km\n`
    reply += `- 平均心率：${rec.avgHr} bpm\n\n`

    // 自动问题识别
    if (rec.timeSeries && rec.timeSeries.length > 10) {
      const issues: string[] = []
      const ts = rec.timeSeries
      const half = Math.floor(ts.length / 2)
      const firstHalf = ts.slice(0, half).filter(p => (p.pace ?? 0) > 0)
      const secondHalf = ts.slice(half).filter(p => (p.pace ?? 0) > 0)

      if (firstHalf.length > 3 && secondHalf.length > 3) {
        const fAvg = firstHalf.reduce((s, p) => s + (p.pace ?? 0), 0) / firstHalf.length
        const sAvg = secondHalf.reduce((s, p) => s + (p.pace ?? 0), 0) / secondHalf.length
        if (((sAvg - fAvg) / fAvg) * 100 > 8) {
          issues.push('⚠️ 后半程掉速，建议起步时适当放慢配速')
        }
      }

      if (rec.avgHr / rec.maxHr > 0.92) {
        issues.push('⚠️ 全程心率偏高，建议下次适当降低配速')
      }

      if (issues.length > 0) {
        reply += `🔍 自动检测问题\n${issues.map(i => `- ${i}`).join('\n')}\n\n`
      }
    }

    reply += `\n💡 建议\n`
    if (rec.type.includes('间歇') || rec.type.includes('节奏')) {
      reply += `- 高强度训练后注意充分恢复，48小时内安排轻松跑或休息\n`
    }
    if (rec.distance >= 15) {
      reply += `- 长距离训练后注意补充营养（碳水:蛋白 = 3:1）\n`
    }
    reply += `\n（在 AI 助手中配置 API Key 可获得更精准的 AI 分析）`
    return reply
  } else {
    // 未来训练的 Mock 分析
    const item = record as TrainingItem
    let reply = `【${item.day} ${item.title} 训练计划分析】\n\n`
    reply += `📋 课程信息\n`
    reply += `- 训练类型：${item.title || item.type}\n`
    if (item.distance) reply += `- 计划距离：${item.distance} km\n`
    if (item.pace) reply += `- 目标配速：${item.pace}/km\n`
    if (item.insight) reply += `- 训练目的：${item.insight}\n`

    reply += `\n💡 完成策略\n`
    switch (item.type) {
      case 'easy':
        reply += `- 保持轻松配速，能正常对话的强度\n- 不要和他人竞速\n- 跑完应该感觉还有余力`
        break
      case 'tempo':
        reply += `- 前2km热身，中间按计划配速跑，最后1km放松\n- 配速应稳定在目标区间内，不要波动太大\n- 如果感觉困难，可以适当降低配速（不超过5%）`
        break
      case 'interval':
        reply += `- 每组都应以Z5配速完成，不要起跑过快\n- 组间休息要充分（心率降至120-130）\n- 如果无法完成所有组，减少组数而不是降低配速`
        break
      case 'lsd':
        reply += `- 配速应比目标马拉松配速慢30-60秒/km\n- 带足补给（每8-10km补充能量胶）\n- 不要在前半程跑太快，后半程能完成就是胜利`
        break
      default:
        reply += `- 按计划配速完成，注意聆听身体信号`
    }

    reply += `\n\n（在 AI 助手中配置 API Key 可获得更详细的策略分析）`
    return reply
  }
}
