/**
 * AssetLibrary — grid of images already uploaded to the site (GET /web/assets),
 * so an image can be reused instead of uploaded again. Used by the canvas
 * image dialog (EditableImage) and the inspector's image fields (ImageField).
 */
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import api from '../../../utils/api';

export default function AssetLibrary({ onPick, selected }) {
  const [assets, setAssets] = useState(null); // null = loading
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    api.get('/web/assets')
      .then(({ data }) => { if (alive) setAssets((Array.isArray(data) ? data : []).filter((a) => String(a.mimeType || '').startsWith('image/') && a.url)); })
      .catch(() => { if (alive) { setAssets([]); setError('Could not load the library.'); } });
    return () => { alive = false; };
  }, []);

  if (assets === null) {
    return <p className="flex items-center gap-2 text-xs text-muted py-3"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading library…</p>;
  }
  if (error) return <p className="text-xs text-danger py-2" role="alert">{error}</p>;
  if (assets.length === 0) return <p className="text-xs text-subtle py-2">No images uploaded yet — upload one and it will appear here.</p>;

  return (
    <ul className="grid grid-cols-3 gap-2 max-h-56 overflow-y-auto p-0.5" aria-label="Image library">
      {assets.map((a) => {
        const name = a.originalName || a.filename || 'image';
        const isSel = selected && selected === a.url;
        return (
          <li key={a.id || a.url}>
            <button
              type="button"
              onClick={() => onPick(a.url, a)}
              className={`block w-full aspect-square rounded-md overflow-hidden border-2 bg-surface-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${isSel ? 'border-primary' : 'border-transparent hover:border-border-strong'}`}
              aria-label={`Use ${name}`}
              aria-pressed={!!isSel}
              title={name}
            >
              <img src={a.url} alt="" loading="lazy" className="w-full h-full object-cover" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
