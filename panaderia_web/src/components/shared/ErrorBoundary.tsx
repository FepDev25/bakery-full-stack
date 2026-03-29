import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  message: string
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  reset = () => this.setState({ hasError: false, message: '' })

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex h-full min-h-[24rem] flex-col items-center justify-center gap-4 px-4 text-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-foreground">Algo salió mal</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              {this.state.message || 'Ocurrió un error inesperado en esta sección.'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={this.reset}>
            Reintentar
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
