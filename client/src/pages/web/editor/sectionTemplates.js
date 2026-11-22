/**
 * Ready-made sections for the "Add section" picker.
 *
 * Each template is a section on the 24-column layout grid: spacing plus
 * blocks with placement (col/row) and starting content. Heights are only a
 * starting point — inserted blocks are fitted to their content (see
 * FluidBlock `autoFit`). Content uses the same field names the site renders
 * (src/site/SiteBlock.jsx).
 */
import { createSection, createBlock, makeDefaultBlockContent, DEFAULT_SECTION } from './editorUtils';

const full = (rowStart, rows) => ({ colStart: 1, colEnd: 25, rowStart, rowEnd: rowStart + rows, zIndex: 0 });
const cols = (colStart, colEnd, rowStart, rows) => ({ colStart, colEnd, rowStart, rowEnd: rowStart + rows, zIndex: 0 });

export const SECTION_CATEGORIES = ['Start', 'Content', 'Community'];

export const SECTION_TEMPLATES = [
  {
    id: 'blank', name: 'Blank', category: 'Start', description: 'An empty section to build yourself',
    section: { paddingTop: 48, paddingBottom: 48 }, blocks: [],
  },
  {
    id: 'welcome', name: 'Welcome', category: 'Start', description: 'Big headline and a short welcome',
    section: { paddingTop: 80, paddingBottom: 80 },
    blocks: [{ type: 'hero', fluid: full(1, 5), content: {
      title: 'A place to <i>belong.</i>',
      subtitle: 'We are a welcoming community learning to follow Jesus, care for our neighbors, and make room for every generation.',
    } }],
  },
  {
    id: 'call-to-action', name: 'Call to action', category: 'Start', description: 'Colored band with a button',
    section: { paddingTop: 0, paddingBottom: 0 },
    blocks: [{ type: 'intro', fluid: full(1, 5), content: {
      title: 'Plan your first visit', content: 'We would love to meet you. Here is everything you need to know before Sunday.',
      buttonText: 'Plan a visit', buttonLink: '/visit', buttonVariant: 'gold',
    } }],
  },
  {
    id: 'two-columns', name: 'Two columns of text', category: 'Content', description: 'Side-by-side paragraphs',
    section: { paddingTop: 48, paddingBottom: 48 },
    blocks: [
      { type: 'text', fluid: cols(1, 13, 1, 4), content: { content: '<h2>Our story</h2><p>Share how your community began and what you care about most.</p>' } },
      { type: 'text', fluid: cols(13, 25, 1, 4), content: { content: '<h2>What to expect</h2><p>Tell first-time guests what a typical gathering looks like.</p>' } },
    ],
  },
  {
    id: 'proof-points', name: 'Proof points', category: 'Content', description: 'Three short numbered highlights',
    section: { paddingTop: 0, paddingBottom: 0 },
    blocks: [{ type: 'trust-bar', fluid: full(1, 2) }],
  },
  {
    id: 'features', name: 'Three features', category: 'Content', description: 'Cards for ministries or programs',
    section: { paddingTop: 0, paddingBottom: 0 },
    blocks: [{ type: 'features', fluid: full(1, 8), content: {
      eyebrow: 'Life together', title: 'Find your place.', subtitle: 'There is a next step for everyone.', numbered: true,
      items: [
        { icon: 'lucide-star', number: '01', title: 'Sunday worship', text: 'Gather with us for music, teaching and prayer.' },
        { icon: 'lucide-star', number: '02', title: 'Groups', text: 'Meaningful friendships around shared meals.' },
        { icon: 'lucide-star', number: '03', title: 'Serve the city', text: 'Partner with neighbors to make a difference.' },
      ],
    } }],
  },
  {
    id: 'quote', name: 'Quote', category: 'Content', description: 'A large pull quote',
    section: { paddingTop: 0, paddingBottom: 0 },
    blocks: [{ type: 'quote', fluid: full(1, 3) }],
  },
  {
    id: 'testimonials', name: 'Stories', category: 'Content', description: 'What people say about you',
    section: { paddingTop: 0, paddingBottom: 0 },
    blocks: [{ type: 'testimonials', fluid: full(1, 5), content: {
      title: 'Stories from our community',
      testimonials: [
        { name: 'Maria', role: 'Member since 2019', quote: 'I came looking for answers and found a family.' },
        { name: 'James', role: 'Volunteer', quote: 'Serving here has changed how I see my neighbors.' },
        { name: 'Aisha', role: 'Small group leader', quote: 'There is always room at the table.' },
      ],
    } }],
  },
  {
    id: 'service-times', name: 'Service times', category: 'Community', description: 'Callout with your gathering times',
    section: { paddingTop: 30, paddingBottom: 30 },
    blocks: [{ type: 'split-banner', fluid: full(1, 5) }],
  },
  {
    id: 'events', name: 'Upcoming events', category: 'Community', description: 'A list of dates and details',
    section: { paddingTop: 0, paddingBottom: 0 },
    blocks: [{ type: 'events', fluid: full(1, 6), content: {
      eyebrow: 'Coming up', title: 'Make room on your calendar.',
      items: [
        { date: 'AUG 18', title: 'Community Picnic', description: 'Bring a blanket and something to share.', time: '12:30 PM' },
        { date: 'AUG 28', title: 'Midweek Table', description: 'A meal and honest conversation.', time: '6:30 PM' },
        { date: 'SEP 07', title: 'Serve the City', description: 'Practical partnership across the city.', time: '9:00 AM' },
      ],
    } }],
  },
  {
    id: 'contact', name: 'Contact', category: 'Community', description: 'Email, phone and address',
    section: { paddingTop: 0, paddingBottom: 0 },
    blocks: [{ type: 'contact', fluid: full(1, 6) }],
  },
  {
    id: 'location', name: 'Location', category: 'Community', description: 'Address with a map',
    section: { paddingTop: 0, paddingBottom: 0 },
    blocks: [{ type: 'map', fluid: full(1, 5) }],
  },
  {
    id: 'video', name: 'Video', category: 'Content', description: 'A featured sermon or video',
    section: { paddingTop: 0, paddingBottom: 0 },
    blocks: [{ type: 'video', fluid: full(1, 7) }],
  },
];

/** Build a new section (fresh ids) from a template. */
// ── Saved sections (the user's own, stored as { kind: 'section' } templates) ──
const SECTION_KEYS = ['columns', 'gap', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'marginTop', 'marginBottom', 'backgroundColor', 'fluidConfig'];

/** A page section → what gets stored (no ids; content, layout and styles kept). */
export function sectionToSaved(section) {
  const sec = Object.fromEntries(SECTION_KEYS.filter((k) => section[k] !== undefined).map((k) => [k, section[k]]));
  return {
    ...sec,
    blocks: (section.blocks || []).map((b) => ({
      type: b.type, fluid: b.fluid, fluidMobile: b.fluidMobile ?? null,
      ...(b.style ? { style: b.style } : {}), content: b.content || {},
    })),
  };
}

/** A stored saved-section row → a picker template (category "Saved"). */
export function savedToTemplate(row) {
  const sec = row.snapshot?.sections?.[0] || { blocks: [] };
  const { blocks = [], ...section } = sec;
  return { id: `saved-${row.id}`, savedId: row.id, saved: true, name: row.name, category: 'Saved', description: 'Your saved section', section, blocks };
}

export function sectionFromTemplate(template) {
  if (template.saved) {
    // Keep the section's own grid, background and the blocks' styles/phone layout.
    return createSection({
      ...template.section,
      blocks: template.blocks.map((b) => ({
        ...createBlock(b.type, { fluid: { ...b.fluid } }),
        content: { ...(b.content || {}) },
        ...(b.style ? { style: { ...b.style } } : {}),
        fluidMobile: b.fluidMobile ? { ...b.fluidMobile } : null,
      })),
    });
  }
  return createSection({
    ...template.section,
    fluidConfig: { ...DEFAULT_SECTION.fluidConfig },
    backgroundColor: null,
    blocks: template.blocks.map((b) => {
      const block = createBlock(b.type, { fluid: { ...b.fluid } });
      return { ...block, content: { ...makeDefaultBlockContent(b.type), ...(b.content || {}) } };
    }),
  });
}

/** Section object for the live preview thumbnail (no ids needed). */
export function previewSection(template) {
  if (template.saved) {
    return {
      ...DEFAULT_SECTION,
      ...template.section,
      blocks: template.blocks.map((b, i) => ({ id: `preview-${template.id}-${i}`, type: b.type, fluid: b.fluid, style: b.style, content: b.content || {} })),
    };
  }
  return {
    ...DEFAULT_SECTION,
    ...template.section,
    fluidConfig: { ...DEFAULT_SECTION.fluidConfig },
    backgroundColor: null,
    blocks: template.blocks.map((b, i) => ({
      id: `preview-${template.id}-${i}`,
      type: b.type,
      fluid: b.fluid,
      content: { ...makeDefaultBlockContent(b.type), ...(b.content || {}) },
    })),
  };
}
