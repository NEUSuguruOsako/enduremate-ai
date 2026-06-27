import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import { NotificationProvider } from '../context/NotificationContext'
import Login from '../pages/Login'

// 测试辅助函数：渲染带 Provider 的组件
function renderWithProviders(ui: React.ReactElement) {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          {ui}
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

describe('Login Page', () => {
  beforeEach(() => {
    // 清除 localStorage
    localStorage.clear()
  })

  it('should render login form', () => {
    renderWithProviders(<Login />)

    // 检查标题
    expect(screen.getByText('EndureMate AI')).toBeInTheDocument()
    expect(screen.getByText('登录账号')).toBeInTheDocument()

    // 检查输入框
    expect(screen.getByPlaceholderText('your@email.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('输入密码')).toBeInTheDocument()

    // 检查按钮
    expect(screen.getByRole('button', { name: /登录/i })).toBeInTheDocument()
  })

  it('should show error for invalid email', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Login />)

    const emailInput = screen.getByPlaceholderText('your@email.com')
    const passwordInput = screen.getByPlaceholderText('输入密码')
    const loginButton = screen.getByRole('button', { name: /登录/i })

    // 输入无效邮箱
    await user.type(emailInput, 'invalid-email')
    await user.type(passwordInput, 'password123')
    await user.click(loginButton)

    // 检查错误消息
    expect(screen.getByText('请输入有效的邮箱地址')).toBeInTheDocument()
  })

  it('should show error for empty password', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Login />)

    const emailInput = screen.getByPlaceholderText('your@email.com')
    const loginButton = screen.getByRole('button', { name: /登录/i })

    // 输入邮箱但不输入密码
    await user.type(emailInput, 'test@example.com')
    await user.click(loginButton)

    // 检查错误消息
    expect(screen.getByText('请输入密码')).toBeInTheDocument()
  })

  it('should have link to register page', () => {
    renderWithProviders(<Login />)

    expect(screen.getByText('立即注册')).toBeInTheDocument()
    expect(screen.getByText('忘记密码？')).toBeInTheDocument()
  })
})