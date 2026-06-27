import type { TrainingRecord, UserProfile, TrainingItem, TrainingMetrics } from '../context/AppContext'

/**
 * 数据导出服务
 * 支持导出训练记录、训练计划、分析报告等
 */

// ========================
// CSV 导出
// ========================

/**
 * 导出训练记录为 CSV 格式
 */
export function exportTrainingRecordsToCSV(records: TrainingRecord[]): string {
  if (records.length === 0) return ''

  const headers = [
    '日期',
    '训练类型',
    '距离(km)',
    '时长',
    '平均配速',
    '平均心率',
    '最大心率',
    '消耗热量',
    '伤痛部位',
    '伤痛程度',
  ]

  const rows = records.map((record) => [
    record.date,
    record.type,
    record.distance.toString(),
    record.duration,
    record.avgPace,
    record.avgHr.toString(),
    record.maxHr.toString(),
    record.calories.toString(),
    record.injuryParts?.join(';') || '',
    record.injurySeverity || '',
  ])

  // CSV 格式化（处理特殊字符）
  const formatCsvCell = (cell: string): string => {
    if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
      return `"${cell.replace(/"/g, '""')}"`
    }
    return cell
  }

  const csvContent = [
    headers.map(formatCsvCell).join(','),
    ...rows.map((row) => row.map(formatCsvCell).join(',')),
  ].join('\n')

  return csvContent
}

/**
 * 导出训练计划为 CSV 格式
 */
export function exportTrainingPlanToCSV(trainings: TrainingItem[]): string {
  if (trainings.length === 0) return ''

  const headers = [
    '周次',
    '日期',
    '训练类型',
    '标题',
    '距离(km)',
    '时长(分钟)',
    '配速区间',
    '心率区间',
    '状态',
    '反馈',
    '训练说明',
  ]

  const rows = trainings.map((t) => [
    t.week.toString(),
    t.day,
    t.type,
    t.title,
    t.distance?.toString() || '',
    t.duration?.toString() || '',
    t.pace || '',
    t.hrZone || '',
    t.status,
    t.feedback || '',
    t.insight,
  ])

  const formatCsvCell = (cell: string): string => {
    if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
      return `"${cell.replace(/"/g, '""')}"`
    }
    return cell
  }

  const csvContent = [
    headers.map(formatCsvCell).join(','),
    ...rows.map((row) => row.map(formatCsvCell).join(',')),
  ].join('\n')

  return csvContent
}

/**
 * 导出用户档案为 CSV 格式
 */
export function exportProfileToCSV(profile: UserProfile): string {
  const headers = ['字段', '值']
  const rows = [
    ['姓名', profile.name],
    ['年龄', profile.age?.toString() || ''],
    ['性别', profile.gender || ''],
    ['身高(cm)', profile.height?.toString() || ''],
    ['体重(kg)', profile.weight?.toString() || ''],
    ['跑龄(年)', profile.runningYears?.toString() || ''],
    ['备赛目标', profile.goal],
    ['VDOT', profile.vdot?.toString() || ''],
    ['VO2max', profile.vo2max?.toString() || ''],
    ['静息心率', profile.restingHr?.toString() || ''],
    ['每周训练天数', profile.maxTrainingDaysPerWeek?.toString() || ''],
    ['单次最长距离(km)', profile.maxSingleDistance?.toString() || ''],
    ['伤病史', profile.injuryHistory],
  ]

  const formatCsvCell = (cell: string): string => {
    if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
      return `"${cell.replace(/"/g, '""')}"`
    }
    return cell
  }

  return [
    headers.map(formatCsvCell).join(','),
    ...rows.map((row) => row.map(formatCsvCell).join(',')),
  ].join('\n')
}

// ========================
// JSON 导出
// ========================

/**
 * 导出完整数据为 JSON 格式
 */
export function exportFullDataToJSON(data: {
  profile: UserProfile
  trainingRecords: TrainingRecord[]
  trainings: TrainingItem[]
  metrics: TrainingMetrics
}): string {
  return JSON.stringify(data, null, 2)
}

// ========================
// 文件下载
// ========================

/**
 * 下载文本文件
 */
export function downloadTextFile(content: string, filename: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

/**
 * 下载 CSV 文件
 */
export function downloadCSV(content: string, filename: string): void {
  downloadTextFile(content, filename, 'text/csv;charset=utf-8')
}

/**
 * 下载 JSON 文件
 */
export function downloadJSON(content: string, filename: string): void {
  downloadTextFile(content, filename, 'application/json;charset=utf-8')
}

// ========================
// 安全工具
// ========================

/**
 * HTML 实体转义，防止 XSS 注入
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// ========================
// 报告生成（简化版 PDF 替代）
// ========================

/**
 * 生成训练分析报告（Markdown 格式）
 * 可以转换为 PDF 或直接打印
 */
export function generateAnalysisReportMarkdown(
  profile: UserProfile,
  records: TrainingRecord[],
  metrics: TrainingMetrics
): string {
  const now = new Date()
  const dateStr = now.toLocaleDateString('zh-CN')

  let report = `# EndureMate AI 训练分析报告\n\n`
  report += `---\n\n`
  report += `**生成日期**: ${dateStr}\n\n`

  // 用户信息
  report += `## 用户档案\n\n`
  report += `- **姓名**: ${escapeHtml(profile.name)}\n`
  if (profile.age) report += `- **年龄**: ${profile.age} 岁\n`
  if (profile.gender) report += `- **性别**: ${escapeHtml(profile.gender)}\n`
  if (profile.height) report += `- **身高**: ${profile.height} cm\n`
  if (profile.weight) report += `- **体重**: ${profile.weight} kg\n`
  if (profile.vdot) report += `- **VDOT**: ${profile.vdot}\n`
  if (profile.goal) report += `- **备赛目标**: ${escapeHtml(profile.goal)}\n`
  report += `\n`

  // 训练指标
  report += `## 训练指标\n\n`
  report += `| 指标 | 数值 |\n`
  report += `|------|------|\n`
  report += `| CTL (长期负荷) | ${metrics.ctl ?? '--'} |\n`
  report += `| ATL (短期负荷) | ${metrics.atl ?? '--'} |\n`
  report += `| 伤病风险 | ${metrics.injuryRisk} |\n`
  report += `| 疲劳评分 | ${metrics.fatigueScore ?? '--'} |\n`
  report += `| 周跑量 | ${metrics.weeklyDistance ?? '--'} km |\n`
  report += `| 总训练次数 | ${metrics.totalRuns ?? '--'} |\n`
  report += `\n`

  // 训练记录汇总
  if (records.length > 0) {
    report += `## 训练记录汇总\n\n`
    report += `总计 ${records.length} 条训练记录。\n\n`

    // 最近10条记录
    report += `### 最近训练记录\n\n`
    report += `| 日期 | 类型 | 距离 | 配速 | 心率 |\n`
    report += `|------|------|------|------|------|\n`
    records.slice(0, 10).forEach((r) => {
      report += `| ${escapeHtml(r.date)} | ${escapeHtml(r.type)} | ${r.distance}km | ${escapeHtml(r.avgPace)}/km | ${r.avgHr}bpm |\n`
    })
    report += `\n`
  }

  // 风险提示
  if (metrics.riskMessages && metrics.riskMessages.length > 0) {
    report += `## 风险提示\n\n`
    metrics.riskMessages.forEach((msg) => {
      report += `- ${escapeHtml(msg)}\n`
    })
    report += `\n`
  }

  // 建议
  report += `## 训练建议\n\n`
  if (metrics.injuryRisk === '高风险') {
    report += `🔴 **当前伤病风险较高**，建议：\n`
    report += `- 立即降低训练强度\n`
    report += `- 增加休息日\n`
    report += `- 关注身体异常信号\n`
  } else if (metrics.injuryRisk === '中风险') {
    report += `🟡 **当前伤病风险中等**，建议：\n`
    report += `- 注重热身和拉伸\n`
    report += `- 避免突然增加训练量\n`
  } else {
    report += `🟢 **当前训练状态良好**，继续保持科学训练！\n`
  }
  report += `\n`

  // 页脚
  report += `---\n\n`
  report += `*本报告由 EndureMate AI 自动生成，仅供参考。*\n`

  return report
}

/**
 * 打印报告（使用浏览器打印功能）
 */
export function printReport(content: string): void {
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('无法打开打印窗口，请检查浏览器设置')
    return
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <title>训练分析报告</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 800px;
          margin: 40px auto;
          padding: 20px;
          color: #333;
          line-height: 1.6;
        }
        h1 { color: #1a1a1a; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
        h2 { color: #2563eb; margin-top: 30px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f5f5f5; }
        hr { border: none; border-top: 1px solid #eee; margin: 30px 0; }
        @media print {
          body { margin: 0; padding: 20px; }
        }
      </style>
    </head>
    <body>
      ${content.replace(/\n/g, '<br>').replace(/## /g, '<h2>').replace(/# /g, '<h1>').replace(/\|/g, ' | ').replace(/---/g, '<hr>')}
    </body>
    </html>
  `)

  printWindow.document.close()
  printWindow.print()
}

// ========================
// 导出按钮组件辅助函数
// ========================

/**
 * 获取导出文件名（带日期）
 */
export function getExportFilename(prefix: string, extension: string): string {
  const now = new Date()
  const dateStr = now.toISOString().split('T')[0]
  return `${prefix}_${dateStr}.${extension}`
}