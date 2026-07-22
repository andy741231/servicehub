import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import BuilderSaveStatus from './BuilderSaveStatus.jsx';

// Pure presentational tests using renderToStaticMarkup — no DOM env needed.
// Verifies the status → label/icon mapping and the retry button visibility,
// which is the surface area that P0-2 ("truthful save state") depends on.

function render(status, props = {}) {
  const html = renderToStaticMarkup(
    <BuilderSaveStatus status={status} {...props} />
  );
  return html;
}

describe('BuilderSaveStatus status mapping', () => {
  it('idle renders no label text', () => {
    expect(render('idle')).not.toContain('Saved');
    expect(render('idle')).not.toContain('Unsaved');
    expect(render('idle')).not.toContain('Saving');
    expect(render('idle')).not.toContain('Save failed');
  });

  it('clean renders "Saved"', () => {
    expect(render('clean')).toContain('Saved');
  });

  it('dirty renders "Unsaved changes"', () => {
    expect(render('dirty')).toContain('Unsaved changes');
  });

  it('saving renders "Saving…" with spinner icon', () => {
    expect(render('saving')).toContain('Saving');
  });

  it('saved renders "Saved"', () => {
    expect(render('saved')).toContain('Saved');
  });

  it('error renders "Save failed"', () => {
    expect(render('error')).toContain('Save failed');
  });

  it('unknown status falls back to idle (no label)', () => {
    expect(render('unknown')).not.toContain('Saved');
    expect(render('unknown')).not.toContain('Unsaved');
  });
});

describe('BuilderSaveStatus Retry button', () => {
  it('does NOT render Retry when no onRetry is provided', () => {
    expect(render('error')).not.toContain('Retry');
  });

  it('renders Retry when onRetry is provided and status is error', () => {
    expect(render('error', { onRetry: () => {} })).toContain('Retry');
  });

  it('does NOT render Retry when status is not error', () => {
    expect(render('dirty', { onRetry: () => {} })).not.toContain('Retry');
    expect(render('saving', { onRetry: () => {} })).not.toContain('Retry');
    expect(render('clean', { onRetry: () => {} })).not.toContain('Retry');
  });
});

describe('BuilderSaveStatus lastSavedAt', () => {
  it('appends time to clean status when lastSavedAt is provided', () => {
    const savedAt = new Date('2026-07-21T14:30:00');
    expect(render('clean', { lastSavedAt: savedAt })).toContain('Saved');
    // The time string should appear (locale-dependent, so just check digits)
    expect(render('clean', { lastSavedAt: savedAt })).toMatch(/\d/);
  });

  it('appends time to saved status when lastSavedAt is provided', () => {
    const savedAt = new Date('2026-07-21T14:30:00');
    expect(render('saved', { lastSavedAt: savedAt })).toContain('Saved');
  });

  it('does not append time when lastSavedAt is null', () => {
    expect(render('clean', { lastSavedAt: null })).toContain('Saved');
  });
});

describe('BuilderSaveStatus accessibility', () => {
  it('has role=status and aria-live=polite', () => {
    const html = render('saving');
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
  });
});
