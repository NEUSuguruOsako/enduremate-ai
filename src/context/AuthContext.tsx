import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react'
import { isValidEmail } from '../utils/security'

// ========================
// 类型定义
// ========================

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  createdAt: Date
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<boolean>
  register: (email: string, password: string, name: string) => Promise<boolean>
  logout: () => void
  resetPassword: (email: string) => Promise<boolean>
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>
  clearError: () => void
  updateUser: (updates: Partial<User>) => void
  isFirstLogin: boolean
  setFirstLoginComplete: () => void
}

// 重新导出以保持向后兼容
export { isValidEmail as validateEmail }

// ========================
// 密码安全工具 (PBKDF2)
// ========================

/** PBKDF2 参数 */
const PBKDF2_ITERATIONS = 100000
const PBKDF2_KEY_LEN = 256
const PBKDF2_HASH = 'SHA-256'

/** 生成随机盐 (hex) */
function generateSalt(): string {
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** 将字符串转为 Uint8Array */
function strToBytes(str: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(new TextEncoder().encode(str))
}

/** bytes 转 hex */
function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * PBKDF2 密码哈希
 * 格式: "salt:iterations:hash"
 */
async function hashPassword(password: string): Promise<string> {
  const salt = generateSalt()
  const saltBytes = strToBytes(salt)
  const key = await crypto.subtle.importKey(
    'raw',
    strToBytes(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  )
  const hash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    key,
    PBKDF2_KEY_LEN
  )
  return `${salt}:${PBKDF2_ITERATIONS}:${bytesToHex(hash)}`
}

/**
 * 验证 PBKDF2 密码
 */
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split(':')
  if (parts.length !== 3) {
    return legacyVerifyPassword(password, storedHash)
  }
  const [salt, iterStr, hashHex] = parts
  const iterations = parseInt(iterStr, 10)
  const saltBytes = strToBytes(salt)
  
  const key = await crypto.subtle.importKey(
    'raw',
    strToBytes(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  )
  const hash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes.buffer as ArrayBuffer,
      iterations,
      hash: PBKDF2_HASH,
    },
    key,
    PBKDF2_KEY_LEN
  )
  return bytesToHex(hash) === hashHex
}

/** 兼容旧版 Base64 密码格式 */
function legacyVerifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':')
  if (!salt || !hash) return false
  const computedHash = btoa(password + salt)
  return hash === computedHash
}

/**
 * 生成唯一ID
 */
function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/**
 * 验证密码强度
 * 返回: { valid: boolean, score: number, messages: string[] }
 */
export function validatePasswordStrength(password: string): {
  valid: boolean
  score: number
  messages: string[]
} {
  const messages: string[] = []
  let score = 0

  if (password.length < 8) {
    messages.push('密码长度至少8位')
  } else {
    score += 1
  }

  if (password.length >= 12) {
    score += 1
  }

  if (/[A-Z]/.test(password)) {
    score += 1
  } else {
    messages.push('建议包含大写字母')
  }

  if (/[a-z]/.test(password)) {
    score += 1
  } else {
    messages.push('建议包含小写字母')
  }

  if (/[0-9]/.test(password)) {
    score += 1
  } else {
    messages.push('建议包含数字')
  }

  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score += 1
  } else {
    messages.push('建议包含特殊字符')
  }

  return {
    valid: password.length >= 8,
    score,
    messages,
  }
}

// ========================
// 本地存储键名
// ========================

const STORAGE_KEY_USERS = 'enduremate_users'
const STORAGE_KEY_CURRENT_USER = 'enduremate_current_user'
const STORAGE_KEY_SESSION = 'enduremate_session'
const STORAGE_KEY_FIRST_LOGIN = 'enduremate_first_login'

// ========================
// Context 创建
// ========================

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isFirstLogin, setIsFirstLogin] = useState(false)

  // 初始化：检查是否有已登录的会话
  useEffect(() => {
    const storedSession = localStorage.getItem(STORAGE_KEY_SESSION)
    if (storedSession) {
      try {
        const session = JSON.parse(storedSession)
        if (session.userId && session.expiresAt > Date.now()) {
          // 恢复用户会话
          const storedUser = localStorage.getItem(STORAGE_KEY_CURRENT_USER)
          if (storedUser) {
            setUser(JSON.parse(storedUser))
          }
        } else {
          // 会话过期，清除
          localStorage.removeItem(STORAGE_KEY_SESSION)
          localStorage.removeItem(STORAGE_KEY_CURRENT_USER)
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY_SESSION)
        localStorage.removeItem(STORAGE_KEY_CURRENT_USER)
      }
    }
    
    // 检查首次登录标志
    const firstLoginFlag = localStorage.getItem(STORAGE_KEY_FIRST_LOGIN)
    if (!firstLoginFlag) {
      setIsFirstLogin(true)
    }
  }, [])

  // 获取已注册用户列表
  const getRegisteredUsers = useCallback(() => {
    const stored = localStorage.getItem(STORAGE_KEY_USERS)
    if (stored) {
      try {
        return JSON.parse(stored) as Array<{
          id: string
          email: string
          name: string
          passwordHash: string
          createdAt: string
        }>
      } catch {
        return []
      }
    }
    return []
  }, [])

  // 保存用户列表
  const saveRegisteredUsers = useCallback(
    (users: Array<{
      id: string
      email: string
      name: string
      passwordHash: string
      createdAt: string
    }>) => {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users))
    },
    []
  )

  // 登录
  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    // 模拟网络延迟
    await new Promise((resolve) => setTimeout(resolve, 500))

    try {
      // 验证邮箱格式
      if (!isValidEmail(email)) {
        setError('请输入有效的邮箱地址')
        setIsLoading(false)
        return false
      }

      // 查找用户
      const users = getRegisteredUsers()
      const foundUser = users.find((u) => u.email === email)

      if (!foundUser) {
        setError('该邮箱未注册')
        setIsLoading(false)
        return false
      }

      // 验证密码
      const passwordMatch = await verifyPassword(password, foundUser.passwordHash)
      if (!passwordMatch) {
        setError('密码错误')
        setIsLoading(false)
        return false
      }

      // 创建会话
      const sessionUser: User = {
        id: foundUser.id,
        email: foundUser.email,
        name: foundUser.name,
        createdAt: new Date(foundUser.createdAt),
      }

      // 设置会话（7天有效期）
      const session = {
        userId: foundUser.id,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      }

      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session))
      localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(sessionUser))

      setUser(sessionUser)
      setIsLoading(false)
      return true
    } catch (err) {
      setError('登录失败，请稍后重试')
      setIsLoading(false)
      return false
    }
  }, [getRegisteredUsers])

  // 注册
  const register = useCallback(
    async (email: string, password: string, name: string): Promise<boolean> => {
      setIsLoading(true)
      setError(null)

      // 模拟网络延迟
      await new Promise((resolve) => setTimeout(resolve, 500))

      try {
        // 验证邮箱格式
        if (!isValidEmail(email)) {
          setError('请输入有效的邮箱地址')
          setIsLoading(false)
          return false
        }

        // 验证密码强度
        const passwordCheck = validatePasswordStrength(password)
        if (!passwordCheck.valid) {
          setError(passwordCheck.messages[0])
          setIsLoading(false)
          return false
        }

        // 验证用户名
        if (!name.trim() || name.trim().length < 2) {
          setError('请输入有效的用户名（至少2个字符）')
          setIsLoading(false)
          return false
        }

        // 检查邮箱是否已注册
        const users = getRegisteredUsers()
        if (users.some((u) => u.email === email)) {
          setError('该邮箱已被注册')
          setIsLoading(false)
          return false
        }

        // 创建新用户
        const newUser = {
          id: generateUserId(),
          email,
          name: name.trim(),
          passwordHash: await hashPassword(password),
          createdAt: new Date().toISOString(),
        }

        // 保存用户
        saveRegisteredUsers([...users, newUser])

        // 自动登录
        const sessionUser: User = {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          createdAt: new Date(newUser.createdAt),
        }

        const session = {
          userId: newUser.id,
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        }

        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session))
        localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(sessionUser))

        setUser(sessionUser)
        // 注册成功即标记首次登录完成
        localStorage.setItem(STORAGE_KEY_FIRST_LOGIN, 'true')
        setIsFirstLogin(false)
        setIsLoading(false)
        return true
      } catch (err) {
        setError('注册失败，请稍后重试')
        setIsLoading(false)
        return false
      }
    },
    [getRegisteredUsers, saveRegisteredUsers]
  )

  // 修改密码
  const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<boolean> => {
    if (!user) {
      setError('未登录')
      return false
    }
    setIsLoading(true)
    setError(null)

    try {
      const users = getRegisteredUsers()
      const foundUser = users.find((u) => u.id === user.id)
      if (!foundUser) {
        setError('用户不存在')
        setIsLoading(false)
        return false
      }

      // 验证当前密码
      const isValid = await verifyPassword(currentPassword, foundUser.passwordHash)
      if (!isValid) {
        setError('当前密码错误')
        setIsLoading(false)
        return false
      }

      // 更新密码
      const newHash = await hashPassword(newPassword)
      const updatedUsers = users.map((u) =>
        u.id === user.id ? { ...u, passwordHash: newHash } : u
      )
      saveRegisteredUsers(updatedUsers)
      
      setIsLoading(false)
      return true
    } catch {
      setError('修改密码失败')
      setIsLoading(false)
      return false
    }
  }, [user, getRegisteredUsers, saveRegisteredUsers])

  // 退出登录
  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_SESSION)
    localStorage.removeItem(STORAGE_KEY_CURRENT_USER)
    setUser(null)
    setError(null)
  }, [])

  // 重置密码
  const resetPassword = useCallback(async (email: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    // 模拟网络延迟
    await new Promise((resolve) => setTimeout(resolve, 500))

    try {
      // 验证邮箱格式
      if (!isValidEmail(email)) {
        setError('请输入有效的邮箱地址')
        setIsLoading(false)
        return false
      }

      // 检查邮箱是否已注册
      const users = getRegisteredUsers()
      const foundUser = users.find((u) => u.email === email)

      if (!foundUser) {
        setError('该邮箱未注册')
        setIsLoading(false)
        return false
      }

      // 在实际项目中，这里应该发送重置邮件
      // 由于是本地演示，我们模拟成功
      setIsLoading(false)
      return true
    } catch (err) {
      setError('重置密码失败，请稍后重试')
      setIsLoading(false)
      return false
    }
  }, [getRegisteredUsers])

  // 清除错误
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // 更新用户信息
  const updateUser = useCallback((updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates }
      setUser(updatedUser)
      localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(updatedUser))

      // 同时更新注册用户列表中的信息
      const users = getRegisteredUsers()
      const updatedUsers = users.map((u) =>
        u.id === user.id
          ? { ...u, name: updates.name || u.name, email: updates.email || u.email }
          : u
      )
      saveRegisteredUsers(updatedUsers)
    }
  }, [user, getRegisteredUsers, saveRegisteredUsers])

  // 标记首次登录完成
  const setFirstLoginComplete = useCallback(() => {
    localStorage.setItem(STORAGE_KEY_FIRST_LOGIN, 'true')
    setIsFirstLogin(false)
  }, [])

  const value: AuthContextValue = {
    user,
    isAuthenticated: user !== null,
    isLoading,
    error,
    login,
    register,
    logout,
    resetPassword,
    changePassword,
    clearError,
    updateUser,
    isFirstLogin,
    setFirstLoginComplete,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}