import type {
  TrainingRecord,
  TimeSeriesPoint,
  LapData,
  RunningDynamics,
} from '../context/AppContext'

/**
 * 真实文件解析服务
 * 支持 FIT、GPX、TCX 三种运动数据格式
 */

export interface ParseResult {
  success: boolean
  records: TrainingRecord[]
  error?: string
}

/**
 * 解析 FIT 文件（二进制格式）
 * 
 * fit-file-parser 默认 cascade 模式，数据结构为：
 * data.activity.sessions[] → 每个 session 包含：
 *   - start_time, total_distance, total_elapsed_time
 *   - avg_heart_rate, max_heart_rate
 *   - avg_speed, sport
 *   - laps[] → 每个 lap 包含同样字段
 */
export async function parseFitFile(file: File): Promise<ParseResult> {
  try {
    // 动态导入 fit-file-parser
    const FitParser = (await import('fit-file-parser')).default

    const arrayBuffer = await file.arrayBuffer()
    
    // 使用 Uint8Array 转换（兼容浏览器环境）
    const uint8Array = new Uint8Array(arrayBuffer)

    const parser = new FitParser({
      force: true,
      speedUnit: 'km/h',
      lengthUnit: 'km',
      temperatureUnit: 'celsius',
      mode: 'cascade', // 默认 cascade 模式：session > laps > records
    })

    return new Promise((resolve) => {
      parser.parse(uint8Array as unknown as Parameters<typeof parser.parse>[0], (error: string | undefined, data: any) => {
        if (error) {
          console.error('FIT 文件解析错误:', String(error))
          resolve({
            success: false,
            records: [],
            error: `解析 FIT 文件失败: ${error}`,
          })
          return
        }

        try {
          if (import.meta.env.DEV) console.log('[FIT] 解析成功，原始结构键:', Object.keys(data || {}))
          const records = extractRecordsFromFit(data, file.name)
          const cleanedRecords = cleanTrainingRecords(records)
          if (cleanedRecords.length === 0) {
            resolve({
              success: false,
              records: [],
              error: 'FIT 文件中未找到有效训练数据，请确认文件包含跑步/运动数据',
            })
          } else {
            resolve({ success: true, records: cleanedRecords })
          }
        } catch (parseError) {
          console.error('提取训练记录失败:', parseError)
          resolve({
            success: false,
            records: [],
            error: `提取训练记录失败: ${(parseError as Error).message}`,
          })
        }
      })
    })
  } catch (error) {
    console.error('加载 FIT 解析器失败:', error)
    return {
      success: false,
      records: [],
      error: `加载 FIT 解析器失败: ${(error as Error).message}`,
    }
  }
}

/**
 * 解析 GPX 文件（XML 格式）
 */
export async function parseGpxFile(file: File): Promise<ParseResult> {
  try {
    const { parseStringPromise } = await import('xml2js')
    const text = await file.text()
    const data = await parseStringPromise(text)

    const records = extractRecordsFromGpx(data)
    return { success: true, records: cleanTrainingRecords(records) }
  } catch (error) {
    return {
      success: false,
      records: [],
      error: `解析 GPX 文件失败: ${(error as Error).message}`,
    }
  }
}

/**
 * 解析 TCX 文件（XML 格式）
 */
export async function parseTcxFile(file: File): Promise<ParseResult> {
  try {
    const { parseStringPromise } = await import('xml2js')
    const text = await file.text()
    const data = await parseStringPromise(text)

    const records = extractRecordsFromTcx(data)
    return { success: true, records: cleanTrainingRecords(records) }
  } catch (error) {
    return {
      success: false,
      records: [],
      error: `解析 TCX 文件失败: ${(error as Error).message}`,
    }
  }
}

/**
 * 根据文件扩展名自动选择解析器
 */
export async function parseFile(file: File): Promise<ParseResult> {
  const ext = file.name.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'fit':
      return parseFitFile(file)
    case 'gpx':
      return parseGpxFile(file)
    case 'tcx':
      return parseTcxFile(file)
    default:
      return {
        success: false,
        records: [],
        error: `不支持的文件格式: ${ext}`,
      }
  }
}

// ====================
// 逐点数据提取函数
// ====================

/**
 * 从 session.records[] 提取并降采样逐点数据
 * 
 * 高驰 FIT 文件每秒记录一条，约 2000-3000 条记录。
 * 为了图表性能，降采样到最多 250 个数据点。
 * 降采样策略：均匀间隔采样，保留首尾点。
 */
function extractTimeSeries(session: any): TimeSeriesPoint[] {
  let rawRecords: any[] = []

  // 路径1: session.records[]（直接在 session 下）
  if (Array.isArray(session.records) && session.records.length > 0) {
    rawRecords = session.records
  }
  // 路径2: 从 laps[].records[] 收集（部分 Garmin 设备）
  else if (Array.isArray(session.laps) && session.laps.length > 0) {
    session.laps.forEach((lap: any) => {
      if (Array.isArray(lap.records)) {
        rawRecords.push(...lap.records)
      }
    })
  }

  if (rawRecords.length === 0) return []

  // 过滤掉没有时间和心率的无效记录
  const startTime = session.start_time instanceof Date
    ? session.start_time.getTime()
    : typeof session.start_time === 'string'
      ? new Date(session.start_time).getTime()
      : 0

  const validRecords: TimeSeriesPoint[] = []
  let cumDistance = 0

  rawRecords.forEach((rec: any) => {
    const hr = rec.heart_rate ?? 0
    const spd = rec.speed ?? 0           // km/h（已由 speedUnit: 'km/h' 转换）
    const dist = typeof rec.distance === 'number' ? rec.distance : 0  // km

    // 计算时间偏移（秒）
    let timeOffset = 0
    if (rec.timestamp) {
      const recTime = rec.timestamp instanceof Date
        ? rec.timestamp.getTime()
        : typeof rec.timestamp === 'string'
          ? new Date(rec.timestamp).getTime()
          : 0
      timeOffset = Math.round((recTime - startTime) / 1000)
    }

    // 配速 = 3600 / speed (秒/km)
    const pace = spd > 0 ? 3600 / spd : 0

    if (hr > 0 || spd > 0) {
      // 如果 distance 字段为 0，从 speed 累计
      if (dist <= 0 && spd > 0) {
        // 用 speed 估算增量距离
        cumDistance += spd / 3600  // 每秒走的距离 km
      } else if (dist > 0) {
        cumDistance = dist
      }

      validRecords.push({
        time: Math.max(0, timeOffset),
        timeSec: Math.max(0, timeOffset),
        distance: cumDistance,
        heartRate: hr,
        hr,
        pace,
        // FIT 文件中的 cadence 是单腿步频（RPM），需要乘以 2 得到完整步频（SPM）
        cadence: (rec.cadence ?? 0) * 2,
        altitude: rec.altitude ?? 0,
        elevation: rec.altitude ?? 0,
      })
    }
  })

  if (validRecords.length === 0) return []

  // 降采样：如果记录数 > 250，均匀间隔采样
  const MAX_POINTS = 250
  if (validRecords.length <= MAX_POINTS) return validRecords

  const step = (validRecords.length - 1) / (MAX_POINTS - 1)
  const sampled: TimeSeriesPoint[] = []
  for (let i = 0; i < MAX_POINTS - 1; i++) {
    sampled.push(validRecords[Math.round(i * step)])
  }
  sampled.push(validRecords[validRecords.length - 1]) // 始终保留最后一个点

  return sampled
}

/**
 * 从 session.laps[] 提取圈数据
 */
function extractLapData(session: any): LapData[] {
  const laps = session.laps
  if (!Array.isArray(laps) || laps.length === 0) return []

  return laps.map((lap: any, i: number) => {
    const lapDist = typeof lap.total_distance === 'number'
      ? (lap.total_distance > 500 ? lap.total_distance / 1000 : lap.total_distance)
      : 0
    const lapTime = lap.total_timer_time ?? lap.total_elapsed_time ?? 0
    const lapAvgHr = lap.avg_heart_rate ?? lap.average_heart_rate ?? 0
    const lapMaxHr = lap.max_heart_rate ?? lap.maximum_heart_rate ?? 0
    const lapAvgSpd = lap.avg_speed ?? 0
    const lapPace = lapAvgSpd > 0 ? 3600 / lapAvgSpd : 0

    return {
      lapIndex: i,
      distance: lapDist,
      duration: lapTime,
      avgHr: lapAvgHr,
      maxHr: lapMaxHr,
      avgPace: lapPace,
    }
  })
}

/**
 * 从 session 级别提取跑步动态汇总数据
 */
function extractRunningDynamics(session: any): RunningDynamics | null {
  // FIT 文件中的 cadence 是单腿步频（RPM），需要乘以 2 得到完整步频（SPM）
  const avgCadence = (session.avg_cadence ?? 0) * 2
  const avgStepLength = session.avg_step_length ?? 0
  const avgVertOsc = session.avg_vertical_oscillation ?? 0
  const avgVertRatio = session.avg_vertical_ratio ?? 0
  const avgStance = session.avg_stance_time ?? 0
  const avgPower = session.avg_power ?? 0
  const maxPower = session.max_power ?? 0

  // 如果没有任何动态数据，返回 null
  if (!avgCadence && !avgStepLength && !avgVertOsc && !avgPower) {
    return null
  }

  // 爬升/下降（单位从 km 转为 m）
  const totalAscent = typeof session.total_ascent === 'number'
    ? (session.total_ascent > 100 ? session.total_ascent : session.total_ascent * 1000)
    : 0
  const totalDescent = typeof session.total_descent === 'number'
    ? (session.total_descent > 100 ? session.total_descent : session.total_descent * 1000)
    : 0
  const avgTemp = session.avg_temperature ?? 0

  return {
    cadence: avgCadence,
    strideLength: avgStepLength,
    avgCadence,
    avgStepLength,
    avgVerticalOscillation: avgVertOsc,
    avgVerticalRatio: avgVertRatio,
    avgStanceTime: avgStance,
    avgPower,
    maxPower,
    totalAscent: Math.round(totalAscent),
    totalDescent: Math.round(totalDescent),
    avgTemperature: avgTemp,
  }
}

/**
 * 从逐点记录中提取 GPS 轨迹（降采样到 150 点）
 */
function extractGpsTrack(session: any): { lat: number; lon: number }[] {
  let records: any[] = []
  if (Array.isArray(session.records) && session.records.length > 0) {
    records = session.records
  } else if (Array.isArray(session.laps)) {
    session.laps.forEach((lap: any) => {
      if (Array.isArray(lap.records)) records.push(...lap.records)
    })
  }

  const gpsPoints = records
    .filter((r: any) =>
      typeof r.position_lat === 'number' &&
      typeof r.position_long === 'number' &&
      r.position_lat !== 0 &&
      r.position_long !== 0
    )
    .map((r: any) => ({
      lat: r.position_lat,
      lon: r.position_long,
    }))

  if (gpsPoints.length === 0) return []

  const MAX_GPS_POINTS = 150
  if (gpsPoints.length <= MAX_GPS_POINTS) return gpsPoints

  const step = (gpsPoints.length - 1) / (MAX_GPS_POINTS - 1)
  const sampled: { lat: number; lon: number }[] = []
  for (let i = 0; i < MAX_GPS_POINTS - 1; i++) {
    sampled.push(gpsPoints[Math.round(i * step)])
  }
  sampled.push(gpsPoints[gpsPoints.length - 1])
  return sampled
}

// ====================
// 数据提取辅助函数
// ====================

/**
 * 格式化秒数为 mm:ss 或 h:mm 字符串
 * 注意：totalSeconds 可能是浮点数（如 2513.32），必须先取整再格式化
 */
function formatDuration(totalSecondsFloat: number): string {
  const totalSec = Math.round(totalSecondsFloat) // 关键：先取整，防止出现 41:53.32
  const hours = Math.floor(totalSec / 3600)
  const mins = Math.floor((totalSec % 3600) / 60)
  const secs = totalSec % 60
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * 从 fit-file-parser cascade 模式的解析结果中提取训练记录
 *
 * 支持高驰（Coros）、佳明（Garmin）等品牌的 FIT 文件
 * fit-file-parser cascade 模式数据路径：data.activity.sessions[]
 *
 * 关键字段（已转换单位）：
 *   total_distance: km（lengthUnit: 'km' 时）
 *   total_elapsed_time / total_timer_time: 浮点秒（如 2513.32）
 *   avg_speed: km/h（speedUnit: 'km/h' 时）
 *   avg_heart_rate / max_heart_rate: bpm
 *   start_time: ISO 字符串（fit-file-parser 已转换）
 *   sport: 'running' | 'cycling' | 'training' 等
 *   sub_sport: 'strength_training' | 'trail' 等
 */
function extractRecordsFromFit(data: any, fileName = ''): TrainingRecord[] {
  const records: TrainingRecord[] = []

  if (!data) {
    if (import.meta.env.DEV) console.warn('[FIT] data 为空')
    return records
  }

  // 尝试多种可能的数据路径（不同品牌/固件版本）
  let sessions: any[] = []

  // 路径1: data.activity.sessions（cascade 模式标准路径，高驰/佳明均走此路径）
  if (data.activity?.sessions?.length > 0) {
    sessions = data.activity.sessions
    if (import.meta.env.DEV) console.log('[FIT] 使用路径: data.activity.sessions, 数量:', sessions.length)
  }
  // 路径2: data.activity（本身就是 session）
  else if (data.activity && data.activity.total_elapsed_time) {
    sessions = [data.activity]
    if (import.meta.env.DEV) console.log('[FIT] 使用路径: data.activity (单 session)')
  }
  // 路径3: data.sessions（某些版本的输出）
  else if (Array.isArray(data.sessions) && data.sessions.length > 0) {
    sessions = data.sessions
    if (import.meta.env.DEV) console.log('[FIT] 使用路径: data.sessions, 数量:', sessions.length)
  }

  if (sessions.length === 0) {
    if (import.meta.env.DEV) console.warn('[FIT] 未找到 sessions，数据结构异常')
    return records
  }

  sessions.forEach((session: any, idx: number) => {
    const sport = (session.sport ?? 'running').toLowerCase()
    const subSport = (session.sub_sport ?? '').toLowerCase()

    // === 运动类型映射 ===
    // 非有氧跑步类型需要特殊处理
    const isRunning = sport === 'running'
    const isCycling = sport === 'cycling' || sport === 'biking'
    const isStrengthTraining = subSport.includes('strength') || subSport.includes('training')
    const isSwimming = sport === 'swimming'

    // === 时间 ===
    // total_elapsed_time 是包含暂停的总时间（浮点秒）
    // total_timer_time 是实际运动时间（去掉暂停）
    // 优先使用 total_timer_time 作为运动时长，elapsed 作为备用
    let rawSeconds = 0
    if (typeof session.total_timer_time === 'number' && session.total_timer_time > 0) {
      rawSeconds = session.total_timer_time
    } else if (typeof session.total_elapsed_time === 'number') {
      rawSeconds = session.total_elapsed_time
    }

    // === 距离 ===
    // lengthUnit='km' 时 total_distance 已经是 km（高驰输出的就是 km）
    let totalDistanceKm: number | undefined = undefined
    if (typeof session.total_distance === 'number') {
      // 如果值非常大（>500）说明单位是米，需要转换
      totalDistanceKm = session.total_distance > 500
        ? session.total_distance / 1000
        : session.total_distance
    }

    // 如果 session 没有距离，从 laps 累加
    if (totalDistanceKm === undefined && Array.isArray(session.laps)) {
      let lapTotal = 0
      let hasLapDist = false
      session.laps.forEach((lap: any) => {
        if (typeof lap.total_distance === 'number') {
          hasLapDist = true
          lapTotal += lap.total_distance > 500 ? lap.total_distance / 1000 : lap.total_distance
        }
      })
      if (hasLapDist) {
        totalDistanceKm = lapTotal
        if (import.meta.env.DEV) console.log(`[FIT] session[${idx}] 从 laps 累加距离: ${totalDistanceKm}km`)
      }
    }

    // 如果还是没有距离，尝试从 avg_speed 反推
    if (totalDistanceKm === undefined && session.avg_speed && rawSeconds > 0) {
      totalDistanceKm = (session.avg_speed * rawSeconds) / 3600
    }

    // 跳过无有效数据的 session（时间小于1分钟 且 非力量训练）
    if (rawSeconds < 60) {
      if (import.meta.env.DEV) console.log(`[FIT] session[${idx}] 跳过：时间 ${rawSeconds}s 不足`)
      return
    }

    // === 心率 ===
    let avgHr: number = session.avg_heart_rate ?? session.average_heart_rate ?? 0
    let maxHr: number = session.max_heart_rate ?? session.maximum_heart_rate ?? 0

    // 从 laps 获取心率（如果 session 级别没有）
    if ((avgHr === 0 || maxHr === 0) && Array.isArray(session.laps) && session.laps.length > 0) {
      const hrValues = session.laps
        .map((lap: any) => lap.avg_heart_rate ?? lap.average_heart_rate ?? 0)
        .filter((v: number) => v > 0)
      if (hrValues.length > 0) {
        avgHr = avgHr || Math.round(hrValues.reduce((a: number, b: number) => a + b, 0) / hrValues.length)
        const maxHrValues = session.laps.map((lap: any) => lap.max_heart_rate ?? 0).filter((v: number) => v > 0)
        maxHr = maxHr || (maxHrValues.length > 0 ? Math.max(...maxHrValues) : 0)
      }
    }

    // === 日期 ===
    // fit-file-parser 已将 FIT 时间戳转换为 ISO 字符串，直接解析即可
    let dateStr = new Date().toISOString().split('T')[0]
    const rawTime = session.start_time ?? session.timestamp
    if (rawTime) {
      if (rawTime instanceof Date) {
        dateStr = rawTime.toISOString().split('T')[0]
      } else if (typeof rawTime === 'string') {
        // fit-file-parser 输出格式如 "2026-01-04T02:57:35.000Z"，已转换好
        dateStr = new Date(rawTime).toISOString().split('T')[0]
      } else if (typeof rawTime === 'number') {
        // 极少数情况：原始 FIT epoch（从 1989-12-31 00:00 UTC 起）
        const FIT_EPOCH_OFFSET_MS = 631065600000
        dateStr = new Date(rawTime * 1000 + FIT_EPOCH_OFFSET_MS).toISOString().split('T')[0]
      }
    }

    // === 配速（仅跑步类型有意义）===
    let avgPace = '-'
    const distKm = totalDistanceKm ?? 0
    if (isRunning && distKm > 0 && rawSeconds > 0) {
      // 优先用 total_timer_time / distance 计算（更准确，去掉了暂停时间）
      const paceSecPerKm = rawSeconds / distKm
      // 合理跑步配速：2:30/km（精英）~ 15:00/km（步行）
      if (paceSecPerKm >= 150 && paceSecPerKm <= 900) {
        const paceMin = Math.floor(paceSecPerKm / 60)
        const paceSec = Math.round(paceSecPerKm % 60)
        avgPace = `${paceMin}:${paceSec.toString().padStart(2, '0')}`
      }
    }
    // 备用：从 avg_speed 推算配速
    if (avgPace === '-' && isRunning && session.avg_speed && session.avg_speed > 0) {
      const paceSecPerKm = 3600 / session.avg_speed
      if (paceSecPerKm >= 150 && paceSecPerKm <= 900) {
        const paceMin = Math.floor(paceSecPerKm / 60)
        const paceSec = Math.round(paceSecPerKm % 60)
        avgPace = `${paceMin}:${paceSec.toString().padStart(2, '0')}`
      }
    }

    // === 时长格式化（关键：先取整，避免浮点数导致 41:53.32 这样的显示）===
    const duration = formatDuration(rawSeconds)

    // === 热量 ===
    let calories: number = session.total_calories ?? 0
    if (!calories || calories === 0) {
      // 估算：跑步约 65kcal/km，骑行约 30kcal/km，力量训练约 6kcal/min
      if (distKm > 0) {
        calories = Math.round(distKm * (isRunning ? 65 : 30))
      } else {
        calories = Math.round(rawSeconds / 60 * 6)
      }
    }

    // === 训练类型判断 ===
    let type: string
    if (isCycling) {
      type = '骑行'
    } else if (isSwimming) {
      type = '游泳'
    } else if (isStrengthTraining || (sport === 'training' && distKm < 0.1)) {
      type = '力量训练'
    } else if (isRunning) {
      // 基于心率判断跑步强度
      if (avgHr > 0) {
        if (avgHr > 168) type = '间歇跑'
        else if (avgHr > 158) type = '乳酸阈值跑'
        else if (distKm > 16) type = '长距离跑'
        else if (avgHr > 148) type = '节奏跑'
        else type = '轻松跑'
      } else {
        // 无心率，用配速判断
        if (avgPace !== '-') {
          const parts = avgPace.split(':').map(Number)
          const paceSec = parts[0] * 60 + (parts[1] || 0)
          if (paceSec < 255) type = '间歇跑'
          else if (paceSec < 285) type = '乳酸阈值跑'
          else if (distKm > 16) type = '长距离跑'
          else if (paceSec < 330) type = '节奏跑'
          else type = '轻松跑'
        } else if (distKm > 16) {
          type = '长距离跑'
        } else {
          type = '轻松跑'
        }
      }
    } else {
      type = '有氧训练'
    }

    // === 逐点数据提取（心率/配速/步频/海拔等时序数据）===
    const timeSeries = extractTimeSeries(session)
    const lapData = extractLapData(session)
    const dynamics = extractRunningDynamics(session)
    // GPS track 暂不存入 TrainingRecord（字段未定义），仅供调试
    extractGpsTrack(session)

    if (import.meta.env.DEV) {
      console.log(
        `[FIT] session[${idx}] ✓ sport=${sport}/${subSport}`,
        `dist=${distKm.toFixed(2)}km`,
        `timer=${formatDuration(rawSeconds)}`,
        `hr=${avgHr}/${maxHr}`,
        `pace=${avgPace}`,
        `type=${type}`,
        timeSeries.length > 0 ? `ts=${timeSeries.length}pts` : '',
        lapData.length > 0 ? `laps=${lapData.length}` : '',
      )
    }

    records.push({
      id: `fit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      date: dateStr,
      type,
      distance: distKm > 0 ? Math.round(distKm * 10) / 10 : 0,
      duration,
      avgPace,
      avgHr: avgHr || 0,
      maxHr: maxHr || 0,
      calories,
      fileName,
      // --- 新增逐点数据 ---
      timeSeries: timeSeries.length > 0 ? timeSeries : undefined,
      laps: lapData.length > 0 ? lapData : undefined,
      dynamics: dynamics ? dynamics : undefined,
    })
  })

  return records
}

function extractRecordsFromGpx(data: any): TrainingRecord[] {
  const records: TrainingRecord[] = []

  const gpx = data.gpx
  if (!gpx) return records

  // 获取 track 数据
  const tracks = gpx.trk || []

  tracks.forEach((track: any) => {
    const segments = track.trkseg || []
    let totalDistance = 0
    let totalSeconds = 0
    let avgHr = 0
    let maxHr = 0
    let hrCount = 0

    let prevPoint: { lat: number; lon: number; time: Date } | null = null

    segments.forEach((segment: any) => {
      const points = segment.trkpt || []

      points.forEach((point: any) => {
        const lat = parseFloat(point.$?.lat)
        const lon = parseFloat(point.$?.lon)
        const timeStr = point.time?.[0]
        const hrStr = point.extensions?.[0]?.['gpxtpx:TrackPointExtension']?.[0]?.['gpxtpx:hr']?.[0]

        if (timeStr) {
          const currentTime = new Date(timeStr)

          if (prevPoint && lat && lon) {
            // 计算两点间距离（粗略估算）
            const distance = calculateDistance(prevPoint.lat, prevPoint.lon, lat, lon)
            totalDistance += distance

            // 计算时间差
            const timeDiff = (currentTime.getTime() - prevPoint.time.getTime()) / 1000
            totalSeconds += timeDiff
          }

          // 收集心率数据
          if (hrStr) {
            const hr = parseInt(hrStr, 10)
            if (!isNaN(hr)) {
              avgHr += hr
              maxHr = Math.max(maxHr, hr)
              hrCount++
            }
          }

          prevPoint = { lat, lon, time: currentTime }
        }
      })
    })

    // 计算平均心率
    if (hrCount > 0) {
      avgHr = Math.round(avgHr / hrCount)
    }

    // 获取日期
    const firstPoint = segments[0]?.trkpt?.[0]
    const firstTimeStr = firstPoint?.time?.[0]
    const dateStr = firstTimeStr
      ? new Date(firstTimeStr).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]

    // 计算平均配速
    let avgPace = '-'
    if (totalDistance > 0 && totalSeconds > 0) {
      const paceSecPerKm = (totalSeconds / totalDistance)
      const paceMin = Math.floor(paceSecPerKm / 60)
      const paceSec = Math.round(paceSecPerKm % 60)
      avgPace = `${paceMin}:${paceSec.toString().padStart(2, '0')}`
    }

    // 时长格式化
    const hours = Math.floor(totalSeconds / 3600)
    const mins = Math.floor((totalSeconds % 3600) / 60)
    const duration = `${hours}:${mins.toString().padStart(2, '0')}`

    // 估算热量消耗
    const calories = Math.round(totalDistance * 60)

    // 判断训练类型
    let type = '轻松跑'
    if (avgHr > 165) type = '间歇跑'
    else if (avgHr > 155) type = '乳酸阈值跑'
    else if (totalDistance > 14) type = '长距离跑'
    else if (avgHr > 145) type = '节奏跑'

    if (totalDistance > 0) {
      records.push({
        id: `gpx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        date: dateStr,
        type,
        distance: Math.round(totalDistance * 10) / 10,
        duration,
        avgPace,
        avgHr: avgHr || 0,
        maxHr: maxHr || 0,
        calories,
        fileName: '',
      })
    }
  })

  return records
}

function extractRecordsFromTcx(data: any): TrainingRecord[] {
  const records: TrainingRecord[] = []

  const activities = data.TrainingCenterDatabase?.Activities?.[0]?.Activity || []

  activities.forEach((activity: any) => {
    const laps = activity.Lap || []
    let totalDistance = 0
    let totalSeconds = 0
    let avgHr = 0
    let maxHr = 0
    let hrCount = 0

    laps.forEach((lap: any) => {
      // 累加距离
      const distance = parseFloat(lap.DistanceMeters?.[0]) || 0
      totalDistance += distance / 1000 // 转换为 km

      // 累加时间
      const seconds = parseFloat(lap.TotalTimeSeconds?.[0]) || 0
      totalSeconds += seconds

      // 获取心率数据
      const avgHrVal = parseFloat(lap.AverageHeartRateBpm?.[0]?.Value?.[0]) || 0
      const maxHrVal = parseFloat(lap.MaxHeartRateBpm?.[0]?.Value?.[0]) || 0

      if (avgHrVal > 0) {
        avgHr += avgHrVal
        hrCount++
      }
      maxHr = Math.max(maxHr, maxHrVal)
    })

    // 计算平均心率
    if (hrCount > 0) {
      avgHr = Math.round(avgHr / hrCount)
    }

    // 获取日期
    const dateStr = activity.Id?.[0]
      ? new Date(activity.Id[0]).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]

    // 获取运动类型
    const sport = activity.$?.Sport || 'running'

    // 计算平均配速
    let avgPace = '-'
    if (totalDistance > 0 && totalSeconds > 0) {
      const paceSecPerKm = (totalSeconds / totalDistance)
      const paceMin = Math.floor(paceSecPerKm / 60)
      const paceSec = Math.round(paceSecPerKm % 60)
      avgPace = `${paceMin}:${paceSec.toString().padStart(2, '0')}`
    }

    // 时长格式化
    const hours = Math.floor(totalSeconds / 3600)
    const mins = Math.floor((totalSeconds % 3600) / 60)
    const duration = `${hours}:${mins.toString().padStart(2, '0')}`

    // 估算热量消耗
    const calories = Math.round(totalDistance * 60)

    // 判断训练类型
    let type = '轻松跑'
    if (avgHr > 165) type = '间歇跑'
    else if (avgHr > 155) type = '乳酸阈值跑'
    else if (totalDistance > 14) type = '长距离跑'
    else if (avgHr > 145) type = '节奏跑'
    else if (sport.toLowerCase() === 'cycling') type = '骑行'

    if (totalDistance > 0) {
      records.push({
        id: `tcx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        date: dateStr,
        type,
        distance: Math.round(totalDistance * 10) / 10,
        duration,
        avgPace,
        avgHr: avgHr || 0,
        maxHr: maxHr || 0,
        calories,
        fileName: '',
      })
    }
  })

  return records
}

/**
 * 计算两点间距离（Haversine 公式，粗略估算）
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // 地球半径（km）
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

// ========================
// 智能数据清洗（PRD 2.3）
// ========================

/**
 * 清洗训练记录数据，过滤无效/异常数据
 *
 * 规则：
 * 1. 过短无效训练（< 5分钟）→ 丢弃
 * 2. 逐点数据中异常心率（> 220 或 < 30）→ 清除该点的心率值
 * 3. 逐点数据中离谱配速（< 2:00/km 或 > 15:00/km，非比赛）→ 清除该点的配速
 * 4. 异常高平均心率（> 205）→ 标记为可疑
 */
function cleanTrainingRecords(records: TrainingRecord[]): TrainingRecord[] {
  return records.filter(record => {
    // 规则1: 过滤过短训练（< 5分钟）
    const durationSec = parseDurationToSeconds(record.duration)
    if (durationSec > 0 && durationSec < 300) {
      if (import.meta.env.DEV) console.warn(`[清洗] 丢弃过短训练: ${record.id}, 时长 ${record.duration}`)
      return false
    }

    // 逐点数据清洗
    if (record.timeSeries && record.timeSeries.length > 0) {
      record.timeSeries = record.timeSeries.filter(point => {
        // 规则2: 异常心率清除
        const hr = point.heartRate ?? point.hr ?? 0
        if (hr > 0 && (hr > 220 || hr < 30)) {
          return false
        }
        // 规则3: 离谱配速清除（< 120s/km 即 2:00/km 或 > 900s/km 即 15:00/km）
        const pace = point.pace ?? 0
        if (pace > 0 && (pace < 120 || pace > 900)) {
          return false
        }
        return true
      })

      // 如果清洗后点太少，保持原始数据
      if (record.timeSeries.length < 5) {
        if (import.meta.env.DEV) console.warn(`[清洗] 逐点数据清洗后点太少，保留原始: ${record.id}`)
      }
    }

    return true
  }).map(record => {
    // 规则4: 异常高平均心率标记
    if (record.avgHr > 205) {
      if (import.meta.env.DEV) console.warn(`[清洗] 疑似异常心率: ${record.id}, avgHr=${record.avgHr}`)
    }
    return record
  })
}

/**
 * 将时长字符串 "HH:MM:SS" 或 "MM:SS" 解析为秒数
 */
function parseDurationToSeconds(duration: string): number {
  if (!duration || duration === '-') return 0
  const parts = duration.split(':').map(Number)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return 0
}
