import { useState, useRef } from 'react'
import { useAppContext } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../context/SettingsContext'
import { useNotification } from '../context/NotificationContext'
import PrivacyBanner from '../components/PrivacyBanner'
import ApiKeyConfig from '../components/ApiKeyConfig'

export default function Settings() {
  const { profile, updateProfile } = useAppContext()
  const { user, updateUser, changePassword } = useAuth()
  const { settings, setTheme, updateNotificationSetting } = useSettings()
  const { success, error } = useNotification()
  
  const [displayName, setDisplayName] = useState(profile.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [avatar, setAvatar] = useState(profile.avatar || '')
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [showChangeEmail, setShowChangeEmail] = useState(false)
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  })
  const [newEmail, setNewEmail] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    setTheme(theme)
    success(`已切换到${theme === 'light' ? '亮色' : theme === 'dark' ? '暗色' : '跟随系统'}模式`)
  }

  const handleNotificationToggle = (key: 'trainingReminders' | 'injuryAlerts' | 'weeklySummary') => {
    const newValue = !settings.notifications[key]
    updateNotificationSetting(key, newValue)
    success(newValue ? '通知已开启' : '通知已关闭')
  }

  const handleNameSave = () => {
    if (displayName.trim()) {
      updateProfile({ name: displayName })
      updateUser({ name: displayName })
      success('昵称已修改')
    }
  }

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const result = event.target?.result as string
        setAvatar(result)
        updateProfile({ avatar: result })
        success('头像已更新')
      }
      reader.readAsDataURL(file)
    }
  }

  const handlePasswordChange = async () => {
    if (!passwords.current) {
      error('请输入当前密码')
      return
    }
    if (!passwords.new) {
      error('请输入新密码')
      return
    }
    if (passwords.new !== passwords.confirm) {
      error('两次输入的密码不一致')
      return
    }
    if (passwords.new.length < 6) {
      error('新密码至少需要6个字符')
      return
    }
    if (passwords.current === passwords.new) {
      error('新密码不能与当前密码相同')
      return
    }
    
    const result = await changePassword(passwords.current, passwords.new)
    if (result) {
      success('密码已修改', '您的密码已成功更新')
      setShowChangePassword(false)
      setPasswords({ current: '', new: '', confirm: '' })
    } else {
      error('密码修改失败，请检查当前密码是否正确')
    }
  }

  const handleEmailChange = () => {
    if (!newEmail) {
      error('请输入新邮箱地址')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      error('请输入有效的邮箱地址')
      return
    }
    
    setEmail(newEmail)
    updateUser({ email: newEmail })
    success('邮箱已修改', '您的邮箱地址已更新')
    setShowChangeEmail(false)
    setNewEmail('')
  }

  return (
    <div className="p-stack-lg">
      <h2 className="font-headline-xl text-headline-xl-mobile md:text-headline-xl text-text-primary mb-8">
        设置
      </h2>

      {/* Personal Profile Section - First */}
      <div className="col-span-12 p-stack-lg data-card mb-6">
        <h3 className="font-headline-md text-text-primary font-semibold mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">person</span>
          个人档案
        </h3>
        
        {/* Avatar Section */}
        <div className="flex items-center gap-6 mb-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-surface-container-high overflow-hidden border-2 border-border-subtle">
              {avatar ? (
                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/10">
                  <span className="material-symbols-outlined text-primary text-[36px]">person</span>
                </div>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-on-primary shadow-lg hover:brightness-110 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">camera_alt</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>
          <div>
            <p className="font-body-sm text-secondary mb-1">头像</p>
            <p className="font-body-xs text-outline-variant">支持 JPG、PNG 格式，建议尺寸 200x200</p>
          </div>
        </div>

        {/* Name Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="font-body-sm text-text-primary font-medium mb-2 block">昵称</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="flex-1 px-4 py-3 bg-surface-container-low border border-border-subtle rounded-xl text-text-primary focus:ring-2 focus:ring-primary outline-none transition-all font-body-sm"
                placeholder="输入您的昵称"
              />
              <button
                onClick={handleNameSave}
                className="px-4 py-3 bg-primary text-on-primary rounded-xl font-medium hover:brightness-110 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">save</span>
              </button>
            </div>
          </div>

          {/* Email Section */}
          <div>
            <label className="font-body-sm text-text-primary font-medium mb-2 block">邮箱地址</label>
            {showChangeEmail ? (
              <div className="flex gap-2">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="flex-1 px-4 py-3 bg-surface-container-low border border-border-subtle rounded-xl text-text-primary focus:ring-2 focus:ring-primary outline-none transition-all font-body-sm"
                  placeholder="输入新邮箱"
                  autoFocus
                />
                <button
                  onClick={handleEmailChange}
                  className="px-4 py-3 bg-primary text-on-primary rounded-xl font-medium hover:brightness-110 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">check</span>
                </button>
                <button
                  onClick={() => {
                    setShowChangeEmail(false)
                    setNewEmail('')
                  }}
                  className="px-4 py-3 bg-surface-container border border-border-subtle rounded-xl font-medium text-text-primary hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  className="flex-1 px-4 py-3 bg-surface-container-low border border-border-subtle rounded-xl text-text-primary focus:ring-2 focus:ring-primary outline-none transition-all font-body-sm"
                  disabled
                />
                <button
                  onClick={() => setShowChangeEmail(true)}
                  className="px-4 py-3 bg-surface-container border border-border-subtle rounded-xl font-medium text-text-primary hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Password Section */}
        <div>
          {showChangePassword ? (
            <div className="bg-surface-container-low rounded-xl p-4 mb-4">
              <h4 className="font-body-sm font-medium text-text-primary mb-4">修改密码</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="font-body-xs text-secondary mb-1 block">当前密码</label>
                  <input
                    type="password"
                    value={passwords.current}
                    onChange={(e) => setPasswords((prev) => ({ ...prev, current: e.target.value }))}
                    className="w-full px-4 py-2 bg-surface border border-border-subtle rounded-lg text-text-primary focus:ring-1 focus:ring-primary outline-none transition-all font-body-sm"
                    placeholder="当前密码"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="font-body-xs text-secondary mb-1 block">新密码</label>
                  <input
                    type="password"
                    value={passwords.new}
                    onChange={(e) => setPasswords((prev) => ({ ...prev, new: e.target.value }))}
                    className="w-full px-4 py-2 bg-surface border border-border-subtle rounded-lg text-text-primary focus:ring-1 focus:ring-primary outline-none transition-all font-body-sm"
                    placeholder="新密码"
                  />
                </div>
                <div>
                  <label className="font-body-xs text-secondary mb-1 block">确认密码</label>
                  <input
                    type="password"
                    value={passwords.confirm}
                    onChange={(e) => setPasswords((prev) => ({ ...prev, confirm: e.target.value }))}
                    className="w-full px-4 py-2 bg-surface border border-border-subtle rounded-lg text-text-primary focus:ring-1 focus:ring-primary outline-none transition-all font-body-sm"
                    placeholder="确认密码"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handlePasswordChange}
                  className="px-4 py-2 bg-primary text-on-primary rounded-lg font-medium hover:brightness-110 transition-colors cursor-pointer"
                >
                  确认修改
                </button>
                <button
                  onClick={() => {
                    setShowChangePassword(false)
                    setPasswords({ current: '', new: '', confirm: '' })
                  }}
                  className="px-4 py-2 bg-surface-container border border-border-subtle rounded-lg font-medium text-text-primary hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  取消
                </button>
              </div>
            </div>
          ) : null}

          <button
            onClick={() => setShowChangePassword(true)}
            className="w-full py-3 bg-surface-container border border-border-subtle rounded-xl font-medium text-text-primary hover:bg-surface-container-high transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">lock</span>
            修改密码
          </button>
        </div>
      </div>

      {/* Appearance Settings */}
      <div className="col-span-12 p-stack-lg data-card mb-6">
        <h3 className="font-headline-md text-text-primary font-semibold mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">palette</span>
          外观设置
        </h3>
        <div className="flex gap-4">
          <button
            onClick={() => handleThemeChange('light')}
            className={`flex-1 p-4 rounded-xl border-2 transition-all cursor-pointer ${
              settings.theme === 'light'
                ? 'border-primary bg-primary/5'
                : 'border-border-subtle hover:border-border'
            }`}
          >
            <div className="flex items-center justify-center mb-2">
              <span className="material-symbols-outlined text-[32px]">sunny</span>
            </div>
            <p className="font-body-sm text-text-primary font-medium">亮色模式</p>
            <p className="font-body-xs text-secondary">适合白天使用</p>
          </button>
          <button
            onClick={() => handleThemeChange('dark')}
            className={`flex-1 p-4 rounded-xl border-2 transition-all cursor-pointer ${
              settings.theme === 'dark'
                ? 'border-primary bg-primary/5'
                : 'border-border-subtle hover:border-border'
            }`}
          >
            <div className="flex items-center justify-center mb-2">
              <span className="material-symbols-outlined text-[32px]">dark_mode</span>
            </div>
            <p className="font-body-sm text-text-primary font-medium">暗色模式</p>
            <p className="font-body-xs text-secondary">适合夜间使用</p>
          </button>
          <button
            onClick={() => handleThemeChange('system')}
            className={`flex-1 p-4 rounded-xl border-2 transition-all cursor-pointer ${
              settings.theme === 'system'
                ? 'border-primary bg-primary/5'
                : 'border-border-subtle hover:border-border'
            }`}
          >
            <div className="flex items-center justify-center mb-2">
              <span className="material-symbols-outlined text-[32px]">phone_iphone</span>
            </div>
            <p className="font-body-sm text-text-primary font-medium">跟随系统</p>
            <p className="font-body-xs text-secondary">自动切换</p>
          </button>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="col-span-12 p-stack-lg data-card mb-6">
        <h3 className="font-headline-md text-text-primary font-semibold mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">notifications</span>
          通知设置
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl">
            <div>
              <p className="font-body-sm text-text-primary font-medium">训练提醒</p>
              <p className="font-body-xs text-secondary">接收每日训练计划提醒</p>
            </div>
            <button
              onClick={() => handleNotificationToggle('trainingReminders')}
              className={`w-12 h-7 rounded-full transition-colors cursor-pointer relative ${
                settings.notifications.trainingReminders ? 'bg-primary' : 'bg-surface-container-high'
              }`}
            >
              <span
                className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  settings.notifications.trainingReminders ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl">
            <div>
              <p className="font-body-sm text-text-primary font-medium">伤病预警</p>
              <p className="font-body-xs text-secondary">当检测到训练风险时接收警告</p>
            </div>
            <button
              onClick={() => handleNotificationToggle('injuryAlerts')}
              className={`w-12 h-7 rounded-full transition-colors cursor-pointer relative ${
                settings.notifications.injuryAlerts ? 'bg-primary' : 'bg-surface-container-high'
              }`}
            >
              <span
                className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  settings.notifications.injuryAlerts ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl">
            <div>
              <p className="font-body-sm text-text-primary font-medium">周报摘要</p>
              <p className="font-body-xs text-secondary">每周接收训练总结报告</p>
            </div>
            <button
              onClick={() => handleNotificationToggle('weeklySummary')}
              className={`w-12 h-7 rounded-full transition-colors cursor-pointer relative ${
                settings.notifications.weeklySummary ? 'bg-primary' : 'bg-surface-container-high'
              }`}
            >
              <span
                className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  settings.notifications.weeklySummary ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* AI API 配置 */}
      <div className="col-span-12 p-stack-lg data-card mb-6">
        <h3 className="font-headline-md text-text-primary font-semibold mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">smart_toy</span>
          AI 服务配置
        </h3>
        <p className="text-sm text-secondary mb-4">
          配置你自有的 API Key 以启用 AI 智能对话。Key 仅存储在你的设备本地。
        </p>
        <ApiKeyConfig />
      </div>

      {/* 隐私声明 */}
      <div className="col-span-12 mb-6">
        <PrivacyBanner variant="inline" />
      </div>
    </div>
  )
}