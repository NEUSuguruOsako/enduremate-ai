import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { TimeSeriesPoint } from '../../context/AppContext'

interface Props {
  data: TimeSeriesPoint[]
}

export default function ElevationChart({ data }: Props) {
  const filtered = data.filter(d => d.altitude !== 0 && d.altitude !== undefined)
  if (filtered.length < 5) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-secondary">
        <span className="material-symbols-outlined text-[36px] mb-2">terrain</span>
        <p className="font-body-xs">暂无海拔数据</p>
      </div>
    )
  }

  const values = filtered.map(d => d.altitude as number)
  const yMin = Math.floor(Math.min(...values) / 5) * 5 - 5
  const yMax = Math.ceil(Math.max(...values) / 5) * 5 + 5

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px] text-outline">terrain</span>
        <h4 className="font-body-sm font-semibold text-text-primary">海拔剖面</h4>
        <span className="text-xs text-secondary ml-auto">
          {yMin}m ~ {yMax}m
        </span>
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={filtered} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
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
            domain={[yMin, yMax]}
            tick={{ fontSize: 10, fill: 'var(--md-sys-color-on-surface-variant)' }}
            axisLine={false}
            tickLine={false}
            width={35}
            unit="m"
          />
          <Tooltip
            contentStyle={{
              background: 'var(--md-sys-color-surface-container)',
              border: '1px solid var(--md-sys-color-outline-variant)',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value: any) => [`${Number(value).toFixed(1)} m`, '海拔']}
            labelFormatter={(label: any) => `距离: ${Number(label).toFixed(2)} km`}
          />
          <defs>
            <linearGradient id="elevGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="altitude"
            stroke="#8b5cf6"
            strokeWidth={1.5}
            fill="url(#elevGradient)"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
