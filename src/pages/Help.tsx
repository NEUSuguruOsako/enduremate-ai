import { useState } from 'react'

interface FAQItem {
  id: number
  question: string
  answer: string
}

const faqs: FAQItem[] = [
  {
    id: 1,
    question: '如何上传训练数据？',
    answer: '在「分析中心」页面，点击右上角的「上传文件」按钮，选择 FIT、GPX 或 TCX 格式的训练文件即可。系统会自动解析文件并导入训练数据。',
  },
  {
    id: 2,
    question: 'VDOT 指数是如何计算的？',
    answer: 'VDOT 指数基于您的比赛成绩或最近的训练数据计算得出。您可以在「个人档案」页面手动输入比赛成绩，或系统会根据您上传的训练记录自动测算。',
  },
  {
    id: 3,
    question: '训练计划是如何生成的？',
    answer: '系统根据您的个人资料（年龄、体重、跑龄）、VDOT 指数和备赛目标，结合科学的训练原则（渐进负荷、恢复周期、强度平衡）自动生成个性化训练计划。',
  },
  {
    id: 4,
    question: '伤病风险评估是如何工作的？',
    answer: '系统通过分析您的训练负荷变化（CTL/ATL）、训练量增幅、配速波动等指标，结合运动科学模型评估伤病风险，并提供相应的调整建议。',
  },
  {
    id: 5,
    question: '如何使用 AI 助手？',
    answer: '点击左侧边栏的「问问 AI 助手」按钮，即可打开 AI 聊天界面。您可以询问训练相关的问题，AI 助手会根据您的训练数据提供个性化建议。',
  },
  {
    id: 6,
    question: '数据如何同步到云端？',
    answer: '在「设置」页面开启「自动同步」功能后，您的训练数据会自动同步到云端，确保数据安全且可以跨设备访问。',
  },
]

const helpTopics = [
  {
    icon: 'fitness_center',
    title: '训练指导',
    description: '了解如何制定训练计划、追踪进度和优化表现',
    link: '#training',
  },
  {
    icon: 'bar_chart',
    title: '数据分析',
    description: '学习如何解读训练数据和性能指标',
    link: '#analysis',
  },
  {
    icon: 'shield',
    title: '伤病预防',
    description: '了解如何降低受伤风险和恢复训练',
    link: '#injury',
  },
  {
    icon: 'settings',
    title: '账户管理',
    description: '管理您的账户设置和数据隐私',
    link: '#account',
  },
]

export default function Help() {
  const [openFaq, setOpenFaq] = useState<number | null>(1)

  return (
    <div className="p-stack-lg">
      {/* Header */}
      <div className="mb-8">
        <h2 className="font-headline-xl text-headline-xl-mobile md:text-headline-xl text-text-primary mb-2">
          帮助中心
        </h2>
        <p className="font-body-md text-secondary">
          查找常见问题解答或联系我们获取帮助
        </p>
      </div>

      {/* Help Topics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {helpTopics.map((topic) => (
          <div
            key={topic.title}
            className="p-4 bg-surface-container-low rounded-xl border border-border-subtle hover:border-primary/50 transition-colors cursor-pointer"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-primary text-[20px]">{topic.icon}</span>
            </div>
            <h3 className="font-headline-sm text-text-primary font-semibold mb-1">
              {topic.title}
            </h3>
            <p className="font-body-xs text-secondary">{topic.description}</p>
          </div>
        ))}
      </div>

      {/* FAQ Section */}
      <div className="max-w-3xl">
        <h3 className="font-headline-md text-text-primary font-semibold mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">help_center</span>
          常见问题
        </h3>

        <div className="space-y-3">
          {faqs.map((faq) => (
            <div
              key={faq.id}
              className="bg-surface-container-low rounded-xl border border-border-subtle overflow-hidden"
            >
              <button
                onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-surface-container transition-colors cursor-pointer"
              >
                <span className="font-body-sm text-text-primary font-medium">{faq.question}</span>
                <span
                  className={`material-symbols-outlined text-secondary transition-transform ${
                    openFaq === faq.id ? 'rotate-180' : ''
                  }`}
                >
                  expand_more
                </span>
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openFaq === faq.id ? 'max-h-40' : 'max-h-0'
                }`}
              >
                <p className="px-4 pb-4 font-body-sm text-text-secondary leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contact Section */}
      <div className="mt-8 max-w-3xl p-6 bg-gradient-to-r from-primary/5 to-primary-container/5 rounded-xl border border-primary/20">
        <h3 className="font-headline-md text-text-primary font-semibold mb-2">
          仍有疑问？
        </h3>
        <p className="font-body-sm text-secondary mb-4">
          如果您没有找到需要的答案，可以通过以下方式联系我们：
        </p>
        <div className="flex flex-wrap gap-4">
          <a
            href="mailto:support@enduremate.ai"
            className="flex items-center gap-2 px-4 py-2 bg-surface rounded-lg text-text-primary hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">mail</span>
            发送邮件
          </a>
          <button className="flex items-center gap-2 px-4 py-2 bg-surface rounded-lg text-text-primary hover:bg-surface-container transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-[18px]">message</span>
            在线客服
          </button>
          <a
            href="#"
            className="flex items-center gap-2 px-4 py-2 bg-surface rounded-lg text-text-primary hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">file_copy</span>
            提交反馈
          </a>
        </div>
      </div>

      {/* Version Info */}
      <div className="mt-8 text-center">
        <p className="font-body-xs text-outline-variant">
          EndureMate AI v1.0.0 | 如有任何问题，请随时联系我们
        </p>
      </div>
    </div>
  )
}