/**
 * 训练类型共享常量
 * 单一数据源 — 所有组件从此处导入
 */

export const TYPE_LABEL_MAP: Record<string, string> = {
  rest: '休息日',
  easy: '轻松跑',
  tempo: '节奏跑',
  interval: '间歇跑',
  lsd: '长距离',
  strength: '力量训练',
  progression: '渐进跑',
  fartlek: '法特莱克',
  hill: '坡道跑',
  recovery: '恢复跑',
}

export const TYPE_BADGE_MAP: Record<string, { text: string; bg: string; textColor: string }> = {
  easy: { text: '轻松', bg: 'bg-primary-fixed', textColor: 'text-on-primary-fixed' },
  tempo: { text: '乳酸阈值', bg: 'bg-error-container', textColor: 'text-on-error-container' },
  interval: { text: '间歇', bg: 'bg-status-danger/20', textColor: 'text-status-danger' },
  lsd: { text: '耐力', bg: 'bg-tertiary-container', textColor: 'text-on-tertiary-container' },
  strength: { text: '力量', bg: 'bg-surface-variant', textColor: 'text-on-surface-variant' },
  progression: { text: '渐进', bg: 'bg-primary-fixed', textColor: 'text-on-primary-fixed' },
  fartlek: { text: '变速', bg: 'bg-tertiary-container', textColor: 'text-on-tertiary-container' },
  hill: { text: '坡道', bg: 'bg-error-container', textColor: 'text-on-error-container' },
  recovery: { text: '恢复', bg: 'bg-primary-fixed', textColor: 'text-on-primary-fixed' },
  rest: { text: '休息', bg: 'bg-surface-variant', textColor: 'text-on-surface-variant' },
}

export const TYPE_BORDER_COLOR_MAP: Record<string, string> = {
  rest: 'bg-surface-variant',
  easy: 'bg-primary',
  tempo: 'bg-[#EF4444]',
  interval: 'bg-[#EF4444]',
  lsd: 'bg-[#F59E0B]',
  strength: 'bg-surface-variant',
  progression: 'bg-primary',
  fartlek: 'bg-[#F59E0B]',
  hill: 'bg-[#EF4444]',
  recovery: 'bg-primary',
}

export const ZONE_COLOR_MAP: Record<string, string> = {
  Z1: '#4CAF50',
  Z2: '#8BC34A', 
  Z3: '#FFC107',
  Z4: '#FF9800',
  Z5: '#F44336',
}
