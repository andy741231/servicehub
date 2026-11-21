import { Component } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

/**
 * EditorErrorBoundary — catches render errors in the Fluid Engine canvas so a
 * broken block/section can't white-screen the whole editor (the topbar, save,
 * and exit controls stay alive). Offers a retry that remounts the subtree.
 *
 * `compact` renders a small in-place card (used around each block, so one bad
 * block doesn't take down the page; its toolbar still works to delete it).
 * `resetKey` clears the error when it changes (e.g. the block's content after
 * an undo).
 */
export default class EditorErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Editor canvas crashed:', error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  handleRetry = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.compact) {
      return (
        <div className="site-editor-chrome flex items-center gap-3 p-4 m-2 rounded-lg border border-dashed border-border bg-surface text-left" role="alert">
          <AlertTriangle className="w-5 h-5 shrink-0" style={{ color: 'hsl(var(--warning, 35 92% 45%))' }} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-text-base">This block couldn&apos;t be displayed.</p>
            <p className="text-xs text-muted truncate" title={this.state.error?.message}>{this.state.error?.message}</p>
          </div>
          <button onClick={this.handleRetry} className="text-xs font-semibold text-primary hover:underline shrink-0">Try again</button>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-surface-raised flex items-center justify-center">
          <AlertTriangle className="w-7 h-7" style={{ color: 'hsl(var(--warning, 35 92% 45%))' }} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-text-base">Something went wrong while rendering the editor</h2>
          <p className="text-sm text-muted mt-1 max-w-md mx-auto">
            Your saved work is safe — this error only affects the editor canvas.
            Try again, or reload the page if it keeps happening.
          </p>
          {this.state.error?.message && (
            <p className="text-xs text-muted mt-2 font-mono bg-surface-raised rounded-md px-3 py-1.5 inline-block max-w-md break-all">
              {this.state.error.message}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={this.handleRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover font-medium"
          >
            <RotateCcw className="w-4 h-4" />
            Try again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 border border-border text-text-base rounded-lg hover:bg-surface-raised font-medium"
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}
