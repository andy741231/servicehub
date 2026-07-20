export default function PreviewFrame({ children, device = 'desktop' }) {
  const widths = { desktop: '100%', tablet: '768px', mobile: '375px' };
  return (
    <div className="mx-auto transition-all duration-200" style={{ maxWidth: widths[device] || '100%' }}>
      {children}
    </div>
  );
}