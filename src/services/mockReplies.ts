/**
 * AI Mock 回复引擎
 * 当用户未配置 API Key 时提供基于规则的智能回复
 * AppContext 和 AIAssistant 共用此模块
 */

import type { UserProfile, TrainingMetrics, TrainingRecord, UploadedFile, InjuryRecord } from '../context/AppContext'
import { type FitnessDecayResult } from './fitnessDecay'

export interface AIReplyContext {
  profile: UserProfile
  metrics: TrainingMetrics
  records: TrainingRecord[]
  files: UploadedFile[]
  injuryRecords: InjuryRecord[]
  decay?: FitnessDecayResult | null
}

/** 生成 AI 回复 */
export function generateDynamicAIReply(userMessage: string, context: AIReplyContext): string {
  const { profile, metrics, records, injuryRecords, decay } = context
  const name = profile.name || '跑友'
  
  const activeInjuries = injuryRecords.filter(r => !r.recovered)
  const hasActiveInjury = activeInjuries.length > 0
  const injuryWarning = hasActiveInjury 
    ? `\n\n⚠️ 注意：你当前有 ${activeInjuries.length} 处伤病记录，训练建议已考虑伤病因素。` 
    : ''
  
  // 衰减上下文
  const decayWarning = decay
    ? `\n\n📉 **水平衰减提醒**\n距上次训练已过 ${decay.gapDays} 天，等效 VDOT 从 ${decay.originalVDOT} 降至 ${decay.decayedVDOT}（下降 ${decay.totalDecayPercent}%）。建议以衰减后水平为基准，过渡 ${decay.recoveryWeeks} 周。`
    : ''

  // 匹配仪表盘快捷提问的特定问题
  if (userMessage.includes('训练强度可以继续保持') || userMessage.includes('强度可以保持') || userMessage.includes('继续保持吗')) {
    if (metrics.ctl === null || metrics.atl === null) {
      return `${name}，目前数据不足以评估训练强度。请先上传运动数据，我会帮你分析CTL/ATL指标。`
    }
    const tsb = metrics.ctl - metrics.atl
    let advice = ''
    if (tsb > 5) {
      advice = '你的体能储备充足，当前强度完全可以继续保持，甚至可以适当增加一些高质量训练。'
    } else if (tsb > -5) {
      advice = '当前强度基本合适，处于适应性训练区间。建议保持稳定，避免突然大幅增加负荷。'
    } else {
      advice = '近期疲劳积累较多，建议适当降低训练强度，增加休息日，让身体恢复。'
    }
    return `${name}，关于你的训练强度：\n\n**当前指标**\n- CTL（长期负荷）：${metrics.ctl}\n- ATL（短期疲劳）：${metrics.atl}\n- TSB（训练压力平衡）：${tsb.toFixed(1)}\n\n**建议**\n${advice}\n\n${metrics.injuryRisk === '高风险' ? '\n⚠️ 当前伤病风险偏高，无论体能状态如何，都建议降低强度。' : ''}${injuryWarning}`
  }

  if (userMessage.includes('跑量不够') || userMessage.includes('增加跑量') || userMessage.includes('跑量偏低')) {
    if (records.length === 0) {
      return `${name}，你目前还没有训练记录。建议从每周 3-4 次轻松跑开始，每次 5-10km，逐步建立有氧基础。`
    }
    return `${name}，关于跑量增加的建议：\n\n**当前情况**\n- 本周跑量：${metrics.weeklyDistance?.toFixed(1) ?? '0'} km\n- 训练次数：${records.length} 次\n\n**安全增加跑量的原则**\n1. **10%原则**：每周跑量增幅不超过 10%\n2. **80/20法则**：80%低强度 + 20%高强度\n3. **循序渐进**：先增加次数，再增加单次距离\n4. **倾听身体**：如有疼痛或疲劳加重，立即减量\n\n**具体建议**\n- 每周增加 1 次轻松跑（5-8km）\n- 保持现有训练强度不变\n- 确保每周有 1-2 天完全休息${injuryWarning}`
  }

  if (userMessage.includes('过度训练') || userMessage.includes('跑量很大') || userMessage.includes('跑量偏高')) {
    if (records.length === 0) {
      return `${name}，你目前还没有训练记录。上传数据后我可以帮你分析训练负荷是否合理。`
    }
    return `${name}，关于过度训练的判断：\n\n**过度训练的信号**\n1. 静息心率连续 3 天以上升高 5-10 bpm\n2. 运动表现持续下降（配速变慢、心率升高）\n3. 睡眠质量变差、食欲下降\n4. 情绪低落、缺乏训练动力\n5. 肌肉酸痛持续超过 72 小时\n\n**你的情况**\n- 本周跑量：${metrics.weeklyDistance?.toFixed(1) ?? '0'} km\n- 疲劳评分：${metrics.fatigueScore ?? '-'}\n- 伤病风险：${metrics.injuryRisk}\n\n${metrics.fatigueScore !== null && metrics.fatigueScore > 65 ? '⚠️ 你的疲劳评分偏高，建议增加休息日。' : '目前指标相对正常，但仍需密切关注身体信号。'}${injuryWarning}`
  }

  if (userMessage.includes('周跑量安排') || userMessage.includes('跑量是否合理') || userMessage.includes('跑量安排')) {
    if (records.length === 0) {
      return `${name}，你目前还没有训练记录。上传数据后我可以帮你评估跑量安排是否合理。`
    }
    return `${name}，关于你的周跑量评估：\n\n**当前数据**\n- 本周跑量：${metrics.weeklyDistance?.toFixed(1) ?? '0'} km\n- 训练次数：${records.length} 次\n- CTL：${metrics.ctl ?? '-'}\n\n**评估标准**\n- 初学者：每周 20-30 km\n- 中级跑者：每周 40-60 km\n- 高级跑者：每周 60-80+ km\n\n${metrics.weeklyDistance !== null && metrics.weeklyDistance < 20 ? '你的跑量偏低，如果身体状态良好，可以适当增加。' : metrics.weeklyDistance !== null && metrics.weeklyDistance > 60 ? '你的跑量较高，确保有足够的恢复时间和营养补充。' : '当前跑量处于合理范围，继续保持稳定的训练节奏。'}${injuryWarning}`
  }

  // 整体训练状态
  if (userMessage.includes('整体训练状态') || userMessage.includes('训练状态') || userMessage.includes('本周状态')) {
    if (records.length === 0) {
      return `你好 ${name}！\n\n目前你还没有任何训练记录。要开始使用，请先在「分析中心」上传你的运动数据文件（支持 FIT/GPX/TCX 格式）。\n\n上传后我会帮你做全面分析！`
    }
    const recentWeek = records.filter((r) => {
      const d = new Date(r.date)
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      return d >= weekAgo
    })
    return `你好 ${name}！以下是你当前的训练状态分析：\n\n**本周概况**\n- 训练次数：${recentWeek.length} 次\n- 累计跑量：${metrics.weeklyDistance ?? 0} km\n- 平均配速：${recentWeek.length > 0 ? (recentWeek.reduce((s, r) => { const p = r.avgPace.split(':'); return s + parseInt(p[0]) * 60 + parseInt(p[1]); }, 0) / recentWeek.length / 60).toFixed(1) : '-'} min/km\n\n**体能指标**\n- CTL（长期负荷）：${metrics.ctl ?? '-'}\n- ATL（短期负荷）：${metrics.atl ?? '-'}\n- 伤病风险：${metrics.injuryRisk}\n\n${metrics.injuryRisk === '高风险' ? '\n⚠️ 当前伤病风险偏高，建议适当降低训练强度。' : ''}${decayWarning}${injuryWarning}`
  }

  // 训练负荷
  if (userMessage.includes('训练负荷') || userMessage.includes('CTL') || userMessage.includes('ATL') || userMessage.includes('负荷')) {
    if (metrics.ctl === null) {
      return `目前还没有足够的训练数据来评估负荷。请先上传至少 1 周的运动数据。`
    }
    const tsb = metrics.ctl !== null && metrics.atl !== null ? (metrics.ctl - metrics.atl).toFixed(1) : '无数据'
    return `你的训练负荷分析如下：\n\n| 指标 | 数值 | 解读 |\n|------|------|------|\n| CTL 长期负荷 | ${metrics.ctl} | ${metrics.ctl < 50 ? '偏低，有氧基础待建立' : metrics.ctl < 80 ? '正常范围' : '较高，注意恢复'} |\n| ATL 短期负荷 | ${metrics.atl} | ${metrics.atl! < metrics.ctl! ? '低于CTL，处于正向适应中' : '高于CTL，近期强度较大'} |\n| 疲劳评分 | ${metrics.fatigueScore} | ${metrics.fatigueScore! < 45 ? '状态良好' : metrics.fatigueScore! < 65 ? '轻度疲劳' : '需要注意恢复'} |\n| 伤病风险 | ${metrics.injuryRisk} | - |\n| TSB | ${tsb} | - |`
  }

  // 有氧 vs 速度
  if (userMessage.includes('有氧') && userMessage.includes('速度')) {
    if (records.length === 0) {
      return '目前还没有训练数据。上传数据后我可以根据你的实际情况给出更有针对性的建议。\n\n一般来说，马拉松备赛应遵循"先有氧后速度"的原则。'
    }
    const easyCount = records.filter((r) => r.type.includes('轻松') || r.type.includes('LSD') || r.type.includes('长距离')).length
    const hardCount = records.filter((r) => r.type.includes('间歇') || r.type.includes('阈值') || r.type.includes('节奏')).length
    const ratio = easyCount / Math.max(records.length, 1)
    return `基于你最近的 ${records.length} 条训练记录分析：\n\n**当前训练结构**\n- 有氧类训练占比：${(ratio * 100).toFixed(0)}%\n- 强度类训练次数：${hardCount} 次\n\n**建议方向**：\n${ratio < 0.7 ? '你的有氧基础训练比例偏低。建议增加每周 1-2 次轻松跑/LSD，有氧是速度的基础。' : ratio > 0.85 ? '有氧基础不错，可以逐步引入更多强度训练（Tempo 或间歇），提升比赛配速能力。' : '当前有氧与强度的配比比较均衡，继续保持即可。'}`
  }

  // 疲劳恢复
  if (userMessage.includes('疲劳')) {
    if (metrics.fatigueScore === null) {
      return '暂无疲劳数据。上传训练记录后我可以帮你监控疲劳趋势。'
    }
    return `你的疲劳管理分析：\n\n**当前疲劳指数：${metrics.fatigueScore}/100**\n\n${metrics.fatigueScore < 35 ? '🟢 状态很好，身体恢复充分，适合安排高质量训练课。' : metrics.fatigueScore < 55 ? '🟡 轻度疲劳积累，属于正常训练反应。建议保证睡眠和营养。' : metrics.fatigueScore < 75 ? '🔴 中度疲劳，建议将下次高强度训练降为中等强度，或增加休息日。' : '⛔ 重度疲劳警告！建议完全休息 1-2 天，必要时就医检查。'}\n\n**恢复建议**：\n- 保证每晚 7-8 小时睡眠\n- 训练后 30 分钟内补充蛋白质+碳水\n- 每周至少 1 次泡沫轴/拉伸放松`
  }

  // 新手误区
  if (userMessage.includes('误区') || userMessage.includes('新手')) {
    return `马拉松备赛常见误区：\n\n**1. 跑量增长过快**\n> 每周增幅不超过 10%，否则伤病风险急剧上升\n\n**2. 忽视力量训练**\n> 核心和下肢力量不足是跑步伤病的头号元凶，建议每周 1-2 次\n\n**3. LSD 追求速度**\n> 长距离慢跑的核心是"慢"，配速应比目标马拉松配速慢 30-60 秒/km\n\n**4. 赛前减量太晚**\n> 全马建议赛前 2-3 周开始减量至原量的 40-60%\n\n**5. 只堆跑量不重质量**\n> 10 个垃圾跑量不如 1 个高质量 Tempo\n\n**6. 轻视恢复**\n> 训练只是刺激，休息才是进步的时刻`
  }

  if (userMessage.includes('心率') || userMessage.includes('区间') || userMessage.includes('Zone')) {
    return `${name}，关于心率训练区间：\n\n**心率区间系统**\n\n基于最大心率（HRmax）的5区间模型：\n\n| 区间 | 心率范围 | 名称 | 训练目的 |\n|------|----------|------|----------|\n| Zone 1 | 50-60% HRmax | 恢复区 | 恢复跑、热身 |\n| Zone 2 | 60-70% HRmax | 有氧基础 | LSD、基础耐力 |\n| Zone 3 | 70-80% HRmax | 有氧耐力 | 马拉松配速 |\n| Zone 4 | 80-90% HRmax | 乳酸阈值 | 节奏跑、10km配速 |\n| Zone 5 | 90-100% HRmax | 最大摄氧量 | 间歇跑、5km配速 |\n\n**心率训练建议：**\n- 80%训练时间在 Zone 2-3（有氧基础）\n- 15%训练时间在 Zone 4（提高阈值）\n- 5%训练时间在 Zone 5（提高VO2max）`
  }

  if (userMessage.includes('ATL 远超 CTL') || userMessage.includes('ATL远超CTL') || userMessage.includes('需要减量吗')) {
    if (metrics.ctl === null || metrics.atl === null) {
      return `${name}，目前数据不足以评估CTL/ATL关系。请先上传运动数据。`
    }
    const ratio = metrics.atl / (metrics.ctl || 1)
    return `${name}，关于你的CTL/ATL关系：\n\n**当前指标**\n- CTL（长期负荷）：${metrics.ctl}\n- ATL（短期疲劳）：${metrics.atl}\n- ATL/CTL比率：${ratio.toFixed(2)}\n\n**分析**\n${ratio > 1.15 ? '你的ATL明显高于CTL，说明近期训练强度增长较快，身体可能尚未适应。' : ratio > 1 ? '你的ATL略高于CTL，属于正常的训练波动范围。' : '你的CTL高于ATL，体能储备充足。'}\n\n**建议**\n${ratio > 1.15 ? '建议接下来 3-5 天以轻松跑为主，降低训练强度，让身体恢复平衡。' : '当前负荷基本平衡，可以继续保持或小幅调整。'}${injuryWarning}`
  }

  if (userMessage.includes('ATL 略高于 CTL') || userMessage.includes('ATL略高于CTL') || userMessage.includes('是坏事吗')) {
    if (metrics.ctl === null || metrics.atl === null) {
      return `${name}，目前数据不足以评估CTL/ATL关系。请先上传运动数据。`
    }
    return `${name}，关于ATL略高于CTL的情况：\n\n**当前指标**\n- CTL（长期负荷）：${metrics.ctl}\n- ATL（短期疲劳）：${metrics.atl}\n- TSB（训练压力平衡）：${(metrics.ctl - metrics.atl).toFixed(1)}\n\n**这不一定是坏事**\nATL略高于CTL是训练中的常见现象，特别是在：\n1. 进行高强度训练周期时\n2. 增加训练量后身体尚未完全适应时\n3. 比赛前的专项训练阶段\n\n**关键点**\n- 短期波动是正常的，长期趋势更重要\n- 确保每次高强度训练后有足够恢复时间\n- 关注身体信号，避免连续多天高强度训练${injuryWarning}`
  }

  if (userMessage.includes('伤病风险很高') || userMessage.includes('降低风险') || userMessage.includes('调整计划来降低')) {
    if (records.length === 0) {
      return `${name}，你目前还没有训练记录。上传数据后我可以帮你分析伤病风险并提供具体建议。`
    }
    return `${name}，关于降低伤病风险的建议：\n\n**你的当前伤病风险：** ${metrics.injuryRisk}\n\n**降低风险的策略**\n1. **调整训练结构**\n   - 80%低强度 + 20%高强度\n   - 避免连续高强度训练\n   - 每周安排 1-2 天完全休息\n\n2. **加强力量训练**\n   - 每周 2 次核心训练\n   - 臀部和下肢力量训练\n   - 跑前动态热身\n\n3. **改善恢复质量**\n   - 保证 7-8 小时睡眠\n   - 训练后拉伸放松\n   - 注意营养补充\n\n4. **监控身体信号**\n   - 静息心率变化\n   - 肌肉酸痛程度\n   - 训练表现趋势${injuryWarning}`
  }

  if (userMessage.includes('制定下一阶段') || userMessage.includes('训练目标') || userMessage.includes('训练计划目标')) {
    if (records.length === 0) {
      return `${name}，你目前还没有训练记录。上传数据后我可以帮你制定个性化的训练目标。\n\n**一般性建议**\n1. 设定具体、可衡量的目标（如：3个月内完成半马）\n2. 制定阶段性小目标\n3. 保持训练日志记录进展`
    }
    return `${name}，关于制定下一阶段训练目标：\n\n**你当前的训练状态**\n- 训练记录：${records.length} 条\n- CTL：${metrics.ctl ?? '-'}\n- ATL：${metrics.atl ?? '-'}\n- 伤病风险：${metrics.injuryRisk}\n\n**建议的目标方向**\n1. **短期目标（1-4周）**\n   - 维持当前训练节奏，建立稳定习惯\n   - 每周跑量增幅不超过 10%\n\n2. **中期目标（1-3个月）**\n   - 提升有氧耐力基础\n   - 逐步引入速度训练\n   - 完成一次 10K 或半马测试\n\n3. **长期目标（3-6个月）**\n   - 提升 VDOT 水平\n   - 完成目标赛事\n   - 建立可持续的训练体系\n\n**下一步行动**\n- 确定具体比赛日期和目标成绩\n- 制定详细的周训练计划\n- 设定每周可衡量的检查点${injuryWarning}`
  }

  if (userMessage.includes('恢复情况') || userMessage.includes('可以适当增加训练强度吗') || userMessage.includes('恢复如何')) {
    if (records.length === 0) {
      return `${name}，你目前还没有训练记录。上传数据后我可以帮你评估恢复情况。`
    }
    return `${name}，关于你的恢复情况评估：\n\n**当前指标**\n- CTL：${metrics.ctl ?? '-'}\n- ATL：${metrics.atl ?? '-'}\n- 疲劳评分：${metrics.fatigueScore ?? '-'}\n- 伤病风险：${metrics.injuryRisk}\n\n**恢复良好的信号**\n1. 静息心率稳定或略有下降\n2. 训练时感觉轻松，配速稳定\n3. 睡眠质量良好，精力充沛\n4. 肌肉酸痛在 48 小时内消退\n\n**是否可以增加强度？**\n${metrics.fatigueScore !== null && metrics.fatigueScore < 45 ? '你的恢复情况良好，可以适当增加训练强度。建议每周增加 1 次高质量训练（Tempo 或间歇）。' : metrics.fatigueScore !== null && metrics.fatigueScore < 65 ? '你的恢复情况一般，建议先保持当前强度，观察身体反应。' : '你的恢复情况需要关注，建议降低训练强度，增加休息日。'}\n\n**注意**\n- 增加强度前确保已完成充分的热身\n- 密切关注训练中的心率反应\n- 如有不适立即停止${injuryWarning}`
  }

  // 伤病
  if (userMessage.includes('伤病') || userMessage.includes('风险') || userMessage.includes('受伤') || userMessage.includes('疼痛')) {
    return `${name}，关于伤病预防和风险评估：\n\n**你的当前伤病风险：** ${metrics.injuryRisk}\n\n**常见跑步伤病及预防：**\n\n| 伤病 | 原因 | 预防方法 |\n|------|------|----------|\n| 跑者膝 | 跑量过大、臀部力量弱 | 臀桥训练、控制跑量 |\n| 足底筋膜炎 | 跑量增幅过快、鞋子老化 | 滚球放松、更换跑鞋 |\n| 小腿拉伤 | 高强度训练过多 | 拉伸、循序渐进 |\n| 髂胫束综合征 | 跑量过大、核心不稳定 | 侧臀训练、泡沫轴 |\n\n有任何不适请及时休息，跑步是长期运动，健康第一。`
  }

  // 默认回复
  const hasData = records.length > 0
  if (!hasData) {
    return `${name}，我是 EndureMate AI，专注于马拉松训练分析。\n\n**我可以帮你分析：**\n\n1. **训练状态评估** — CTL/ATL/TSB 体能指标解读\n2. **训练计划建议** — 周期化训练安排\n3. **成绩预测** — VDOT 能力评估\n4. **跑步科学知识** — 心率区间、伤病预防\n\n💡 上传训练数据后可获得更精准的分析\n\n请告诉我你想了解什么？`
  }

  return `${name}，我是 EndureMate AI。\n\n结合你的数据：\n- 训练记录：${records.length} 条\n- CTL：${metrics.ctl ?? '-'}\n- ATL：${metrics.atl ?? '-'}\n- 伤病风险：${metrics.injuryRisk}\n\n**快捷提问示例：**\n- "我本周整体训练状态如何？"\n- "我的负荷是否偏高？"\n- "现阶段该提升有氧还是速度？"\n- "疲劳堆积怎么恢复？"`
}
