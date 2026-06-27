import { useState } from 'react'
import type { InjuryBodyPart } from '../context/AppContext'

interface InjuryFeedbackProps {
  currentParts: InjuryBodyPart[]
  currentDescription: string
  currentSeverity: '轻微' | '中等' | '严重' | undefined
  onSave: (parts: InjuryBodyPart[], description: string, severity: '轻微' | '中等' | '严重') => void
}

const BODY_PARTS_CONFIG: { part: InjuryBodyPart; icon: string; label: string }[] = [
  { part: '膝盖', icon: 'front_knee', label: '膝盖' },
  { part: '小腿', icon: 'humidity_mid', label: '小腿' },
  { part: '足底', icon: 'do_not_step', label: '足底' },
  { part: '跟腱', icon: 'material_properties', label: '跟腱' },
  { part: '髋部', icon: 'airline_seat_recline_extra', label: '髋部' },
  { part: '脚踝', icon: 'undo', label: '脚踝' },
  { part: '臀部', icon: 'chair', label: '臀部' },
  { part: '腰部', icon: 'back_hand', label: '腰部' },
  { part: '其他', icon: 'more_horiz', label: '其他' },
]

const SEVERITY_OPTIONS: { value: '轻微' | '中等' | '严重'; label: string; color: string }[] = [
  { value: '轻微', label: '轻微', color: 'text-status-success' },
  { value: '中等', label: '中等', color: 'text-status-warning' },
  { value: '严重', label: '严重', color: 'text-status-danger' },
]

export default function InjuryFeedback({ currentParts, currentDescription, currentSeverity, onSave }: InjuryFeedbackProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedParts, setSelectedParts] = useState<InjuryBodyPart[]>(currentParts || [])
  const [description, setDescription] = useState(currentDescription || '')
  const [severity, setSeverity] = useState<'轻微' | '中等' | '严重'>(currentSeverity || '轻微')

  const hasInjury = currentParts && currentParts.length > 0

  const handleTogglePart = (part: InjuryBodyPart) => {
    setSelectedParts((prev) =>
      prev.includes(part) ? prev.filter((p) => p !== part) : [...prev, part],
    )
  }

  const handleSave = () => {
    onSave(selectedParts, description, severity)
    setIsOpen(false)
  }

  const handleClear = () => {
    setSelectedParts([])
    setDescription('')
    setSeverity('轻微')
    onSave([], '', '轻微')
    setIsOpen(false)
  }

  if (!isOpen) {
    return (
      <div className="border-t border-border-subtle pt-5">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors cursor-pointer border-none text-left ${
            hasInjury
              ? 'bg-error-container/10 hover:bg-error-container/20'
              : 'bg-surface-container-low hover:bg-surface-container'
          }`}
        >
          <span
            className={`material-symbols-outlined text-[20px] ${
              hasInjury ? 'text-status-warning' : 'text-secondary'
            }`}
          >
            {hasInjury ? 'healing' : 'health_and_safety'}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-body-sm font-medium text-text-primary">
              {hasInjury ? '身体不适反馈（已记录）' : '记录身体不适'}
            </p>
            {hasInjury && (
              <p className="font-body-xs text-secondary mt-0.5">
                {currentParts?.join('、')}{currentSeverity ? ` · ${currentSeverity}` : ''}
              </p>
            )}
          </div>
          <span
            className={`material-symbols-outlined text-[18px] ${
              hasInjury ? 'text-status-warning' : 'text-outline-variant'
            }`}
          >
            {hasInjury ? 'edit' : 'add_circle'}
          </span>
        </button>
      </div>
    )
  }

  return (
    <div className="border-t border-border-subtle pt-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-status-warning">health_and_safety</span>
          <h4 className="font-body-md font-semibold text-text-primary">身体不适反馈</h4>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container transition-colors cursor-pointer border-none bg-transparent"
        >
          <span className="material-symbols-outlined text-[18px] text-secondary">close</span>
        </button>
      </div>

      {/* 严重程度选择 */}
      <div className="mb-4">
        <p className="font-body-xs text-secondary mb-2">不适程度</p>
        <div className="flex gap-2">
          {SEVERITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSeverity(opt.value)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer border ${
                severity === opt.value
                  ? `${opt.color} bg-surface-container-high border-primary/30`
                  : 'text-secondary bg-surface-container-low border-border-subtle hover:bg-surface-container'
              }`}
            >
              <span
                className="material-symbols-outlined text-[14px] mr-1 align-middle"
              >
                {opt.value === '轻微' ? 'sentiment_satisfied' : opt.value === '中等' ? 'sentiment_neutral' : 'sentiment_dissatisfied'}
              </span>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 不适部位选择 */}
      <div className="mb-4">
        <p className="font-body-xs text-secondary mb-2">不适部位（可多选）</p>
        <div className="grid grid-cols-3 gap-2">
          {BODY_PARTS_CONFIG.map((item) => (
            <button
              key={item.part}
              type="button"
              onClick={() => handleTogglePart(item.part)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                selectedParts.includes(item.part)
                  ? 'bg-status-warning/15 text-status-warning border-status-warning/30'
                  : 'bg-surface-container-low text-secondary border-border-subtle hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
              {item.label}
              {selectedParts.includes(item.part) && (
                <span className="material-symbols-outlined text-[14px] ml-auto">check</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 详细描述 */}
      <div className="mb-4">
        <p className="font-body-xs text-secondary mb-2">详细描述（选填）</p>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="描述具体症状、出现时机、疼痛程度等..."
          rows={2}
          className="w-full rounded-lg px-3 py-2.5 text-sm border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-surface-container-low placeholder:text-secondary resize-none"
        />
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleClear}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-surface-container border border-border-subtle text-secondary hover:bg-surface-container-high transition-colors cursor-pointer"
        >
          清除记录
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={selectedParts.length === 0}
          className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-on-primary hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer border-none"
        >
          {hasInjury ? '更新反馈' : '保存反馈'}
        </button>
      </div>
    </div>
  )
}
