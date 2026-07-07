import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, FileText, BarChart3, TrendingUp, Inbox, ArrowRight,
  LayoutTemplate, Upload, Plug,
} from 'lucide-react';
import useFormStore from './store/formStore';
import { useToast } from '../../components/Toast';
import { ChartCard, SimpleAreaChart, SimpleBarChart, Sparkline, useChartColors } from '../../components/charts';
import { groupByDate, groupByCategory, buildSparklineData } from '../../utils/charts';

// Derive a lightweight status from the form's content.
// Forms with no fields are "Draft"; anything with fields is "Published"
// unless explicitly set to "closed".
const deriveStatus = (form) => form.status || ((form.fields?.length || 0) === 0 ? 'draft' : 'published');

export default function FormsDashboard() {
  const navigate = useNavigate();
  const cc = useChartColors();
  const { forms, createNewForm, loadForms, submissions } = useFormStore();
  const { toast, ToastMount } = useToast();

  useEffect(() => {
    loadForms();
  }, [loadForms]);

  const handleCreateForm = async () => {
    const newFormId = await createNewForm();
    const newForm = useFormStore.getState().forms.find((f) => f.id === newFormId);
    navigate(`/hub-admin/forms/builder/${newForm?.slug || newFormId}`);
  };

  const stats = useMemo(() => {
    const published = forms.filter((f) => deriveStatus(f) === 'published').length;
    const closed = forms.filter((f) => deriveStatus(f) === 'closed').length;
    const draft = forms.length - published - closed;
    const now = Date.now();
    const weekAgo = now - 7 * 864e5;
    const twoWeeksAgo = now - 14 * 864e5;
    const thisWeek = submissions.filter((s) => new Date(s.submittedAt).getTime() >= weekAgo).length;
    const lastWeek = submissions.filter((s) => {
      const t = new Date(s.submittedAt).getTime();
      return t >= twoWeeksAgo && t < weekAgo;
    }).length;
    const subsTrend = lastWeek > 0 ? Math.round((thisWeek - lastWeek) / lastWeek * 100) : 0;
    const totalSubs = submissions.length;
    const avgFields = forms.length > 0
      ? Math.round(forms.reduce((sum, f) => sum + (f.fields?.length || 0), 0) / forms.length)
      : 0;
    return {
      total: forms.length,
      published,
      draft,
      closed,
      totalSubs,
      thisWeek,
      subsTrend,
      avgFields,
      weekSubs: thisWeek,
    };
  }, [forms, submissions]);

  const subsSparkData = useMemo(() => buildSparklineData(submissions, 'submittedAt', 14), [submissions]);
  const activeFormsSparkData = useMemo(() => buildSparklineData(forms.filter((f) => deriveStatus(f) === 'published'), 'createdAt', 14), [forms]);
  const totalFormsSparkData = useMemo(() => buildSparklineData(forms, 'createdAt', 14), [forms]);
  const draftsSparkData = useMemo(() => buildSparklineData(forms.filter((f) => deriveStatus(f) === 'draft'), 'createdAt', 14), [forms]);

  return (
    <div className="bg-background">
      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        {/* Bento stats grid */}
        <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-fr">
          {/* Hero: Total Submissions */}
          <div className="col-span-2 row-span-1 min-h-[132px] rounded-2xl p-5 text-primary-foreground bg-primary relative overflow-hidden shadow-card flex flex-col">
            <div className="absolute top-4 right-4 w-9 h-9 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
              <Inbox className="h-5 w-5" />
            </div>
            <div className="text-sm text-primary-foreground/75 mb-1">Total Submissions</div>
            <div className="text-4xl font-bold tracking-tight">{stats.totalSubs.toLocaleString()}</div>
            <div className="mt-1 opacity-50">
              <Sparkline data={subsSparkData} color={cc.onPrimary} height={32} />
            </div>
            <div className="mt-auto flex items-center gap-1.5 text-sm font-semibold">
              <TrendingUp className="h-3.5 w-3.5" />
              {stats.subsTrend > 0 ? '+' : ''}{stats.subsTrend}% <span className="text-primary-foreground/60 font-normal">vs last week</span>
            </div>
          </div>

          {/* Active Forms */}
          <div className="min-h-[132px] rounded-2xl p-5 bg-surface border border-border-soft shadow-card-sm flex flex-col">
            <div className="flex items-start justify-between mb-1">
              <div className="text-sm text-muted">Active Forms</div>
              <div className="w-8 h-8 rounded-lg bg-primary-light text-primary flex items-center justify-center">
                <FileText className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-bold tracking-tight text-text-base">{stats.published}</div>
            <div className="mt-1 flex-1">
              <Sparkline data={activeFormsSparkData} color={cc.primary} height={32} />
            </div>
            <div className="mt-auto text-sm font-semibold text-success flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              {stats.draft} draft{stats.draft !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Completion ring — avg fields per form */}
          <div className="min-h-[132px] rounded-2xl p-4 bg-surface border border-border-soft shadow-card-sm flex items-center gap-3">
            <svg width="88" height="88" className="-rotate-90 flex-shrink-0" role="img" aria-label={`${stats.avgFields} avg fields per form`}>
              <circle cx="44" cy="44" r="36" fill="none" stroke="hsl(var(--surface-raised))" strokeWidth="6" />
              <circle cx="44" cy="44" r="36" fill="none" stroke="hsl(var(--success))" strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 36}
                      strokeDashoffset={2 * Math.PI * 36 * (1 - Math.min(stats.avgFields / 20, 1))} />
            </svg>
            <div>
              <div className="text-2xl font-bold text-text-base">{stats.avgFields}</div>
              <div className="text-xs text-muted">avg fields/form</div>
            </div>
          </div>

          {/* Total Forms */}
          <div className="min-h-[132px] rounded-2xl p-5 bg-surface border border-border-soft shadow-card-sm flex flex-col">
            <div className="flex items-start justify-between mb-1">
              <div className="text-sm text-muted">Total Forms</div>
              <div className="w-8 h-8 rounded-lg bg-primary-light text-primary flex items-center justify-center">
                <BarChart3 className="h-5 w-5" />
              </div>
            </div>
            <div className="text-3xl font-bold tracking-tight text-text-base">{stats.total}</div>
            <div className="mt-1 flex-1">
              <Sparkline data={totalFormsSparkData} color={cc.info} height={32} />
            </div>
            <div className="mt-auto text-sm text-muted">
              {stats.closed} closed
            </div>
          </div>

          {/* Drafts tile */}
          <div className="min-h-[132px] rounded-2xl p-5 bg-surface border border-border-soft shadow-card-sm flex flex-col">
            <div className="text-sm text-muted mb-1">Drafts</div>
            <div className="text-3xl font-bold tracking-tight text-text-base">{stats.draft}</div>
            <div className="mt-1 flex-1">
              <Sparkline data={draftsSparkData} color={cc.warning} height={32} />
            </div>
            <div className="mt-auto text-sm text-muted">
              {stats.published} live · {stats.closed} closed
            </div>
          </div>

          {/* Quick Actions */}
          <div className="col-span-2 min-h-[132px] rounded-2xl p-4 bg-surface border border-border-soft shadow-card-sm">
            <div className="text-sm font-semibold mb-2.5">Quick Actions</div>
            <div className="grid grid-cols-2 gap-2.5">
              <QuickAction icon={Plus} label="Blank Form" desc="Start from scratch" color="primary" onClick={handleCreateForm} />
              <QuickAction icon={LayoutTemplate} label="Template" desc="Pick a starting point" color="secondary" onClick={() => navigate('/hub-admin/forms/templates')} />
              <QuickAction icon={Upload} label="Import" desc="Upload a CSV" color="success" onClick={() => toast('Import coming soon.', 'info')} />
              <QuickAction icon={Plug} label="Integrate" desc="Connect an app" color="warning" onClick={() => toast('Integrations coming soon.', 'info')} />
            </div>
          </div>
        </div>

        {/* View All Forms CTA */}
        <div className="mb-6 flex items-center justify-between p-4 rounded-xl bg-surface border border-border-soft">
          <div>
            <h3 className="text-sm font-semibold text-text-base">Manage your forms</h3>
            <p className="text-xs text-muted mt-0.5">View, edit, and organize all your forms in one place</p>
          </div>
          <button
            onClick={() => navigate('/hub-admin/forms/list')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-base hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] text-sm font-medium transition-colors"
          >
            View All Forms
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Submissions Over Time" subtitle="Last 7 days">
            <SimpleAreaChart
              data={groupByDate(submissions, 'submittedAt', 'submissions', 7)}
              dataKeys={['submissions']}
              labels={{ dataKey: 'name', submissions: 'Submissions' }}
              colors={[cc.success]}
            />
          </ChartCard>
          <ChartCard title="Form Status" subtitle="Published, draft, and closed forms">
            <SimpleBarChart
              data={groupByCategory(forms, deriveStatus).map((s) => ({
                ...s,
                name: s.name.charAt(0).toUpperCase() + s.name.slice(1),
              }))}
              dataKeys={['value']}
              labels={{ dataKey: 'name', value: 'Forms' }}
              colors={[cc.primary]}
            />
          </ChartCard>
        </div>
      </div>

      {ToastMount}
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
