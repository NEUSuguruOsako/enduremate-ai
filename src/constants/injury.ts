/**
 * 伤病相关共享常量
 */

export interface InjuryPartOption {
  value: string
  label: string
}

/** 标准伤病部位列表 — 单一数据源 */
export const INJURY_BODY_PARTS: InjuryPartOption[] = [
  { value: '膝盖', label: '膝盖' },
  { value: '小腿', label: '小腿' },
  { value: '足底', label: '足底' },
  { value: '跟腱', label: '跟腱' },
  { value: '髋部', label: '髋部' },
  { value: '脚踝', label: '脚踝' },
  { value: '臀部', label: '臀部' },
  { value: '腰部', label: '腰部' },
  { value: '其他', label: '其他' },
]

export const INJURY_SEVERITY_OPTIONS = [
  { value: 'mild', label: '轻微不适' },
  { value: 'moderate', label: '中度疼痛' },
  { value: 'severe', label: '严重疼痛' },
] as const

export function getSeverityLabel(severity: string): string {
  const found = INJURY_SEVERITY_OPTIONS.find((s) => s.value === severity)
  return found?.label ?? severity
}
