import { useState, useMemo } from 'react';
import {
  Type, Hash, Mail, Phone, Calendar, CheckSquare, List, MessageSquare, FileText,
  Upload, SeparatorHorizontal, Image as ImageIcon, Search, Star, SlidersHorizontal,
  MapPin, User, Link as LinkIcon, PenTool, Calculator, Repeat,
} from 'lucide-react';

export const FIELD_TYPES = [
  // Basic inputs
  { type: 'text', label: 'Short Text', icon: Type, description: 'Single-line text input', category: 'Basic' },
  { type: 'textarea', label: 'Long Text', icon: MessageSquare, description: 'Multi-line text area', category: 'Basic' },
  { type: 'number', label: 'Number', icon: Hash, description: 'Numeric input', category: 'Basic' },
  { type: 'email', label: 'Email', icon: Mail, description: 'Email address input', category: 'Basic' },
  { type: 'phone', label: 'Phone', icon: Phone, description: 'Phone number input', category: 'Basic' },
  { type: 'date', label: 'Date', icon: Calendar, description: 'Date picker', category: 'Basic' },
  { type: 'url', label: 'Website', icon: LinkIcon, description: 'URL / website input', category: 'Basic' },
  // Choice
  { type: 'select', label: 'Dropdown', icon: List, description: 'Single selection dropdown', category: 'Choice' },
  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare, description: 'Multiple checkboxes', category: 'Choice' },
  { type: 'rating', label: 'Rating', icon: Star, description: 'Star rating scale', category: 'Choice' },
  { type: 'slider', label: 'Slider', icon: SlidersHorizontal, description: 'Range slider', category: 'Choice' },
  // Advanced
  { type: 'file', label: 'File Upload', icon: Upload, description: 'File attachment', category: 'Advanced' },
  { type: 'content', label: 'Content Block', icon: FileText, description: 'Rich text content with markdown support', category: 'Advanced' },
  { type: 'image', label: 'Image', icon: ImageIcon, description: 'Display an image', category: 'Advanced' },
  { type: 'signature', label: 'Signature', icon: PenTool, description: 'Draw a signature', category: 'Advanced' },
  { type: 'computed', label: 'Computed Field', icon: Calculator, description: 'Auto-calculate from other fields', category: 'Advanced' },
  { type: 'repeatingGroup', label: 'Repeating Group', icon: Repeat, description: 'Let users add multiple sets of fields', category: 'Advanced' },
  // Personal info
  { type: 'name', label: 'Full Name', icon: User, description: 'First and last name', category: 'Personal' },
  { type: 'address', label: 'Address', icon: MapPin, description: 'Street, city, state, zip', category: 'Personal' },
  // Layout
  { type: 'pageBreak', label: 'Page Break', icon: SeparatorHorizontal, description: 'Split form into multiple pages', category: 'Layout' },
];

const CATEGORY_ORDER = ['Basic', 'Choice', 'Advanced', 'Personal', 'Layout'];
export { CATEGORY_ORDER };

// Functional color accents per category — subtle tints to aid scannability
// (productivity-tool guidance: use functional colors, not a monochrome palette)
const CATEGORY_ACCENT = {
  Basic:     { chip: 'bg-blue-50 text-blue-600 group-hover:bg-blue-100',     ring: 'group-hover:text-blue-600' },
  Choice:    { chip: 'bg-violet-50 text-violet-600 group-hover:bg-violet-100', ring: 'group-hover:text-violet-600' },
  Advanced:  { chip: 'bg-amber-50 text-amber-600 group-hover:bg-amber-100',   ring: 'group-hover:text-amber-600' },
  Personal:  { chip: 'bg-teal-50 text-teal-600 group-hover:bg-teal-100',      ring: 'group-hover:text-teal-600' },
  Layout:    { chip: 'bg-slate-100 text-slate-600 group-hover:bg-slate-200',  ring: 'group-hover:text-slate-600' },
};
const accentFor = (category) => CATEGORY_ACCENT[category] || CATEGORY_ACCENT.Basic;
export { CATEGORY_ACCENT, accentFor };

export default function FieldPalette({ onAddField }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return FIELD_TYPES;
    return FIELD_TYPES.filter(
      (f) => f.label.toLowerCase().includes(q) || f.description.toLowerCase().includes(q)
    );
  }, [query]);

  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach((f) => {
      if (!map[f.category]) map[f.category] = [];
      map[f.category].push(f);
    });
    return CATEGORY_ORDER.filter((c) => map[c]?.length).map((c) => ({ category: c, items: map[c] }));
  }, [filtered]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden" role="list" aria-label="Available field types">
      {/* Search */}
      <div className="p-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-subtle" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search fields or press /"
            className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary text-small placeholder:text-muted"
            aria-label="Search field types"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {grouped.length === 0 && (
          <p className="text-center text-small text-muted py-6">No fields match "{query}"</p>
        )}
        {grouped.map(({ category, items }) => (
          <div key={category} className="mb-3">
            <h3 className="px-1 mb-1.5 text-xs font-semibold text-subtle uppercase tracking-wide">{category}</h3>
            <div className="space-y-1">
              {items.map(({ type, label, icon: Icon, description }) => {
                const accent = accentFor(category);
                return (
                <button
                  key={type}
                  onClick={() => onAddField(type)}
                  className="w-full flex items-center gap-2.5 p-2 rounded-base hover:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-primary transition-colors text-left group"
                  title={description}
                  aria-label={`Add ${label} field`}
                  role="listitem"
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${accent.chip}`}>
                    <Icon className={`h-4 w-4 text-subtle transition-colors ${accent.ring}`} aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-small font-medium text-base leading-tight">{label}</div>
                    <div className="text-xs text-muted truncate">{description}</div>
                  </div>
                </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
