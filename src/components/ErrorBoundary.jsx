var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Component } from "react";
class ErrorBoundary extends Component {
  static {
    __name(this, "ErrorBoundary");
  }
  state = { hasError: false };
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white p-8">
          <div className="max-w-md text-center space-y-4">
            <div className="text-6xl">⚠️</div>
            <h1 className="text-2xl font-bold">Something went wrong</h1>
            <p className="text-gray-400 text-sm">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <button
        onClick={() => window.location.reload()}
        className="px-6 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-sm font-semibold transition-colors"
      >
              Reload page
            </button>
          </div>
        </div>;
    }
    return this.props.children;
  }
}
export {
  ErrorBoundary
};
