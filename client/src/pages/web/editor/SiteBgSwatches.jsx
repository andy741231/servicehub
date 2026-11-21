import { getSiteBgSwatches } from './editorUtils';

/**
 * SiteBgSwatches — one-click palette-constrained swatches for section
 * backgrounds. Free-form hex input still exists alongside; the swatches steer
 * users toward the site theme so sections don't clash.
 */
export default function SiteBgSwatches({ siteColors, value, onChange }) {
  const swatches = getSiteBgSwatches(siteColors);
  const current = (value || '').toLowerCase();
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Site palette">
      {swatches.map((s) => {
        const val = (s.value || '').toLowerCase();
        const active = s.value === null ? !value : val === current;
        return (
          <button
            key={s.label}
            type="button"
            title={s.label}
            aria-label={`Background: ${s.label}`}
            aria-pressed={active}
            onClick={() => onChange(s.value)}
            className={`w-6 h-6 rounded-md border transition-all ${active ? 'ring-2 ring-primary ring-offset-1 border-transparent' : 'border-border-strong hover:scale-110'}`}
            style={s.swatch === 'transparent'
              ? { background: 'repeating-conic-gradient(#d4d4d8 0% 25%, #ffffff 0% 50%) 0 0/8px 8px' }
              : { background: s.swatch }}
          />
        );
      })}
    </div>
  );
}
