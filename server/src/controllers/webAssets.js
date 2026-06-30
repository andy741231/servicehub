import prisma from '../db/client.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// GET /api/web/assets
export const listAssets = async (req, res) => {
  try {
    const assets = await prisma.webAsset.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(assets);
  } catch (e) {
    res.status(500).json({ error: 'Failed to list assets' });
  }
};

// POST /api/web/assets — handled after multer middleware
export const uploadAsset = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const asset = await prisma.webAsset.create({
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        url: `/uploads/${req.file.filename}`,
      }
    });
    res.status(201).json(asset);
  } catch (e) {
    res.status(500).json({ error: 'Failed to save asset' });
  }
};

// DELETE /api/web/assets/:id
export const deleteAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const asset = await prisma.webAsset.findUnique({ where: { id } });
    if (!asset) return res.status(404).json({ error: 'Asset not found' });
    // Delete file from disk
    const filePath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../../uploads', asset.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await prisma.webAsset.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete asset' });
  }
};
