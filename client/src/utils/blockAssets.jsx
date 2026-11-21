/**
 * Shared block assets — icon maps, social platforms, button tiers.
 * Used by both the editor (BlockContent, inspectors) and the public renderer
 * (Home.jsx) so atomic blocks render identically in both contexts.
 */
import {
  Star, Heart, Check, Globe, Calendar, MapPin, Mail, Phone, Users,
  Sparkles, Hand, ShieldCheck, Sun, Music, BookOpen,
} from 'lucide-react';

/**
 * Social brand marks — lucide-react ≥0.5x removed brand icons, so the
 * social-links block uses these inline SVG glyphs (sized via `size` prop).
 */
const BrandIcon = (path, viewBox = '0 0 24 24') => function Brand({ size = 17, ...props }) {
  return (
    <svg width={size} height={size} viewBox={viewBox} fill="currentColor" aria-hidden="true" {...props}>
      <path d={path} />
    </svg>
  );
};
const FacebookIcon = BrandIcon('M13.5 21v-7h2.4l.4-3h-2.8V9.1c0-.9.3-1.5 1.6-1.5H16V4.9c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4V11H7v3h2.6v7h3.9z');
const InstagramIcon = BrandIcon('M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2-.1-1.3-.1-1.7-.1-4.9s0-3.6.1-4.9c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4 1.3-.1 1.7-.1 4.9-.1M12 0C8.7 0 8.3 0 7 .1 5.7.2 4.9.5 4.1.9c-.7.3-1.3.7-1.9 1.3C1.6 2.8 1.2 3.4.9 4.1.5 4.9.2 5.7.1 7 0 8.3 0 8.7 0 12s0 3.7.1 5c.1 1.3.4 2.1.8 2.9.3.7.7 1.3 1.3 1.9.6.6 1.2 1 1.9 1.3.8.4 1.6.7 2.9.8 1.3.1 1.7.1 5 .1s3.7 0 5-.1c1.3-.1 2.1-.4 2.9-.8.7-.3 1.3-.7 1.9-1.3.6-.6 1-1.2 1.3-1.9.4-.8.7-1.6.8-2.9.1-1.3.1-1.7.1-5s0-3.7-.1-5c-.1-1.3-.4-2.1-.8-2.9-.3-.7-.7-1.3-1.3-1.9-.6-.6-1.2-1-1.9-1.3-.8-.4-1.6-.7-2.9-.8-1.3-.1-1.7-.1-5-.1zm0 5.8a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.4-11.8a1.4 1.4 0 1 0 0 2.9 1.4 1.4 0 0 0 0-2.9z');
const XIcon = BrandIcon('M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-6.4L6.4 22H3.3l7.3-8.3L1 2h6.5l4.4 5.9L18.9 2zm-1.1 18h1.7L7.1 3.7H5.3L17.8 20z');
const YoutubeIcon = BrandIcon('M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12a31.4 31.4 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.4 31.4 0 0 0 24 12a31.4 31.4 0 0 0-.5-5.8zM9.6 15.6V8.4L15.8 12l-6.2 3.6z');
const LinkedinIcon = BrandIcon('M20.4 20.5h-3.6v-5.6c0-1.3 0-3-1.9-3-1.9 0-2.1 1.4-2.1 2.9v5.7H9.2V9h3.4v1.6h.1a3.8 3.8 0 0 1 3.4-1.9c3.6 0 4.3 2.4 4.3 5.5v6.3zM5.3 7.4a2.1 2.1 0 1 1 0-4.2 2.1 2.1 0 0 1 0 4.2zM7.2 20.5H3.5V9h3.7v11.5z');
const TiktokIcon = BrandIcon('M19.6 5.8a4.8 4.8 0 0 1-3.5-4.3V1h-3.4v13.4a2.9 2.9 0 1 1-2-2.7V8.2a6.3 6.3 0 1 0 5.4 6.2V7.9a8.1 8.1 0 0 0 4.7 1.5V6a4.8 4.8 0 0 1-1.2-.2z');

/** Icons available to the `icon` block — keyed by stable string id. */
export const ICON_CHOICES = {
  star: Star,
  heart: Heart,
  check: Check,
  globe: Globe,
  calendar: Calendar,
  'map-pin': MapPin,
  mail: Mail,
  phone: Phone,
  users: Users,
  sparkles: Sparkles,
  hand: Hand,
  shield: ShieldCheck,
  sun: Sun,
  music: Music,
  book: BookOpen,
};

/** Platforms available to the `social-links` block. */
export const SOCIAL_PLATFORMS = [
  { id: 'instagram', label: 'Instagram', Icon: InstagramIcon },
  { id: 'facebook',  label: 'Facebook',  Icon: FacebookIcon },
  { id: 'x',         label: 'X (Twitter)', Icon: XIcon },
  { id: 'youtube',   label: 'YouTube',   Icon: YoutubeIcon },
  { id: 'linkedin',  label: 'LinkedIn',  Icon: LinkedinIcon },
  { id: 'tiktok',    label: 'TikTok',    Icon: TiktokIcon },
  { id: 'web',       label: 'Website',   Icon: Globe },
];

/**
 * Button style tiers — the Squarespace-style site-wide button system.
 * Tiers are configured under Site Styles (tokens.buttons); legacy variant
 * names (gold/outline/default) remain supported for existing content.
 */
export const BUTTON_TIERS = [
  { id: 'primary',   label: 'Primary' },
  { id: 'secondary', label: 'Secondary' },
  { id: 'tertiary',  label: 'Tertiary' },
];

/** Select options for CTA fields inside composite blocks (tiers + legacy). */
export const BUTTON_VARIANT_OPTIONS = [
  ...BUTTON_TIERS,
  { id: 'gold',    label: 'Gold (legacy)' },
  { id: 'outline', label: 'Outline (legacy)' },
  { id: 'default', label: 'Navy (legacy)' },
];

export const SHAPES = [
  { id: 'rect',   label: 'Rectangle' },
  { id: 'circle', label: 'Circle' },
  { id: 'pill',   label: 'Pill' },
];
