/**
 * 探查高驰 FIT 文件真实数据结构
 * Usage: node scripts/inspect-fit.mjs <fitfile>
 */
import { readFileSync } from 'fs'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)

const FitParser = require('fit-file-parser').default || require('fit-file-parser')

const filePath = process.argv[2]
if (!filePath) {
  console.error('Usage: node inspect-fit.mjs <path-to-fit-file>')
  process.exit(1)
}

const buffer = readFileSync(filePath)
console.log('File size:', buffer.length, 'bytes')

// ---- cascade mode ----
const parser = new FitParser({
  force: true,
  speedUnit: 'km/h',
  lengthUnit: 'km',
  temperatureUnit: 'celsius',
  mode: 'cascade',
})

parser.parse(buffer, (error, data) => {
  if (error) {
    console.error('Parse error (cascade):', error)
  } else {
    console.log('\n=== CASCADE MODE ===')
    console.log('Top-level keys:', Object.keys(data || {}))
    
    // 打印 activity 结构
    if (data.activity) {
      console.log('\ndata.activity keys:', Object.keys(data.activity))
      if (data.activity.sessions) {
        console.log('sessions count:', data.activity.sessions.length)
        data.activity.sessions.forEach((s, i) => {
          console.log(`\n--- session[${i}] ---`)
          console.log('  keys:', Object.keys(s))
          console.log('  sport:', s.sport)
          console.log('  start_time:', s.start_time)
          console.log('  total_elapsed_time:', s.total_elapsed_time)
          console.log('  total_timer_time:', s.total_timer_time)
          console.log('  total_distance:', s.total_distance)
          console.log('  avg_speed:', s.avg_speed)
          console.log('  avg_heart_rate:', s.avg_heart_rate)
          console.log('  max_heart_rate:', s.max_heart_rate)
          console.log('  total_calories:', s.total_calories)
          if (s.laps) {
            console.log('  laps count:', s.laps.length)
            if (s.laps.length > 0) {
              console.log('  lap[0] keys:', Object.keys(s.laps[0]))
              console.log('  lap[0] total_distance:', s.laps[0].total_distance)
              console.log('  lap[0] total_elapsed_time:', s.laps[0].total_elapsed_time)
            }
          }
        })
      } else {
        console.log('No sessions in activity')
        console.log('activity:', JSON.stringify(data.activity, null, 2).slice(0, 1000))
      }
    } else {
      console.log('No data.activity')
      // 打印所有顶级结构
      for (const key of Object.keys(data || {})) {
        console.log(`\ndata.${key}:`, JSON.stringify(data[key]).slice(0, 300))
      }
    }
  }
})

// ---- list mode ----
const parserList = new FitParser({
  force: true,
  speedUnit: 'km/h',
  lengthUnit: 'km',
  temperatureUnit: 'celsius',
  mode: 'list',
})

parserList.parse(buffer, (error, data) => {
  if (error) {
    console.error('Parse error (list):', error)
    return
  }
  console.log('\n=== LIST MODE ===')
  console.log('Top-level keys:', Object.keys(data || {}))
  if (data.records) {
    console.log('records count:', data.records.length)
    // 找出所有独特的 message 类型
    const msgTypes = [...new Set(data.records.map(r => r.message ?? r.type ?? 'unknown'))]
    console.log('message types:', msgTypes)
    
    // 打印 session 类型
    const sessions = data.records.filter(r => (r.message ?? r.type) === 'session')
    if (sessions.length > 0) {
      console.log('\nsession[0]:', JSON.stringify(sessions[0], null, 2).slice(0, 1500))
    }
    
    // 打印 record 类型（GPS/HR 数据点）
    const records = data.records.filter(r => (r.message ?? r.type) === 'record')
    if (records.length > 0) {
      console.log('\nrecord[0]:', JSON.stringify(records[0], null, 2).slice(0, 800))
      console.log('records total:', records.length)
    }
  } else {
    console.log('No data.records in list mode')
    console.log('Full data:', JSON.stringify(data).slice(0, 2000))
  }
})
