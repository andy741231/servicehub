export default function ChartCard({ title, subtitle, children, className = '', empty, emptyMessage = 'No data yet' }) {
  return (
    <div className={`card ${className}`}>
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h3 className="text-subheading font-semibold text-text-base">{title}</h3>}
          {subtitle && <p className="text-small text-muted mt-0.5">{subtitle}</p>}
        </div>
      )}
      <div className="w-full min-h-[200px]">
        {empty ? (
          <div className="flex flex-col items-center justify-center h-[200px] text-subtle">
            <svg className="w-10 h-10 mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-sm">{emptyMessage}</p>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
