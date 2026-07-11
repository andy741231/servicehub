import { useState, useMemo, useEffect, useRef } from 'react';
import {
  ChevronRight, ChevronDown, Folder, FolderOpen, Plus, Search, ListTree,
  Type, Hash, Mail, Phone, Calendar, CheckSquare, List, MessageSquare, FileText,
  Upload, SeparatorHorizontal, Image as ImageIcon, Star, SlidersHorizontal,
  MapPin, User, Link as LinkIcon, PenTool, Calculator, Repeat,
} from 'lucide-react';

// Icon lookup per field type — mirrors FieldPalette's FIELD_TYPES icons
const FIELD_ICONS = {
  text: Type, textarea: MessageSquare, number: Hash, email: Mail, phone: Phone,
  date: Calendar, url: LinkIcon, select: List, checkbox: CheckSquare, rating: Star,
  slider: SlidersHorizontal, file: Upload, content: FileText, image: ImageIcon,
  signature: PenTool, computed: Calculator, repeatingGroup: Repeat,
  name: User, address: MapPin, pageBreak: SeparatorHorizontal,
};

function getFieldIcon(type) {
  return FIELD_ICONS[type] || Type;
}

/**
 * OutlineTree — VS Code-style structure tree for the Form Builder.
 *
 * Shows sections (rows) as expandable parent nodes with fields as indented children.
 * Clicking a node selects it and scrolls to it in the canvas. Includes a search
 * filter and an "Add section" button.
 *
 * Props:
 *  - fields: array of field objects from the store
 *  - rows: array of row/section objects from the store
 *  - selectedField: currently selected field ID (or null)
 *  - selectedSection: currently selected section ID (or null)
 *  - onSelectField: (fieldId) => void
 *  - onSelectSection: (rowId) => void
 *  - onAddSection: () => void  — called when "Add section" button is clicked
 *  - onAddField: (rowId) => void  — called when "Add field to section" is clicked
 */
export default function OutlineTree({
  fields,
  rows,
  selectedField,
  selectedSection,
  onSelectField,
  onSelectSection,
  onAddSection,
  onAddField,
}) {
  const [collapsed, setCollapsed] = useState({});
  const [query, setQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const searchInputRef = useRef(null);

  // Auto-expand all sections by default on first render
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (!initialized && rows.length) {
      setInitialized(true);
    }
  }, [rows, initialized]);

  const toggleCollapse = (rowId, e) => {
    e?.stopPropagation();
    setCollapsed((prev) => ({ ...prev, [rowId]: !prev[rowId] }));
  };

  // Auto-focus the search input when it becomes visible
  useEffect(() => {
    if (searchVisible && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchVisible]);

  // Filter fields by search query
  const q = query.toLowerCase().trim();
  const matchesQuery = (label) => !q || (label || '').toLowerCase().includes(q);

  // Group fields by row
  const fieldsByRow = useMemo(() => {
    const map = {};
    fields.forEach((f) => {
      if (!map[f.rowId]) map[f.rowId] = [];
      map[f.rowId].push(f);
    });
    return map;
  }, [fields]);

  // Group child fields by their parent repeatingGroup field ID
  const fieldsByGroup = useMemo(() => {
    const map = {};
    fields.forEach((f) => {
      if (f.groupId) {
        if (!map[f.groupId]) map[f.groupId] = [];
        map[f.groupId].push(f);
      }
    });
    return map;
  }, [fields]);

  // Auto-expand sections that contain a matching field when searching
  useEffect(() => {
    if (!q) return;
    rows.forEach((row) => {
      const rowFields = fieldsByRow[row.id] || [];
      const hasMatch = rowFields.some((f) => matchesQuery(f.label) || matchesQuery(f.type));
      if (hasMatch && collapsed[row.id]) {
        setCollapsed((prev) => ({ ...prev, [row.id]: false }));
      }
    });
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const scrollToElement = (id) => {
    // Small delay to allow selection state to update in the canvas
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
  };

  const handleFieldClick = (fieldId, rowId) => {
    onSelectField(fieldId);
    scrollToElement(`field-${fieldId}`);
  };

  const handleSectionClick = (rowId) => {
    onSelectSection(rowId);
    scrollToElement(`section-${rowId}`);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-10 border-b border-border flex-none">
        <div className="flex items-center gap-1.5">
          <ListTree className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
          <span className="text-xs font-semibold text-base uppercase tracking-wide">Outline</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setSearchVisible((v) => !v); if (searchVisible) setQuery(''); }}
            className="p-1 rounded hover:bg-surface-raised text-muted transition-colors"
            title="Search / Filter"
            aria-label="Search fields in outline"
            aria-expanded={searchVisible}
          >
            <Search className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onAddSection}
            className="p-1 rounded hover:bg-surface-raised text-muted transition-colors"
            title="Add section"
            aria-label="Add new section"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Search (toggleable) */}
      {searchVisible && (
        <div className="px-2 py-1.5 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-subtle" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter fields…"
              className="w-full pl-7 pr-2 py-1 bg-background border border-border rounded-sm text-xs focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted"
              aria-label="Filter fields in outline"
            />
          </div>
        </div>
      )}

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-2 text-sm">
        {rows.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <p className="text-xs text-muted mb-2">No sections yet</p>
            <button
              onClick={onAddSection}
              className="text-xs text-primary hover:underline"
            >
              + Add first section
            </button>
          </div>
        ) : (
          rows.map((row, rowIndex) => {
            const rowFields = fieldsByRow[row.id] || [];
            const isCollapsed = !!collapsed[row.id];
            const isSelected = selectedSection === row.id;

            // Filter fields by search
            const visibleFields = q
              ? rowFields.filter((f) => matchesQuery(f.label) || matchesQuery(f.type))
              : rowFields;

            // Hide section if searching and no matches in it
            if (q && visibleFields.length === 0 && !matchesQuery(row.label)) return null;

            return (
              <div key={row.id} className="px-2">
                {/* Section node */}
                <div
                  onClick={() => handleSectionClick(row.id)}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer transition-colors group ${
                    isSelected
                      ? 'bg-primary-light border-l-2 border-primary -ml-px'
                      : 'hover:bg-surface-raised text-base'
                  }`}
                  role="treeitem"
                  aria-expanded={!isCollapsed}
                  aria-label={`Section: ${row.label || `Section ${rowIndex + 1}`}`}
                >
                  {/* Collapse chevron */}
                  <button
                    onClick={(e) => toggleCollapse(row.id, e)}
                    className="p-0.5 text-subtle hover:text-base rounded transition-transform"
                    aria-label={isCollapsed ? 'Expand section' : 'Collapse section'}
                  >
                    {isCollapsed
                      ? <ChevronRight className="h-3 w-3" />
                      : <ChevronDown className="h-3 w-3" />
                    }
                  </button>

                  {/* Folder icon */}
                  {isCollapsed
                    ? <Folder className="h-3.5 w-3.5 text-muted flex-shrink-0" />
                    : <FolderOpen className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  }

                  {/* Label */}
                  <span className="text-sm font-medium truncate flex-1">
                    {row.label || `Section ${rowIndex + 1}`}
                  </span>
                </div>

                {/* Field children */}
                {!isCollapsed && visibleFields.length > 0 && (
                  <div className="pl-4 mt-0.5 space-y-0.5">
                    {visibleFields
                      .filter((f) => !f.groupId)  // only top-level fields; grouped fields nest under their parent
                      .map((field) => {
                      const Icon = getFieldIcon(field.type);
                      const isFieldSelected = selectedField === field.id;
                      const childFields = field.type === 'repeatingGroup' ? (fieldsByGroup[field.id] || []) : [];
                      const isGroupCollapsed = !!collapsed[`group-${field.id}`];

                      // Repeating group with children — render parent + nested children
                      if (field.type === 'repeatingGroup' && childFields.length > 0) {
                        return (
                          <div key={field.id}>
                            <div
                              onClick={() => handleFieldClick(field.id, field.rowId)}
                              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                                isFieldSelected
                                  ? 'bg-primary-light text-primary font-medium'
                                  : 'hover:bg-surface-raised text-muted'
                              }`}
                              role="treeitem"
                              aria-expanded={!isGroupCollapsed}
                              aria-label={`Repeating group: ${field.label || field.type}`}
                            >
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleCollapse(`group-${field.id}`, e); }}
                                className="p-0.5 text-subtle hover:text-base rounded transition-transform"
                                aria-label={isGroupCollapsed ? 'Expand group' : 'Collapse group'}
                              >
                                {isGroupCollapsed
                                  ? <ChevronRight className="h-3 w-3" />
                                  : <ChevronDown className="h-3 w-3" />
                                }
                              </button>
                              <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="text-sm truncate flex-1">
                                {field.label || field.type}
                              </span>
                            </div>
                            {!isGroupCollapsed && (
                              <div className="pl-4 mt-0.5 space-y-0.5">
                                {childFields.map((childField) => {
                                  const ChildIcon = getFieldIcon(childField.type);
                                  const isChildSelected = selectedField === childField.id;
                                  return (
                                    <div
                                      key={childField.id}
                                      onClick={() => handleFieldClick(childField.id, childField.rowId)}
                                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                                        isChildSelected
                                          ? 'bg-primary-light text-primary font-medium'
                                          : 'hover:bg-surface-raised text-muted'
                                      }`}
                                      role="treeitem"
                                      aria-label={`Field: ${childField.label || childField.type}`}
                                    >
                                      <ChildIcon className="h-3.5 w-3.5 flex-shrink-0" />
                                      <span className="text-sm truncate flex-1">
                                        {childField.label || childField.type}
                                      </span>
                                      {childField.required && (
                                        <span className="text-danger text-[10px] flex-shrink-0">*</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      }

                      // Regular top-level field
                      return (
                        <div
                          key={field.id}
                          onClick={() => handleFieldClick(field.id, field.rowId)}
                          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                            isFieldSelected
                              ? 'bg-primary-light text-primary font-medium'
                              : 'hover:bg-surface-raised text-muted'
                          }`}
                          role="treeitem"
                          aria-label={`Field: ${field.label || field.type}`}
                        >
                          <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="text-sm truncate flex-1">
                            {field.label || field.type}
                          </span>
                          {field.required && (
                            <span className="text-danger text-[10px] flex-shrink-0">*</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Empty section state — show "No fields" hint */}
                {!isCollapsed && visibleFields.length === 0 && !q && (
                  <div className="pl-4 mt-0.5">
                    <p className="px-2 py-1.5 text-[10px] text-subtle italic">No fields</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer: Add section button */}
      <div className="px-2 mt-3 pb-2">
        <button
          onClick={onAddSection}
          className="w-full flex items-center justify-center gap-1.5 px-2 py-2 border border-dashed border-border-strong rounded-md text-xs text-muted hover:bg-surface-raised hover:text-primary transition-colors"
          aria-label="Add new section"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add section</span>
        </button>
      </div>
    </div>
  );
}
