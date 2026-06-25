import prisma from '../db/client.js';

const KEY = 'draft_templates';

const DEFAULT = {
  homeDraft: {
    title: 'Website Under Maintenance',
    heading: 'We\'ll be back soon',
    message: 'Our website is currently undergoing scheduled maintenance. We should be back shortly. Thank you for your patience.',
    bgColor: '#1e293b',
    textColor: '#f1f5f9',
    accentColor: '#3b82f6',
    showLogo: true,
    logoText: '',
    showContactEmail: false,
    contactEmail: '',
  },
  pageDraft: {
    title: 'Page Not Found',
    heading: 'Page Not Found',
    message: 'The page you\'re looking for doesn\'t exist or is not yet available.',
    bgColor: '#f9fafb',
    textColor: '#111827',
    accentColor: '#2563eb',
    showBackLink: true,
    backLinkLabel: 'Go back home',
    backLinkHref: '/',
  },
};

// GET /api/web/draft-templates
export const getDraftTemplates = async (req, res) => {
  try {
    const record = await prisma.webSiteStyle.findFirst();
    if (!record?.draftTemplates) {
      return res.json(DEFAULT);
    }
    const parsed = typeof record.draftTemplates === 'string'
      ? JSON.parse(record.draftTemplates)
      : record.draftTemplates;
    res.json({
      homeDraft: { ...DEFAULT.homeDraft, ...parsed.homeDraft },
      pageDraft: { ...DEFAULT.pageDraft, ...parsed.pageDraft },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to get draft templates' });
  }
};

// PUT /api/web/draft-templates
export const updateDraftTemplates = async (req, res) => {
  try {
    const { homeDraft, pageDraft } = req.body;
    const data = { homeDraft, pageDraft };
    let record = await prisma.webSiteStyle.findFirst();
    if (record) {
      record = await prisma.webSiteStyle.update({
        where: { id: record.id },
        data: { draftTemplates: JSON.stringify(data) },
      });
    } else {
      record = await prisma.webSiteStyle.create({
        data: {
          tokens: JSON.stringify({}),
          draftTemplates: JSON.stringify(data),
        },
      });
    }
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to update draft templates' });
  }
};
