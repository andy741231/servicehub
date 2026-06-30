import { Type, Hash, Mail, Phone, Calendar, CheckSquare, List, MessageSquare, FileText, Upload, SeparatorHorizontal, Image as ImageIcon } from 'lucide-react';

export const FIELD_TYPES = [
  { type: 'text', label: 'Short Text', icon: Type, description: 'Single-line text input' },
  { type: 'textarea', label: 'Long Text', icon: MessageSquare, description: 'Multi-line text area' },
  { type: 'number', label: 'Number', icon: Hash, description: 'Numeric input' },
  { type: 'email', label: 'Email', icon: Mail, description: 'Email address input' },
  { type: 'phone', label: 'Phone', icon: Phone, description: 'Phone number input' },
  { type: 'date', label: 'Date', icon: Calendar, description: 'Date picker' },
  { type: 'select', label: 'Dropdown', icon: List, description: 'Single selection dropdown' },
  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare, description: 'Multiple checkboxes' },
  { type: 'file', label: 'File Upload', icon: Upload, description: 'File attachment' },
  { type: 'pageBreak', label: 'Page Break', icon: SeparatorHorizontal, description: 'Split form into multiple pages' },
  { type: 'content', label: 'Content Block', icon: FileText, description: 'Rich text content with markdown support' },
  { type: 'image', label: 'Image', icon: ImageIcon, description: 'Display an image' },
];

export default function FieldPalette({ onAddField }) {
  return (
    <div className="flex-1 overflow-y-auto p-4" role="list" aria-label="Available field types">
      <div className="space-y-2">
        {FIELD_TYPES.map(({ type, label, icon: Icon, description }) => (
          <button
            key={type}
            onClick={() => onAddField(type)}
            className="w-full flex items-start gap-3 p-3 bg-surface-raised border border-border rounded-base hover:bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 transition-colors duration-150 text-left min-h-[44px]"
            title={description}
            aria-label={`Add ${label} field`}
            role="listitem"
          >
            <Icon className="h-5 w-5 text-subtle flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <div className="text-body font-medium text-base">{label}</div>
              <div className="text-small text-muted">{description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}