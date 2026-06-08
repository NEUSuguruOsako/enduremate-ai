import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'

// ========================
// 类型定义
// ========================

interface InsightData {
  icon: string
  iconColor: string
  title: string
  description: string
  aiQuestion: string
}

interface ChartBarEntry {
  height: number
  loadValue: number
  status: 'good' | 'normal' | 'high' | 'danger'
  weekLabel?: string
}

// ========================
// 工具函数
// ========================

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 11) return '早安'
  if (hour >= 11 && hour < 13) return '中午好'
  if (hour >= 13 && hour < 18) return '下午好'
  if (hour >= 18 && hour < 22) return '晚上好'
  return '夜深了'
}

function getStatusDotColor(status: 'pending' | 'completed' | 'skipped'): string {
  switch (status) {
    case 'pending':
      return 'bg-on-surface-variant/40'
    case 'completed':
      return 'bg-status-success'
    case 'skipped':
      return 'bg-status-danger'
  }
}

function getLoadColor(status: ChartBarEntry['status']): string {
  switch (status) {
    case 'good':
      return 'bg-surface-container'
    case 'normal':
      return 'bg-primary'
    case 'high':
      return 'bg-status-warning'
    case 'danger':
      return 'bg-status-danger'
  }
}

function getLoadStatusLabel(status: ChartBarEntry['status']): string {
  switch (status) {
    case 'good':
      return '偏低'
    case 'normal':
      return '正常'
    case 'high':
      return '偏高'
    case 'danger':
      return '危险'
  }
}

function getInjuryRiskColor(risk: string): string {
  switch (risk) {
    case '低风险':
      return 'text-status-success'
    case '中风险':
      return 'text-status-warning'
    case '高风险':
      return 'text-status-danger'
    default:
      return 'text-on-surface-variant'
  }
}

function getInjuryRiskBgColor(risk: string): string {
  switch (risk) {
    case '低风险':
      return 'bg-status-success/10'
    case '中风险':
      return 'bg-status-warning/10'
    case '高风险':
      return 'bg-status-danger/10'
    default:
      return 'bg-on-surface-variant/10'
  }
}

function getInjuryRiskLabel(risk: string): string {
  switch (risk) {
    case '低风险':
      return '最佳状态'
    case '中风险':
      return '需关注'
    case '高风险':
      return '偏高'
    default:
      return '无数据'
  }
}

/** 根据负荷值判定状态等级 */
function classifyLoadStatus(value: number, maxVal: number): ChartBarEntry['status'] {
  const ratio = value / maxVal
  if (ratio <= 0.5) return 'good'
  if (ratio <= 0.75) return 'normal'
  if (ratio <= 0.9) return 'high'
  return 'danger'
}

/** 获取当前周的日期范围标签 */
function getWeekRangeLabel(weekNum: number): string {
  const baseDate = new Date(2026, 5, 22)
  const monday = new Date(baseDate)
  monday.setDate(baseDate.getDate() + (weekNum - 4) * 7)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`
  return `${fmt(monday)} - ${fmt(sunday)}`
}

// ========================
// Dashboard 组件
// ========================

export default function Dashboard() {
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null)
  const [clickedBarIndex, setClickedBarIndex] = useState<number | null>(null)

  const {
    profile,
    metrics,
    trainings,
    trainingRecords,
    hasTrainingData,
    isAIChatOpen,
    toggleAIChat,
    sendAIMessage,
    selectTraining,
    nextWeek,
    prevWeek,
    currentWeek,
  } = useAppContext()

  const navigate = useNavigate()

  // ---- 派生状态 ----

  /** 是否有有效的指标数据 */
  const hasMetrics = metrics.ctl !== null && metrics.atl !== null

  /** 显示名称：优先用 profile.name，否则 fallback "跑友" */
  const displayName = profile.name || '跑友'

  // ---- 动态生成 AI 洞察（基于实际 metrics）----
  const dynamicInsights: InsightData[] = useMemo(() => {
    if (!hasTrainingData || !hasMetrics) return []

    const insights: InsightData[] = []
    const { ctl, atl, fatigueScore, weeklyDistance, injuryRisk } = metrics

    // 洞察 1: 疲劳评估
    if (fatigueScore !== null && fatigueScore > 60) {
      insights.push({
        icon: 'warning',
        iconColor: 'text-status-warning',
        title: '疲劳偏高，建议增加休息日',
        description:
          `当前疲劳评分为 ${fatigueScore}，连续高强度训练可能导致恢复不足。建议本周安排 1-2 天完全休息或主动恢复。`,
        aiQuestion: '我现在的疲劳程度如何？该如何调整这周的训练计划？',
      })
    } else if (fatigueScore !== null && fatigueScore <= 45) {
      insights.push({
        icon: 'check_circle',
        iconColor: 'text-status-success',
        title: '身体状态良好，恢复充分',
        description:
          `疲劳评分 ${fatigueScore}，处于健康区间。你的恢复策略效果不错，可以保持当前的训练节奏。`,
        aiQuestion: '我的恢复情况如何？可以适当增加训练强度吗？',
      })
    } else if (fatigueScore !== null) {
      insights.push({
        icon: 'info',
        iconColor: 'text-primary',
        title: '疲劳处于中等水平',
        description:
          `疲劳评分 ${fatigueScore}，属于正常范围。注意睡眠质量和营养补充，避免过度累积。`,
        aiQuestion: '我的疲劳评分意味着什么？需要注意什么？',
      })
    }

    // 洞察 2: 周跑量评估
    if (weeklyDistance !== null && weeklyDistance > 0 && weeklyDistance < 20) {
      insights.push({
        icon: 'trending_up',
        iconColor: 'text-primary',
        title: '本周跑量偏低，可适当增加',
        description:
          `本周累计跑量仅 ${weeklyDistance.toFixed(1)} km，低于建议的周跑量基准。如身体状态良好，可考虑增加一次轻松跑或延长单次距离。`,
        aiQuestion: '我这周跑量不够，怎么安全地增加跑量？',
      })
    } else if (weeklyDistance !== null && weeklyDistance >= 50) {
      insights.push({
        icon: 'speed',
        iconColor: 'text-status-warning',
        title: '周跑量偏高，注意监控身体反应',
        description:
          `本周累计跑量达 ${weeklyDistance.toFixed(1)} km，属于较高水平。请密切关注腿部酸痛、静息心率变化等信号。`,
        aiQuestion: '我这周跑量很大，如何判断是否过度训练？',
      })
    } else if (weeklyDistance !== null && weeklyDistance >= 20) {
      insights.push({
        icon: 'check_circle',
        iconColor: 'text-status-success',
        title: '周跑量保持在合理范围',
        description:
          `本周跑量 ${weeklyDistance.toFixed(1)} km，符合当前训练阶段的建议范围。继续保持稳定的输出节奏。`,
        aiQuestion: '我的周跑量安排是否合理？',
      })
    }

    // 洞察 3: CTL vs ATL 关系
    if (ctl !== null && atl !== null && atl > ctl * 1.15) {
      insights.push({
        icon: 'alarm',
        iconColor: 'text-status-danger',
        title: '近期负荷偏大，注意恢复质量',
        description:
          `短期疲劳指数 ATL(${atl}) 明显高于长期体能储备 CTL(${ctl})，说明近期训练强度增长较快。建议接下来几天以轻松跑为主。`,
        aiQuestion: 'ATL 远超 CTL 怎么办？需要减量吗？',
      })
    } else if (ctl !== null && atl !== null && atl > ctl) {
      insights.push({
        icon: 'info',
        iconColor: 'text-primary',
        title: '短期负荷略高于长期均值',
        description:
          `ATL(${atl}) 略高于 CTL(${ctl})，属于正常的训练波动区间。确保每次高强度训练后有足够的恢复时间。`,
        aiQuestion: 'ATL 略高于 CTL 是坏事吗？',
      })
    } else if (ctl !== null && atl !== null) {
      insights.push({
        icon: 'check_circle',
        iconColor: 'text-status-success',
        title: '训练负荷平衡良好',
        description:
          `CTL(${ctl}) >= ATL(${atl})，体能储备覆盖了近期疲劳。这是理想的训练状态，适合维持或小幅提升强度。`,
        aiQuestion: '当前这个训练强度可以继续保持吗？',
      })
    }

    // 洞察 4: 伤病风险评估
    if (injuryRisk === '高风险') {
      insights.push({
        icon: 'medical_services',
        iconColor: 'text-status-danger',
        title: '伤病风险偏高，请谨慎训练',
        description:
          '综合多项指标分析，当前伤病风险等级为"高"。强烈建议降低训练强度，增加休息日，并关注关节和肌肉的异常信号。',
        aiQuestion: '我的伤病风险很高，应该如何调整计划来降低风险？',
      })
    } else if (injuryRisk === '中风险') {
      insights.push({
        icon: 'healing',
        iconColor: 'text-status-warning',
        title: '伤病风险需留意',
        description:
          '伤病风险处于中等水平。建议在接下来的训练中注重热身和拉伸，避免突然增加训练量或强度。',
        aiQuestion: '如何有效降低我的伤病风险？',
      })
    }

    // 如果洞察太少（数据正常），补充一条正面激励
    if (insights.length < 3) {
      insights.push({
        icon: 'emoji_events',
        iconColor: 'text-status-success',
        title: '训练节奏良好，继续保持',
        description:
          '综合各项指标来看，你目前的训练状态稳定且正向发展。坚持科学训练，进步指日可待！',
        aiQuestion: '帮我制定下一阶段的训练目标',
      })
    }

    return insights.slice(0, 4)
  }, [hasTrainingData, hasMetrics, metrics])

  // ---- 从 trainingRecords 构建图表数据 ----
  const chartBarData: ChartBarEntry[] = useMemo(() => {
    if (trainingRecords.length === 0) return []

    // 按日期排序（最新在前）
    const sorted = [...trainingRecords].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )

    // 取最近 12 周的数据，按周聚合
    const weeksMap = new Map<number, number>()
    const now = new Date()

    for (let i = 0; i < 12; i++) {
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - i * 7 - now.getDay() + 1) // 周一作为起始
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      const weekKey = i
      let weekLoad = 0

      for (const rec of sorted) {
        const recDate = new Date(rec.date)
        if (recDate >= weekStart && recDate <= weekEnd) {
          weekLoad += rec.distance * (1 + (rec.avgHr - 120) / 80)
        }
      }
      weeksMap.set(weekKey, Math.round(weekLoad))
    }

    // 转为数组并反转（从最早到最新）
    const entries: ChartBarEntry[] = []
    const loads: number[] = []
    for (let i = 11; i >= 0; i--) {
      const val = weeksMap.get(i) ?? 0
      loads.push(val)
    }

    const maxLoad = Math.max(...loads, 1)

    loads.forEach((val, idx) => {
      const status = classifyLoadStatus(val, maxLoad)
      const height = maxLoad > 0 ? Math.max(Math.round((val / maxLoad) * 100), val > 0 ? 8 : 2) : 2
      const entry: ChartBarEntry = {
        height,
        loadValue: val,
        status,
      }
      if (idx === loads.length - 1) {
        entry.weekLabel = `第${currentWeek}周`
      }
      entries.push(entry)
    })

    return entries
  }, [trainingRecords, currentWeek])

  // ---- 处理函数 ----

  const handleMetricCardClick = () => {
    navigate('/analysis')
  }

  const handleInsightAskAICallback = useMemo(
    () => (question: string) => {
      sendAIMessage(question)
      if (!isAIChatOpen) {
        toggleAIChat()
      }
    },
    [sendAIMessage, isAIChatOpen, toggleAIChat],
  )

  const handleTrainingClick = (trainingId: string) => {
    const training = trainings.find((t) => t.id === trainingId)
    if (training) {
      selectTraining(training)
      navigate('/detail')
    }
  }

  const handleBarClick = (index: number) => {
    setClickedBarIndex(clickedBarIndex === index ? null : index)
  }

  const weekRangeLabel = getWeekRangeLabel(currentWeek)

  // ================================================================
  // RENDER
  // ================================================================

  return (
    <div className="flex flex-col gap-gutter">
      {/* ======================== */}
      {/* 1. Welcome Header         */}
      {/* ======================== */}
      <section>
        <h2 className="font-headline-xl text-headline-xl text-text-primary">
          {getGreeting()}，{displayName}
        </h2>
        <div className="flex items-center gap-2 mt-1">
          <div
            className={`w-2 h-2 rounded-full animate-pulse ${
              hasTrainingData ? 'bg-status-success' : 'bg-on-surface-variant/40'
            }`}
          />
          <p className="text-on-surface-variant font-body-md">
            {hasTrainingData
              ? metrics.injuryRisk === '高风险'
                ? '当前训练状态：需要关注恢复'
                : metrics.injuryRisk === '中风险'
                  ? '当前训练状态：稳步调整中'
                  : '当前训练状态：高效提升中'
              : '还没有上传训练数据'}
          </p>
        </div>
      </section>

      {/* ======================== */}
      {/* 2. Three Metric Cards     */}
      {/* ======================== */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
        {/* --- Card 1: CTL --- */}
        <div
          onClick={handleMetricCardClick}
          className={`data-card p-stack-md rounded-lg flex items-center justify-between cursor-pointer hover:scale-[1.02] transition-transform ${
            !hasMetrics ? 'opacity-70' : ''
          }`}
          title={!hasMetrics ? '上传数据后查看' : undefined}
        >
          <div>
            <p className="font-label-caps text-label-caps text-secondary uppercase mb-1">
              体能 (CTL)
            </p>
            <div className="flex items-baseline gap-2">
              <span className="font-headline-lg text-headline-lg text-text-primary">
                {hasMetrics ? metrics.ctl : '\u2014'}
              </span>
              {!hasMetrics && (
                <span className="text-[11px] text-secondary">暂无数据</span>
              )}
              {hasMetrics && (
                <span className="text-status-success font-body-sm flex items-center font-semibold">
                  长期训练负荷
                </span>
              )}
            </div>
          </div>
          <div className="w-12 h-12 flex items-center justify-center rounded-full bg-primary/5">
            <span
              className={`material-symbols-outlined text-[28px] ${
                hasMetrics ? 'text-primary' : 'text-on-surface-variant/30'
              }`}
            >
              trending_up
            </span>
          </div>
        </div>

        {/* --- Card 2: ATL --- */}
        <div
          onClick={handleMetricCardClick}
          className={`data-card p-stack-md rounded-lg flex items-center justify-between cursor-pointer hover:scale-[1.02] transition-transform ${
            !hasMetrics ? 'opacity-70' : ''
          }`}
          title={!hasMetrics ? '上传数据后查看' : undefined}
        >
          <div>
            <p className="font-label-caps text-label-caps text-secondary uppercase mb-1">
              疲劳 (ATL)
            </p>
            <div className="flex items-baseline gap-2">
              <span className="font-headline-lg text-headline-lg text-text-primary">
                {hasMetrics ? metrics.atl : '\u2014'}
              </span>
              {!hasMetrics && (
                <span className="text-[11px] text-secondary">暂无数据</span>
              )}
              {hasMetrics && (
                <span className="text-status-warning font-body-sm font-semibold">
                  短期疲劳指数
                </span>
              )}
            </div>
          </div>
          <div className="w-12 h-12 flex items-center justify-center rounded-full bg-status-warning/5">
            <span
              className={`material-symbols-outlined text-[28px] ${
                hasMetrics ? 'text-status-warning' : 'text-on-surface-variant/30'
              }`}
            >
              bolt
            </span>
          </div>
        </div>

        {/* --- Card 3: Injury Risk --- */}
        <div
          onClick={handleMetricCardClick}
          className={`data-card p-stack-md rounded-lg flex items-center justify-between cursor-pointer hover:scale-[1.02] transition-transform ${
            !hasMetrics ? 'opacity-70' : ''
          }`}
          title={!hasMetrics ? '上传数据后查看' : undefined}
        >
          <div>
            <p className="font-label-caps text-label-caps text-secondary uppercase mb-1">
              伤病风险
            </p>
            <div className="flex items-center gap-2">
              <span className="font-headline-lg text-headline-lg text-text-primary">
                {hasMetrics && metrics.injuryRisk !== '无数据'
                  ? metrics.injuryRisk
                  : '\u2014'}
              </span>
              {hasMetrics && metrics.injuryRisk !== '无数据' && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${getInjuryRiskBgColor(
                    metrics.injuryRisk,
                  )} ${getInjuryRiskColor(metrics.injuryRisk)}`}
                >
                  {getInjuryRiskLabel(metrics.injuryRisk)}
                </span>
              )}
              {!hasMetrics && (
                <span className="text-[11px] text-secondary">暂无数据</span>
              )}
            </div>
          </div>
          <span
            className={`material-symbols-outlined text-[32px] ${
              hasMetrics && metrics.injuryRisk !== '无数据'
                ? getInjuryRiskColor(metrics.injuryRisk)
                : 'text-on-surface-variant/30'
            }`}
          >
            verified_user
          </span>
        </div>
      </section>

      {/* ======================== */}
      {/* 3. AI Coach Insights       */}
      {/*   + Weekly Schedule        */}
      {/* ======================== */}
      <section className="grid grid-cols-12 gap-gutter">
        {/* ---- Left Column: AI Coach Insights ---- */}
        <div className="col-span-12 lg:col-span-8">
          <div className="data-card rounded-lg h-full overflow-hidden flex flex-col">
            {!hasTrainingData ? (
              /* ====== EMPTY STATE: AI Insights ====== */
              <div className="flex-1 flex flex-col items-center justify-center p-stack-lg bg-surface-container-low/50 min-h-[360px]">
                <div className="w-20 h-20 rounded-full bg-primary/8 flex items-center justify-center mb-6">
                  <span
                    className="material-symbols-outlined text-[48px] text-primary/30"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    auto_awesome
                  </span>
                </div>
                <h3 className="font-headline-md text-headline-md text-text-primary mb-2">
                  AI 洞察等待数据
                </h3>
                <p className="text-body-sm text-secondary text-center max-w-sm leading-relaxed mb-8">
                  上传运动文件后，AI 将为你生成个性化训练洞察，
                  <br />
                  包括疲劳评估、负荷分析和伤病预警。
                </p>
                <button
                  onClick={() => navigate('/analysis')}
                  className="px-6 py-2.5 bg-primary text-white text-label-caps font-bold rounded-full hover:bg-primary/90 transition-colors cursor-pointer border-none"
                >
                  去上传
                </button>
              </div>
            ) : (
              /* ====== DATA STATE: AI Insights ====== */
              <>
                <div className="p-stack-lg border-b border-border-subtle/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <span
                        className="material-symbols-outlined"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        smart_toy
                      </span>
                    </div>
                    <div>
                      <h3 className="font-headline-md text-headline-md">
                        AI 教练洞察
                      </h3>
                      <p className="text-body-sm text-on-surface-variant">
                        基于 {trainingRecords.length} 条训练记录实时分析
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/analysis')}
                    className="text-primary font-label-caps text-label-caps hover:underline font-bold cursor-pointer bg-transparent border-none"
                  >
                    查看完整报告
                  </button>
                </div>

                <div className="p-stack-lg space-y-6">
                  {dynamicInsights.map((insight) => (
                    <div key={insight.title} className="flex items-start gap-4">
                      <span
                        className={`material-symbols-outlined ${insight.iconColor} mt-0.5`}
                      >
                        {insight.icon}
                      </span>
                      <div className="flex-1">
                        <p className="font-body-md font-semibold text-text-primary">
                          {insight.title}
                        </p>
                        <p className="text-body-sm text-secondary leading-relaxed mt-1">
                          {insight.description}
                        </p>
                      </div>
                      <button
                        onClick={() => handleInsightAskAICallback(insight.aiQuestion)}
                        className="shrink-0 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 rounded-full hover:bg-primary/20 transition-colors cursor-pointer border-none"
                      >
                        问AI
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ---- Right Column: Weekly Schedule ---- */}
        <div className="col-span-12 lg:col-span-4">
          <div className="data-card p-stack-lg rounded-lg h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-headline-md text-headline-md">
                  未来 7 天训练计划
                </h3>
                <p className="text-[11px] text-secondary mt-0.5">{weekRangeLabel}</p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={prevWeek}
                  className="w-7 h-7 flex items-center justify-center border border-border-subtle rounded hover:bg-surface-container transition-colors cursor-pointer bg-transparent"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    chevron_left
                  </span>
                </button>
                <button
                  onClick={nextWeek}
                  className="w-7 h-7 flex items-center justify-center border border-border-subtle rounded hover:bg-surface-container transition-colors cursor-pointer bg-transparent"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    chevron_right
                  </span>
                </button>
              </div>
            </div>

            {trainings.length === 0 ? (
              /* ====== EMPTY STATE: Training Schedule ====== */
              <div className="flex-1 flex flex-col items-center justify-center min-h-[260px] border-2 border-dashed border-border-subtle/40 rounded-lg bg-surface-container-low/30">
                <span className="material-symbols-outlined text-[40px] text-on-surface-variant/25 mb-3">
                  event_note
                </span>
                <p className="text-body-sm text-secondary text-center mb-1">
                  还没有训练计划
                </p>
                <p className="text-[11px] text-on-surface-variant text-center max-w-[200px] leading-relaxed mb-4">
                  上传数据后自动生成，或手动创建训练日程
                </p>
                <button
                  onClick={() => navigate('/analysis')}
                  className="px-4 py-1.5 text-xs font-semibold text-primary bg-primary/10 rounded-full hover:bg-primary/20 transition-colors cursor-pointer border-none"
                >
                  开始创建
                </button>
              </div>
            ) : (
              /* ====== DATA STATE: Training Items ====== */
              <div className="flex-1 space-y-4 overflow-y-auto">
                {trainings.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => handleTrainingClick(t.id)}
                    className="flex gap-4 cursor-pointer hover:bg-white transition-colors rounded-lg p-1 -m-1"
                  >
                    <div className="flex flex-col items-center min-w-[32px]">
                      <span className="text-[10px] font-bold text-secondary uppercase">
                        {t.day}
                      </span>
                      <span className="text-body-lg font-bold">
                        {new Date().getDate()}
                      </span>
                      <div className="w-px flex-1 bg-border-subtle my-2" />
                    </div>
                    <div className="flex-1 pb-4">
                      <div
                        className={`p-3 bg-surface-container-low rounded-lg border-l-4 shadow-sm ${t.zoneColor}`}
                      >
                        <div className="flex justify-between items-start">
                          <p className="text-body-sm font-bold text-text-primary">
                            {t.title}
                          </p>
                          <span className="text-[10px] font-medium px-1.5 py-0.5 bg-on-surface-variant/10 rounded text-on-surface-variant">
                            {t.hrZone ||
                              (t.type === 'easy'
                                ? 'Zone 2'
                                : t.type === 'tempo'
                                  ? 'Zone 4'
                                  : t.type === 'interval'
                                    ? 'Zone 5'
                                    : t.type === 'lsd'
                                      ? 'Zone 2-3'
                                      : t.type)}
                          </span>
                        </div>
                        {(t.distance || t.pace) && (
                          <p className="text-[11px] text-secondary mt-1 font-data-display">
                            {[t.distance ? `${t.distance}km` : null, t.pace]
                              .filter(Boolean)
                              .join(' \u00B7 ') || t.insight}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-2">
                        <div
                          className={`w-2 h-2 rounded-full ${getStatusDotColor(t.status)}`}
                        />
                        <span className="text-[10px] text-on-surface-variant">
                          {t.status === 'pending'
                            ? '待完成'
                            : t.status === 'completed'
                              ? '已完成'
                              : '已跳过'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ======================== */}
      {/* 4. Training Load Chart     */}
      {/* ======================== */}
      <section>
        <div className="data-card p-stack-lg rounded-lg">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
            <div>
              <p className="font-label-caps text-label-caps text-secondary uppercase mb-1">
                性能趋势 (Performance Trend)
              </p>
              <h3 className="font-headline-md text-headline-md">
                训练负荷与体能储备
              </h3>
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-primary rounded-sm" />
                <span className="text-body-sm text-on-surface-variant">
                  体能储备
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-status-warning rounded-sm" />
                <span className="text-body-sm text-on-surface-variant">
                  实际负荷
                </span>
              </div>
            </div>
          </div>

          {chartBarData.length === 0 ? (
            /* ====== EMPTY STATE: Chart ====== */
            <div
              className="w-full flex flex-col items-center justify-center relative"
              style={{ height: '280px' }}
            >
              {/* Faint axis lines for visual consistency */}
              <div className="absolute inset-0 flex flex-col justify-between px-2 pb-6 pointer-events-none">
                <div className="border-b border-border-subtle/20 w-full" />
                <div className="border-b border-border-subtle/15 w-full" />
                <div className="border-b border-border-subtle/15 w-full" />
                <div className="border-b border-border-subtle/15 w-full" />
                <div className="border-b border-border-subtle/20 w-full" />
              </div>

              {/* Center empty state content */}
              <div className="flex flex-col items-center z-10">
                <span className="material-symbols-outlined text-[44px] text-on-surface-variant/20 mb-3">
                  bar_chart
                </span>
                <p className="font-body-md text-secondary mb-1">暂无负荷数据</p>
                <p className="text-[12px] text-on-surface-variant text-center">
                  上传训练记录后显示趋势图
                </p>
              </div>
            </div>
          ) : (
            /* ====== DATA STATE: Bar Chart ====== */
            <>
              <div
                className="w-full flex items-end gap-3 px-2 pb-6 border-b border-border-subtle/50 relative"
                style={{ height: '280px' }}
              >
                {chartBarData.map((bar, index) => (
                  <div
                    key={index}
                    className="flex-1 flex flex-col justify-end gap-1 h-full relative group"
                    onMouseEnter={() => setHoveredBarIndex(index)}
                    onMouseLeave={() => setHoveredBarIndex(null)}
                    onClick={() => handleBarClick(index)}
                  >
                    {/* Click tooltip (always visible when clicked) */}
                    {clickedBarIndex === index && (
                      <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-inverse-surface text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap z-20 shadow-lg">
                        {bar.weekLabel || `第${index + 1}周`} 负荷值:{' '}
                        {bar.loadValue} / 状态:{' '}
                        {getLoadStatusLabel(bar.status)}
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-inverse-surface" />
                      </div>
                    )}
                    {/* Hover tooltip */}
                    <div
                      className={`absolute -top-10 left-1/2 -translate-x-1/2 bg-inverse-surface text-white text-[10px] px-2 py-1 rounded transition-opacity whitespace-nowrap z-10 ${
                        hoveredBarIndex === index
                          ? 'opacity-100'
                          : 'opacity-0'
                      }`}
                    >
                      {bar.weekLabel || `第${index + 1}周`} 负荷值:{' '}
                      {bar.loadValue} / 状态: {getLoadStatusLabel(bar.status)}
                    </div>
                    {/* Bar */}
                    <div
                      className={`${getLoadColor(bar.status)} rounded-sm w-full cursor-pointer hover:opacity-80 transition-opacity`}
                      style={{ height: `${bar.height}%` }}
                    />
                  </div>
                ))}
              </div>

              {/* X-axis Labels */}
              <div className="flex justify-between mt-3 px-2">
                <span className="text-[10px] text-secondary uppercase font-bold tracking-tight">
                  第 1 周
                </span>
                <span className="text-[10px] text-secondary uppercase font-bold tracking-tight">
                  第 6 周
                </span>
                <span className="text-[10px] text-secondary uppercase font-bold tracking-tight">
                  当前 (第 {currentWeek} 周)
                </span>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ======================== */}
      {/* 5. Bottom CTA               */}
      {/* ======================== */}
      <section className="flex justify-center pt-2 pb-4">
        <button
          onClick={() => navigate('/analysis')}
          className="px-8 py-3 bg-primary text-white font-label-caps font-bold rounded-full hover:bg-primary/90 hover:shadow-lg transition-all cursor-pointer border-none text-base"
        >
          {hasTrainingData ? '查看完整分析报告' : '开始使用 \u2192'}
        </button>
      </section>
    </div>
  )
}
