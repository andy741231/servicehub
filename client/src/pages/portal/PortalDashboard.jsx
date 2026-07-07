import { LayoutDashboard, Sparkles, Lock, Bell, FileCheck, Rocket, Users, ArrowRight, TrendingUp } from 'lucide-react';
import EmptyState from '../../components/EmptyState';
import { ChartCard, SimpleBarChart, Sparkline, useChartColors } from '../../components/charts';
import { sparklineFromValues } from '../../utils/charts';

// Sample sparkline data for the coming-soon portal
const devProgress = sparklineFromValues([10, 20, 25, 35, 45, 50, 60, 70, 75]);
const featuresSpark = sparklineFromValues([1, 2, 2, 3, 3, 4, 4, 4, 4]);

export default function PortalDashboard() {
  const cc = useChartColors();
  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        {/* Bento stats grid */}
        <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-fr">
          {/* Hero: Coming soon */}
          <div className="col-span-2 row-span-1 min-h-[132px] rounded-2xl p-5 text-primary-foreground bg-primary relative overflow-hidden shadow-card flex flex-col">
            <div className="absolute top-4 right-4 w-9 h-9 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
              <Rocket className="h-5 w-5" />
            </div>
            <div className="text-sm text-primary-foreground/75 mb-1">Portal Status</div>
            <div className="text-4xl font-bold tracking-tight">Coming Soon</div>
            <div className="mt-1 opacity-50">
              <Sparkline data={devProgress} color={cc.onPrimary} height={32} />
            </div>
            <div className="mt-auto flex items-center gap-1.5 text-sm font-semibold">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="text-primary-foreground/60 font-normal">In active development</span>
            </div>
          </div>

          {/* Features */}
          <div className="min-h-[132px] rounded-2xl p-5 bg-surface border border-border-soft shadow-card-sm flex flex-col">
            <div className="flex items-start justify-between mb-1">
              <div className="text-sm text-muted">Features</div>
              <div className="w-8 h-8 rounded-lg bg-primary-light text-primary flex items-center justify-center">
                <Sparkles className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-bold tracking-tight text-text-base">4</div>
            <div className="mt-1 flex-1">
              <Sparkline data={featuresSpark} color={cc.primary} height={32} />
            </div>
            <div className="mt-auto text-sm text-muted">Planned modules</div>
          </div>

          {/* Members */}
          <div className="min-h-[132px] rounded-2xl p-5 bg-surface border border-border-soft shadow-card-sm flex flex-col">
            <div className="flex items-start justify-between mb-1">
              <div className="text-sm text-muted">Members</div>
              <div className="w-8 h-8 rounded-lg bg-success-light text-success flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-bold tracking-tight text-text-base">—</div>
            <div className="mt-1 flex-1">
              <Sparkline data={sparklineFromValues([0, 0, 0, 0, 0, 0, 0, 0, 0])} color={cc.muted} height={32} />
            </div>
            <div className="mt-auto text-sm text-muted">After launch</div>
          </div>

          {/* Feature previews */}
          <div className="col-span-2 min-h-[132px] rounded-2xl p-4 bg-surface border border-border-soft shadow-card-sm">
            <div className="text-sm font-semibold mb-2.5">Feature Preview</div>
            <div className="grid grid-cols-2 gap-2.5">
              <FeaturePreview icon={Lock} title="Secure Login" />
              <FeaturePreview icon={Bell} title="Notifications" />
              <FeaturePreview icon={FileCheck} title="Resources" />
              <FeaturePreview icon={Sparkles} title="Personalization" />
            </div>
          </div>

          {/* Empty state tile */}
          <div className="col-span-2 min-h-[132px] rounded-2xl p-5 bg-surface border border-border-soft shadow-card-sm flex flex-col">
            <EmptyState
              title="Portal is coming soon"
              description="A secure member portal for logins, content, and preferences."
              icon={LayoutDashboard}
              secondaryLabel="Learn more"
              secondaryAction={() => {}}
              compact
            />
          </div>
        </div>

        {/* View Portal CTA */}
        <div className="mb-6 flex items-center justify-between p-4 rounded-xl bg-surface border border-border-soft">
          <div>
            <h3 className="text-sm font-semibold text-text-base">Member portal</h3>
            <p className="text-xs text-muted mt-0.5">Launch a self-service space for your audience</p>
          </div>
          <button
            disabled
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-base hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Launch Portal
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* Chart placeholder */}
        <div>
          <ChartCard title="Portal Activity" subtitle="Sample data — real analytics will appear once the portal is live">
            <SimpleBarChart
              data={[
                { name: 'Jan', value: 12 },
                { name: 'Feb', value: 19 },
                { name: 'Mar', value: 15 },
                { name: 'Apr', value: 27 },
                { name: 'May', value: 22 },
                { name: 'Jun', value: 34 },
              ]}
              dataKeys={['value']}
              labels={{ dataKey: 'name', value: 'Active Users' }}
              colors={[cc.primary]}
            />
          </ChartCard>
        </div>
      </div>
    </div>
  );
}

function FeaturePreview({ icon: Icon, title }) {
  return (
    <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-surface-raised border border-border-soft opacity-80">
      <div className="w-8 h-8 rounded-lg bg-primary-light text-primary flex items-center justify-center">
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-sm font-semibold text-text-base">{title}</div>
    </div>
  );
}
