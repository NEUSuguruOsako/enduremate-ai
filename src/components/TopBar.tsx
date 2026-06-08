import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'

// ========================
// Tab configuration per route
// ========================

interface TabConfig {
  route: string
  tabs: string[]
  activeDefault: number
}

const routeTabs: TabConfig[] = [
  { route: '/', tabs: ['总览', '指标', '洞察'], activeDefault: 0 },
  { route: '/training', tabs: ['课表', '阶段', '历史'], activeDefault: 0 },
  { route: '/analysis', tabs: ['总览', '指标', '洞察'], activeDefault: 1 },
  { route: '/profile', tabs: ['档案', '目标', '数据'], activeDefault: 0 },
]

// ========================
// Search navigation items
// ========================

const pageNavItems = [
  { label: '仪表盘', path: '/', icon: 'dashboard' },
  { label: '训练计划', path: '/training', icon: 'fitness_center' },
  { label: '分析中心', path: '/analysis', icon: 'analytics' },
  { label: '个人档案', path: '/profile', icon: 'person' },
]

const quickMetrics = [
  { label: '体能CTL', value: '78' },
  { label: '疲劳ATL', value: '43' },
  { label: '伤病风险', value: '低风险' },
  { label: 'VDOT', value: '52.4' },
  { label: '本周跑量', value: '44km' },
]

const notifications = [
  {
    id: 1,
    type: 'warning' as const,
    text: '提醒：明日有间歇训练，建议充分休息',
    time: '2小时前',
  },
  {
    id: 2,
    type: 'alert' as const,
    text: '警告：本周跑量增幅超过10%，请注意',
    time: '5小时前',
  },
  {
    id: 3,
    type: 'celebration' as const,
    text: '成就：连续训练4周达成！',
    time: '昨天',
  },
  {
    id: 4,
    type: 'info' as const,
    text: '提示：距离目标赛事还有8周',
    time: '2天前',
  },
]

function getNotificationIcon(type: string) {
  switch (type) {
    case 'warning':
      return 'warning'
    case 'alert':
      return 'error'
    case 'celebration':
      return 'emoji_events'
    case 'info':
      return 'info'
    default:
      return 'notifications'
  }
}

export default function TopBar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { trainings, unreadNotifications, setUnreadNotifications, profile } = useAppContext()

  // ---- Sync state ----
  const [syncing, setSyncing] = useState(false)
  const [synced, setSynced] = useState(false)
  const [syncToast, setSyncToast] = useState(false)

  // ---- Search state ----
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // ---- Notification state ----
  const [showNotifDropdown, setShowNotifDropdown] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  // ---- Avatar state ----
  const [showAvatarDropdown, setShowAvatarDropdown] = useState(false)
  const avatarRef = useRef<HTMLDivElement>(null)

  // ---- Tab state ----
  const currentTabConfig = routeTabs.find((t) => t.route === location.pathname) || routeTabs[0]
  const [activeTab, setActiveTab] = useState(currentTabConfig.activeDefault)

  // Sync tab when route changes
  useEffect(() => {
    const config = routeTabs.find((t) => t.route === location.pathname)
    if (config) {
      setActiveTab(config.activeDefault)
    }
  }, [location.pathname])

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifDropdown(false)
      }
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setShowAvatarDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Escape key closes all dropdowns
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setShowSearchDropdown(false)
        setShowNotifDropdown(false)
        setShowAvatarDropdown(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  // ---- Handlers ----

  const handleSync = () => {
    if (syncing) return
    setSyncing(true)
    setTimeout(() => {
      setSyncing(false)
      setSynced(true)
      setSyncToast(true)
      setTimeout(() => {
        setSyncToast(false)
        setSynced(false)
      }, 3000)
    }, 1500)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setSearchQuery(val)
    setShowSearchDropdown(val.length > 1)
  }

  const handleSearchNav = (path: string) => {
    navigate(path)
    setSearchQuery('')
    setShowSearchDropdown(false)
  }

  const markAllRead = () => {
    setUnreadNotifications(0)
  }

  // Filter logic for search results
  const filteredPages = searchQuery.length > 1
    ? pageNavItems.filter((p) => p.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : pageNavItems

  const filteredMetrics = searchQuery.length > 1
    ? quickMetrics.filter((m) =>
        m.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.value.includes(searchQuery),
      )
    : quickMetrics

  const filteredTrainings = searchQuery.length > 1
    ? trainings.filter(
        (t) =>
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.day.includes(searchQuery),
      )
    : trainings.slice(0, 5)

  const hasResults =
    filteredPages.length > 0 ||
    filteredMetrics.length > 0 ||
    filteredTrainings.length > 0

  return (
    <header className="h-16 flex justify-between items-center px-margin-desktop sticky top-0 bg-surface/90 backdrop-blur-sm z-40 border-b border-border-subtle/50">
      <div className="flex items-center gap-8">
        {/* ===== Feature 1: Functional Search Bar ===== */}
        <div className="relative hidden md:block" ref={searchRef}>
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant text-[20px]">
            search
          </span>
          <input
            className="bg-surface-container-low border-none rounded-full pl-10 pr-4 py-1.5 w-64 text-body-sm focus:ring-1 focus:ring-primary outline-none"
            placeholder="搜索指标或洞察..."
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => searchQuery.length > 1 && setShowSearchDropdown(true)}
          />

          {/* Search Dropdown */}
          {showSearchDropdown && (
            <div className="absolute top-full left-0 mt-2 w-80 max-h-80 overflow-y-auto bg-surface rounded-lg shadow-lg border border-border-subtle z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              {!hasResults ? (
                <div className="p-6 text-center text-secondary text-sm">
                  未找到相关内容
                </div>
              ) : (
                <div className="py-2">
                  {/* Page Navigation Section */}
                  {filteredPages.length > 0 && (
                    <div className="px-3 py-2">
                      <p className="text-[11px] font-semibold text-outline-variant uppercase tracking-wider mb-1.5">
                        页面导航
                      </p>
                      {filteredPages.map((item) => (
                        <button
                          key={item.path}
                          onClick={() => handleSearchNav(item.path)}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-surface-container transition-colors text-left"
                        >
                          <span className="material-symbols-outlined text-[18px] text-secondary">
                            {item.icon}
                          </span>
                          <span className="text-sm text-text-primary">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Quick Metrics Section */}
                  {filteredMetrics.length > 0 && (
                    <div className="px-3 py-2 border-t border-border-subtle">
                      <p className="text-[11px] font-semibold text-outline-variant uppercase tracking-wider mb-1.5">
                        快速指标
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {filteredMetrics.map((metric) => (
                          <button
                            key={metric.label}
                            onClick={() => {
                              setSearchQuery('')
                              setShowSearchDropdown(false)
                            }}
                            className="px-2.5 py-1 bg-surface-container rounded-full text-xs font-medium text-text-primary hover:bg-primary-container/20 hover:text-primary-container transition-colors"
                          >
                            {metric.label}: <span className="font-semibold data-font">{metric.value}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Training Section */}
                  {filteredTrainings.length > 0 && (
                    <div className="px-3 py-2 border-t border-border-subtle">
                      <p className="text-[11px] font-semibold text-outline-variant uppercase tracking-wider mb-1.5">
                        最近训练
                      </p>
                      {filteredTrainings.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => {
                            setSearchQuery('')
                            setShowSearchDropdown(false)
                            navigate('/training')
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-surface-container transition-colors text-left"
                        >
                          <span className="text-sm text-text-primary truncate">{t.title}</span>
                          <span className="text-xs text-secondary shrink-0 ml-2">{t.day}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ===== Feature 2: Page-Aware Tab Navigation ===== */}
        <nav className="hidden md:flex items-center gap-1">
          {currentTabConfig.tabs.map((tab, idx) => (
            <button
              key={tab}
              onClick={() => setActiveTab(idx)}
              className={`px-3 py-1.5 text-sm font-medium transition-all relative ${
                activeTab === idx
                  ? 'text-primary'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              {tab}
              {activeTab === idx && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        {/* ===== Feature 5: Enhanced Sync Button with Toast ===== */}
        <button
          onClick={handleSync}
          className={`bg-primary text-on-primary px-4 py-1.5 rounded text-body-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 ${syncing ? 'opacity-80' : ''}`}
        >
          <span className={`material-symbols-outlined text-[18px] ${syncing ? 'animate-spin' : ''}`}>
            {syncing ? 'sync' : synced ? 'check' : 'sync'}
          </span>
          {syncing ? '同步中...' : synced ? '已同步' : '同步手表'}
        </button>

        {/* Sync Toast */}
        {syncToast && (
          <div className="fixed top-20 right-6 z-50 animate-in slide-in-from-right-4 fade-in duration-300">
            <div className="bg-status-success text-on-success px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              同步完成：新增 2 条训练记录
            </div>
          </div>
        )}

        {/* ===== Feature 3: Notification Dropdown ===== */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setShowNotifDropdown(!showNotifDropdown)
              setShowAvatarDropdown(false)
              setShowSearchDropdown(false)
            }}
            className="w-9 h-9 flex items-center justify-center text-on-surface-variant hover:bg-surface-container rounded-full transition-colors relative"
          >
            <span className="material-symbols-outlined">notifications</span>
            {unreadNotifications > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full animate-pulse" />
            )}
          </button>

          {showNotifDropdown && (
            <div className="absolute top-full right-0 mt-2 w-80 bg-surface rounded-lg shadow-xl border border-border-subtle z-50 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
                <h3 className="font-headline-sm text-[14px] font-bold text-text-primary">
                  通知 ({unreadNotifications})
                </h3>
              </div>

              {/* Notification Items */}
              <div className="max-h-72 overflow-y-auto">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-surface-container-low transition-colors cursor-pointer border-b border-border-subtle last:border-0"
                  >
                    <span
                      className={`material-symbols-outlined text-[20px] mt-0.5 shrink-0 ${
                        n.type === 'warning'
                          ? 'text-status-warning'
                          : n.type === 'alert'
                          ? 'text-error'
                          : n.type === 'celebration'
                          ? 'text-[#F59E0B]'
                          : 'text-primary'
                      }`}
                    >
                      {getNotificationIcon(n.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary leading-snug">{n.text}</p>
                      <p className="text-xs text-outline-variant mt-1">{n.time}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 border-t border-border-subtle">
                <button
                  onClick={markAllRead}
                  className="w-full text-center text-xs font-medium text-primary hover:text-primary/80 transition-colors py-1"
                >
                  全部已读
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ===== Feature 4: Avatar Dropdown Menu ===== */}
        <div className="relative" ref={avatarRef}>
          <div
            onClick={() => {
              setShowAvatarDropdown(!showAvatarDropdown)
              setShowNotifDropdown(false)
              setShowSearchDropdown(false)
            }}
            className="h-8 w-8 rounded-full bg-surface-container-high overflow-hidden border border-border-subtle cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all"
          >
            <img
              alt="User avatar"
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBj3wH50-itZZfl3N7xsZ7RCtDm4rWdFyBdlgjXl-MtaFCDRT_4IKsNu2anviHrC3VZgIle3i5fQ_nfX-h7fjDcCaBwWbNurUd2HqHlMZRol3Kh0BpecV0bPPZDDheLd5oAR_dWsvgvju7zIVNKAaDQMOT0GZFsZO7fc9qsjigUtTNxpl1godNBl4n3niNGHbXltBp1Ire5bKWIQ0y64oFht8QslOHLR2PYGelRG6TLROHvrRL16RoyE4bDQy_pB3juJcdX2bjk3Vo"
            />
          </div>

          {showAvatarDropdown && (
            <div className="absolute top-full right-0 mt-2 w-56 bg-surface rounded-lg shadow-xl border border-border-subtle z-50 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
              {/* User Info Header */}
              <div className="px-4 py-3 border-b border-border-subtle">
                <p className="font-headline-sm text-[14px] font-bold text-text-primary">
                  {profile.name}
                </p>
                <p className="text-xs text-secondary">biao@enduremate.ai</p>
              </div>

              {/* Menu Items */}
              <div className="py-1">
                <button
                  onClick={() => {
                    navigate('/profile')
                    setShowAvatarDropdown(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-primary hover:bg-surface-container transition-colors text-left"
                >
                  <span className="material-symbols-outlined text-[18px] text-secondary">person</span>
                  个人档案
                </button>
                <button
                  onClick={() => setShowAvatarDropdown(false)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-primary hover:bg-surface-container transition-colors text-left"
                >
                  <span className="material-symbols-outlined text-[18px] text-secondary">settings</span>
                  账户设置
                </button>
                <button
                  onClick={() => setShowAvatarDropdown(false)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-error hover:bg-error/5 transition-colors text-left"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                  退出登录
                </button>
              </div>

              {/* Divider + Version */}
              <div className="border-t border-border-subtle px-4 py-2">
                <p className="text-[11px] text-outline-variant text-center">v1.0.0</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
