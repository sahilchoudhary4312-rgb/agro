import React from "react";

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("AgriMitra render error:", error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-dvh flex items-center justify-center bg-leaf-50 px-4">
        <div className="max-w-md w-full rounded-2xl bg-white border border-gray-100 shadow-pop p-8 text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-extrabold text-xl">
            !
          </div>
          <h1 className="mt-4 text-lg font-extrabold text-ink">Something went wrong</h1>
          <p className="mt-1 text-sm text-ink-mute">
            The app hit an unexpected error. Reloading usually fixes it.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary mt-5 w-full sm:w-auto"
          >
            Reload AgriMitra
          </button>
        </div>
      </div>
    );
  }
}
