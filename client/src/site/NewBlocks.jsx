/**
 * Blocks added with the editor reskin: Spacer, Accordion, Code (embed),
 * Audio, Social links and Form. Rendered by SiteBlock for the public site and
 * the editor canvas (`edit` = editing helpers from SiteEditContext).
 */
import { ChevronDown } from 'lucide-react';
import { Text, ListAdd } from './fields';
import { resolveUrl } from './siteRichText';
import FormEmbed from './FormEmbed';

const editorNote = 'site-editor-chrome flex items-center justify-center rounded-lg border-2 border-dashed border-border text-sm text-muted';

// ── Spacer ─────────────────────────────────────────────────────────────────
// Empty space; its height is the block's height. Visible only in the editor.
export function Spacer({ cc, sStyle, edit }) {
  return (
    <section className={`h-full ${cc}`} style={{ ...sStyle, minHeight: 16 }} aria-hidden={edit ? undefined : 'true'}>
      {edit && (
        <div className={`${editorNote} h-full min-h-[40px] text-xs uppercase tracking-[0.08em] font-semibold`} style={{ borderColor: 'hsl(var(--admin-border-strong, 215 16% 80%))' }}>
          Spacer
        </div>
      )}
    </section>
  );
}

// ── Accordion ──────────────────────────────────────────────────────────────
// Native <details> on the site (keyboard + screen reader support for free).
// In the editor every answer is shown open so it can be edited in place.
export function Accordion({ c, cc, sStyle, edit }) {
  const items = c.items || [];
  return (
    <section className={`py-12 px-6 ${cc}`} style={sStyle}>
      <div className="max-w-3xl mx-auto">
        <Text optional as="h2" className="text-3xl font-bold text-center mb-8" path="title" value={c.title} placeholder="Title (optional)" />
        <div className="border-t" style={{ borderColor: 'hsl(var(--border))' }}>
          {items.map((it, i) => (edit ? (
            <div key={i} className="py-4 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
              <Text as="h3" className="text-lg font-semibold" path={`items.${i}.question`} value={it.question} placeholder="Question" />
              <Text as="div" className="mt-2 opacity-80" path={`items.${i}.answer`} value={it.answer} placeholder="Answer" multiline />
            </div>
          ) : (
            <details key={i} className="group py-4 border-b" style={{ borderColor: 'hsl(var(--border))' }} open={!!c.openFirst && i === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold [&::-webkit-details-marker]:hidden">
                <Text as="span" path={`items.${i}.question`} value={it.question} />
                <ChevronDown className="w-5 h-5 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <Text as="div" className="mt-2 opacity-80" path={`items.${i}.answer`} value={it.answer} multiline />
            </details>
          )))}
        </div>
        <ListAdd path="items" label="Add question" make={() => ({ question: 'New question', answer: 'The answer.' })} />
      </div>
    </section>
  );
}

// ── Code / embed ───────────────────────────────────────────────────────────
// A single <iframe src="https://…"> (YouTube playlist, calendar, giving
// widget…) is rendered as that iframe. Anything else runs in a sandboxed
// frame WITHOUT same-origin access, so pasted scripts can't reach the site's
// cookies or the admin API. The stored code is never altered.
function singleIframe(code) {
  if (!/^\s*<iframe\b[^>]*>\s*<\/iframe>\s*$/i.test(code || '') || typeof DOMParser === 'undefined') return null;
  const el = new DOMParser().parseFromString(code, 'text/html').querySelector('iframe');
  const src = el?.getAttribute('src') || '';
  if (!/^https:\/\//i.test(src)) return null;
  return { src, allow: el.getAttribute('allow') || undefined, allowFullScreen: el.hasAttribute('allowfullscreen'), title: el.getAttribute('title') || undefined };
}
export function Embed({ c, cc, sStyle, edit }) {
  const height = Math.max(80, Number(c.height) || 360);
  const label = c.label || 'Embedded content';
  const frameStyle = { width: '100%', height, border: 0, display: 'block', pointerEvents: edit ? 'none' : undefined };
  let body = null;
  if (c.code) {
    const one = singleIframe(c.code);
    body = one
      ? <iframe src={one.src} title={one.title || label} allow={one.allow} allowFullScreen={one.allowFullScreen} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" style={frameStyle} />
      : (
        <iframe
          title={label}
          sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms allow-presentation"
          srcDoc={`<!doctype html><meta charset="utf-8"><base target="_blank"><style>html,body{margin:0}body{font-family:system-ui,sans-serif}</style>${c.code}`}
          loading="lazy"
          style={frameStyle}
        />
      );
  } else if (edit) {
    body = <div className={editorNote} style={{ height }}>Paste embed code in this block’s settings</div>;
  }
  if (!body) return null;
  return <section className={`px-6 ${cc}`} style={sStyle}>{body}</section>;
}

// ── Audio ──────────────────────────────────────────────────────────────────
export function Audio({ c, cc, sStyle, edit }) {
  if (!c.url && !edit) return null;
  return (
    <section className={`px-6 py-4 ${cc}`} style={sStyle}>
      <div className="max-w-3xl mx-auto">
        <Text optional as="h3" className="text-xl font-semibold mb-1" path="title" value={c.title} placeholder="Title (optional)" />
        <Text optional as="p" className="opacity-75 mb-3" path="description" value={c.description} placeholder="Description (optional)" />
        {c.url
          ? <audio controls preload="metadata" src={resolveUrl(c.url)} className="w-full" style={{ pointerEvents: edit ? 'none' : undefined }}>Your browser can’t play this audio. <a href={resolveUrl(c.url)}>Download it</a>.</audio>
          : <div className={`${editorNote} h-14`}>Add an audio file in this block’s settings</div>}
      </div>
    </section>
  );
}

// ── Social links ───────────────────────────────────────────────────────────
// Simple drawn glyphs (no brand icon set in the app).
const SOCIAL = {
  facebook: { name: 'Facebook', path: <path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v7h4v-7h3l1-4h-4V8.5a.5.5 0 0 1 .5-.5Z" fill="currentColor" /> },
  instagram: { name: 'Instagram', path: <><rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="17.3" cy="6.7" r="1.2" fill="currentColor" /></> },
  youtube: { name: 'YouTube', path: <><rect x="2.5" y="5.5" width="19" height="13" rx="4" fill="currentColor" /><path d="M10 9v6l5-3Z" style={{ fill: 'hsl(var(--primary))' }} /></> },
  x: { name: 'X', path: <path d="M4 4l16 16M20 4 4 20" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /> },
  linkedin: { name: 'LinkedIn', path: <><rect x="4" y="9" width="3.5" height="11" fill="currentColor" /><circle cx="5.75" cy="5.5" r="2" fill="currentColor" /><path d="M10 9h3.3v1.6c.6-1 1.8-1.9 3.6-1.9 3 0 4.1 2 4.1 5V20h-3.5v-5.5c0-1.4-.4-2.5-1.8-2.5s-2.2 1-2.2 2.5V20H10Z" fill="currentColor" /></> },
  tiktok: { name: 'TikTok', path: <path d="M14 3h3c.3 2.2 1.7 3.6 4 3.8v3.1c-1.5 0-2.8-.4-4-1.2V15a6 6 0 1 1-6-6v3.2A2.9 2.9 0 1 0 14 15Z" fill="currentColor" /> },
  email: { name: 'Email', path: <><rect x="3" y="5.5" width="18" height="13" rx="2" fill="none" stroke="currentColor" strokeWidth="2" /><path d="m3.5 7 8.5 6 8.5-6" fill="none" stroke="currentColor" strokeWidth="2" /></> },
  website: { name: 'Website', path: <><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M3 12h18M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9S9.5 5.6 12 3Z" fill="none" stroke="currentColor" strokeWidth="2" /></> },
};
export function SocialLinks({ c, cc, sStyle, edit }) {
  const links = (c.links || []).filter((l) => edit || l.url);
  if (!links.length && !edit) return null;
  const justify = { left: 'flex-start', right: 'flex-end' }[c.align] || 'center';
  return (
    <section className={`flex items-center h-full px-6 ${cc}`} style={{ ...sStyle, justifyContent: justify }}>
      <ul className="flex flex-wrap items-center gap-3" style={{ justifyContent: justify }} aria-label="Social links">
        {links.map((l, i) => {
          const n = SOCIAL[l.network] || SOCIAL.website;
          const href = l.network === 'email' && l.url && !/^mailto:/i.test(l.url) ? `mailto:${l.url}` : l.url;
          return (
            <li key={i}>
              <a
                href={href || undefined}
                target={l.network === 'email' ? undefined : '_blank'}
                rel="noopener noreferrer"
                aria-label={n.name}
                title={l.url ? n.name : `${n.name} — add its address in the block settings`}
                className="w-11 h-11 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
                style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--text-inverse))', opacity: l.url ? undefined : 0.4, pointerEvents: edit ? 'none' : undefined }}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">{n.path}</svg>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ── Form (from the Forms app) ──────────────────────────────────────────────
export function FormBlock({ c, cc, sStyle, edit }) {
  if (!c.formId && !edit) return null;
  return (
    <section className={`px-6 py-6 ${cc}`} style={sStyle}>
      <div className="max-w-2xl mx-auto">
        {c.formId
          ? <FormEmbed formId={c.formId} title={c.formTitle || 'Form'} inert={!!edit} />
          : <div className={`${editorNote} h-40 text-center px-6`}>Choose a form from the Forms app in this block’s settings</div>}
      </div>
    </section>
  );
}
