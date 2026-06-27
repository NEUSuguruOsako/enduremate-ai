import { useNavigate } from 'react-router-dom'
import { useAppContext, type TrainingRecord } from '../context/AppContext'
import HeartRateChart from '../components/charts/HeartRateChart'
import PaceChart from '../components/charts/PaceChart'
import CadenceChart from '../components/charts/CadenceChart'
import ElevationChart from '../components/charts/ElevationChart'
import DynamicsCard from '../components/charts/DynamicsCard'
import InjuryFeedback from '../components/InjuryFeedback'
import TrainingAnalysis from '../components/TrainingAnalysis'

const recordTypeBadgeConfig: Record<string, { bg: string; textColor: string }> = {
  '轻松跑': { bg: 'bg-primary-fixed', textColor: 'text-on-primary-fixed' },
  '乳酸阈值跑': { bg: 'bg-error-container', textColor: 'text-on-error-container' },
  '间歇跑': { bg: 'bg-status-danger/20', textColor: 'text-status-danger' },
  '长距离跑': { bg: 'bg-tertiary-container', textColor: 'text-on-tertiary-container' },
  '力量训练': { bg: 'bg-surface-variant', textColor: 'text-on-surface-variant' },
}

// Training type badge configuration (consistent with TrainingPlan)
const typeBadgeConfig: Record<string, { text: string; bg: string; textColor: string }> = {
  rest: { text: '休息', bg: 'bg-surface-variant', textColor: 'text-on-surface-variant' },
  easy: { text: '轻松', bg: 'bg-primary-fixed', textColor: 'text-on-primary-fixed' },
  tempo: { text: '乳酸阈值', bg: 'bg-error-container', textColor: 'text-on-error-container' },
  interval: { text: '间歇', bg: 'bg-status-danger/20', textColor: 'text-status-danger' },
  lsd: { text: '耐力', bg: 'bg-tertiary-container', textColor: 'text-on-tertiary-container' },
  strength: { text: '力量', bg: 'bg-surface-variant', textColor: 'text-on-surface-variant' },
}

// Generic insight by training type
function getGenericInsight(type: string): string {
  const insights: Record<string, string> = {
    easy: '这是一次轻松跑训练，目标是建立有氧基础，保持低心率区间，让身体逐步适应跑步节奏。',
    tempo: '节奏跑训练旨在提升你的乳酸阈值能力，注意控制配速在目标区间内，感受"舒适的辛苦"状态。',
    interval: '间歇训练是提升最大摄氧量的关键课次，组间休息要充分，保证每组质量高于数量。',
    lsd: '长距离慢跑是有氧耐力的核心训练，配速应比马拉松目标配速慢30-60秒/km，注重完成而非速度。',
    strength: '力量训练有助于提升跑步经济性和预防伤病，注意动作标准，循序渐进增加负荷。',
    rest: '休息日同样重要！充分的恢复能让身体适应之前的训练刺激，为下一次高质量训练做准备。',
  }
  return insights[type] || '按计划完成本次训练，注意聆听身体信号，合理分配体能。'
}

// 自动问题识别结果
interface DetectedIssue {
  type: 'warning' | 'danger' | 'info'
  icon: string
  message: string
}

// 单训练自动问题识别（PRD 4.1）
function detectTrainingIssues(record: TrainingRecord): DetectedIssue[] {
  const issues: DetectedIssue[] = []

  if (!record.timeSeries || record.timeSeries.length < 10) return issues

  const ts = record.timeSeries
  const totalPoints = ts.length
  const halfIndex = Math.floor(totalPoints / 2)

  // 1. 配速波动大检测
  if (ts.length > 20) {
    const paceValues = ts.filter(p => (p.pace ?? 0) > 0).map(p => p.pace as number)
    if (paceValues.length > 5) {
      const avgPace = paceValues.reduce((a, b) => a + b, 0) / paceValues.length
      const variance = paceValues.reduce((sum, p) => sum + Math.pow(p - avgPace, 2), 0) / paceValues.length
      const cv = Math.sqrt(variance) / avgPace // 变异系数

      if (cv > 0.12) {
        issues.push({
          type: 'warning',
          icon: 'speed',
          message: `配速波动较大（变异系数 ${(cv * 100).toFixed(1)}%），训练中配速不稳定。建议训练时关注配速控制，保持节奏均匀。`
        })
      }
    }
  }

  // 2. 后半程掉速检测
  const firstHalf = ts.slice(0, halfIndex).filter(p => (p.pace ?? 0) > 0)
  const secondHalf = ts.slice(halfIndex).filter(p => (p.pace ?? 0) > 0)
  if (firstHalf.length > 5 && secondHalf.length > 5) {
    const firstAvgPace = firstHalf.reduce((s, p) => s + (p.pace as number), 0) / firstHalf.length
    const secondAvgPace = secondHalf.reduce((s, p) => s + (p.pace as number), 0) / secondHalf.length
    // 掉速超过8%算明显掉速
    const slowdownPercent = ((secondAvgPace - firstAvgPace) / firstAvgPace) * 100
    if (slowdownPercent > 8) {
      issues.push({
        type: slowdownPercent > 15 ? 'danger' : 'warning',
        icon: 'trending_down',
        message: `后半程明显掉速（${slowdownPercent.toFixed(1)}%），前半程平均配速 ${formatPaceNum(firstAvgPace)}/km，后半程 ${formatPaceNum(secondAvgPace)}/km。建议起步时适当放慢，保留体力。`
      })
    }
  }

  // 3. 心率偏高检测（平均心率/最大心率比值过高）
  if (record.maxHr > 0) {
    const hrRatio = record.avgHr / record.maxHr
    if (hrRatio > 0.92) {
      issues.push({
        type: 'danger',
        icon: 'favorite',
        message: `平均心率占最大心率比 ${(hrRatio * 100).toFixed(1)}%，全程心率持续偏高。这可能是训练强度过大、睡眠不足或身体疲劳的信号。建议下次适当降低配速。`
      })
    } else if (hrRatio > 0.85) {
      issues.push({
        type: 'warning',
        icon: 'favorite',
        message: `平均心率占最大心率比 ${(hrRatio * 100).toFixed(1)}%，心率水平偏高。注意观察是否为天气、睡眠等因素影响。`
      })
    }
  }

  // 4. 步频异常检测
  const cadenceValues = ts.filter(p => (p.cadence ?? 0) > 0).map(p => p.cadence as number)
  if (cadenceValues.length > 10) {
    const avgCadence = cadenceValues.reduce((a, b) => a + b, 0) / cadenceValues.length
    if (avgCadence < 155) {
      issues.push({
        type: 'info',
        icon: 'directions_run',
        message: `平均步频 ${avgCadence.toFixed(0)} spm 偏低，建议提高至 170-180 spm 以提升跑步经济性并降低伤病风险。`
      })
    }
  }

  // 5. 负向配速检测（配速越来越快，适合渐进跑/比赛，不适合轻松跑）
  if (firstHalf.length > 5 && secondHalf.length > 5) {
    const firstAvg = firstHalf.reduce((s, p) => s + (p.pace as number), 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((s, p) => s + (p.pace as number), 0) / secondHalf.length
    const negativeSplit = ((firstAvg - secondAvg) / firstAvg) * 100
    if (negativeSplit > 10 && record.type.includes('轻松')) {
      issues.push({
        type: 'info',
        icon: 'trending_up',
        message: `轻松跑中后半程加速较多（${negativeSplit.toFixed(1)}%）。轻松跑应保持匀速，不要越跑越快。`
      })
    }
  }

  return issues
}

function formatPaceNum(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Generate AI analysis based on record data (增强版，结合自动问题识别)
function generateAIAnalysis(record: TrainingRecord): string {
  const parts: string[] = []
  const issues = detectTrainingIssues(record)

  // 基础分析
  if (record.avgHr > 165) {
    parts.push('本次训练强度较高，心率处于区间4-5范围。')
  } else if (record.avgHr > 145) {
    parts.push('本次训练心率处于节奏跑区间，强度适中偏上。')
  } else if (record.avgHr > 130) {
    parts.push('本次训练处于有氧基础区间，是积累有氧能力的好机会。')
  }

  if (record.distance > 15) {
    parts.push('长距离训练完成良好，注意赛后充分恢复和营养补充。')
  } else if (record.distance > 10) {
    parts.push('中等距离训练，配速控制较为理想。')
  }

  if (record.maxHr - record.avgHr > 25) {
    parts.push('平均心率与最大心率差距较大，说明训练中有明显的强度波动。')
  }

  if (record.calories > 800) {
    parts.push(`消耗热量 ${record.calories} kcal，属于高能耗训练，请注意补充碳水化合物和蛋白质。`)
  }

  // 添加问题识别结果
  if (issues.length > 0) {
    parts.push('\n【自动检测问题】')
    for (const issue of issues) {
      parts.push(`• ${issue.message}`)
    }
  }

  return parts.length > 0 ? parts.join('\n\n') : `本次${record.type}整体表现稳定，继续保持当前训练节奏，逐步提升训练质量。`
}

// Day of week mapping
const dayOfWeekMap: Record<string, string> = {
  '星期一': '周一',
  '星期二': '周二',
  '星期三': '周三',
  '星期四': '周四',
  '星期五': '周五',
  '星期六': '周六',
  '星期日': '周日',
}

export default function TrainingDetail() {
  const navigate = useNavigate()
  const { selectedTraining, selectedRecord, completeTraining, toggleAIChat, sendAIMessage, trainingRecords, selectRecord, selectTraining, updateRecordInjury, profile, metrics, detailSourcePath } = useAppContext()

  const handleBack = () => {
    if (selectedTraining || selectedRecord) {
      selectRecord(null)
      selectTraining(null)
      navigate('/detail')
    } else if (detailSourcePath) {
      navigate(detailSourcePath)
    } else {
      navigate(-1)
    }
  }

  // ---- Case C: Both null - Show recent records ----
  if (!selectedTraining && !selectedRecord) {
    const allRecords = [...trainingRecords]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return (
      <div className="max-w-3xl mx-auto animate-in fade-in duration-300">
        {/* Header - 训练详情主页不需要返回按钮 */}
        <div className="flex items-center gap-3 mb-8">
          <h2 className="font-headline-xl text-headline-xl-mobile md:text-headline-xl text-text-primary">
            训练详情
          </h2>
        </div>

        {allRecords.length === 0 ? (
          /* Empty state */
          <div className="data-card p-stack-lg text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-surface-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[32px] text-secondary">assignment</span>
            </div>
            <p className="font-body-lg text-secondary mb-2">暂无训练记录</p>
            <p className="font-body-sm text-outline-variant">上传训练数据后即可查看详情</p>
          </div>
        ) : (
          /* Recent records list */
          <div className="data-card p-stack-lg">
            <h3 className="font-headline-md text-[18px] font-bold text-text-primary mb-6">
              最近训练记录
            </h3>
            <div className="space-y-3">
              {allRecords.map((record: any) => {
                const badge = recordTypeBadgeConfig[record.type] || { bg: 'bg-primary-fixed', textColor: 'text-on-primary-fixed' }
                return (
                  <button
                    key={record.id}
                    onClick={() => selectRecord(record)}
                    className="w-full flex items-center gap-4 p-4 bg-surface-bright rounded-xl hover:bg-surface-container transition-colors cursor-pointer border-none text-left"
                  >
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center">
                      <span className="data-font text-[16px] font-bold text-text-primary">
                        {record.date.split('-').slice(1).join('/')}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${badge.bg} ${badge.textColor}`}>
                          {record.type}
                        </span>
                        <span className="font-body-sm text-text-primary font-medium">
                          {record.distance.toFixed(1)} km
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-secondary">
                        <span>{record.duration}</span>
                        <span className="hidden sm:inline">|</span>
                        <span className="hidden sm:inline">{record.avgPace}/km</span>
                        <span className="hidden sm:inline">|</span>
                        <span className="hidden sm:inline">{record.avgHr} bpm</span>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-secondary flex-shrink-0">chevron_right</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ---- Case A: Scheduled/Future Training ----
  if (selectedTraining) {
    const badge = typeBadgeConfig[selectedTraining.type] || typeBadgeConfig.easy
    const insightText = selectedTraining.insight || getGenericInsight(selectedTraining.type)

    return (
      <div className="max-w-2xl mx-auto animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={handleBack}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors cursor-pointer border-none"
          >
            <span className="material-symbols-outlined text-text-primary">arrow_back</span>
          </button>
          <h2 className="font-headline-xl text-headline-xl-mobile md:text-headline-xl text-text-primary">
            训练详情
          </h2>
        </div>

        {/* Training Detail Card */}
        <div className="data-card p-stack-lg space-y-6">
          {/* Type Badge + Title */}
          <div className="flex items-start gap-4">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.textColor} shrink-0`}>
              {badge.text}
            </span>
            <div>
              <h3 className="font-headline-lg text-[22px] font-bold text-text-primary leading-tight">
                {selectedTraining.title}
              </h3>
              <p className="font-body-sm text-secondary mt-1">{dayOfWeekMap[selectedTraining.day] || selectedTraining.day}</p>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-surface-container-low rounded-xl">
            <InfoItem label="距离" value={selectedTraining.distance ? `${selectedTraining.distance} km` : '\u2014'} />
            <InfoItem label="目标配速" value={selectedTraining.pace || '\u2014'} />
            <InfoItem label="心率区间" value={selectedTraining.hrZone || '\u2014'} />
            <InfoItem label="预计时长" value={selectedTraining.duration ? `${selectedTraining.duration} min` : '\u2014'} />
            <InfoItem label="安排日期" value={dayOfWeekMap[selectedTraining.day] || selectedTraining.day} />
            <InfoItem label="训练阶段" value={`第${selectedTraining.week}周`} />
          </div>

          {/* AI Insight Section */}
          <div className="border-t border-border-subtle pt-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-[20px] text-primary">auto_awesome</span>
              <h4 className="font-body-md font-semibold text-text-primary">训练要点</h4>
            </div>
            <p className="font-body-sm text-secondary leading-relaxed pl-7">
              {insightText}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                completeTraining(selectedTraining.id)
                handleBack()
              }}
              disabled={selectedTraining.status === 'completed'}
              className={`flex-1 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer border-none inline-flex items-center justify-center gap-2 ${
                selectedTraining.status === 'completed'
                  ? 'bg-status-success/10 text-status-success cursor-default'
                  : 'bg-primary text-on-primary hover:brightness-110 active:scale-[0.98]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {selectedTraining.status === 'completed' ? 'check_circle' : 'check'}
              </span>
              {selectedTraining.status === 'completed' ? '已完成' : '标记完成'}
            </button>
            <button
              type="button"
              onClick={handleBack}
              className="px-5 py-2.5 bg-surface-container border border-border-subtle rounded-lg text-sm font-medium text-text-primary hover:bg-surface-container-high transition-colors cursor-pointer"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ---- Case B: Historical/Completed Record ----
  if (selectedRecord) {
    const recordBadge = recordTypeBadgeConfig[selectedRecord.type] || { bg: 'bg-primary-fixed', textColor: 'text-on-primary-fixed' }
    const aiAnalysis = generateAIAnalysis(selectedRecord)

    return (
      <div className="max-w-2xl mx-auto animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={handleBack}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors cursor-pointer border-none"
          >
            <span className="material-symbols-outlined text-text-primary">arrow_back</span>
          </button>
          <h2 className="font-headline-xl text-headline-xl-mobile md:text-headline-xl text-text-primary">
            训练详情
          </h2>
        </div>

        {/* Record Detail Card */}
        <div className="data-card p-stack-lg space-y-6">
          {/* Date Header + Type Badge */}
          <div className="flex items-start justify-between">
            <div>
              <p className="data-font text-[28px] font-bold text-text-primary leading-none">{selectedRecord.date}</p>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold mt-2 ${recordBadge.bg} ${recordBadge.textColor}`}>
                {selectedRecord.type}
              </span>
            </div>
          </div>

          {/* Main Stats Grid - Large Numbers */}
          <div className="grid grid-cols-3 gap-4 p-5 bg-surface-container-low rounded-xl">
            <div className="text-center">
              <p className="font-body-xs text-secondary mb-1">距离</p>
              <p className="data-font text-[26px] font-bold text-text-primary leading-none">
                {selectedRecord.distance.toFixed(1)}
              </p>
              <p className="data-font text-[12px] text-secondary mt-0.5">km</p>
            </div>
            <div className="text-center border-x border-border-subtle">
              <p className="font-body-xs text-secondary mb-1">时长</p>
              <p className="data-font text-[26px] font-bold text-text-primary leading-none">
                {selectedRecord.duration}
              </p>
            </div>
            <div className="text-center">
              <p className="font-body-xs text-secondary mb-1">配速</p>
              <p className="data-font text-[26px] font-bold text-text-primary leading-none">
                {selectedRecord.avgPace}
              </p>
              <p className="data-font text-[12px] text-secondary mt-0.5">/km</p>
            </div>
          </div>

          {/* HR Data Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-status-danger">favorite</span>
              <p className="font-body-sm font-medium text-text-primary">心率数据</p>
            </div>
            <div className="grid grid-cols-2 gap-4 pl-7">
              <div>
                <p className="font-body-xs text-secondary">平均心率</p>
                <p className="data-font text-[20px] font-semibold text-text-primary">
                  {selectedRecord.avgHr} <span className="text-[13px] text-secondary font-normal">bpm</span>
                </p>
              </div>
              <div>
                <p className="font-body-xs text-secondary">最大心率</p>
                <p className="data-font text-[20px] font-semibold text-text-primary">
                  {selectedRecord.maxHr} <span className="text-[13px] text-secondary font-normal">bpm</span>
                </p>
              </div>
            </div>
            {/* HR Bar Visualization */}
            <div className="pl-7 pt-2">
              <div className="w-full bg-surface-container rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-primary to-status-danger h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (selectedRecord.avgHr / selectedRecord.maxHr) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-outline-variant data-font">avg {selectedRecord.avgHr}</span>
                <span className="text-[10px] text-outline-variant data-font">max {selectedRecord.maxHr}</span>
              </div>
            </div>
          </div>

          {/* 跑步动态指标卡片 */}
          {selectedRecord.dynamics && (
            <div className="border-t border-border-subtle pt-5">
              <DynamicsCard dynamics={selectedRecord.dynamics} />
            </div>
          )}

          {/* 折线图区域（需要 timeSeries 数据）*/}
          {selectedRecord.timeSeries && selectedRecord.timeSeries.length > 0 ? (
            <div className="border-t border-border-subtle pt-5 space-y-5">
              <HeartRateChart
                data={selectedRecord.timeSeries}
                maxHr={selectedRecord.maxHr}
              />
              <PaceChart
                data={selectedRecord.timeSeries}
              />
              <CadenceChart data={selectedRecord.timeSeries} />
              <ElevationChart data={selectedRecord.timeSeries} />
            </div>
          ) : (
            <div className="border-t border-border-subtle pt-5">
              <div className="text-center py-6 bg-surface-container-low rounded-xl">
                <span className="material-symbols-outlined text-2xl text-secondary/40 mb-2">show_chart</span>
                <p className="font-body-sm text-secondary/60 text-xs">
                  上传 FIT 文件可查看心率、配速、步频等逐秒波动图
                </p>
              </div>
            </div>
          )}

          {/* Calories */}
          <div className="flex items-center gap-3 pl-7 pt-2">
            <span className="material-symbols-outlined text-[18px] text-status-warning">local_fire_department</span>
            <div>
              <p className="font-body-xs text-secondary">消耗热量</p>
              <p className="data-font text-[18px] font-semibold text-text-primary">
                {selectedRecord.calories} <span className="text-[13px] text-secondary font-normal">kcal</span>
              </p>
            </div>
          </div>

          {/* Source File Name */}
          {selectedRecord.fileName && (
            <div className="flex items-center gap-2 text-outline-variant pl-7">
              <span className="material-symbols-outlined text-[16px]">description</span>
              <p className="font-body-xs">
                来源: {selectedRecord.fileName}
              </p>
            </div>
          )}

          {/* 身体不适反馈 */}
          <InjuryFeedback
            currentParts={selectedRecord.injuryParts || []}
            currentDescription={selectedRecord.injuryDescription || ''}
            currentSeverity={selectedRecord.injurySeverity as '轻微' | '中等' | '严重' | undefined}
            onSave={(parts, description, severity) => {
              updateRecordInjury(selectedRecord.id, { parts, description, severity })
            }}
          />

          {/* 自动问题检测 (PRD 4.1) */}
          {(() => {
            const issues = detectTrainingIssues(selectedRecord)
            if (issues.length === 0) return null
            return (
              <div className="border-t border-border-subtle pt-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-[20px] text-status-warning">warning</span>
                  <h4 className="font-body-md font-semibold text-text-primary">自动检测问题</h4>
                </div>
                <div className="space-y-3">
                  {issues.map((issue, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-3 p-4 rounded-xl ${
                        issue.type === 'danger'
                          ? 'bg-status-danger/5 border border-status-danger/20'
                          : issue.type === 'warning'
                            ? 'bg-status-warning/5 border border-status-warning/20'
                            : 'bg-primary/5 border border-primary/20'
                      }`}
                    >
                      <span className={`material-symbols-outlined text-[18px] mt-0.5 ${
                        issue.type === 'danger'
                          ? 'text-status-danger'
                          : issue.type === 'warning'
                            ? 'text-status-warning'
                            : 'text-primary'
                      }`}>
                        {issue.icon}
                      </span>
                      <p className={`font-body-sm leading-relaxed ${
                        issue.type === 'danger'
                          ? 'text-status-danger'
                          : issue.type === 'warning'
                            ? 'text-text-primary'
                            : 'text-text-primary'
                      }`}>
                        {issue.message}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* AI Analysis Section */}
          <div className="border-t border-border-subtle pt-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-[20px] text-primary">psychology</span>
              <h4 className="font-body-md font-semibold text-text-primary">AI 分析</h4>
            </div>
            <div className="bg-primary-container/5 rounded-xl p-4 pl-7">
              <p className="font-body-sm text-secondary leading-relaxed whitespace-pre-line">
                {aiAnalysis}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                toggleAIChat()
                sendAIMessage(
                  `请帮我分析这次训练记录：${selectedRecord.date} ${selectedRecord.type}，距离 ${selectedRecord.distance}km，配速 ${selectedRecord.avgPace}/km，平均心率 ${selectedRecord.avgHr}bpm`
                )
              }}
              className="mt-4 ml-7 inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors cursor-pointer border-none"
            >
              <span className="material-symbols-outlined text-[16px]">chat</span>
              向全局 AI 提问
            </button>
          </div>

          {/* 单训练专属 AI 分析 */}
          <TrainingAnalysis
            record={selectedRecord}
            profile={profile}
            metrics={metrics}
          />

          {/* Close Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleBack}
              className="w-full px-5 py-2.5 bg-surface-container border border-border-subtle rounded-lg text-sm font-medium text-text-primary hover:bg-surface-container-high transition-colors cursor-pointer"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Fallback (should never reach here)
  return null
}

// Reusable info item component for scheduled training detail grid
function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-body-xs text-secondary mb-0.5">{label}</p>
      <p className="font-body-sm font-medium text-text-primary data-font">{value}</p>
    </div>
  )
}
