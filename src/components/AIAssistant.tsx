import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useAppContext } from '../context/AppContext'
import { streamChatToDeepSeek, isValidApiKey, type DeepSeekMessage } from '../services/deepseek'

// ========================
// 常量 & 工具
// ========================

/** 默认快捷提问（有训练数据时使用） */
const defaultQuickQuestions = [
  '我本周整体训练状态怎么样？',
  '目前我的训练负荷是否偏高？',
  '现阶段我该重点提升有氧还是速度？',
  '疲劳堆积应该怎么恢复调整？',
  '新手备赛需要避开哪些训练误区？',
]

/** 新手友好快捷提问（无训练数据时使用） */
const beginnerQuickQuestions = [
  '新手该如何开始马拉松训练？',
  '目前我的训练负荷是否偏高？',
  '现阶段我该重点提升有氧还是速度？',
  '疲劳堆积应该怎么恢复调整？',
  '新手备赛需要避开哪些训练误区？',
]

/** localStorage key for DeepSeek API key */
const STORAGE_KEY_API_KEY = 'enduremate_deepseek_api_key'

/**
 * 格式化时间为 HH:mm
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/**
 * 根据上下文生成欢迎消息完整文本（本地 fallback 用）
 */
function buildWelcomeMessage(
  isProfileComplete: boolean,
  hasTrainingData: boolean,
  profileName: string,
  trainingRecordsCount: number,
): string {
  const name = profileName || '跑友'

  if (!isProfileComplete && !hasTrainingData) {
    return `你好！我是 EndureMate AI 助手。\n\n我可以帮你：\n\n📊 分析训练数据和体能指标\n📋 制定个性化训练计划\n💡 解答跑步训练疑问\n⚠️ 监控伤病风险\n\n先告诉我一些关于你的信息吧，或者直接上传训练数据开始！`
  }

  if (isProfileComplete && !hasTrainingData) {
    return `你好 ${name}！\n\n我看到你已经完善了个人档案。接下来可以：\n\n📤 在「分析中心」上传运动数据文件\n❓ 直接问我任何训练问题\n\n有什么想了解的吗？`
  }

  // hasTrainingData === true
  return `你好 ${name}！\n\n你已有 ${trainingRecordsCount} 条训练记录。有什么想分析的？`
}

// ========================
// 子组件：助手消息气泡（支持流式显示）
// ========================

interface AssistantBubbleProps {
  content: string
  timestamp?: Date
  isStreaming: boolean
  /** 是否为同角色组内最后一条（控制时间戳可见性） */
  isLastInGroup: boolean
  /** 是否为错误消息（红色调） */
  isError?: boolean
}

function AssistantBubble({ content, timestamp, isStreaming, isLastInGroup, isError }: AssistantBubbleProps) {
  return (
    <div className={`flex justify-start${isLastInGroup ? '' : ' mb-1'}`}>
      <div className="max-w-[80%]">
        {/* 流式输入提示标签 */}
        {isStreaming && (
          <p className="font-label-caps text-label-caps text-primary text-[10px] mb-1 ml-1">
            AI 正在输入...
          </p>
        )}
        <div className={`rounded-2xl rounded-bl-md px-4 py-2.5 ${isError ? 'bg-error-container text-on-error-container' : 'bg-surface-container'}`}>
          <p className={`font-body-sm text-body-sm whitespace-pre-wrap break-words inline ${isError ? 'text-on-error-container' : 'text-text-primary'}`}>
            {content}
            {/* 流式光标 */}
            {isStreaming && (
              <span className="inline-block w-0.5 h-4 bg-primary animate-pulse ml-0.5 align-middle" />
            )}
          </p>
        </div>
        {timestamp && (
          <p className={`mt-1 font-label-caps text-label-caps text-secondary text-[10px]${isLastInGroup ? '' : ' invisible'}`}>
            {formatTime(timestamp)}
          </p>
        )}
      </div>
    </div>
  )
}

// ========================
// 子组件：用户消息气泡
// ========================

interface UserBubbleProps {
  msg: import('../context/AppContext').AIMessage
  isLastInGroup: boolean
}

function UserBubble({ msg, isLastInGroup }: UserBubbleProps) {
  return (
    <div className={`flex justify-end${isLastInGroup ? '' : ' mb-1'}`}>
      <div className="max-w-[80%]">
        <div className="bg-primary text-on-primary rounded-2xl rounded-br-md px-4 py-2.5">
          <p className="font-body-sm text-body-sm whitespace-pre-wrap break-words">
            {msg.content}
          </p>
        </div>
        <p className={`text-right mt-1 font-label-caps text-label-caps text-secondary text-[10px]${isLastInGroup ? '' : ' invisible'}`}>
          {formatTime(msg.timestamp)}
        </p>
      </div>
    </div>
  )
}

// ========================
// 主组件
// ========================

export default function AIAssistant() {
  // ---- 所有 Hooks 必须在条件返回之前调用（React Hooks 规则） ----
  const {
    isAIChatOpen,
    aiMessages,
    setAiMessages,
    toggleAIChat,
    profile,
    isProfileComplete,
    hasTrainingData,
    trainingRecords,
    metrics,
    uploadedFiles,
  } = useAppContext()

  // ---- Refs ----
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const streamGeneratorRef = useRef<AsyncGenerator<string, void, unknown> | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // ---- 面板状态 ----
  const [panelVisible, setPanelVisible] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(STORAGE_KEY_API_KEY) || '')
  const [apiKeyInput, setApiKeyInput] = useState(() => localStorage.getItem(STORAGE_KEY_API_KEY) || '')
  const [apiKeySaved, setApiKeySaved] = useState(() => !!localStorage.getItem(STORAGE_KEY_API_KEY))
  const [showSettings, setShowSettings] = useState(false)

  // ---- 快捷提问列表（根据是否有训练数据切换） ----
  const quickQuestions = useMemo(() => {
    return hasTrainingData ? defaultQuickQuestions : beginnerQuickQuestions
  }, [hasTrainingData])

  // ---- 面板入场动画（从右侧滑入） ----

  useEffect(() => {
    if (isAIChatOpen) {
      // 强制触发 CSS 过渡动画
      setPanelVisible(false)
      const timer = setTimeout(() => {
        setPanelVisible(true)
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [isAIChatOpen])

  // ---- 面板关闭时不渲染任何内容（此检查必须在所有 Hooks 之后） ----
  if (!isAIChatOpen) return null

  // ---- 自动滚动到底部 ----

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [aiMessages])

  // ---- 打开时自动聚焦输入框 ----

  useEffect(() => {
    inputRef.current?.focus()
  }, [isAIChatOpen])

  // ---- 将 AIMessage[] 映射为 DeepSeekMessage[] ----

  const mapToDeepSeekHistory = useCallback((messages: typeof aiMessages): DeepSeekMessage[] => {
    return messages
      .filter((m) => !m.isStreaming) // Don't send streaming partials
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))
  }, [])

  // ---- 错误消息分类 ----

  function classifyError(error: unknown): string {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return '生成已停止'
    }
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('401') || message.includes('403') || message.includes('无效') || message.includes('Unauthorized')) {
      return 'API Key 无效，请检查设置'
    }
    if (message.includes('429') || message.includes('频率') || message.includes('rate')) {
      return '请求过于频繁，请稍后再试'
    }
    if (message.includes('网络') || message.includes('fetch') || message.includes('Failed to fetch') || message.includes('NetworkError')) {
      return '网络连接失败，请检查网络后重试'
    }
    return message || '未知错误，请重试'
  }

  // ---- 本地 Mock 回复引擎（无 API Key 时使用）----

  function generateDynamicAIReply(userMessage: string): string {
    const name = profile.name || '跑友'

    if (userMessage.includes('整体训练状态')) {
      if (trainingRecords.length === 0) {
        return `你好 ${name}！\n\n目前你还没有任何训练记录。要开始使用，请先在「分析中心」上传你的运动数据文件（支持 FIT/GPX/TCX 格式）。\n\n上传后我会帮你做全面分析！`
      }

      const recentWeek = trainingRecords.filter((r) => {
        const d = new Date(r.date)
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        return d >= weekAgo
      })

      return `你好 ${name}！以下是你当前的训练状态分析：\n\n**本周概况**\n- 训练次数：${recentWeek.length} 次\n- 累计跑量：${metrics.weeklyDistance ?? 0} km\n\n**体能指标**\n- CTL（长期负荷）：${metrics.ctl ?? '-'}\n- ATL（短期负荷）：${metrics.atl ?? '-'}\n- 伤病风险：${metrics.injuryRisk}\n\n${metrics.injuryRisk === '高风险' ? '\n⚠️ 当前伤病风险偏高，建议适当降低训练强度。' : ''}\n\n需要我针对某个方面给出具体建议吗？`
    }

    if (userMessage.includes('训练负荷')) {
      if (metrics.ctl === null) {
        return `目前还没有足够的训练数据来评估负荷。请先上传至少 1 周的运动数据。`
      }
      return `你的训练负荷分析如下：\n\n| 指标 | 数值 | 解读 |\n|------|------|------|\n| CTL 长期负荷 | ${metrics.ctl} | ${metrics.ctl < 50 ? '偏低，有氧基础待建立' : metrics.ctl < 80 ? '正常范围' : '较高，注意恢复'} |\n| ATL 短期负荷 | ${metrics.atl} | ${metrics.atl! < metrics.ctl! ? '低于CTL，处于正向适应中' : '高于CTL，近期强度较大'} |\n| 疲劳评分 | ${metrics.fatigueScore} | ${metrics.fatigueScore! < 45 ? '状态良好' : metrics.fatigueScore! < 65 ? '轻度疲劳' : '需要注意恢复'} |\n| 伤病风险 | ${metrics.injuryRisk} | - |\n\n${metrics.injuryRisk === '高风险' ? '\n🔴 建议：接下来 2 天安排休息或极低强度活动。' : metrics.injuryRisk === '中风险' ? '\n🟡 建议：适当减少下次训练的强度或距离。' : '\n🟢 当前负荷健康，继续保持！'}`
    }

    if (userMessage.includes('有氧') && userMessage.includes('速度')) {
      if (trainingRecords.length === 0) {
        return '目前还没有训练数据。上传数据后我可以根据你的实际情况给出更有针对性的建议。\n\n一般来说，马拉松备赛应遵循"先有氧后速度"的原则。'
      }
      const easyCount = trainingRecords.filter((r) => r.type.includes('轻松') || r.type.includes('LSD')).length
      const hardCount = trainingRecords.filter((r) =>
        r.type.includes('间歇') || r.type.includes('阈值') || r.type.includes('节奏'),
      ).length
      const ratio = easyCount / Math.max(trainingRecords.length, 1)

      return `基于你最近的 ${trainingRecords.length} 条训练记录分析：\n\n**当前训练结构**\n- 有氧类训练占比：${(ratio * 100).toFixed(0)}%\n- 强度类训练次数：${hardCount} 次\n\n**建议方向**：\n${
        ratio < 0.7
          ? '你的有氧基础训练比例偏低。建议增加每周 1-2 次轻松跑/LSD，有氧是速度的基础。'
          : ratio > 0.85
            ? '有氧基础不错，可以逐步引入更多强度训练（Tempo 或间歇），提升比赛配速能力。'
            : '当前有氧与强度的配比比较均衡，继续保持即可。'
      }\n\n目标：全马破3 需要在保持有氧的同时，逐步提高乳酸阈值配速。`
    }

    if (userMessage.includes('疲劳')) {
      if (metrics.fatigueScore === null) {
        return '暂无疲劳数据。上传训练记录后我可以帮你监控疲劳趋势。'
      }
      return `你的疲劳管理分析：\n\n**当前疲劳指数：${metrics.fatigueScore}/100**\n\n${
        metrics.fatigueScore < 35
          ? '🟢 状态很好，身体恢复充分，适合安排高质量训练课。'
          : metrics.fatigueScore < 55
            ? '🟡 轻度疲劳积累，属于正常训练反应。建议保证睡眠和营养。'
            : metrics.fatigueScore < 75
              ? '🔴 中度疲劳，建议将下次高强度训练降为中等强度，或增加休息日。'
              : '⛔ 重度疲劳警告！建议完全休息 1-2 天，必要时就医检查。'
      }\n\n**恢复建议**：\n- 保证每晚 7-8 小时睡眠\n- 训练后 30 分钟内补充蛋白质+碳水\n- 每周至少 1 次泡沫轴/拉伸放松`
    }

    if (userMessage.includes('误区') || userMessage.includes('新手')) {
      return `马拉松备赛常见误区：\n\n**1. 跑量增长过快**\n> 每周增幅不超过 10%，否则伤病风险急剧上升\n\n**2. 忽视力量训练**\n> 核心和下肢力量不足是跑步伤病的头号元凶，建议每周 1-2 次\n\n**3. LSD 追求速度**\n> 长距离慢跑的核心是"慢"，配速应比目标马拉松配速慢 30-60 秒/km\n\n**4. 赛前减量太晚**\n> 全马建议赛前 2-3 周开始减量至原量的 40-60%\n\n**5. 只堆跑量不重质量**\n> 10 个垃圾跑量不如 1 个高质量 Tempo\n\n**6. 轻视恢复**\n> 训练只是刺激，休息才是进步的时刻`
    }

    if (uploadedFiles.length > 0 && (userMessage.includes('文件') || userMessage.includes('上传') || userMessage.includes('分析'))) {
      const latestFile = uploadedFiles[uploadedFiles.length - 1]
      const fileRecords = latestFile.parsedRecords
      return `已为你分析最新上传的文件 **${latestFile.name}**：\n\n**解析结果**\n- 文件包含 ${fileRecords.length} 条训练记录\n- 最近一次训练：${fileRecords[fileRecords.length - 1]?.type}\n- 距离：${fileRecords[fileRecords.length - 1]?.distance} km\n- 平均心率：${fileRecords[fileRecords.length - 1]?.avgHr} bpm\n- 配速：${fileRecords[fileRecords.length - 1]?.avgPace}/km\n\n需要我进一步分析这条训练数据吗？`
    }

    // 通用智能回复
    const hasData = trainingRecords.length > 0
    const hasProfile = profile.name !== ''

    if (!hasData && !hasProfile) {
      return `欢迎来到 EndureMate AI！我是你的专属跑步训练助手。\n\n我注意到你还是新用户，建议你先完成以下步骤：\n\n1️⃣ **填写个人档案** → 去「个人档案」页设置你的基本信息和训练目标\n2️⃣ **上传运动数据** → 在「分析中心」上传 FIT/GPX/TCX 文件\n3️⃣ **开始对话** → 上传数据后我可以给你专业的训练分析和建议\n\n有什么想问的吗？`
    }

    if (!hasData) {
      return `感谢提问，${name}！\n\n你已经设置了个人档案，但目前还没有训练数据。\n\n请在「分析中心」页面上传你的运动设备导出的文件（支持 Garmin .fit、Strava .gpx、Coros .tcx 等）。\n\n准备好了就告诉我！`
    }

    const lastRecord = trainingRecords[0]
    return `收到你的问题，${name}！\n\n结合你最近的训练数据来看：\n\n**最近一次训练** (${lastRecord.date})\n- 类型：${lastRecord.type}\n- 距离：${lastRecord.distance} km\n- 配速：${lastRecord.avgPace}/km\n- 平均心率：${lastRecord.avgHr} bpm\n\n如果你有具体的训练疑问，可以直接问我，我会结合你的数据给出针对性回答。`
  }

  // ---- 本地流式模拟效果 ----

  async function simulateLocalStream(fullReply: string, streamId: string) {
    let charIndex = 0
    const charsPerTick = Math.max(2, Math.floor(fullReply.length / 30))

    while (charIndex < fullReply.length) {
      await new Promise((resolve) => setTimeout(resolve, 40))
      charIndex += charsPerTick
      if (charIndex >= fullReply.length) {
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
    }
  }

  // ---- 发送消息核心逻辑 ----

  let messageIdCounter = 0
  function generateMsgId(): string {
    return `msg_${Date.now()}_${++messageIdCounter}`
  }

  const handleSend = useCallback(async () => {
    const trimmed = inputValue.trim()
    if (!trimmed || isSending || isStreaming) return

    setIsSending(true)
    setInputValue('')

    // 添加用户消息
    const userMsgId = generateMsgId()
    const userMsg = {
      id: userMsgId,
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

    // 构建历史消息
    const history = mapToDeepSeekHistory([...aiMessages, userMsg])

    // 判断是否有有效的 API Key
    if (!apiKey) {
      // ---- 无 API Key：回退到本地 Mock 回复 ----
      const fullReply = generateDynamicAIReply(trimmed) + '\n\n💡 配置 DeepSeek API Key 可获得更智能的回答'

      await simulateLocalStream(fullReply, streamId)
      setIsSending(false)
      return
    }

    // ---- 有 API Key：调用 DeepSeek API 流式接口 ----
    setIsStreaming(true)
    let accumulatedContent = ''

    try {
      const generator = streamChatToDeepSeek(
        trimmed,
        apiKey,
        history,
        {
          name: profile.name,
          age: profile.age,
          gender: profile.gender,
          goal: profile.goal,
          vdot: profile.vdot,
        },
        {
          ctl: metrics.ctl,
          atl: metrics.atl,
          injuryRisk: metrics.injuryRisk,
          fatigueScore: metrics.fatigueScore,
          weeklyDistance: metrics.weeklyDistance,
        },
        trainingRecords.length,
      )

      streamGeneratorRef.current = generator

      for await (const chunk of generator) {
        accumulatedContent += chunk
        setAiMessages((prev) =>
          prev.map((m) =>
            m.id === streamId
              ? { ...m, content: accumulatedContent, isStreaming: true }
              : m,
          ),
        )
      }

      // 流结束，标记完成
      setAiMessages((prev) =>
        prev.map((m) =>
          m.id === streamId
            ? { ...m, content: accumulatedContent, isStreaming: false }
            : m,
        ),
      )
    } catch (error) {
      // 显示错误消息
      const errorMsg = classifyError(error)
      setAiMessages((prev) =>
        prev.map((m) =>
          m.id === streamId
            ? {
                ...m,
                content: errorMsg + '\n\n点击下方按钮可重新发送',
                isStreaming: false,
                _isError: true,
              }
            : m,
        ),
      )
    } finally {
      setIsStreaming(false)
      setIsSending(false)
      streamGeneratorRef.current = null
      abortControllerRef.current = null
    }
  }, [
    inputValue,
    isSending,
    isStreaming,
    apiKey,
    aiMessages,
    mapToDeepSeekHistory,
    profile,
    metrics,
    trainingRecords.length,
  ])

  // ---- 停止生成 ----

  const handleStopGeneration = useCallback(() => {
    // 中止 fetch 请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    // 标记当前流式消息为已完成（保留已生成的内容）
    setAiMessages((prev) => {
      const lastAssistantMsg = [...prev].reverse().find((m) => m.role === 'assistant')
      if (lastAssistantMsg && lastAssistantMsg.isStreaming) {
        return prev.map((m) =>
          m.id === lastAssistantMsg.id
            ? { ...m, isStreaming: false, content: m.content + '\n\n*(生成已停止)*' }
            : m,
        )
      }
      return prev
    })
    setIsStreaming(false)
    setIsSending(false)
    streamGeneratorRef.current = null
  }, [])

  // ---- 回车发送 / Shift+Enter 换行 ----

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ---- 输入框自动增高 ----

  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [inputValue])

  // ---- API Key 保存 ----

  const handleSaveApiKey = useCallback(() => {
    const trimmed = apiKeyInput.trim()
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY_API_KEY, trimmed)
      setApiKey(trimmed)
      setApiKeySaved(true)
      setShowSettings(false)
    } else {
      localStorage.removeItem(STORAGE_KEY_API_KEY)
      setApiKey('')
      setApiKeySaved(false)
    }
  }, [apiKeyInput])

  // ---- 消息分组：判断每条消息是否是同角色连续组的最后一条 ----

  const messageGrouping = useMemo(() => {
    const grouping: boolean[] = []
    for (let i = 0; i < aiMessages.length; i++) {
      const current = aiMessages[i]
      const next = aiMessages[i + 1]
      grouping.push(!next || next.role !== current.role)
    }
    return grouping
  }, [aiMessages])

  // ---- 快捷提问发送 ----

  const handleQuickQuestion = useCallback(
    (question: string) => {
      if (isSending || isStreaming) return
      setInputValue(question)
      // 延迟一帧确保 inputValue 已更新
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          handleSend()
        })
      })
    },
    [isSending, isStreaming, handleSend],
  )

  return (
    <div
      className={`fixed top-0 right-0 h-full w-[400px] max-w-full bg-surface-card shadow-xl rounded-l-2xl z-[60] flex flex-col overflow-hidden transition-transform duration-300 ease-out ${
        panelVisible ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* ====== Header ====== */}
      <header className="bg-primary text-on-primary p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span
            className="material-symbols-outlined text-[24px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            smart_toy
          </span>
          <h2 className="font-headline-md text-headline-md text-on-primary">
            AI 助手
          </h2>
          {apiKeySaved && (
            <span className="inline-flex items-center gap-1 text-[10px] bg-white/20 px-2 py-0.5 rounded-full">
              <span className="material-symbols-outlined text-[12px]">check_circle</span>
              DeepSeek
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* 设置按钮 */}
          <button
            onClick={() => setShowSettings((prev) => !prev)}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
            aria-label="API 设置"
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
          </button>
          <button
            onClick={toggleAIChat}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
            aria-label="关闭 AI 助手"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
      </header>

      {/* ====== API Key 设置面板（可折叠） ====== */}
      {showSettings && (
        <div className="bg-surface-container-low border-b border-border-subtle p-4 shrink-0">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-label-caps text-label-caps text-text-primary text-xs font-medium">
                DeepSeek API 配置
              </p>
              <button
                onClick={() => setShowSettings(false)}
                className="text-tertiary hover:text-text-primary transition-colors"
                aria-label="收起设置"
              >
                <span className="material-symbols-outlined text-[16px]">expand_less</span>
              </button>
            </div>

            <div className="space-y-2">
              <label htmlFor="deepseek-api-key" className="block text-[11px] text-secondary">
                API Key
              </label>
              <div className="relative flex gap-2">
                <input
                  id="deepseek-api-key"
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="sk-..."
                  className="flex-1 min-w-0 h-9 px-3 pr-9 text-xs rounded-lg border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-surface font-mono placeholder:text-tertiary"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleSaveApiKey()
                    }
                  }}
                />
                {/* 验证状态图标 */}
                {apiKeyInput && (
                  <span className="absolute right-[88px] top-1/2 -translate-y-1/2">
                    {isValidApiKey(apiKeyInput) ? (
                      <span className="material-symbols-outlined text-[16px] text-green-500">check_circle</span>
                    ) : (
                      <span className="material-symbols-outlined text-[16px] text-error">cancel</span>
                    )}
                  </span>
                )}
                <button
                  onClick={handleSaveApiKey}
                  disabled={!apiKeyInput.trim()}
                  className="px-3 h-9 text-xs rounded-lg bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                >
                  保存
                </button>
              </div>
              {apiKeyInput && !isValidApiKey(apiKeyInput) && (
                <p className="text-[10px] text-error">API Key 格式不正确，应以 sk- 开头</p>
              )}
              <p className="text-[10px] text-tertiary">
                获取 API Key{' '}
                <a
                  href="https://platform.deepseek.com/api_keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  deepseek.com →
                </a>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ====== 快捷提问 ====== */}
      <section className="p-4 bg-surface-container-low border-b border-border-subtle shrink-0">
        <p className="font-label-caps text-label-caps text-secondary uppercase tracking-wider mb-3">
          快捷提问
        </p>
        <div className="flex flex-wrap gap-2">
          {quickQuestions.map((q) => (
            <button
              key={q}
              onClick={() => handleQuickQuestion(q)}
              disabled={isSending || isStreaming}
              className="text-xs px-3 py-1.5 rounded-full bg-surface-container-high text-text-primary border border-border-subtle hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors leading-tight text-left cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {q}
            </button>
          ))}
        </div>
      </section>

      {/* ====== 消息列表 ====== */}
      <div className="relative flex-1 overflow-y-auto p-4 scroll-smooth">
        {/* 顶部渐变遮罩 */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-surface-card to-transparent z-10" />

        <div className="space-y-4">
          {/* --- 欢迎消息（简单显示）--- */}
          {aiMessages.length === 0 && (
            <AssistantBubble
              content={buildWelcomeMessage(isProfileComplete, hasTrainingData, profile.name, trainingRecords.length)}
              isStreaming={false}
              isLastInGroup={true}
            />
          )}

          {/* --- 正常消息列表 --- */}
          {aiMessages.map((msg, index) =>
            msg.role === 'user' ? (
              <UserBubble
                key={msg.id}
                msg={msg}
                isLastInGroup={messageGrouping[index]}
              />
            ) : (
              <AssistantBubble
                key={msg.id}
                content={msg.content}
                timestamp={msg.timestamp}
                isStreaming={msg.isStreaming === true}
                isLastInGroup={messageGrouping[index]}
                isError={(msg as unknown as Record<string, unknown>)._isError === true}
              />
            ),
          )}

          {/* 滚动锚点 */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ====== 输入区域 ====== */}
      <footer className="p-4 border-t border-border-subtle shrink-0 bg-surface-card">
        <div className="flex items-end gap-2">
          <div className="flex-1 min-w-0 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入你的问题..."
              rows={1}
              disabled={isSending || isStreaming}
              className="w-full min-h-[40px] max-h-[120px] resize-none rounded-2xl px-4 py-2.5 text-sm border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-surface-container-low placeholder:text-secondary transition-all disabled:opacity-60"
            />
            {/* 字符计数（输入时微弱显示） */}
            {inputValue.length > 0 && (
              <span className="absolute right-3 bottom-1.5 text-[10px] text-tertiary pointer-events-none select-none">
                {inputValue.length}/500
              </span>
            )}
          </div>
          {/* 发送 / 停止 按钮 */}
          {isStreaming ? (
            <button
              onClick={handleStopGeneration}
              className="w-10 h-10 rounded-full bg-error text-on-error flex items-center justify-center hover:bg-error/90 active:scale-95 transition-all shrink-0"
              aria-label="停止生成"
            >
              <span className="material-symbols-outlined text-[18px]">stop</span>
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isSending}
              className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 active:scale-95 transition-all shrink-0"
              aria-label="发送消息"
            >
              {isSending ? (
                <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
              ) : (
                <span className="material-symbols-outlined text-[18px]">send</span>
              )}
            </button>
          )}
        </div>
        <p className="mt-1.5 text-center text-[10px] text-tertiary">
          Shift+Enter 换行 &middot; Enter 发送
        </p>
      </footer>
    </div>
  )
}
