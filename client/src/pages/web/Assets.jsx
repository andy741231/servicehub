import { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, Copy, Check, FileText, Image as ImageIcon, File, X, AlertCircle } from 'lucide-react';
import api from '../../utils/api';
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
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assets</h1>
          <p className="text-sm text-gray-500 mt-1">Upload and manage images and documents.</p>
        </div>
        <button
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
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
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInput.current?.click()}
        className={`mb-6 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }`}
      >
        <Upload className={`w-8 h-8 mx-auto mb-2 ${dragOver ? 'text-blue-500' : 'text-gray-300'}`} />
        <p className="text-sm text-gray-500">
          <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-gray-400 mt-1">Images (PNG, JPG, GIF, WebP, SVG) · PDF · Word · Excel · Max 20 MB</p>
      </div>

      {uploadError && (
        <div className="mb-4 flex items-center gap-2 text-red-600 text-sm bg-red-50 px-4 py-3 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {uploadError}
          <button onClick={() => setUploadError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-4 gap-3 animate-pulse">
          {[1,2,3,4,5,6].map(i => <div key={i} className="aspect-square bg-gray-100 rounded-lg" />)}
        </div>
      ) : assets.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <ImageIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No assets yet</p>
          <p className="text-gray-400 text-sm mt-1">Upload your first file above.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Images grid */}
          {images.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Images ({images.length})</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {images.map(asset => (
                  <div key={asset.id} className="group relative aspect-square bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
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
                          className="p-1.5 bg-white/20 hover:bg-white/30 rounded text-white"
                          title="Copy URL"
                        >
                          {copiedId === asset.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleDelete(asset.id)}
                          className="p-1.5 bg-white/20 hover:bg-red-500/80 rounded text-white"
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
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Documents ({docs.length})</h2>
              <div className="space-y-2">
                {docs.map(asset => {
                  const Icon = getIcon(asset.mimeType);
                  return (
                    <div key={asset.id} className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3 group hover:border-gray-300">
                      <div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-orange-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{asset.originalName}</p>
                        <p className="text-xs text-gray-400">{formatSize(asset.size)}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => copyUrl(asset.url, asset.id)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500" title="Copy URL">
                          {copiedId === asset.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <a href={asset.url} target="_blank" rel="noreferrer" className="p-1.5 hover:bg-gray-100 rounded text-gray-500" title="Open">
                          <File className="w-4 h-4" />
                        </a>
                        <button onClick={() => handleDelete(asset.id)} className="p-1.5 hover:bg-red-50 rounded text-red-500" title="Delete">
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
