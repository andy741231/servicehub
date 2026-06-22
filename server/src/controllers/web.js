import prisma from '../db/client.js';

export const getPageBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    let page = await prisma.webPage.findUnique({
      where: { slug },
      include: {
        blocks: {
          orderBy: { order: 'asc' }
        }
      }
    });

    // If page doesn't exist, create a default one
    if (!page) {
      page = await prisma.webPage.create({
        data: {
          slug,
          title: slug.charAt(0).toUpperCase() + slug.slice(1) + ' Page',
          template: 'modern',
          blocks: {
            create: [
              {
                type: 'hero',
                order: 0,
                content: {
                  title: 'Welcome to our platform',
                  subtitle: 'Discover amazing features and build your online presence with our powerful tools.',
                }
              }
            ]
          }
        },
        include: {
          blocks: {
            orderBy: { order: 'asc' }
          }
        }
      });
    }

    res.json(page);
  } catch (error) {
    console.error('Error fetching web page:', error);
    res.status(500).json({ error: 'Failed to fetch web page' });
  }
};

export const updatePage = async (req, res) => {
  try {
    const { slug } = req.params;
    const { template, blocks } = req.body;

    // Verify page exists
    const existingPage = await prisma.webPage.findUnique({
      where: { slug }
    });

    if (!existingPage) {
      return res.status(404).json({ error: 'Page not found' });
    }

    // Update page using transaction
    const updatedPage = await prisma.$transaction(async (tx) => {
      // 1. Update the template
      const page = await tx.webPage.update({
        where: { slug },
        data: { template }
      });

      // 2. Delete all existing blocks
      await tx.webBlock.deleteMany({
        where: { pageId: page.id }
      });

      // 3. Create new blocks
      if (blocks && blocks.length > 0) {
        await tx.webBlock.createMany({
          data: blocks.map((block, index) => ({
            pageId: page.id,
            type: block.type,
            order: index,
            content: block.content
          }))
        });
      }

      // 4. Return updated page with new blocks
      return tx.webPage.findUnique({
        where: { slug },
        include: {
          blocks: {
            orderBy: { order: 'asc' }
          }
        }
      });
    });

    res.json(updatedPage);
  } catch (error) {
    console.error('Error updating web page:', error);
    res.status(500).json({ error: 'Failed to update web page' });
  }
};
