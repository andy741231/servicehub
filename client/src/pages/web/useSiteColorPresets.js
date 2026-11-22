/**
 * Site color presets (theme colors + palette) for admin screens outside the
 * editor (Header & Footer, Draft Templates). Loads GET /web/styles once per
 * page load and shares it between every picker on the screen.
 */
import { useEffect, useState } from 'react';
import api from '../../utils/api';
import { siteColorPresets } from '../../site/siteTheme';

let cache = null; // Promise<presets[]>

export default function useSiteColorPresets() {
  const [presets, setPresets] = useState(undefined);
  useEffect(() => {
    let alive = true;
    cache = cache || api.get('/web/styles').then(({ data }) => siteColorPresets(data?.tokens)).catch(() => { cache = null; return siteColorPresets({}); });
    cache.then((p) => { if (alive) setPresets(p); });
    return () => { alive = false; };
  }, []);
  return presets;
}

/** Forget the cached theme (call after the Styles page saves). */
export function clearSiteColorPresets() { cache = null; }
