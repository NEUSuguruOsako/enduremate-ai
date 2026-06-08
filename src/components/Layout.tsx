import { Outlet } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import AIAssistant from './AIAssistant'

export default function Layout() {
  const { toggleAIChat } = useAppContext()

  return (
    <div className="flex h-screen overflow-hidden bg-background text-text-primary">
      <Sidebar />
      <main className="ml-[260px] flex-1 flex flex-col min-h-screen relative">
        <TopBar />
        <div className="flex-1 overflow-y-auto p-margin-desktop pb-24">
          <div className="max-w-container-max-width mx-auto">
            <Outlet />
          </div>
        </div>
      </main>

      {/* AI Chat Panel */}
      <AIAssistant />

      {/* Global Floating AI Assistant Button */}
      <button
        onClick={toggleAIChat}
        className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-on-primary rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 group"
      >
        <span
          className="material-symbols-outlined text-[32px] group-hover:rotate-12 transition-transform"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          smart_toy
        </span>
      </button>
    </div>
  )
}
