import { Component, type ReactNode, type ErrorInfo } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * 全局错误边界组件
 * 捕获子组件树中的 JavaScript 错误，记录错误并显示备用 UI
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // 更新 state 使下一次渲染能够显示降级后的 UI
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 记录错误信息
    console.error('ErrorBoundary caught an error:', error)
    console.error('Error info:', errorInfo)

    this.setState({
      error,
      errorInfo,
    })

    // 在实际项目中，可以将错误上报到错误追踪服务
    // 例如：Sentry、LogRocket 等
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  handleReload = (): void => {
    window.location.reload()
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // 如果提供了自定义 fallback，则使用它
      if (this.props.fallback) {
        return this.props.fallback
      }

      // 默认的错误页面
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="w-full max-w-md text-center">
            {/* Error Icon */}
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-status-danger/10 flex items-center justify-center">
              <span
                className="material-symbols-outlined text-[40px] text-status-danger"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                error
              </span>
            </div>

            {/* Title */}
            <h1 className="font-headline-xl text-headline-xl text-text-primary mb-4">
              出错了
            </h1>

            {/* Description */}
            <p className="font-body-md text-secondary mb-6 leading-relaxed">
              应用遇到了一个意外错误。请尝试刷新页面，如果问题持续存在，请联系我们。
            </p>

            {/* Error Details (Development Mode) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="bg-surface-container-low rounded-lg p-4 mb-6 overflow-hidden">
                <p className="text-xs text-secondary mb-2 font-semibold">错误详情：</p>
                <pre className="text-xs text-status-danger overflow-auto max-h-[200px] whitespace-pre-wrap">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleReload}
                className="w-full py-3 bg-primary text-on-primary rounded-lg font-semibold text-sm hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer border-none flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                刷新页面
              </button>
              <button
                onClick={this.handleReset}
                className="w-full py-3 bg-surface-container border border-border-subtle rounded-lg font-medium text-sm text-text-primary hover:bg-surface-container-high transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">replay</span>
                重试
              </button>
            </div>

            {/* Help Link */}
            <p className="text-xs text-on-surface-variant mt-6">
              如果问题持续，请{' '}
              <a
                href="mailto:support@enduremate.ai"
                className="text-primary hover:underline"
              >
                联系支持
              </a>
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}