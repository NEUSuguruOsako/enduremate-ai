import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth, validateEmail } from '../context/AuthContext'
import BrandLogo from '../components/BrandLogo'

export default function ForgotPassword() {
  const { resetPassword, error, clearError, isLoading } = useAuth()

  const [email, setEmail] = useState('')
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)

  // 清除API错误当用户开始输入
  useEffect(() => {
    if (error) {
      clearError()
    }
  }, [email])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 本地验证
    const errors: Record<string, string> = {}

    if (!email.trim()) {
      errors.email = '请输入邮箱地址'
    } else if (!validateEmail(email)) {
      errors.email = '请输入有效的邮箱地址'
    }

    if (Object.keys(errors).length > 0) {
      setLocalErrors(errors)
      return
    }

    setLocalErrors({})

    // 调用重置密码
    const success = await resetPassword(email.trim())
    if (success) {
      setSubmitted(true)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md">
          {/* Logo & Title */}
          <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <BrandLogo size="lg" />
          </div>
            <h1 className="font-headline-xl text-headline-xl text-text-primary mb-2">
              EndureMate AI
            </h1>
          </div>

          {/* Success Message */}
          <div className="data-card p-stack-lg rounded-xl text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-status-success/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[40px] text-status-success" style={{ fontVariationSettings: "'FILL' 1" }}>
                mark_email_read
              </span>
            </div>

            <h2 className="font-headline-md text-headline-md text-text-primary mb-4">
              重置邮件已发送
            </h2>

            <p className="font-body-md text-secondary mb-6 leading-relaxed">
              我们已向 <span className="text-primary font-medium">{email}</span> 发送了密码重置邮件。
              <br />
              请检查邮箱并按照指引重置密码。
            </p>

            <div className="bg-surface-container-low rounded-lg p-4 mb-6">
              <p className="text-sm text-secondary">
                如果几分钟内未收到邮件，请检查垃圾邮件文件夹，或重新发送请求。
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => setSubmitted(false)}
                className="w-full py-3 bg-surface-container border border-border-subtle rounded-lg font-medium text-sm text-text-primary hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                重新发送
              </button>
              <Link
                to="/login"
                className="w-full py-3 bg-primary text-on-primary rounded-lg font-semibold text-sm hover:brightness-110 transition-all text-center"
              >
                返回登录
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <BrandLogo size="lg" />
          </div>
          <h1 className="font-headline-xl text-headline-xl text-text-primary mb-2">
            EndureMate AI
          </h1>
          <p className="font-body-md text-secondary">
            重置密码
          </p>
        </div>

        {/* Forgot Password Form */}
        <div className="data-card p-stack-lg rounded-xl">
          <h2 className="font-headline-md text-headline-md text-text-primary mb-4 text-center">
            找回密码
          </h2>

          <p className="font-body-sm text-secondary mb-6 text-center leading-relaxed">
            输入你的注册邮箱，我们将发送密码重置链接。
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="font-body-sm font-medium text-text-primary mb-1.5 block">
                邮箱地址
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
                  mail
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full pl-10 pr-3 py-2.5 bg-surface-container-low border rounded-lg text-text-primary focus:ring-2 focus:ring-primary outline-none transition-all font-body-sm ${
                    localErrors.email ? 'border-status-danger' : 'border-border-subtle'
                  }`}
                  placeholder="your@email.com"
                  autoComplete="email"
                />
              </div>
              {localErrors.email && (
                <p className="text-xs text-status-danger mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">error</span>
                  {localErrors.email}
                </p>
              )}
            </div>

            {/* API Error */}
            {error && (
              <div className="bg-status-danger/10 border border-status-danger/30 rounded-lg p-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-status-danger">warning</span>
                <p className="text-sm text-status-danger">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-primary text-on-primary rounded-lg font-semibold text-sm hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                  发送中...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">send</span>
                  发送重置邮件
                </>
              )}
            </button>
          </form>

          {/* Links */}
          <div className="mt-6 pt-4 border-t border-border-subtle text-center">
            <Link
              to="/login"
              className="text-sm text-primary hover:underline font-medium flex items-center justify-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              返回登录
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-on-surface-variant mt-6">
          © 2026 EndureMate AI. 科学训练，突破极限。
        </p>
      </div>
    </div>
  )
}