import { Globe, Lock, Calendar, Clock, ToggleLeft, ToggleRight, AlertCircle } from 'lucide-react';
import useFormStore from '../store/formStore';

const DAYS = [
  { value: 'monday',    short: 'Mon' },
  { value: 'tuesday',   short: 'Tue' },
  { value: 'wednesday', short: 'Wed' },
  { value: 'thursday',  short: 'Thu' },
  { value: 'friday',    short: 'Fri' },
  { value: 'saturday',  short: 'Sat' },
  { value: 'sunday',    short: 'Sun' },
];

const DEFAULT_CLOSED_MESSAGE = 'This form is currently closed. Please check back later.';

const DEFAULT_SCHEDULE = {
  enabled: false,
  dateRange: { enabled: false, startDate: '', endDate: '' },
  weeklyHours: {
    enabled: false,
    days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    startTime: '09:00',
    endTime: '17:00',
  },
  closedMessage: DEFAULT_CLOSED_MESSAGE,
};

function validate(schedule) {
  const errors = [];
  if (!schedule.enabled) return errors;

  if (schedule.dateRange?.enabled) {
    const { startDate, endDate } = schedule.dateRange;
    if (!startDate || !endDate) errors.push('Date range: both start and end dates are required.');
    else if (startDate > endDate) errors.push('Date range: start date must be on or before end date.');
  }

  if (schedule.weeklyHours?.enabled) {
    const { days, startTime, endTime } = schedule.weeklyHours;
    if (!days?.length) errors.push('Weekly hours: select at least one day.');
    if (!startTime || !endTime) errors.push('Weekly hours: both open and close times are required.');
    else if (startTime >= endTime) errors.push('Weekly hours: open time must be before close time.');
  }

  if (!schedule.closedMessage?.trim()) errors.push('A "closed" message is required.');

  return errors;
}

export default function AccessSchedulePanel() {
  const { currentFormId, forms, updateFormSchedule } = useFormStore();
  const currentForm = forms.find((f) => f.id === currentFormId);

  if (!currentForm) return null;

  const schedule = { ...DEFAULT_SCHEDULE, ...(currentForm.accessSchedule || {}) };
  // Ensure nested objects are always present
  schedule.dateRange = { ...DEFAULT_SCHEDULE.dateRange, ...(schedule.dateRange || {}) };
  schedule.weeklyHours = { ...DEFAULT_SCHEDULE.weeklyHours, ...(schedule.weeklyHours || {}) };

  const errors = validate(schedule);
  const isActive = schedule.enabled && (schedule.dateRange.enabled || schedule.weeklyHours.enabled);

  const patch = (updates) => updateFormSchedule({ ...schedule, ...updates });
  const patchDateRange = (updates) => patch({ dateRange: { ...schedule.dateRange, ...updates } });
  const patchWeekly = (updates) => patch({ weeklyHours: { ...schedule.weeklyHours, ...updates } });

  const Toggle = ({ on, onToggle, label }) => (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      className="flex-shrink-0"
    >
      {on
        ? <ToggleRight className="h-6 w-6 text-primary" />
        : <ToggleLeft className="h-6 w-6 text-muted" />}
    </button>
  );

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-5">

      {/* ── Status banner ── */}
      <div className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${
        isActive ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-green-50 border-green-200 text-green-800'
      }`}>
        {isActive ? <Lock className="h-5 w-5 flex-shrink-0 mt-0.5" /> : <Globe className="h-5 w-5 flex-shrink-0 mt-0.5" />}
        <div>
          <p className="text-small font-semibold">
            {isActive ? 'Access is restricted' : 'Always open to the public'}
          </p>
          <p className="text-xs mt-0.5 opacity-80">
            {isActive
              ? 'The form is only accessible during the windows defined below.'
              : 'Anyone with the link can fill out this form at any time.'}
          </p>
        </div>
      </div>

      {/* ── Validation errors ── */}
      {errors.length > 0 && (
        <div className="space-y-1.5">
          {errors.map((e, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-base text-xs text-red-600">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              {e}
            </div>
          ))}
        </div>
      )}

      {/* ── Master enable ── */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-surface-raised border border-border rounded-lg">
        <div>
          <p className="text-small font-semibold text-base-color">Enable access schedule</p>
          <p className="text-xs text-muted mt-0.5">
            Turn on to restrict when this form is publicly accessible.
          </p>
        </div>
        <Toggle
          on={schedule.enabled}
          onToggle={() => patch({ enabled: !schedule.enabled })}
          label={schedule.enabled ? 'Disable schedule' : 'Enable schedule'}
        />
      </div>

      {/* ── Constraints (visible only when master is on) ── */}
      {schedule.enabled && (
        <div className="space-y-4">
          <p className="text-xs text-muted">
            All enabled constraints must be met at the same time for the form to be accessible.
          </p>

          {/* ── Date window ── */}
          <div className={`border rounded-lg overflow-hidden ${schedule.dateRange.enabled ? 'border-primary' : 'border-border'}`}>
            <div className="flex items-center gap-3 px-4 py-3 bg-surface-raised">
              <Calendar className={`h-4 w-4 flex-shrink-0 ${schedule.dateRange.enabled ? 'text-primary' : 'text-muted'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-small font-semibold text-base-color">Date window</p>
                <p className="text-xs text-muted mt-0.5">Only open between two specific dates</p>
              </div>
              <Toggle
                on={schedule.dateRange.enabled}
                onToggle={() => patchDateRange({ enabled: !schedule.dateRange.enabled })}
                label={schedule.dateRange.enabled ? 'Disable date window' : 'Enable date window'}
              />
            </div>

            {schedule.dateRange.enabled && (
              <div className="px-4 py-3 border-t border-border grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">From</label>
                  <input
                    type="date"
                    value={schedule.dateRange.startDate}
                    onChange={(e) => patchDateRange({ startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary text-small min-h-[40px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">To</label>
                  <input
                    type="date"
                    value={schedule.dateRange.endDate}
                    onChange={(e) => patchDateRange({ endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary text-small min-h-[40px]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── Weekly hours ── */}
          <div className={`border rounded-lg overflow-hidden ${schedule.weeklyHours.enabled ? 'border-primary' : 'border-border'}`}>
            <div className="flex items-center gap-3 px-4 py-3 bg-surface-raised">
              <Clock className={`h-4 w-4 flex-shrink-0 ${schedule.weeklyHours.enabled ? 'text-primary' : 'text-muted'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-small font-semibold text-base-color">Weekly hours</p>
                <p className="text-xs text-muted mt-0.5">Only open on certain days &amp; times each week</p>
              </div>
              <Toggle
                on={schedule.weeklyHours.enabled}
                onToggle={() => patchWeekly({ enabled: !schedule.weeklyHours.enabled })}
                label={schedule.weeklyHours.enabled ? 'Disable weekly hours' : 'Enable weekly hours'}
              />
            </div>

            {schedule.weeklyHours.enabled && (
              <div className="px-4 py-3 border-t border-border space-y-4">
                {/* Day picker */}
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">Days open</label>
                  <div className="flex gap-1.5">
                    {DAYS.map(({ value, short }) => {
                      const on = schedule.weeklyHours.days?.includes(value);
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => patchWeekly({
                            days: on
                              ? schedule.weeklyHours.days.filter((d) => d !== value)
                              : [...(schedule.weeklyHours.days || []), value],
                          })}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                            on
                              ? 'border-primary bg-primary text-white'
                              : 'border-border bg-background text-muted hover:border-primary hover:text-primary'
                          }`}
                          aria-pressed={on}
                        >
                          {short}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time range */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Opens at</label>
                    <input
                      type="time"
                      value={schedule.weeklyHours.startTime}
                      onChange={(e) => patchWeekly({ startTime: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary text-small min-h-[40px]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Closes at</label>
                    <input
                      type="time"
                      value={schedule.weeklyHours.endTime}
                      onChange={(e) => patchWeekly({ endTime: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary text-small min-h-[40px]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Closed message ── */}
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
              Message when closed
            </label>
            <textarea
              value={schedule.closedMessage}
              onChange={(e) => patch({ closedMessage: e.target.value })}
              placeholder={DEFAULT_CLOSED_MESSAGE}
              rows={2}
              className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary text-small placeholder:text-muted resize-none"
            />
            <p className="text-xs text-muted mt-1">Shown to visitors when the form is outside the allowed window.</p>
          </div>
        </div>
      )}
    </div>
  );
}
