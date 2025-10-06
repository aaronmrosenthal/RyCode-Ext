import React, { Component, ErrorInfo, ReactNode } from "react"
import { AlertTriangle } from "lucide-react"

interface Props {
	children: ReactNode
	fallback?: ReactNode
	onError?: (error: Error, errorInfo: ErrorInfo) => void
	componentName?: string
}

interface State {
	hasError: boolean
	error: Error | null
}

/**
 * Enhanced Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 */
export class ComponentErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props)
		this.state = { hasError: false, error: null }
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error }
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.error(`Error in ${this.props.componentName || "Component"}:`, error, errorInfo)

		// Call optional error handler
		if (this.props.onError) {
			this.props.onError(error, errorInfo)
		}

		// Send error telemetry
		try {
			const telemetryEvent = {
				type: "component_error",
				component: this.props.componentName || "unknown",
				error: error.message,
				stack: error.stack,
				componentStack: errorInfo.componentStack,
			}
			console.error("Component Error Telemetry:", telemetryEvent)
		} catch (e) {
			console.error("Failed to send error telemetry:", e)
		}
	}

	handleReset = () => {
		this.setState({ hasError: false, error: null })
	}

	render() {
		if (this.state.hasError) {
			// Custom fallback or default error UI
			if (this.props.fallback) {
				return this.props.fallback
			}

			return (
				<div className="flex flex-col items-center justify-center p-8 matrix-panel">
					<div className="flex items-center gap-3 mb-4">
						<AlertTriangle className="w-8 h-8 text-vscode-errorForeground" />
						<h2 className="text-xl font-bold text-vscode-foreground matrix-header">Something went wrong</h2>
					</div>
					<p className="text-vscode-descriptionForeground mb-4 text-center max-w-md">
						{this.props.componentName && `The ${this.props.componentName} encountered an error. `}
						Please try reloading or contact support if the problem persists.
					</p>
					<details className="mb-4 text-xs text-vscode-descriptionForeground max-w-lg">
						<summary className="cursor-pointer mb-2">Error Details</summary>
						<pre className="matrix-code-block overflow-auto p-3 text-xs">
							{this.state.error?.message}
							{"\n\n"}
							{this.state.error?.stack}
						</pre>
					</details>
					<button
						onClick={this.handleReset}
						className="matrix-button px-4 py-2"
						style={{ marginTop: "1rem" }}>
						Try Again
					</button>
				</div>
			)
		}

		return this.props.children
	}
}

/**
 * HOC to wrap components with error boundary
 */
export function withErrorBoundary<P extends object>(
	Component: React.ComponentType<P>,
	componentName?: string,
	fallback?: ReactNode,
) {
	return function WithErrorBoundaryComponent(props: P) {
		return (
			<ComponentErrorBoundary componentName={componentName} fallback={fallback}>
				<Component {...props} />
			</ComponentErrorBoundary>
		)
	}
}

/**
 * Hook to create error boundary wrapper
 */
export function useErrorBoundary() {
	const [error, setError] = React.useState<Error | null>(null)

	const resetError = React.useCallback(() => {
		setError(null)
	}, [])

	const throwError = React.useCallback((err: Error) => {
		setError(err)
		throw err
	}, [])

	return {
		error,
		resetError,
		throwError,
		hasError: error !== null,
	}
}

export default ComponentErrorBoundary
