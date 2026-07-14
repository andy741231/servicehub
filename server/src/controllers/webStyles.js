import prisma from '../db/client.js';

// GET /api/web/styles — get the single site style record (create default if missing)
export const getSiteStyles = async (req, res) => {
  try {
    let style = await prisma.webSiteStyle.findFirst();
    if (!style) {
      style = await prisma.webSiteStyle.create({
        data: {
          tokens: JSON.stringify({
            colors: { primary: '#152b45', secondary: '#54738e', accent: '#b08a4a', background: '#f8f6f1', text: '#152b45', muted: '#647384' },
            fonts: { heading: 'DM Sans, sans-serif', body: 'DM Sans, sans-serif', serif: 'Libre Baskerville, Georgia, serif' },
            spacing: { base: 16 },
            borderRadius: { default: 5 },
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
