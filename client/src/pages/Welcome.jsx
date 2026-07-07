import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Globe, ClipboardList, Mail, BookOpen, LayoutDashboard,
  FileText, Inbox, Users, ArrowRight, Clock,
} from 'lucide-react';
import { APPS } from '../layouts/AppShell';
import { APP_IDS } from 'shared';
import useAuthStore from '../store/authStore';
import api from '../utils/api';

const APP_DESCRIPTIONS = {
  [APP_IDS.WEB]: 'Build and manage your public web pages',
  [APP_IDS.FORMS]: 'Create forms and collect submissions',
  [APP_IDS.EMAIL]: 'Send campaigns to your mailing lists',
  [APP_IDS.DIRECTORY]: 'Browse and manage directory entries',
  [APP_IDS.PORTAL]: 'Your customizable dashboard',
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString();
};

export default function Welcome() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const hasSuperAdminRole = user?.roles?.includes('super_admin');
  const hasAdminRole = user?.roles?.includes('admin');

  const accessibleApps = useMemo(
    () => APPS.filter(
      (app) => user?.permissions?.includes(app.id) || hasAdminRole || hasSuperAdminRole,
    ),
    [user, hasAdminRole, hasSuperAdminRole],
  );
  const accessibleIds = useMemo(
    () => new Set(accessibleApps.map((a) => a.id)),
    [accessibleApps],
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    pages: [],
    forms: [],
    campaigns: [],
    lists: [],
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      // Only fetch endpoints for apps the user can access.
      const fetches = [];
      const keys = [];
      if (accessibleIds.has(APP_IDS.WEB)) {
        fetches.push(api.get('/web/pages'));
        keys.push('pages');
      }
      if (accessibleIds.has(APP_IDS.FORMS)) {
        fetches.push(api.get('/forms'));
        keys.push('forms');
      }
      if (accessibleIds.has(APP_IDS.EMAIL)) {
        fetches.push(api.get('/email/campaigns'));
        keys.push('campaigns');
        fetches.push(api.get('/email/lists'));
        keys.push('lists');
      }
      if (fetches.length === 0) {
        setLoading(false);
        return;
      }
      const results = await Promise.allSettled(fetches);
      if (cancelled) return;
      // Endpoints return mixed shapes: /forms wraps as { forms: [...] },
      // the others return plain arrays. Normalize to arrays.
      const toArray = (res, key) => {
        if (res.status !== 'fulfilled') return [];
        const d = res.value.data;
        if (Array.isArray(d)) return d;
        if (key && Array.isArray(d?.[key])) return d[key];
        return [];
      };
      const next = { pages: [], forms: [], campaigns: [], lists: [] };
      results.forEach((res, i) => {
        const key = keys[i];
        if (key === 'forms') next.forms = toArray(res, 'forms');
        else next[key] = toArray(res);
      });
      setData(next);
      const allRejected = results.every((r) => r.status === 'rejected');
      if (allRejected) setError('Unable to load platform data. Please try again.');
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [accessibleIds]);

  const stats = useMemo(() => {
    const all = [
      { appId: APP_IDS.WEB, label: 'Total Pages', value: data.pages.length, Icon: FileText },
      { appId: APP_IDS.FORMS, label: 'Total Forms', value: data.forms.length, Icon: Inbox },
      { appId: APP_IDS.EMAIL, label: 'Total Campaigns', value: data.campaigns.length, Icon: Mail },
      { appId: APP_IDS.EMAIL, label: 'Mailing Lists', value: data.lists.length, Icon: Users },
    ];
    return all.filter((s) => accessibleIds.has(s.appId));
  }, [data, accessibleIds]);

  const recentActivity = useMemo(() => {
    const items = [];
    data.pages.slice(0, 3).forEach((p) => {
      items.push({
        id: `page-${p.id}`,
        label: p.title,
        meta: 'Page',
        date: p.updatedAt,
        Icon: FileText,
      });
    });
    data.forms.slice(0, 3).forEach((f) => {
      items.push({
        id: `form-${f.id}`,
        label: f.title,
        meta: 'Form',
        date: f.updatedAt || f.createdAt,
        Icon: ClipboardList,
      });
    });
    data.campaigns.slice(0, 3).forEach((c) => {
      items.push({
        id: `campaign-${c.id}`,
        label: c.name,
        meta: `Campaign · ${c.status}`,
        date: c.sentAt || c.createdAt,
        Icon: Mail,
      });
    });
    return items.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 8);
  }, [data]);

  const roleBadge = hasSuperAdminRole ? 'Super Admin' : hasAdminRole ? 'Admin' : (user?.roles?.[0] || 'User');

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        {/* User greeting */}
        <div className="mb-8">
          {loading && !user ? (
            <div className="skeleton skeleton-line" style={{ width: '260px', height: '32px' }} />
          ) : (
            <h1 className="text-display font-bold text-text-base">
              Welcome back, {user?.name || 'there'}
            </h1>
          )}
          <div className="mt-2 flex items-center gap-3">
            <span className="bg-primary-light text-primary text-sm font-medium px-3 py-1 rounded-full">
              {roleBadge}
            </span>
            {user?.email && <span className="text-muted">{user.email}</span>}
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-card border border-border bg-surface p-4 text-sm text-muted">
            {error}
          </div>
        )}

        {/* App cards grid */}
        <h2 className="text-heading font-semibold text-text-base mb-4">Your Apps</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-surface border border-border rounded-card shadow-card p-6">
                  <div className="skeleton skeleton-line" style={{ width: '40px', height: '40px' }} />
                  <div className="skeleton skeleton-line mt-4" style={{ width: '60%' }} />
                  <div className="skeleton skeleton-line" style={{ width: '90%' }} />
                </div>
              ))
            : accessibleApps.map((app) => {
                const { Icon } = app;
                return (
                  <div
                    key={app.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(app.path)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(app.path);
                      }
                    }}
                    className="bg-surface border border-border rounded-card shadow-card p-6 hover:shadow-card-sm hover:border-border-strong transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-base bg-primary-light text-primary flex items-center justify-center">
                        <Icon className="h-5 w-5" />
                      </div>
                      <ArrowRight className="h-5 w-5 text-subtle" />
                    </div>
                    <div className="text-base font-semibold text-text-base mb-1">{app.label}</div>
                    <div className="text-sm text-muted">
                      {APP_DESCRIPTIONS[app.id] || 'Open this app'}
                    </div>
                  </div>
                );
              })}
        </div>

        {/* Quick stats */}
        {stats.length > 0 && (
          <>
            <h2 className="text-heading font-semibold text-text-base mb-4">Quick Stats</h2>
            <div
              className={`grid gap-4 mb-10 grid-cols-2 ${
                stats.length >= 4 ? 'lg:grid-cols-4' : stats.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'
              }`}
            >
              {loading
                ? Array.from({ length: stats.length || 1 }).map((_, i) => (
                    <div key={i} className="bg-surface border border-border rounded-card p-5">
                      <div className="skeleton skeleton-line" style={{ width: '50%' }} />
                      <div className="skeleton skeleton-line mt-3" style={{ width: '30%', height: '24px' }} />
                    </div>
                  ))
                : stats.map(({ label, value, Icon }) => (
                    <div key={label} className="bg-surface border border-border rounded-card p-5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted">{label}</span>
                        <Icon className="h-5 w-5 text-subtle" />
                      </div>
                      <div className="text-2xl font-bold text-text-base">{value}</div>
                    </div>
                  ))}
            </div>
          </>
        )}

        {/* Recent activity */}
        <h2 className="text-heading font-semibold text-text-base mb-4">Recent Activity</h2>
        <div className="bg-surface border border-border rounded-card shadow-card">
          {loading ? (
            <div className="p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="skeleton" style={{ width: '20px', height: '20px' }} />
                  <div className="flex-1">
                    <div className="skeleton skeleton-line" style={{ width: '50%' }} />
                  </div>
                  <div className="skeleton skeleton-line" style={{ width: '80px' }} />
                </div>
              ))}
            </div>
          ) : recentActivity.length === 0 ? (
            <div className="text-subtle text-sm text-center py-8">No recent activity</div>
          ) : (
            recentActivity.map((item) => {
              const { Icon } = item;
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-base hover:bg-surface-raised transition-colors"
                >
                  <Icon className="h-5 w-5 text-subtle" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-text-base truncate">{item.label}</div>
                    <div className="text-xs text-subtle">{item.meta}</div>
                  </div>
                  {item.date && (
                    <div className="flex items-center gap-1.5 text-xs text-muted shrink-0">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDate(item.date)}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
