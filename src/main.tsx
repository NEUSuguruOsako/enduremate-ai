import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { AuthProvider } from './context/AuthContext'
import { SettingsProvider } from './context/SettingsContext'
import { NotificationProvider } from './context/NotificationContext'
import { PrivacyProvider } from './context/PrivacyContext'
import ErrorBoundary from './components/ErrorBoundary'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <AuthProvider>
          <NotificationProvider>
            <SettingsProvider>
              <PrivacyProvider>
                <AppProvider>
                  <App />
                </AppProvider>
              </PrivacyProvider>
            </SettingsProvider>
          </NotificationProvider>
        </AuthProvider>
      </HashRouter>
    </ErrorBoundary>
  </StrictMode>,
)