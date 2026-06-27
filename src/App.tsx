import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

// 懒加载页面组件（性能优化）
const Dashboard = lazy(() => import('./pages/Dashboard'))
const TrainingPlan = lazy(() => import('./pages/TrainingPlan'))
const AnalysisCenter = lazy(() => import('./pages/AnalysisCenter'))
const Profile = lazy(() => import('./pages/Profile'))
const TrainingDetail = lazy(() => import('./pages/TrainingDetail'))
const Settings = lazy(() => import('./pages/Settings'))
const Help = lazy(() => import('./pages/Help'))
const Privacy = lazy(() => import('./pages/Privacy'))

// 认证页面（不需要保护）
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))

/**
 * 加载状态组件
 */
function LoadingFallback() {
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

export default function App() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* 认证相关页面（无需登录） */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* 需要登录保护的主应用页面 */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/training" element={<TrainingPlan />} />
          <Route path="/analysis" element={<AnalysisCenter />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/detail" element={<TrainingDetail />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/help" element={<Help />} />
          <Route path="/privacy" element={<Privacy />} />
        </Route>

        {/* 404 重定向到首页 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}