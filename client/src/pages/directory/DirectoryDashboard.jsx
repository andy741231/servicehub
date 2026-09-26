import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, Users, MapPin, Search, ArrowRight, UserPlus, UserCheck, IdCard, Clock,
} from 'lucide-react';
import EmptyState from '../../components/EmptyState';
import { SkeletonStatCard } from '../../components/Skeleton';
import { ChartCard, SimpleBarChart, useChartColors } from '../../components/charts';
import { fetchDirectoryStats } from './api/directoryApi';
import useDirectoryStore from './store/directoryStore';
import { fullName, initials, statusLabel, statusChipCls } from './utils/memberUtils';

const STAFF = ['helper', 'approver', 'admin'];
const APPROVER_UP = ['approver', 'admin'];

export default function DirectoryDashboard() {
  const navigate = useNavigate();
  const cc = useChartColors();
  const { meta, loadMeta } = useDirectoryStore();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => { loadMeta(); }, [loadMeta]);

  useEffect(() => {
    fetchDirectoryStats()
      .then(setStats)
      .catch((err) => setError(err.response?.data?.error || 'Failed to load directory stats'));
  }, []);

  const isStaff = STAFF.includes(meta?.myRole);
  const canActivate = APPROVER_UP.includes(meta?.myRole);

  if (error) {
    return (
      <div className="bg-background min-h-screen">
        <div className="max-w-7xl mx-auto p-6 lg:p-8">
          <EmptyState
            title="Directory unavailable"
            description={error}
            icon={BookOpen}
            primaryLabel="Retry"
            primaryAction={() => window.location.reload()}
          />
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-background min-h-screen">
        <div className="max-w-7xl mx-auto p-6 lg:p-8">
          <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  const chartData = stats.byDistrict.map((d) => ({ name: d.name, value: d.count }));

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        {/* Bento stats grid */}
        <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-fr">
          {/* Hero: Active saints */}
          <div className="col-span-2 row-span-1 min-h-[132px] rounded-2xl p-5 text-primary-foreground bg-primary relative overflow-hidden shadow-card flex flex-col">
            <div className="absolute top-4 right-4 w-9 h-9 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
            <div className="text-sm text-primary-foreground/75 mb-1">Active Saints</div>
            <div className="text-4xl font-bold tracking-tight">{stats.totalActive}</div>
            <div className="mt-auto flex items-center gap-1.5 text-sm font-semibold">
              <MapPin className="h-3.5 w-3.5" />
              {stats.districtsCovered} districts represented
            </div>
          </div>

          {/* My district */}
          <div className="min-h-[132px] rounded-2xl p-5 bg-surface border border-border-soft shadow-card-sm flex flex-col">
            <div className="flex items-start justify-between mb-1">
              <div className="text-sm text-muted">My District</div>
              <div className="w-8 h-8 rounded-lg bg-primary-light text-primary flex items-center justify-center">
                <MapPin className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold tracking-tight text-text-base truncate">
              {stats.myDistrict || '—'}
            </div>
            <div className="mt-auto text-sm text-muted">{meta?.myRole ? `${meta.myRole} role` : ''}</div>
          </div>

          {/* Pending activations */}
          <div className="min-h-[132px] rounded-2xl p-5 bg-surface border border-border-soft shadow-card-sm flex flex-col">
            <div className="flex items-start justify-between mb-1">
              <div className="text-sm text-muted">Pending</div>
              <div className="w-8 h-8 rounded-lg bg-warning-light text-warning flex items-center justify-center">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-bold tracking-tight text-text-base">
              {isStaff ? stats.pendingCount : '—'}
            </div>
            <div className="mt-auto text-sm text-muted">
              {isStaff ? 'awaiting activation' : 'visible to helpers'}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="col-span-2 min-h-[132px] rounded-2xl p-4 bg-surface border border-border-soft shadow-card-sm">
            <div className="text-sm font-semibold mb-2.5">Quick Actions</div>
            <div className="grid grid-cols-2 gap-2.5">
              <QuickAction icon={Search} label="Browse" desc="Find saints" color="primary" onClick={() => navigate('/hub-admin/directory/browse')} />
              <QuickAction icon={IdCard} label="My Profile" desc="Update your info" color="secondary" onClick={() => navigate('/hub-admin/directory/me')} />
              {isStaff && (
                <QuickAction icon={UserPlus} label="Add Member" desc="New saint" color="secondary" onClick={() => navigate('/hub-admin/directory/browse?view=table&add=1')} />
              )}
              {canActivate && (
                <QuickAction icon={UserCheck} label="Review Pending" desc={`${stats.pendingCount} waiting`} color="secondary" onClick={() => navigate('/hub-admin/directory/browse?view=table&status=pending')} />
              )}
            </div>
          </div>

          {/* Recently added / pending */}
          <div className="col-span-2 min-h-[132px] rounded-2xl p-5 bg-surface border border-border-soft shadow-card-sm flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-text-base">
                {isStaff && stats.pending?.length ? 'Pending activation' : 'Recently added'}
              </div>
              <button
                onClick={() => navigate(isStaff ? '/hub-admin/directory/browse?view=table' : '/hub-admin/directory/browse')}
                className="text-xs font-medium text-primary hover:text-primary-hover transition-colors"
              >
                View all
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
              {(isStaff && stats.pending?.length ? stats.pending : stats.recentlyAdded).slice(0, 4).map((person) => (
                <div
                  key={person.id}
                  className="p-3 rounded-xl bg-surface-raised border border-border-soft hover:border-primary transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {person.photoUrl ? (
                      <img src={person.photoUrl} alt={fullName(person)} className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                        {initials(person)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-base truncate">{fullName(person)}</p>
                      <p className="text-xs text-muted truncate">{person.district}</p>
                    </div>
                    {person.status !== 'active' && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusChipCls(person.status)}`}>
                        {statusLabel(person.status)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {stats.recentlyAdded.length === 0 && stats.pending?.length === 0 && (
                <p className="text-sm text-muted col-span-2">No members yet — add the first saint to get started.</p>
              )}
            </div>
          </div>
        </div>

        {/* Manage CTA */}
        <div className="mb-6 flex items-center justify-between p-4 rounded-xl bg-surface border border-border-soft">
          <div>
            <h3 className="text-sm font-semibold text-text-base">Church phone list</h3>
            <p className="text-xs text-muted mt-0.5">Look up saints for fellowship</p>
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
          <ChartCard title="Districts" subtitle="Active saints by district">
            <SimpleBarChart
              data={chartData}
              dataKeys={['value']}
              labels={{ dataKey: 'name', value: 'Saints' }}
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
