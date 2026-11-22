/**
 * Slideshow (carousel) block — one slide at a time with arrows and dots.
 *
 * Accessibility: real buttons with labels; arrow keys move between slides;
 * hidden slides are aria-hidden; auto-advance is off by default, pauses on
 * hover/focus and never runs for people who prefer reduced motion.
 * In the editor every control works, auto-advance is off, and each slide's
 * image, title and text are edited in place.
 */
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Text, Image, ListAdd } from './fields';

const ASPECT = { wide: 'aspect-video', landscape: 'aspect-[4/3]', tall: 'aspect-[3/4]' };
const stripHtml = (s) => String(s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

export default function Carousel({ c, cc, sStyle, edit }) {
  const slides = c.slides || [];
  const n = slides.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const current = n ? Math.min(index, n - 1) : 0;
  const go = (d) => setIndex((v) => (Math.min(v, n - 1) + d + n) % n);

  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  useEffect(() => {
    if (!c.autoplay || edit || n < 2 || paused || reduced) return undefined;
    const t = setInterval(() => go(1), (Number(c.interval) || 6) * 1000);
    return () => clearInterval(t);
  }, [c.autoplay, c.interval, edit, n, paused, reduced]); // eslint-disable-line react-hooks/exhaustive-deps

  const fill = c.aspect === 'fill';
  const frame = fill ? 'h-full min-h-[240px]' : (ASPECT[c.aspect] || ASPECT.wide);
  // Over the image on wider blocks; below it (beside the dots) on narrow ones,
  // where they would cover the slide title.
  const arrow = 'absolute top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white/90 text-[#152b45] shadow hidden @min-[520px]:flex items-center justify-center hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white';
  const smallArrow = 'w-9 h-9 rounded-full flex @min-[520px]:hidden items-center justify-center text-text-base hover:bg-surface-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-primary';

  return (
    <section
      className={`relative ${fill ? 'h-full' : ''} ${cc}`}
      style={sStyle}
      aria-roledescription="carousel"
      aria-label={stripHtml(c.label) || 'Slideshow'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={(e) => {
        if (edit || n < 2 || e.target.isContentEditable) return;
        if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
      }}
    >
      <div className={`relative w-full overflow-hidden bg-surface-tertiary ${frame}`}>
        {slides.map((s, k) => {
          const on = k === current;
          return (
            <div
              key={k}
              className={`absolute inset-0 ${reduced ? '' : 'transition-opacity duration-500'}`}
              style={{ opacity: on ? 1 : 0, visibility: on ? 'visible' : 'hidden' }}
              role="group"
              aria-roledescription="slide"
              aria-label={`${k + 1} of ${n}`}
              aria-hidden={!on}
            >
              <Image path={`slides.${k}.image`} value={s.image} alt={s.alt || stripHtml(s.title)} className="w-full h-full object-cover" wrapperClassName="absolute inset-0" />
              {(s.title || s.text || edit) && (
                <div className="absolute inset-x-0 bottom-0 px-6 pb-8 pt-16 sm:px-12 bg-gradient-to-t from-black/70 to-transparent" style={{ color: '#fffefa' }}>
                  <Text optional as="h3" className="text-2xl sm:text-3xl font-bold mb-1" style={{ color: 'inherit' }} path={`slides.${k}.title`} value={s.title} placeholder="Slide title" />
                  <Text optional as="p" className="max-w-2xl opacity-90" style={{ color: 'inherit' }} path={`slides.${k}.text`} value={s.text} placeholder="Slide text (optional)" multiline />
                </div>
              )}
            </div>
          );
        })}
        {n > 1 && (
          <>
            <button type="button" className={`${arrow} left-3`} onClick={() => go(-1)} aria-label="Previous slide"><ChevronLeft className="w-5 h-5" /></button>
            <button type="button" className={`${arrow} right-3`} onClick={() => go(1)} aria-label="Next slide"><ChevronRight className="w-5 h-5" /></button>
          </>
        )}
      </div>
      {n > 1 && (
        <div className="flex items-center justify-center gap-1 py-3">
          <button type="button" className={smallArrow} onClick={() => go(-1)} aria-label="Previous slide"><ChevronLeft className="w-5 h-5" /></button>
          {slides.map((_, k) => (
            <button
              key={k}
              type="button"
              onClick={() => setIndex(k)}
              aria-label={`Show slide ${k + 1}`}
              aria-current={k === current ? 'true' : undefined}
              className="w-8 h-8 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
            >
              <span className={`block rounded-full transition-all ${k === current ? 'w-6 h-2 bg-primary' : 'w-2 h-2 bg-border-strong'}`} />
            </button>
          ))}
          <button type="button" className={smallArrow} onClick={() => go(1)} aria-label="Next slide"><ChevronRight className="w-5 h-5" /></button>
        </div>
      )}
      <ListAdd path="slides" label="Add slide" make={() => ({ image: '', title: 'New slide', text: '' })} />
    </section>
  );
}
