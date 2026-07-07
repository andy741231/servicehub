import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Mail, Users, BarChart3, Clock, MoreVertical, Edit, Trash2, Send,
  TrendingUp, ArrowRight, Megaphone, List, Sparkles,
} from 'lucide-react';
import useEmailStore from './store/emailStore';
import { useConfirm } from '../../components/Dialog';
import Skeleton from '../../components/Skeleton';
import { ChartCard, SimplePieChart, SimpleBarChart, Sparkline, useChartColors } from '../../components/charts';
import { groupByCategory, buildSparklineData } from '../../utils/charts';

export default function EmailDashboard() {
  const navigate = useNavigate();
  const cc = useChartColors();
  const { campaigns, mailingLists, loading, error, fetchCampaigns, fetchMailingLists, deleteCampaign } = useEmailStore();
  const { confirmDialog, ConfirmDialogMount } = useConfirm();

  useEffect(() => {
    fetchCampaigns();
    fetchMailingLists();
  }, [fetchCampaigns, fetchMailingLists]);

  const handleDeleteCampaign = async (id) => {
    const ok = await confirmDialog({
      title: 'Delete this campaign?',
      message: 'This action cannot be undone.',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await deleteCampaign(id);
    } catch (error) {
      console.error('Failed to delete campaign:', error);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      sent: 'bg-success-light text-success',
      scheduled: 'bg-warning-light text-warning',
      draft: 'bg-surface-raised text-muted',
      paused: 'bg-danger-light text-danger'
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-small font-medium ${styles[status] || styles.draft}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const totalRecipients = useMemo(
    () => mailingLists.reduce((sum, list) => sum + (list.count ? list.count : 0), 0),
    [mailingLists]
  );
  const totalSent = useMemo(
    () => campaigns.reduce((sum, c) => sum + (c.metrics?.sent || 0), 0),
    [campaigns]
  );
  const avgOpenRate = useMemo(() => {
    const sentCampaigns = campaigns.filter((c) => c.metrics?.sent > 0);
    if (sentCampaigns.length === 0) return 0;
    return Math.round(
      sentCampaigns.reduce((sum, c) => sum + (c.metrics.opened / c.metrics.sent) * 100, 0) /
        sentCampaigns.length
    );
  }, [campaigns]);
  const trend = useMemo(() => {
    const now = Date.now();
    const weekAgo = now - 7 * 864e5;
    const twoWeeksAgo = now - 14 * 864e5;
    const thisWeek = campaigns.filter((c) => new Date(c.createdAt).getTime() >= weekAgo).length;
    const lastWeek = campaigns.filter((c) => {
      const t = new Date(c.createdAt).getTime();
      return t >= twoWeeksAgo && t < weekAgo;
    }).length;
    return lastWeek > 0 ? Math.round((thisWeek - lastWeek) / lastWeek * 100) : 0;
  }, [campaigns]);

  const campaignsSparkData = useMemo(() => buildSparklineData(campaigns, 'createdAt', 14), [campaigns]);
  const sentSparkData = useMemo(() => buildSparklineData(campaigns.filter((c) => c.status === 'sent'), 'sentAt', 14), [campaigns]);
  const recipientsSparkData = useMemo(() => {
    // Build cumulative recipient count from mailing list creation dates
    const allRecipients = [];
    mailingLists.forEach((list) => {
      for (let i = 0; i < (list.count || 0); i++) {
        allRecipients.push({ createdAt: list.createdAt });
      }
    });
    return buildSparklineData(allRecipients, 'createdAt', 14);
  }, [mailingLists]);
  const openRateSparkData = useMemo(() => {
    // Build sparkline from per-campaign open rates sorted by sent date
    const sentCampaigns = campaigns
      .filter((c) => c.metrics?.sent > 0 && c.sentAt)
      .sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt))
      .slice(-14);
    return sentCampaigns.map((c) => ({
      value: Math.round((c.metrics.opened / c.metrics.sent) * 100),
    }));
  }, [campaigns]);

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
            <div className="min-h-[132px] rounded-2xl p-5 bg-surface border border-border-soft shadow-card-sm">
              <Skeleton variant="line" className="!w-20 mb-2" />
              <Skeleton className="!w-16 !h-8" />
            </div>
            <div className="col-span-3 min-h-[132px] rounded-2xl p-4 bg-surface border border-border-soft shadow-card-sm">
              <Skeleton variant="line" className="!w-1/3 mb-4" />
              <div className="grid grid-cols-2 gap-2.5">
                <Skeleton className="!h-10" />
                <Skeleton className="!h-10" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-background min-h-screen p-8">
        <div className="card border-danger max-w-7xl mx-auto">
          <p className="text-danger">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        {/* Bento stats grid */}
        <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-fr">
          {/* Hero: Total Campaigns */}
          <div className="col-span-2 row-span-1 min-h-[132px] rounded-2xl p-5 text-primary-foreground bg-primary relative overflow-hidden shadow-card flex flex-col">
            <div className="absolute top-4 right-4 w-9 h-9 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
              <Megaphone className="h-5 w-5" />
            </div>
            <div className="text-sm text-primary-foreground/75 mb-1">Total Campaigns</div>
            <div className="text-4xl font-bold tracking-tight">{campaigns.length}</div>
            <div className="mt-1 opacity-50">
              <Sparkline data={campaignsSparkData} color={cc.onPrimary} height={32} />
            </div>
            <div className="mt-auto flex items-center gap-1.5 text-sm font-semibold">
              <TrendingUp className="h-3.5 w-3.5" />
              {trend > 0 ? '+' : ''}{trend}% <span className="text-primary-foreground/60 font-normal">vs last week</span>
            </div>
          </div>

          {/* Total Recipients */}
          <div className="min-h-[132px] rounded-2xl p-5 bg-surface border border-border-soft shadow-card-sm flex flex-col">
            <div className="flex items-start justify-between mb-1">
              <div className="text-sm text-muted">Total Recipients</div>
              <div className="w-8 h-8 rounded-lg bg-primary-light text-primary flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-bold tracking-tight text-text-base">{totalRecipients.toLocaleString()}</div>
            <div className="mt-1 flex-1">
              <Sparkline data={recipientsSparkData} color={cc.primary} height={32} />
            </div>
            <div className="mt-auto text-sm text-muted">Across {mailingLists.length} list{mailingLists.length !== 1 ? 's' : ''}</div>
          </div>

          {/* Emails Sent */}
          <div className="min-h-[132px] rounded-2xl p-5 bg-surface border border-border-soft shadow-card-sm flex flex-col">
            <div className="flex items-start justify-between mb-1">
              <div className="text-sm text-muted">Emails Sent</div>
              <div className="w-8 h-8 rounded-lg bg-success-light text-success flex items-center justify-center">
                <Send className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-bold tracking-tight text-text-base">{totalSent.toLocaleString()}</div>
            <div className="mt-1 flex-1">
              <Sparkline data={sentSparkData} color={cc.success} height={32} />
            </div>
            <div className="mt-auto text-sm text-muted">All time</div>
          </div>

          {/* Avg Open Rate */}
          <div className="min-h-[132px] rounded-2xl p-5 bg-surface border border-border-soft shadow-card-sm flex flex-col">
            <div className="flex items-start justify-between mb-1">
              <div className="text-sm text-muted">Avg Open Rate</div>
              <div className="w-8 h-8 rounded-lg bg-warning-light text-warning flex items-center justify-center">
                <BarChart3 className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-bold tracking-tight text-text-base">{avgOpenRate}%</div>
            <div className="mt-1 flex-1">
              <Sparkline data={openRateSparkData} color={cc.warning} height={32} />
            </div>
            <div className="mt-auto text-sm text-muted">Sent campaigns</div>
          </div>

          {/* Quick Actions */}
          <div className="col-span-3 min-h-[132px] rounded-2xl p-4 bg-surface border border-border-soft shadow-card-sm">
            <div className="text-sm font-semibold mb-2.5">Quick Actions</div>
            <div className="grid grid-cols-2 gap-2.5">
              <QuickAction icon={Plus} label="New Campaign" desc="Start from scratch" color="primary" onClick={() => navigate('/hub-admin/email/campaigns/new')} />
              <QuickAction icon={List} label="Lists" desc="Manage recipients" color="secondary" onClick={() => navigate('/hub-admin/email/lists')} />
              <QuickAction icon={Sparkles} label="Templates" desc="Saved designs" color="success" onClick={() => navigate('/hub-admin/email/templates')} />
              <QuickAction icon={Mail} label="Campaigns" desc="View all" color="warning" onClick={() => navigate('/hub-admin/email/campaigns')} />
            </div>
          </div>
        </div>

        {/* View All Campaigns CTA */}
        <div className="mb-6 flex items-center justify-between p-4 rounded-xl bg-surface border border-border-soft">
          <div>
            <h3 className="text-sm font-semibold text-text-base">Manage your campaigns</h3>
            <p className="text-xs text-muted mt-0.5">View, edit, and send all your email campaigns</p>
          </div>
          <button
            onClick={() => navigate('/hub-admin/email/campaigns')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-base hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] text-sm font-medium transition-colors"
          >
            View All Campaigns
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

      {/* Campaigns Table */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-card-sm mb-8">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-heading font-semibold text-base">Recent Campaigns</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-surface-raised">
              <th className="px-4 py-3 text-left text-label text-muted uppercase tracking-wider font-medium">Campaign</th>
              <th className="px-4 py-3 text-left text-label text-muted uppercase tracking-wider font-medium">Status</th>
              <th className="px-4 py-3 text-left text-label text-muted uppercase tracking-wider font-medium">Sent</th>
              <th className="px-4 py-3 text-left text-label text-muted uppercase tracking-wider font-medium">Opened</th>
              <th className="px-4 py-3 text-left text-label text-muted uppercase tracking-wider font-medium">Clicked</th>
              <th className="px-4 py-3 text-left text-label text-muted uppercase tracking-wider font-medium">Open Rate</th>
              <th className="px-4 py-3 text-left text-label text-muted uppercase tracking-wider font-medium">Date</th>
              <th className="px-4 py-3 text-right text-label text-muted uppercase tracking-wider font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((campaign) => (
              <tr key={campaign.id} className="border-t border-border hover:bg-surface-raised transition-colors">
                <td className="px-4 py-4">
                  <div>
                    <p className="text-body font-medium text-base">{campaign.name}</p>
                    <p className="text-small text-muted">{campaign.subject}</p>
                  </div>
                </td>
                <td className="px-4 py-4">{getStatusBadge(campaign.status)}</td>
                <td className="px-4 py-4 text-body">{(campaign.metrics?.sent || 0).toLocaleString()}</td>
                <td className="px-4 py-4 text-body">{(campaign.metrics?.opened || 0).toLocaleString()}</td>
                <td className="px-4 py-4 text-body">{(campaign.metrics?.clicked || 0).toLocaleString()}</td>
                <td className="px-4 py-4 text-body">
                  {campaign.metrics?.sent > 0 ? `${((campaign.metrics.opened / campaign.metrics.sent) * 100).toFixed(1)}%` : '—'}
                </td>
                <td className="px-4 py-4 text-small text-muted">
                  {campaign.status === 'scheduled' ? (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(campaign.scheduledAt)}
                    </div>
                  ) : campaign.status === 'sent' ? (
                    formatDate(campaign.sentAt)
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button 
                      onClick={() => navigate(`/hub-admin/email/campaigns/${campaign.id}/edit`)}
                      className="p-2 min-h-[44px] min-w-[44px] text-subtle hover:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 transition-colors" 
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    {campaign.status === 'sent' && (
                      <button 
                        onClick={() => navigate(`/hub-admin/email/campaigns/${campaign.id}/analytics`)}
                        className="p-2 min-h-[44px] min-w-[44px] text-subtle hover:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 transition-colors" 
                        title="View Analytics"
                      >
                        <BarChart3 className="h-4 w-4" />
                      </button>
                    )}
                    <button 
                      onClick={() => handleDeleteCampaign(campaign.id)}
                      className="p-2 min-h-[44px] min-w-[44px] text-subtle hover:text-danger focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 transition-colors" 
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button className="p-2 min-h-[44px] min-w-[44px] text-subtle hover:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 transition-colors" title="More">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Campaign Status" subtitle="Draft, scheduled, sent, and paused">
          <SimplePieChart
            data={groupByCategory(campaigns, 'status').map((s) => ({
              ...s,
              name: s.name.charAt(0).toUpperCase() + s.name.slice(1),
            }))}
            colors={[cc.muted, cc.warning, cc.success, cc.danger]}
          />
        </ChartCard>
        <ChartCard title="Email Activity" subtitle="Sent, opened, and clicked by send date">
          <SimpleBarChart
            data={campaigns
              .filter((c) => c.status === 'sent' && c.sentAt)
              .reduce((acc, c) => {
                const label = new Date(c.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const existing = acc.find((d) => d.name === label);
                if (existing) {
                  existing.sent += c.metrics?.sent || 0;
                  existing.opened += c.metrics?.opened || 0;
                  existing.clicked += c.metrics?.clicked || 0;
                } else {
                  acc.push({
                    name: label,
                    sent: c.metrics?.sent || 0,
                    opened: c.metrics?.opened || 0,
                    clicked: c.metrics?.clicked || 0,
                  });
                }
                return acc;
              }, [])
              .slice(0, 7)
              .reverse()}
            dataKeys={['sent', 'opened', 'clicked']}
            labels={{ dataKey: 'name', sent: 'Sent', opened: 'Opened', clicked: 'Clicked' }}
            colors={[cc.primary, cc.success, cc.info]}
            stacked
          />
        </ChartCard>
      </div>
      {ConfirmDialogMount}
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
