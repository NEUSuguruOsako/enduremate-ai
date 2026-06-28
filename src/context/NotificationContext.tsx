import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react'

// ========================
// 类型定义
// ========================

export type NotificationType = 'success' | 'warning' | 'error' | 'info'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message?: string
  duration?: number // 自动关闭时间（毫秒），0 表示不自动关闭
  icon?: string
  action?: {
    label: string
    onClick: () => void
  }
}

interface NotificationContextValue {
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, 'id'>) => string
  removeNotification: (id: string) => void
  clearAllNotifications: () => void
  // 快捷方法
  success: (title: string, message?: string) => string
  warning: (title: string, message?: string) => string
  error: (title: string, message?: string) => string
  info: (title: string, message?: string) => string
}

// ========================
// Context 创建
// ========================

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined)

let notificationIdCounter = 0

function generateNotificationId(): string {
  return `notif_${Date.now()}_${++notificationIdCounter}`
}

const DEFAULT_DURATION = 5000 // 5秒

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  // 添加通知
  const addNotification = useCallback(
    (notification: Omit<Notification, 'id'>): string => {
      const id = generateNotificationId()
      const newNotification: Notification = {
        ...notification,
        id,
        duration: notification.duration ?? DEFAULT_DURATION,
      }

      setNotifications((prev) => [...prev, newNotification])

      return id
    },
    []
  )

  // 移除通知
  const removeNotification = useCallback((id: string): void => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  // 清除所有通知
  const clearAllNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  // 快捷方法
  const success = useCallback(
    (title: string, message?: string): string => {
      return addNotification({ type: 'success', title, message, icon: 'check_circle' })
    },
    [addNotification]
  )

  const warning = useCallback(
    (title: string, message?: string): string => {
      return addNotification({ type: 'warning', title, message, icon: 'warning' })
    },
    [addNotification]
  )

  const error = useCallback(
    (title: string, message?: string): string => {
      return addNotification({ type: 'error', title, message, icon: 'error', duration: 8000 }) // 错误通知8秒后自动关闭
    },
    [addNotification]
  )

  const info = useCallback(
    (title: string, message?: string): string => {
      return addNotification({ type: 'info', title, message, icon: 'info' })
    },
    [addNotification]
  )

  // 自动关闭通知
  useEffect(() => {
    const timers: Map<string, ReturnType<typeof setTimeout>> = new Map()

    notifications.forEach((notification) => {
      if (notification.duration && notification.duration > 0) {
        const timer = setTimeout(() => {
          removeNotification(notification.id)
        }, notification.duration)
        timers.set(notification.id, timer)
      }
    })

    return () => {
      timers.forEach((timer) => clearTimeout(timer))
    }
  }, [notifications, removeNotification])

  const value: NotificationContextValue = {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
    success,
    warning,
    error,
    info,
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  )
}

// ========================
// 通知容器组件
// ========================

function NotificationContainer() {
  const { notifications, removeNotification } = useNotification()

  if (notifications.length === 0) return null

  return (
    <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2 max-w-xs">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  )
}

// ========================
// 单个通知组件
// ========================

interface NotificationItemProps {
  notification: Notification
  onClose: () => void
}

function NotificationItem({ notification, onClose }: NotificationItemProps) {
  const typeStyles: Record<NotificationType, { bg: string; textColor: string }> = {
    success: {
      bg: 'bg-green-100',
      textColor: 'text-green-700',
    },
    warning: {
      bg: 'bg-yellow-100',
      textColor: 'text-yellow-700',
    },
    error: {
      bg: 'bg-red-100',
      textColor: 'text-red-700',
    },
    info: {
      bg: 'bg-blue-100',
      textColor: 'text-blue-700',
    },
  }

  const styles = typeStyles[notification.type]

  return (
    <div
      className={`${styles.bg} ${styles.textColor} rounded-lg px-3 py-2 shadow-sm animate-in slide-in-from-right duration-200`}
      role="alert"
    >
      <div className="flex items-center gap-2">
        <span
          className="material-symbols-outlined text-[14px]"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {notification.type === 'success' ? 'check' : notification.type === 'error' ? 'error' : notification.type === 'warning' ? 'warning' : 'info'}
        </span>
        <span className="text-sm font-medium">{notification.title}</span>
        <button
          onClick={onClose}
          className="ml-auto opacity-60 hover:opacity-100 transition-opacity cursor-pointer bg-transparent border-none"
          aria-label="关闭通知"
        >
          <span className="material-symbols-outlined text-[12px]">close</span>
        </button>
      </div>
    </div>
  )
}

// ========================
// Hook
// ========================

export function useNotification(): NotificationContextValue {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return context
}