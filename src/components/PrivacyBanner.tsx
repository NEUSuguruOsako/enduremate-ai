import { usePrivacy } from '../context/PrivacyContext'

interface PrivacyBannerProps {
  /** 展示位置：inline 用于设置页面，floating 用于首次引导 */
  variant?: 'inline' | 'floating'
  /** 是否可关闭 */
  dismissible?: boolean
  /** 关闭回调 */
  onDismiss?: () => void
}

/**
 * 隐私声明横幅组件
 * 明确告知用户：我们不收集、不上传、不存储任何用户数据
 */
export default function PrivacyBanner({
  variant = 'inline',
  dismissible = false,
  onDismiss,
}: PrivacyBannerProps) {
  const {
    privacyConsentAccepted,
    acceptPrivacyConsent,
  } = usePrivacy()

  const containerClass = variant === 'floating'
    ? 'fixed bottom-6 left-1/2 -translate-x-1/2 w-[600px] max-w-[90vw] z-[100]'
    : ''

  const cardClass = variant === 'floating'
    ? 'rounded-2xl shadow-2xl border-2 border-green-500/30'
    : 'rounded-xl border border-green-500/20'

  // 已经接受过隐私声明且非 floating 模式，显示简化版
  if (privacyConsentAccepted && variant !== 'floating' && !dismissible) {
    return (
      <div className={containerClass}>
        <div className={`${cardClass} bg-green-50/80 p-4`}>
          <div className="flex items-center gap-2 text-green-700">
            <span
              className="material-symbols-outlined text-[18px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              verified_user
            </span>
            <p className="text-xs font-medium">
              所有数据仅存储在你的设备本地，我们不会收集、上传或处理你的任何数据
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={containerClass}>
      <div className={`${cardClass} bg-surface-card p-5`}>
        <div className="flex items-start gap-4">
          {/* 盾牌图标 */}
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
            <span
              className="material-symbols-outlined text-[22px] text-green-600"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              shield_lock
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-headline-sm text-text-primary mb-1">
              你的数据，你做主
            </h3>
            <p className="text-sm text-secondary leading-relaxed mb-3">
              <strong className="text-text-primary">我们不收集、不上传、不存储任何用户数据。</strong>
              所有训练记录、对话历史、个人档案和 API 配置
              <span className="text-primary font-medium">仅保存在你的设备本地</span>，
              不会经过或存储于任何服务器。
            </p>

            {/* 三个关键隐私承诺 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div className="flex items-start gap-2 p-2 rounded-lg bg-surface-container-low">
                <span className="material-symbols-outlined text-[16px] text-green-600 mt-0.5">block</span>
                <div>
                  <p className="text-xs font-semibold text-text-primary">不收集</p>
                  <p className="text-[11px] text-tertiary">不采集任何遥测/分析数据</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-2 rounded-lg bg-surface-container-low">
                <span className="material-symbols-outlined text-[16px] text-green-600 mt-0.5">cloud_off</span>
                <div>
                  <p className="text-xs font-semibold text-text-primary">不上传</p>
                  <p className="text-[11px] text-tertiary">所有数据保留在本地</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-2 rounded-lg bg-surface-container-low">
                <span className="material-symbols-outlined text-[16px] text-green-600 mt-0.5">database_off</span>
                <div>
                  <p className="text-xs font-semibold text-text-primary">不存储</p>
                  <p className="text-[11px] text-tertiary">无后端服务器/数据库</p>
                </div>
              </div>
            </div>

            {/* AI API 说明 */}
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 mb-4">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px] text-amber-600 mt-0.5">info</span>
                <div>
                  <p className="text-xs font-medium text-amber-800 mb-1">
                    AI 功能的 API 调用说明
                  </p>
                  <p className="text-[11px] text-amber-700 leading-relaxed">
                    当你使用 AI 助手时，对话内容会通过你自行配置的 API Key 直接发送至对应的 AI 服务商
                    （如 DeepSeek）。这属于你与服务商之间的直接通信，我们不参与数据传输。
                    你的 API Key 同样仅存储在本地。
                  </p>
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center gap-3">
              {!privacyConsentAccepted && (
                <button
                  onClick={acceptPrivacyConsent}
                  className="px-5 py-2.5 bg-green-600 text-white rounded-xl font-medium text-sm hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[16px]">check</span>
                  我已了解，继续使用
                </button>
              )}
              {dismissible && onDismiss && (
                <button
                  onClick={onDismiss}
                  className="px-4 py-2.5 text-sm text-secondary hover:text-text-primary transition-colors"
                >
                  知道了
                </button>
              )}
            </div>
          </div>

          {/* 关闭按钮 */}
          {dismissible && onDismiss && (
            <button
              onClick={onDismiss}
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-surface-container-high text-tertiary hover:text-text-primary transition-colors shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
