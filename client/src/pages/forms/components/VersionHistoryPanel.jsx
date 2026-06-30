import { useEffect, useState, useCallback } from 'react';
import { History, RotateCcw, User, Clock, ChevronDown, ChevronUp, X, RefreshCw, AlertCircle } from 'lucide-react';
import useFormStore from '../store/formStore';

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    + ' at '
    + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export default function VersionHistoryPanel({ formId, onClose, onRestored }) {
  const { formVersions, versionsLoading, versionsError, loadVersions, restoreVersion } = useFormStore();
  const [expandedId, setExpandedId] = useState(null);
  const [restoringId, setRestoringId] = useState(null);
  const [restoreError, setRestoreError] = useState(null);

  const refresh = useCallback(() => {
    if (formId) loadVersions(formId);
  }, [formId, loadVersions]);

  // Fetch whenever formId changes or panel first mounts
  useEffect(() => { refresh(); }, [refresh]);

  const handleRestore = async (versionId) => {
    setRestoreError(null);
    setRestoringId(versionId);
    try {
      const form = await restoreVersion(formId, versionId);
      if (onRestored) onRestored(form);
    } catch (e) {
      setRestoreError('Failed to restore version. Please try again.');
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-surface">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-base-color">Version History</h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={refresh}
            disabled={versionsLoading}
            className="p-1.5 text-muted hover:text-base-color hover:bg-surface-raised rounded focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-40"
            aria-label="Refresh version history"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${versionsLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-muted hover:text-base-color hover:bg-surface-raised rounded focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Close version history"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4">
        {versionsLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        )}

        {!versionsLoading && versionsError && (
          <div className="flex flex-col items-center py-12 text-center gap-3">
            <AlertCircle className="h-10 w-10 text-red-400" />
            <p className="text-small text-red-600">{versionsError}</p>
            <button
              onClick={refresh}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-base hover:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Try again
            </button>
          </div>
        )}

        {!versionsLoading && !versionsError && formVersions.length === 0 && (
          <div className="text-center py-12">
            <History className="h-10 w-10 text-muted mx-auto mb-3" />
            <p className="text-body text-muted">No saved versions yet.</p>
            <p className="text-small text-muted mt-1">Save the form to create a version.</p>
          </div>
        )}

        {(restoreError) && (
          <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-base text-small text-red-600">
            {restoreError}
          </div>
        )}

        {!versionsLoading && formVersions.length > 0 && (
          <ol className="space-y-2">
            {formVersions.map((v, idx) => {
              const isExpanded = expandedId === v.id;
              const isRestoring = restoringId === v.id;
              const isLatest = idx === 0;

              return (
                <li
                  key={v.id}
                  className={`border rounded-base bg-background transition-shadow ${isExpanded ? 'shadow-sm border-primary' : 'border-border'}`}
                >
                  {/* Version row */}
                  <div
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : v.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setExpandedId(isExpanded ? null : v.id)}
                    aria-expanded={isExpanded}
                  >
                    {/* Version badge */}
                    <span
                      className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                        isLatest
                          ? 'bg-primary text-white'
                          : 'bg-surface-raised text-muted'
                      }`}
                    >
                      v{v.versionNumber}
                    </span>

                    <div className="flex-1 min-w-0">
                      <p className="text-small font-medium text-base-color truncate">{v.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted mt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDateTime(v.createdAt)}
                        </span>
                      </div>
                    </div>

                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted flex-shrink-0" />
                    )}
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
                      <div className="flex items-center gap-2 text-small text-muted">
                        <User className="h-3.5 w-3.5" />
                        <span>Saved by <span className="font-medium text-base-color">{v.savedByName}</span></span>
                      </div>

                      {!isLatest && (
                        <button
                          onClick={() => handleRestore(v.id)}
                          disabled={!!restoringId}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary text-white rounded-base text-small font-medium hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isRestoring ? (
                            <>
                              <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                              Restoring...
                            </>
                          ) : (
                            <>
                              <RotateCcw className="h-3.5 w-3.5" />
                              Restore this version
                            </>
                          )}
                        </button>
                      )}
                      {isLatest && (
                        <p className="text-xs text-muted italic">This is the current version.</p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
