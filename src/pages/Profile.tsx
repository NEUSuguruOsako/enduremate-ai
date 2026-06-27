import { useState, useRef, useEffect } from 'react'
import { useAppContext } from '../context/AppContext'
import OnboardingGuide from '../components/OnboardingGuide'

const goalOptions = [
  '5K进阶',
  '10K进阶',
  '半马备赛',
  '全马备赛',
  '有氧基础重建',
  '赛后恢复',
]

function formatPace(secondsPerKm: number): string {
  const mins = Math.floor(secondsPerKm / 60)
  const secs = Math.round(secondsPerKm % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * 根据 VDOT 和训练强度百分比推算配速（秒/公里）
 * 采用 Jack Daniels VDOT 表插值 + 强度系数
 * 
 * 强度百分比对应关系（基于 vVO2max = 最大摄氧速度）：
 *  100% = VO2max 配速（5km 比赛配速）
 *   92% = 10km 比赛配速
 *   85% = 半马配速
 *   83% = 全马配速
 *   79% = 阈值跑上限
 *   75% = 阈值跑下限
 */
function getVDOTPace(vdot: number, percentage: number): number {
  // 以 5km 比赛配速作为 100% 基准（直接从 VDOT 表查）
  // 先查最近的 VDOT 表行
  let pace5k = 212 // VDOT 50 对应的 5km 配速（秒/公里）
  
  for (let i = 0; i < vdotTable.length; i++) {
    if (vdotTable[i].vdot === Math.round(vdot)) {
      pace5k = vdotTable[i].pace5k
      break
    }
    // 线性插值
    if (i < vdotTable.length - 1) {
      const curr = vdotTable[i]
      const next = vdotTable[i + 1]
      if (vdot >= curr.vdot && vdot <= next.vdot) {
        const t = (vdot - curr.vdot) / (next.vdot - curr.vdot)
        pace5k = Math.round(curr.pace5k + (next.pace5k - curr.pace5k) * t)
        break
      }
    }
  }
  
  // 根据百分比计算目标配速
  // percentage 越高 = 跑得越快 = 配速数值越小
  return Math.round(pace5k * (100 / percentage))
}

function calculateTrainingZones(age: number | null, vdot: number | null, restingHr: number | null) {
  // 使用 Tanaka 公式：HRmax = 208 - 0.7 × age（比经典 220-age 更准确）
  const maxHR = age ? Math.round(208 - 0.7 * age) : 185
  // 静息心率：优先使用用户填写值，默认55
  const restingHR = restingHr && restingHr > 35 ? restingHr : 55
  // 心率储备 = 最大心率 - 静息心率
  const hrr = maxHR - restingHR

  type ZoneDef = {
    zone: string
    label: string
    hrrMin: number
    hrrMax: number
    pacePercent: [number, number]
    accentColor: string | undefined
    description: string
    weeklyPercent: string
    examples: string[]
  }
  
  const zones: ZoneDef[] = [
    {
      zone: 'ZONE 1',
      label: '恢复',
      hrrMin: 0.50,
      hrrMax: 0.60,
      pacePercent: [59, 65],   // ~59-65% vVO2max
      accentColor: undefined,
      description: '恢复区，用于热身和冷身，促进血液循环和乳酸清除',
      weeklyPercent: '10-15%',
      examples: ['轻松跑', '冷身慢跑', '恢复性有氧'],
    },
    {
      zone: 'ZONE 2',
      label: '有氧基础',
      hrrMin: 0.60,
      hrrMax: 0.74,
      pacePercent: [65, 74],   // ~65-74% vVO2max（Daniels E区间）
      accentColor: undefined,
      description: '有氧基础区，建立耐力引擎的核心区间，燃脂效率最高',
      weeklyPercent: '70-80%',
      examples: ['长距离慢跑(LSD)', '轻松跑', '基础有氧跑'],
    },
    {
      zone: 'ZONE 3',
      label: '马拉松配速',
      hrrMin: 0.75,
      hrrMax: 0.84,
      pacePercent: [75, 84],   // 马拉松配速区间（Daniels M区间）
      accentColor: 'border-l-status-warning',
      description: '马拉松配速区间，适应比赛节奏，提高脂肪利用率',
      weeklyPercent: '0-10%',
      examples: ['马拉松配速跑', '巡航间歇', '节奏跑入门'],
    },
    {
      zone: 'ZONE 4',
      label: '乳酸阈',
      hrrMin: 0.85,
      hrrMax: 0.88,
      pacePercent: [83, 88] as [number, number],   // 乳酸阈值区间（Daniels T区间）
      accentColor: 'border-l-tertiary-container',
      description: '乳酸阈值区间，提高身体清除乳酸的能力，是提速关键',
      weeklyPercent: '5-10%',
      examples: ['阈值跑(CRIT)', '亚阈值间歇', '马拉松配速+'],
    },
    {
      zone: 'ZONE 5',
      label: '最大摄氧',
      hrrMin: 0.95,
      hrrMax: 1.00,
      pacePercent: [95, 100] as [number, number],  // VO2max 区间（Daniels I区间）
      accentColor: 'border-l-status-danger',
      description: '最大摄氧量区间，提升 VO2max 和神经肌肉效率',
      weeklyPercent: '5-10%',
      examples: ['VO2max 间歇', '速度训练', '冲刺跑'],
    },
  ]

  return zones.map((z) => {
    // Karvonen 公式：目标HR = 静息HR + HRR × 强度百分比
    const hrMin = Math.round(restingHR + hrr * z.hrrMin)
    const hrMax = z.hrrMax === 1.00
      ? `${Math.round(restingHR + hrr * z.hrrMax)}+`
      : `${Math.round(restingHR + hrr * z.hrrMax)}`
    
    let paceStr = '- /km'
    if (vdot) {
      // 配速 percentage 越高 = 跑得越快，所以上限用更高百分比
      const paceSlowSec = getVDOTPace(vdot, z.pacePercent[0])
      const paceFastSec = getVDOTPace(vdot, z.pacePercent[1])
      paceStr = `${formatPace(paceSlowSec)} - ${formatPace(paceFastSec)} /km`
    }
    
    return {
      ...z,
      hr: z.hrrMax === 1.00 ? `${hrMin}+` : `${hrMin}-${hrMax}`,
      pace: paceStr,
    }
  })
}

// PB table distances with distance values
const pbDistances = [
  { key: '5K', label: '5K', distance: 5 },
  { key: '10K', label: '10K', distance: 10 },
  { key: 'halfMarathon', label: '半马', distance: 21.0975 },
  { key: 'fullMarathon', label: '全马', distance: 42.195 },
]

interface VDOTEntry {
  vdot: number
  pace5k: number
  pace10k: number
  paceHalf: number
  paceFull: number
}

const vdotTable: VDOTEntry[] = [
  { vdot: 30, pace5k: 288, pace10k: 306, paceHalf: 333, paceFull: 362 },
  { vdot: 31, pace5k: 283, pace10k: 301, paceHalf: 327, paceFull: 356 },
  { vdot: 32, pace5k: 278, pace10k: 296, paceHalf: 322, paceFull: 350 },
  { vdot: 33, pace5k: 274, pace10k: 291, paceHalf: 316, paceFull: 344 },
  { vdot: 34, pace5k: 269, pace10k: 286, paceHalf: 311, paceFull: 338 },
  { vdot: 35, pace5k: 265, pace10k: 281, paceHalf: 306, paceFull: 333 },
  { vdot: 36, pace5k: 261, pace10k: 277, paceHalf: 301, paceFull: 327 },
  { vdot: 37, pace5k: 257, pace10k: 273, paceHalf: 296, paceFull: 322 },
  { vdot: 38, pace5k: 253, pace10k: 268, paceHalf: 291, paceFull: 317 },
  { vdot: 39, pace5k: 249, pace10k: 264, paceHalf: 287, paceFull: 312 },
  { vdot: 40, pace5k: 245, pace10k: 260, paceHalf: 282, paceFull: 307 },
  { vdot: 41, pace5k: 241, pace10k: 256, paceHalf: 278, paceFull: 302 },
  { vdot: 42, pace5k: 238, pace10k: 252, paceHalf: 274, paceFull: 297 },
  { vdot: 43, pace5k: 234, pace10k: 248, paceHalf: 269, paceFull: 292 },
  { vdot: 44, pace5k: 231, pace10k: 244, paceHalf: 265, paceFull: 288 },
  { vdot: 45, pace5k: 227, pace10k: 241, paceHalf: 261, paceFull: 283 },
  { vdot: 46, pace5k: 224, pace10k: 237, paceHalf: 257, paceFull: 279 },
  { vdot: 47, pace5k: 221, pace10k: 233, paceHalf: 253, paceFull: 275 },
  { vdot: 48, pace5k: 218, pace10k: 230, paceHalf: 249, paceFull: 270 },
  { vdot: 49, pace5k: 215, pace10k: 226, paceHalf: 245, paceFull: 266 },
  { vdot: 50, pace5k: 212, pace10k: 223, paceHalf: 242, paceFull: 262 },
  { vdot: 51, pace5k: 209, pace10k: 220, paceHalf: 238, paceFull: 258 },
  { vdot: 52, pace5k: 206, pace10k: 216, paceHalf: 234, paceFull: 254 },
  { vdot: 53, pace5k: 203, pace10k: 213, paceHalf: 231, paceFull: 250 },
  { vdot: 54, pace5k: 200, pace10k: 210, paceHalf: 227, paceFull: 246 },
  { vdot: 55, pace5k: 198, pace10k: 207, paceHalf: 224, paceFull: 243 },
  { vdot: 56, pace5k: 195, pace10k: 204, paceHalf: 220, paceFull: 239 },
  { vdot: 57, pace5k: 192, pace10k: 201, paceHalf: 217, paceFull: 235 },
  { vdot: 58, pace5k: 190, pace10k: 198, paceHalf: 214, paceFull: 232 },
  { vdot: 59, pace5k: 187, pace10k: 195, paceHalf: 210, paceFull: 228 },
  { vdot: 60, pace5k: 185, pace10k: 192, paceHalf: 207, paceFull: 225 },
  { vdot: 61, pace5k: 182, pace10k: 190, paceHalf: 204, paceFull: 221 },
  { vdot: 62, pace5k: 180, pace10k: 187, paceHalf: 201, paceFull: 218 },
  { vdot: 63, pace5k: 178, pace10k: 184, paceHalf: 198, paceFull: 215 },
  { vdot: 64, pace5k: 175, pace10k: 182, paceHalf: 195, paceFull: 212 },
  { vdot: 65, pace5k: 173, pace10k: 179, paceHalf: 192, paceFull: 209 },
  { vdot: 66, pace5k: 171, pace10k: 177, paceHalf: 189, paceFull: 206 },
  { vdot: 67, pace5k: 169, pace10k: 174, paceHalf: 186, paceFull: 203 },
  { vdot: 68, pace5k: 166, pace10k: 172, paceHalf: 184, paceFull: 200 },
  { vdot: 69, pace5k: 164, pace10k: 169, paceHalf: 181, paceFull: 197 },
  { vdot: 70, pace5k: 162, pace10k: 167, paceHalf: 178, paceFull: 194 },
  { vdot: 71, pace5k: 160, pace10k: 165, paceHalf: 176, paceFull: 191 },
  { vdot: 72, pace5k: 158, pace10k: 162, paceHalf: 173, paceFull: 189 },
  { vdot: 73, pace5k: 156, pace10k: 160, paceHalf: 171, paceFull: 186 },
  { vdot: 74, pace5k: 154, pace10k: 158, paceHalf: 168, paceFull: 183 },
  { vdot: 75, pace5k: 152, pace10k: 156, paceHalf: 166, paceFull: 181 },
  { vdot: 76, pace5k: 150, pace10k: 154, paceHalf: 163, paceFull: 178 },
  { vdot: 77, pace5k: 148, pace10k: 152, paceHalf: 161, paceFull: 176 },
  { vdot: 78, pace5k: 146, pace10k: 150, paceHalf: 159, paceFull: 173 },
  { vdot: 79, pace5k: 144, pace10k: 148, paceHalf: 156, paceFull: 171 },
  { vdot: 80, pace5k: 142, pace10k: 146, paceHalf: 154, paceFull: 168 },
]

export function calculateVDOT(distanceKm: number, timeMinutes: number): number {
  const paceSecPerKm = (timeMinutes / distanceKm) * 60
  
  let paceField: keyof VDOTEntry
  if (distanceKm <= 5) paceField = 'pace5k'
  else if (distanceKm <= 10) paceField = 'pace10k'
  else if (distanceKm <= 21.0975) paceField = 'paceHalf'
  else paceField = 'paceFull'
  
  for (let i = 1; i < vdotTable.length; i++) {
    const prev = vdotTable[i - 1]
    const curr = vdotTable[i]
    
    if (paceSecPerKm >= curr[paceField] && paceSecPerKm <= prev[paceField]) {
      const range = prev[paceField] - curr[paceField]
      const position = (paceSecPerKm - curr[paceField]) / range
      const vdot = curr.vdot + (prev.vdot - curr.vdot) * position
      return Math.round(vdot * 10) / 10
    }
  }
  
  if (paceSecPerKm <= vdotTable[vdotTable.length - 1][paceField]) {
    return vdotTable[vdotTable.length - 1].vdot
  }
  
  if (paceSecPerKm >= vdotTable[0][paceField]) {
    return vdotTable[0].vdot
  }
  
  return 50
}

function deriveTargetPace(distanceKm: number, vdot: number | null): string {
  if (!vdot) return '\u2014'
  
  let paceSec: number
  
  for (let i = 0; i < vdotTable.length; i++) {
    if (vdotTable[i].vdot === Math.round(vdot)) {
      if (distanceKm <= 5) paceSec = vdotTable[i].pace5k
      else if (distanceKm <= 10) paceSec = vdotTable[i].pace10k
      else if (distanceKm <= 21.0975) paceSec = vdotTable[i].paceHalf
      else paceSec = vdotTable[i].paceFull
      return `~${formatPace(paceSec)}/km`
    }
    
    if (i < vdotTable.length - 1) {
      const curr = vdotTable[i]
      const next = vdotTable[i + 1]
      if (vdot >= curr.vdot && vdot <= next.vdot) {
        const t = (vdot - curr.vdot) / (next.vdot - curr.vdot)
        if (distanceKm <= 5) paceSec = Math.round(curr.pace5k + (next.pace5k - curr.pace5k) * t)
        else if (distanceKm <= 10) paceSec = Math.round(curr.pace10k + (next.pace10k - curr.pace10k) * t)
        else if (distanceKm <= 21.0975) paceSec = Math.round(curr.paceHalf + (next.paceHalf - curr.paceHalf) * t)
        else paceSec = Math.round(curr.paceFull + (next.paceFull - curr.paceFull) * t)
        return `~${formatPace(paceSec)}/km`
      }
    }
  }
  
  return '\u2014'
}

export default function Profile() {
  const { profile, updateProfile, trainingRecords, hasTrainingData, estimateVDOT } = useAppContext()

  // ---- State: Edit mode for Personal Info ----
  const [isEditing, setIsEditing] = useState(false)

  // Form fields for edit/create mode
  const [editName, setEditName] = useState('')
  const [editAge, setEditAge] = useState<number | string>('')
  const [editGender, setEditGender] = useState<'男' | '女'>('男')
  const [editHeight, setEditHeight] = useState<number | string>('')
  const [editWeight, setEditWeight] = useState<number | string>('')
  const [editRunningYears, setEditRunningYears] = useState<number | string>('')
  const [editGoal, setEditGoal] = useState('')
  const [editInjuryHistory, setEditInjuryHistory] = useState('')
  const [editMaxTrainingDays, setEditMaxTrainingDays] = useState<number | string>(5)
  const [editMaxSingleDistance, setEditMaxSingleDistance] = useState<number | string>(21)
  const [editRestingHr, setEditRestingHr] = useState<number | string>('')

  // Validation errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Determine initial edit mode: if profile is incomplete, start in edit mode
  useEffect(() => {
    if (!profile.name || profile.age === null || profile.gender === null || profile.height === null || profile.weight === null) {
      setIsEditing(true)
      // Pre-fill with existing data if any
      setEditName(profile.name)
      setEditAge(profile.age ?? '')
      setEditGender(profile.gender ?? '男')
      setEditHeight(profile.height ?? '')
      setEditWeight(profile.weight ?? '')
      setEditRunningYears(profile.runningYears ?? '')
      setEditGoal(profile.goal)
      setEditInjuryHistory(profile.injuryHistory || '')
      setEditMaxTrainingDays(profile.maxTrainingDaysPerWeek || 5)
      setEditMaxSingleDistance(profile.maxSingleDistance || 21)
      setEditRestingHr(profile.restingHr ?? '')
    }
  }, [])

  // ---- State: Training Zones interaction ----
  const [selectedZone, setSelectedZone] = useState<string | null>(null)
  const zoneTooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (zoneTooltipRef.current && !zoneTooltipRef.current.contains(e.target as Node)) {
        setSelectedZone(null)
      }
    }
    if (selectedZone !== null) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [selectedZone])

  // ---- State: Editable PB Table ----
  const [pbData, setPbData] = useState<Record<string, string>>({
    '5K': '',
    '10K': '',
    'halfMarathon': '',
    'fullMarathon': '',
  })
  const [editingPB, setEditingPB] = useState<string | null>(null)
  const [pbInputValue, setPbInputValue] = useState('')

  const startEditPB = (distanceKey: string, currentValue: string) => {
    setEditingPB(distanceKey)
    setPbInputValue(currentValue)
  }

  const savePB = (distanceKey: string) => {
    let value = pbInputValue.trim()
    const pattern = /^(\d+:)?\d{1,2}:\d{2}$/
    if (!pattern.test(value) && value !== '') {
      setEditingPB(null)
      return
    }
    setPbData((prev) => ({ ...prev, [distanceKey]: value }))
    setEditingPB(null)
  }

  // ---- State: Time Period Selector ----
  const [statsPeriod, setStatsPeriod] = useState('7天')

  // ---- State: VDOT Modal ----
  const [showVdotModal, setShowVdotModal] = useState(false)
  const [raceDistance, setRaceDistance] = useState('5')
  const [raceTime, setRaceTime] = useState('')
  const [calculatedVdot, setCalculatedVdot] = useState<number | null>(null)
  const [vdotMode, setVdotMode] = useState<'manual' | 'auto'>('manual')

  const zones = calculateTrainingZones(profile.age, profile.vdot, profile.restingHr)

  // ---- Handlers ----

  const startEdit = () => {
    setEditName(profile.name)
    setEditAge(profile.age ?? '')
    setEditGender(profile.gender ?? '男')
    setEditHeight(profile.height ?? '')
    setEditWeight(profile.weight ?? '')
    setEditRunningYears(profile.runningYears ?? '')
    setEditGoal(profile.goal)
    setEditInjuryHistory(profile.injuryHistory || '')
    setEditMaxTrainingDays(profile.maxTrainingDaysPerWeek || 5)
    setEditMaxSingleDistance(profile.maxSingleDistance || 21)
    setEditRestingHr(profile.restingHr ?? '')
    setFormErrors({})
    setIsEditing(true)
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!editName.trim()) errors.name = '请输入姓名'
    if (editAge === '' || editAge === null) {
      errors.age = '请输入年龄'
    } else {
      const ageNum = Number(editAge)
      if (isNaN(ageNum) || ageNum < 10 || ageNum > 100) errors.age = '年龄需在 10-100 之间'
    }
    if (editHeight === '' || editHeight === null) {
      errors.height = '请输入身高'
    } else {
      const h = Number(editHeight)
      if (isNaN(h) || h < 100 || h > 250) errors.height = '身高需在 100-250 cm 之间'
    }
    if (editWeight === '' || editWeight === null) {
      errors.weight = '请输入体重'
    } else {
      const w = Number(editWeight)
      if (isNaN(w) || w < 30 || w > 200) errors.weight = '体重需在 30-200 kg 之间'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const saveProfile = () => {
    if (!validateForm()) return

    updateProfile({
      name: editName.trim(),
      age: Number(editAge),
      gender: editGender,
      height: Number(editHeight),
      weight: Number(editWeight),
      runningYears: editRunningYears ? Number(editRunningYears) : null,
      goal: editGoal || undefined,
      injuryHistory: editInjuryHistory,
      maxTrainingDaysPerWeek: Number(editMaxTrainingDays) || 5,
      maxSingleDistance: Number(editMaxSingleDistance) || 21,
      restingHr: editRestingHr ? Number(editRestingHr) : null,
    })
    setIsEditing(false)
    setFormErrors({})
  }

  const cancelEdit = () => {
    // If profile was never completed and user cancels, stay in edit mode
    if (!profile.name && !profile.age) {
      return // Force them to fill it out
    }
    setIsEditing(false)
    setFormErrors({})
  }

  // VDOT calculation handlers
  const handleCalculateVDOT = () => {
    if (!raceTime) return
    const parts = raceTime.split(':').map(Number)
    let totalMinutes = 0
    if (parts.length === 2) {
      totalMinutes = parts[0] + parts[1] / 60
    } else if (parts.length === 3) {
      totalMinutes = parts[0] * 60 + parts[1] + parts[2] / 60
    }
    if (totalMinutes > 0) {
      const vdot = calculateVDOT(parseFloat(raceDistance), totalMinutes)
      setCalculatedVdot(vdot)
    }
  }

  const handleAutoCalculateVDOT = () => {
    const estimated = estimateVDOT()
    if (estimated) {
      setCalculatedVdot(estimated)
    }
  }

  const applyNewVDOT = () => {
    if (calculatedVdot) {
      updateProfile({ vdot: calculatedVdot, vo2max: calculatedVdot })
      setShowVdotModal(false)
      setCalculatedVdot(null)
      setRaceTime('')
      setVdotMode('manual')
    }
  }

  // Calculate stats from training records
  const getEmptyStats = () => [
    { label: '总距离', value: '— km', percent: 0, fillClass: 'bg-primary-container' },
    { label: '训练次数', value: '— 次', percent: 0, fillClass: 'bg-[#D97706]' },
    { label: '最长距离', value: '— km', percent: 0, fillClass: 'bg-status-success' },
    { label: '平均配速', value: '—', percent: 0, fillClass: 'bg-tertiary-container' },
    { label: '消耗热量', value: '— kcal', percent: 0, fillClass: 'bg-status-warning' },
  ]

  const getStatsFromRecords = () => {
    if (trainingRecords.length === 0) return getEmptyStats()

    const now = new Date()
    let filteredRecords = trainingRecords

    switch (statsPeriod) {
      case '7天':
        filteredRecords = trainingRecords.filter(r => {
          const recordDate = new Date(r.date)
          return now.getTime() - recordDate.getTime() <= 7 * 24 * 60 * 60 * 1000
        })
        break
      case '30天':
        filteredRecords = trainingRecords.filter(r => {
          const recordDate = new Date(r.date)
          return now.getTime() - recordDate.getTime() <= 30 * 24 * 60 * 60 * 1000
        })
        break
      case '12周':
        filteredRecords = trainingRecords.filter(r => {
          const recordDate = new Date(r.date)
          return now.getTime() - recordDate.getTime() <= 12 * 7 * 24 * 60 * 60 * 1000
        })
        break
    }

    if (filteredRecords.length === 0) return getEmptyStats()

    const totalDistance = filteredRecords.reduce((sum, r) => sum + r.distance, 0).toFixed(1)
    const maxDistance = Math.max(...filteredRecords.map((r) => r.distance)).toFixed(1)
    const avgCalories = Math.round(filteredRecords.reduce((sum, r) => sum + r.calories, 0) / filteredRecords.length)

    const pacesWithValues = filteredRecords
      .filter((r) => r.avgPace && r.avgPace !== '-')
      .map((r) => {
        const parts = r.avgPace.split(':')
        return parts.length === 2 ? parseInt(parts[0]) * 60 + parseInt(parts[1]) : 0
      })
    const avgPaceSec = pacesWithValues.length > 0
      ? Math.round(pacesWithValues.reduce((a, b) => a + b, 0) / pacesWithValues.length)
      : 0
    const avgPaceStr = avgPaceSec > 0
      ? `${Math.floor(avgPaceSec / 60)}:${(avgPaceSec % 60).toString().padStart(2, '0')}`
      : '—'

    return [
      { label: '总距离', value: `${totalDistance} km`, percent: Math.min(85, Math.round(parseFloat(totalDistance) / 10)), fillClass: 'bg-primary-container' },
      { label: '训练次数', value: `${filteredRecords.length} 次`, percent: Math.min(90, filteredRecords.length * 5), fillClass: 'bg-[#D97706]' },
      { label: '最长距离', value: `${maxDistance} km`, percent: Math.min(70, parseFloat(maxDistance) * 4), fillClass: 'bg-status-success' },
      { label: '平均配速', value: avgPaceStr, percent: 0, fillClass: 'bg-tertiary-container' },
      { label: '消耗热量', value: `${avgCalories} kcal`, percent: Math.min(75, Math.round(avgCalories / 10)), fillClass: 'bg-status-warning' },
    ]
  }

  const currentStats = hasTrainingData ? getStatsFromRecords() : getEmptyStats()

  // Avatar initials
  const initials = profile.name
    ? profile.name.slice(0, 1).toUpperCase()
    : '?'

  return (
    <>
      <OnboardingGuide />
      {/* Page Header */}
      <h2 className="font-headline-xl text-headline-xl-mobile md:text-headline-xl text-text-primary mb-8">
        个人档案
      </h2>

      <div className="grid grid-cols-12 gap-gutter">

        {/* ===== SECTION 1: Personal Info Card ===== */}
        <div className="col-span-12 lg:col-span-8 p-stack-lg data-card relative" id="profile-edit-section">
          {!isEditing ? (
            /* VIEW MODE — Profile complete */
            <div className="flex items-center gap-8">
              {/* Avatar placeholder */}
              <div className="w-28 h-28 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <span className="font-headline-xl text-[42px] font-bold text-primary">
                  {initials}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-headline-xl text-[28px] font-bold text-text-primary mb-1">
                      {profile.name}
                    </h3>
                    <p className="font-body-sm text-secondary">
                      {profile.gender} · {profile.age} 岁 · {profile.height}cm · {profile.weight}kg
                      {profile.runningYears != null ? ` · 跑龄 ${profile.runningYears} 年` : ''}
                    </p>
                  </div>
                  <button
                    onClick={startEdit}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors text-outline-variant hover:text-primary cursor-pointer border-none shrink-0"
                    title="编辑个人档案"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                </div>

                {/* Goal badge */}
                {profile.goal && (
                  <div className="inline-flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-lg mt-2">
                    <span className="material-symbols-outlined text-[16px] text-primary">flag</span>
                    <span className="font-body-sm font-medium text-primary">{profile.goal}</span>
                  </div>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                  {profile.maxTrainingDaysPerWeek && (
                    <span className="font-body-xs text-secondary">每周 {profile.maxTrainingDaysPerWeek} 天训练</span>
                  )}
                  {profile.maxSingleDistance && (
                    <span className="font-body-xs text-secondary">单次最长 {profile.maxSingleDistance}km</span>
                  )}
                  {profile.restingHr && (
                    <span className="font-body-xs text-secondary">静息心率 {profile.restingHr} bpm</span>
                  )}
                </div>
                {profile.injuryHistory && (
                  <div className="flex items-start gap-1.5 mt-2">
                    <span className="material-symbols-outlined text-[14px] text-status-warning mt-0.5">warning</span>
                    <p className="font-body-xs text-secondary">{profile.injuryHistory}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* EDIT MODE — Form (default when empty) */
            <div>
              <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-primary text-[22px]">person</span>
                <h3 className="font-headline-lg text-headline-lg text-text-primary">
                  {!profile.name ? '欢迎使用 EndureMate AI！' : '编辑个人档案'}
                </h3>
              </div>

              {!profile.name && (
                <p className="font-body-sm text-secondary mb-6 max-w-md">
                  请先完善你的基本信息，以便获得更精准的训练分析和建议。
                </p>
              )}

              <div className="space-y-4 max-w-md">
                {/* Name */}
                <div>
                  <label className="font-body-sm font-medium text-text-primary mb-1.5 block">
                    姓名 <span className="text-status-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => {
                      setEditName(e.target.value)
                      if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: '' }))
                    }}
                    className={`w-full px-3 py-2.5 bg-surface-container-low border rounded-lg text-text-primary focus:ring-2 focus:ring-primary outline-none transition-all font-body-sm ${
                      formErrors.name ? 'border-status-danger' : 'border-border-subtle'
                    }`}
                    placeholder="输入你的姓名"
                  />
                  {formErrors.name && (
                    <p className="text-xs text-status-danger mt-1">{formErrors.name}</p>
                  )}
                </div>

                {/* Age & Gender row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-body-sm font-medium text-text-primary mb-1.5 block">
                      年龄 <span className="text-status-danger">*</span>
                    </label>
                    <input
                      type="number"
                      value={editAge}
                      onChange={(e) => {
                        setEditAge(e.target.value)
                        if (formErrors.age) setFormErrors((prev) => ({ ...prev, age: '' }))
                      }}
                      className={`w-full px-3 py-2.5 bg-surface-container-low border rounded-lg text-text-primary focus:ring-2 focus:ring-primary outline-none transition-all font-body-sm ${
                        formErrors.age ? 'border-status-danger' : 'border-border-subtle'
                      }`}
                      placeholder="年"
                      min={10}
                      max={100}
                    />
                    {formErrors.age && (
                      <p className="text-xs text-status-danger mt-1">{formErrors.age}</p>
                    )}
                  </div>
                  <div>
                    <label className="font-body-sm font-medium text-text-primary mb-1.5 block">
                      性别 <span className="text-status-danger">*</span>
                    </label>
                    <select
                      value={editGender}
                      onChange={(e) => setEditGender(e.target.value as '男' | '女')}
                      className="w-full px-3 py-2.5 bg-surface-container-low border border-border-subtle rounded-lg text-text-primary focus:ring-2 focus:ring-primary outline-none transition-all cursor-pointer font-body-sm"
                    >
                      <option value="男">男</option>
                      <option value="女">女</option>
                    </select>
                  </div>
                </div>

                {/* Height & Weight row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-body-sm font-medium text-text-primary mb-1.5 block">
                      身高 <span className="text-status-danger">*</span>
                    </label>
                    <input
                      type="number"
                      value={editHeight}
                      onChange={(e) => {
                        setEditHeight(e.target.value)
                        if (formErrors.height) setFormErrors((prev) => ({ ...prev, height: '' }))
                      }}
                      className={`w-full px-3 py-2.5 bg-surface-container-low border rounded-lg text-text-primary focus:ring-2 focus:ring-primary outline-none transition-all font-body-sm ${
                        formErrors.height ? 'border-status-danger' : 'border-border-subtle'
                      }`}
                      placeholder="cm"
                      min={100}
                      max={250}
                    />
                    {formErrors.height && (
                      <p className="text-xs text-status-danger mt-1">{formErrors.height}</p>
                    )}
                  </div>
                  <div>
                    <label className="font-body-sm font-medium text-text-primary mb-1.5 block">
                      体重 <span className="text-status-danger">*</span>
                    </label>
                    <input
                      type="number"
                      value={editWeight}
                      onChange={(e) => {
                        setEditWeight(e.target.value)
                        if (formErrors.weight) setFormErrors((prev) => ({ ...prev, weight: '' }))
                      }}
                      className={`w-full px-3 py-2.5 bg-surface-container-low border rounded-lg text-text-primary focus:ring-2 focus:ring-primary outline-none transition-all font-body-sm ${
                        formErrors.weight ? 'border-status-danger' : 'border-border-subtle'
                      }`}
                      placeholder="kg"
                      min={30}
                      max={200}
                    />
                    {formErrors.weight && (
                      <p className="text-xs text-status-danger mt-1">{formErrors.weight}</p>
                    )}
                  </div>
                </div>

                {/* Running Years (optional) */}
                <div>
                  <label className="font-body-sm font-medium text-text-primary mb-1.5 block">
                    跑龄 <span className="text-secondary font-normal">(选填)</span>
                  </label>
                  <input
                    type="number"
                    value={editRunningYears}
                    onChange={(e) => setEditRunningYears(e.target.value)}
                    className="w-full px-3 py-2.5 bg-surface-container-low border border-border-subtle rounded-lg text-text-primary focus:ring-2 focus:ring-primary outline-none transition-all font-body-sm"
                    placeholder="年"
                    min={0}
                    max={99}
                  />
                </div>

                {/* Goal (optional) */}
                <div id="goal-selector">
                  <label className="font-body-sm font-medium text-text-primary mb-1.5 block">
                    备赛目标 <span className="text-secondary font-normal">(选填)</span>
                  </label>
                  <select
                    value={editGoal}
                    onChange={(e) => setEditGoal(e.target.value)}
                    className="w-full px-3 py-2.5 bg-surface-container-low border border-border-subtle rounded-lg text-text-primary focus:ring-2 focus:ring-primary outline-none transition-all cursor-pointer font-body-sm"
                  >
                    <option value="">— 请选择 —</option>
                    {goalOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                {/* Injury History (optional) */}
                <div>
                  <label className="font-body-sm font-medium text-text-primary mb-1.5 block">
                    伤病史 <span className="text-secondary font-normal">(选填)</span>
                  </label>
                  <textarea
                    value={editInjuryHistory}
                    onChange={(e) => setEditInjuryHistory(e.target.value)}
                    className="w-full px-3 py-2.5 bg-surface-container-low border border-border-subtle rounded-lg text-text-primary focus:ring-2 focus:ring-primary outline-none transition-all font-body-sm resize-none"
                    placeholder="例如：右膝髌腱炎（2023年）、足底筋膜炎"
                    rows={2}
                  />
                </div>

                {/* Training Days & Max Distance row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-body-sm font-medium text-text-primary mb-1.5 block">
                      每周训练天数 <span className="text-secondary font-normal">(选填)</span>
                    </label>
                    <select
                      value={editMaxTrainingDays}
                      onChange={(e) => setEditMaxTrainingDays(e.target.value)}
                      className="w-full px-3 py-2.5 bg-surface-container-low border border-border-subtle rounded-lg text-text-primary focus:ring-2 focus:ring-primary outline-none transition-all cursor-pointer font-body-sm"
                    >
                      {[3, 4, 5, 6, 7].map(d => (
                        <option key={d} value={d}>{d} 天</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-body-sm font-medium text-text-primary mb-1.5 block">
                      单次最长距离 <span className="text-secondary font-normal">(km，选填)</span>
                    </label>
                    <input
                      type="number"
                      value={editMaxSingleDistance}
                      onChange={(e) => setEditMaxSingleDistance(e.target.value)}
                      className="w-full px-3 py-2.5 bg-surface-container-low border border-border-subtle rounded-lg text-text-primary focus:ring-2 focus:ring-primary outline-none transition-all font-body-sm"
                      placeholder="21"
                      min={3}
                      max={50}
                    />
                  </div>
                </div>

                {/* Resting HR (optional) */}
                <div>
                  <label className="font-body-sm font-medium text-text-primary mb-1.5 block">
                    静息心率 <span className="text-secondary font-normal">(选填，用于精准计算心率区间)</span>
                  </label>
                  <input
                    type="number"
                    value={editRestingHr}
                    onChange={(e) => setEditRestingHr(e.target.value)}
                    className="w-full px-3 py-2.5 bg-surface-container-low border border-border-subtle rounded-lg text-text-primary focus:ring-2 focus:ring-primary outline-none transition-all font-body-sm"
                    placeholder="早晨静息心率（bpm），如 55"
                    min={35}
                    max={90}
                  />
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={saveProfile}
                    className="px-5 py-2.5 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer border-none flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[16px]">check</span>
                    保存档案
                  </button>
                  {profile.name && (
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="px-5 py-2.5 bg-surface-container border border-border-subtle rounded-lg text-sm font-medium text-text-primary hover:bg-surface-container-high transition-colors cursor-pointer"
                    >
                      取消
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ===== SECTION 2: VDOT / VO2max Section (conditional) ===== */}
        <div className="col-span-12 lg:col-span-4 p-stack-lg flex flex-col data-card relative" id="vdot-section">
          <p className="font-body-sm text-[13px] text-primary-container font-semibold mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">speed</span>
            核心能力指标
          </p>

          {(profile.vdot === null && profile.vo2max === null) ? (
            /* No VDOT data yet */
            <div className="flex-1 flex flex-col justify-center">
              <div className="text-center py-4">
                <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-surface-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-[28px] text-secondary">query_stats</span>
                </div>
                <p className="font-body-sm text-secondary mb-4">
                  完成一次比赛或测试后可测算 VDOT
                </p>
                <button
                  type="button"
                  onClick={() => setShowVdotModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors cursor-pointer border-none"
                >
                  <span className="material-symbols-outlined text-[16px]">calculate</span>
                  重新测算
                </button>
              </div>
            </div>
          ) : (
            /* Has VDOT data */
            <>
              <div className="mb-6 border-l-2 border-primary-container pl-4 flex items-baseline gap-3">
                <div>
                  <p className="data-font text-[12px] text-secondary mb-1">VDOT Score</p>
                  <p className="font-headline-xl text-[36px] font-bold text-text-primary leading-none">
                    {profile.vdot ?? '—'}
                  </p>
                </div>
                <button
                  onClick={() => setShowVdotModal(true)}
                  className="text-xs text-primary hover:text-primary/80 underline cursor-pointer whitespace-nowrap font-normal"
                >
                  重新测算
                </button>
              </div>
              <div>
                <p className="data-font text-[12px] text-secondary mb-1">Estimated VO2max</p>
                <p className="font-headline-md text-[20px] font-semibold text-text-primary">
                  {profile.vo2max ?? '—'}{' '}
                  <span className="font-body-sm text-[12px] text-secondary font-normal">
                    ml/kg/min
                  </span>
                </p>
              </div>

              {/* Core ability indicators (simplified) */}
              <div className="mt-6 pt-4 border-t border-border-subtle space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-body-xs text-secondary">有氧能力</span>
                  <span className="font-body-xs font-semibold text-text-primary">
                    {profile.vdot && profile.vdot >= 50 ? '优秀' : profile.vdot && profile.vdot >= 40 ? '良好' : '提升中'}
                  </span>
                </div>
                <div className="w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-primary-container h-1.5 rounded-full"
                    style={{ width: `${Math.min(100, ((profile.vdot ?? 30) - 30) * 2.5)}%` }}
                  />
                </div>
              </div>
            </>
          )}

          {/* VDOT Recalculation Modal */}
          {showVdotModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowVdotModal(false)}>
              <div className="bg-surface rounded-xl shadow-2xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
                <h3 className="font-headline-md text-[18px] font-bold text-text-primary mb-4">
                  测算 VDOT
                </h3>
                
                {/* Mode Toggle */}
                <div className="flex bg-surface-container-low rounded-lg p-1 mb-4">
                  <button
                    onClick={() => { setVdotMode('manual'); setCalculatedVdot(null); }}
                    className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      vdotMode === 'manual' 
                        ? 'bg-primary text-on-primary' 
                        : 'text-text-primary hover:text-primary'
                    }`}
                  >
                    输入PB计算
                  </button>
                  <button
                    onClick={() => { setVdotMode('auto'); setCalculatedVdot(null); }}
                    disabled={!hasTrainingData}
                    className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      vdotMode === 'auto' 
                        ? 'bg-primary text-on-primary' 
                        : 'text-text-primary hover:text-primary'
                    } ${!hasTrainingData ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    基于训练记录
                  </button>
                </div>

                {vdotMode === 'manual' ? (
                  <>
                    <p className="text-sm text-secondary mb-4">
                      输入最近的比赛成绩，系统将自动计算你的 VDOT 指数。
                    </p>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">比赛距离 (km)</label>
                        <select
                          value={raceDistance}
                          onChange={(e) => setRaceDistance(e.target.value)}
                          className="w-full px-3 py-2 bg-surface-container-low border border-border-subtle rounded-lg text-text-primary focus:ring-2 focus:ring-primary outline-none cursor-pointer"
                        >
                          <option value="5">5 公里</option>
                          <option value="10">10 公里</option>
                          <option value="21.0975">半程马拉松 (21.1km)</option>
                          <option value="42.195">全程马拉松 (42.2km)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">完赛时间</label>
                        <input
                          value={raceTime}
                          onChange={(e) => setRaceTime(e.target.value)}
                          placeholder="格式: MM:SS 或 H:MM:SS"
                          className="w-full px-3 py-2 bg-surface-container-low border border-border-subtle rounded-lg text-text-primary focus:ring-2 focus:ring-primary outline-none data-font"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-secondary mb-4">
                      系统将分析你的训练记录，自动估算你的 VDOT 指数。
                    </p>
                    <div className="bg-surface-container-low rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-[24px]">trending_up</span>
                        <div>
                          <p className="text-sm font-medium text-text-primary">训练记录分析</p>
                          <p className="text-xs text-secondary">已上传 {trainingRecords.length} 条训练记录</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {calculatedVdot !== null && (
                  <div className="bg-primary-container/10 rounded-lg p-3">
                    <p className="text-sm text-secondary">计算结果</p>
                    <p className="font-headline-xl text-[28px] font-bold text-primary-container">
                      VDOT {calculatedVdot}
                    </p>
                    <p className="text-xs text-secondary mt-1">
                      VO2max ≈ {calculatedVdot} ml/kg/min
                    </p>
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowVdotModal(false)}
                    className="flex-1 px-4 py-2 bg-surface-container border border-border-subtle rounded-lg text-sm font-medium text-text-primary hover:bg-surface-container-high transition-colors cursor-pointer"
                  >
                    取消
                  </button>
                  {calculatedVdot !== null ? (
                    <button
                      onClick={applyNewVDOT}
                      className="flex-1 px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      应用新值
                    </button>
                  ) : vdotMode === 'manual' ? (
                    <button
                      onClick={handleCalculateVDOT}
                      className="flex-1 px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      计算
                    </button>
                  ) : (
                    <button
                      onClick={handleAutoCalculateVDOT}
                      disabled={!hasTrainingData}
                      className="flex-1 px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      开始分析
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ===== SECTION 3: Training Zones (always visible, contextual) ===== */}
        <div className="col-span-12 p-stack-lg data-card relative" ref={zoneTooltipRef} id="zones-section">
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-headline-md text-[20px] font-bold text-text-primary">
              训练区间 (Zones)
            </h4>
            {profile.age == null && (
              <span className="font-body-xs text-secondary">
                (需填写年龄后个性化)
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {zones.map((z) => (
              <div key={z.zone}>
                <div
                  onClick={() =>
                    setSelectedZone(selectedZone === z.zone ? null : z.zone)
                  }
                  className={`bg-surface-bright rounded border p-4 cursor-pointer transition-all duration-200 ${
                    z.accentColor ? `border-l-2 ${z.accentColor}` : ''
                  } ${
                    selectedZone === z.zone
                      ? 'ring-2 ring-primary scale-[1.02] shadow-md'
                      : 'border-border-subtle hover:shadow-md hover:-translate-y-0.5'
                  }`}
                >
                  <p className="data-font text-[11px] text-secondary mb-3">
                    {z.zone} &middot; {z.label}
                  </p>
                  <p className="data-font text-[18px] text-text-primary mb-1">
                    {z.hr}{' '}
                    <span className="text-[12px] font-normal text-secondary">bpm</span>
                  </p>
                  <p className="font-body-sm text-[13px] text-secondary">{z.pace}</p>
                </div>

                {/* Zone Tooltip / Popover */}
                {selectedZone === z.zone && (
                  <div className="absolute z-30 mt-2 w-64 bg-surface rounded-lg shadow-xl border border-border-subtle p-4 animate-in fade-in zoom-in-95 duration-200" style={{ marginLeft: '0' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-block w-3 h-3 rounded ${
                        z.zone === 'ZONE 1' ? 'bg-status-success' :
                        z.zone === 'ZONE 2' ? 'bg-primary' :
                        z.zone === 'ZONE 3' ? 'bg-status-warning' :
                        z.zone === 'ZONE 4' ? 'bg-tertiary-container' :
                        'bg-status-danger'
                      }`}></span>
                      <p className="font-headline-sm text-[14px] font-bold text-text-primary">
                        {z.zone} - {z.label}
                      </p>
                    </div>
                    <p className="text-sm text-secondary mb-3 leading-relaxed">{z.description}</p>
                    <div className="space-y-2">
                      <div>
                        <p className="text-[11px] text-outline-variant uppercase tracking-wider font-semibold">建议周训练占比</p>
                        <p className="text-sm font-semibold text-text-primary">{z.weeklyPercent}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-outline-variant uppercase tracking-wider font-semibold">典型训练类型</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {z.examples.map((ex) => (
                            <span key={ex} className="text-xs bg-surface-container px-2 py-0.5 rounded text-text-primary">
                              {ex}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ===== SECTION 4: Goals & PB Table (empty by default) ===== */}
        <div className="col-span-12 md:col-span-6 p-stack-lg data-card">
          <h4 className="font-headline-md text-[20px] font-bold text-text-primary mb-2">
            目标与 PB
          </h4>
          {!hasTrainingData && (
            <p className="font-body-xs text-secondary mb-4">
              点击单元格输入或编辑你的最好成绩
            </p>
          )}
          <table className="w-full text-left font-body-sm text-body-sm text-text-primary">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="py-3 font-body-sm text-[12px] text-secondary font-normal w-1/3">
                  距离
                </th>
                <th className="py-3 font-body-sm text-[12px] text-secondary font-normal w-1/3">
                  个人最好 (PB)
                  <span className="ml-1 text-[10px] text-outline-variant normal-font">(点击编辑)</span>
                </th>
                <th className="py-3 font-body-sm text-[12px] text-secondary font-normal w-1/3 text-right">
                  目标
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {pbDistances.map((dist) => (
                <tr key={dist.key}>
                  <td className="py-4 font-semibold text-[14px]">{dist.label}</td>
                  <td className="py-4">
                    {editingPB === dist.key ? (
                      <input
                        autoFocus
                        value={pbInputValue}
                        onChange={(e) => setPbInputValue(e.target.value)}
                        onBlur={() => savePB(dist.key)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') savePB(dist.key)
                          if (e.key === 'Escape') setEditingPB(null)
                        }}
                        className="data-font text-[15px] bg-surface-bright border-2 border-primary rounded px-2 py-0.5 w-28 focus:outline-none focus:ring-2 focus:ring-primary/30"
                        placeholder="H:MM:SS"
                      />
                    ) : (
                      <span
                        onClick={() => startEditPB(dist.key, pbData[dist.key] || '')}
                        className={`data-font text-[15px] cursor-pointer hover:text-primary hover:underline transition-colors px-1 rounded hover:bg-surface-container/50 ${
                          pbData[dist.key] ? '' : 'text-secondary italic'
                        }`}
                      >
                        {pbData[dist.key] || '—'}
                      </span>
                    )}
                  </td>
                  <td className="py-4 data-font text-[15px] text-primary-container font-semibold text-right">
                    {deriveTargetPace(dist.distance, profile.vdot)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ===== SECTION 5: Recent Statistics (contextual) ===== */}
        <div className="col-span-12 md:col-span-6 p-stack-lg data-card">
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-headline-md text-[20px] font-bold text-text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-text-primary text-[20px]">
                insights
              </span>
              近期数据
            </h4>
            <div className="flex bg-surface-container-low rounded-lg p-0.5">
              {(['7天', '30天', '12周'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setStatsPeriod(period)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer border-none ${
                    statsPeriod === period
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-secondary hover:text-text-primary'
                  }`}
                >
                  过去{period}
                </button>
              ))}
            </div>
          </div>

          {!hasTrainingData ? (
            /* Empty state for statistics */
            <div className="text-center py-8">
              <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-surface-container flex items-center justify-center">
                <span className="material-symbols-outlined text-[28px] text-secondary">bar_chart</span>
              </div>
              <p className="font-body-sm text-secondary mb-6">
                上传训练数据后查看统计
              </p>
              <div className="space-y-4 max-w-xs mx-auto">
                {getEmptyStats().map((stat) => (
                  <div key={stat.label}>
                    <div className="flex justify-between items-end mb-1.5">
                      <span className="font-body-sm text-[13px] text-secondary">
                        {stat.label}
                      </span>
                      <span className="data-font text-[16px] text-text-primary font-medium">
                        {stat.value}
                      </span>
                    </div>
                    <div className="w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
                      <div className="bg-surface-variant h-1.5 rounded-full" style={{ width: '100%' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Real stats when has data */
            <div className="space-y-6 mt-2">
              {currentStats.map((stat) => (
                <div key={`${statsPeriod}-${stat.label}`}>
                  <div className="flex justify-between items-end mb-2">
                    <span className="font-body-sm text-[13px] text-secondary">
                      {stat.label}
                    </span>
                    <span className="data-font text-[18px] text-text-primary font-medium">
                      {stat.value}
                    </span>
                  </div>
                  <div className="w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`${stat.fillClass} h-1.5 rounded-full transition-all duration-500 ease-out`}
                      style={{ width: `${stat.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </>
  )
}
