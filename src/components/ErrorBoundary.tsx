import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RotateCw, AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const componentName = this.props.componentName || 'Component';
    console.error(`[ErrorBoundary] Caught error in ${componentName}:`, error, errorInfo);
  }

  private handleReload = () => {
    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full min-h-[280px] p-6 sm:p-10 flex flex-col items-center justify-center text-center bg-white text-black my-4 select-none animate-fadeIn">
          <div className="w-10 h-10 flex items-center justify-center mb-4">
            <AlertCircle className="w-5 h-5 stroke-[1.5]" />
          </div>
          <span className="text-small tracking-[0.25em] uppercase text-black/50 mb-1">
            ATELIER RECOVERY · EST. 2026
          </span>
          <h3 className="font-serif text-title sm:text-display font-normal mb-2 text-black">
            {this.props.fallbackTitle || 'Display Interruption'}
          </h3>
          <p className="text-small text-black/60 max-w-md mx-auto mb-6 leading-relaxed">
            A temporary rendering fault occurred while constructing this view. The rest of the archive remains active.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="py-2.5 px-5 btn-primary text-small uppercase tracking-[0.2em] flex items-center gap-2 cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Reload View</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
