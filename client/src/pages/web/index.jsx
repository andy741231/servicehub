// Import the new inline editor
import InlineEditor from './InlineEditor';

// Keep the old builder as fallback for now
import OldWebBuilder from './OldWebBuilder';

export default function WebIndex() {
  // Use the new inline editor by default
  return <InlineEditor />;

  // Uncomment to use the old builder:
  // return <OldWebBuilder />;
}