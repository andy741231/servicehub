import { useState } from 'react';
import { Calendar, Clock, Plus, Trash2, ToggleLeft, ToggleRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import useFormStore from '../store/formStore';

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Mon' },
  { value: 'tuesday', label: 'Tue' },
  { value: 'wednesday', label: 'Wed' },
  { value: 'thursday', label: 'Thu' },
  { value: 'friday', label: 'Fri' },
  { value: 'saturday', label: 'Sat' },
  { value: 'sunday', label: 'Sun' },
];

const DEFAULT_CLOSED_MESSAGE = 'This form is currently closed. Please check back later.';

function makeRule(type = 'weekly') {
  return {
    id: `rule-${Date.now()}`,
    enabled: true,
    type,
    // weekly
    days: type === 'weekly' ? ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] : [],
    startTime: '09:00',
    endTime: '17:00',
    // dateRange
    startDate: type === 'dateRange' ? new Date().toISOString().slice(0, 10) : '',
    endDate: type === 'dateRange' ? new Date(Date.now() + 86400000).toISOString().slice(0, 10) : '',
    closedMessage: DEFAULT_CLOSED_MESSAGE,
  };
}

// Returns an array of validation errors for a single rule
function validateRule(rule, allRules) {
  const errors = [];

  if (rule.type === 'weekly') {
    if (!rule.days || rule.days.length === 0) {
      errors.push('Select at least one day.');
    }
    if (!rule.startTime || !rule.endTime) {
      errors.push('Start and end times are required.');
    } else if (rule.startTime >= rule.endTime) {
      errors.push('Start time must be before end time.');
    }
  } else if (rule.type === 'dateRange') {
    if (!rule.startDate || !rule.endDate) {
      errors.push('Start and end dates are required.');
    } else if (rule.startDate > rule.endDate) {
      errors.push('Start date must be on or before end date.');
    }
    if (rule.startDate === rule.endDate && rule.startTime && rule.endTime && rule.startTime >= rule.endTime) {
      errors.push('On single-day ranges, start time must be before end time.');
    }
  }

  if (!rule.closedMessage?.trim()) {
    errors.push('A closed message is required.');
  }

  return errors;
}

// Detect schedule conflicts between two enabled rules
function detectConflicts(rules) {
  const conflicts = [];
  const enabled = rules.filter((r) => r.enabled);

  for (let i = 0; i < enabled.length; i++) {
    for (let j = i + 1; j < enabled.length; j++) {
      const a = enabled[i];
      const b = enabled[j];
      // Two weekly rules conflict if they share a day AND time ranges overlap
      if (a.type === 'weekly' && b.type === 'weekly') {
        const sharedDays = a.days.filter((d) => b.days.includes(d));
        if (sharedDays.length > 0) {
          const aStart = a.startTime || '00:00';
          const aEnd = a.endTime || '23:59';
          const bStart = b.startTime || '00:00';
          const bEnd = b.endTime || '23:59';
          const overlap = aStart < bEnd && bStart < aEnd;
          if (overlap) {
            conflicts.push(`Rules ${rules.indexOf(a) + 1} and ${rules.indexOf(b) + 1} overlap on ${sharedDays.join(', ')} during ${aStart}–${aEnd} / ${bStart}–${bEnd}.`);
          }
        }
      }
      // Two date-range rules conflict if date+time ranges overlap
      if (a.type === 'dateRange' && b.type === 'dateRange') {
        const aStartDt = `${a.startDate}T${a.startTime || '00:00'}`;
        const aEndDt = `${a.endDate}T${a.endTime || '23:59'}`;
        const bStartDt = `${b.startDate}T${b.startTime || '00:00'}`;
        const bEndDt = `${b.endDate}T${b.endTime || '23:59'}`;
        if (aStartDt < bEndDt && bStartDt < aEndDt) {
          conflicts.push(`Rules ${rules.indexOf(a) + 1} and ${rules.indexOf(b) + 1} have overlapping date ranges.`);
        }
      }
    }
  }
  return conflicts;
}

export default function AccessSchedulePanel() {
  const { currentFormId, forms, updateFormSchedule } = useFormStore();
  const currentForm = forms.find((f) => f.id === currentFormId);
  const schedule = currentForm?.accessSchedule || { enabled: false, rules: [] };
  const [expandedId, setExpandedId] = useState(null);

  if (!currentForm) return null;

  const rules = schedule.rules || [];
  const conflicts = detectConflicts(rules);

  const update = (patch) => {
    updateFormSchedule({ ...schedule, ...patch });
  };

  const updateRule = (id, patch) => {
    update({ rules: rules.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  };

  const addRule = (type) => {
    const newRule = makeRule(type);
    update({ rules: [...rules, newRule] });
    setExpandedId(newRule.id);
  };

  const removeRule = (id) => {
    update({ rules: rules.filter((r) => r.id !== id) });
    if (expandedId === id) setExpandedId(null);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">

      {/* Global toggle */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-body font-semibold text-base">Public Access Schedule</h3>
            <p className="text-small text-muted mt-0.5">
              Restrict when this form is publicly accessible.
            </p>
          </div>
          <button
            onClick={() => update({ enabled: !schedule.enabled })}
            className="flex-shrink-0"
            aria-label={schedule.enabled ? 'Disable schedule' : 'Enable schedule'}
          >
            {schedule.enabled ? (
              <ToggleRight className="h-7 w-7 text-primary" />
            ) : (
              <ToggleLeft className="h-7 w-7 text-muted" />
            )}
          </button>
        </div>
        {schedule.enabled && rules.length === 0 && (
          <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-base text-small text-amber-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>No rules defined. The form will remain open until you add a rule.</span>
          </div>
        )}
      </section>

      {/* Conflict warnings */}
      {conflicts.length > 0 && (
        <section className="space-y-1.5">
          {conflicts.map((msg, i) => (
            <div key={i} className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-base text-small text-red-600">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{msg}</span>
            </div>
          ))}
        </section>
      )}

      {/* Rules list */}
      {rules.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-small font-semibold text-muted uppercase tracking-wide">Rules</h4>
          {rules.map((rule, idx) => {
            const ruleErrors = validateRule(rule, rules);
            const isExpanded = expandedId === rule.id;
            const hasErrors = ruleErrors.length > 0;

            return (
              <div
                key={rule.id}
                className={`border rounded-base bg-background transition-shadow ${isExpanded ? 'shadow-sm border-primary' : hasErrors ? 'border-red-300' : 'border-border'}`}
              >
                {/* Rule header */}
                <div className="flex items-center gap-2 px-3 py-2.5">
                  {/* Enable toggle */}
                  <button
                    onClick={() => updateRule(rule.id, { enabled: !rule.enabled })}
                    className="flex-shrink-0"
                    aria-label={rule.enabled ? 'Disable rule' : 'Enable rule'}
                  >
                    {rule.enabled ? (
                      <ToggleRight className="h-5 w-5 text-primary" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-muted" />
                    )}
                  </button>

                  {/* Summary */}
                  <button
                    className="flex-1 text-left min-w-0"
                    onClick={() => setExpandedId(isExpanded ? null : rule.id)}
                  >
                    <p className="text-small font-medium text-base-color truncate">
                      Rule {idx + 1}: {rule.type === 'weekly' ? 'Weekly' : 'Date Range'}
                    </p>
                    <p className="text-xs text-muted truncate mt-0.5">
                      {rule.type === 'weekly'
                        ? `${rule.days?.length ? rule.days.map((d) => d.slice(0, 3)).join(', ') : 'No days'} · ${rule.startTime || '--:--'} – ${rule.endTime || '--:--'}`
                        : `${rule.startDate || '—'} to ${rule.endDate || '—'}${rule.startTime && rule.endTime ? ` · ${rule.startTime} – ${rule.endTime}` : ''}`}
                    </p>
                  </button>

                  {/* Status indicator */}
                  {hasErrors ? (
                    <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" title="Rule has errors" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" title="Rule is valid" />
                  )}

                  {/* Delete */}
                  <button
                    onClick={() => removeRule(rule.id)}
                    className="p-1 text-muted hover:text-red-500 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                    aria-label={`Delete rule ${idx + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Rule editor (expanded) */}
                {isExpanded && (
                  <div className="px-3 pb-4 pt-1 border-t border-border space-y-4">

                    {/* Inline errors */}
                    {hasErrors && (
                      <ul className="space-y-1">
                        {ruleErrors.map((e, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-red-600">
                            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                            {e}
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Rule type */}
                    <div>
                      <label className="block text-small font-medium text-base mb-1.5">Rule Type</label>
                      <div className="flex gap-2">
                        {['weekly', 'dateRange'].map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => updateRule(rule.id, { type: t, days: t === 'weekly' ? ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] : [], startDate: t === 'dateRange' ? new Date().toISOString().slice(0, 10) : '', endDate: t === 'dateRange' ? new Date(Date.now() + 86400000).toISOString().slice(0, 10) : '' })}
                            className={`flex-1 py-2 rounded-lg border text-small font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${rule.type === t ? 'border-primary bg-primary-light text-primary' : 'border-border bg-background text-muted hover:border-primary hover:text-primary'}`}
                            aria-pressed={rule.type === t}
                          >
                            {t === 'weekly' ? 'Weekly' : 'Date Range'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Weekly: days */}
                    {rule.type === 'weekly' && (
                      <div>
                        <label className="block text-small font-medium text-base mb-2">Days</label>
                        <div className="flex flex-wrap gap-1.5">
                          {DAYS_OF_WEEK.map(({ value, label }) => {
                            const selected = rule.days?.includes(value);
                            return (
                              <button
                                key={value}
                                type="button"
                                onClick={() => {
                                  const days = selected
                                    ? rule.days.filter((d) => d !== value)
                                    : [...(rule.days || []), value];
                                  updateRule(rule.id, { days });
                                }}
                                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${selected ? 'border-primary bg-primary text-white' : 'border-border bg-background text-muted hover:border-primary hover:text-primary'}`}
                                aria-pressed={selected}
                              >
                                {label}
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
                          <label className="block text-small font-medium text-base mb-1.5">Start Date</label>
                          <input
                            type="date"
                            value={rule.startDate || ''}
                            onChange={(e) => updateRule(rule.id, { startDate: e.target.value })}
                            className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary text-body min-h-[44px]"
                          />
                        </div>
                        <div>
                          <label className="block text-small font-medium text-base mb-1.5">End Date</label>
                          <input
                            type="date"
                            value={rule.endDate || ''}
                            onChange={(e) => updateRule(rule.id, { endDate: e.target.value })}
                            className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary text-body min-h-[44px]"
                          />
                        </div>
                      </div>
                    )}

                    {/* Time range */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-small font-medium text-base mb-1.5">
                          <Clock className="inline h-3.5 w-3.5 mr-1" />
                          Start Time
                        </label>
                        <input
                          type="time"
                          value={rule.startTime || ''}
                          onChange={(e) => updateRule(rule.id, { startTime: e.target.value })}
                          className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary text-body min-h-[44px]"
                        />
                      </div>
                      <div>
                        <label className="block text-small font-medium text-base mb-1.5">
                          <Clock className="inline h-3.5 w-3.5 mr-1" />
                          End Time
                        </label>
                        <input
                          type="time"
                          value={rule.endTime || ''}
                          onChange={(e) => updateRule(rule.id, { endTime: e.target.value })}
                          className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary text-body min-h-[44px]"
                        />
                      </div>
                    </div>

                    {/* Closed message */}
                    <div>
                      <label className="block text-small font-medium text-base mb-1.5">
                        Closed Message
                      </label>
                      <textarea
                        value={rule.closedMessage || ''}
                        onChange={(e) => updateRule(rule.id, { closedMessage: e.target.value })}
                        placeholder={DEFAULT_CLOSED_MESSAGE}
                        rows={2}
                        className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary text-body placeholder:text-muted resize-none"
                      />
                      <p className="text-xs text-muted mt-1">
                        Shown to visitors when this rule is active and the form is closed.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {/* Add rule buttons */}
      <section className="space-y-2">
        <h4 className="text-small font-semibold text-muted uppercase tracking-wide">Add Rule</h4>
        <button
          onClick={() => addRule('weekly')}
          className="w-full flex items-center gap-2 px-3 py-2.5 border border-dashed border-border rounded-base text-small text-muted hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
        >
          <Plus className="h-4 w-4" />
          Weekly schedule (e.g. Mon–Fri 9am–5pm)
        </button>
        <button
          onClick={() => addRule('dateRange')}
          className="w-full flex items-center gap-2 px-3 py-2.5 border border-dashed border-border rounded-base text-small text-muted hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
        >
          <Calendar className="h-4 w-4" />
          Date range (e.g. Jul 4–Jul 5, 2026)
        </button>
      </section>
    </div>
  );
}
