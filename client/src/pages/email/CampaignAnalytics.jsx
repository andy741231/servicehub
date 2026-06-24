import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, Mail, Eye, MousePointer, AlertCircle, UserMinus, Flag } from 'lucide-react';
import useEmailStore from './store/emailStore';

export default function CampaignAnalytics() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentCampaign, loading, error, fetchCampaignById } = useEmailStore();

  useEffect(() => {
    if (id) {
      fetchCampaignById(id);
    }
  }, [id, fetchCampaignById]);

  const campaign = currentCampaign || {
    id,
    name: 'Summer Newsletter',
    subject: 'Your Summer Updates Are Here',
    status: 'sent',
    sentAt: '2024-06-15T10:00:00Z',
    metrics: {
      sent: 1250,
      delivered: 1180,
      opened: 890,
      clicked: 340,
      bounced: 70,
      unsubscribed: 25,
      complained: 5
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (error) {
    return <div className="p-8 text-danger">Error: {error}</div>;
  }

  const calculateRate = (numerator, denominator) => {
    if (denominator === 0) return 0;
    return ((numerator / denominator) * 100).toFixed(1);
  };

  const metrics = campaign.metrics || {
    sent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    bounced: 0,
    unsubscribed: 0,
    complained: 0
  };

  const stats = [
    {
      label: 'Sent',
      value: metrics.sent,
      icon: Mail,
      color: 'primary',
      rate: null
    },
    {
      label: 'Delivered',
      value: metrics.delivered,
      icon: Mail,
      color: 'success',
      rate: calculateRate(metrics.delivered, metrics.sent)
    },
    {
      label: 'Opened',
      value: metrics.opened,
      icon: Eye,
      color: 'info',
      rate: calculateRate(metrics.opened, metrics.delivered)
    },
    {
      label: 'Clicked',
      value: metrics.clicked,
      icon: MousePointer,
      color: 'primary',
      rate: calculateRate(metrics.clicked, metrics.opened)
    },
    {
      label: 'Bounced',
      value: metrics.bounced,
      icon: AlertCircle,
      color: 'warning',
      rate: calculateRate(metrics.bounced, metrics.sent)
    },
    {
      label: 'Unsubscribed',
      value: metrics.unsubscribed,
      icon: UserMinus,
      color: 'danger',
      rate: calculateRate(metrics.unsubscribed, metrics.delivered)
    }
  ];

  const getColorClasses = (color) => {
    const colors = {
      primary: 'text-primary bg-primary-light',
      success: 'text-success bg-success-light',
      warning: 'text-warning bg-warning-light',
      danger: 'text-danger bg-danger-light',
      info: 'text-info bg-info-light'
    };
    return colors[color] || colors.primary;
  };

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => navigate('/hub-admin/email')}
            className="p-2 min-h-[44px] min-w-[44px] text-subtle hover:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-display font-bold text-base">Campaign Analytics</h1>
        </div>
        <div className="ml-11">
          <h2 className="text-heading font-semibold text-base">{campaign.name || 'Campaign'}</h2>
          <p className="text-body text-muted">{campaign.subject || 'No subject'}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-surface border border-border rounded-card shadow-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-base ${getColorClasses(stat.color)}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              {stat.rate && (
                <span className="text-label text-muted">{stat.rate}% rate</span>
              )}
            </div>
            <p className="text-label text-muted mb-1">{stat.label}</p>
            <p className="text-display font-bold text-base">{stat.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Performance Overview */}
      <div className="bg-surface border border-border rounded-card shadow-card p-6 mb-6">
        <h3 className="text-heading font-semibold text-base mb-4">Performance Overview</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-body text-muted">Delivery Rate</span>
              <span className="text-body font-medium text-base">
                {calculateRate(metrics.delivered, metrics.sent)}%
              </span>
            </div>
            <div className="w-full bg-surface-raised rounded-full h-2">
              <div
                className="bg-success h-2 rounded-full transition-all"
                style={{ width: `${calculateRate(metrics.delivered, metrics.sent)}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-body text-muted">Open Rate</span>
              <span className="text-body font-medium text-base">
                {calculateRate(metrics.opened, metrics.delivered)}%
              </span>
            </div>
            <div className="w-full bg-surface-raised rounded-full h-2">
              <div
                className="bg-info h-2 rounded-full transition-all"
                style={{ width: `${calculateRate(metrics.opened, metrics.delivered)}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-body text-muted">Click Rate</span>
              <span className="text-body font-medium text-base">
                {calculateRate(metrics.clicked, metrics.opened)}%
              </span>
            </div>
            <div className="w-full bg-surface-raised rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${calculateRate(metrics.clicked, metrics.opened)}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-body text-muted">Bounce Rate</span>
              <span className="text-body font-medium text-base">
                {calculateRate(metrics.bounced, metrics.sent)}%
              </span>
            </div>
            <div className="w-full bg-surface-raised rounded-full h-2">
              <div
                className="bg-warning h-2 rounded-full transition-all"
                style={{ width: `${calculateRate(metrics.bounced, metrics.sent)}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-body text-muted">Unsubscribe Rate</span>
              <span className="text-body font-medium text-base">
                {calculateRate(metrics.unsubscribed, metrics.delivered)}%
              </span>
            </div>
            <div className="w-full bg-surface-raised rounded-full h-2">
              <div
                className="bg-danger h-2 rounded-full transition-all"
                style={{ width: `${calculateRate(metrics.unsubscribed, metrics.delivered)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Issues & Warnings */}
      {(metrics.bounced > 0 || metrics.complained > 0) && (
        <div className="bg-surface border border-border rounded-card shadow-card p-6">
          <h3 className="text-heading font-semibold text-base mb-4">Issues & Warnings</h3>
          <div className="space-y-3">
            {metrics.bounced > 0 && (
              <div className="flex items-start gap-3 p-3 bg-warning-light rounded-base">
                <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-body font-medium text-base">High Bounce Rate</p>
                  <p className="text-small text-muted">
                    {metrics.bounced} emails bounced. Consider reviewing your recipient list quality.
                  </p>
                </div>
              </div>
            )}
            {metrics.complained > 0 && (
              <div className="flex items-start gap-3 p-3 bg-danger-light rounded-base">
                <Flag className="h-5 w-5 text-danger flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-body font-medium text-base">Spam Complaints</p>
                  <p className="text-small text-muted">
                    {metrics.complained} recipients marked this email as spam. Review your content and sending practices.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
