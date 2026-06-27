import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth, validateEmail } from '../context/AuthContext'
import BrandLogo from '../components/BrandLogo'

export default function Login() {
  const navigate = useNavigate()
  const { login, isAuthenticated, error, clearError, isLoading, isFirstLogin } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)

  // 如果已登录，跳转到首页或个人档案页（首次登录）
  useEffect(() => {
    if (isAuthenticated) {
      if (isFirstLogin) {
        navigate('/profile', { replace: true })
      } else {
        navigate('/', { replace: true })
      }
    }
  }, [isAuthenticated, navigate, isFirstLogin])

  // 清除API错误当用户开始输入
  useEffect(() => {
    if (error) {
      clearError()
    }
  }, [email, password])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 本地验证
    const errors: Record<string, string> = {}

    if (!email.trim()) {
      errors.email = '请输入邮箱地址'
    } else if (!validateEmail(email)) {
      errors.email = '请输入有效的邮箱地址'
    }

    if (!password) {
      errors.password = '请输入密码'
    }

    if (Object.keys(errors).length > 0) {
      setLocalErrors(errors)
      return
    }

    setLocalErrors({})

    // 调用登录
    const success = await login(email.trim(), password)
    if (success) {
      if (isFirstLogin) {
        navigate('/profile', { replace: true })
      } else {
        navigate('/', { replace: true })
      }
    }
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
            AI 马拉松训练分析平台
          </p>
        </div>

        {/* Login Form */}
        <div className="data-card p-stack-lg rounded-xl">
          <h2 className="font-headline-md text-headline-md text-text-primary mb-6 text-center">
            登录账号
          </h2>

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

            {/* Password */}
            <div>
              <label className="font-body-sm font-medium text-text-primary mb-1.5 block">
                密码
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
                  lock
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-10 pr-10 py-2.5 bg-surface-container-low border rounded-lg text-text-primary focus:ring-2 focus:ring-primary outline-none transition-all font-body-sm ${
                    localErrors.password ? 'border-status-danger' : 'border-border-subtle'
                  }`}
                  placeholder="输入密码"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              {localErrors.password && (
                <p className="text-xs text-status-danger mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">error</span>
                  {localErrors.password}
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
                  登录中...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">login</span>
                  登录
                </>
              )}
            </button>
          </form>

          {/* Links */}
          <div className="mt-6 pt-4 border-t border-border-subtle text-center">
            <p className="text-sm text-secondary">
              还没有账号？{' '}
              <Link to="/register" className="text-primary hover:underline font-medium">
                立即注册
              </Link>
            </p>
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