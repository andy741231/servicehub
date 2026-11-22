/**
 * EditableImage — image field on the editor canvas: click to replace, upload
 * or remove; empty images show a placeholder.
 *
 * Uploads go to the site's asset library (POST /web/assets) and the stored,
 * permanent URL is saved. (The previous version saved a temporary blob: URL
 * that only existed in the current browser tab — broken after a reload and
 * on the published site.)
 */
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Image as ImageIcon, Edit3, Trash2, Upload, Loader2 } from 'lucide-react';
import api from '../../../utils/api';

export default function EditableImage({
  src,
  alt,
  onChange,
  onRemove,
  onEditingStart,
  onEditingEnd,
  className = '',
  style,
  wrapperClassName = '', // replaces the default `relative` wrapper (must position the overlay)
  placeholder = 'Click to add image',
}) {
  const [showControls, setShowControls] = useState(false);
  const [showUrlDialog, setShowUrlDialog] = useState(false);
  const [tempUrl, setTempUrl] = useState(src || '');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const open = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onEditingStart?.();
    if (src) setShowControls((v) => !v);
    else { setTempUrl(''); setShowUrlDialog(true); }
  };
  const close = () => {
    setShowUrlDialog(false);
    setShowControls(false);
    setError(null);
    onEditingEnd?.();
  };
  const saveUrl = () => {
    const url = tempUrl.trim();
    if (!url) return;
    onChange(url);
    close();
  };
  const upload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/web/assets', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      onChange(data.url);
      close();
    } catch (err) {
      console.error('Image upload failed:', err);
      setError('Upload failed — check the file type and size, then try again.');
      setShowUrlDialog(true);
    } finally {
      setUploading(false);
    }
  };

  const keyOpen = (e) => { if (e.key === 'Enter' || e.key === ' ') open(e); };
  const btn = 'px-3 py-2 min-h-[40px] rounded-md flex items-center gap-1.5 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-primary';

  return (
    <div className={wrapperClassName || 'relative'}>
      {src ? (
        <img
          src={src}
          alt={alt || ''}
          style={style}
          className={`${className} cursor-pointer hover:opacity-90 transition-opacity`}
          onClick={open}
          onKeyDown={keyOpen}
          role="button"
          tabIndex={0}
          aria-label={`Edit image${alt ? `: ${alt}` : ''}`}
        />
      ) : (
        <div
          className={`${className} site-editor-chrome border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary-light transition-colors`}
          onClick={open}
          onKeyDown={keyOpen}
          role="button"
          tabIndex={0}
          aria-label={`Add image: ${placeholder}`}
        >
          {uploading ? <Loader2 className="w-8 h-8 text-subtle animate-spin" /> : <ImageIcon className="w-10 h-10 text-subtle mb-2" />}
          <span className="text-muted text-sm">{uploading ? 'Uploading…' : placeholder}</span>
        </div>
      )}

      {src && (showControls || uploading) && (
        <div className="site-editor-chrome absolute inset-0 bg-black/50 flex items-center justify-center gap-2" onMouseDown={(e) => e.stopPropagation()}>
          {uploading ? (
            <span className="text-white text-sm flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</span>
          ) : (
            <>
              <button type="button" onClick={() => fileInputRef.current?.click()} className={`${btn} bg-surface text-text-base hover:bg-surface-raised`}>
                <Upload className="w-4 h-4" /> Upload
              </button>
              <button type="button" onClick={() => { setTempUrl(src || ''); setShowUrlDialog(true); }} className={`${btn} bg-surface text-text-base hover:bg-surface-raised`}>
                <Edit3 className="w-4 h-4" /> URL
              </button>
              <button type="button" onClick={() => { onRemove?.(); close(); }} className={`${btn} bg-danger text-white hover:opacity-90`}>
                <Trash2 className="w-4 h-4" /> Remove
              </button>
            </>
          )}
        </div>
      )}

      {/* Dialog in the editor window (a fixed overlay inside the canvas iframe
          would centre on the whole page, not the screen). */}
      {showUrlDialog && createPortal(
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]"
          onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}
          onKeyDown={(e) => { if (e.key === 'Escape') close(); }}
        >
          <div className="bg-surface rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4" role="dialog" aria-modal="true" aria-labelledby="image-dialog-title">
            <h3 id="image-dialog-title" className="text-lg font-semibold text-text-base mb-4">{src ? 'Replace image' : 'Add image'}</h3>
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className={`${btn} w-full justify-center bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-60`}
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? 'Uploading…' : 'Upload from your computer'}
              </button>
              <div className="text-center text-xs text-subtle">or paste an image address</div>
              <label className="block">
                <span className="sr-only">Image URL</span>
                <input
                  type="url"
                  value={tempUrl}
                  onChange={(e) => setTempUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveUrl(); } }}
                  className="w-full px-3 py-2.5 border border-border-strong rounded-md bg-surface text-text-base focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="https://example.com/image.jpg"
                  autoFocus
                />
              </label>
              {error && <p className="text-sm text-danger" role="alert">{error}</p>}
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={close} className={`${btn} text-muted hover:bg-surface-raised`}>Cancel</button>
                <button type="button" onClick={saveUrl} disabled={!tempUrl.trim() || uploading} className={`${btn} bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-50`}>
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}

      <input ref={fileInputRef} type="file" accept="image/*" onChange={upload} className="hidden" aria-hidden="true" tabIndex={-1} />
    </div>
  );
}
