import prisma from '../db/client.js';

// GET /api/web/styles — get the single site style record (create default if missing)
export const getSiteStyles = async (req, res) => {
  try {
    let style = await prisma.webSiteStyle.findFirst();
    if (!style) {
      style = await prisma.webSiteStyle.create({
        data: {
          tokens: JSON.stringify({
            colors: { primary: '#2563eb', secondary: '#7c3aed', accent: '#f59e0b', background: '#ffffff', text: '#111827', muted: '#6b7280' },
            fonts: { heading: 'Inter, sans-serif', body: 'Inter, sans-serif' },
            spacing: { base: 16 },
            borderRadius: { default: 8 },
          })
        }
      });
    }
    res.json({ ...style, tokens: typeof style.tokens === 'string' ? JSON.parse(style.tokens) : style.tokens });
  } catch (e) {
    res.status(500).json({ error: 'Failed to get styles' });
  }
};

// PUT /api/web/styles — replace tokens
export const updateSiteStyles = async (req, res) => {
  try {
    const { tokens } = req.body;
    let style = await prisma.webSiteStyle.findFirst();
    if (style) {
      style = await prisma.webSiteStyle.update({ where: { id: style.id }, data: { tokens: JSON.stringify(tokens) } });
    } else {
      style = await prisma.webSiteStyle.create({ data: { tokens: JSON.stringify(tokens) } });
    }
    res.json({ ...style, tokens });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update styles' });
  }
};
