import prisma from '../db/client.js';
import { uploadBlob, deleteBlob } from '../services/blobStorage.js';

// GET /api/web/assets
export const listAssets = async (req, res) => {
  try {
    const assets = await prisma.webAsset.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(assets);
  } catch (e) {
    res.status(500).json({ error: 'Failed to list assets' });
  }
};

// POST /api/web/assets — handled after multer middleware (memoryStorage)
export const uploadAsset = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { blobName, url } = await uploadBlob(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    const asset = await prisma.webAsset.create({
      data: {
        filename: blobName,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        url,
      }
    });
    res.status(201).json(asset);
  } catch (e) {
    console.error('Asset upload error:', e);
    res.status(500).json({ error: 'Failed to save asset' });
  }
};

// DELETE /api/web/assets/:id
export const deleteAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const asset = await prisma.webAsset.findUnique({ where: { id } });
    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    await deleteBlob(asset.filename);
    await prisma.webAsset.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    console.error('Asset delete error:', e);
    res.status(500).json({ error: 'Failed to delete asset' });
  }
};
