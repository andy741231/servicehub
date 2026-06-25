import prisma from '../db/client.js';

// Azure SQL doesn't support Prisma's Json type — content is stored as a JSON string.
// These helpers handle serialization/deserialization at the controller boundary.
const parseJsonField = (value) => {
  if (value == null) return null;
  return typeof value === 'string' ? JSON.parse(value) : value;
};

const stringifyJsonField = (value) => {
  if (value == null) return null;
  return typeof value === 'string' ? value : JSON.stringify(value);
};

const parseBlock = (block) => ({
  ...block,
  content: typeof block.content === 'string' ? JSON.parse(block.content) : block.content,
});

// Parse a full section (including its nested blocks)
const parseSection = (section) => ({
  ...section,
  blocks: (section.blocks || []).map(parseBlock),
});

// Default section settings
const DEFAULT_SECTION = {
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

export const getPageBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    let page = await prisma.webPage.findUnique({
      where: { slug },
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: { blocks: { orderBy: { order: 'asc' } } },
        },
        // Keep legacy blocks at page level for backward compatibility
        blocks: { orderBy: { order: 'asc' } },
      },
    });

    // Block public access to unpublished (draft) pages
    if (page && !page.isPublished && !req.user) {
      return res.status(404).json({ error: 'Page not found' });
    }

    // Create a default page if it doesn't exist yet
    if (!page) {
      page = await prisma.webPage.create({
        data: {
          slug,
          title: slug.charAt(0).toUpperCase() + slug.slice(1) + ' Page',
          template: 'modern',
        },
        include: {
          sections: { orderBy: { order: 'asc' }, include: { blocks: { orderBy: { order: 'asc' } } } },
          blocks: { orderBy: { order: 'asc' } },
        },
      });

      // Create a default section with a hero block
      const section = await prisma.webSection.create({
        data: {
          pageId: page.id,
          order: 0,
          ...DEFAULT_SECTION,
          blocks: {
            create: [{
              pageId: page.id,
              type: 'hero',
              order: 0,
              content: JSON.stringify({
                title: 'Welcome to our platform',
                subtitle: 'Discover amazing features and build your online presence.',
              }),
            }],
          },
        },
        include: { blocks: { orderBy: { order: 'asc' } } },
      });

      page.sections = [section];
    }

    // ── Migrate legacy page-level blocks into a section if none exist yet ───
    if (page.sections.length === 0 && page.blocks.length > 0) {
      const section = await prisma.webSection.create({
        data: { pageId: page.id, order: 0, ...DEFAULT_SECTION },
      });
      // Re-assign legacy blocks to the new section
      await Promise.all(
        page.blocks.map((b, i) =>
          prisma.webBlock.update({ where: { id: b.id }, data: { sectionId: section.id, order: i } })
        )
      );
      // Reload
      page = await prisma.webPage.findUnique({
        where: { slug },
        include: {
          sections: { orderBy: { order: 'asc' }, include: { blocks: { orderBy: { order: 'asc' } } } },
          blocks: { orderBy: { order: 'asc' } },
        },
      });
    }

    // ── Shared header/footer: always read from the "home" page ──────────────
    let sharedHeader = parseJsonField(page.header);
    let sharedFooter = parseJsonField(page.footer);

    if (slug !== 'home') {
      const homePage = await prisma.webPage.findUnique({
        where: { slug: 'home' },
        select: { header: true, footer: true },
      });
      if (homePage) {
        sharedHeader = parseJsonField(homePage.header) || sharedHeader;
        sharedFooter = parseJsonField(homePage.footer) || sharedFooter;
      }
    }

    // ── Build nav from Pages list ─────────────────────────────────────────
    const allNavPages = await prisma.webPage.findMany({
      where: { isPublished: true, hideFromNav: false },
      select: { id: true, slug: true, title: true, navLabel: true, href: true, parentId: true, order: true },
      orderBy: { order: 'asc' },
    });

    const topLevel = allNavPages.filter(p => !p.parentId);
    const navItems = topLevel.map(p => ({
      label:    p.navLabel || p.title,
      href:     p.href || (p.slug === 'home' ? '/' : `/${p.slug}`),
      children: allNavPages
        .filter(c => c.parentId === p.id)
        .map(c => ({
          label: c.navLabel || c.title,
          href:  c.href || (c.slug === 'home' ? '/' : `/${c.slug}`),
        })),
    }));

    res.json({
      ...page,
      header: sharedHeader,
      footer: sharedFooter,
      sections: page.sections.map(parseSection),
      // Keep legacy blocks field for any older clients
      blocks: page.blocks.map(parseBlock),
      nav: navItems,
    });
  } catch (error) {
    console.error('Error fetching web page:', error);
    res.status(500).json({ error: 'Failed to fetch web page' });
  }
};

export const updatePage = async (req, res) => {
  try {
    const { slug } = req.params;
    const { template, header, footer, sections } = req.body;

    const existingPage = await prisma.webPage.findUnique({ where: { slug } });
    if (!existingPage) {
      return res.status(404).json({ error: 'Page not found' });
    }

    const updatedPage = await prisma.$transaction(async (tx) => {
      // 1. Update page-level fields
      const page = await tx.webPage.update({
        where: { slug },
        data: {
          template,
          header: stringifyJsonField(header),
          footer: stringifyJsonField(footer),
        },
      });

      if (Array.isArray(sections)) {
        // 2. Delete all existing sections and their blocks
        const existingSections = await tx.webSection.findMany({ where: { pageId: page.id }, select: { id: true } });
        if (existingSections.length > 0) {
          await tx.webBlock.deleteMany({ where: { sectionId: { in: existingSections.map(s => s.id) } } });
          await tx.webSection.deleteMany({ where: { pageId: page.id } });
        }
        // Also clean up any orphaned page-level blocks
        await tx.webBlock.deleteMany({ where: { pageId: page.id, sectionId: null } });

        // 3. Recreate sections + blocks
        for (let sIdx = 0; sIdx < sections.length; sIdx++) {
          const sec = sections[sIdx];
          const newSection = await tx.webSection.create({
            data: {
              pageId: page.id,
              order: sIdx,
              columns:         sec.columns        ?? 1,
              gap:             sec.gap            ?? 24,
              paddingTop:      sec.paddingTop     ?? 48,
              paddingBottom:   sec.paddingBottom  ?? 48,
              paddingLeft:     sec.paddingLeft    ?? 0,
              paddingRight:    sec.paddingRight   ?? 0,
              marginTop:       sec.marginTop      ?? 0,
              marginBottom:    sec.marginBottom   ?? 0,
              backgroundColor: sec.backgroundColor ?? null,
            },
          });

          const blocks = Array.isArray(sec.blocks) ? sec.blocks : [];
          if (blocks.length > 0) {
            await tx.webBlock.createMany({
              data: blocks.map((block, bIdx) => ({
                pageId:    page.id,
                sectionId: newSection.id,
                type:      block.type,
                order:     bIdx,
                content:   JSON.stringify(block.content),
              })),
            });
          }
        }
      }

      return tx.webPage.findUnique({
        where: { slug },
        include: {
          sections: { orderBy: { order: 'asc' }, include: { blocks: { orderBy: { order: 'asc' } } } },
          blocks:   { orderBy: { order: 'asc' } },
        },
      });
    });

    res.json({
      ...updatedPage,
      header:   parseJsonField(updatedPage.header),
      footer:   parseJsonField(updatedPage.footer),
      sections: updatedPage.sections.map(parseSection),
      blocks:   updatedPage.blocks.map(parseBlock),
    });
  } catch (error) {
    console.error('Error updating web page:', error);
    res.status(500).json({ error: 'Failed to update web page' });
  }
};
