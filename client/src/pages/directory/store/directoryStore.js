import { create } from 'zustand';
import api from '../../../utils/api';

// Directory session state is separate from the Hub authStore: saints sign in
// with their own cookie and never get a Hub session. `session` is
// `undefined` while unknown, `null` when signed out, or the session object.
const useDirectoryStore = create((set, get) => ({
  // ── Saint-facing session ──
  session: undefined,

  checkSession: async () => {
    try {
      const res = await api.get('/directory/auth/me');
      set({ session: res.data });
      return res.data;
    } catch {
      set({ session: null });
      return null;
    }
  },

  setSession: (session) => set({ session }),

  logout: async () => {
    try {
      await api.post('/directory/auth/logout');
    } catch { /* cookie clearing is best-effort */ }
    set({ session: null, meta: null });
  },

  // ── Metadata cache ──
  // Caches /directory/meta (districts, statuses, roles + the requester's
  // directory role/district/memberId) so every page doesn't refetch it.
  meta: null,
  metaLoading: false,
  metaError: null,

  loadMeta: async (force = false) => {
    const { meta, metaLoading } = get();
    if (metaLoading || (meta && !force)) return;
    set({ metaLoading: true, metaError: null });
    try {
      const res = await api.get('/directory/meta');
      set({ meta: res.data, metaLoading: false });
    } catch (error) {
      set({ metaLoading: false, metaError: error.response?.data?.error || 'Failed to load directory metadata' });
    }
  },
}));

export default useDirectoryStore;
