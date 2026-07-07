import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Globe, ExternalLink, Layout, Plus,
  TrendingUp, ArrowRight, Monitor, Paintbrush, Image,
} from 'lucide-react';
import api from '../../utils/api';
import EmptyState from '../../components/EmptyState';
import Skeleton from '../../components/Skeleton';
import { ChartCard, SimplePieChart, SimpleAreaChart, Sparkline, useChartColors } from '../../components/charts';
import { groupByDate, groupByCategory, buildSparklineData } from '../../utils/charts';

export default function WebDashboard() {
  const navigate = useNavigate();
  const cc = useChartColors();
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.get('/web/pages')
      .then((res) => { if (!cancelled) setPages(res.data || []); })
      .catch(() => { if (!cancelled) setError('Failed to load pages.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const publishedCount = pages.filter((p) => p.isPublished).length;
  const draftCount = pages.length - publishedCount;

  const pagesSparkData = useMemo(() => buildSparklineData(pages, 'updatedAt', 14), [pages]);
  const publishedSparkData = useMemo(() => buildSparklineData(pages.filter((p) => p.isPublished), 'updatedAt', 14), [pages]);
  const draftSparkData = useMemo(() => buildSparklineData(pages.filter((p) => !p.isPublished), 'updatedAt', 14), [pages]);

  const trend = useMemo(() => {
    const now = Date.now();
    const weekAgo = now - 7 * 864e5;
    const twoWeeksAgo = now - 14 * 864e5;
    const thisWeek = pages.filter((p) => new Date(p.updatedAt).getTime() >= weekAgo).length;
    const lastWeek = pages.filter((p) => {
      const t = new Date(p.updatedAt).getTime();
      return t >= twoWeeksAgo && t < weekAgo;
    }).length;
    return lastWeek > 0 ? Math.round((thisWeek - lastWeek) / lastWeek * 100) : 0;
  }, [pages]);

  if (loading) {
    return (
      <div className="bg-background min-h-screen">
        <div className="max-w-7xl mx-auto p-6 lg:p-8">
          <Skeleton className="!w-48 !h-8 mb-2" />
          <Skeleton variant="line" className="!w-64 mb-6" />
          <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-fr">
            <div className="col-span-2 min-h-[132px] rounded-2xl p-5 bg-surface border border-border-soft shadow-card-sm">
              <Skeleton variant="line" className="!w-24 mb-2" />
              <Skeleton className="!w-32 !h-10" />
            </div>
            <div className="min-h-[132px] rounded-2xl p-5 bg-surface border border-border-soft shadow-card-sm">
              <Skeleton variant="line" className="!w-20 mb-2" />
              <Skeleton className="!w-16 !h-8" />
            </div>
            <div className="min-h-[132px] rounded-2xl p-5 bg-surface border border-border-soft shadow-card-sm">
              <Skeleton variant="line" className="!w-20 mb-2" />
              <Skeleton className="!w-16 !h-8" />
            </div>
            <div className="col-span-2 min-h-[132px] rounded-2xl p-5 bg-surface border border-border-soft shadow-card-sm">
              <Skeleton variant="line" className="!w-1/3 mb-4" />
              <div className="grid grid-cols-2 gap-2.5">
                <Skeleton className="!h-10" />
                <Skeleton className="!h-10" />
              </div>
            </div>
            <div className="col-span-2 min-h-[132px] rounded-2xl p-5 bg-surface border border-border-soft shadow-card-sm">
              <Skeleton variant="line" className="!w-1/3 mb-4" />
              <div className="space-y-3">
                <Skeleton variant="line" />
                <Skeleton variant="line" />
                <Skeleton variant="line" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="card border-danger">
          <p className="text-danger">{error}</p>
        </div>
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <EmptyState
        title="No pages yet"
        description="Create your first page to start building your website."
        icon={Globe}
        primaryLabel="Create Page"
        primaryAction={() => navigate('/hub-admin/web/pages')}
        secondaryLabel="View Pages"
        secondaryAction={() => navigate('/hub-admin/web/pages')}
      />
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        {/* Bento stats grid */}
        <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-fr">
          {/* Hero: Total Pages */}
          <div className="col-span-2 row-span-1 min-h-[132px] rounded-2xl p-5 text-primary-foreground bg-primary relative overflow-hidden shadow-card flex flex-col">
            <div className="absolute top-4 right-4 w-9 h-9 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
              <Monitor className="h-5 w-5" />
            </div>
            <div className="text-sm text-primary-foreground/75 mb-1">Total Pages</div>
            <div className="text-4xl font-bold tracking-tight">{pages.length}</div>
            <div className="mt-1 opacity-50">
              <Sparkline data={pagesSparkData} color={cc.onPrimary} height={32} />
            </div>
            <div className="mt-auto flex items-center gap-1.5 text-sm font-semibold">
              <TrendingUp className="h-3.5 w-3.5" />
              {trend > 0 ? '+' : ''}{trend}% <span className="text-primary-foreground/60 font-normal">vs last week</span>
            </div>
          </div>

          {/* Published */}
          <div className="min-h-[132px] rounded-2xl p-5 bg-surface border border-border-soft shadow-card-sm flex flex-col">
            <div className="flex items-start justify-between mb-1">
              <div className="text-sm text-muted">Published</div>
              <div className="w-8 h-8 rounded-lg bg-success-light text-success flex items-center justify-center">
                <Globe className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-bold tracking-tight text-text-base">{publishedCount}</div>
            <div className="mt-1 flex-1">
              <Sparkline data={publishedSparkData} color={cc.success} height={32} />
            </div>
            <div className="mt-auto text-sm text-muted">
              {draftCount} draft{draftCount !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Drafts */}
          <div className="min-h-[132px] rounded-2xl p-5 bg-surface border border-border-soft shadow-card-sm flex flex-col">
            <div className="flex items-start justify-between mb-1">
              <div className="text-sm text-muted">Drafts</div>
              <div className="w-8 h-8 rounded-lg bg-warning-light text-warning flex items-center justify-center">
                <Layout className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-bold tracking-tight text-text-base">{draftCount}</div>
            <div className="mt-1 flex-1">
              <Sparkline data={draftSparkData} color={cc.warning} height={32} />
            </div>
            <div className="mt-auto text-sm text-muted">
              {publishedCount} live
            </div>
          </div>

          {/* Quick Actions */}
          <div className="col-span-2 min-h-[132px] rounded-2xl p-4 bg-surface border border-border-soft shadow-card-sm">
            <div className="text-sm font-semibold mb-2.5">Quick Actions</div>
            <div className="grid grid-cols-2 gap-2.5">
              <QuickAction icon={Plus} label="New Page" desc="Create a page" color="primary" onClick={() => navigate('/hub-admin/web/pages')} />
              <QuickAction icon={Paintbrush} label="Styles" desc="Edit theme" color="secondary" onClick={() => navigate('/hub-admin/web/styles')} />
              <QuickAction icon={Image} label="Assets" desc="Manage media" color="success" onClick={() => navigate('/hub-admin/web/assets')} />
              <QuickAction icon={ExternalLink} label="Preview" desc="View site" color="warning" onClick={() => window.open('/', '_blank')} />
            </div>
          </div>

          {/* Recent Pages */}
          <div className="col-span-2 min-h-[132px] rounded-2xl p-5 bg-surface border border-border-soft shadow-card-sm flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-text-base">Recent Pages</div>
              <button
                onClick={() => navigate('/hub-admin/web/pages')}
                className="text-xs font-medium text-primary hover:text-primary-hover transition-colors"
              >
                View all
              </button>
            </div>
            <div className="space-y-1 flex-1">
              {pages.slice(0, 5).map((page) => (
                <div
                  key={page.id}
                  className="flex items-center justify-between p-2 rounded-base hover:bg-surface-raised transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-2 h-2 rounded-full ${page.isPublished ? 'bg-success' : 'bg-warning'}`} />
                    <span className="text-sm font-medium text-text-base truncate">{page.title}</span>
                    <span className="text-xs text-muted hidden sm:inline">/{page.slug}</span>
                  </div>
                  <a
                    href={`/${page.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-base text-muted hover:text-primary hover:bg-primary-light transition-colors"
                    aria-label={`Preview ${page.title}`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* View All Pages CTA */}
        <div className="mb-6 flex items-center justify-between p-4 rounded-xl bg-surface border border-border-soft">
          <div>
            <h3 className="text-sm font-semibold text-text-base">Manage your pages</h3>
            <p className="text-xs text-muted mt-0.5">View, edit, and organize all your website pages</p>
          </div>
          <button
            onClick={() => navigate('/hub-admin/web/pages')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-base hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] text-sm font-medium transition-colors"
          >
            View All Pages
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Page Status" subtitle="Published vs draft pages">
            <SimplePieChart
              data={groupByCategory(pages, 'isPublished').map((p) => ({
                ...p,
                name: p.name === 'true' ? 'Published' : 'Draft',
              }))}
              colors={[cc.success, cc.warning]}
            />
          </ChartCard>
          <ChartCard title="Page Activity" subtitle="Pages updated in the last 7 days">
            <SimpleAreaChart
              data={groupByDate(pages, 'updatedAt', 'updates', 7)}
              dataKeys={['updates']}
              labels={{ dataKey: 'name', updates: 'Updates' }}
              colors={[cc.primary]}
            />
          </ChartCard>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, label, desc, color, onClick }) {
  const colorMap = {
    primary:   'bg-primary text-primary-foreground',
    secondary: 'bg-surface-tertiary text-text-base',
    success:   'bg-success text-primary-foreground',
    warning:   'bg-warning text-primary-foreground',
  };
  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-2 p-3.5 rounded-xl bg-surface-raised hover:bg-surface-tertiary transition-colors text-left focus:outline-none focus:ring-2 focus:ring-primary"
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorMap[color] || colorMap.secondary}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <div className="text-sm font-semibold text-text-base">{label}</div>
        <div className="text-xs text-muted">{desc}</div>
      </div>
    </button>
  );
}
