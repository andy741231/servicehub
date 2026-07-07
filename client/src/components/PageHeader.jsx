/**
 * PageHeader
 *
 * Action bar used at the top of sub-app management pages. Title/subtitle
 * removed per design decision — the TopBar tabs already identify the page.
 * Actions (children) are rendered on the right.
 */
export default function PageHeader({ children }) {
  if (!children) return null;
  return (
    <div className="flex items-center justify-end gap-2 mb-6">
      {children}
    </div>
  );
}
