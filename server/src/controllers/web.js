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

const serializeBlock = (block, index) => ({
  pageId:  block.pageId,
  type:    block.type,
  order:   index,
  content: JSON.stringify(block.content),
});

export const getPageBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    let page = await prisma.webPage.findUnique({
      where: { slug },
      include: { blocks: { orderBy: { order: 'asc' } } }
    });

    // Create a default page if it doesn't exist yet
    if (!page) {
      page = await prisma.webPage.create({
        data: {
          slug,
          title: slug.charAt(0).toUpperCase() + slug.slice(1) + ' Page',
          template: 'modern',
          blocks: {
            create: [{
              type: 'hero',
              order: 0,
              content: JSON.stringify({
                title: 'Welcome to our platform',
                subtitle: 'Discover amazing features and build your online presence.',
              }),
            }]
          }
        },
        include: { blocks: { orderBy: { order: 'asc' } } }
      });
    }

    // ── Shared header/footer: always read from the "home" page ──────────────
    let sharedHeader = parseJsonField(page.header);
    let sharedFooter = parseJsonField(page.footer);

    if (slug !== 'home') {
      // For non-home pages, fetch the home page's header/footer
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
    const { template, header, footer, blocks } = req.body;

    const existingPage = await prisma.webPage.findUnique({ where: { slug } });
    if (!existingPage) {
      return res.status(404).json({ error: 'Page not found' });
    }

    const updatedPage = await prisma.$transaction(async (tx) => {
      const page = await tx.webPage.update({
        where: { slug },
        data: {
          template,
          header: stringifyJsonField(header),
          footer: stringifyJsonField(footer),
        }
      });

      if (Array.isArray(blocks)) {
        await tx.webBlock.deleteMany({ where: { pageId: page.id } });
        if (blocks.length > 0) {
          await tx.webBlock.createMany({
            data: blocks.map((block, i) => serializeBlock({ ...block, pageId: page.id }, i))
          });
        }
      }

      return tx.webPage.findUnique({
        where: { slug },
        include: { blocks: { orderBy: { order: 'asc' } } }
      });
    });

    res.json({
      ...updatedPage,
      header: parseJsonField(updatedPage.header),
      footer: parseJsonField(updatedPage.footer),
      blocks: updatedPage.blocks.map(parseBlock),
    });
  } catch (error) {
    console.error('Error updating web page:', error);
    res.status(500).json({ error: 'Failed to update web page' });
  }
};
