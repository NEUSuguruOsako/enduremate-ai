import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNotification } from '../context/NotificationContext'

export default function OnboardingGuide() {
  const { isFirstLogin, setFirstLoginComplete } = useAuth()
  const { success } = useNotification()
  const [showWelcome, setShowWelcome] = useState(false)

  useEffect(() => {
    if (isFirstLogin) {
      const timer = setTimeout(() => {
        setShowWelcome(true)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [isFirstLogin])

  const handleClose = () => {
    setShowWelcome(false)
    setFirstLoginComplete()
    success('欢迎使用 EndureMate AI！', '开始完善您的个人档案，获取专属训练建议。')
  }

  if (!isFirstLogin) return null

  return (
    <>
      {/* 遮罩层 */}
      <div
        className={`fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          showWelcome ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleClose}
      />

      {/* 欢迎弹窗 */}
      <div
        className={`fixed z-50 max-w-md mx-4 transition-all duration-300 ${
          showWelcome ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div className="bg-surface rounded-2xl shadow-2xl overflow-hidden">
          {/* 头部 */}
          <div className="bg-gradient-to-r from-primary to-primary-container px-6 py-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-on-primary/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                welcome
              </span>
            </div>
            <h3 className="font-headline-xl text-on-primary font-bold mb-2">
              欢迎！
            </h3>
            <p className="font-body-sm text-on-primary/80">
              很高兴您加入 EndureMate AI
            </p>
          </div>

          {/* 内容 */}
          <div className="p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary text-[20px]">person</span>
              </div>
              <div>
                <h4 className="font-headline-sm text-text-primary font-semibold mb-1">完善个人档案</h4>
                <p className="font-body-sm text-text-secondary">
                  请先填写您的基本信息，包括姓名、年龄、身高、体重等。这些信息将帮助系统为您生成更精准的训练建议和个性化训练计划。
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 rounded-xl bg-status-success/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-status-success text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>target</span>
              </div>
              <div>
                <h4 className="font-headline-sm text-text-primary font-semibold mb-1">设置备赛目标</h4>
                <p className="font-body-sm text-text-secondary">
                  选择您的跑步目标（如5K、10K、半马、全马等），系统将根据您的目标制定专属训练计划。
                </p>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="w-full py-3 bg-primary text-on-primary rounded-lg font-semibold text-sm hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer border-none flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">rocket</span>
              开始训练之旅
            </button>
          </div>
        </div>
      </div>
    </>
  )
}