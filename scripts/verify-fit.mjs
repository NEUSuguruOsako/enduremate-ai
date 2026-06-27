/**
 * 验证修复后的解析逻辑
 */
import { readFileSync } from 'fs'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const FitParser = require('fit-file-parser').default || require('fit-file-parser')

function formatDuration(totalSecondsFloat) {
  const totalSec = Math.round(totalSecondsFloat) // 关键：先取整
  const hours = Math.floor(totalSec / 3600)
  const mins = Math.floor((totalSec % 3600) / 60)
  const secs = totalSec % 60
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const files = [
  'C:/Users/王彪/Desktop/运动数据/474459168428819133.fit',
  'C:/Users/王彪/Desktop/运动数据/474593521448288458.fit',
  'C:/Users/王彪/Desktop/运动数据/474593521448288459.fit',
]

for (const filePath of files) {
  const buffer = readFileSync(filePath)
  const parser = new FitParser({ force: true, speedUnit: 'km/h', lengthUnit: 'km', mode: 'cascade' })
  
  parser.parse(buffer, (err, data) => {
    if (err) { console.error(filePath, 'ERROR:', err); return }
    
    const fileName = filePath.split('/').pop()
    console.log(`\n${'='.repeat(60)}`)
    console.log(`FILE: ${fileName}`)
    console.log('='.repeat(60))
    
    const sessions = data.activity?.sessions ?? []
    sessions.forEach((s, idx) => {
      const sport = (s.sport ?? 'running').toLowerCase()
      const subSport = (s.sub_sport ?? '').toLowerCase()
      
      // 时间（使用 timer_time，去掉暂停）
      const rawSeconds = (s.total_timer_time > 0 ? s.total_timer_time : s.total_elapsed_time) || 0
      
      // 距离
      let distKm = undefined
      if (typeof s.total_distance === 'number') {
        distKm = s.total_distance > 500 ? s.total_distance / 1000 : s.total_distance
      }
      
      // 心率
      const avgHr = s.avg_heart_rate ?? 0
      const maxHr = s.max_heart_rate ?? 0
      
      // 日期（fit-file-parser 已转换好格式）
      const dateStr = s.start_time ? new Date(s.start_time).toISOString().split('T')[0] : '??'
      
      // 配速（仅跑步）
      let avgPace = '-'
      if (sport === 'running' && distKm > 0 && rawSeconds > 0) {
        const paceSecPerKm = rawSeconds / distKm
        if (paceSecPerKm >= 150 && paceSecPerKm <= 900) {
          const paceMin = Math.floor(paceSecPerKm / 60)
          const paceSec = Math.round(paceSecPerKm % 60)
          avgPace = `${paceMin}:${paceSec.toString().padStart(2, '0')}`
        }
      }
      
      // 时长
      const duration = formatDuration(rawSeconds)
      
      // 热量
      const calories = s.total_calories ?? (distKm > 0 ? Math.round(distKm * 65) : Math.round(rawSeconds / 60 * 6))
      
      // 类型判断
      let type = '轻松跑'
      if (sport === 'cycling') type = '骑行'
      else if (subSport.includes('strength') || sport === 'training') type = '力量训练'
      else if (sport === 'running') {
        if (avgHr > 168) type = '间歇跑'
        else if (avgHr > 158) type = '乳酸阈值跑'
        else if ((distKm ?? 0) > 16) type = '长距离跑'
        else if (avgHr > 148) type = '节奏跑'
        else type = '轻松跑'
      }
      
      console.log(`session[${idx}]:`)
      console.log(`  日期: ${dateStr}`)
      console.log(`  类型: ${type} (sport=${sport}, sub=${subSport})`)
      console.log(`  距离: ${distKm !== undefined ? distKm.toFixed(2) + ' km' : 'N/A'}`)
      console.log(`  时长: ${duration}  (raw=${rawSeconds}s)`)
      console.log(`  配速: ${avgPace} /km`)
      console.log(`  心率: avg=${avgHr} max=${maxHr}`)
      console.log(`  热量: ${calories} kcal`)
    })
  })
}
