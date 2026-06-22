import prisma from '../db/client.js';

// Azure SQL doesn't support Prisma's Json type — content is stored as a JSON string.
// These helpers handle serialization/deserialization at the controller boundary.
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

    res.json({ ...page, blocks: page.blocks.map(parseBlock) });
  } catch (error) {
    console.error('Error fetching web page:', error);
    res.status(500).json({ error: 'Failed to fetch web page' });
  }
};

export const updatePage = async (req, res) => {
  try {
    const { slug } = req.params;
    const { template, blocks } = req.body;

    const existingPage = await prisma.webPage.findUnique({ where: { slug } });
    if (!existingPage) {
      return res.status(404).json({ error: 'Page not found' });
    }

    const updatedPage = await prisma.$transaction(async (tx) => {
      const page = await tx.webPage.update({
        where: { slug },
        data: { template }
      });

      await tx.webBlock.deleteMany({ where: { pageId: page.id } });

      if (blocks?.length > 0) {
        await tx.webBlock.createMany({
          data: blocks.map((block, i) => serializeBlock({ ...block, pageId: page.id }, i))
        });
      }

      return tx.webPage.findUnique({
        where: { slug },
        include: { blocks: { orderBy: { order: 'asc' } } }
      });
    });

    res.json({ ...updatedPage, blocks: updatedPage.blocks.map(parseBlock) });
  } catch (error) {
    console.error('Error updating web page:', error);
    res.status(500).json({ error: 'Failed to update web page' });
  }
};
