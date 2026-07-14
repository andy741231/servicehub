import prisma from '../db/client.js';

const parseJsonField = (value) => (value == null ? null : typeof value === 'string' ? JSON.parse(value) : value);
const stringifyJsonField = (value) => (value == null ? null : typeof value === 'string' ? value : JSON.stringify(value));
const parseBlock = (block) => ({ ...block, content: parseJsonField(block.content) });
const parseSection = (section) => ({ ...section, blocks: (section.blocks || []).map(parseBlock) });

const snapshotPage = (page) => ({
  template: page.template,
  header: parseJsonField(page.header),
  footer: parseJsonField(page.footer),
  sections: (page.sections || []).map(parseSection),
});

const getSavedBy = async (tx, userId) => {
  if (!userId) return { savedById: '', savedByName: 'Unknown' };
  const user = await tx.user.findUnique({ where: { id: userId }, select: { name: true } });
  return { savedById: userId, savedByName: user?.name || 'Unknown' };
};

const replacePageContent = async (tx, page, snapshot) => {
  await tx.webPage.update({
    where: { id: page.id },
    data: {
      template: snapshot.template,
      header: stringifyJsonField(snapshot.header),
      footer: stringifyJsonField(snapshot.footer),
    },
  });

  const existingSections = await tx.webSection.findMany({ where: { pageId: page.id }, select: { id: true } });
  if (existingSections.length) {
    await tx.webBlock.deleteMany({ where: { sectionId: { in: existingSections.map((section) => section.id) } } });
    await tx.webSection.deleteMany({ where: { pageId: page.id } });
  }
  await tx.webBlock.deleteMany({ where: { pageId: page.id, sectionId: null } });

  for (let sectionIndex = 0; sectionIndex < (snapshot.sections || []).length; sectionIndex++) {
    const section = snapshot.sections[sectionIndex];
    const newSection = await tx.webSection.create({
      data: {
        pageId: page.id, order: sectionIndex, columns: section.columns ?? 1, gap: section.gap ?? 24,
        paddingTop: section.paddingTop ?? 48, paddingBottom: section.paddingBottom ?? 48,
        paddingLeft: section.paddingLeft ?? 0, paddingRight: section.paddingRight ?? 0,
        marginTop: section.marginTop ?? 0, marginBottom: section.marginBottom ?? 0,
        backgroundColor: section.backgroundColor ?? null,
      },
    });
    const blocks = Array.isArray(section.blocks) ? section.blocks : [];
    if (blocks.length) {
      await tx.webBlock.createMany({
        data: blocks.map((block, blockIndex) => ({
          pageId: page.id, sectionId: newSection.id, type: block.type, order: blockIndex,
          content: stringifyJsonField(block.content),
        })),
      });
    }
  }
};

const serializePage = (page) => ({
  ...page,
  header: parseJsonField(page.header),
  footer: parseJsonField(page.footer),
  sections: page.sections.map(parseSection),
  blocks: page.blocks.map(parseBlock),
});

export const listWebTemplates = async (_req, res) => {
  try {
    const templates = await prisma.webPageTemplate.findMany({ orderBy: { updatedAt: 'desc' } });
    res.json({ templates: templates.map((template) => ({ ...template, snapshot: parseJsonField(template.snapshot) })) });
  } catch (error) {
    console.error('Error listing web page templates:', error);
    res.status(500).json({ error: 'Failed to list web page templates' });
  }
};

export const createWebTemplate = async (req, res) => {
  try {
    const { name, description = null, snapshot } = req.body;
    if (!name?.trim() || !snapshot || !Array.isArray(snapshot.sections)) {
      return res.status(400).json({ error: 'name and a valid page snapshot are required' });
    }
    const savedBy = await getSavedBy(prisma, req.user?.id);
    const template = await prisma.webPageTemplate.create({
      data: { name: name.trim(), description: description?.trim() || null, snapshot: stringifyJsonField(snapshot), createdById: savedBy.savedById, createdByName: savedBy.savedByName },
    });
    res.status(201).json({ ...template, snapshot: parseJsonField(template.snapshot) });
  } catch (error) {
    console.error('Error creating web page template:', error);
    res.status(500).json({ error: 'Failed to create web page template' });
  }
};

export const deleteWebTemplate = async (req, res) => {
  try {
    await prisma.webPageTemplate.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (error) {
    res.status(404).json({ error: 'Template not found' });
  }
};

export const listWebPageVersions = async (req, res) => {
  try {
    const page = await prisma.webPage.findUnique({ where: { slug: req.params.slug }, select: { id: true } });
    if (!page) return res.status(404).json({ error: 'Page not found' });
    const versions = await prisma.webPageVersion.findMany({ where: { pageId: page.id }, orderBy: { versionNumber: 'desc' } });
    res.json({ versions: versions.map((version) => ({ ...version, snapshot: parseJsonField(version.snapshot) })) });
  } catch (error) {
    console.error('Error listing web page versions:', error);
    res.status(500).json({ error: 'Failed to list web page versions' });
  }
};

export const restoreWebPageVersion = async (req, res) => {
  try {
    const page = await prisma.webPage.findUnique({
      where: { slug: req.params.slug },
      include: { sections: { orderBy: { order: 'asc' }, include: { blocks: { orderBy: { order: 'asc' } } } }, blocks: { orderBy: { order: 'asc' } } },
    });
    const version = await prisma.webPageVersion.findUnique({ where: { id: req.params.versionId } });
    if (!page || !version || version.pageId !== page.id) return res.status(404).json({ error: 'Version not found' });

    const restored = await prisma.$transaction(async (tx) => {
      const savedBy = await getSavedBy(tx, req.user?.id);
      const versionNumber = await tx.webPageVersion.count({ where: { pageId: page.id } }) + 1;
      await tx.webPageVersion.create({ data: { pageId: page.id, title: page.title, snapshot: stringifyJsonField(snapshotPage(page)), versionNumber, ...savedBy } });
      await replacePageContent(tx, page, parseJsonField(version.snapshot));
      return tx.webPage.findUnique({ where: { id: page.id }, include: { sections: { orderBy: { order: 'asc' }, include: { blocks: { orderBy: { order: 'asc' } } } }, blocks: { orderBy: { order: 'asc' } } } });
    });
    res.json({ page: serializePage(restored) });
  } catch (error) {
    console.error('Error restoring web page version:', error);
    res.status(500).json({ error: 'Failed to restore web page version' });
  }
};

export const applyWebTemplate = async (req, res) => {
  try {
    const template = await prisma.webPageTemplate.findUnique({ where: { id: req.params.id } });
    const page = await prisma.webPage.findUnique({
      where: { slug: req.params.slug },
      include: { sections: { orderBy: { order: 'asc' }, include: { blocks: { orderBy: { order: 'asc' } } }, }, blocks: { orderBy: { order: 'asc' } } },
    });
    if (!template || !page) return res.status(404).json({ error: 'Template or page not found' });

    const updated = await prisma.$transaction(async (tx) => {
      const savedBy = await getSavedBy(tx, req.user?.id);
      const versionNumber = await tx.webPageVersion.count({ where: { pageId: page.id } }) + 1;
      await tx.webPageVersion.create({ data: { pageId: page.id, title: page.title, snapshot: stringifyJsonField(snapshotPage(page)), versionNumber, ...savedBy } });
      await replacePageContent(tx, page, parseJsonField(template.snapshot));
      return tx.webPage.findUnique({ where: { id: page.id }, include: { sections: { orderBy: { order: 'asc' }, include: { blocks: { orderBy: { order: 'asc' } } }, }, blocks: { orderBy: { order: 'asc' } } } });
    });
    res.json({ page: serializePage(updated) });
  } catch (error) {
    console.error('Error applying web page template:', error);
    res.status(500).json({ error: 'Failed to apply web page template' });
  }
};
