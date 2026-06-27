import { useState, useMemo } from 'react'
import { usePrivacy } from '../context/PrivacyContext'
import { useNotification } from '../context/NotificationContext'

export default function Privacy() {
  const {
    privacyConsentAccepted,
    acceptPrivacyConsent,
    revokePrivacyConsent,
    apiKeys,
    dataInventory,
    getStorageSize,
    maskApiKey,
  } = usePrivacy()
  const { success, error } = useNotification()

  const [showConfirmRevoke, setShowConfirmRevoke] = useState(false)
  const [showDeleteData, setShowDeleteData] = useState(false)

  // 计算存储大小
  const storageSizes = useMemo(() => getStorageSize(), [getStorageSize])
  const totalSize = useMemo(
    () => storageSizes.reduce((sum, item) => sum + item.size, 0),
    [storageSizes]
  )

  // 格式化大小
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // 导出所有本地数据
  const handleExportAllData = () => {
    try {
      const allData: Record<string, unknown> = {}
      for (const item of dataInventory) {
        const raw = localStorage.getItem(item.key)
        if (raw) {
          try {
            allData[item.key] = JSON.parse(raw)
          } catch {
            allData[item.key] = raw
          }
        }
      }
      const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `enduremate_data_backup_${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      success('导出成功', '所有本地数据已导出为 JSON 文件')
    } catch {
      error('导出失败', '无法导出数据，请稍后重试')
    }
  }

  // 清除所有本地数据
  const handleClearAllData = () => {
    try {
      for (const item of dataInventory) {
        localStorage.removeItem(item.key)
      }
      setShowDeleteData(false)
      success('已清除', '所有本地数据已删除。刷新页面后将恢复到初始状态。')
    } catch {
      error('清除失败', '无法清除数据，请稍后重试')
    }
  }

  return (
    <div className="p-stack-lg max-w-3xl">
      <h2 className="font-headline-xl text-headline-xl-mobile md:text-headline-xl text-text-primary mb-2">
        隐私与数据
      </h2>
      <p className="text-sm text-secondary mb-8">
        我们对待你的数据就像对待自己的训练日志一样认真。
        以下是关于数据存储和隐私保障的完整说明。
      </p>

      {/* 核心隐私承诺 */}
      <section className="data-card p-stack-lg mb-6">
        <h3 className="font-headline-md text-text-primary font-semibold mb-2 flex items-center gap-2">
          <span
            className="material-symbols-outlined text-[20px] text-green-600"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            verified_user
          </span>
          核心隐私承诺
        </h3>

        <div className="p-4 rounded-xl bg-green-50 border border-green-200 mb-6">
          <p className="text-base font-bold text-green-800 mb-2">
            我们不收集、不上传、不存储任何用户数据
          </p>
          <p className="text-sm text-green-700">
            EndureMate AI 是一个完全运行在你设备上的应用。
            没有后端服务器，没有云数据库，没有第三方分析工具。
            你的所有数据——包括训练记录、个人档案、对话历史和 API 配置——都只存在于你的浏览器本地存储中。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-surface-container-low">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-[18px] text-green-600">block</span>
            </div>
            <h4 className="font-body-sm font-semibold text-text-primary mb-1">不收集</h4>
            <p className="text-xs text-secondary leading-relaxed">
              不嵌入任何分析 SDK，不采集使用数据，不追踪用户行为。
              没有 Google Analytics、没有 Mixpanel、没有任何遥测工具。
            </p>
          </div>
          <div className="p-4 rounded-xl bg-surface-container-low">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-[18px] text-green-600">cloud_off</span>
            </div>
            <h4 className="font-body-sm font-semibold text-text-primary mb-1">不上传</h4>
            <p className="text-xs text-secondary leading-relaxed">
              没有后端服务器接收你的数据。训练文件解析在浏览器中完成，
              数据不会离开你的设备。AI 对话直接通过你的 API Key 与服务商通信。
            </p>
          </div>
          <div className="p-4 rounded-xl bg-surface-container-low">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-[18px] text-green-600">database_off</span>
            </div>
            <h4 className="font-body-sm font-semibold text-text-primary mb-1">不存储</h4>
            <p className="text-xs text-secondary leading-relaxed">
              没有数据库，没有云存储。你在应用中看到的一切数据都来自
              浏览器的 localStorage API。关闭浏览器后数据仍在你的设备上。
            </p>
          </div>
        </div>
      </section>

      {/* 数据存储清单 */}
      <section className="data-card p-stack-lg mb-6">
        <h3 className="font-headline-md text-text-primary font-semibold mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]">folder_open</span>
          本地数据清单
        </h3>
        <p className="text-sm text-secondary mb-4">
          以下是你设备上存储的所有数据类别。全部使用浏览器的 localStorage 存储。
        </p>

        <div className="overflow-hidden rounded-xl border border-border-subtle">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="text-left px-4 py-3 font-medium text-text-primary">数据类别</th>
                <th className="text-left px-4 py-3 font-medium text-text-primary hidden md:table-cell">说明</th>
                <th className="text-right px-4 py-3 font-medium text-text-primary">大小</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {dataInventory.map((item) => {
                const sizeItem = storageSizes.find((s) => s.key === item.key)
                return (
                  <tr key={item.key} className="hover:bg-surface-container-low/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-text-primary">{item.label}</p>
                      <p className="text-[10px] text-tertiary font-mono">{item.key}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-xs text-secondary">{item.description}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-xs font-mono ${sizeItem ? 'text-text-primary' : 'text-tertiary'}`}>
                        {sizeItem ? formatSize(sizeItem.size) : '（空）'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-surface-container-low">
                <td colSpan={2} className="px-4 py-3 font-medium text-text-primary">
                  总计
                </td>
                <td className="px-4 py-3 text-right font-medium font-mono text-text-primary">
                  {formatSize(totalSize)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <p className="text-[10px] text-tertiary mt-2">
          存储空间由浏览器管理。当浏览器存储空间不足时，可能会自动清理部分数据。建议定期导出备份。
        </p>
      </section>

      {/* API Key 管理 */}
      <section className="data-card p-stack-lg mb-6">
        <h3 className="font-headline-md text-text-primary font-semibold mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]">key</span>
          API 密钥管理
        </h3>
        <p className="text-sm text-secondary mb-4">
          你自行配置的 AI 服务 API Key。Key 仅存储在本地，使用时直接从浏览器发送至 AI 服务商。
        </p>

        {apiKeys.length === 0 ? (
          <div className="p-4 rounded-xl bg-surface-container-low text-center">
            <span className="material-symbols-outlined text-[32px] text-tertiary mb-2 block">vpn_key_off</span>
            <p className="text-sm text-secondary">尚未配置任何 API Key</p>
            <p className="text-xs text-tertiary mt-1">前往「设置」页面或 AI 助手面板配置</p>
          </div>
        ) : (
          <div className="space-y-3">
            {apiKeys.map((entry) => (
              <div
                key={entry.provider}
                className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">
                    {entry.provider === 'deepseek' ? '🧠' : entry.provider === 'openai' ? '🤖' : '🔧'}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{entry.label}</p>
                    <p className="text-xs font-mono text-tertiary">{maskApiKey(entry.key)}</p>
                  </div>
                </div>
                <span className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  已配置
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-100">
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong>重要：</strong>当使用 AI 助手时，对话内容会通过你的 API Key 直接发送到对应的 AI 服务商
            （如 DeepSeek、OpenAI）。这是你与 AI 服务商之间的直接通信 ——
            我们不会、也无法查看或存储这些对话内容，因为我们根本没有服务器。
          </p>
        </div>
      </section>

      {/* 数据管理操作 */}
      <section className="data-card p-stack-lg mb-6">
        <h3 className="font-headline-md text-text-primary font-semibold mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]">settings</span>
          数据管理
        </h3>

        <div className="space-y-4">
          {/* 导出数据 */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-surface-container-low">
            <div>
              <p className="font-body-sm font-medium text-text-primary">导出所有数据</p>
              <p className="text-xs text-secondary">将所有本地存储的数据导出为 JSON 文件，便于备份</p>
            </div>
            <button
              onClick={handleExportAllData}
              className="px-4 py-2 rounded-lg bg-surface-container border border-border-subtle text-sm text-text-primary hover:bg-surface-container-high transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              导出
            </button>
          </div>

          {/* 清除数据 */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-surface-container-low">
            <div>
              <p className="font-body-sm font-medium text-text-primary">清除所有本地数据</p>
              <p className="text-xs text-secondary">删除所有存储在浏览器中的数据。此操作不可撤销</p>
            </div>
            {showDeleteData ? (
              <div className="flex gap-2">
                <button
                  onClick={handleClearAllData}
                  className="px-4 py-2 rounded-lg bg-error text-on-error text-sm hover:bg-error/90 transition-colors"
                >
                  确认删除
                </button>
                <button
                  onClick={() => setShowDeleteData(false)}
                  className="px-4 py-2 rounded-lg bg-surface-container border border-border-subtle text-sm text-text-primary hover:bg-surface-container-high transition-colors"
                >
                  取消
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteData(true)}
                className="px-4 py-2 rounded-lg bg-surface-container border border-border-subtle text-sm text-error hover:bg-error/10 transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                清除数据
              </button>
            )}
          </div>

          {/* 隐私声明状态 */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-surface-container-low">
            <div>
              <p className="font-body-sm font-medium text-text-primary">隐私声明状态</p>
              <p className="text-xs text-secondary">
                {privacyConsentAccepted ? '已接受隐私声明' : '尚未接受隐私声明'}
              </p>
            </div>
            {showConfirmRevoke ? (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    revokePrivacyConsent()
                    setShowConfirmRevoke(false)
                  }}
                  className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm hover:bg-amber-600 transition-colors"
                >
                  确认撤销
                </button>
                <button
                  onClick={() => setShowConfirmRevoke(false)}
                  className="px-4 py-2 rounded-lg bg-surface-container border border-border-subtle text-sm text-text-primary hover:bg-surface-container-high transition-colors"
                >
                  取消
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  if (privacyConsentAccepted) {
                    setShowConfirmRevoke(true)
                  } else {
                    acceptPrivacyConsent()
                    success('已接受', '感谢你的信任')
                  }
                }}
                className={`px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-1.5 ${
                  privacyConsentAccepted
                    ? 'bg-surface-container border border-border-subtle text-text-primary hover:bg-surface-container-high'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {privacyConsentAccepted ? 'undo' : 'check'}
                </span>
                {privacyConsentAccepted ? '撤销同意' : '接受隐私声明'}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 技术说明 */}
      <section className="data-card p-stack-lg mb-6">
        <h3 className="font-headline-md text-text-primary font-semibold mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]">code</span>
          技术实现说明
        </h3>

        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-container-low">
            <span className="material-symbols-outlined text-[18px] text-primary mt-0.5">architecture</span>
            <div>
              <p className="text-sm font-medium text-text-primary mb-0.5">纯前端架构</p>
              <p className="text-xs text-secondary leading-relaxed">
                EndureMate AI 是一个单页应用（SPA），使用 React + TypeScript + Vite 构建。
                不依赖任何后端服务，所有功能均在浏览器中运行。
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-container-low">
            <span className="material-symbols-outlined text-[18px] text-primary mt-0.5">storage</span>
            <div>
              <p className="text-sm font-medium text-text-primary mb-0.5">浏览器本地存储</p>
              <p className="text-xs text-secondary leading-relaxed">
                所有数据使用浏览器的 localStorage API 存储。数据与浏览器绑定——
                更换浏览器或清除浏览器数据会导致数据丢失。请定期导出备份。
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-container-low">
            <span className="material-symbols-outlined text-[18px] text-primary mt-0.5">api</span>
            <div>
              <p className="text-sm font-medium text-text-primary mb-0.5">AI API 直接调用</p>
              <p className="text-xs text-secondary leading-relaxed">
                AI 功能通过你提供的 API Key 直接调用第三方服务（如 DeepSeek）。
                请求从你的浏览器直接发出，对话内容不经过我们的任何服务器。
                这意味着：(1) 我们无法看到你的对话；(2) AI 服务商的使用条款适用于对话内容。
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-container-low">
            <span className="material-symbols-outlined text-[18px] text-primary mt-0.5">upload_file</span>
            <div>
              <p className="text-sm font-medium text-text-primary mb-0.5">文件本地解析</p>
              <p className="text-xs text-secondary leading-relaxed">
                训练数据文件（FIT/GPX/TCX）的解析完全在浏览器中完成。文件内容不会上传到任何服务器。
                解析后的数据同样仅存储在 localStorage 中。
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
