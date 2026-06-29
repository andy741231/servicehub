import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BarChart3, ArrowLeft, Calendar, TrendingUp, CheckCircle, AlertCircle, MousePointer } from 'lucide-react';
import useFormStore from './store/formStore';

function SimpleLineChart({ data, color }) {
  if (data.length === 0) return null;

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const width = 600;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 40, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const xStep = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth;
  const points = data.map((d, i) => ({
    x: padding.left + i * xStep,
    y: padding.top + chartHeight - (d.value / maxValue) * chartHeight,
    label: d.label,
    value: d.value,
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-64">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
        <line
          key={ratio}
          x1={padding.left}
          y1={padding.top + chartHeight - ratio * chartHeight}
          x2={padding.left + chartWidth}
          y2={padding.top + chartHeight - ratio * chartHeight}
          stroke="#e5e7eb"
          strokeDasharray="4"
        />
      ))}
      {/* Line */}
      <path d={pathD} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      {/* Points */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={5} fill={color} stroke="white" strokeWidth={2} />
          <text
            x={p.x}
            y={height - 10}
            textAnchor="middle"
            className="text-xs fill-gray-500"
          >
            {p.label}
          </text>
          {p.value > 0 && (
            <text
              x={p.x}
              y={p.y - 10}
              textAnchor="middle"
              className="text-xs font-medium"
              fill={color}
            >
              {p.value}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

export default function FormAnalytics() {
  const { formId } = useParams();
  const navigate = useNavigate();
  const { forms, submissions } = useFormStore();
  const [range, setRange] = useState(7);
  const [selectedFormId, setSelectedFormId] = useState(formId || 'all');

  const form = forms.find((f) => f.id === selectedFormId);
  const formSubmissions = useMemo(() => {
    if (selectedFormId === 'all') return submissions;
    return submissions.filter((s) => s.formId === selectedFormId);
  }, [submissions, selectedFormId]);

  const today = new Date();
  const chartData = useMemo(() => {
    const data = [];
    for (let i = range - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateString = date.toDateString();
      const value = formSubmissions.filter(
        (s) => new Date(s.submittedAt).toDateString() === dateString
      ).length;
      data.push({
        label: `${date.getMonth() + 1}/${date.getDate()}`,
        value,
      });
    }
    return data;
  }, [formSubmissions, range, today]);

  const totalSubmissions = formSubmissions.length;
  const todaySubmissions = formSubmissions.filter(
    (s) => new Date(s.submittedAt).toDateString() === today.toDateString()
  ).length;
  const weekSubmissions = formSubmissions.filter((s) => {
    const subDate = new Date(s.submittedAt);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    return subDate >= weekAgo;
  }).length;
  const averagePerDay = range > 0 ? (chartData.reduce((a, b) => a + b.value, 0) / range).toFixed(1) : '0';

  const fieldCompletion = useMemo(() => {
    if (!form || formSubmissions.length === 0) return [];

    return form.fields
      .filter((field) => field.type !== 'content' && field.type !== 'pageBreak')
      .map((field) => {
        const answered = formSubmissions.filter((s) => {
          const value = s.data[field.label || field.id];
          return value !== undefined && value !== '' && value !== null && (!Array.isArray(value) || value.length > 0);
        }).length;
        return {
          label: field.label || field.id,
          answered,
          total: formSubmissions.length,
          rate: Math.round((answered / formSubmissions.length) * 100),
        };
      })
      .sort((a, b) => a.rate - b.rate);
  }, [form, formSubmissions]);

  const primaryColor = form?.theme?.primaryColor || '#2563eb';

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={() => navigate('/hub-admin/forms')}
                className="p-2 text-subtle hover:text-muted hover:bg-surface-raised rounded focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-w-[36px] min-h-[36px] transition-colors duration-150"
                aria-label="Back to forms"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <h1 className="text-2xl font-bold text-base">Form Analytics</h1>
            </div>
            <p className="text-body text-muted">
              Track form performance and submission trends
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="relative min-w-[240px]">
            <BarChart3 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle" />
            <select
              value={selectedFormId}
              onChange={(e) => setSelectedFormId(e.target.value)}
              className="w-full pl-10 pr-8 py-2 bg-surface border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body min-h-[44px] appearance-none cursor-pointer"
              aria-label="Select form"
            >
              <option value="all">All Forms</option>
              {forms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-surface border border-border rounded-base p-1">
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                onClick={() => setRange(days)}
                className={`px-3 py-2 rounded text-body text-small transition-colors duration-150 ${
                  range === days
                    ? 'bg-primary text-white'
                    : 'hover:bg-surface-raised text-muted'
                }`}
              >
                {days} days
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-surface-raised border border-border rounded-base p-4">
            <div className="flex items-center gap-2 text-small text-muted mb-1">
              <BarChart3 className="h-4 w-4" />
              Total Submissions
            </div>
            <div className="text-2xl font-bold text-base">{totalSubmissions}</div>
          </div>
          <div className="bg-surface-raised border border-border rounded-base p-4">
            <div className="flex items-center gap-2 text-small text-muted mb-1">
              <Calendar className="h-4 w-4" />
              Today
            </div>
            <div className="text-2xl font-bold text-base">{todaySubmissions}</div>
          </div>
          <div className="bg-surface-raised border border-border rounded-base p-4">
            <div className="flex items-center gap-2 text-small text-muted mb-1">
              <TrendingUp className="h-4 w-4" />
              This Week
            </div>
            <div className="text-2xl font-bold text-base">{weekSubmissions}</div>
          </div>
          <div className="bg-surface-raised border border-border rounded-base p-4">
            <div className="flex items-center gap-2 text-small text-muted mb-1">
              <MousePointer className="h-4 w-4" />
              Avg/Day ({range}d)
            </div>
            <div className="text-2xl font-bold text-base">{averagePerDay}</div>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-surface-raised border border-border rounded-base p-6 mb-6">
          <h2 className="text-lg font-bold text-base mb-4">Submissions Over Time</h2>
          {totalSubmissions === 0 ? (
            <div className="text-center py-12 text-body text-muted">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 text-subtle" />
              No submissions yet for the selected period
            </div>
          ) : (
            <SimpleLineChart data={chartData} color={primaryColor} />
          )}
        </div>

        {/* Field Completion */}
        {form && (
          <div className="bg-surface-raised border border-border rounded-base p-6">
            <h2 className="text-lg font-bold text-base mb-4">Field Completion Rates</h2>
            {fieldCompletion.length === 0 ? (
              <div className="text-center py-8 text-body text-muted">
                No field data available yet
              </div>
            ) : (
              <div className="space-y-4">
                {fieldCompletion.map((field) => (
                  <div key={field.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-body text-base">{field.label}</span>
                      <span className="text-small text-muted">
                        {field.answered} of {field.total} ({field.rate}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-surface rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all duration-300"
                        style={{ width: `${field.rate}%`, backgroundColor: primaryColor }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!form && selectedFormId !== 'all' && (
          <div className="text-center py-12 text-body text-muted">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 text-subtle" />
            Select a form to see field-level analytics
          </div>
        )}
      </div>
    </div>
  );
}
