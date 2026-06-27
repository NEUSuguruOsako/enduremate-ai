import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import type { TimeSeriesPoint } from '../../context/AppContext'

interface Props {
  data: TimeSeriesPoint[]
}

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function CadenceChart({ data }: Props) {
  const filtered = data.filter(d => (d.cadence ?? 0) > 0)
  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-secondary">
        <span className="material-symbols-outlined text-[36px] mb-2">directions_run</span>
        <p className="font-body-xs">暂无步频数据</p>
      </div>
    )
  }

  const avg = Math.round(filtered.reduce((sum, d) => sum + (d.cadence ?? 0), 0) / filtered.length)
  const values = filtered.map(d => d.cadence as number)
  const yMin = Math.max(60, Math.floor(Math.min(...values) / 5) * 5 - 10)
  const yMax = Math.min(220, Math.ceil(Math.max(...values) / 5) * 5 + 10)

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px] text-tertiary">directions_run</span>
        <h4 className="font-body-sm font-semibold text-text-primary">步频</h4>
        <span className="text-xs text-secondary ml-auto">
          avg {avg} spm
        </span>
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={filtered} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
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
          <ReferenceLine
            y={avg}
            stroke="var(--md-sys-color-tertiary)"
            strokeDasharray="4 4"
            strokeWidth={1}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--md-sys-color-surface-container)',
              border: '1px solid var(--md-sys-color-outline-variant)',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value: any) => [`${value} spm`, '步频']}
            labelFormatter={(label: any) => `时间: ${fmtTime(label)}`}
          />
          <Line
            type="monotone"
            dataKey="cadence"
            stroke="#06b6d4"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
