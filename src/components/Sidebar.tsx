import { NavLink, useLocation } from 'react-router-dom'

const navItems = [
  { path: '/', icon: 'dashboard', label: '仪表盘' },
  { path: '/training', icon: 'calendar_today', label: '训练计划' },
  { path: '/analysis', icon: 'analytics', label: '分析中心' },
  { path: '/detail', icon: 'fitness_center', label: '训练详情' },
  { path: '/profile', icon: 'person', label: '个人档案' },
]

export default function Sidebar() {
  const location = useLocation()

  return (
    <aside className="fixed left-0 top-0 h-screen w-[260px] bg-surface-container-lowest border-r border-border-subtle flex flex-col p-stack-md z-50">
      {/* Logo */}
      <div className="mb-stack-lg px-2 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
          <svg
            width="34"
            height="34"
            viewBox="0 0 34 34"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* 跑道外圈 */}
            <path
              d="M8 6H22C27 6 30 9 30 14C30 19 27 22 22 22H12"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
            />

            {/* 跑道内圈 */}
            <path
              d="M8 12H20C23 12 25 14 25 17C25 20 23 22 20 22H12"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              opacity="0.7"
            />

            {/* AI 闪电 */}
            <path
              d="M16 16L21 16L18 22L24 22L14 30L17 24L12 24L16 16Z"
              fill="white"
            />
          </svg>
        </div>
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
        <button className="mb-4 bg-primary text-on-primary py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 font-body-md hover:bg-primary-container transition-all active:scale-[0.98] shadow-sm">
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
          问问 AI 助手
        </button>
        <a href="#" className="flex items-center gap-3 px-4 py-2 rounded text-secondary hover:text-primary hover:bg-surface-container transition-colors">
          <span className="material-symbols-outlined">settings</span>
          <span className="font-body-md">设置</span>
        </a>
        <a href="#" className="flex items-center gap-3 px-4 py-2 rounded text-secondary hover:text-primary hover:bg-surface-container transition-colors">
          <span className="material-symbols-outlined">help</span>
          <span className="font-body-md">帮助</span>
        </a>
      </div>
    </aside>
  )
}
