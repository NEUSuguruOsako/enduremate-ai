import { useState, useRef, useEffect } from 'react'
import { useAppContext } from '../context/AppContext'

const goalOptions = [
  '5K进阶',
  '10K进阶',
  '半马备赛',
  '全马备赛',
  '有氧基础重建',
  '赛后恢复',
]

// Generic training zones (reference values before personalization)
const genericZones = [
  {
    zone: 'ZONE 1',
    label: '恢复',
    hr: '110-130',
    pace: '6:00 - 6:30 /km',
    accentColor: undefined,
    description: '恢复区，用于热身和冷身，促进血液循环和乳酸清除',
    weeklyPercent: '15-20%',
    examples: ['轻松跑', '冷身慢跑', '恢复性有氧'],
  },
  {
    zone: 'ZONE 2',
    label: '有氧',
    hr: '131-145',
    pace: '5:20 - 5:50 /km',
    accentColor: undefined,
    description: '有氧基础区，建立耐力引擎的核心区间',
    weeklyPercent: '45-55%',
    examples: ['长距离慢跑(LSD)', '轻松跑', '基础有氧跑'],
  },
  {
    zone: 'ZONE 3',
    label: '节奏',
    hr: '146-160',
    pace: '4:40 - 5:10 /km',
    accentColor: 'border-l-status-warning' as const,
    description: '节奏跑区间，提升乳酸耐受和比赛配速感',
    weeklyPercent: '10-15%',
    examples: ['节奏跑(Tempo)', '马拉松配速跑', '巡航间歇'],
  },
  {
    zone: 'ZONE 4',
    label: '乳酸阈',
    hr: '161-175',
    pace: '4:10 - 4:30 /km',
    accentColor: 'border-l-tertiary-container' as const,
    description: '乳酸阈值区间，提高身体清除乳酸的能力',
    weeklyPercent: '5-10%',
    examples: ['阈值跑(CRIT)', '亚阈值间歇', ' hill repeats'],
  },
  {
    zone: 'ZONE 5',
    label: '最大摄氧',
    hr: '176+',
    pace: '< 4:00 /km',
    accentColor: 'border-l-status-danger' as const,
    description: '最大摄氧量区间，提升 VO2max 和神经肌肉效率',
    weeklyPercent: '3-5%',
    examples: ['VO2max 间歇', '速度训练', '冲刺跑'],
  },
]

// PB table distances
const pbDistances = [
  { key: '5K', label: '5K' },
  { key: '10K', label: '10K' },
  { key: 'halfMarathon', label: '半马' },
  { key: 'fullMarathon', label: '全马' },
]

// VDOT calculation (Jack Daniels approximation)
function calculateVDOT(distanceKm: number, timeMinutes: number): number {
  const vdot = Math.round((0.8 + 13.8 / (timeMinutes / distanceKm) + 2.92 / distanceKm + 0.03 * distanceKm) * 10) / 10
  return Math.max(30, Math.min(85, vdot))
}

// Derive target pace from goal string
function deriveTargetPace(goal: string): string {
  if (!goal) return '\u2014'
  if (goal.includes('\u5168\u9a6c')) return '~4:15/km'
  if (goal.includes('\u534a\u9a6c')) return '~4:45/km'
  if (goal.includes('10K')) return '~4:30/km'
  if (goal.includes('5K')) return '~4:00/km'
  return '\u2014'
}

// Calculate personalized zones based on age
function getPersonalizedZones(age: number) {
  const maxHR = 220 - age
  return [
    { ...genericZones[0], hr: `${Math.round(maxHR * 0.50)}-${Math.round(maxHR * 0.59)}` },
    { ...genericZones[1], hr: `${Math.round(maxHR * 0.60)}-${Math.round(maxHR * 0.66)}` },
    { ...genericZones[2], hr: `${Math.round(maxHR * 0.67)}-${Math.round(maxHR * 0.73)}` },
    { ...genericZones[3], hr: `${Math.round(maxHR * 0.74)}-${Math.round(maxHR * 0.80)}` },
    { ...genericZones[4], hr: `${Math.round(maxHR * 0.81)}+` },
  ]
}

export default function Profile() {
  const { profile, updateProfile, trainingRecords, hasTrainingData } = useAppContext()

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
    const isMarathon = distanceKey === 'fullMarathon'
    const pattern = isMarathon ? /^\d+:\d{2}:\d{2}$/ : /^\d{1,2}:\d{2}$/
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

  // Get personalized zones or generic ones
  const zones = profile.age != null ? getPersonalizedZones(profile.age) : genericZones

  // ---- Handlers ----

  const startEdit = () => {
    setEditName(profile.name)
    setEditAge(profile.age ?? '')
    setEditGender(profile.gender ?? '男')
    setEditHeight(profile.height ?? '')
    setEditWeight(profile.weight ?? '')
    setEditRunningYears(profile.runningYears ?? '')
    setEditGoal(profile.goal)
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

  const applyNewVDOT = () => {
    if (calculatedVdot) {
      updateProfile({ vdot: calculatedVdot, vo2max: Math.round(calculatedVdot * 1.03 * 10) / 10 })
      setShowVdotModal(false)
      setCalculatedVdot(null)
      setRaceTime('')
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

    const totalDistance = trainingRecords.reduce((sum, r) => sum + r.distance, 0).toFixed(1)
    const maxDistance = Math.max(...trainingRecords.map((r) => r.distance)).toFixed(1)
    const avgCalories = Math.round(trainingRecords.reduce((sum, r) => sum + r.calories, 0) / trainingRecords.length)

    // Average pace calc
    const pacesWithValues = trainingRecords
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
      { label: '总距离', value: `${totalDistance} km`, percent: Math.min(85, Math.round(totalDistance / 10)), fillClass: 'bg-primary-container' },
      { label: '训练次数', value: `${trainingRecords.length} 次`, percent: Math.min(90, trainingRecords.length * 5), fillClass: 'bg-[#D97706]' },
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
      {/* Page Header */}
      <h2 className="font-headline-xl text-headline-xl-mobile md:text-headline-xl text-text-primary mb-8">
        个人档案
      </h2>

      <div className="grid grid-cols-12 gap-gutter">

        {/* ===== SECTION 1: Personal Info Card ===== */}
        <div className="col-span-12 lg:col-span-8 p-stack-lg data-card relative">
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
                <div>
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
        <div className="col-span-12 lg:col-span-4 p-stack-lg flex flex-col data-card relative">
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
                  {calculatedVdot !== null && (
                    <div className="bg-primary-container/10 rounded-lg p-3">
                      <p className="text-sm text-secondary">计算结果</p>
                      <p className="font-headline-xl text-[28px] font-bold text-primary-container">
                        VDOT {calculatedVdot}
                      </p>
                      <p className="text-xs text-secondary mt-1">
                        VO2max 约 {(calculatedVdot * 1.03).toFixed(1)} ml/kg/min
                      </p>
                    </div>
                  )}
                </div>
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
                  ) : (
                    <button
                      onClick={handleCalculateVDOT}
                      className="flex-1 px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      计算
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ===== SECTION 3: Training Zones (always visible, contextual) ===== */}
        <div className="col-span-12 p-stack-lg data-card relative" ref={zoneTooltipRef}>
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
                        className="data-font text-[15px] bg-surface-bright border-2 border-primary rounded px-2 py-0.5 w-24 focus:outline-none focus:ring-2 focus:ring-primary/30"
                        placeholder={dist.key === 'fullMarathon' ? 'H:MM:SS' : 'MM:SS'}
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
                    {deriveTargetPace(profile.goal)}
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
