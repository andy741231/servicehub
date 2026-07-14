import DOMPurify from 'dompurify';

const uid = () => `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const EMAIL_BLOCKS = [
  { type: 'text', label: 'Text', description: 'Heading or body copy' },
  { type: 'image', label: 'Image', description: 'Hosted image with alt text' },
  { type: 'button', label: 'Button', description: 'Call to action link' },
  { type: 'divider', label: 'Divider', description: 'Horizontal separator' },
  { type: 'spacer', label: 'Spacer', description: 'Vertical breathing room' },
  { type: 'columns', label: 'Columns', description: 'Two-column content row' },
];

export const createBlock = (type) => {
  const id = uid();
  const blocks = {
    text: { id, type, data: { content: '<h2>Heading</h2><p>Add your message here.</p>', align: 'left', color: '#1C2B2A' } },
    image: { id, type, data: { src: 'https://placehold.co/600x320/png', alt: 'Email image', href: '' } },
    button: { id, type, data: { label: 'Call to action', href: 'https://example.com', backgroundColor: '#0D9488', color: '#FFFFFF', align: 'center' } },
    divider: { id, type, data: { color: '#E2E8F0', width: 100 } },
    spacer: { id, type, data: { height: 32 } },
    columns: { id, type, data: { left: 'Column one', right: 'Column two', backgroundColor: '#F0FDFA' } },
  };
  return blocks[type];
};

export const createDocument = () => ({
  schemaVersion: 1,
  settings: { backgroundColor: '#FAFDFC', contentBackground: '#FFFFFF', width: 600 },
  blocks: [createBlock('text'), createBlock('button')],
});

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));

const renderBlock = (block) => {
  const data = block.data || {};
  if (block.type === 'text') return `<tr><td style="padding:16px 32px;color:${escapeHtml(data.color || '#1C2B2A')};text-align:${escapeHtml(data.align || 'left')};font-family:Arial,sans-serif;font-size:16px;line-height:1.5;">${DOMPurify.sanitize(data.content || '', { ALLOWED_TAGS: ['a', 'b', 'br', 'em', 'h1', 'h2', 'h3', 'li', 'ol', 'p', 'span', 'strong', 'ul'], ALLOWED_ATTR: ['href', 'style'] })}</td></tr>`;
  if (block.type === 'image') {
    const image = `<img src="${escapeHtml(data.src)}" alt="${escapeHtml(data.alt)}" width="536" style="display:block;width:100%;height:auto;border:0;" />`;
    return `<tr><td style="padding:16px 32px;">${data.href ? `<a href="${escapeHtml(data.href)}" target="_blank">${image}</a>` : image}</td></tr>`;
  }
  if (block.type === 'button') return `<tr><td style="padding:16px 32px;text-align:${escapeHtml(data.align || 'center')};"><a href="${escapeHtml(data.href)}" target="_blank" style="display:inline-block;background:${escapeHtml(data.backgroundColor || '#0D9488')};color:${escapeHtml(data.color || '#FFFFFF')};padding:12px 20px;border-radius:6px;font-family:Arial,sans-serif;font-size:16px;font-weight:700;text-decoration:none;">${escapeHtml(data.label)}</a></td></tr>`;
  if (block.type === 'divider') return `<tr><td style="padding:16px 32px;"><div style="height:1px;background:${escapeHtml(data.color || '#E2E8F0')};width:${Number(data.width) || 100}%;"></div></td></tr>`;
  if (block.type === 'spacer') return `<tr><td height="${Math.max(8, Math.min(160, Number(data.height) || 32))}" style="font-size:1px;line-height:1px;">&nbsp;</td></tr>`;
  if (block.type === 'columns') return `<tr><td style="padding:16px 32px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td width="50%" valign="top" style="padding:16px;background:${escapeHtml(data.backgroundColor || '#F0FDFA')};font-family:Arial,sans-serif;line-height:1.5;">${escapeHtml(data.left)}</td><td width="16">&nbsp;</td><td width="50%" valign="top" style="padding:16px;background:${escapeHtml(data.backgroundColor || '#F0FDFA')};font-family:Arial,sans-serif;line-height:1.5;">${escapeHtml(data.right)}</td></tr></table></td></tr>`;
  return '';
};

export const compileEmailHtml = (document) => `<!doctype html><html><body style="margin:0;background:${escapeHtml(document.settings.backgroundColor)};"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${escapeHtml(document.settings.backgroundColor)};"><tr><td align="center" style="padding:24px 12px;"><table role="presentation" width="${Number(document.settings.width) || 600}" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:${Number(document.settings.width) || 600}px;background:${escapeHtml(document.settings.contentBackground)};">${document.blocks.map(renderBlock).join('')}</table></td></tr></table></body></html>`;
