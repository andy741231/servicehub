import { FileText, ClipboardList, Mail, Users } from 'lucide-react';
import { APP_IDS } from 'shared';
import api from '../utils/api';

// ── Result shape ──────────────────────────────────────────────────────────
// { id, title, subtitle?, path, appId, Icon }
// `path` is a router path — clicking a result navigates there.

// ── Providers ─────────────────────────────────────────────────────────────
// Each provider: { appId, label, Icon, search(query) => Promise<Result[]> }
// To add a new app to search scope, add a provider here. The registry
// automatically filters by the user's accessible app IDs at query time.

const normalize = (s) => (s || '').toLowerCase();

const webProvider = {
  appId: APP_IDS.WEB,
  label: 'Pages',
  Icon: FileText,
  async search(query) {
    const q = normalize(query);
    if (!q) return [];
    try {
      const res = await api.get('/web/pages');
      const pages = Array.isArray(res.data) ? res.data : [];
      return pages
        .filter((p) => normalize(p.title).includes(q) || normalize(p.slug).includes(q))
        .slice(0, 10)
        .map((p) => ({
          id: `web-${p.id}`,
          title: p.title,
          subtitle: `/ ${p.slug}`,
          path: p.slug ? `/hub-admin/web/editor/${p.slug}` : '/hub-admin/web/pages',
          appId: APP_IDS.WEB,
          Icon: FileText,
        }));
    } catch { return []; }
  },
};

const formsProvider = {
  appId: APP_IDS.FORMS,
  label: 'Forms',
  Icon: ClipboardList,
  async search(query) {
    const q = normalize(query);
    if (!q) return [];
    try {
      const res = await api.get('/forms');
      const forms = Array.isArray(res.data?.forms) ? res.data.forms : (Array.isArray(res.data) ? res.data : []);
      return forms
        .filter((f) => normalize(f.title).includes(q))
        .slice(0, 10)
        .map((f) => ({
          id: `form-${f.id}`,
          title: f.title,
          subtitle: 'Form',
          path: `/hub-admin/forms/builder/${f.id}`,
          appId: APP_IDS.FORMS,
          Icon: ClipboardList,
        }));
    } catch { return []; }
  },
};

const campaignsProvider = {
  appId: APP_IDS.EMAIL,
  label: 'Campaigns',
  Icon: Mail,
  async search(query) {
    const q = normalize(query);
    if (!q) return [];
    try {
      const res = await api.get('/email/campaigns');
      const campaigns = Array.isArray(res.data) ? res.data : [];
      return campaigns
        .filter((c) => normalize(c.name).includes(q))
        .slice(0, 10)
        .map((c) => ({
          id: `campaign-${c.id}`,
          title: c.name,
          subtitle: `Campaign · ${c.status}`,
          path: '/hub-admin/email/campaigns',
          appId: APP_IDS.EMAIL,
          Icon: Mail,
        }));
    } catch { return []; }
  },
};

const mailingListsProvider = {
  appId: APP_IDS.EMAIL,
  label: 'Mailing Lists',
  Icon: Users,
  async search(query) {
    const q = normalize(query);
    if (!q) return [];
    try {
      const res = await api.get('/email/lists');
      const lists = Array.isArray(res.data) ? res.data : [];
      return lists
        .filter((l) => normalize(l.name).includes(q))
        .slice(0, 10)
        .map((l) => ({
          id: `list-${l.id}`,
          title: l.name,
          subtitle: `Mailing List · ${l.count ?? 0} recipients`,
          path: '/hub-admin/email/lists',
          appId: APP_IDS.EMAIL,
          Icon: Users,
        }));
    } catch { return []; }
  },
};

// ── Registry ──────────────────────────────────────────────────────────────
const PROVIDERS = [
  webProvider,
  formsProvider,
  campaignsProvider,
  mailingListsProvider,
];

// Run all accessible providers in parallel, return merged + grouped results.
// `accessibleAppIds` is a Set of app IDs the user can access.
export async function searchAll(query, accessibleAppIds) {
  if (!query || !query.trim()) return [];
  const accessible = PROVIDERS.filter((p) => accessibleAppIds.has(p.appId));
  if (accessible.length === 0) return [];
  const results = await Promise.allSettled(
    accessible.map((provider) => provider.search(query)),
  );
  const merged = [];
  results.forEach((r) => {
    if (r.status === 'fulfilled') merged.push(...r.value);
  });
  return merged;
}

// Group results by app for display.
export function groupResults(results) {
  const groups = new Map();
  for (const r of results) {
    if (!groups.has(r.appId)) groups.set(r.appId, []);
    groups.get(r.appId).push(r);
  }
  return Array.from(groups.entries()).map(([appId, items]) => ({
    appId,
    label: PROVIDERS.find((p) => p.appId === appId)?.label || appId,
    Icon: items[0]?.Icon,
    items,
  }));
}

export { PROVIDERS };
