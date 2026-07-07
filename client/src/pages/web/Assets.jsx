import { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, Copy, Check, FileText, Image as ImageIcon, File, X, AlertCircle } from 'lucide-react';
import api from '../../utils/api';
import PageHeader from '../../components/PageHeader';
import { useConfirm } from '../../components/Dialog';
import { useToast } from '../../components/Toast';

const MIME_ICONS = {
  'image/':       ImageIcon,
  'application/pdf': FileText,
  'application/msword': FileText,
  'application/vnd.openxmlformats': FileText,
  'application/vnd.ms-excel': FileText,
};

function getIcon(mimeType) {
  for (const [prefix, Icon] of Object.entries(MIME_ICONS)) {
    if (mimeType?.startsWith(prefix)) return Icon;
  }
  return File;
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(mimeType) {
  return mimeType?.startsWith('image/');
}

export default function Assets() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const fileInput = useRef(null);

  const { confirmDialog, ConfirmDialogMount } = useConfirm();
  const { toast, ToastMount } = useToast();

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/web/assets');
      setAssets(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const uploadFiles = async (files) => {
    setUploadError('');
    const allowed = ['image/jpeg','image/png','image/gif','image/webp','image/svg+xml','application/pdf',
      'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    const invalid = [...files].filter(f => !allowed.includes(f.type));
    if (invalid.length) {
      setUploadError(`Unsupported file type: ${invalid.map(f => f.name).join(', ')}`);
      return;
    }
    setUploading(true);
    try {
      for (const file of files) {
        const form = new FormData();
        form.append('file', file);
        await api.post('/web/assets', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      await load();
    } catch (e) {
      setUploadError(e?.response?.data?.error || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirmDialog({
      title: 'Delete this asset?',
      message: 'The file will be permanently removed and cannot be recovered.',
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    await api.delete(`/web/assets/${id}`);
    setAssets(a => a.filter(x => x.id !== id));
    toast('Asset deleted.', 'error');
  };

  const copyUrl = (url, id) => {
    navigator.clipboard.writeText(window.location.origin + url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    uploadFiles(e.dataTransfer.files);
  };

  const images = assets.filter(a => isImage(a.mimeType));
  const docs   = assets.filter(a => !isImage(a.mimeType));

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-8">
      <PageHeader>
        <button
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
          className="btn-primary"
        >
          {uploading ? <AlertCircle className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
        <input
          ref={fileInput}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
          className="hidden"
          onChange={e => uploadFiles(e.target.files)}
        />
      </PageHeader>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInput.current?.click()}
        className={`mb-6 border-2 border-dashed rounded-card p-8 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-primary-light bg-primary-light' : 'border-border hover:border-border-strong hover:bg-surface-raised'
        }`}
      >
        <Upload className={`w-8 h-8 mx-auto mb-2 ${dragOver ? 'text-primary' : 'text-subtle'}`} />
        <p className="text-sm text-muted">
          <span className="font-medium text-primary">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-subtle mt-1">Images (PNG, JPG, GIF, WebP, SVG) · PDF · Word · Excel · Max 20 MB</p>
      </div>

      {uploadError && (
        <div className="mb-4 flex items-center gap-2 text-danger text-sm bg-danger-light px-4 py-3 rounded-base">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {uploadError}
          <button onClick={() => setUploadError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-4 gap-3 animate-pulse">
          {[1,2,3,4,5,6].map(i => <div key={i} className="aspect-square bg-surface-raised rounded-base" />)}
        </div>
      ) : assets.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-card">
          <ImageIcon className="w-10 h-10 text-subtle mx-auto mb-3" />
          <p className="text-muted font-medium">No assets yet</p>
          <p className="text-subtle text-sm mt-1">Upload your first file above.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Images grid */}
          {images.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Images ({images.length})</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {images.map(asset => (
                  <div key={asset.id} className="group relative aspect-square bg-surface-raised rounded-card overflow-hidden border border-border">
                    <img
                      src={asset.url}
                      alt={asset.originalName}
                      className="w-full h-full object-cover"
                    />
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => copyUrl(asset.url, asset.id)}
                          className="p-3 min-w-[44px] min-h-[44px] bg-surface/20 hover:bg-surface/30 rounded text-white"
                          aria-label="Copy URL"
                          title="Copy URL"
                        >
                          {copiedId === asset.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleDelete(asset.id)}
                          className="p-3 min-w-[44px] min-h-[44px] bg-surface/20 hover:bg-danger/80 rounded text-white"
                          aria-label="Delete"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-white text-xs truncate">{asset.originalName}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents list */}
          {docs.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Documents ({docs.length})</h2>
              <div className="space-y-2">
                {docs.map(asset => {
                  const Icon = getIcon(asset.mimeType);
                  return (
                    <div key={asset.id} className="flex items-center gap-3 bg-surface border border-border rounded-base px-4 py-3 group hover:border-border-strong">
                      <div className="w-9 h-9 bg-warning-light rounded-base flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-warning" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-base truncate">{asset.originalName}</p>
                        <p className="text-xs text-subtle">{formatSize(asset.size)}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => copyUrl(asset.url, asset.id)} className="p-3 min-w-[44px] min-h-[44px] hover:bg-surface-raised rounded text-muted" aria-label="Copy URL" title="Copy URL">
                          {copiedId === asset.id ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <a href={asset.url} target="_blank" rel="noreferrer" className="p-3 min-w-[44px] min-h-[44px] hover:bg-surface-raised rounded text-muted" aria-label="Open" title="Open">
                          <File className="w-4 h-4" />
                        </a>
                        <button onClick={() => handleDelete(asset.id)} className="p-3 min-w-[44px] min-h-[44px] hover:bg-danger-light rounded text-danger" aria-label="Delete" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
      {ConfirmDialogMount}
      {ToastMount}
    </div>
  );
}
