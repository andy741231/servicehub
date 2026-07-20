import {
  Image as ImageIcon, AlignLeft, Star, Hand, Rows3, Quote, LayoutGrid,
  Sparkles, MessageSquare, Mail, Video, Columns
} from 'lucide-react';

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
  { id: 'slider',       name: 'Slider',       Icon: ImageIcon,     description: 'Slides with images, color, text, and video backgrounds' },
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
    case 'slider':       return {
      autoplay: true,
      interval: 6000,
      transition: 'fade',
      showArrows: true,
      showDots: true,
      height: 'large',
      slides: [{
        id: `slide-${Date.now()}`,
        backgroundType: 'color',
        backgroundColor: '#152b45',
        overlay: 'dark',
        textAlign: 'left',
        verticalAlign: 'center',
        eyebrow: '<p>Welcome</p>',
        title: '<p>A place to belong.</p>',
        subtitle: '<p>Add a compelling message here.</p>',
        buttonText: 'Learn more',
        buttonLink: '#',
        buttonVariant: 'gold',
      }],
    };
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

export function createBlock(type) {
  return {
    id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    content: makeDefaultBlockContent(type),
    order: 0,
  };
}

export function createSection(overrides = {}) {
  return {
    id: `section-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ...DEFAULT_SECTION,
    blocks: [],
    order: 0,
    ...overrides,
  };
}
