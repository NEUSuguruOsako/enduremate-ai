import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react'

// ========================
// 类型定义
// ========================

/** 支持的 AI 服务提供商 */
export type AIProvider = 'deepseek' | 'openai' | 'custom'

export interface ApiKeyEntry {
  provider: AIProvider
  key: string
  label: string
  /** API 端点（对于 custom 类型必填） */
  endpoint?: string
  /** 模型名称 */
  model?: string
  /** 最后验证时间 */
  lastVerified?: Date
  /** 是否可用 */
  isValid?: boolean
}

export interface DataInventoryItem {
  key: string
  label: string
  description: string
  /** 存储位置 */
  location: 'localStorage'
  /** 大约大小（bytes），-1 表示未知 */
  approxSize: number
}

export interface PrivacyState {
  /** 用户是否已查看并同意隐私声明 */
  privacyConsentAccepted: boolean
  /** 隐私声明接受时间 */
  privacyConsentDate: string | null
  /** 已配置的 API Keys */
  apiKeys: ApiKeyEntry[]
  /** 当前活跃的 API provider */
  activeProvider: AIProvider | null
  /** 是否展示过 API 配置引导 */
  apiSetupComplete: boolean
}

// ========================
// 存储键名（集中管理，便于审计）
// ========================

export const STORAGE_KEYS = {
  PRIVACY_STATE: 'enduremate_privacy_state',
  API_KEYS: 'enduremate_api_keys',
  ACTIVE_PROVIDER: 'enduremate_active_provider',
  // 以下为应用其他模块的存储键（记录在此便于数据清单）
  SETTINGS: 'enduremate_settings',
  AI_MESSAGES: 'enduremate_ai_messages',
  TRAINING_CHAT_PREFIX: 'enduremate_training_chat_',
  AUTH_USERS: 'enduremate_users',
  AUTH_SESSION: 'enduremate_session',
  AUTH_CURRENT_USER: 'enduremate_current_user',
  PROFILE: 'enduremate_profile',
  TRAINING_RECORDS: 'enduremate_training_records',
  TRAINING_PLAN: 'enduremate_training_plan',
  INJURY_RECORDS: 'enduremate_injury_records',
} as const

// ========================
// 数据清单
// ========================

const DATA_INVENTORY: DataInventoryItem[] = [
  {
    key: STORAGE_KEYS.API_KEYS,
    label: 'API 密钥',
    description: '你自行配置的 AI 服务 API Key，经过部分掩码存储',
    location: 'localStorage',
    approxSize: 200,
  },
  {
    key: STORAGE_KEYS.PRIVACY_STATE,
    label: '隐私设置',
    description: '隐私声明同意状态和偏好',
    location: 'localStorage',
    approxSize: 100,
  },
  {
    key: STORAGE_KEYS.SETTINGS,
    label: '应用设置',
    description: '主题、通知偏好等',
    location: 'localStorage',
    approxSize: 200,
  },
  {
    key: STORAGE_KEYS.AI_MESSAGES,
    label: 'AI 对话记录',
    description: '与 AI 助手的全局对话历史',
    location: 'localStorage',
    approxSize: -1,
  },
  {
    key: STORAGE_KEYS.TRAINING_CHAT_PREFIX + '*',
    label: '训练详情对话',
    description: '各条训练记录的 AI 分析对话',
    location: 'localStorage',
    approxSize: -1,
  },
  {
    key: STORAGE_KEYS.AUTH_USERS,
    label: '用户账户',
    description: '本地注册的用户信息（密码经编码存储）',
    location: 'localStorage',
    approxSize: 500,
  },
  {
    key: STORAGE_KEYS.AUTH_SESSION,
    label: '登录会话',
    description: '当前登录会话信息',
    location: 'localStorage',
    approxSize: 200,
  },
  {
    key: STORAGE_KEYS.PROFILE,
    label: '个人档案',
    description: '年龄、体重、训练目标等个人信息',
    location: 'localStorage',
    approxSize: 300,
  },
  {
    key: STORAGE_KEYS.TRAINING_RECORDS,
    label: '训练记录',
    description: '解析自 FIT/GPX/TCX 文件的训练数据',
    location: 'localStorage',
    approxSize: -1,
  },
  {
    key: STORAGE_KEYS.TRAINING_PLAN,
    label: '训练计划',
    description: '生成的训练课表',
    location: 'localStorage',
    approxSize: -1,
  },
  {
    key: STORAGE_KEYS.INJURY_RECORDS,
    label: '伤病记录',
    description: '身体不适反馈记录',
    location: 'localStorage',
    approxSize: 200,
  },
]

// ========================
// 默认 provider 配置
// ========================

export const PROVIDER_CONFIGS: Record<AIProvider, { label: string; defaultEndpoint: string; defaultModel: string; keyPrefix: string; docsUrl: string }> = {
  deepseek: {
    label: 'DeepSeek',
    defaultEndpoint: 'https://api.deepseek.com/v1/chat/completions',
    defaultModel: 'deepseek-chat',
    keyPrefix: 'sk-',
    docsUrl: 'https://platform.deepseek.com/api_keys',
  },
  openai: {
    label: 'OpenAI 兼容',
    defaultEndpoint: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini',
    keyPrefix: 'sk-',
    docsUrl: 'https://platform.openai.com/api-keys',
  },
  custom: {
    label: '自定义端点',
    defaultEndpoint: '',
    defaultModel: '',
    keyPrefix: '',
    docsUrl: '',
  },
}

// ========================
// Context 接口
// ========================

interface PrivacyContextValue {
  // 隐私声明
  privacyConsentAccepted: boolean
  acceptPrivacyConsent: () => void
  revokePrivacyConsent: () => void

  // API Key 管理
  apiKeys: ApiKeyEntry[]
  addApiKey: (entry: Omit<ApiKeyEntry, 'lastVerified' | 'isValid'>) => void
  removeApiKey: (provider: AIProvider) => void
  updateApiKey: (provider: AIProvider, updates: Partial<ApiKeyEntry>) => void
  getApiKey: (provider: AIProvider) => ApiKeyEntry | undefined

  // 当前活跃 provider
  activeProvider: AIProvider | null
  setActiveProvider: (provider: AIProvider | null) => void

  // API 配置引导
  apiSetupComplete: boolean
  markApiSetupComplete: () => void

  // 数据清单
  dataInventory: DataInventoryItem[]
  getStorageSize: () => { key: string; size: number }[]

  // 工具
  maskApiKey: (key: string) => string
  getActiveApiConfig: () => { key: string; endpoint: string; model: string } | null

  // 共享存储键（供其他模块引用，保证键名一致性）
  STORAGE_KEYS: typeof STORAGE_KEYS
}

const PrivacyContext = createContext<PrivacyContextValue | undefined>(undefined)

// ========================
// Provider
// ========================

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [privacyConsentAccepted, setPrivacyConsentAccepted] = useState(false)
  const [apiKeys, setApiKeys] = useState<ApiKeyEntry[]>([])
  const [activeProvider, setActiveProviderState] = useState<AIProvider | null>(null)
  const [apiSetupComplete, setApiSetupComplete] = useState(false)

  // ---- 初始化：从 localStorage 恢复状态 ----
  useEffect(() => {
    // 恢复隐私状态
    const privacyRaw = localStorage.getItem(STORAGE_KEYS.PRIVACY_STATE)
    if (privacyRaw) {
      try {
        const state = JSON.parse(privacyRaw)
        setPrivacyConsentAccepted(state.consentAccepted ?? false)
        setApiSetupComplete(state.apiSetupComplete ?? false)
      } catch { /* ignore */ }
    }

    // 恢复 API Keys
    const keysRaw = localStorage.getItem(STORAGE_KEYS.API_KEYS)
    if (keysRaw) {
      try {
        const keys = JSON.parse(keysRaw)
        // 反序列化日期
        const parsed = keys.map((k: ApiKeyEntry) => ({
          ...k,
          lastVerified: k.lastVerified ? new Date(k.lastVerified) : undefined,
        }))
        setApiKeys(parsed)
      } catch { /* ignore */ }
    }

    // 恢复活跃 provider
    const activeRaw = localStorage.getItem(STORAGE_KEYS.ACTIVE_PROVIDER)
    if (activeRaw) {
      try {
        setActiveProviderState(JSON.parse(activeRaw))
      } catch { /* ignore */ }
    }
  }, [])

  // ---- 持久化辅助 ----
  const savePrivacyState = useCallback((updates: Record<string, unknown>) => {
    const current = localStorage.getItem(STORAGE_KEYS.PRIVACY_STATE)
    const existing: Record<string, unknown> = current ? JSON.parse(current) : {}
    const merged = { ...existing, ...updates }
    localStorage.setItem(STORAGE_KEYS.PRIVACY_STATE, JSON.stringify(merged))
  }, [])

  const persistApiKeys = useCallback((keys: ApiKeyEntry[]) => {
    localStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(keys))
  }, [])

  // ---- 隐私声明 ----
  const acceptPrivacyConsent = useCallback(() => {
    const now = new Date().toISOString()
    setPrivacyConsentAccepted(true)
    savePrivacyState({ consentAccepted: true, consentDate: now })
  }, [savePrivacyState])

  const revokePrivacyConsent = useCallback(() => {
    setPrivacyConsentAccepted(false)
    savePrivacyState({ consentAccepted: false, consentDate: null })
  }, [savePrivacyState])

  // ---- API Key 管理 ----
  const addApiKey = useCallback((entry: Omit<ApiKeyEntry, 'lastVerified' | 'isValid'>) => {
    setApiKeys((prev) => {
      // 替换同 provider 的旧 key
      const filtered = prev.filter((k) => k.provider !== entry.provider)
      const newKeys = [...filtered, { ...entry, isValid: undefined }]
      persistApiKeys(newKeys)
      return newKeys
    })
  }, [persistApiKeys])

  const removeApiKey = useCallback((provider: AIProvider) => {
    setApiKeys((prev) => {
      const newKeys = prev.filter((k) => k.provider !== provider)
      persistApiKeys(newKeys)
      // 如果删除的是活跃 provider，清除活跃状态
      if (activeProvider === provider) {
        setActiveProviderState(null)
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_PROVIDER)
      }
      return newKeys
    })
  }, [persistApiKeys, activeProvider])

  const updateApiKey = useCallback((provider: AIProvider, updates: Partial<ApiKeyEntry>) => {
    setApiKeys((prev) => {
      const newKeys = prev.map((k) =>
        k.provider === provider ? { ...k, ...updates } : k
      )
      persistApiKeys(newKeys)
      return newKeys
    })
  }, [persistApiKeys])

  const getApiKey = useCallback((provider: AIProvider): ApiKeyEntry | undefined => {
    return apiKeys.find((k) => k.provider === provider)
  }, [apiKeys])

  // ---- 活跃 provider ----
  const setActiveProvider = useCallback((provider: AIProvider | null) => {
    setActiveProviderState(provider)
    if (provider) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PROVIDER, JSON.stringify(provider))
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_PROVIDER)
    }
  }, [])

  // ---- API 配置引导 ----
  const markApiSetupComplete = useCallback(() => {
    setApiSetupComplete(true)
    savePrivacyState({ apiSetupComplete: true })
  }, [savePrivacyState])

  // ---- 数据清单 ----
  const dataInventory = useMemo(() => DATA_INVENTORY, [])

  const getStorageSize = useCallback(() => {
    const result: { key: string; size: number }[] = []
    for (const item of DATA_INVENTORY) {
      const raw = localStorage.getItem(item.key)
      if (raw) {
        result.push({ key: item.key, size: new Blob([raw]).size })
      }
    }
    return result
  }, [])

  // ---- 工具 ----
  const maskApiKey = useCallback((key: string): string => {
    if (key.length <= 8) return '****'
    return key.slice(0, 4) + '****' + key.slice(-4)
  }, [])

  const getActiveApiConfig = useCallback((): { key: string; endpoint: string; model: string } | null => {
    if (!activeProvider) return null
    const entry = apiKeys.find((k) => k.provider === activeProvider)
    if (!entry?.key) return null
    const config = PROVIDER_CONFIGS[activeProvider]
    return {
      key: entry.key,
      endpoint: entry.endpoint || config.defaultEndpoint,
      model: entry.model || config.defaultModel,
    }
  }, [activeProvider, apiKeys])

  // ---- Value ----
  const value = useMemo<PrivacyContextValue>(() => ({
    privacyConsentAccepted,
    acceptPrivacyConsent,
    revokePrivacyConsent,
    apiKeys,
    addApiKey,
    removeApiKey,
    updateApiKey,
    getApiKey,
    activeProvider,
    setActiveProvider,
    apiSetupComplete,
    markApiSetupComplete,
    dataInventory,
    getStorageSize,
    maskApiKey,
    getActiveApiConfig,
    STORAGE_KEYS,
  }), [
    privacyConsentAccepted,
    acceptPrivacyConsent,
    revokePrivacyConsent,
    apiKeys,
    addApiKey,
    removeApiKey,
    updateApiKey,
    getApiKey,
    activeProvider,
    setActiveProvider,
    apiSetupComplete,
    markApiSetupComplete,
    dataInventory,
    getStorageSize,
    maskApiKey,
    getActiveApiConfig,
  ])

  return (
    <PrivacyContext.Provider value={value}>
      {children}
    </PrivacyContext.Provider>
  )
}

// ========================
// Hook
// ========================

export function usePrivacy(): PrivacyContextValue {
  const context = useContext(PrivacyContext)
  if (context === undefined) {
    throw new Error('usePrivacy must be used within a PrivacyProvider')
  }
  return context
}
