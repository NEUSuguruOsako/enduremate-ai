import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
}

/**
 * 路由守卫组件
 * 用于保护需要登录才能访问的页面
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  // 加载中显示加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px] text-primary animate-spin">
              progress_activity
            </span>
          </div>
          <p className="text-sm text-secondary">加载中...</p>
        </div>
      </div>
    )
  }

  // 未登录则跳转到登录页，保存当前路径以便登录后返回
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  // 已登录则渲染子组件
  return <>{children}</>
}