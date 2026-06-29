import prisma from '../db/client.js';
import multer from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const UPLOAD_DIR = join(__dirname, '../../../uploads');
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
  },
});

export const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const parseJsonField = (value) => {
  if (value == null) return null;
  return typeof value === 'string' ? JSON.parse(value) : value;
};

const stringifyJsonField = (value) => {
  if (value == null) return null;
  return typeof value === 'string' ? value : JSON.stringify(value);
};

const serializeForm = (form) => ({
  ...form,
  schema: parseJsonField(form.schema),
});

const serializeSubmission = (submission) => ({
  ...submission,
  data: parseJsonField(submission.data),
});

const generateSlug = (title, existingSlugs = []) => {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'untitled-form';

  let slug = base;
  let counter = 1;
  while (existingSlugs.includes(slug)) {
    slug = `${base}-${counter}`;
    counter += 1;
  }
  return slug;
};

const getFormSlug = (form) => {
  const schema = parseJsonField(form.schema) || {};
  return schema.slug || generateSlug(form.title || 'Untitled Form');
};

const findFormBySlug = async (slug) => {
  const forms = await prisma.form.findMany({ where: { deletedAt: null } });
  return forms.find((f) => getFormSlug(f) === slug) || null;
};

export const listForms = async (req, res) => {
  try {
    const forms = await prisma.form.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ forms: forms.map(serializeForm) });
  } catch (error) {
    console.error('Error listing forms:', error);
    res.status(500).json({ error: 'Failed to list forms' });
  }
};

export const getForm = async (req, res) => {
  try {
    const { id } = req.params;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    let form = null;
    if (isUuid) {
      form = await prisma.form.findUnique({ where: { id, deletedAt: null } });
    } else {
      form = await findFormBySlug(id);
    }

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    res.json({ form: serializeForm(form) });
  } catch (error) {
    console.error('Error getting form:', error);
    res.status(500).json({ error: 'Failed to get form' });
  }
};

export const createForm = async (req, res) => {
  try {
    const { title, schema } = req.body;

    if (!title || !schema) {
      return res.status(400).json({ error: 'Title and schema are required' });
    }

    const existingForms = await prisma.form.findMany({ where: { deletedAt: null } });
    const normalizedTitle = title.trim().toLowerCase();
    if (existingForms.some((f) => f.title.trim().toLowerCase() === normalizedTitle)) {
      return res.status(409).json({ error: 'A form with this name already exists' });
    }

    const existingSlugs = existingForms.map((f) => getFormSlug(f));
    const slug = generateSlug(schema?.slug || title, existingSlugs);

    const form = await prisma.form.create({
      data: {
        title,
        schema: stringifyJsonField({ ...schema, slug }),
      },
    });

    res.status(201).json({ form: serializeForm(form) });
  } catch (error) {
    console.error('Error creating form:', error);
    res.status(500).json({ error: 'Failed to create form' });
  }
};

export const updateForm = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, schema } = req.body;

    const existing = await prisma.form.findUnique({ where: { id, deletedAt: null } });
    if (!existing) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const existingForms = await prisma.form.findMany({ where: { deletedAt: null } });
    const normalizedTitle = title?.trim().toLowerCase();
    if (normalizedTitle && existingForms.some((f) => f.id !== id && f.title.trim().toLowerCase() === normalizedTitle)) {
      return res.status(409).json({ error: 'A form with this name already exists' });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (schema !== undefined) {
      const existingSlug = getFormSlug(existing);
      const requestedSlug = schema?.slug || existingSlug;
      const otherSlugs = existingForms
        .filter((f) => f.id !== id)
        .map((f) => getFormSlug(f));
      const newSlug = generateSlug(requestedSlug, otherSlugs);
      updateData.schema = stringifyJsonField({ ...schema, slug: newSlug });
    }

    const form = await prisma.form.update({
      where: { id },
      data: updateData,
    });

    res.json({ form: serializeForm(form) });
  } catch (error) {
    console.error('Error updating form:', error);
    res.status(500).json({ error: 'Failed to update form' });
  }
};

export const deleteForm = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.form.findUnique({ where: { id, deletedAt: null } });
    if (!existing) {
      return res.status(404).json({ error: 'Form not found' });
    }

    await prisma.form.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    res.json({ message: 'Form deleted successfully' });
  } catch (error) {
    console.error('Error deleting form:', error);
    res.status(500).json({ error: 'Failed to delete form' });
  }
};

export const listSubmissions = async (req, res) => {
  try {
    const { id } = req.params;
    const submissions = await prisma.formSubmission.findMany({
      where: { formId: id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ submissions: submissions.map(serializeSubmission) });
  } catch (error) {
    console.error('Error listing submissions:', error);
    res.status(500).json({ error: 'Failed to list submissions' });
  }
};

export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const url = `/uploads/${req.file.filename}`;
    res.json({
      url,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
};

export const createSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const { data } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'Submission data is required' });
    }

    const form = await prisma.form.findUnique({ where: { id, deletedAt: null } });
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const submission = await prisma.formSubmission.create({
      data: {
        formId: id,
        data: stringifyJsonField(data),
      },
    });

    res.status(201).json({ submission: serializeSubmission(submission) });
  } catch (error) {
    console.error('Error creating submission:', error);
    res.status(500).json({ error: 'Failed to create submission' });
  }
};
