/**
 * IndexedDB 存储工具 — 用于存储大体积训练数据（timeSeries、laps、dynamics）
 * localStorage 只存轻量摘要，详细图表数据走 IndexedDB（容量可达几百MB）
 */

const DB_NAME = 'enduremate_db'
const DB_VERSION = 1
const STORE_NAME = 'training_data'

interface DBRecord {
  id: string // 格式: "record_{recordId}" 或 "file_{fileId}"
  data: unknown
  updatedAt: number
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      console.error('[IndexedDB] 打开数据库失败:', request.error)
      reject(request.error)
    }
  })

  return dbPromise
}

/** 保存一条数据 */
export async function idbPut(id: string, data: unknown): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.put({ id, data, updatedAt: Date.now() })
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    console.error(`[IndexedDB] put(${id}) 失败:`, err)
  }
}

/** 读取一条数据 */
export async function idbGet<T = unknown>(id: string): Promise<T | null> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const record = await new Promise<DBRecord | undefined>((resolve, reject) => {
      const req = store.get(id)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    return (record?.data as T) ?? null
  } catch (err) {
    console.error(`[IndexedDB] get(${id}) 失败:`, err)
    return null
  }
}

/** 批量保存（根据 id 前缀路由） */
export async function idbPutMany(items: Array<{ id: string; data: unknown }>): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    for (const item of items) {
      store.put({ id: item.id, data: item.data, updatedAt: Date.now() })
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    console.error('[IndexedDB] putMany 失败:', err)
  }
}

/** 删除一条数据 */
export async function idbDelete(id: string): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(id)
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // 静默忽略
  }
}

/** 删除指定前缀的所有数据 */
export async function idbDeleteByPrefix(prefix: string): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const all = await new Promise<DBRecord[]>((resolve, reject) => {
      const req = store.getAll()
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    for (const record of all) {
      if (record.id.startsWith(prefix)) {
        store.delete(record.id)
      }
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // 静默忽略
  }
}

/** 获取当前存储使用量估算（KB） */
export async function idbGetStorageSize(): Promise<{ count: number; sizeKB: number }> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const all = await new Promise<DBRecord[]>((resolve, reject) => {
      const req = store.getAll()
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    const totalSize = all.reduce((sum, r) => sum + JSON.stringify(r).length, 0) * 2 / 1024
    return { count: all.length, sizeKB: totalSize }
  } catch {
    return { count: 0, sizeKB: 0 }
  }
}
