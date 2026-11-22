import {
  AlignLeft, Star, Hand, Quote, Award, LayoutList, Clock, CalendarDays,
  MapPin, Images, Sparkles, MessageSquare, Mail, Video, Image as ImageIcon, MousePointerClick, SeparatorHorizontal
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

/**
 * Block catalog for the block picker. `rows` is the starting height on the
 * 80px layout grid (new blocks are then fitted to their content), `category`
 * groups the picker, `keywords` help search. Legacy 'grid' is not offered.
 */
export const BLOCK_CATEGORIES = ['Basics', 'Lists & features', 'Community', 'Media'];
export const BLOCK_TYPES = [
  { id: 'hero',         name: 'Hero',         Icon: Sparkles,      category: 'Basics',           rows: 6, description: 'Large headline with a subtitle', keywords: 'banner header title welcome' },
  { id: 'image',        name: 'Image',        Icon: ImageIcon,     category: 'Basics',           rows: 5, description: 'A photo that fills its space', keywords: 'photo picture banner full width logo poster' },
  { id: 'button',       name: 'Button',       Icon: MousePointerClick, category: 'Basics',       rows: 1, description: 'A call-to-action button', keywords: 'cta link action donate give' },
  { id: 'divider',      name: 'Divider',      Icon: SeparatorHorizontal, category: 'Basics',     rows: 1, description: 'A line or empty space between blocks', keywords: 'spacer separator rule line gap space hr' },
  { id: 'text',         name: 'Text',         Icon: AlignLeft,     category: 'Basics',           rows: 3, description: 'Paragraphs, headings and lists', keywords: 'paragraph copy body rich' },
  { id: 'intro',        name: 'Introduction', Icon: Hand,          category: 'Basics',           rows: 5, description: 'Colored band with a title and button', keywords: 'call to action cta button' },
  { id: 'quote',        name: 'Quote',        Icon: Quote,         category: 'Basics',           rows: 3, description: 'Large pull quote', keywords: 'testimonial citation' },
  { id: 'trust-bar',    name: 'Trust bar',    Icon: Award,          category: 'Lists & features', rows: 2, description: 'Short numbered proof points', keywords: 'stats numbers points' },
  { id: 'features',     name: 'Features',     Icon: Star,          category: 'Lists & features', rows: 7, description: 'Cards with an icon or number', keywords: 'cards grid services ministries' },
  { id: 'highlights',   name: 'Highlights',   Icon: LayoutList,      category: 'Lists & features', rows: 7, description: 'Image cards with a button', keywords: 'cards images programs' },
  { id: 'testimonials', name: 'Testimonials', Icon: MessageSquare, category: 'Lists & features', rows: 5, description: 'What people say', keywords: 'quotes reviews stories' },
  { id: 'split-banner', name: 'Service times',Icon: Clock,         category: 'Community',        rows: 5, description: 'Callout with a list of times', keywords: 'split banner sunday schedule worship' },
  { id: 'events',       name: 'Events',       Icon: CalendarDays,         category: 'Community',        rows: 6, description: 'Upcoming events list', keywords: 'calendar dates' },
  { id: 'contact',      name: 'Contact',      Icon: Mail,          category: 'Community',        rows: 6, description: 'Email, phone, address and a form', keywords: 'email phone address form' },
  { id: 'map',          name: 'Map',          Icon: MapPin,    category: 'Community',        rows: 5, description: 'Location with an embedded map', keywords: 'address directions location' },
  { id: 'gallery',      name: 'Gallery',      Icon: Images,    category: 'Media',            rows: 6, description: 'Grid of images with captions', keywords: 'photos images pictures' },
  { id: 'video',        name: 'Video',        Icon: Video,         category: 'Media',            rows: 7, description: 'YouTube or Vimeo video', keywords: 'youtube vimeo sermon' },
];
export const blockCatalogEntry = (type) => BLOCK_TYPES.find((b) => b.id === type);

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
    case 'image':        return { url: '', alt: '', caption: '', link: '', fit: 'cover', focus: 'center' };
    case 'button':       return { buttonText: 'Learn more', buttonLink: '#', buttonVariant: 'gold', align: 'center' };
    case 'divider':      return { style: 'line', width: 'full' };
    case 'text':         return { content: 'Start writing your content here...' };
    case 'trust-bar':    return { items: [{ number: '01', label: 'One welcoming community' }, { number: '03', label: 'Ways to connect each week' }, { number: '∞', label: 'Room for your next step' }] };
    case 'split-banner': return { eyebrow: 'Your first Sunday', title: 'Come curious. Leave encouraged.', body: 'There is no dress code, no perfect background required, and no pressure to have all the answers.', buttonText: 'What to expect', buttonLink: '#', buttonVariant: 'gold', times: [{ label: 'Sunday morning', value: '9:00 AM · 11:00 AM' }, { label: 'Midweek table', value: 'Wednesdays · 6:30 PM' }] };
    case 'events':       return { eyebrow: 'Coming up', title: 'Make room on your calendar.', items: [{ date: 'AUG 18', title: 'Community Picnic', description: 'Bring a blanket and something to share.', time: '12:30 PM' }] };
    case 'quote':        return { quote: 'A church should be a place where people can come as they are.', citation: 'The community' };
    case 'map':          return { address: '128 Harbor Street, Your City', embedUrl: '' };
    case 'intro':        return { title: 'Introduction', content: 'Add your introduction text here...', buttonText: 'Learn More', buttonLink: '#', buttonVariant: 'gold' };
    case 'features':     return { eyebrow: 'Why Harbor', title: 'A place to belong.', subtitle: 'Highlight what makes your community unique', numbered: false, items: [
      { icon: 'lucide-star', number: '01', title: 'Sunday worship', text: 'Gather with us for music, teaching and prayer.' },
      { icon: 'lucide-star', number: '02', title: 'Groups', text: 'Meaningful friendships around shared meals.' },
      { icon: 'lucide-star', number: '03', title: 'Serve the city', text: 'Partner with neighbors to make a difference.' },
    ] };
    case 'highlights':   return { title: 'Highlights', items: [
      { image: '', title: 'Kids & families', text: 'A safe, joyful place for every age.', buttonText: 'Learn more', buttonLink: '#' },
      { image: '', title: 'Groups', text: 'Find people to walk with through the week.', buttonText: 'Find a group', buttonLink: '#' },
      { image: '', title: 'Serve', text: 'Use your gifts to care for our neighbors.', buttonText: 'Get involved', buttonLink: '#' },
    ] };
    case 'gallery':      return { title: 'Gallery', images: [{ url: '', caption: '' }, { url: '', caption: '' }, { url: '', caption: '' }] };
    case 'testimonials': return { title: 'Testimonials', testimonials: [
      { name: 'Maria', role: 'Member since 2019', quote: 'I came looking for answers and found a family.' },
      { name: 'James', role: 'Volunteer', quote: 'Serving here has changed how I see my neighbors.' },
      { name: 'Aisha', role: 'Small group leader', quote: 'There is always room at the table.' },
    ] };
    case 'contact':      return { title: 'Contact Us', subtitle: 'Get in touch with our team', email: 'contact@example.com', phone: '+1 (555) 123-4567', address: '123 Main St, City, State 12345', emailLabel: 'Email', phoneLabel: 'Phone', addressLabel: 'Address', reasonOptions: ['General question', 'Visit planning', 'Community care'] };
    case 'video':        return { title: 'Featured Video', videoUrl: '', description: 'Add a video description...' };
    case 'grid':         return { columns: 3, gap: 24, items: [{ width: '33.33%', blocks: [] }, { width: '33.33%', blocks: [] }, { width: '33.33%', blocks: [] }] };
    default:             return {};
  }
};

export function createBlock(type, options = {}) {
  const rows = BLOCK_TYPES.find((b) => b.id === type)?.rows ?? 2;
  const fluid = options.fluid || {
    colStart: 1,
    colEnd: 25,   // full width (24-col grid, 1-indexed lines)
    rowStart: 1,
    rowEnd: 1 + rows,
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
export function autoStackFluid(blocks, gridColumns = 24, rows = 2) {
  if (!blocks || blocks.length === 0) {
    return { colStart: 1, colEnd: gridColumns + 1, rowStart: 1, rowEnd: 1 + rows, zIndex: 0 };
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
    rowEnd: maxRowEnd + rows,
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

/** True when the user is entering text (fields, contentEditable). All editor shortcuts skip these. */
export function isTextEntryTarget(target) {
  if (!target || typeof target !== 'object') return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

/**
 * True when a keyboard event target is something the user is typing into or
 * operating (text entry, buttons, menus, dialogs). Single-key editor shortcuts
 * (Delete, Space, arrows, "+", "?") must ignore these targets.
 */
export function isTypingTarget(target) {
  if (isTextEntryTarget(target)) return true;
  if (!target || typeof target !== 'object') return false;
  if (target.tagName === 'BUTTON') return true;
  return !!target.closest?.('[role="menu"], [role="dialog"], [role="listbox"]');
}
