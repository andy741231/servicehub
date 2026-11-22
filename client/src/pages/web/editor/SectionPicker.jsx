/**
 * SectionPicker — "Add section" dialog with ready-made sections.
 *
 * Thumbnails are live: each template is rendered with the real site
 * components (src/site) in the site's theme, scaled down — so the preview is
 * exactly what gets inserted.
 */
import { useMemo, useState } from 'react';
import { X, Plus } from 'lucide-react';
import { AccessibleModal } from '../../../components/Dialog';
import SiteSections from '../../../site/SiteSections';
import { siteThemeStyle } from '../../../site/siteTheme';
import { SECTION_TEMPLATES, SECTION_CATEGORIES, previewSection } from './sectionTemplates';

const THUMB_W = 260;
const RENDER_W = 1280;
const SCALE = THUMB_W / RENDER_W;
const THUMB_H = 150;

function Thumbnail({ template, themeStyle }) {
  if (template.blocks.length === 0) {
    return (
      <div className="flex items-center justify-center border-2 border-dashed border-border rounded-md text-subtle" style={{ width: THUMB_W, height: THUMB_H }}>
        <Plus className="w-6 h-6" />
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-md border border-border bg-white" style={{ width: THUMB_W, height: THUMB_H }} aria-hidden="true" inert="">
      <div style={{ width: RENDER_W, transform: `scale(${SCALE})`, transformOrigin: 'top left', pointerEvents: 'none' }}>
        <div className="public-site site-editor bg-surface text-text-base" style={themeStyle}>
          <SiteSections pageData={{ sections: [previewSection(template)] }} />
        </div>
      </div>
    </div>
  );
}

export default function SectionPicker({ siteTokens, onAdd, onClose }) {
  const [category, setCategory] = useState('All');
  const themeStyle = useMemo(() => siteThemeStyle(siteTokens), [siteTokens]);
  const shown = category === 'All' ? SECTION_TEMPLATES : SECTION_TEMPLATES.filter((t) => t.category === category);

  return (
    <AccessibleModal onClose={onClose} labelledById="section-picker-title" maxWidth="max-w-5xl" className="max-h-[88vh] flex flex-col">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-4">
        <div>
          <h3 id="section-picker-title" className="text-lg font-semibold text-text-base">Add section</h3>
          <p className="text-sm text-muted">Start from a ready-made section — everything stays editable.</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-surface-raised rounded-lg" aria-label="Close"><X className="w-5 h-5 text-muted" /></button>
      </div>
      <div className="px-6 pt-3 flex gap-1.5 flex-wrap" role="tablist" aria-label="Section categories">
        {['All', ...SECTION_CATEGORIES].map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={category === c}
            onClick={() => setCategory(c)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold ${category === c ? 'bg-primary text-primary-foreground' : 'bg-surface-raised text-muted hover:text-text-base'}`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="p-6 overflow-y-auto flex-1">
        <ul className="grid gap-5" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${THUMB_W}px, 1fr))` }}>
          {shown.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onAdd(t)}
                className="group w-full text-left rounded-lg p-2 -m-2 hover:bg-surface-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={`Add ${t.name} section`}
              >
                <div className="group-hover:ring-2 group-hover:ring-primary rounded-md transition-shadow">
                  <Thumbnail template={t} themeStyle={themeStyle} />
                </div>
                <div className="mt-2 text-sm font-semibold text-text-base">{t.name}</div>
                <div className="text-xs text-muted">{t.description}</div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </AccessibleModal>
  );
}
