import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'

export interface UserSettings {
  theme: 'light' | 'dark' | 'system'
  notifications: {
    trainingReminders: boolean
    injuryAlerts: boolean
    weeklySummary: boolean
  }
}

const defaultSettings: UserSettings = {
  theme: 'light',
  notifications: {
    trainingReminders: true,
    injuryAlerts: true,
    weeklySummary: true,
  },
}

interface SettingsContextValue {
  settings: UserSettings
  updateSettings: (updates: Partial<UserSettings>) => void
  updateNotificationSetting: (key: keyof UserSettings['notifications'], value: boolean) => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  currentTheme: 'light' | 'dark'
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined)

const STORAGE_KEY = 'enduremate_settings'

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings)
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light')

  // 加载保存的设置
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setSettings(JSON.parse(stored))
      } catch {
        setSettings(defaultSettings)
      }
    }
  }, [])

  // 应用主题
  useEffect(() => {
    let themeToApply: 'light' | 'dark' = settings.theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : settings.theme

    setCurrentTheme(themeToApply)
    
    if (themeToApply === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [settings.theme])

  // 监听系统主题变化
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (settings.theme === 'system') {
        const newTheme = mediaQuery.matches ? 'dark' : 'light'
        setCurrentTheme(newTheme)
        document.documentElement.classList.toggle('dark', newTheme === 'dark')
      }
    }
    
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [settings.theme])

  const saveSettings = useCallback((newSettings: UserSettings) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings))
  }, [])

  const updateSettings = useCallback((updates: Partial<UserSettings>) => {
    setSettings((prev) => {
      const newSettings = { ...prev, ...updates }
      saveSettings(newSettings)
      return newSettings
    })
  }, [saveSettings])

  const updateNotificationSetting = useCallback((key: keyof UserSettings['notifications'], value: boolean) => {
    setSettings((prev) => {
      const newSettings = {
        ...prev,
        notifications: {
          ...prev.notifications,
          [key]: value,
        },
      }
      saveSettings(newSettings)
      return newSettings
    })
  }, [saveSettings])

  const setTheme = useCallback((theme: 'light' | 'dark' | 'system') => {
    setSettings((prev) => {
      const newSettings = { ...prev, theme }
      saveSettings(newSettings)
      return newSettings
    })
  }, [saveSettings])

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        updateNotificationSetting,
        setTheme,
        currentTheme,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}