import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Mail, Users, BarChart3, Clock, MoreVertical, Edit, Trash2, Send, Eye } from 'lucide-react';
import useEmailStore from './store/emailStore';

export default function EmailDashboard() {
  const navigate = useNavigate();
  const { campaigns, mailingLists, loading, error, fetchCampaigns, fetchMailingLists, deleteCampaign } = useEmailStore();

  useEffect(() => {
    fetchCampaigns();
    fetchMailingLists();
  }, [fetchCampaigns, fetchMailingLists]);

  const handleDeleteCampaign = async (id) => {
    if (confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
      try {
        await deleteCampaign(id);
      } catch (error) {
        console.error('Failed to delete campaign:', error);
      }
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

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (error) {
    return <div className="p-8 text-danger">Error: {error}</div>;
  }

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-display font-bold text-base mb-2">Email Campaigns</h1>
        <p className="text-body text-muted">Create, manage, and track your email campaigns</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-surface border border-border rounded-card shadow-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-label text-muted mb-1">Total Campaigns</p>
              <p className="text-heading font-bold text-base">{campaigns.length}</p>
            </div>
            <Mail className="h-8 w-8 text-primary" />
          </div>
        </div>
        <div className="bg-surface border border-border rounded-card shadow-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-label text-muted mb-1">Total Recipients</p>
              <p className="text-heading font-bold text-base">
                {mailingLists.reduce((sum, list) => sum + (list.count ? list.count : 0), 0).toLocaleString()}
              </p>
            </div>
            <Users className="h-8 w-8 text-primary" />
          </div>
        </div>
        <div className="bg-surface border border-border rounded-card shadow-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-label text-muted mb-1">Emails Sent</p>
              <p className="text-heading font-bold text-base">
                {campaigns.reduce((sum, c) => sum + (c.metrics?.sent || 0), 0).toLocaleString()}
              </p>
            </div>
            <Send className="h-8 w-8 text-primary" />
          </div>
        </div>
        <div className="bg-surface border border-border rounded-card shadow-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-label text-muted mb-1">Avg Open Rate</p>
              <p className="text-heading font-bold text-base">
                {campaigns.length > 0 && campaigns.some(c => c.metrics?.sent > 0)
                  ? `${Math.round(campaigns.filter(c => c.metrics?.sent > 0).reduce((sum, c) => sum + (c.metrics.opened / c.metrics.sent * 100), 0) / campaigns.filter(c => c.metrics?.sent > 0).length)}%`
                  : '0%'}
              </p>
            </div>
            <BarChart3 className="h-8 w-8 text-primary" />
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-3">
          <button 
            onClick={() => navigate('/hub-admin/email/campaigns/new')}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-text-inverse rounded-base hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] font-medium transition-colors duration-150"
          >
            <Plus className="h-4 w-4" />
            <span className="text-body">New Campaign</span>
          </button>
          <button 
            onClick={() => navigate('/hub-admin/email/lists')}
            className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-border rounded-base hover:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] font-medium transition-colors duration-150"
          >
            <Users className="h-4 w-4" />
            <span className="text-body">Manage Lists</span>
          </button>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-surface border border-border rounded-card overflow-hidden shadow-card">
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
                      className="p-2 min-h-[36px] min-w-[36px] text-subtle hover:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 transition-colors" 
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    {campaign.status === 'sent' && (
                      <button 
                        onClick={() => navigate(`/hub-admin/email/campaigns/${campaign.id}/analytics`)}
                        className="p-2 min-h-[36px] min-w-[36px] text-subtle hover:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 transition-colors" 
                        title="View Analytics"
                      >
                        <BarChart3 className="h-4 w-4" />
                      </button>
                    )}
                    <button 
                      onClick={() => handleDeleteCampaign(campaign.id)}
                      className="p-2 min-h-[36px] min-w-[36px] text-subtle hover:text-danger focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 transition-colors" 
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button className="p-2 min-h-[36px] min-w-[36px] text-subtle hover:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 transition-colors" title="More">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
