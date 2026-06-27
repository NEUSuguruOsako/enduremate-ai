import { useState, useRef, useEffect, useCallback } from 'react'
import { useAppContext } from '../context/AppContext'
import { usePrivacy } from '../context/PrivacyContext'
import { generateDynamicAIReply } from '../services/mockReplies'
import { buildDecayPromptSection } from '../services/fitnessDecay'
import ReactMarkdown from 'react-markdown'

// ========================
// 快捷提问列表（PRD 6.3）
// ========================

const beginnerQuickQuestions = [
  '如何开始我的训练计划？',
  '如何上传训练数据？',
  '什么是 CTL 和 ATL？',
  '跑步训练需要注意什么？',
]

const defaultQuickQuestions = [
  '我本周整体训练状态怎么样？',
  '目前我的训练负荷是否偏高？',
  '现阶段我该重点提升有氧还是速度？',
  '疲劳堆积应该怎么恢复调整？',
  '新手备赛需要避开哪些训练误区？',
]

// ========================
// 消息气泡组件
// ========================

function UserBubble({ msg, isLastInGroup }: { msg: { content: string; timestamp: Date }; isLastInGroup: boolean }) {
  return (
    <div className={`flex justify-end ${isLastInGroup ? 'mt-4' : 'mt-1'}`}>
      <div className="max-w-[70%]">
        <div className="bg-primary text-on-primary px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm leading-relaxed">
          {msg.content}
        </div>
        <div className="text-right mt-1">
          <span className="text-[10px] text-tertiary">
            {msg.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  )
}

function AssistantBubble({ 
  content, 
  isStreaming, 
  isLastInGroup,
  isError = false 
}: { 
  content: string; 
  isStreaming: boolean; 
  isLastInGroup: boolean;
  isError?: boolean
}) {
  return (
    <div className={`flex ${isLastInGroup ? 'mt-4' : 'mt-1'}`}>
      <div className="max-w-[85%]">
        <div className={`flex items-start gap-2 ${isError ? 'text-error' : ''}`}>
          <span 
            className="material-symbols-outlined text-[18px] text-primary shrink-0 mt-0.5"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            smart_toy
          </span>
          <div className={`px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm leading-relaxed ${
            isError ? 'bg-error-container text-on-error-container' : 'bg-surface-container-high'
          }`}>
            <ReactMarkdown 
              components={{
                h1: ({children}) => <h1 className="text-lg font-bold mt-2 mb-1 text-primary">{children}</h1>,
                h2: ({children}) => <h2 className="text-base font-semibold mt-2 mb-1 text-primary">{children}</h2>,
                h3: ({children}) => <h3 className="text-sm font-semibold mt-2 mb-1 text-primary">{children}</h3>,
                p: ({children}) => <p className="mt-1 mb-1 whitespace-pre-wrap">{children}</p>,
                strong: ({children}) => <strong className="font-semibold text-primary">{children}</strong>,
                ul: ({children}) => <ul className="list-disc list-inside mt-1 mb-1 pl-2">{children}</ul>,
                ol: ({children}) => <ol className="list-decimal list-inside mt-1 mb-1 pl-2">{children}</ol>,
                li: ({children}) => <li className="mt-0.5 mb-0.5">{children}</li>,
                table: ({children}) => <table className="w-full text-xs border-collapse mt-2 mb-2"><tbody>{children}</tbody></table>,
                tr: ({children}) => <tr className="border-b border-border-subtle last:border-b-0">{children}</tr>,
                th: ({children}) => <th className="text-left px-2 py-1 font-semibold bg-primary/10">{children}</th>,
                td: ({children}) => <td className="px-2 py-1">{children}</td>,
                code: ({children}) => <code className="px-1.5 py-0.5 bg-surface-container-low rounded text-xs font-mono">{children}</code>,
                blockquote: ({children}) => <blockquote className="border-l-2 border-primary pl-2 italic text-secondary">{children}</blockquote>,
              }}
            >
              {content}
            </ReactMarkdown>
            {isStreaming && (
              <span className="inline-block w-2 h-4 bg-primary/60 ml-0.5 animate-pulse" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ========================
// 欢迎消息构建
// ========================

function buildWelcomeMessage(isProfileComplete: boolean, hasTrainingData: boolean, name: string, recordCount: number): string {
  const userName = name || '跑友'
  
  if (!isProfileComplete && !hasTrainingData) {
    return `欢迎来到 EndureMate AI！我是你的专属跑步训练助手。

我注意到你还是新用户，建议你先完成以下步骤：

1️⃣ **填写个人档案** → 去「个人档案」页设置你的基本信息和训练目标
2️⃣ **上传运动数据** → 在「分析中心」上传 FIT/GPX/TCX 文件
3️⃣ **开始对话** → 上传数据后我可以给你专业的训练分析和建议

有什么想问的吗？`
  }

  if (!hasTrainingData) {
    return `感谢提问，${userName}！

你已经设置了个人档案，但目前还没有训练数据。

请在「分析中心」页面上传你的运动设备导出的文件（支持 Garmin .fit、Strava .gpx、Coros .tcx 等）。

准备好了就告诉我！`
  }

  return `你好 ${userName}！欢迎回来！

我已经看到你有 ${recordCount} 条训练记录。

你可以问我关于训练状态、负荷分析、伤病风险等问题。需要我帮你分析一下最近的训练吗？`
}

// ========================
// 主组件
// ========================

export default function AIAssistant() {
  const { 
    aiMessages, 
    setAiMessages, 
    isAIChatOpen, 
    toggleAIChat,
    profile,
    isProfileComplete,
    hasTrainingData,
    trainingRecords,
    metrics,
    injuryRecords,
    uploadedFiles,
    decay,
  } = useAppContext()

  const {
    apiKeys,
    activeProvider,
    setActiveProvider,
    getActiveApiConfig,
    addApiKey,
    removeApiKey,
    maskApiKey,
  } = usePrivacy()

  // ---- 状态 ----
  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [selectedProvider, setSelectedProvider] = useState<'deepseek' | 'openai'>('deepseek')

  // ---- 活跃 API 配置 ----
  const activeConfig = getActiveApiConfig()
  const hasActiveApiKey = activeConfig !== null

  // ---- Refs ----
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const mockIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ---- 快捷提问 ----
  const quickQuestions = hasTrainingData ? defaultQuickQuestions : beginnerQuickQuestions

  // ---- 自动滚动 ----
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [aiMessages])

  // ---- 聚焦输入框 ----
  useEffect(() => {
    if (isAIChatOpen) {
      inputRef.current?.focus()
    }
  }, [isAIChatOpen])

  // ---- 组件卸载时清理 Mock interval ----
  useEffect(() => {
    return () => {
      if (mockIntervalRef.current) {
        clearInterval(mockIntervalRef.current)
      }
    }
  }, [])

  // ---- 辅助函数 ----
  function generateMsgId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  }

  function isValidApiKey(key: string): boolean {
    return key.startsWith('sk-') && key.length > 15
  }

  function handleSaveApiKey() {
    if (!isValidApiKey(apiKeyInput)) return
    const provider = selectedProvider
    addApiKey({
      provider,
      key: apiKeyInput.trim(),
      label: provider === 'deepseek' ? 'DeepSeek' : 'OpenAI 兼容',
      endpoint: provider === 'deepseek'
        ? 'https://api.deepseek.com/v1/chat/completions'
        : 'https://api.openai.com/v1/chat/completions',
      model: provider === 'deepseek' ? 'deepseek-chat' : 'gpt-4o-mini',
    })
    setActiveProvider(provider)
    setShowSettings(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ---- 发送消息 ----
  const handleSend = useCallback(async (directQuestion?: string) => {
    const trimmed = directQuestion !== undefined ? directQuestion.trim() : inputValue.trim()
    if (!trimmed || isSending || isStreaming) return

    setIsSending(true)
    if (directQuestion === undefined) setInputValue('')

    // 添加用户消息
    const userMsg = {
      id: generateMsgId(),
      role: 'user' as const,
      content: trimmed,
      timestamp: new Date(),
    }
    setAiMessages((prev) => [...prev, userMsg])

    // 创建流式占位消息
    const streamId = generateMsgId()
    const streamMsg = {
      id: streamId,
      role: 'assistant' as const,
      content: '',
      timestamp: new Date(),
      isStreaming: true as const,
    }
    setAiMessages((prev) => [...prev, streamMsg])

    // 无 API Key：使用本地 Mock
    if (!activeConfig) {
      const fullReply = generateDynamicAIReply(trimmed, {
        profile,
        metrics,
        records: trainingRecords,
        files: uploadedFiles,
        injuryRecords,
        decay,
      }) + '\n\n💡 配置 AI 服务可获得更智能的回答'
      
      setIsStreaming(true)
      let charIndex = 0
      const charsPerTick = Math.max(2, Math.floor(fullReply.length / 30))
      
      mockIntervalRef.current = setInterval(() => {
        charIndex += charsPerTick
        if (charIndex >= fullReply.length) {
          if (mockIntervalRef.current) {
            clearInterval(mockIntervalRef.current)
            mockIntervalRef.current = null
          }
          setAiMessages((prev) =>
            prev.map((m) =>
              m.id === streamId ? { ...m, content: fullReply, isStreaming: false } : m
            )
          )
          setIsStreaming(false)
          setIsSending(false)
        } else {
          setAiMessages((prev) =>
            prev.map((m) =>
              m.id === streamId ? { ...m, content: fullReply.slice(0, charIndex) } : m
            )
          )
        }
      }, 40)

      return
    }

    // 有 API Key：调用 AI API
    setIsStreaming(true)
    abortControllerRef.current = new AbortController()

    // 伤病上下文（完整注入，不仅是第一条）
    const activeInjuries = injuryRecords.filter(r => !r.recovered)
    const allInjuryParts = [...new Set(activeInjuries.flatMap(r => r.parts))]
    const hasSevereInjury = activeInjuries.some(r => r.severity === 'severe')
    const recentTrainingWithInjury = trainingRecords.filter(r => r.injuryParts && r.injuryParts.length > 0).slice(0, 3)

    const systemPrompt = `你是 EndureMate AI，一个专注于马拉松和长跑训练分析的 AI 助手。

**你的专业领域：**
1. 训练负荷分析（CTL/ATL/TSB 模型）
2. 周期化训练计划设计
3. 配速策略和成绩预测（VDOT 模型）
4. 心率区间训练指导
5. 伤病风险评估和预防
6. 跑步科学知识普及

**你的回答风格：**
- 专业、科学、数据驱动
- 使用表格和结构化格式呈现数据
- 给出具体的训练建议（配速、距离、心率区间）
- 引用跑步科学理论（如 Jack Daniels VDOT、Dr. Andrew Coggan 训练负荷模型）

**用户数据：**
- 姓名：${profile.name || '跑友'}
- 年龄：${profile.age || '未知'}
- 性别：${profile.gender || '未知'}
- 体重：${profile.weight || '未知'}kg
- 静息心率：${profile.restingHr || '未知'}bpm
- 伤病史：${profile.injuryHistory || '无'}
- VDOT：${profile.vdot || '未知'}
- 训练记录数：${trainingRecords.length}
- CTL（长期负荷）：${metrics.ctl ?? '无数据'}
- ATL（短期负荷）：${metrics.atl ?? '无数据'}
- TSB：${metrics.ctl && metrics.atl ? (metrics.ctl - metrics.atl).toFixed(1) : '无数据'}
- 本周跑量：${metrics.weeklyDistance ?? 0} km
- 伤病风险：${metrics.injuryRisk}
${metrics.riskMessages && metrics.riskMessages.length > 0 ? '- 自动风险识别：' + metrics.riskMessages.join('；') : ''}

**伤病记录（全局同步）：**
${activeInjuries.length > 0
  ? `- 活跃伤病数：${activeInjuries.length}条
- 不适部位：${allInjuryParts.join('、')}
- 严重程度：${hasSevereInjury ? '存在严重伤病，需特别关注' : activeInjuries.map(r => r.parts.join('、') + '(' + (r.severity === 'severe' ? '严重' : r.severity === 'moderate' ? '中度' : '轻微') + ')').join('；')}
- 不适描述：${activeInjuries.filter(r => r.description).map(r => r.description).join('；') || '未详细描述'}
- 训练计划已根据伤病自动调整（受伤部位相关的高强度训练已替换为恢复跑）`
  : '- 当前无活跃伤病记录'}
${recentTrainingWithInjury.length > 0
  ? `- 近期训练中的不适记录：${recentTrainingWithInjury.map(r => `${r.date} ${r.type} ${r.distance}km - ${r.injuryParts?.join('、')}${r.injuryDescription ? '(' + r.injuryDescription + ')' : ''}`).join('；')}`
  : ''}

**回答原则：**
- 如果用户没有训练数据，引导他们上传 FIT/GPX/TCX 文件
- 如果用户有训练数据，基于数据给出个性化分析
- 使用跑步专业术语（CTL、ATL、TSB、VDOT、VO2max、乳酸阈值等）
- 给出具体的训练课表
- 关注伤病风险，结合用户伤病史和当前身体不适给出个性化防伤建议
- 有伤病记录时，必须主动提醒伤病风险并给出安全训练建议${decay ? '\n\n' + buildDecayPromptSection(decay) : ''}`

    try {
      const response = await fetch(activeConfig.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeConfig.key}`,
        },
        body: JSON.stringify({
          model: activeConfig.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: trimmed }
          ],
          stream: true,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder('utf-8')
      let accumulatedContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunks = decoder.decode(value).split('\n')
        for (const chunk of chunks) {
          if (chunk.startsWith('data: ')) {
            try {
              const json = JSON.parse(chunk.slice(6))
              if (json.choices?.[0]?.delta?.content) {
                accumulatedContent += json.choices[0].delta.content
                setAiMessages((prev) =>
                  prev.map((m) =>
                    m.id === streamId ? { ...m, content: accumulatedContent } : m
                  )
                )
              }
            } catch {
              // ignore parsing errors
            }
          }
        }
      }

      setAiMessages((prev) =>
        prev.map((m) =>
          m.id === streamId ? { ...m, isStreaming: false } : m
        )
      )
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      setAiMessages((prev) =>
        prev.map((m) =>
          m.id === streamId 
            ? { ...m, content: `抱歉，请求失败：${errorMsg.includes('401') ? 'API Key 无效，请检查配置' : errorMsg.includes('429') ? '请求频率过高，请稍后重试' : errorMsg}`, isStreaming: false, _isError: true } 
            : m
        )
      )
    } finally {
      setIsStreaming(false)
      setIsSending(false)
      abortControllerRef.current = null
    }
  }, [inputValue, isSending, isStreaming, activeConfig, setAiMessages, profile, trainingRecords, metrics, injuryRecords, uploadedFiles])

  // ---- 停止生成 ----
  const handleStopGeneration = useCallback(() => {
    // 停止 Real API
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    // 停止 Mock 流式
    if (mockIntervalRef.current) {
      clearInterval(mockIntervalRef.current)
      mockIntervalRef.current = null
    }
    setAiMessages((prev) => {
      const lastAssistantMsg = [...prev].reverse().find((m) => m.role === 'assistant')
      if (lastAssistantMsg && lastAssistantMsg.isStreaming) {
        return prev.map((m) =>
          m.id === lastAssistantMsg.id
            ? { ...m, isStreaming: false, content: m.content + '\n\n*(生成已停止)*' }
            : m
        )
      }
      return prev
    })
    setIsStreaming(false)
  }, [setAiMessages])

  // ---- 快捷提问 ----
  const handleQuickQuestion = useCallback((question: string) => {
    if (isSending || isStreaming) return
    handleSend(question)
  }, [isSending, isStreaming, handleSend])

  // ---- 消息分组 ----
  const messageGrouping = aiMessages.map((msg, index) => {
    const next = aiMessages[index + 1]
    return !next || next.role !== msg.role
  })

  // ---- 渲染 ----
  if (!isAIChatOpen) return null

  return (
    <>
      {/* 背景遮罩 */}
      <div 
        className="fixed inset-0 bg-black/40 z-50"
        onClick={toggleAIChat}
      />
      
      {/* 对话框 */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] max-w-[90vw] max-h-[80vh] bg-surface-card rounded-2xl shadow-2xl z-[60] flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-primary text-on-primary p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span 
              className="material-symbols-outlined text-[24px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              smart_toy
            </span>
            <h2 className="font-headline-md text-headline-md">AI 助手</h2>
            {hasActiveApiKey && (
              <span className="inline-flex items-center gap-1 text-[10px] bg-white/20 px-2 py-0.5 rounded-full">
                <span className="material-symbols-outlined text-[12px]">check_circle</span>
                AI 已连接
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">settings</span>
            </button>
            <button
              onClick={toggleAIChat}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </header>

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-surface-container-low border-b border-border-subtle p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-label-caps text-xs font-medium text-text-primary">AI 服务配置</p>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-tertiary hover:text-text-primary"
                >
                  <span className="material-symbols-outlined text-[16px]">expand_less</span>
                </button>
              </div>

              {apiKeys.map((entry) => (
                <div key={entry.provider} className="flex items-center justify-between p-2 rounded-lg bg-surface-container border border-border-subtle">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm">{entry.provider === 'deepseek' ? '🧠' : '🤖'}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-text-primary">{entry.label}</p>
                      <p className="text-[10px] font-mono text-tertiary truncate">{maskApiKey(entry.key)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {activeProvider === entry.provider ? (
                      <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">当前</span>
                    ) : (
                      <button
                        onClick={() => setActiveProvider(entry.provider)}
                        className="text-[9px] text-primary hover:underline px-1"
                      >
                        启用
                      </button>
                    )}
                    <button
                      onClick={() => removeApiKey(entry.provider)}
                      className="text-tertiary hover:text-error transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  </div>
                </div>
              ))}

              <div className="space-y-2 pt-1 border-t border-border-subtle">
                <div className="flex gap-2">
                  <select
                    value={selectedProvider}
                    onChange={(e) => setSelectedProvider(e.target.value as 'deepseek' | 'openai')}
                    className="h-9 px-2 rounded-lg border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-xs bg-surface"
                  >
                    <option value="deepseek">DeepSeek</option>
                    <option value="openai">OpenAI 兼容</option>
                  </select>
                  <div className="relative flex-1 flex gap-2">
                    <input
                      type="password"
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder={selectedProvider === 'deepseek' ? 'sk-...' : 'sk-...'}
                      className="flex-1 h-9 px-3 rounded-lg border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary font-mono text-xs"
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveApiKey()}
                    />
                    <button
                      onClick={handleSaveApiKey}
                      disabled={!isValidApiKey(apiKeyInput)}
                      className="px-3 h-9 text-xs rounded-lg bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      保存
                    </button>
                  </div>
                </div>
                {apiKeyInput && apiKeyInput.length > 0 && !isValidApiKey(apiKeyInput) && (
                  <p className="text-[10px] text-error">API Key 格式不正确，应以 sk- 开头且长度大于15位</p>
                )}
                <p className="text-[10px] text-tertiary">
                  获取 Key{' '}
                  <a
                    href={selectedProvider === 'deepseek' ? 'https://platform.deepseek.com/api_keys' : 'https://platform.openai.com/api-keys'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {selectedProvider === 'deepseek' ? 'deepseek.com' : 'openai.com'} →
                  </a>
                </p>
              </div>

              <div className="p-2 rounded-lg bg-blue-50 border border-blue-100">
                <p className="text-[10px] text-blue-700 leading-relaxed">
                  🔒 Key 仅存储在你的浏览器本地，不会上传到任何服务器。
                  对话内容直接发送到 AI 服务商，我们不参与数据传输。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Questions */}
        <section className="p-4 bg-surface-container-low border-b border-border-subtle">
          <p className="font-label-caps text-xs text-secondary uppercase tracking-wider mb-3">快捷提问</p>
          <div className="flex flex-wrap gap-2">
            {quickQuestions.map((q) => (
              <button
                key={q}
                onClick={() => handleQuickQuestion(q)}
                disabled={isSending || isStreaming}
                className="text-xs px-3 py-1.5 rounded-full bg-surface-container-high border border-border-subtle hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        </section>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          {aiMessages.length === 0 && (
            <AssistantBubble
              content={buildWelcomeMessage(isProfileComplete, hasTrainingData, profile.name, trainingRecords.length)}
              isStreaming={false}
              isLastInGroup={true}
            />
          )}
          
          {aiMessages.map((msg, index) =>
            msg.role === 'user' ? (
              <UserBubble key={msg.id} msg={msg} isLastInGroup={messageGrouping[index]} />
            ) : (
              <AssistantBubble
                key={msg.id}
                content={msg.content}
                isStreaming={msg.isStreaming === true}
                isLastInGroup={messageGrouping[index]}
                isError={(msg as unknown as Record<string, unknown>)._isError === true}
              />
            )
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <footer className="p-4 border-t border-border-subtle">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入你的问题..."
                rows={1}
                disabled={isSending || isStreaming}
                className="w-full min-h-[40px] max-h-[120px] resize-none rounded-2xl px-4 py-2.5 text-sm border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-surface-container-low placeholder:text-secondary disabled:opacity-60"
              />
            </div>
            {isStreaming ? (
              <button
                onClick={handleStopGeneration}
                className="w-10 h-10 rounded-full bg-error text-on-error flex items-center justify-center hover:bg-error/90"
              >
                <span className="material-symbols-outlined text-[18px]">stop</span>
              </button>
            ) : (
              <button
                onClick={() => handleSend()}
                disabled={!inputValue.trim() || isSending}
                className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90"
              >
                {isSending ? (
                  <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-[18px]">send</span>
                )}
              </button>
            )}
          </div>
        </footer>
      </div>
    </>
  )
}
