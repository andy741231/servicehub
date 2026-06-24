import prisma from '../db/client.js';

const parseJsonField = (v) => (v == null ? null : typeof v === 'string' ? JSON.parse(v) : v);
const stringifyJsonField = (v) => (v == null ? null : typeof v === 'string' ? v : JSON.stringify(v));
const parseBlock = (b) => ({ ...b, content: typeof b.content === 'string' ? JSON.parse(b.content) : b.content });
const serializeBlock = (b, i) => ({ pageId: b.pageId, type: b.type, order: i, content: JSON.stringify(b.content) });

// GET /api/web/pages — list all pages (top-level first, then children)
export const listPages = async (req, res) => {
  try {
    const pages = await prisma.webPage.findMany({
      orderBy: [{ order: 'asc' }],
      select: {
        id: true, slug: true, title: true, navLabel: true,
        isPublished: true, href: true, parentId: true, updatedAt: true,
        order: true, isReserved: true, hideFromNav: true,
      },
    });
    res.json(pages);
  } catch (e) {
    console.error('listPages error:', e);
    res.status(500).json({ error: 'Failed to list pages' });
  }
};

// POST /api/web/pages — create new page or nav link
export const createPage = async (req, res) => {
  try {
    const { slug, title, navLabel, isPublished = true, href = null, parentId = null, isReserved = false, hideFromNav = false } = req.body;
    if (!slug || !title) return res.status(400).json({ error: 'slug and title required' });
    const existing = await prisma.webPage.findUnique({ where: { slug } });
    if (existing) return res.status(409).json({ error: 'Slug already exists' });

    const isLinkItem = slug.startsWith('__link_');
    // Get max order for items at the same level
    const maxOrder = await prisma.webPage.findFirst({
      where: { parentId: parentId || null },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const nextOrder = (maxOrder?.order ?? -1) + 1;

    const page = await prisma.webPage.create({
      data: {
        slug, title, navLabel, isPublished, href, parentId, template: 'default',
        order: nextOrder, isReserved, hideFromNav,
        // Only seed a hero block for real pages, not link nav items
        ...(!isLinkItem && {
          blocks: { create: [{ type: 'hero', order: 0, content: JSON.stringify({ title, subtitle: '' }) }] }
        }),
      },
    });
    res.status(201).json(page);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create page' });
  }
};

// PATCH /api/web/pages/:id — update page meta (not blocks)
export const updatePageMeta = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, navLabel, isPublished, slug, href, parentId, isReserved, hideFromNav, order } = req.body;
    const page = await prisma.webPage.update({
      where: { id },
      data: { title, navLabel, isPublished, slug, href, parentId, isReserved, hideFromNav, order },
    });
    res.json(page);
  } catch (e) {
    res.status(500).json({ error: 'Failed to update page' });
  }
};

// DELETE /api/web/pages/:id — also deletes child nav items
export const deletePage = async (req, res) => {
  try {
    const { id } = req.params;
    // Delete children first
    const children = await prisma.webPage.findMany({ where: { parentId: id }, select: { id: true } });
    for (const child of children) {
      await prisma.webBlock.deleteMany({ where: { pageId: child.id } });
      await prisma.webPage.delete({ where: { id: child.id } });
    }
    await prisma.webBlock.deleteMany({ where: { pageId: id } });
    await prisma.webPage.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete page' });
  }
};

// PUT /api/web/pages/reorder — bulk update order for pages
export const reorderPages = async (req, res) => {
  try {
    const { items } = req.body; // [{ id, order }, ...]
    if (!Array.isArray(items)) return res.status(400).json({ error: 'items array required' });

    await prisma.$transaction(
      items.map(({ id, order }) =>
        prisma.webPage.update({
          where: { id },
          data: { order },
        })
      )
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to reorder pages' });
  }
};
