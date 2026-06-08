import { useState, useRef, useCallback, useMemo } from 'react'
import { useAppContext } from '../context/AppContext'
import { parseTrainingFile } from '../context/AppContext'

// ========================
// 类型定义
// ========================

type UploadState = 'idle' | 'dragging' | 'uploading' | 'success' | 'error'

const VALID_EXTENSIONS = ['fit', 'gpx', 'tcx']
const PAGE_SIZE = 10

// ========================
// 工具函数
// ========================

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}

function getFileIcon(filename: string): string {
  const ext = getFileExtension(filename)
  switch (ext) {
    case 'fit':
      return 'description'
    case 'gpx':
      return 'map'
    case 'tcx':
      return 'description'
    default:
      return 'insert_drive_file'
  }
}

function getTypeBadgeStyle(type: string): string {
  if (type.includes('轻松')) return 'bg-primary/10 text-primary'
  if (type.includes('长距离')) return 'bg-status-warning/10 text-status-warning'
  if (type.includes('间歇')) return 'bg-status-danger/10 text-status-danger'
  if (type.includes('阈值') || type.includes('乳酸')) return 'bg-tertiary-container/30 text-tertiary'
  return 'bg-surface-container text-secondary'
}

// ========================
// 主组件
// ========================

export default function AnalysisCenter() {
  const ctx = useAppContext()

  // ---- 上传状态 ----
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [processingFileName, setProcessingFileName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ---- 表格状态 ----
  const [sortAsc, setSortAsc] = useState(false)
  const [sortBy, setSortBy] = useState<'date' | 'distance'>('date')
  const [currentPage, setCurrentPage] = useState(0)
  const [selectedRecord, setSelectedRecord] = useState<(typeof ctx.trainingRecords)[0] | null>(null)

  // ---- 图表交互状态 ----
  const [hoveredChart, setHoveredChart] = useState<number | null>(null)
  const [chartTooltip, setChartTooltip] = useState<{ x: number; y: number; value: string } | null>(null)
  const [chartsAnimated, setChartsAnimated] = useState(false)

  // ---- 强度分布展开状态 ----
  const [expandedIntensity, setExpandedIntensity] = useState<string | null>(null)

  // ================================================================
  // 计算属性：快速统计摘要栏
  // ================================================================

  const quickStats = useMemo(() => {
    const records = ctx.trainingRecords
    const totalRecords = records.length

    // 本周跑量
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    weekStart.setHours(0, 0, 0, 0)
    const weekMileage = records
      .filter((r) => new Date(r.date) >= weekStart)
      .reduce((sum, r) => sum + r.distance, 0)

    // 最长距离
    const maxDistance = records.length > 0 ? Math.max(...records.map((r) => r.distance)) : null

    // 平均配速（将配速转为秒数再平均）
    let avgPaceSec = 0
    if (records.length > 0) {
      const validPaceRecords = records.filter((r) => r.avgPace && r.avgPace !== '-')
      if (validPaceRecords.length > 0) {
        const totalSec = validPaceRecords.reduce((sum, r) => {
          const parts = r.avgPace.split(':')
          return sum + parseInt(parts[0]) * 60 + parseInt(parts[1])
        }, 0)
        avgPaceSec = Math.round(totalSec / validPaceRecords.length)
      }
    }

    // CTL 来自 metrics
    const ctl = ctx.metrics.ctl

    return { totalRecords, weekMileage, maxDistance, avgPaceSec, ctl }
  }, [ctx.trainingRecords, ctx.metrics])

  function formatAvgPace(sec: number): string {
    if (sec <= 0) return '--:--'
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // ================================================================
  // 计算属性：排序 + 分页的训练记录
  // ================================================================

  const sortedRecords = useMemo(() => {
    const list = [...ctx.trainingRecords]
    if (sortBy === 'date') {
      list.sort((a, b) => {
        const diff = new Date(b.date).getTime() - new Date(a.date).getTime()
        return sortAsc ? -diff : diff
      })
    } else {
      list.sort((a, b) => {
        const diff = a.distance - b.distance
        return sortAsc ? diff : -diff
      })
    }
    return list
  }, [ctx.trainingRecords, sortBy, sortAsc])

  const totalPages = Math.ceil(sortedRecords.length / PAGE_SIZE)
  const paginatedRecords = sortedRecords.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

  // ================================================================
  // 计算属性：趋势图表数据 — 完全从 trainingRecords 动态生成
  // ================================================================

  const chartData = useMemo(() => {
    const records = [...ctx.trainingRecords].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    )

    if (records.length === 0) {
      return { mileageData: [], loadData: [], fatigueData: [], labels: [] }
    }

    // 按日期聚合为周数据点
    const weekMap = new Map<string, { distance: number; load: number; count: number }>()

    records.forEach((r) => {
      const d = new Date(r.date)
      const monday = new Date(d)
      monday.setDate(d.getDate() - d.getDay() + 1)
      const key = monday.toISOString().split('T')[0]

      const existing = weekMap.get(key) || { distance: 0, load: 0, count: 0 }
      existing.distance += r.distance
      existing.load += r.distance * (1 + (r.avgHr - 120) / 80)
      existing.count += 1
      weekMap.set(key, existing)
    })

    const weeks = Array.from(weekMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))

    // 取最近最多 11 个周数据点用于绘图
    const recentWeeks = weeks.slice(-11)

    const mileageData = recentWeeks.map((w) => Math.round(w[1].distance))
    const loadData = recentWeeks.map((w) => Math.round(w[1].load))
    const fatigueData = recentWeeks.map((_, i) => {
      if (i === 0) return Math.round(loadData[i] || 0)
      const prevLoad = i >= 1 ? (recentWeeks[i - 1][1].load || 0) : 0
      return Math.round(Math.max(0, prevLoad * 0.9 - (loadData[i] || 0) * 0.3 + 20))
    })
    const labels = recentWeeks.map((w) => w[0].slice(5))

    return { mileageData, loadData, fatigueData, labels }
  }, [ctx.trainingRecords])

  function getChartValue(chartIndex: number, pointIndex: number): string {
    if (chartIndex === 0) return `周跑量: ${chartData.mileageData[pointIndex]} km`
    if (chartIndex === 1) return `负荷: ${chartData.loadData[pointIndex]}`
    return `疲劳值: ${chartData.fatigueData[pointIndex]}`
  }

  function generateSVGPath(data: number[], maxVal: number): string {
    if (data.length === 0) return ''
    const step = 100 / Math.max(data.length - 1, 1)
    return data
      .map((val, i) => {
        const x = i * step
        const y = 40 - (val / Math.max(maxVal, 1)) * 36
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
      })
      .join(' ')
  }

  // ================================================================
  // 计算属性：强度分布 — 从训练记录类型动态计算
  // ================================================================

  const intensityDistribution = useMemo(() => {
    const records = ctx.trainingRecords
    if (records.length === 0) {
      return { easy: 0, threshold: 0, interval: 0, strength: 0, details: {} }
    }

    let easyDist = 0
    let easyCount = 0
    let easyTotalPace = 0
    let thresholdDist = 0
    let thresholdCount = 0
    let thresholdTotalPace = 0
    let intervalDist = 0
    let intervalCount = 0
    let intervalTotalPace = 0

    records.forEach((r) => {
      if (r.type.includes('轻松')) {
        easyDist += r.distance
        easyCount++
        const p = r.avgPace.split(':')
        easyTotalPace += parseInt(p[0]) * 60 + parseInt(p[1])
      } else if (r.type.includes('阈值') || r.type.includes('乳酸')) {
        thresholdDist += r.distance
        thresholdCount++
        const p = r.avgPace.split(':')
        thresholdTotalPace += parseInt(p[0]) * 60 + parseInt(p[1])
      } else if (r.type.includes('间歇')) {
        intervalDist += r.distance
        intervalCount++
        const p = r.avgPace.split(':')
        intervalTotalPace += parseInt(p[0]) * 60 + parseInt(p[1])
      }
    })

    const total = easyDist + thresholdDist + intervalDist || 1

    const formatPace = (totalSec: number, count: number): string => {
      if (count === 0) return '--:-- /km'
      const sec = Math.round(totalSec / count)
      return `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')} /km`
    }

    return {
      easy: Math.round((easyDist / total) * 100),
      threshold: Math.round((thresholdDist / total) * 100),
      interval: Math.round((intervalDist / total) * 100),
      strength: Math.max(0, 100 - Math.round((easyDist / total) * 100) - Math.round((thresholdDist / total) * 100) - Math.round((intervalDist / total) * 100)),
      details: {
        easy: { totalKm: `${easyDist.toFixed(1)} km`, sessions: `${easyCount} 次`, avgPace: formatPace(easyTotalPace, easyCount) },
        threshold: { totalKm: `${thresholdDist.toFixed(1)} km`, sessions: `${thresholdCount} 次`, avgPace: formatPace(thresholdTotalPace, thresholdCount) },
        interval: { totalKm: `${intervalDist.toFixed(1)} km`, sessions: `${intervalCount} 次`, avgPace: formatPace(intervalTotalPace, intervalCount) },
      },
    }
  }, [ctx.trainingRecords])

  // ================================================================
  // 核心上传处理逻辑
  // ================================================================

  const handleFiles = useCallback(async (fileList: FileList) => {
    if (fileList.length === 0) return

    // 验证所有文件格式
    const validFiles: File[] = []
    const invalidFiles: string[] = []

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i]
      const ext = getFileExtension(file.name)
      if (!VALID_EXTENSIONS.includes(ext)) {
        invalidFiles.push(file.name)
      } else {
        validFiles.push(file)
      }
    }

    // 如果有无效文件且没有有效文件，报错
    if (validFiles.length === 0 && invalidFiles.length > 0) {
      setUploadState('error')
      setErrorMsg(`不支持的文件格式：${invalidFiles.join('、')}，请上传 .fit / .gpx / .tcx 文件`)
      return
    }

    // 如果部分无效，继续处理有效的
    setUploadState('uploading')
    setErrorMsg('')
    setProcessingFileName(validFiles.length === 1 ? validFiles[0].name : `${validFiles[0].name} 等 ${validFiles.length} 个文件`)

    // 逐个处理每个文件（模拟串行解析）
    let successCount = 0
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i]

      // 更新当前处理中的文件名
      setProcessingFileName(file.name)

      // 模拟解析延迟（每个文件 800-1500ms）
      await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 700))

      try {
        // 使用 context 的解析函数
        const records = parseTrainingFile(file.name)

        // 创建文件条目
        const fileId = `file_${Date.now()}_${i}`
        const uploadedFile = {
          id: fileId,
          name: file.name,
          size: formatFileSize(file.size),
          date: new Date().toLocaleDateString('zh-CN'),
          parsedRecords: records,
        }

        // 更新所有 context 状态
        ctx.addUploadedFile(uploadedFile)
        ctx.processParsedData(records, fileId)
        successCount++
      } catch (err) {
        console.error(`解析文件 ${file.name} 失败:`, err)
      }
    }

    if (successCount === validFiles.length) {
      setUploadState('success')
    } else if (successCount > 0) {
      // 部分成功
      setUploadState('success')
      setErrorMsg(`成功解析 ${successCount}/${validFiles.length} 个文件`)
    } else {
      setUploadState('error')
      setErrorMsg('所有文件解析失败，请检查文件格式后重试')
      return
    }

    // 2.5秒后自动重置到 idle
    setTimeout(() => {
      setUploadState('idle')
      setErrorMsg('')
    }, 2500)
  }, [ctx])

  // ================================================================
  // 拖拽事件处理
  // ================================================================

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    if (uploadState === 'idle' || uploadState === 'dragging') {
      setUploadState('dragging')
    }
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    if (uploadState === 'dragging') {
      setUploadState('idle')
    }
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setUploadState('idle')
    await handleFiles(e.dataTransfer.files)
  }

  function handleClickUpload() {
    fileInputRef.current?.click()
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (files && files.length > 0) {
      await handleFiles(files)
    }
    e.target.value = ''
  }

  // ================================================================
  // 表格交互处理
  // ================================================================

  function handleSortToggle(field: 'date' | 'distance') {
    if (sortBy === field) {
      setSortAsc((prev) => !prev)
    } else {
      setSortBy(field)
      setSortAsc(false)
    }
    setCurrentPage(0)
  }

  function handleInsightClick(question: string) {
    ctx.sendAIMessage(question)
    ctx.toggleAIChat()
  }

  function handleDeleteFile(fileId: string) {
    ctx.removeUploadedFile(fileId)
  }

  // ================================================================
  // 渲染
  // ================================================================

  const hasData = ctx.trainingRecords.length > 0
  const hasChartData = chartData.mileageData.length >= 2

  return (
    <div className="flex-1 p-margin-desktop bg-background">
      <style>{`
        @keyframes drawLine {
          to { stroke-dashoffset: 0; }
        }
        .chart-path-animate {
          stroke-dasharray: 300;
          stroke-dashoffset: 300;
          animation: drawLine 1.5s ease-out forwards;
        }
        @keyframes spin-slow {
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 1s linear infinite;
        }
        @keyframes progress-indeterminate {
          0% { transform: translateX(-100%); width: 30%; }
          50% { transform: translateX(0%); width: 60%; }
          100% { transform: translateX(100%); width: 30%; }
        }
        .progress-bar-animated {
          animation: progress-indeterminate 1.8s ease-in-out infinite;
        }
        @keyframes scale-up {
          from { transform: scale(1); }
          to { transform: scale(1.02); }
        }
        .scale-up-hover:hover {
          animation: scale-up 0.2s ease-out forwards;
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.3s ease-out forwards;
        }
      `}</style>

      <div className="max-w-container-max-width mx-auto space-y-gutter">

        {/* ============================================== */}
        {/* 1. 页面标题 */}
        {/* ============================================== */}
        <div className="flex justify-between items-end">
          <div>
            <h2 className="font-headline-xl text-headline-xl text-text-primary">数据分析中心</h2>
            <p className="font-body-md text-body-md text-secondary mt-1">
              {!hasData
                ? '上传你的运动数据，开始智能分析'
                : `已上传 ${ctx.uploadedFiles.length} 个文件，${ctx.trainingRecords.length} 条记录`}
            </p>
          </div>
        </div>

        {/* ============================================== */}
        {/* 8. 快速统计摘要栏（NEW） */}
        {/* ============================================== */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {[
            {
              label: '总记录数',
              value: quickStats.totalRecords.toString(),
              unit: '',
              icon: 'dataset',
            },
            {
              label: '本周跑量',
              value: quickStats.weekMileage > 0 ? quickStats.weekMileage.toFixed(1) : '\u2014',
              unit: quickStats.weekMileage > 0 ? 'km' : '',
              icon: 'directions_run',
            },
            {
              label: '最长距离',
              value: quickStats.maxDistance !== null ? quickStats.maxDistance.toFixed(1) : '\u2014',
              unit: quickStats.maxDistance !== null ? 'km' : '',
              icon: 'straighten',
            },
            {
              label: '平均配速',
              value: quickStats.avgPaceSec > 0 ? formatAvgPace(quickStats.avgPaceSec) : '\u2014',
              unit: quickStats.avgPaceSec > 0 ? '/km' : '',
              icon: 'timer',
            },
            {
              label: 'CTL',
              value: quickStats.ctl !== null ? quickStats.ctl.toString() : '\u2014',
              unit: '',
              icon: 'trending_up',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`data-card rounded-lg p-3 shadow-sm transition-all ${hasData ? '' : 'opacity-50'}`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="material-symbols-outlined text-[16px] text-secondary">{stat.icon}</span>
                <span className="font-label-caps text-label-caps text-secondary text-xs uppercase tracking-wide">
                  {stat.label}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-data-display text-data-display text-text-primary text-lg leading-none">
                  {stat.value}
                </span>
                {stat.unit && (
                  <span className="font-body-sm text-body-sm text-secondary text-xs">{stat.unit}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 主布局：左主内容 + 右 AI 面板 */}
        <div className="flex flex-col lg:flex-row gap-gutter">
          {/* ===== 左列 ===== */}
          <div className="flex-1 flex flex-col gap-gutter">

            {/* ============================================== */}
            {/* 2. 文件上传区域（THE HERO COMPONENT） */}
            {/* ============================================== */}
            <section className="data-card rounded-lg p-stack-lg shadow-sm">
              <div
                className={`border-2 border-dashed rounded-lg min-h-[200px] flex flex-col items-center justify-center text-center cursor-pointer bg-surface-bright transition-all duration-200 ${
                  uploadState === 'dragging'
                    ? 'border-primary-container bg-primary/[0.05] scale-[1.01]'
                    : uploadState === 'error'
                      ? 'border-status-danger bg-status-danger/[0.04]'
                      : uploadState === 'success'
                        ? 'border-status-success bg-status-success/[0.04]'
                        : uploadState === 'uploading'
                          ? 'border-primary-container'
                          : 'border-border-subtle hover:border-primary/50 hover:bg-surface-bright'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleClickUpload}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".fit,.gpx,.tcx"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {uploadState === 'idle' && (
                  <>
                    <span className="material-symbols-outlined text-5xl text-primary mb-4">
                      cloud_upload
                    </span>
                    <h3 className="font-headline-md text-headline-md text-text-primary mb-2">
                      拖拽文件到此处 或 点击选择
                    </h3>
                    <p className="font-body-md text-body-md text-secondary mb-4">
                      支持 FIT / GPX / TCX 格式，可批量上传多个文件
                    </p>
                    <p className="font-body-sm text-body-sm text-secondary/70 text-xs">
                      支持批量上传 · 单个文件最大 50 MB
                    </p>
                  </>
                )}

                {uploadState === 'dragging' && (
                  <>
                    <span className="material-symbols-outlined text-5xl text-primary mb-4 animate-bounce">
                      cloud_upload
                    </span>
                    <h3 className="font-headline-md text-headline-md text-primary font-bold mb-2">
                      释放以上传
                    </h3>
                    <p className="font-body-md text-body-md text-secondary">
                      松开鼠标即可开始解析
                    </p>
                  </>
                )}

                {uploadState === 'uploading' && (
                  <>
                    <span className="material-symbols-outlined text-5xl text-primary mb-3 animate-spin-slow">
                      progress_activity
                    </span>
                    <h3 className="font-headline-md text-headline-md text-text-primary mb-1">
                      正在解析: {processingFileName}
                    </h3>
                    <p className="font-body-sm text-body-sm text-secondary mb-4">
                      提取训练数据中...
                    </p>
                    <div className="w-56 bg-surface-container rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 progress-bar-animated"
                        style={{ width: '65%' }}
                      />
                    </div>
                  </>
                )}

                {uploadState === 'success' && (
                  <>
                    <span className="material-symbols-outlined text-5xl text-status-success mb-3">
                      check_circle
                    </span>
                    <h3 className="font-headline-md text-headline-md text-status-success mb-1">
                      解析完成！
                      {errorMsg && <span className="text-xs text-secondary font-normal ml-2">({errorMsg})</span>}
                    </h3>
                    <p className="font-body-sm text-body-sm text-secondary">
                      共处理 {ctx.uploadedFiles.length} 个文件，{ctx.trainingRecords.length} 条训练记录
                    </p>
                  </>
                )}

                {uploadState === 'error' && (
                  <>
                    <span className="material-symbols-outlined text-5xl text-status-danger mb-3">
                      error
                    </span>
                    <h3 className="font-headline-md text-headline-md text-status-danger mb-1">
                      解析失败
                    </h3>
                    <p className="font-body-sm text-body-sm text-status-danger mb-4">
                      {errorMsg}
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setUploadState('idle')
                        setErrorMsg('')
                      }}
                      className="px-4 py-1.5 rounded bg-status-danger/10 text-status-danger text-sm font-medium hover:bg-status-danger/20 transition-colors"
                    >
                      重试
                    </button>
                  </>
                )}
              </div>
            </section>

            {/* ============================================== */}
            {/* 3. 已上传文件列表 */}
            {/* ============================================== */}
            {ctx.uploadedFiles.length > 0 && (
              <section className="data-card rounded-lg p-stack-lg shadow-sm">
                <div className="flex items-center justify-between mb-stack-md">
                  <h3 className="font-headline-md text-headline-md text-text-primary">
                    已上传文件
                    <span className="ml-2 inline-flex items-center justify-center w-6 h-5 rounded-full bg-primary-container text-on-primary text-xs font-label-caps">
                      {ctx.uploadedFiles.length}
                    </span>
                  </h3>
                </div>
                <div className="space-y-2">
                  {ctx.uploadedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 p-3 bg-surface-bright rounded-lg border border-border-subtle hover:border-primary/30 transition-colors group animate-fade-in-up"
                    >
                      <span className="material-symbols-outlined text-secondary text-[20px]">
                        {getFileIcon(file.name)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-body-sm text-body-sm text-text-primary truncate font-medium">
                          {file.name}
                        </p>
                        <p className="font-body-sm text-body-sm text-secondary text-xs mt-0.5">
                          {file.size} · {file.date}
                        </p>
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-status-success/10 text-status-success">
                        {file.parsedRecords?.length || 0} 条记录
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteFile(file.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-status-danger/10 text-secondary hover:text-status-danger transition-all"
                        title="删除文件"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ============================================== */}
            {/* 4. 训练记录表格（THE DATA OUTPUT） */}
            {/* ============================================== */}
            <section className="data-card rounded-lg p-stack-lg shadow-sm">
              <div className="flex items-center justify-between mb-stack-md">
                <h3 className="font-headline-md text-headline-md text-text-primary">
                  训练记录
                  <span className="ml-2 inline-flex items-center justify-center w-6 h-5 rounded-full bg-primary-container text-on-primary text-xs font-label-caps">
                    {sortedRecords.length}
                  </span>
                </h3>
                <span className="font-body-sm text-body-sm text-secondary text-xs">
                  共 {sortedRecords.length} 条记录
                </span>
              </div>

              {paginatedRecords.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border-subtle">
                          <th
                            className="text-left py-3 px-3 font-label-caps text-label-caps text-secondary cursor-pointer hover:text-primary select-none"
                            onClick={() => handleSortToggle('date')}
                          >
                            <span className="flex items-center gap-1">
                              日期
                              <span className="material-symbols-outlined text-[14px]">
                                {sortBy === 'date' ? (sortAsc ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                              </span>
                            </span>
                          </th>
                          <th className="text-left py-3 px-3 font-label-caps text-label-caps text-secondary">类型</th>
                          <th
                            className="text-right py-3 px-3 font-label-caps text-label-caps text-secondary cursor-pointer hover:text-primary select-none"
                            onClick={() => handleSortToggle('distance')}
                          >
                            <span className="flex items-center justify-end gap-1">
                              距离(km)
                              <span className="material-symbols-outlined text-[14px]">
                                {sortBy === 'distance' ? (sortAsc ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                              </span>
                            </span>
                          </th>
                          <th className="text-right py-3 px-3 font-label-caps text-label-caps text-secondary">时长</th>
                          <th className="text-right py-3 px-3 font-label-caps text-label-caps text-secondary">配速/km</th>
                          <th className="text-right py-3 px-3 font-label-caps text-label-caps text-secondary">平均心率</th>
                          <th className="text-right py-3 px-3 font-label-caps text-label-caps text-secondary">最大心率</th>
                          <th className="text-right py-3 px-3 font-label-caps text-label-caps text-secondary">消耗(kcal)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedRecords.map((record) => (
                          <tr
                            key={record.id}
                            className="border-b border-border-subtle last:border-0 hover:bg-surface-bright cursor-pointer transition-colors"
                            onClick={() => ctx.selectRecord(record)}
                          >
                            <td className="py-3 px-3 font-body-sm text-body-sm text-text-primary whitespace-nowrap">
                              {record.date}
                            </td>
                            <td className="py-3 px-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getTypeBadgeStyle(record.type)}`}>
                                {record.type}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-body-sm text-body-sm text-text-primary whitespace-nowrap">
                              {record.distance.toFixed(1)}
                            </td>
                            <td className="py-3 px-3 text-right font-body-sm text-body-sm text-text-primary whitespace-nowrap">
                              {record.duration}
                            </td>
                            <td className="py-3 px-3 text-right font-body-sm text-body-sm text-text-primary whitespace-nowrap font-mono">
                              {record.avgPace}
                            </td>
                            <td className="py-3 px-3 text-right font-body-sm text-body-sm text-text-primary whitespace-nowrap">
                              {record.avgHr} bpm
                            </td>
                            <td className="py-3 px-3 text-right font-body-sm text-body-sm text-text-primary whitespace-nowrap">
                              {record.maxHr} bpm
                            </td>
                            <td className="py-3 px-3 text-right font-body-sm text-body-sm text-text-primary whitespace-nowrap">
                              {record.calories}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* 分页 */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-border-subtle">
                      <span className="font-body-sm text-body-sm text-secondary">
                        第 {currentPage + 1} / {totalPages} 页
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={currentPage === 0}
                          onClick={() => setCurrentPage((prev) => prev - 1)}
                          className="px-3 py-1.5 text-sm rounded border border-border-subtle bg-surface-card text-text-primary hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          上一页
                        </button>
                        <button
                          type="button"
                          disabled={currentPage >= totalPages - 1}
                          onClick={() => setCurrentPage((prev) => prev + 1)}
                          className="px-3 py-1.5 text-sm rounded border border-border-subtle bg-surface-card text-text-primary hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          下一页
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* 空状态 */
                <div className="py-16 text-center">
                  <span className="material-symbols-outlined text-5xl text-secondary/40 mb-4 block">
                    table_chart
                  </span>
                  <p className="font-headline-md text-headline-md text-secondary mb-2">
                    暂无训练记录
                  </p>
                  <p className="font-body-sm text-body-sm text-secondary/70">
                    上传运动文件后，训练数据将显示在此处
                  </p>
                </div>
              )}
            </section>

            {/* ============================================== */}
            {/* 5. 趋势图表 — 数据驱动 */}
            {/* ============================================== */}
            <section>
              <h3 className="font-headline-md text-headline-md text-text-primary mb-stack-md">
                趋势分析
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
                {/* 周跑量趋势 */}
                <div
                  className={`data-card rounded-lg p-stack-lg shadow-sm cursor-pointer transition-shadow hover:shadow-md ${hoveredChart === 0 ? 'ring-2 ring-primary/20' : ''}`}
                  onMouseEnter={() => {
                    setChartsAnimated(true)
                    setHoveredChart(0)
                  }}
                  onMouseLeave={() => {
                    setHoveredChart(null)
                    setChartTooltip(null)
                  }}
                >
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <span className="font-label-caps text-label-caps text-secondary uppercase tracking-wider text-xs">
                        周跑量
                      </span>
                      <div className="font-data-display text-data-display text-text-primary mt-1">
                        {hasChartData ? `${chartData.mileageData.reduce((a, b) => a + b, 0)} km` : '--'}
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-primary-container">trending_up</span>
                  </div>
                  <div className="h-32 w-full mt-4 relative">
                    {hasChartData ? (
                      <svg
                        className="w-full h-full"
                        viewBox="0 0 100 40"
                        preserveAspectRatio="none"
                        onMouseMove={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect()
                          const x = ((e.clientX - rect.left) / rect.width) * 100
                          const pointIndex = Math.min(Math.round(x / (100 / (chartData.mileageData.length - 1))), chartData.mileageData.length - 1)
                          if (pointIndex >= 0 && pointIndex < chartData.mileageData.length) {
                            const svgX = pointIndex * (100 / (chartData.mileageData.length - 1))
                            const maxY = Math.max(...chartData.mileageData, 1)
                            const svgY = 40 - (chartData.mileageData[pointIndex] / maxY) * 36
                            setChartTooltip({
                              x: (svgX / 100) * rect.width,
                              y: (svgY / 40) * rect.height,
                              value: getChartValue(0, pointIndex),
                            })
                          }
                        }}
                      >
                        <path
                          d={generateSVGPath(chartData.mileageData, Math.max(...chartData.mileageData, 1))}
                          fill="none"
                          stroke="#2563eb"
                          strokeWidth={2}
                          className={chartsAnimated ? 'chart-path-animate' : ''}
                        />
                      </svg>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <span className="material-symbols-outlined text-3xl text-secondary/30 mb-2">show_chart</span>
                        <span className="font-body-sm text-body-sm text-secondary/50 text-xs">
                          需要更多数据
                        </span>
                      </div>
                    )}
                    {chartTooltip && hoveredChart === 0 && hasChartData && (
                      <div
                        className="absolute pointer-events-none bg-text-primary/90 text-white text-xs px-2 py-1 rounded shadow-lg -translate-x-1/2 -translate-y-full z-10"
                        style={{ left: chartTooltip.x, top: chartTooltip.y - 8 }}
                      >
                        {chartTooltip.value}
                      </div>
                    )}
                  </div>
                </div>

                {/* 训练负荷趋势 */}
                <div
                  className={`data-card rounded-lg p-stack-lg shadow-sm cursor-pointer transition-shadow hover:shadow-md ${hoveredChart === 1 ? 'ring-2 ring-status-success/20' : ''}`}
                  onMouseEnter={() => {
                    setChartsAnimated(true)
                    setHoveredChart(1)
                  }}
                  onMouseLeave={() => {
                    setHoveredChart(null)
                    setChartTooltip(null)
                  }}
                >
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <span className="font-label-caps text-label-caps text-secondary uppercase tracking-wider text-xs">
                        训练负荷
                      </span>
                      <div className="font-data-display text-data-display text-text-primary mt-1">
                        {hasChartData ? chartData.loadData[chartData.loadData.length - 1] ?? '--' : '--'}
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-status-success">monitor_heart</span>
                  </div>
                  <div className="h-32 w-full mt-4 relative">
                    {hasChartData ? (
                      <svg
                        className="w-full h-full"
                        viewBox="0 0 100 40"
                        preserveAspectRatio="none"
                        onMouseMove={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect()
                          const x = ((e.clientX - rect.left) / rect.width) * 100
                          const pointIndex = Math.min(Math.round(x / (100 / (chartData.loadData.length - 1))), chartData.loadData.length - 1)
                          if (pointIndex >= 0 && pointIndex < chartData.loadData.length) {
                            const svgX = pointIndex * (100 / (chartData.loadData.length - 1))
                            const maxY = Math.max(...chartData.loadData, 1)
                            const svgY = 40 - (chartData.loadData[pointIndex] / maxY) * 36
                            setChartTooltip({
                              x: (svgX / 100) * rect.width,
                              y: (svgY / 40) * rect.height,
                              value: getChartValue(1, pointIndex),
                            })
                          }
                        }}
                      >
                        <path
                          d={generateSVGPath(chartData.loadData, Math.max(...chartData.loadData, 1))}
                          fill="none"
                          stroke="#10b981"
                          strokeWidth={2}
                          className={chartsAnimated ? 'chart-path-animate' : ''}
                          style={{ animationDelay: '0.3s' }}
                        />
                      </svg>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <span className="material-symbols-outlined text-3xl text-secondary/30 mb-2">show_chart</span>
                        <span className="font-body-sm text-body-sm text-secondary/50 text-xs">
                          需要更多数据
                        </span>
                      </div>
                    )}
                    {chartTooltip && hoveredChart === 1 && hasChartData && (
                      <div
                        className="absolute pointer-events-none bg-text-primary/90 text-white text-xs px-2 py-1 rounded shadow-lg -translate-x-1/2 -translate-y-full z-10"
                        style={{ left: chartTooltip.x, top: chartTooltip.y - 8 }}
                      >
                        {chartTooltip.value}
                      </div>
                    )}
                  </div>
                </div>

                {/* 疲劳趋势 */}
                <div
                  className={`data-card rounded-lg p-stack-lg shadow-sm cursor-pointer transition-shadow hover:shadow-md ${hoveredChart === 2 ? 'ring-2 ring-status-warning/20' : ''}`}
                  onMouseEnter={() => {
                    setChartsAnimated(true)
                    setHoveredChart(2)
                  }}
                  onMouseLeave={() => {
                    setHoveredChart(null)
                    setChartTooltip(null)
                  }}
                >
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <span className="font-label-caps text-label-caps text-secondary uppercase tracking-wider text-xs">
                        疲劳趋势
                      </span>
                      <div className="font-data-display text-data-display text-text-primary mt-1">
                        {hasChartData ? chartData.fatigueData[chartData.fatigueData.length - 1] ?? '--' : '--'}
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-status-warning">battery_alert</span>
                  </div>
                  <div className="h-32 w-full mt-4 relative">
                    {hasChartData ? (
                      <svg
                        className="w-full h-full"
                        viewBox="0 0 100 40"
                        preserveAspectRatio="none"
                        onMouseMove={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect()
                          const x = ((e.clientX - rect.left) / rect.width) * 100
                          const pointIndex = Math.min(Math.round(x / (100 / (chartData.fatigueData.length - 1))), chartData.fatigueData.length - 1)
                          if (pointIndex >= 0 && pointIndex < chartData.fatigueData.length) {
                            const svgX = pointIndex * (100 / (chartData.fatigueData.length - 1))
                            const maxY = Math.max(...chartData.fatigueData, 1)
                            const svgY = 40 - (chartData.fatigueData[pointIndex] / maxY) * 36
                            setChartTooltip({
                              x: (svgX / 100) * rect.width,
                              y: (svgY / 40) * rect.height,
                              value: getChartValue(2, pointIndex),
                            })
                          }
                        }}
                      >
                        <path
                          d={generateSVGPath(chartData.fatigueData, Math.max(...chartData.fatigueData, 1))}
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          className={chartsAnimated ? 'chart-path-animate' : ''}
                          style={{ animationDelay: '0.6s' }}
                        />
                      </svg>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <span className="material-symbols-outlined text-3xl text-secondary/30 mb-2">show_chart</span>
                        <span className="font-body-sm text-body-sm text-secondary/50 text-xs">
                          需要更多数据
                        </span>
                      </div>
                    )}
                    {chartTooltip && hoveredChart === 2 && hasChartData && (
                      <div
                        className="absolute pointer-events-none bg-text-primary/90 text-white text-xs px-2 py-1 rounded shadow-lg -translate-x-1/2 -translate-y-full z-10"
                        style={{ left: chartTooltip.x, top: chartTooltip.y - 8 }}
                      >
                        {chartTooltip.value}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* ============================================== */}
            {/* 6. 强度分布 — 数据驱动 */}
            {/* ============================================== */}
            <section className="data-card rounded-lg p-stack-lg shadow-sm">
              <h3 className="font-headline-md text-headline-md text-text-primary mb-stack-md">
                强度分布
              </h3>

              {hasData ? (
                <div className="space-y-4">
                  {/* 轻松跑 */}
                  {intensityDistribution.easy > 0 && (
                    <div>
                      <div
                        className="flex justify-between font-body-sm text-body-sm mb-1 cursor-pointer hover:opacity-80"
                        onClick={() => setExpandedIntensity(expandedIntensity === 'easy' ? null : 'easy')}
                      >
                        <span className="text-secondary flex items-center gap-1">
                          轻松跑 (Easy)
                          <span className="material-symbols-outlined text-[14px] opacity-50">
                            {expandedIntensity === 'easy' ? 'expand_less' : 'expand_more'}
                          </span>
                        </span>
                        <span className="text-text-primary font-medium">{intensityDistribution.easy}%</span>
                      </div>
                      <div
                        className="w-full bg-surface-container rounded-full h-2 cursor-pointer"
                        onClick={() => setExpandedIntensity(expandedIntensity === 'easy' ? null : 'easy')}
                      >
                        <div
                          className="bg-status-success h-2 rounded-full transition-all duration-500"
                          style={{ width: `${intensityDistribution.easy}%` }}
                        />
                      </div>
                      {expandedIntensity === 'easy' && intensityDistribution.details.easy && (
                        <div className="mt-2 ml-4 p-3 bg-status-success/5 rounded-lg border border-status-success/20 animate-fade-in-up">
                          <div className="grid grid-cols-3 gap-4 font-body-sm text-body-sm">
                            <div>
                              <span className="text-secondary text-xs block">总里程</span>
                              <span className="text-text-primary font-semibold">{intensityDistribution.details.easy.totalKm}</span>
                            </div>
                            <div>
                              <span className="text-secondary text-xs block">训练次数</span>
                              <span className="text-text-primary font-semibold">{intensityDistribution.details.easy.sessions}</span>
                            </div>
                            <div>
                              <span className="text-secondary text-xs block">平均配速</span>
                              <span className="text-text-primary font-semibold">{intensityDistribution.details.easy.avgPace}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 乳酸阈值跑 */}
                  {intensityDistribution.threshold > 0 && (
                    <div>
                      <div
                        className="flex justify-between font-body-sm text-body-sm mb-1 cursor-pointer hover:opacity-80"
                        onClick={() => setExpandedIntensity(expandedIntensity === 'threshold' ? null : 'threshold')}
                      >
                        <span className="text-secondary flex items-center gap-1">
                          乳酸阈值 (Threshold)
                          <span className="material-symbols-outlined text-[14px] opacity-50">
                            {expandedIntensity === 'threshold' ? 'expand_less' : 'expand_more'}
                          </span>
                        </span>
                        <span className="text-text-primary font-medium">{intensityDistribution.threshold}%</span>
                      </div>
                      <div
                        className="w-full bg-surface-container rounded-full h-2 cursor-pointer"
                        onClick={() => setExpandedIntensity(expandedIntensity === 'threshold' ? null : 'threshold')}
                      >
                        <div
                          className="bg-status-warning h-2 rounded-full transition-all duration-500"
                          style={{ width: `${intensityDistribution.threshold}%` }}
                        />
                      </div>
                      {expandedIntensity === 'threshold' && intensityDistribution.details.threshold && (
                        <div className="mt-2 ml-4 p-3 bg-status-warning/5 rounded-lg border border-status-warning/20 animate-fade-in-up">
                          <div className="grid grid-cols-3 gap-4 font-body-sm text-body-sm">
                            <div>
                              <span className="text-secondary text-xs block">总里程</span>
                              <span className="text-text-primary font-semibold">{intensityDistribution.details.threshold.totalKm}</span>
                            </div>
                            <div>
                              <span className="text-secondary text-xs block">训练次数</span>
                              <span className="text-text-primary font-semibold">{intensityDistribution.details.threshold.sessions}</span>
                            </div>
                            <div>
                              <span className="text-secondary text-xs block">平均配速</span>
                              <span className="text-text-primary font-semibold">{intensityDistribution.details.threshold.avgPace}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 间歇跑 */}
                  {intensityDistribution.interval > 0 && (
                    <div>
                      <div
                        className="flex justify-between font-body-sm text-body-sm mb-1 cursor-pointer hover:opacity-80"
                        onClick={() => setExpandedIntensity(expandedIntensity === 'interval' ? null : 'interval')}
                      >
                        <span className="text-secondary flex items-center gap-1">
                          间歇跑 (Interval)
                          <span className="material-symbols-outlined text-[14px] opacity-50">
                            {expandedIntensity === 'interval' ? 'expand_less' : 'expand_more'}
                          </span>
                        </span>
                        <span className="text-text-primary font-medium">{intensityDistribution.interval}%</span>
                      </div>
                      <div
                        className="w-full bg-surface-container rounded-full h-2 cursor-pointer"
                        onClick={() => setExpandedIntensity(expandedIntensity === 'interval' ? null : 'interval')}
                      >
                        <div
                          className="bg-status-danger h-2 rounded-full transition-all duration-500"
                          style={{ width: `${intensityDistribution.interval}%` }}
                        />
                      </div>
                      {expandedIntensity === 'interval' && intensityDistribution.details.interval && (
                        <div className="mt-2 ml-4 p-3 bg-status-danger/5 rounded-lg border border-status-danger/20 animate-fade-in-up">
                          <div className="grid grid-cols-3 gap-4 font-body-sm text-body-sm">
                            <div>
                              <span className="text-secondary text-xs block">总里程</span>
                              <span className="text-text-primary font-semibold">{intensityDistribution.details.interval.totalKm}</span>
                            </div>
                            <div>
                              <span className="text-secondary text-xs block">训练次数</span>
                              <span className="text-text-primary font-semibold">{intensityDistribution.details.interval.sessions}</span>
                            </div>
                            <div>
                              <span className="text-secondary text-xs block">平均配速</span>
                              <span className="text-text-primary font-semibold">{intensityDistribution.details.interval.avgPace}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 底部提示 */}
                  <div className="mt-6 pt-4 border-t border-border-subtle flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary-container text-[18px]">info</span>
                    <p className="font-body-sm text-body-sm text-secondary">
                      {intensityDistribution.easy >= 65
                        ? '有氧基础训练占比合理，建议保持当前训练结构。'
                        : intensityDistribution.easy < 50
                          ? '高强度训练占比较高，建议增加轻松跑比例，遵循 80/20 法则以降低受伤风险。'
                          : '当前训练强度分布较为均衡，继续保持即可。'}
                    </p>
                  </div>
                </div>
              ) : (
                /* 空状态 */
                <div className="py-12 text-center">
                  <span className="material-symbols-outlined text-4xl text-secondary/40 mb-3 block">
                    pie_chart
                  </span>
                  <p className="font-body-md text-body-md text-secondary">
                    上传数据后显示强度分布
                  </p>
                </div>
              )}
            </section>
          </div>

          {/* ===== 右列：AI 洞察面板 ===== */}
          <div className="w-full lg:w-[320px] flex flex-col">
            <section className="bg-[#EEF2FF] border border-blue-100 rounded-lg p-stack-lg flex flex-col h-full shadow-sm">
              <div className="flex items-center gap-2 mb-stack-md text-primary-container">
                <span className="material-symbols-outlined">psychology</span>
                <h3 className="font-headline-md text-headline-md font-bold">AI 深度洞察</h3>
              </div>

              <div className="space-y-4 flex-1">
                {!hasData ? (
                  /* 无数据时的提示 */
                  <div className="text-center py-8">
                    <span className="material-symbols-outlined text-4xl text-primary/40 mb-3 block">upload_file</span>
                    <p className="font-body-sm text-body-sm text-secondary mb-4">
                      上传运动数据后，AI 将为你生成个性化洞察
                    </p>
                    <button
                      type="button"
                      onClick={handleClickUpload}
                      className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                      立即上传
                    </button>
                  </div>
                ) : (
                  <>
                    {/* 有数据时基于实际指标生成洞察 */}

                    {/* 疲劳警告 */}
                    {(ctx.metrics.fatigueScore ?? 0) > 60 && (
                      <div
                        className="bg-surface-card rounded p-4 shadow-sm border border-border-subtle cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
                        onClick={() =>
                          handleInsightClick(
                            `我的疲劳评分是 ${ctx.metrics.fatigueScore}，接下来怎么安排恢复？`,
                          )
                        }
                      >
                        <div className="flex items-center gap-2 text-status-warning mb-2">
                          <span className="material-symbols-outlined text-sm">warning</span>
                          <span className="font-label-caps text-label-caps">疲劳预警</span>
                          <span className="material-symbols-outlined text-[14px] text-secondary ml-auto opacity-50">chat</span>
                        </div>
                        <p className="font-body-sm text-body-sm text-text-primary">
                          当前疲劳评分 {ctx.metrics.fatigueScore}，
                          {ctx.metrics.fatigueScore! > 75
                            ? '建议今日安排完全休息或极轻度恢复活动。'
                            : '建议适当降低下次训练的强度。'}
                        </p>
                      </div>
                    )}

                    {/* 伤病风险提醒 */}
                    {ctx.metrics.injuryRisk !== '低风险' && ctx.metrics.injuryRisk !== '无数据' && (
                      <div
                        className="bg-surface-card rounded p-4 shadow-sm border border-border-subtle cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
                        onClick={() =>
                          handleInsightClick(
                            `当前${ctx.metrics.injuryRisk}，如何降低伤病风险？`,
                          )
                        }
                      >
                        <div className="flex items-center gap-2 text-status-danger mb-2">
                          <span className="material-symbols-outlined text-sm">health_and_safety</span>
                          <span className="font-label-caps text-label-caps">伤病风险</span>
                          <span className="material-symbols-outlined text-[14px] text-secondary ml-auto opacity-50">chat</span>
                        </div>
                        <p className="font-body-sm text-body-sm text-text-primary">
                          当前评估为{ctx.metrics.injuryRisk}，
                          {ctx.metrics.injuryRisk === '高风险'
                            ? '强烈建议暂停高强度训练 2-3 天。'
                            : '建议适当减少训练量和强度。'}
                        </p>
                      </div>
                    )}

                    {/* 训练负荷分析 */}
                    {ctx.metrics.ctl !== null && (
                      <div
                        className="bg-surface-card rounded p-4 shadow-sm border border-border-subtle cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
                        onClick={() => handleInsightClick('帮我分析一下当前的训练负荷是否合理？')}
                      >
                        <div className="flex items-center gap-2 text-primary mb-2">
                          <span className="material-symbols-outlined text-sm">monitor_heart</span>
                          <span className="font-label-caps text-label-caps">负荷分析</span>
                          <span className="material-symbols-outlined text-[14px] text-secondary ml-auto opacity-50">chat</span>
                        </div>
                        <p className="font-body-sm text-body-sm text-text-primary">
                          CTL 为 {ctx.metrics.ctl}，ATL 为 {ctx.metrics.atl ?? '--'}。
                          {ctx.metrics.ctl! < 40
                            ? '有氧基础还在建立中，建议以轻松跑为主积累跑量。'
                            : ctx.metrics.ctl! < 80
                              ? '负荷处于健康范围，可以逐步引入更多质量课。'
                              : '负荷较高，注意监控身体反应和恢复情况。'}
                        </p>
                      </div>
                    )}

                    {/* 数据概览卡片 */}
                    <div className="bg-primary/5 rounded p-4 shadow-sm border border-primary/20">
                      <div className="flex items-center gap-2 text-primary mb-2">
                        <span className="material-symbols-outlined text-sm">insights</span>
                        <span className="font-label-caps text-label-caps">数据概览</span>
                      </div>
                      <p className="font-body-sm text-body-sm text-text-primary">
                        已累计解析{' '}
                        <strong>{ctx.uploadedFiles.length}</strong> 个文件，
                        共 <strong>{ctx.trainingRecords.length}</strong> 条训练记录。
                        总跑量{' '}
                        <strong>
                          {ctx.trainingRecords.reduce((s, r) => s + r.distance, 0).toFixed(1)} km
                        </strong>
                        。
                      </p>
                    </div>
                  </>
                )}
              </div>

              {hasData && (
                <button
                  type="button"
                  className="mt-6 w-full bg-surface-card border border-primary text-primary py-2.5 rounded text-sm font-medium hover:bg-primary hover:text-on-primary transition-colors shadow-sm"
                  onClick={() => handleInsightClick('请为我生成一份完整的训练分析报告')}
                >
                  查看完整分析报告
                </button>
              )}
            </section>
          </div>
        </div>

        {/* ============================================== */}
        {/* 训练详情弹窗 */}
        {/* ============================================== */}
        {ctx.selectedRecord && (
          <div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
            onClick={() => ctx.selectRecord(null)}
          >
            <div
              className="bg-surface-card rounded-xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                {/* 弹窗头部 */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-headline-lg text-headline-lg text-text-primary font-bold">
                      训练详情
                    </h3>
                    <p className="font-body-sm text-body-sm text-secondary mt-1">
                      {ctx.selectedRecord.date}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => ctx.selectRecord(null)}
                    className="p-2 rounded-lg hover:bg-surface-container transition-colors"
                  >
                    <span className="material-symbols-outlined text-secondary">close</span>
                  </button>
                </div>

                {/* 类型标签 */}
                <div className="mb-6">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getTypeBadgeStyle(ctx.selectedRecord.type)}`}>
                    {ctx.selectedRecord.type}
                  </span>
                  {ctx.selectedRecord.fileName && (
                    <span className="ml-2 font-body-sm text-body-sm text-secondary">
                      来源: {ctx.selectedRecord.fileName}
                    </span>
                  )}
                </div>

                {/* 统计网格 */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-surface-bright rounded-lg p-4">
                    <p className="font-label-caps text-label-caps text-secondary text-xs uppercase mb-1">距离</p>
                    <p className="font-data-display text-data-display text-text-primary text-2xl">
                      {ctx.selectedRecord.distance} <span className="text-base font-body-md">km</span>
                    </p>
                  </div>
                  <div className="bg-surface-bright rounded-lg p-4">
                    <p className="font-label-caps text-label-caps text-secondary text-xs uppercase mb-1">时长</p>
                    <p className="font-data-display text-data-display text-text-primary text-2xl">{ctx.selectedRecord.duration}</p>
                  </div>
                  <div className="bg-surface-bright rounded-lg p-4">
                    <p className="font-label-caps text-label-caps text-secondary text-xs uppercase mb-1">平均配速</p>
                    <p className="font-data-display text-data-display text-text-primary text-2xl font-mono">
                      {ctx.selectedRecord.avgPace} <span className="text-base font-body-md">/km</span>
                    </p>
                  </div>
                  <div className="bg-surface-bright rounded-lg p-4">
                    <p className="font-label-caps text-label-caps text-secondary text-xs uppercase mb-1">消耗热量</p>
                    <p className="font-data-display text-data-display text-text-primary text-2xl">
                      {ctx.selectedRecord.calories} <span className="text-base font-body-md">kcal</span>
                    </p>
                  </div>
                </div>

                {/* 心率区域 */}
                <div className="border-t border-border-subtle pt-4">
                  <h4 className="font-headline-md text-headline-md text-text-primary mb-3">心率数据</h4>
                  <div className="flex gap-6">
                    <div>
                      <span className="font-body-sm text-body-sm text-secondary block">平均心率</span>
                      <span className="font-data-display text-data-display text-text-primary text-xl">
                        {ctx.selectedRecord.avgHr} <span className="text-sm font-body-sm text-secondary">bpm</span>
                      </span>
                    </div>
                    <div>
                      <span className="font-body-sm text-body-sm text-secondary block">最大心率</span>
                      <span className="font-data-display text-data-display text-status-warning text-xl">
                        {ctx.selectedRecord.maxHr} <span className="text-sm font-body-sm text-secondary">bpm</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* 关闭按钮 */}
                <div className="mt-6 pt-4 border-t border-border-subtle">
                  <button
                    type="button"
                    onClick={() => ctx.selectRecord(null)}
                    className="w-full py-2.5 rounded-lg bg-surface-container text-text-primary font-medium hover:bg-surface-container-hover transition-colors"
                  >
                    关闭
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
