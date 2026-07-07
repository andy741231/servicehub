import { useState, useEffect, useMemo } from 'react';
import { Globe, Lock, Calendar, Clock, ToggleLeft, ToggleRight, AlertCircle, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import useFormStore from '../store/formStore';
import { isOpenNow, nextTransition, formatDuration, formatDayTime } from '../utils/schedule';

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

const makeSlot = (overrides = {}) => ({
  id: `slot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  startTime: '09:00',
  endTime: '17:00',
  ...overrides,
});

// ── Presets ────────────────────────────────────────────────────────────────
// Each preset replaces the current weekly slots with a prebuilt config.
// `label` is shown on the chip; `slots` is the factory output.
const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const WEEKEND = ['saturday', 'sunday'];
const ALL_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const PRESETS = [
  {
    label: 'Business hours',
    slots: [makeSlot({ days: WEEKDAYS, startTime: '09:00', endTime: '17:00' })],
  },
  {
    label: 'Weekends',
    slots: [makeSlot({ days: WEEKEND, startTime: '09:00', endTime: '17:00' })],
  },
  {
    label: '24/7',
    slots: [makeSlot({ days: ALL_DAYS, startTime: '00:00', endTime: '23:59' })],
  },
  {
    label: 'Lunch + dinner',
    slots: [
      makeSlot({ days: WEEKDAYS, startTime: '11:00', endTime: '14:00' }),
      makeSlot({ days: WEEKDAYS, startTime: '17:00', endTime: '22:00' }),
    ],
  },
];

const DEFAULT_SCHEDULE = {
  enabled: false,
  dateRange: { enabled: false, startDate: '', endDate: '' },
  weeklyHours: { enabled: false, slots: [] },
  closedMessage: DEFAULT_CLOSED_MESSAGE,
};

function slotSummary(slot) {
  const days = (slot.days || [])
    .map((d) => DAYS.find((x) => x.value === d)?.short)
    .filter(Boolean)
    .join(', ');
  const time = slot.startTime && slot.endTime ? `${slot.startTime} – ${slot.endTime}` : '';
  return days || time ? [days, time].filter(Boolean).join('  ·  ') : 'No days or time set';
}

function validate(schedule) {
  const errors = [];
  if (!schedule.enabled) return errors;

  if (schedule.dateRange?.enabled) {
    const { startDate, endDate } = schedule.dateRange;
    if (!startDate || !endDate) errors.push('Date window: both start and end dates are required.');
    else if (startDate > endDate) errors.push('Date window: start date must be on or before end date.');
  }

  if (schedule.weeklyHours?.enabled) {
    const slots = schedule.weeklyHours.slots || [];
    if (!slots.length) errors.push('Weekly hours: add at least one time slot.');
    slots.forEach((slot, i) => {
      if (!slot.days?.length) errors.push(`Slot ${i + 1}: select at least one day.`);
      if (!slot.startTime || !slot.endTime) errors.push(`Slot ${i + 1}: open and close times are required.`);
      else if (slot.startTime >= slot.endTime) errors.push(`Slot ${i + 1}: open time must be before close time.`);
    });
  }

  if (!schedule.closedMessage?.trim()) errors.push('A "closed" message is required.');
  return errors;
}

// ── Week timeline ──────────────────────────────────────────────────────────
// Compact 7-column visual summary of the weekly open hours. Each slot
// renders as a colored bar positioned by its time range within the day.
// Overlapping slots are visible because bars are semi-transparent.
const SLOT_COLORS = [
  'bg-primary/70 border-primary',
  'bg-info/70 border-info',
  'bg-success/70 border-success',
  'bg-primary/70 border-primary',
  'bg-warning/70 border-warning',
];

function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function WeekTimeline({ slots }) {
  if (!slots?.length) return null;

  return (
    <div className="border border-border rounded-lg bg-background p-3">
      <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Week overview</p>
      <div className="flex gap-1.5">
        {DAYS.map(({ value, short }) => {
          const daySlots = slots
            .map((s, i) => ({ ...s, color: SLOT_COLORS[i % SLOT_COLORS.length] }))
            .filter((s) => (s.days || []).includes(value));
          return (
            <div key={value} className="flex-1 flex flex-col">
              <span className="text-[10px] font-semibold text-muted text-center mb-1">{short}</span>
              <div className="relative h-32 bg-surface-raised rounded border border-border overflow-hidden">
                {/* Hour gridlines at 6/12/18 */}
                {[6, 12, 18].map((h) => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 border-t border-border/60"
                    style={{ top: `${(h / 24) * 100}%` }}
                  />
                ))}
                {daySlots.map((s, idx) => {
                  const start = timeToMinutes(s.startTime);
                  const end = timeToMinutes(s.endTime);
                  const top = `${(start / 1440) * 100}%`;
                  const height = `${Math.max(((end - start) / 1440) * 100, 1.5)}%`;
                  return (
                    <div
                      key={idx}
                      className={`absolute left-0.5 right-0.5 rounded-sm border ${s.color}`}
                      style={{ top, height }}
                      title={`${s.startTime} – ${s.endTime}`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 mt-2 text-[10px] text-muted">
        <span>0:00</span>
        <span className="flex-1 text-center">12:00</span>
        <span>24:00</span>
      </div>
    </div>
  );
}

// ── Presets row ────────────────────────────────────────────────────────────
// Quick-apply chips that replace the current weekly slots with a common
// configuration. Shown only inside the Weekly hours section.
function PresetsRow({ onApply }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PRESETS.map((p) => (
        <button
          key={p.label}
          type="button"
          onClick={() => onApply(p.slots)}
          className="px-2.5 py-1 text-xs font-medium rounded-full border border-border bg-background text-muted hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

// ── Live status strip ──────────────────────────────────────────────────────
// Shows whether the form is open or closed right now, plus the next
// transition (e.g. "closes at Mon 5:00 PM — in 2h 14m"). Refreshes every
// 30s so the countdown stays reasonably fresh without thrashing renders.
function LiveStatusStrip({ schedule }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  // Recompute only when the schedule shape changes or the tick advances.
  // eslint-disable-next-line no-unused-vars
  const _ = tick;

  const open = isOpenNow(schedule);
  const transition = useMemo(() => nextTransition(schedule), [schedule]);

  if (!schedule?.enabled) return null;
  const hasConstraint = schedule.dateRange?.enabled || schedule.weeklyHours?.enabled;
  if (!hasConstraint) return null;

  const dot = open ? 'bg-success' : 'bg-danger';
  const label = open ? 'Open now' : 'Closed now';

  let detail = '';
  if (transition) {
    const verb = transition.opening ? 'Opens' : 'Closes';
    const when = formatDayTime(transition.at);
    const until = formatDuration(transition.at.getTime() - Date.now());
    detail = `${verb} ${when} — ${until}`;
  }

  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 bg-surface-raised border border-border rounded-lg">
      <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${dot} ${open ? 'animate-pulse' : ''}`} />
      <div className="flex-1 min-w-0">
        <span className="text-small font-semibold text-base-color">{label}</span>
        {detail && (
          <span className="text-xs text-muted ml-2">{detail}</span>
        )}
      </div>
    </div>
  );
}

// ── Toggle button ──────────────────────────────────────────────────────────
function Toggle({ on, onToggle, label }) {
  return (
    <button type="button" onClick={onToggle} aria-label={label} className="flex-shrink-0">
      {on
        ? <ToggleRight className="h-6 w-6 text-primary" />
        : <ToggleLeft className="h-6 w-6 text-muted" />}
    </button>
  );
}

// ── Day picker ─────────────────────────────────────────────────────────────
function DayPicker({ selected, onChange }) {
  return (
    <div className="flex gap-1">
      {DAYS.map(({ value, short }) => {
        const on = selected?.includes(value);
        return (
          <button
            key={value}
            type="button"
            onClick={() => onChange(
              on ? selected.filter((d) => d !== value) : [...(selected || []), value]
            )}
            className={`flex-1 py-1.5 rounded-md text-xs font-semibold border transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
              on ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted hover:border-primary hover:text-primary'
            }`}
            aria-pressed={on}
          >
            {short}
          </button>
        );
      })}
    </div>
  );
}

// ── Weekly slot card ───────────────────────────────────────────────────────
function SlotCard({ slot, index, onUpdate, onRemove, canRemove }) {
  const [open, setOpen] = useState(index === 0);
  return (
    <div className="border border-border rounded-lg overflow-hidden bg-background">
      {/* Header row */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span className="text-xs font-bold text-muted w-5 text-center flex-shrink-0">{index + 1}</span>
        <button className="flex-1 text-left min-w-0" onClick={() => setOpen((v) => !v)}>
          <p className="text-small font-medium text-base-color truncate">{slotSummary(slot)}</p>
        </button>
        <button
          onClick={() => setOpen((v) => !v)}
          className="p-1 text-muted hover:text-base-color rounded"
          aria-label={open ? 'Collapse slot' : 'Expand slot'}
        >
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        {canRemove && (
          <button
            onClick={onRemove}
            className="p-1 text-muted hover:text-danger rounded focus:outline-none focus:ring-2 focus:ring-danger"
            aria-label={`Remove slot ${index + 1}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Editor */}
      {open && (
        <div className="px-3 pb-3 border-t border-border space-y-3 pt-3">
          {/* Days */}
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Days</label>
            <DayPicker
              selected={slot.days}
              onChange={(days) => onUpdate({ days })}
            />
          </div>
          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Opens at</label>
              <input
                type="time"
                value={slot.startTime}
                onChange={(e) => onUpdate({ startTime: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary text-small min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Closes at</label>
              <input
                type="time"
                value={slot.endTime}
                onChange={(e) => onUpdate({ endTime: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary text-small min-h-[44px]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────
export default function AccessSchedulePanel() {
  const { currentFormId, forms, updateFormSchedule } = useFormStore();
  const currentForm = forms.find((f) => f.id === currentFormId);
  if (!currentForm) return null;

  // Merge with defaults to ensure shape is always complete
  const raw = currentForm.accessSchedule || {};
  const schedule = {
    ...DEFAULT_SCHEDULE,
    ...raw,
    dateRange:   { ...DEFAULT_SCHEDULE.dateRange,   ...(raw.dateRange   || {}) },
    weeklyHours: { ...DEFAULT_SCHEDULE.weeklyHours, ...(raw.weeklyHours || {}), slots: raw.weeklyHours?.slots || [] },
  };

  const errors = validate(schedule);
  const hasConstraints = schedule.dateRange.enabled || schedule.weeklyHours.enabled;
  const isActive = schedule.enabled && hasConstraints;
  // Master toggle is on but no sub-constraint enabled — a confusing no-op
  // state that deserves its own message rather than "Always open".
  const enabledButEmpty = schedule.enabled && !hasConstraints;

  const save = (updates) => updateFormSchedule({ ...schedule, ...updates });
  const patchDateRange = (updates) => save({ dateRange: { ...schedule.dateRange, ...updates } });
  const patchWeekly = (updates) => save({ weeklyHours: { ...schedule.weeklyHours, ...updates } });

  const addSlot = () => {
    patchWeekly({ slots: [...schedule.weeklyHours.slots, makeSlot()] });
  };

  const updateSlot = (id, patch) => {
    patchWeekly({
      slots: schedule.weeklyHours.slots.map((s) => s.id === id ? { ...s, ...patch } : s),
    });
  };

  const removeSlot = (id) => {
    patchWeekly({ slots: schedule.weeklyHours.slots.filter((s) => s.id !== id) });
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-5">

      {/* Status banner */}
      <div className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${
        isActive
          ? 'bg-warning-light border-warning/20 text-warning'
          : enabledButEmpty
            ? 'bg-warning-light border-warning/30 text-warning'
            : 'bg-success-light border-success/20 text-success'
      }`}>
        {isActive
          ? <Lock className="h-5 w-5 flex-shrink-0 mt-0.5" />
          : enabledButEmpty
            ? <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            : <Globe className="h-5 w-5 flex-shrink-0 mt-0.5" />}
        <div>
          <p className="text-small font-semibold">
            {isActive
              ? 'Access is restricted'
              : enabledButEmpty
                ? 'Schedule enabled but no restrictions set'
                : 'Always open to the public'}
          </p>
          <p className="text-xs mt-0.5 opacity-80">
            {isActive
              ? 'The form is only accessible during the windows defined below.'
              : enabledButEmpty
                ? 'Enable a date window or weekly hours below, otherwise the form stays open.'
                : 'Anyone with the link can fill out this form at any time.'}
          </p>
        </div>
      </div>

      {/* Live status — open/closed right now + next transition */}
      <LiveStatusStrip schedule={schedule} />

      {/* Validation errors */}
      {errors.length > 0 && (
        <div className="space-y-1.5">
          {errors.map((e, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2 bg-danger-light border border-danger/20 rounded-base text-xs text-danger">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              {e}
            </div>
          ))}
        </div>
      )}

      {/* Master enable */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-surface-raised border border-border rounded-lg">
        <div>
          <p className="text-small font-semibold text-base-color">Enable access schedule</p>
          <p className="text-xs text-muted mt-0.5">Restrict when this form is publicly accessible.</p>
        </div>
        <Toggle
          on={schedule.enabled}
          onToggle={() => save({ enabled: !schedule.enabled })}
          label={schedule.enabled ? 'Disable schedule' : 'Enable schedule'}
        />
      </div>

      <div className={`space-y-4 transition-opacity duration-200 ${schedule.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none select-none'}`}>
          <p className="text-xs text-muted leading-relaxed">
            All enabled constraints must be satisfied at the same time. Weekly slots within a constraint are OR'd — the form opens if any slot matches.
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
                    className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary text-small min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">To</label>
                  <input
                    type="date"
                    value={schedule.dateRange.endDate}
                    onChange={(e) => patchDateRange({ endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary text-small min-h-[44px]"
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
                <p className="text-xs text-muted mt-0.5">
                  {schedule.weeklyHours.slots.length > 0
                    ? `${schedule.weeklyHours.slots.length} slot${schedule.weeklyHours.slots.length !== 1 ? 's' : ''} defined`
                    : 'Only open on certain days & times each week'}
                </p>
              </div>
              <Toggle
                on={schedule.weeklyHours.enabled}
                onToggle={() => patchWeekly({ enabled: !schedule.weeklyHours.enabled })}
                label={schedule.weeklyHours.enabled ? 'Disable weekly hours' : 'Enable weekly hours'}
              />
            </div>

            {schedule.weeklyHours.enabled && (
              <div className="px-3 py-3 border-t border-border space-y-3">
                {/* Presets */}
                <div>
                  <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Presets</p>
                  <PresetsRow onApply={(slots) => patchWeekly({ slots })} />
                </div>

                {/* Visual week overview */}
                <WeekTimeline slots={schedule.weeklyHours.slots} />

                {/* Slot list */}
                {schedule.weeklyHours.slots.map((slot, i) => (
                  <SlotCard
                    key={slot.id}
                    slot={slot}
                    index={i}
                    canRemove={schedule.weeklyHours.slots.length > 1}
                    onUpdate={(patch) => updateSlot(slot.id, patch)}
                    onRemove={() => removeSlot(slot.id)}
                  />
                ))}

                {/* Add slot button */}
                <button
                  onClick={addSlot}
                  className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-border rounded-lg text-xs font-medium text-muted hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add time slot
                </button>
              </div>
            )}
          </div>

          {/* Closed message */}
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
              Message when closed
            </label>
            <textarea
              value={schedule.closedMessage}
              onChange={(e) => save({ closedMessage: e.target.value })}
              placeholder={DEFAULT_CLOSED_MESSAGE}
              rows={2}
              className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary text-small placeholder:text-muted resize-none"
            />
            <p className="text-xs text-muted mt-1">Shown to visitors when the form is outside the allowed window.</p>
          </div>
      </div>
    </div>
  );
}
