import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import type { TimeSeriesPoint } from '../../context/AppContext'

interface Props {
  data: TimeSeriesPoint[]
  avgPaceSec?: number
}

/**
 * 格式化秒数为 m:ss（配速格式）
 */
function fmtPace(sec: number): string {
  if (sec <= 0 || !isFinite(sec)) return '--:--'
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${m}'${s.toString().padStart(2, '0')}"`
}

export default function PaceChart({ data, avgPaceSec }: Props) {
  // 过滤有配速的数据点
  const filtered = data.filter(d => (d.pace ?? 0) > 0 && (d.pace ?? 0) < 600)
  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-secondary">
        <span className="material-symbols-outlined text-[36px] mb-2">speed</span>
        <p className="font-body-xs">暂无配速数据</p>
      </div>
    )
  }

  const computedAvg = avgPaceSec ?? filtered.reduce((sum, d) => sum + (d.pace ?? 0), 0) / filtered.length

  const paces = filtered.map(d => d.pace as number)
  const yMin = Math.max(180, Math.floor(Math.min(...paces) / 10) * 10 - 20)
  const yMax = Math.ceil(Math.max(...paces) / 10) * 10 + 20

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px] text-primary">speed</span>
        <h4 className="font-body-sm font-semibold text-text-primary">配速波动</h4>
        <span className="text-xs text-secondary ml-auto">
          avg {fmtPace(computedAvg)} /km
        </span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={filtered} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="distance"
            tickFormatter={(v: number) => v.toFixed(1)}
            tick={{ fontSize: 10, fill: 'var(--md-sys-color-on-surface-variant)' }}
            axisLine={false}
            tickLine={false}
            label={{ value: 'km', position: 'insideBottomRight', fontSize: 10, fill: 'var(--md-sys-color-on-surface-variant)' }}
          />
          <YAxis
            domain={[yMax, yMin]} // 反转 Y 轴：快的配速在上面
            tickFormatter={fmtPace}
            tick={{ fontSize: 10, fill: 'var(--md-sys-color-on-surface-variant)' }}
            axisLine={false}
            tickLine={false}
            width={45}
          />
          <ReferenceLine
            y={computedAvg}
            stroke="var(--md-sys-color-primary)"
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
            formatter={(value: any) => [fmtPace(value), '配速']}
            labelFormatter={(label: any) => `距离: ${Number(label).toFixed(2)} km`}
          />
          <Line
            type="monotone"
            dataKey="pace"
            stroke="#3b82f6"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
