import { Inbox, Plus, BookOpen } from 'lucide-react';

/**
 * Placeholder dashboard page shared across sub-apps.
 * Renders a centered heading with "Coming soon" message and action buttons.
 */
export default function PlaceholderDashboard({ appName }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24 px-6 max-w-md mx-auto">
      <div className="w-14 h-14 rounded-2xl bg-primary-light text-primary flex items-center justify-center mb-5">
        <Inbox className="w-7 h-7" />
      </div>
      <h2 className="text-xl font-bold text-text-base">{appName} Dashboard</h2>
      <p className="text-sm text-muted mt-2">Coming soon. This section is under development.</p>
      <div className="flex items-center gap-3 mt-6">
        <button className="inline-flex items-center gap-2 px-4 h-9 rounded-base bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-hover transition-colors duration-150 ease-out">
          <Plus className="w-4 h-4" />
          Get Started
        </button>
        <button className="inline-flex items-center gap-2 px-4 h-9 rounded-base border border-border bg-surface text-text-base text-sm font-medium hover:bg-surface-raised transition-colors duration-150 ease-out">
          <BookOpen className="w-4 h-4" />
          Learn More
        </button>
      </div>
    </div>
  );
}
