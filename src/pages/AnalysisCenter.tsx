import { useState, useRef, useCallback, useMemo } from 'react'
import { useAppContext } from '../context/AppContext'
import { parseFile } from '../services/fileParser'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea,
} from 'recharts'

// ========================
// 类型定义
// ========================

type UploadState = 'idle' | 'dragging' | 'uploading' | 'success' | 'error'

const VALID_EXTENSIONS = ['fit', 'gpx', 'tcx']
const PAGE_SIZE = 10

// 伤病部位选项
const injuryBodyParts = [
  { value: 'knee', label: '膝盖' },
  { value: 'ankle', label: '脚踝' },
  { value: 'achilles', label: '跟腱' },
  { value: 'shin', label: '胫骨' },
  { value: 'calf', label: '小腿' },
  { value: 'hamstring', label: '腘绳肌' },
  { value: 'quadriceps', label: '股四头肌' },
  { value: 'hip', label: '髋部' },
  { value: 'foot', label: '足部' },
  { value: 'plantar', label: '足底' },
  { value: 'lower_back', label: '下背部' },
  { value: 'groin', label: '腹股沟' },
  { value: 'it_band', label: 'IT带' },
  { value: '其他', label: '其他' },
]

// 严重程度选项
const severityOptions = [
  { value: 'mild', label: '轻微', activeClass: 'bg-status-success text-white' },
  { value: 'moderate', label: '中度', activeClass: 'bg-status-warning text-white' },
  { value: 'severe', label: '严重', activeClass: 'bg-status-danger text-white' },
]

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
  const [, setCurrentPage] = useState(0)

  // ---- 图表交互状态 ----
  const [zoomState, setZoomState] = useState<{
    refAreaLeft: string | null
    refAreaRight: string | null
    data: { week: string; mileage: number; load: number; fatigue: number }[]
  } | null>(null)

  // ---- 强度分布展开状态 ----
  const [expandedIntensity, setExpandedIntensity] = useState<string | null>(null)

  // ---- 文件列表展开状态 ----
  const [expandedFiles, setExpandedFiles] = useState(false)

  // ---- 伤病记录状态 ----
  const [showInjuryForm, setShowInjuryForm] = useState(false)
  const [newInjury, setNewInjury] = useState({
    parts: [] as string[],
    severity: 'mild' as 'mild' | 'moderate' | 'severe',
    description: '',
  })

  // ---- 伤病处理函数 ----
  const handleAddInjury = () => {
    if (newInjury.parts.length === 0) return
    ctx.addInjuryRecord({
      parts: newInjury.parts as any,
      severity: newInjury.severity,
      description: newInjury.description,
      date: new Date().toLocaleDateString('zh-CN'),
      recovered: false,
    })
    setNewInjury({
      parts: [],
      severity: 'mild',
      description: '',
    })
    setShowInjuryForm(false)
  }

  const handleMarkRecovered = (injuryId: string) => {
    ctx.updateInjuryRecord(injuryId, { recovered: true })
  }

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

  // pagination total pages (reserved for future use)
  void Math.ceil(sortedRecords.length / PAGE_SIZE)

  // ================================================================
  // 计算属性：趋势图表数据 — 完全从 trainingRecords 动态生成
  // ================================================================
  // 趋势图表数据 — Recharts 格式
  // ================================================================

  const chartDataFull = useMemo(() => {
    const records = [...ctx.trainingRecords].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    )

    if (records.length === 0) return [] as { week: string; mileage: number; load: number; fatigue: number }[]

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

    const loadArr = weeks.map((w) => Math.round(w[1].load))

    return weeks.map((w, i) => ({
      week: w[0].slice(5), // MM-DD
      mileage: Math.round(w[1].distance),
      load: loadArr[i],
      fatigue: i === 0
        ? Math.round(loadArr[i] || 0)
        : Math.round(Math.max(0, (loadArr[i - 1] || 0) * 0.9 - (loadArr[i] || 0) * 0.3 + 20)),
    }))
  }, [ctx.trainingRecords])

  // Zoom: visible data slice
  const hasChartData = chartDataFull.length >= 2
  const chartData = useMemo(() => {
    if (!zoomState) return chartDataFull
    return zoomState.data
  }, [zoomState, chartDataFull])

  // Zoom handlers — use `any` to match Recharts MouseHandlerDataParam
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMouseDown = useCallback((e: any) => {
    if (e?.activeLabel) {
      setZoomState((prev) => ({
        refAreaLeft: e.activeLabel as string,
        refAreaRight: e.activeLabel as string,
        data: prev?.data ?? chartDataFull,
      }))
    }
  }, [chartDataFull])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMouseMove = useCallback((e: any) => {
    if (zoomState?.refAreaLeft && e?.activeLabel) {
      setZoomState((prev) => prev ? { ...prev, refAreaRight: e.activeLabel as string } : prev)
    }
  }, [zoomState?.refAreaLeft])

  const handleMouseUp = useCallback(() => {
    if (zoomState?.refAreaLeft && zoomState?.refAreaRight) {
      const left = zoomState.refAreaLeft
      const right = zoomState.refAreaRight
      if (left === right) {
        setZoomState((prev) => prev ? { ...prev, refAreaLeft: null, refAreaRight: null } : prev)
        return
      }
      const srcData = zoomState.data
      const leftIdx = srcData.findIndex((d) => d.week === (left < right ? left : right))
      const rightIdx = srcData.findIndex((d) => d.week === (left < right ? right : left))
      if (leftIdx >= 0 && rightIdx >= 0) {
        const sliced = srcData.slice(leftIdx, rightIdx + 1)
        if (sliced.length >= 2) {
          setZoomState({ refAreaLeft: null, refAreaRight: null, data: sliced })
          return
        }
      }
      setZoomState((prev) => prev ? { ...prev, refAreaLeft: null, refAreaRight: null } : prev)
    }
  }, [zoomState])

  const resetZoom = useCallback(() => {
    setZoomState(null)
  }, [])

  // 初始渲染：设置完整数据
  if (zoomState === null && chartDataFull.length > 0) {
    // 不在这里 set，避免无限循环
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

    // 逐个处理每个文件（串行解析）
    let successCount = 0
    let skippedCount = 0
    let failedFiles: string[] = []
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i]

      // 检查是否已经上传过同名文件
      if (ctx.uploadedFiles.some((f) => f.name === file.name)) {
        skippedCount++
        continue
      }

      // 更新当前处理中的文件名
      setProcessingFileName(file.name)

      try {
        // 使用真实文件解析器
        const result = await parseFile(file)

        if (result.success && result.records.length > 0) {
          // 创建文件条目
          const fileId = `file_${Date.now()}_${i}`
          const uploadedFile = {
            id: fileId,
            name: file.name,
            size: formatFileSize(file.size),
            date: new Date().toLocaleDateString('zh-CN'),
            parsedRecords: result.records,
          }

          // 更新所有 context 状态
          ctx.addUploadedFile(uploadedFile)
          ctx.processParsedData(result.records, fileId)
          successCount++
        } else {
          // 解析失败或没有记录
          failedFiles.push(file.name)
          console.warn(`文件 ${file.name} 解析结果为空或失败:`, result.error)
        }
      } catch (err) {
        failedFiles.push(file.name)
        console.error(`解析文件 ${file.name} 失败:`, err)
      }
    }

    if (skippedCount === validFiles.length) {
      setUploadState('success')
      setErrorMsg('所选文件已全部存在，无需重复导入')
    } else if (successCount === validFiles.length - skippedCount) {
      setUploadState('success')
    } else if (successCount > 0) {
      // 部分成功
      setUploadState('success')
      const skippedMsg = skippedCount > 0 ? `（${skippedCount} 个文件已跳过，因已存在）` : ''
      setErrorMsg(`成功解析 ${successCount}/${validFiles.length - skippedCount} 个文件（失败: ${failedFiles.join('、')}）${skippedMsg}`)
    } else {
      // 有跳过的文件但没有成功解析的
      const skippedMsg = skippedCount > 0 ? `（${skippedCount} 个文件已跳过，因已存在）` : ''
      setUploadState('error')
      setErrorMsg(`所有文件解析失败，请检查文件格式后重试${skippedMsg}`)
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

  // Sort toggle helper (reserved for table header click handler)
  const sortToggle = (field: 'date' | 'distance') => {
    if (sortBy === field) setSortAsc((prev) => !prev)
    else { setSortBy(field); setSortAsc(false) }
    setCurrentPage(0)
  }
  void sortToggle

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

  return (
    <div className="flex-1 p-margin-desktop bg-background">
      <style>{`
        .recharts-cartesian-grid-horizontal line,
        .recharts-cartesian-grid-vertical line {
          stroke: var(--color-border-subtle, #e5e7eb);
          stroke-opacity: 0.5;
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
                  {ctx.uploadedFiles.length > 5 && (
                    <button
                      type="button"
                      onClick={() => setExpandedFiles(!expandedFiles)}
                      className="text-xs text-primary font-medium hover:underline flex items-center gap-1 transition-colors"
                    >
                      {expandedFiles ? '收起' : '查看全部'}
                      <span className="material-symbols-outlined text-[14px]">
                        {expandedFiles ? 'expand_less' : 'expand_more'}
                      </span>
                    </button>
                  )}
                </div>
                <div className={`space-y-2 overflow-y-auto transition-all duration-300 ${
                  expandedFiles ? 'max-h-[500px]' : 'max-h-[250px]'
                }`}>
                  {(expandedFiles ? ctx.uploadedFiles : ctx.uploadedFiles.slice(0, 5)).map((file) => (
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
            {/* 4. 近期伤病记录 */}
            {/* ============================================== */}
            <section className="data-card rounded-lg p-stack-lg shadow-sm">
              <div className="flex items-center justify-between mb-stack-md">
                <h3 className="font-headline-md text-headline-md text-text-primary">
                  近期伤病
                  <span className="ml-2 inline-flex items-center justify-center w-6 h-5 rounded-full bg-status-warning/20 text-status-warning text-xs font-label-caps">
                    {ctx.injuryRecords.filter(r => !r.recovered).length || ctx.injuryRecords.length}
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowInjuryForm(!showInjuryForm)}
                  className="text-xs text-primary font-medium hover:underline flex items-center gap-1 transition-colors"
                >
                  {showInjuryForm ? '取消' : '添加伤病'}
                  <span className="material-symbols-outlined text-[14px]">
                    {showInjuryForm ? 'close' : 'add'}
                  </span>
                </button>
              </div>

              {/* 添加伤病表单 */}
              {showInjuryForm && (
                <div className="mb-stack-md p-stack-md bg-surface-container rounded-lg border border-border-subtle animate-fade-in-up">
                  <h4 className="font-body-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-status-warning">add_circle</span>
                    添加伤病记录
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="font-body-sm font-medium text-text-primary mb-1.5 block">
                        伤病部位
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {injuryBodyParts.map((part) => (
                          <button
                            key={part.value}
                            type="button"
                            onClick={() => {
                              if (newInjury.parts.includes(part.value)) {
                                setNewInjury(prev => ({
                                  ...prev,
                                  parts: prev.parts.filter(p => p !== part.value)
                                }))
                              } else {
                                setNewInjury(prev => ({
                                  ...prev,
                                  parts: [...prev.parts, part.value]
                                }))
                              }
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border-none ${
                              newInjury.parts.includes(part.value)
                                ? 'bg-status-warning text-white'
                                : 'bg-surface-container-low text-secondary hover:bg-surface-variant'
                            }`}
                          >
                            {part.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="font-body-sm font-medium text-text-primary mb-1.5 block">
                        严重程度
                      </label>
                      <div className="flex gap-2">
                        {severityOptions.map((sev) => (
                          <button
                            key={sev.value}
                            type="button"
                            onClick={() => setNewInjury(prev => ({ ...prev, severity: sev.value as 'mild' | 'moderate' | 'severe' }))}
                            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border-none ${
                              newInjury.severity === sev.value
                                ? sev.activeClass
                                : 'bg-surface-container-low text-secondary hover:bg-surface-variant'
                            }`}
                          >
                            {sev.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="font-body-sm font-medium text-text-primary mb-1.5 block">
                        描述 <span className="text-secondary font-normal">(选填)</span>
                      </label>
                      <textarea
                        value={newInjury.description}
                        onChange={(e) => setNewInjury(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-3 py-2.5 bg-surface-container-low border border-border-subtle rounded-lg text-text-primary focus:ring-2 focus:ring-primary outline-none transition-all font-body-sm resize-none"
                        placeholder="例如：右膝外侧疼痛，上下楼梯时加重"
                        rows={2}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddInjury}
                      disabled={newInjury.parts.length === 0}
                      className={`w-full py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer border-none ${
                        newInjury.parts.length > 0
                          ? 'bg-status-warning text-white hover:brightness-110 active:scale-[0.98]'
                          : 'bg-surface-variant text-secondary cursor-not-allowed'
                      }`}
                    >
                      保存伤病记录
                    </button>
                  </div>
                </div>
              )}

              {/* 伤病记录列表 */}
              {ctx.injuryRecords.length === 0 ? (
                <div className="py-8 text-center">
                  <span className="material-symbols-outlined text-4xl text-secondary/40 mb-3 block">medical_services</span>
                  <p className="font-body-sm text-secondary">暂无伤病记录</p>
                  <p className="font-body-xs text-secondary/70 mt-1">记录伤病历史，帮助AI更好地分析你的训练</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {ctx.injuryRecords.slice(0, 5).map((injury) => (
                    <div
                      key={injury.id}
                      className={`p-3 rounded-lg border transition-colors ${
                        injury.recovered
                          ? 'bg-surface-container-low border-border-subtle/50 opacity-60'
                          : 'bg-status-warning/5 border-status-warning/20'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {injury.parts.map((part) => (
                              <span
                                key={part}
                                className="text-xs px-2 py-0.5 rounded bg-status-warning/20 text-status-warning font-medium"
                              >
                                {injuryBodyParts.find(p => p.value === part)?.label || part}
                              </span>
                            ))}
                            <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                              injury.severity === 'mild' ? 'bg-status-success/20 text-status-success' :
                              injury.severity === 'moderate' ? 'bg-status-warning/20 text-status-warning' :
                              'bg-status-danger/20 text-status-danger'
                            }`}>
                              {injury.severity === 'mild' ? '轻微' : injury.severity === 'moderate' ? '中度' : '严重'}
                            </span>
                          </div>
                          {injury.description && (
                            <p className="font-body-sm text-secondary text-xs">{injury.description}</p>
                          )}
                          <p className="font-body-xs text-secondary/70 mt-1">{injury.date}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {!injury.recovered && (
                            <button
                              type="button"
                              onClick={() => handleMarkRecovered(injury.id)}
                              className="text-xs px-2 py-1 rounded bg-status-success/10 text-status-success hover:bg-status-success/20 transition-colors cursor-pointer border-none"
                            >
                              已恢复
                            </button>
                          )}
                          {injury.recovered && (
                            <span className="text-xs px-2 py-1 rounded bg-status-success/10 text-status-success">
                              已恢复
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ============================================== */}
            {/* 5. 趋势图表 — Recharts */}
            {/* ============================================== */}
            <section>
              <div className="flex items-center justify-between mb-stack-md">
                <h3 className="font-headline-md text-headline-md text-text-primary">
                  趋势分析
                </h3>
                {zoomState && (
                  <button
                    type="button"
                    onClick={resetZoom}
                    className="px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded-full hover:bg-primary/20 transition-colors cursor-pointer border-none"
                  >
                    重置缩放
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
                {/* 周跑量趋势 */}
                <div className="data-card rounded-lg p-stack-lg shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <span className="font-label-caps text-label-caps text-secondary uppercase tracking-wider text-xs">
                        周跑量
                      </span>
                      <div className="font-data-display text-data-display text-text-primary mt-1">
                        {hasChartData ? `${chartData.reduce((a, b) => a + b.mileage, 0)} km` : '--'}
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-primary-container">trending_up</span>
                  </div>
                  {hasChartData ? (
                    <ResponsiveContainer width="100%" height={160}>
                      <LineChart
                        data={chartData}
                        margin={{ top: 8, right: 8, left: -15, bottom: 0 }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="week"
                          tick={{ fontSize: 10, fill: 'var(--color-secondary, #6b7280)' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: 'var(--color-secondary, #6b7280)' }}
                          axisLine={false}
                          tickLine={false}
                          width={35}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--color-surface-container, #fff)',
                            border: '1px solid var(--color-border-subtle, #e5e7eb)',
                            borderRadius: 8,
                            fontSize: 12,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          }}
                          formatter={(value) => [`${value} km`, '周跑量']}
                          labelFormatter={(label) => `周: ${label}`}
                        />
                        <Line
                          type="monotone"
                          dataKey="mileage"
                          stroke="#2563eb"
                          strokeWidth={2}
                          dot={{ r: 3, fill: '#2563eb', strokeWidth: 0 }}
                          activeDot={{ r: 5, fill: '#2563eb' }}
                          animationDuration={800}
                        />
                        {zoomState?.refAreaLeft && zoomState?.refAreaRight && (
                          <ReferenceArea
                            x1={zoomState.refAreaLeft < zoomState.refAreaRight ? zoomState.refAreaLeft : zoomState.refAreaRight}
                            x2={zoomState.refAreaLeft < zoomState.refAreaRight ? zoomState.refAreaRight : zoomState.refAreaLeft}
                            strokeOpacity={0.3}
                            fill="#2563eb"
                            fillOpacity={0.1}
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[160px] flex flex-col items-center justify-center">
                      <span className="material-symbols-outlined text-3xl text-secondary/30 mb-2">show_chart</span>
                      <span className="font-body-sm text-secondary/50 text-xs">需要更多数据</span>
                    </div>
                  )}
                </div>

                {/* 训练负荷趋势 */}
                <div className="data-card rounded-lg p-stack-lg shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <span className="font-label-caps text-label-caps text-secondary uppercase tracking-wider text-xs">
                        训练负荷
                      </span>
                      <div className="font-data-display text-data-display text-text-primary mt-1">
                        {hasChartData ? chartData[chartData.length - 1]?.load ?? '--' : '--'}
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-status-success">monitor_heart</span>
                  </div>
                  {hasChartData ? (
                    <ResponsiveContainer width="100%" height={160}>
                      <LineChart
                        data={chartData}
                        margin={{ top: 8, right: 8, left: -15, bottom: 0 }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="week"
                          tick={{ fontSize: 10, fill: 'var(--color-secondary, #6b7280)' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: 'var(--color-secondary, #6b7280)' }}
                          axisLine={false}
                          tickLine={false}
                          width={35}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--color-surface-container, #fff)',
                            border: '1px solid var(--color-border-subtle, #e5e7eb)',
                            borderRadius: 8,
                            fontSize: 12,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          }}
                          formatter={(value) => [`${value}`, '训练负荷']}
                          labelFormatter={(label) => `周: ${label}`}
                        />
                        <Line
                          type="monotone"
                          dataKey="load"
                          stroke="#10b981"
                          strokeWidth={2}
                          dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }}
                          activeDot={{ r: 5, fill: '#10b981' }}
                          animationDuration={800}
                        />
                        {zoomState?.refAreaLeft && zoomState?.refAreaRight && (
                          <ReferenceArea
                            x1={zoomState.refAreaLeft < zoomState.refAreaRight ? zoomState.refAreaLeft : zoomState.refAreaRight}
                            x2={zoomState.refAreaLeft < zoomState.refAreaRight ? zoomState.refAreaRight : zoomState.refAreaLeft}
                            strokeOpacity={0.3}
                            fill="#10b981"
                            fillOpacity={0.1}
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[160px] flex flex-col items-center justify-center">
                      <span className="material-symbols-outlined text-3xl text-secondary/30 mb-2">show_chart</span>
                      <span className="font-body-sm text-secondary/50 text-xs">需要更多数据</span>
                    </div>
                  )}
                </div>

                {/* 疲劳趋势 */}
                <div className="data-card rounded-lg p-stack-lg shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <span className="font-label-caps text-label-caps text-secondary uppercase tracking-wider text-xs">
                        疲劳趋势
                      </span>
                      <div className="font-data-display text-data-display text-text-primary mt-1">
                        {hasChartData ? chartData[chartData.length - 1]?.fatigue ?? '--' : '--'}
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-status-warning">battery_alert</span>
                  </div>
                  {hasChartData ? (
                    <ResponsiveContainer width="100%" height={160}>
                      <LineChart
                        data={chartData}
                        margin={{ top: 8, right: 8, left: -15, bottom: 0 }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="week"
                          tick={{ fontSize: 10, fill: 'var(--color-secondary, #6b7280)' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: 'var(--color-secondary, #6b7280)' }}
                          axisLine={false}
                          tickLine={false}
                          width={35}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--color-surface-container, #fff)',
                            border: '1px solid var(--color-border-subtle, #e5e7eb)',
                            borderRadius: 8,
                            fontSize: 12,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          }}
                          formatter={(value) => [`${value}`, '疲劳值']}
                          labelFormatter={(label) => `周: ${label}`}
                        />
                        <Line
                          type="monotone"
                          dataKey="fatigue"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }}
                          activeDot={{ r: 5, fill: '#f59e0b' }}
                          animationDuration={800}
                        />
                        {zoomState?.refAreaLeft && zoomState?.refAreaRight && (
                          <ReferenceArea
                            x1={zoomState.refAreaLeft < zoomState.refAreaRight ? zoomState.refAreaLeft : zoomState.refAreaRight}
                            x2={zoomState.refAreaLeft < zoomState.refAreaRight ? zoomState.refAreaRight : zoomState.refAreaLeft}
                            strokeOpacity={0.3}
                            fill="#f59e0b"
                            fillOpacity={0.1}
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[160px] flex flex-col items-center justify-center">
                      <span className="material-symbols-outlined text-3xl text-secondary/30 mb-2">show_chart</span>
                      <span className="font-body-sm text-secondary/50 text-xs">需要更多数据</span>
                    </div>
                  )}
                </div>
              </div>
              {hasChartData && (
                <p className="font-body-xs text-secondary mt-2 text-center">
                  拖拽选区可缩放查看局部数据，点击「重置缩放」恢复全局视图
                </p>
              )}
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

                    {/* 自动风险识别 (PRD 5.1) */}
                    {ctx.metrics.riskMessages && ctx.metrics.riskMessages.length > 0 && (
                      <div className="bg-status-warning/5 border border-status-warning/20 rounded p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-status-warning mb-2">
                          <span className="material-symbols-outlined text-sm">priority_high</span>
                          <span className="font-label-caps text-label-caps">风险识别</span>
                        </div>
                        <ul className="font-body-sm text-body-sm text-text-primary space-y-1.5 list-disc pl-4">
                          {ctx.metrics.riskMessages.map((msg, i) => (
                            <li key={i}>{msg.replace('⚠️ ', '')}</li>
                          ))}
                        </ul>
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
