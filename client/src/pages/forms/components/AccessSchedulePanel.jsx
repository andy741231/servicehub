import { useState } from 'react';
import { Calendar, Clock, Plus, Trash2, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Globe, Lock } from 'lucide-react';
import useFormStore from '../store/formStore';

const DAYS = [
  { value: 'monday',    short: 'Mon', full: 'Monday' },
  { value: 'tuesday',   short: 'Tue', full: 'Tuesday' },
  { value: 'wednesday', short: 'Wed', full: 'Wednesday' },
  { value: 'thursday',  short: 'Thu', full: 'Thursday' },
  { value: 'friday',    short: 'Fri', full: 'Friday' },
  { value: 'saturday',  short: 'Sat', full: 'Saturday' },
  { value: 'sunday',    short: 'Sun', full: 'Sunday' },
];

const DEFAULT_CLOSED_MESSAGE = 'This form is currently closed. Please check back later.';

function makeRule(type = 'weekly') {
  return {
    id: `rule-${Date.now()}`,
    enabled: true,
    type,
    days: type === 'weekly' ? ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] : [],
    startTime: '09:00',
    endTime: '17:00',
    startDate: type === 'dateRange' ? new Date().toISOString().slice(0, 10) : '',
    endDate: type === 'dateRange' ? new Date(Date.now() + 86400000).toISOString().slice(0, 10) : '',
    closedMessage: DEFAULT_CLOSED_MESSAGE,
  };
}

function ruleLabel(rule) {
  if (rule.type === 'weekly') {
    const days = rule.days?.length
      ? rule.days.map((d) => DAYS.find((x) => x.value === d)?.short || d).join(', ')
      : 'No days selected';
    const time = rule.startTime && rule.endTime ? `${rule.startTime} – ${rule.endTime}` : '';
    return `${days}${time ? `  ·  ${time}` : ''}`;
  }
  if (rule.type === 'dateRange') {
    const dates = rule.startDate && rule.endDate ? `${rule.startDate} → ${rule.endDate}` : 'Date range not set';
    const time = rule.startTime && rule.endTime ? `  ·  ${rule.startTime} – ${rule.endTime}` : '';
    return `${dates}${time}`;
  }
  return 'Rule';
}

function validateRule(rule) {
  const errors = [];
  if (rule.type === 'weekly') {
    if (!rule.days?.length) errors.push('Select at least one day.');
    if (!rule.startTime || !rule.endTime) errors.push('Start and end times are required.');
    else if (rule.startTime >= rule.endTime) errors.push('Start time must be before end time.');
  } else if (rule.type === 'dateRange') {
    if (!rule.startDate || !rule.endDate) errors.push('Start and end dates are required.');
    else if (rule.startDate > rule.endDate) errors.push('Start date must be on or before end date.');
    if (rule.startDate === rule.endDate && rule.startTime && rule.endTime && rule.startTime >= rule.endTime)
      errors.push('On a single-day range, start time must be before end time.');
  }
  if (!rule.closedMessage?.trim()) errors.push('Closed message cannot be empty.');
  return errors;
}

function detectConflicts(rules) {
  const conflicts = [];
  const active = rules.filter((r) => r.enabled);
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i];
      const b = active[j];
      if (a.type === 'weekly' && b.type === 'weekly') {
        const shared = a.days.filter((d) => b.days.includes(d));
        if (shared.length) {
          const aS = a.startTime || '00:00', aE = a.endTime || '23:59';
          const bS = b.startTime || '00:00', bE = b.endTime || '23:59';
          if (aS < bE && bS < aE)
            conflicts.push(`Rule ${rules.indexOf(a) + 1} and Rule ${rules.indexOf(b) + 1} overlap on ${shared.map((d) => DAYS.find((x) => x.value === d)?.short).join(', ')}.`);
        }
      }
      if (a.type === 'dateRange' && b.type === 'dateRange') {
        if (`${a.startDate}T${a.startTime || '00:00'}` < `${b.endDate}T${b.endTime || '23:59'}` &&
            `${b.startDate}T${b.startTime || '00:00'}` < `${a.endDate}T${a.endTime || '23:59'}`)
          conflicts.push(`Rule ${rules.indexOf(a) + 1} and Rule ${rules.indexOf(b) + 1} have overlapping date ranges.`);
      }
    }
  }
  return conflicts;
}

export default function AccessSchedulePanel() {
  const { currentFormId, forms, updateFormSchedule } = useFormStore();
  const currentForm = forms.find((f) => f.id === currentFormId);
  // schedule.rules is the source of truth — no global toggle needed
  const schedule = currentForm?.accessSchedule || { rules: [] };
  const rules = schedule.rules || [];
  const [expandedId, setExpandedId] = useState(null);

  if (!currentForm) return null;

  const activeRules = rules.filter((r) => r.enabled);
  const isRestricted = activeRules.length > 0;
  const conflicts = detectConflicts(rules);

  const save = (newRules) => {
    updateFormSchedule({ rules: newRules });
  };

  const updateRule = (id, patch) => {
    save(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const addRule = (type) => {
    const r = makeRule(type);
    save([...rules, r]);
    setExpandedId(r.id);
  };

  const removeRule = (id) => {
    save(rules.filter((r) => r.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-5">

      {/* Status banner */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${
        isRestricted
          ? 'bg-amber-50 border-amber-200 text-amber-800'
          : 'bg-green-50 border-green-200 text-green-800'
      }`}>
        {isRestricted
          ? <Lock className="h-5 w-5 flex-shrink-0" />
          : <Globe className="h-5 w-5 flex-shrink-0" />
        }
        <div>
          <p className="text-small font-semibold">
            {isRestricted ? 'Access restricted by schedule' : 'Always open to the public'}
          </p>
          <p className="text-xs mt-0.5 opacity-80">
            {isRestricted
              ? `Visitors can only submit during the ${activeRules.length} active window${activeRules.length > 1 ? 's' : ''} below.`
              : 'Anyone with the link can fill out this form at any time. Add a window below to restrict access.'}
          </p>
        </div>
      </div>

      {/* Conflict warnings */}
      {conflicts.length > 0 && (
        <div className="space-y-1.5">
          {conflicts.map((msg, i) => (
            <div key={i} className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-base text-xs text-red-600">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{msg}</span>
            </div>
          ))}
        </div>
      )}

      {/* Rule list */}
      {rules.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider">Open windows</p>
          {rules.map((rule, idx) => {
            const errs = validateRule(rule);
            const isExpanded = expandedId === rule.id;
            const hasErrors = errs.length > 0;

            return (
              <div
                key={rule.id}
                className={`border rounded-base bg-background ${
                  isExpanded ? 'border-primary shadow-sm' : hasErrors && rule.enabled ? 'border-red-300' : 'border-border'
                }`}
              >
                {/* Row */}
                <div className="flex items-center gap-2 px-3 py-2.5">
                  {/* Enabled checkbox */}
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={(e) => updateRule(rule.id, { enabled: e.target.checked })}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary flex-shrink-0"
                    aria-label={rule.enabled ? 'Disable this window' : 'Enable this window'}
                    title={rule.enabled ? 'Window is active — uncheck to pause' : 'Window is paused — check to activate'}
                  />

                  {/* Summary — click to expand */}
                  <button
                    className="flex-1 text-left min-w-0"
                    onClick={() => setExpandedId(isExpanded ? null : rule.id)}
                  >
                    <p className={`text-small font-medium truncate ${rule.enabled ? 'text-base-color' : 'text-muted line-through'}`}>
                      {rule.type === 'weekly' ? 'Weekly' : 'Date range'}
                    </p>
                    <p className="text-xs text-muted truncate mt-0.5">{ruleLabel(rule)}</p>
                  </button>

                  {/* Valid/error indicator */}
                  {rule.enabled && (
                    hasErrors
                      ? <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" title="Fix errors in this rule" />
                      : <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" title="Rule is valid" />
                  )}

                  {/* Expand chevron */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : rule.id)}
                    className="p-1 text-muted hover:text-base-color rounded"
                    aria-label={isExpanded ? 'Collapse' : 'Edit rule'}
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => removeRule(rule.id)}
                    className="p-1 text-muted hover:text-red-500 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                    aria-label={`Remove window ${idx + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Editor */}
                {isExpanded && (
                  <div className="px-3 pb-4 pt-1 border-t border-border space-y-4">

                    {/* Validation errors */}
                    {hasErrors && (
                      <ul className="space-y-1">
                        {errs.map((e, i) => (
                          <li key={i} className="flex items-center gap-1.5 text-xs text-red-600">
                            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />{e}
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Type toggle */}
                    <div>
                      <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">Type</label>
                      <div className="flex gap-2">
                        {[
                          { value: 'weekly',    label: 'Weekly repeat' },
                          { value: 'dateRange', label: 'Specific dates' },
                        ].map(({ value, label }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => updateRule(rule.id, {
                              type: value,
                              days: value === 'weekly' ? ['monday','tuesday','wednesday','thursday','friday'] : [],
                              startDate: value === 'dateRange' ? new Date().toISOString().slice(0, 10) : '',
                              endDate: value === 'dateRange' ? new Date(Date.now() + 86400000).toISOString().slice(0, 10) : '',
                            })}
                            className={`flex-1 py-2 rounded-lg border text-small font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                              rule.type === value
                                ? 'border-primary bg-primary-light text-primary'
                                : 'border-border bg-background text-muted hover:border-primary hover:text-primary'
                            }`}
                            aria-pressed={rule.type === value}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Weekly: day picker */}
                    {rule.type === 'weekly' && (
                      <div>
                        <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">Days</label>
                        <div className="flex gap-1.5 flex-wrap">
                          {DAYS.map(({ value, short }) => {
                            const on = rule.days?.includes(value);
                            return (
                              <button
                                key={value}
                                type="button"
                                onClick={() => updateRule(rule.id, {
                                  days: on
                                    ? rule.days.filter((d) => d !== value)
                                    : [...(rule.days || []), value],
                                })}
                                className={`w-10 py-1.5 rounded-lg text-xs font-semibold border transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                                  on ? 'border-primary bg-primary text-white' : 'border-border bg-background text-muted hover:border-primary hover:text-primary'
                                }`}
                                aria-pressed={on}
                              >
                                {short}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Date range: dates */}
                    {rule.type === 'dateRange' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">From</label>
                          <input
                            type="date"
                            value={rule.startDate || ''}
                            onChange={(e) => updateRule(rule.id, { startDate: e.target.value })}
                            className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary text-small min-h-[44px]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">To</label>
                          <input
                            type="date"
                            value={rule.endDate || ''}
                            onChange={(e) => updateRule(rule.id, { endDate: e.target.value })}
                            className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary text-small min-h-[44px]"
                          />
                        </div>
                      </div>
                    )}

                    {/* Time range */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                          <Clock className="inline h-3 w-3 mr-0.5" />Opens
                        </label>
                        <input
                          type="time"
                          value={rule.startTime || ''}
                          onChange={(e) => updateRule(rule.id, { startTime: e.target.value })}
                          className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary text-small min-h-[44px]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                          <Clock className="inline h-3 w-3 mr-0.5" />Closes
                        </label>
                        <input
                          type="time"
                          value={rule.endTime || ''}
                          onChange={(e) => updateRule(rule.id, { endTime: e.target.value })}
                          className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary text-small min-h-[44px]"
                        />
                      </div>
                    </div>

                    {/* Closed message */}
                    <div>
                      <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                        Message when closed
                      </label>
                      <textarea
                        value={rule.closedMessage || ''}
                        onChange={(e) => updateRule(rule.id, { closedMessage: e.target.value })}
                        placeholder={DEFAULT_CLOSED_MESSAGE}
                        rows={2}
                        className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary text-small placeholder:text-muted resize-none"
                      />
                      <p className="text-xs text-muted mt-1">Shown to visitors when the form is outside this window.</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add rule */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted uppercase tracking-wider">Add open window</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => addRule('weekly')}
            className="flex flex-col items-center gap-1.5 px-3 py-3 border border-dashed border-border rounded-base text-small text-muted hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
          >
            <Clock className="h-4 w-4" />
            <span className="text-xs font-medium">Weekly</span>
            <span className="text-xs opacity-60">e.g. Mon–Fri 9–5</span>
          </button>
          <button
            onClick={() => addRule('dateRange')}
            className="flex flex-col items-center gap-1.5 px-3 py-3 border border-dashed border-border rounded-base text-small text-muted hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
          >
            <Calendar className="h-4 w-4" />
            <span className="text-xs font-medium">Date range</span>
            <span className="text-xs opacity-60">e.g. Jul 4 – Jul 5</span>
          </button>
        </div>
      </div>

    </div>
  );
}
