import { useState, useCallback } from 'react'
import { usePrivacy, PROVIDER_CONFIGS, type AIProvider } from '../context/PrivacyContext'
import { useNotification } from '../context/NotificationContext'

/**
 * API Key 配置组件
 * 支持多 provider，可在设置页面或首次引导中使用
 */
export default function ApiKeyConfig() {
  const {
    apiKeys,
    addApiKey,
    removeApiKey,
    activeProvider,
    setActiveProvider,
    maskApiKey,
  } = usePrivacy()
  const { success, error } = useNotification()

  // ---- 表单状态 ----
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('deepseek')
  const [keyInput, setKeyInput] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [endpointInput, setEndpointInput] = useState('')
  const [modelInput, setModelInput] = useState('')
  const [isTesting, setIsTesting] = useState(false)

  // 当前选中 provider 的已保存配置
  const savedEntry = apiKeys.find((k) => k.provider === selectedProvider)
  const providerConfig = PROVIDER_CONFIGS[selectedProvider]

  // ---- 表单验证 ----
  const isValid = keyInput.trim().length > 0

  const validateKey = useCallback((key: string, provider: AIProvider): { valid: boolean; message: string } => {
    if (!key.trim()) return { valid: false, message: '请输入 API Key' }
    if (provider === 'custom') return { valid: true, message: '' }
    const prefix = PROVIDER_CONFIGS[provider].keyPrefix
    if (prefix && !key.startsWith(prefix)) {
      return { valid: false, message: `API Key 应以 "${prefix}" 开头` }
    }
    if (key.length < 10) return { valid: false, message: 'API Key 长度不足，请检查' }
    return { valid: true, message: '' }
  }, [])

  // ---- 保存 ----
  const handleSave = () => {
    const validation = validateKey(keyInput, selectedProvider)
    if (!validation.valid) {
      error('格式错误', validation.message)
      return
    }

    addApiKey({
      provider: selectedProvider,
      key: keyInput.trim(),
      label: providerConfig.label,
      endpoint: endpointInput || providerConfig.defaultEndpoint,
      model: modelInput || providerConfig.defaultModel,
    })

    // 如果当前没有活跃 provider，自动激活
    if (!activeProvider) {
      setActiveProvider(selectedProvider)
    }

    success(
      `${providerConfig.label} API Key 已保存`,
      '密钥仅存储在你的设备本地，不会上传到任何服务器'
    )
    setKeyInput('')
  }

  // ---- 切换 provider ----
  const handleProviderChange = (provider: AIProvider) => {
    setSelectedProvider(provider)
    setKeyInput('')
    setShowKey(false)
    const config = PROVIDER_CONFIGS[provider]
    setEndpointInput(config.defaultEndpoint)
    setModelInput(config.defaultModel)
  }

  // ---- 连接测试 ----
  const handleTestConnection = async () => {
    const key = keyInput || savedEntry?.key
    if (!key) {
      error('无法测试', '请先输入 API Key')
      return
    }

    setIsTesting(true)
    try {
      const endpoint = endpointInput || savedEntry?.endpoint || providerConfig.defaultEndpoint
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: modelInput || savedEntry?.model || providerConfig.defaultModel,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
        }),
        signal: AbortSignal.timeout(10000),
      })

      if (response.ok || response.status === 400) {
        // 400 means auth is OK but request format issue — that's a pass
        success('连接成功', `已成功连接至 ${providerConfig.label}`)
      } else if (response.status === 401) {
        error('认证失败', 'API Key 无效或已过期，请检查')
      } else if (response.status === 403) {
        error('权限不足', 'API Key 没有访问权限，请检查账户余额和权限')
      } else {
        error('连接失败', `服务器返回状态 ${response.status}`)
      }
    } catch {
      error('连接超时', '无法连接到 API 服务器，请检查网络或端点地址')
    } finally {
      setIsTesting(false)
    }
  }

  // ---- 设为活跃 ----
  const handleSetActive = () => {
    if (savedEntry) {
      setActiveProvider(selectedProvider)
      success('已切换', `${providerConfig.label} 已设为当前使用的 AI 服务`)
    }
  }

  // ---- 移除 ----
  const handleRemove = () => {
    removeApiKey(selectedProvider)
    setKeyInput('')
    success('已移除', `${providerConfig.label} API Key 已从本地删除`)
  }

  return (
    <div className="space-y-6">
      {/* Provider 选择器 */}
      <div>
        <label className="font-body-sm text-text-primary font-medium mb-3 block">
          选择 AI 服务提供商
        </label>
        <div className="grid grid-cols-3 gap-3">
          {(Object.keys(PROVIDER_CONFIGS) as AIProvider[]).map((provider) => {
            const config = PROVIDER_CONFIGS[provider]
            const isActive = selectedProvider === provider
            const hasSaved = apiKeys.some((k) => k.provider === provider)
            const isCurrent = activeProvider === provider

            return (
              <button
                key={provider}
                onClick={() => handleProviderChange(provider)}
                className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                  isActive
                    ? 'border-primary bg-primary/5'
                    : 'border-border-subtle hover:border-border'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[24px] ${
                    provider === 'deepseek' ? '' :
                    provider === 'openai' ? '' :
                    ''
                  }`}>
                    {provider === 'deepseek' ? '🧠' : provider === 'openai' ? '🤖' : '🔧'}
                  </span>
                  {isCurrent && (
                    <span className="inline-flex items-center gap-1 text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                      <span className="material-symbols-outlined text-[10px]">check_circle</span>
                      当前
                    </span>
                  )}
                </div>
                <p className="font-body-sm font-medium text-text-primary">{config.label}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    hasSaved ? 'bg-green-500' : 'bg-outline-variant'
                  }`} />
                  <span className="text-[10px] text-tertiary">
                    {hasSaved ? '已配置' : '未配置'}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* API Key 输入 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="font-body-sm text-text-primary font-medium">
            {providerConfig.label} API Key
          </label>
          <a
            href={providerConfig.docsUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-primary hover:underline flex items-center gap-1"
          >
            获取 Key
            <span className="material-symbols-outlined text-[12px]">open_in_new</span>
          </a>
        </div>

        {/* 已保存的 Key 显示 */}
        {savedEntry && !keyInput && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200 mb-3">
            <span
              className="material-symbols-outlined text-[18px] text-green-600"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              key
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-green-800">
                {maskApiKey(savedEntry.key)}
              </p>
              <p className="text-[10px] text-green-600">
                已保存 · 仅存储于本地
              </p>
            </div>
            <div className="flex gap-1">
              {activeProvider !== selectedProvider && (
                <button
                  onClick={handleSetActive}
                  className="text-[10px] px-2 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  启用
                </button>
              )}
              <button
                onClick={() => setKeyInput(savedEntry.key)}
                className="text-[10px] px-2 py-1 bg-surface-container border border-border-subtle rounded-md hover:bg-surface-container-high transition-colors"
              >
                修改
              </button>
              <button
                onClick={handleRemove}
                className="text-[10px] px-2 py-1 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        )}

        {/* Key 输入框 */}
        {(keyInput || !savedEntry) && (
          <div className="space-y-2">
            <div className="relative flex gap-2">
              <div className="flex-1 relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder={providerConfig.keyPrefix ? `${providerConfig.keyPrefix}...` : '输入 API Key'}
                  className="w-full h-11 px-4 pr-10 rounded-xl border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary font-mono text-sm bg-surface-container-low"
                  autoComplete="off"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-tertiary hover:text-text-primary transition-colors"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showKey ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              <button
                onClick={handleSave}
                disabled={!isValid}
                className="px-5 h-11 rounded-xl bg-primary text-on-primary font-medium text-sm hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">save</span>
                保存
              </button>
            </div>

            {/* 格式验证提示 */}
            {keyInput && (() => {
              const v = validateKey(keyInput, selectedProvider)
              return !v.valid ? (
                <p className="text-[10px] text-error flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">error</span>
                  {v.message}
                </p>
              ) : (
                <p className="text-[10px] text-green-600 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">check_circle</span>
                  格式正确
                </p>
              )
            })()}
          </div>
        )}
      </div>

      {/* 高级配置（自定义端点时显示） */}
      {selectedProvider === 'custom' && (
        <div className="p-4 rounded-xl bg-surface-container-low space-y-3">
          <p className="font-label-caps text-xs font-medium text-secondary uppercase tracking-wider">高级配置</p>
          <div>
            <label className="text-[11px] text-secondary mb-1 block">API 端点 URL</label>
            <input
              type="url"
              value={endpointInput}
              onChange={(e) => setEndpointInput(e.target.value)}
              placeholder="https://your-api.com/v1/chat/completions"
              className="w-full h-10 px-3 rounded-lg border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary font-mono text-xs bg-surface"
            />
          </div>
          <div>
            <label className="text-[11px] text-secondary mb-1 block">模型名称</label>
            <input
              type="text"
              value={modelInput}
              onChange={(e) => setModelInput(e.target.value)}
              placeholder="gpt-4o-mini"
              className="w-full h-10 px-3 rounded-lg border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary font-mono text-xs bg-surface"
            />
          </div>
        </div>
      )}

      {/* 连接测试 */}
      <div>
        <button
          onClick={handleTestConnection}
          disabled={isTesting || (!keyInput && !savedEntry)}
          className="w-full h-11 rounded-xl border-2 border-border-subtle font-medium text-sm text-text-primary hover:border-primary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isTesting ? (
            <>
              <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
              测试连接中...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[16px]">network_ping</span>
              测试连接
            </>
          )}
        </button>
      </div>

      {/* 存储说明 */}
      <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
        <div className="flex items-start gap-2">
          <span className="material-symbols-outlined text-[16px] text-blue-600 mt-0.5">lock</span>
          <div>
            <p className="text-xs font-medium text-blue-800 mb-1">存储说明</p>
            <p className="text-[11px] text-blue-700 leading-relaxed">
              你的 API Key <strong>仅存储在你的浏览器本地存储中</strong>，
              不会上传到任何服务器。当你使用 AI 功能时，
              Key 直接从你的浏览器发送到对应 AI 服务商的 API。
              我们不是中间人，不参与数据传输。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

