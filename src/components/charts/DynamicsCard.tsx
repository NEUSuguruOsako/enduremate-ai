import type { RunningDynamics } from '../../context/AppContext'

interface Props {
  dynamics: RunningDynamics
}

interface MetricItem {
  icon: string
  label: string
  value: string
  unit: string
  ideal: string
  color: string
}

export default function DynamicsCard({ dynamics }: Props) {
  const metrics: MetricItem[] = []

  // 步频 (兼容 cadence 和 avgCadence)
  const cadenceVal = dynamics.avgCadence ?? dynamics.cadence ?? 0
  if (cadenceVal > 0) {
    metrics.push({
      icon: 'directions_run',
      label: '平均步频',
      value: `${cadenceVal}`,
      unit: 'spm',
      ideal: '精英: 180+',
      color: cadenceVal >= 180 ? 'text-status-success' : 'text-text-primary',
    })
  }

  // 步幅 (兼容 avgStepLength 和 strideLength)
  const stepLenVal = dynamics.avgStepLength ?? dynamics.strideLength ?? 0
  if (stepLenVal > 0) {
    const stepM = (stepLenVal / 1000).toFixed(2)
    metrics.push({
      icon: 'straighten',
      label: '平均步幅',
      value: stepM,
      unit: 'm',
      ideal: '精英: 1.4m+',
      color: 'text-text-primary',
    })
  }

  // 垂直振幅
  const voVal = dynamics.avgVerticalOscillation ?? dynamics.verticalOscillation ?? 0
  if (voVal > 0) {
    metrics.push({
      icon: 'height',
      label: '垂直振幅',
      value: `${voVal.toFixed(1)}`,
      unit: 'mm',
      ideal: '理想: <80mm',
      color: voVal < 80 ? 'text-status-success' : 'text-status-warning',
    })
  }

  // 垂直步幅比
  const vrVal = dynamics.avgVerticalRatio ?? dynamics.verticalRatio ?? 0
  if (vrVal > 0) {
    metrics.push({
      icon: 'call_split',
      label: '垂直步幅比',
      value: `${vrVal.toFixed(1)}`,
      unit: '%',
      ideal: '理想: <7%',
      color: vrVal < 7 ? 'text-status-success' : 'text-status-warning',
    })
  }

  // 触地时间
  const stVal = dynamics.avgStanceTime ?? dynamics.groundContactTime ?? 0
  if (stVal > 0) {
    metrics.push({
      icon: 'timer',
      label: '触地时间',
      value: `${Math.round(stVal)}`,
      unit: 'ms',
      ideal: '精英: <200ms',
      color: stVal < 220 ? 'text-status-success' : 'text-text-primary',
    })
  }

  // 平均功率
  const apVal = dynamics.avgPower ?? dynamics.power ?? 0
  if (apVal > 0) {
    metrics.push({
      icon: 'bolt',
      label: '平均功率',
      value: `${Math.round(apVal)}`,
      unit: 'W',
      ideal: '',
      color: 'text-primary',
    })
  }

  // 最大功率
  const mpVal = dynamics.maxPower ?? 0
  if (mpVal > 0) {
    metrics.push({
      icon: 'whatshot',
      label: '最大功率',
      value: `${Math.round(mpVal)}`,
      unit: 'W',
      ideal: '',
      color: 'text-status-danger',
    })
  }

  // 爬升
  const ascentVal = dynamics.totalAscent ?? 0
  const descentVal = dynamics.totalDescent ?? 0
  if (ascentVal > 0 || descentVal > 0) {
    metrics.push({
      icon: 'trending_up',
      label: '累计爬升',
      value: `${Math.round(ascentVal)}`,
      unit: 'm',
      ideal: '',
      color: 'text-status-warning',
    })
    metrics.push({
      icon: 'trending_down',
      label: '累计下降',
      value: `${Math.round(descentVal)}`,
      unit: 'm',
      ideal: '',
      color: 'text-tertiary',
    })
  }

  // 温度
  const tempVal = dynamics.avgTemperature ?? 0
  if (tempVal > 0) {
    metrics.push({
      icon: 'thermostat',
      label: '气温',
      value: `${tempVal.toFixed(0)}`,
      unit: '°C',
      ideal: '',
      color: 'text-text-primary',
    })
  }

  if (metrics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-secondary">
        <span className="material-symbols-outlined text-[36px] mb-2">monitor_heart</span>
        <p className="font-body-xs">暂无跑步动态数据</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px] text-primary">monitor_heart</span>
        <h4 className="font-body-sm font-semibold text-text-primary">跑步动态</h4>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="bg-surface-container-low rounded-xl p-3 flex flex-col gap-1"
          >
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-secondary">{m.icon}</span>
              <span className="font-body-xs text-secondary">{m.label}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`data-font text-[20px] font-bold ${m.color}`}>
                {m.value}
              </span>
              <span className="text-[12px] text-secondary">{m.unit}</span>
            </div>
            {m.ideal && (
              <span className="text-[10px] text-outline-variant">{m.ideal}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
