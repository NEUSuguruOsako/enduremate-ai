import { NavLink, useLocation } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import BrandLogo from './BrandLogo'

const navItems = [
  { path: '/', icon: 'dashboard', label: '仪表盘' },
  { path: '/training', icon: 'calendar_today', label: '训练计划' },
  { path: '/analysis', icon: 'analytics', label: '分析中心' },
  { path: '/detail', icon: 'fitness_center', label: '训练详情' },
  { path: '/profile', icon: 'person', label: '个人档案' },
]

const bottomItems = [
  { path: '/settings', icon: 'settings', label: '设置' },
  { path: '/privacy', icon: 'shield_lock', label: '隐私' },
  { path: '/help', icon: 'help', label: '帮助' },
]

export default function Sidebar() {
  const location = useLocation()
  const { toggleAIChat } = useAppContext()

  return (
    <aside className="fixed left-0 top-0 h-screen w-[260px] bg-surface-container-lowest border-r border-border-subtle flex flex-col p-stack-md z-50">
      {/* Logo */}
      <div className="mb-stack-lg px-2 flex items-center gap-3">
        <BrandLogo size="sm" />
        <div>
          <h1 className="font-headline-lg text-headline-lg font-bold text-primary leading-tight">EndureMate AI</h1>
          <p className="font-label-caps text-[9px] text-secondary uppercase tracking-wider">ELITE PERFORMANCE</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded transition-colors duration-200 ${
                isActive
                  ? 'text-primary font-bold border-l-2 border-primary bg-surface-container-low'
                  : 'text-secondary hover:text-primary hover:bg-surface-container'
              }`}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
              >
                {item.icon}
              </span>
              <span className="font-body-md">{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="mt-auto flex flex-col gap-1 pt-stack-md border-t border-border-subtle">
        <button onClick={toggleAIChat} className="mb-4 bg-primary text-on-primary py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 font-body-md hover:bg-primary-container transition-all active:scale-[0.98] shadow-sm">
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
          问问 AI 助手
        </button>
        {bottomItems.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-2 rounded transition-colors ${
                isActive
                  ? 'text-primary font-bold'
                  : 'text-secondary hover:text-primary hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="font-body-md">{item.label}</span>
            </NavLink>
          )
        })}
      </div>
    </aside>
  )
}
