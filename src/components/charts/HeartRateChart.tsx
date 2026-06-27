import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceArea,
  ResponsiveContainer,
} from 'recharts'
import type { TimeSeriesPoint } from '../../context/AppContext'

interface Props {
  data: TimeSeriesPoint[]
  minHr?: number
  maxHr?: number
}

/**
 * 格式化秒数为 mm:ss
 */
function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

/**
 * 心率区间背景色带（基于 Karvonen 公式通用范围）
 * 这里使用绝对心率范围，近似标注 Z1-Z5
 */
const HR_ZONES = [
  { min: 50, max: 130, color: '#10b98115', label: 'Z1' },  // 恢复
  { min: 130, max: 150, color: '#3b82f615', label: 'Z2' },  // 有氧
  { min: 150, max: 165, color: '#f59e0b15', label: 'Z3' },  // 马拉松
  { min: 165, max: 178, color: '#f9731615', label: 'Z4' },  // 乳酸阈
  { min: 178, max: 220, color: '#ef444415', label: 'Z5' },  // VO2max
]

export default function HeartRateChart({ data, minHr, maxHr }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-secondary">
        <span className="material-symbols-outlined text-[36px] mb-2">favorite</span>
        <p className="font-body-xs">暂无心率数据</p>
      </div>
    )
  }

  // 动态计算 Y 轴范围
  const hrValues = data.map(d => d.heartRate ?? d.hr ?? 0).filter(v => v > 0)
  const yMin = Math.max(50, Math.floor((minHr ?? Math.min(...hrValues)) / 5) * 5 - 10)
  const yMax = Math.min(220, Math.ceil((maxHr ?? Math.max(...hrValues)) / 5) * 5 + 10)

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px] text-status-danger">favorite</span>
        <h4 className="font-body-sm font-semibold text-text-primary">心率波动</h4>
        {minHr && maxHr && (
          <span className="text-xs text-secondary ml-auto">
            {minHr} ~ {maxHr} bpm
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="time"
            tickFormatter={fmtTime}
            tick={{ fontSize: 10, fill: 'var(--md-sys-color-on-surface-variant)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[yMin, yMax]}
            tick={{ fontSize: 10, fill: 'var(--md-sys-color-on-surface-variant)' }}
            axisLine={false}
            tickLine={false}
            width={35}
          />
          {/* 心率区间背景色带 */}
          {HR_ZONES.map(z => {
            if (z.max <= yMin || z.min >= yMax) return null
            return (
              <ReferenceArea
                key={z.label}
                y1={Math.max(z.min, yMin)}
                y2={Math.min(z.max, yMax)}
                fill={z.color}
              />
            )
          })}
          <Tooltip
            contentStyle={{
              background: 'var(--md-sys-color-surface-container)',
              border: '1px solid var(--md-sys-color-outline-variant)',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value: any) => [`${value} bpm`, '心率']}
            labelFormatter={(label: any) => `时间: ${fmtTime(label)}`}
          />
          <Line
            type="monotone"
            dataKey="heartRate"
            stroke="#ef4444"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
