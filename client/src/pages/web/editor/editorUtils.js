import {
  AlignLeft, Star, Hand, Rows3, Quote, LayoutGrid,
  Sparkles, MessageSquare, Mail, Video, Columns
} from 'lucide-react';

/**
 * Generate a stable client-side ID.
 * Uses crypto.randomUUID() when available (all modern browsers), with a
 * timestamp+random fallback for older environments.
 */
export function generateClientId(prefix = 'entity') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const resolveUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) {
    try {
      const parsed = new URL(url);
      if (parsed.hostname === window.location.hostname) return parsed.pathname + parsed.search + parsed.hash;
    } catch (e) { /* fall through */ }
    return url;
  }
  if (url.startsWith('/')) return url;
  return `/uploads/${url}`;
};

export const BLOCK_TYPES = [
  { id: 'text',         name: 'Text',         Icon: AlignLeft,    description: 'Rich text content with formatting' },
  { id: 'trust-bar',     name: 'Trust Bar',   Icon: Star,          description: 'Numbered proof points and highlights' },
  { id: 'split-banner',  name: 'Split Banner',Icon: Hand,          description: 'Two-column callout with service times' },
  { id: 'events',        name: 'Events',      Icon: Rows3,         description: 'Upcoming events list' },
  { id: 'quote',         name: 'Quote',       Icon: Quote,          description: 'Large testimonial quote' },
  { id: 'map',           name: 'Map',         Icon: LayoutGrid,     description: 'Location and map placeholder' },
  { id: 'intro',        name: 'Introduction', Icon: Hand,         description: 'Introduction section with button' },
  { id: 'features',     name: 'Features',     Icon: Star,         description: 'Feature grid with icons' },
  { id: 'highlights',   name: 'Highlights',   Icon: Sparkles,     description: 'Highlight cards with images' },
  { id: 'gallery',      name: 'Gallery',      Icon: LayoutGrid,   description: 'Image gallery' },
  { id: 'testimonials', name: 'Testimonials', Icon: MessageSquare,description: 'Customer testimonials' },
  { id: 'contact',      name: 'Contact',      Icon: Mail,         description: 'Contact information' },
  { id: 'video',        name: 'Video',        Icon: Video,        description: 'Video section' },
  { id: 'grid',         name: 'Grid',         Icon: Columns,      description: 'Multi-column layout' },
];

export const DEFAULT_SECTION = {
  columns: 1,
  gap: 24,
  fluidConfig: {
    gridColumns: 24,
    rowHeight: 80,
    gap: { horizontal: 8, vertical: 8 },
    fillScreen: false,
    minHeight: 320,
    verticalAlignment: 'top',
  },
  paddingTop: 48,
  paddingBottom: 48,
  paddingLeft: 0,
  paddingRight: 0,
  marginTop: 0,
  marginBottom: 0,
  backgroundColor: null,
};

export const makeDefaultBlockContent = (type) => {
  switch (type) {
    case 'hero':         return { title: 'Your Hero Title', subtitle: 'Add a compelling subtitle here' };
    case 'text':         return { content: 'Start writing your content here...' };
    case 'trust-bar':    return { items: [{ number: '01', label: 'One welcoming community' }, { number: '03', label: 'Ways to connect each week' }, { number: '∞', label: 'Room for your next step' }] };
    case 'split-banner': return { eyebrow: 'Your first Sunday', title: 'Come curious. Leave encouraged.', body: 'There is no dress code, no perfect background required, and no pressure to have all the answers.', buttonText: 'What to expect', buttonLink: '#', buttonVariant: 'gold', times: [{ label: 'Sunday morning', value: '9:00 AM · 11:00 AM' }, { label: 'Midweek table', value: 'Wednesdays · 6:30 PM' }] };
    case 'events':       return { eyebrow: 'Coming up', title: 'Make room on your calendar.', items: [{ date: 'AUG 18', title: 'Community Picnic', description: 'Bring a blanket and something to share.', time: '12:30 PM' }] };
    case 'quote':        return { quote: 'A church should be a place where people can come as they are.', citation: 'The community' };
    case 'map':          return { address: '128 Harbor Street, Your City', embedUrl: '' };
    case 'intro':        return { title: 'Introduction', content: 'Add your introduction text here...', buttonText: 'Learn More', buttonLink: '#', buttonVariant: 'gold' };
    case 'features':     return { eyebrow: 'Why Harbor', title: 'A place to belong.', subtitle: 'Highlight what makes your community unique', numbered: false, items: [] };
    case 'highlights':   return { title: 'Highlights', items: [] };
    case 'gallery':      return { title: 'Gallery', images: [] };
    case 'testimonials': return { title: 'Testimonials', testimonials: [] };
    case 'contact':      return { title: 'Contact Us', subtitle: 'Get in touch with our team', email: 'contact@example.com', phone: '+1 (555) 123-4567', address: '123 Main St, City, State 12345', emailLabel: 'Email', phoneLabel: 'Phone', addressLabel: 'Address', reasonOptions: ['General question', 'Visit planning', 'Community care'] };
    case 'video':        return { title: 'Featured Video', videoUrl: '', description: 'Add a video description...' };
    case 'grid':         return { columns: 3, gap: 24, items: [{ width: '33.33%', blocks: [] }, { width: '33.33%', blocks: [] }, { width: '33.33%', blocks: [] }] };
    default:             return {};
  }
};

export const SECTION_LAYOUTS = [
  { columns: 1, label: 'Full Width',  preview: [100] },
  { columns: 2, label: '2 Columns',   preview: [50, 50] },
  { columns: 3, label: '3 Columns',   preview: [33, 33, 33] },
  { columns: 4, label: '4 Columns',   preview: [25, 25, 25, 25] },
  { columns: 5, label: '5 Columns',   preview: [20, 20, 20, 20, 20] },
  { columns: 6, label: '6 Columns',   preview: [17, 17, 17, 17, 17, 17] },
];

export const SPACING_PRESETS = [
  { label: 'None',   value: 0 },
  { label: 'SM',     value: 24 },
  { label: 'MD',     value: 48 },
  { label: 'LG',     value: 80 },
  { label: 'XL',     value: 120 },
];

export function createBlock(type, options = {}) {
  const fluid = options.fluid || {
    colStart: 1,
    colEnd: 25,   // full width (24-col grid, 1-indexed lines)
    rowStart: 1,
    rowEnd: 3,    // 2 rows tall by default
    zIndex: 0,
  };
  return {
    id: generateClientId('block'),
    type,
    content: makeDefaultBlockContent(type),
    fluid,
    order: 0,
  };
}

/**
 * Auto-stack a new block below existing blocks in a section.
 * Returns fluid coords for a new block placed at the bottom of the grid.
 */
export function autoStackFluid(blocks, gridColumns = 24) {
  if (!blocks || blocks.length === 0) {
    return { colStart: 1, colEnd: gridColumns + 1, rowStart: 1, rowEnd: 3, zIndex: 0 };
  }
  const maxRowEnd = blocks.reduce((max, b) => {
    const fe = b.fluid?.rowEnd ?? 3;
    return Math.max(max, fe);
  }, 1);
  const maxZ = blocks.reduce((max, b) => {
    const z = b.fluid?.zIndex ?? 0;
    return Math.max(max, z);
  }, 0);
  return {
    colStart: 1,
    colEnd: gridColumns + 1,
    rowStart: maxRowEnd,
    rowEnd: maxRowEnd + 2,
    zIndex: maxZ + 1,
  };
}

export function createSection(overrides = {}) {
  return {
    id: generateClientId('section'),
    ...DEFAULT_SECTION,
    blocks: [],
    order: 0,
    ...overrides,
  };
}

/**
 * Deep-clone a block with a new client ID.
 * Preserves content, fluid coords, and type — only the ID is regenerated.
 */
export function duplicateBlock(block) {
  return {
    ...block,
    id: generateClientId('block'),
    content: JSON.parse(JSON.stringify(block.content || {})),
    fluid: block.fluid ? { ...block.fluid } : undefined,
    fluidMobile: block.fluidMobile ? { ...block.fluidMobile } : undefined,
  };
}

/**
 * Deep-clone a section with a new client ID.
 * Also regenerates IDs for all nested blocks.
 */
export function duplicateSection(section) {
  return {
    ...section,
    id: generateClientId('section'),
    fluidConfig: section.fluidConfig ? JSON.parse(JSON.stringify(section.fluidConfig)) : null,
    blocks: (section.blocks || []).map(duplicateBlock),
  };
}
