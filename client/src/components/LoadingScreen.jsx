/**
 * Full-screen loading state shown during the initial auth check.
 * Replaces the old bare `<div>Loading...</div>` that flashed in the
 * top-left corner. Centred, branded, and respects the active theme.
 *
 * @param {string} label - optional message under the spinner
 */
export default function LoadingScreen({ label = 'Loading' }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-5 bg-background animate-page-in"
    >
      {/* Branded ring spinner */}
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 rounded-full border-2 border-primary/15" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
      </div>

      {/* Wordmark + label */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-lg font-bold text-primary">Service Hub</span>
        <span className="text-sm text-muted text-body loading-dots">{label}</span>
      </div>

      <span className="sr-only">{label}…</span>
    </div>
  );
}
