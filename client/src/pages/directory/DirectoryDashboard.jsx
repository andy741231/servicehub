import { useNavigate } from 'react-router-dom';
import { BookOpen, Users, Building2, Search, ArrowRight, TrendingUp, UserPlus } from 'lucide-react';
import EmptyState from '../../components/EmptyState';
import { ChartCard, SimpleBarChart, Sparkline, useChartColors } from '../../components/charts';
import { groupByCategory, sparklineFromValues } from '../../utils/charts';

// Same mock data used in the Directory browse page.
const MOCK_DIRECTORY = [
  { id: 1, name: 'Sarah Johnson', title: 'Engineering Manager', department: 'Engineering' },
  { id: 2, name: 'Michael Chen', title: 'Senior Developer', department: 'Engineering' },
  { id: 3, name: 'Emily Rodriguez', title: 'Product Designer', department: 'Design' },
  { id: 4, name: 'David Kim', title: 'Data Analyst', department: 'Analytics' },
  { id: 5, name: 'Jessica Williams', title: 'Marketing Director', department: 'Marketing' },
  { id: 6, name: 'Alex Thompson', title: 'DevOps Engineer', department: 'Engineering' },
  { id: 7, name: 'Rachel Green', title: 'HR Manager', department: 'Human Resources' },
  { id: 8, name: 'James Wilson', title: 'Sales Representative', department: 'Sales' },
];

const DEPARTMENTS = [...new Set(MOCK_DIRECTORY.map((p) => p.department))];

export default function DirectoryDashboard() {
  const navigate = useNavigate();
  const cc = useChartColors();

  const total = MOCK_DIRECTORY.length;
  const departments = DEPARTMENTS.length;

  // Synthetic sparkline data (mock data has no timestamps)
  const membersSpark = sparklineFromValues([2, 3, 3, 4, 5, 5, 6, 7, 8]);
  const deptSpark = sparklineFromValues([1, 2, 3, 4, 4, 5, 5, 5, 5]);
  const searchSpark = sparklineFromValues([0, 1, 1, 1, 1, 1, 1, 1, 1]);

  if (total === 0) {
    return (
      <EmptyState
        title="Directory is empty"
        description="Add team members so visitors can find and connect with your organization."
        icon={BookOpen}
        primaryLabel="Browse Directory"
        primaryAction={() => navigate('/hub-admin/directory/browse')}
      />
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        {/* Bento stats grid */}
        <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-fr">
          {/* Hero: Team Members */}
          <div className="col-span-2 row-span-1 min-h-[132px] rounded-2xl p-5 text-primary-foreground bg-primary relative overflow-hidden shadow-card flex flex-col">
            <div className="absolute top-4 right-4 w-9 h-9 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
            <div className="text-sm text-primary-foreground/75 mb-1">Team Members</div>
            <div className="text-4xl font-bold tracking-tight">{total}</div>
            <div className="mt-1 opacity-50">
              <Sparkline data={membersSpark} color={cc.onPrimary} height={32} />
            </div>
            <div className="mt-auto flex items-center gap-1.5 text-sm font-semibold">
              <TrendingUp className="h-3.5 w-3.5" />
              {departments} departments
            </div>
          </div>

          {/* Departments */}
          <div className="min-h-[132px] rounded-2xl p-5 bg-surface border border-border-soft shadow-card-sm flex flex-col">
            <div className="flex items-start justify-between mb-1">
              <div className="text-sm text-muted">Departments</div>
              <div className="w-8 h-8 rounded-lg bg-primary-light text-primary flex items-center justify-center">
                <Building2 className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-bold tracking-tight text-text-base">{departments}</div>
            <div className="mt-1 flex-1">
              <Sparkline data={deptSpark} color={cc.primary} height={32} />
            </div>
            <div className="mt-auto text-sm text-muted">{total} members</div>
          </div>

          {/* Searchable */}
          <div className="min-h-[132px] rounded-2xl p-5 bg-surface border border-border-soft shadow-card-sm flex flex-col">
            <div className="flex items-start justify-between mb-1">
              <div className="text-sm text-muted">Searchable</div>
              <div className="w-8 h-8 rounded-lg bg-success-light text-success flex items-center justify-center">
                <Search className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-bold tracking-tight text-text-base">Yes</div>
            <div className="mt-1 flex-1">
              <Sparkline data={searchSpark} color={cc.success} height={32} />
            </div>
            <div className="mt-auto text-sm text-muted">Public directory</div>
          </div>

          {/* Quick Actions */}
          <div className="col-span-2 min-h-[132px] rounded-2xl p-4 bg-surface border border-border-soft shadow-card-sm">
            <div className="text-sm font-semibold mb-2.5">Quick Actions</div>
            <div className="grid grid-cols-2 gap-2.5">
              <QuickAction icon={Search} label="Browse" desc="Find members" color="primary" onClick={() => navigate('/hub-admin/directory/browse')} />
              <QuickAction icon={UserPlus} label="Add Member" desc="Coming soon" color="secondary" onClick={() => {}} />
            </div>
          </div>

          {/* Recent Members */}
          <div className="col-span-2 min-h-[132px] rounded-2xl p-5 bg-surface border border-border-soft shadow-card-sm flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-text-base">Team Members</div>
              <button
                onClick={() => navigate('/hub-admin/directory/browse')}
                className="text-xs font-medium text-primary hover:text-primary-hover transition-colors"
              >
                Browse all
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
              {MOCK_DIRECTORY.slice(0, 6).map((person) => (
                <div
                  key={person.id}
                  className="p-3 rounded-xl bg-surface-raised border border-border-soft hover:border-primary transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                      {person.name.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-base truncate">{person.name}</p>
                      <p className="text-xs text-muted truncate">{person.title}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted mt-1.5">{person.department}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* View All Directory CTA */}
        <div className="mb-6 flex items-center justify-between p-4 rounded-xl bg-surface border border-border-soft">
          <div>
            <h3 className="text-sm font-semibold text-text-base">Manage your directory</h3>
            <p className="text-xs text-muted mt-0.5">Browse and connect with your team</p>
          </div>
          <button
            onClick={() => navigate('/hub-admin/directory/browse')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-base hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] text-sm font-medium transition-colors"
          >
            Browse Directory
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* Chart */}
        <div>
          <ChartCard title="Departments" subtitle="Team members by department">
            <SimpleBarChart
              data={groupByCategory(MOCK_DIRECTORY, 'department')}
              dataKeys={['value']}
              labels={{ dataKey: 'name', value: 'Members' }}
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
