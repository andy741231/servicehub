import { useNode } from '@craftjs/core';

export default function Document({ children }) {
  const { connectors: { connect } } = useNode();
  return <div ref={connect} className="min-h-screen bg-surface">{children}</div>;
}

Document.craft = {
  displayName: 'Document',
  rules: { canMoveIn: () => true, canDrag: () => false },
};