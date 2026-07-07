import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search as SearchIcon, ArrowRight } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { APPS } from '../layouts/AppShell';
import { searchAll, groupResults } from '../search/registry';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const hasSuperAdminRole = user?.roles?.includes('super_admin');
  const hasAdminRole = user?.roles?.includes('admin');

  const accessibleIds = useMemo(
    () => new Set(
      APPS.filter((app) => user?.permissions?.includes(app.id) || hasAdminRole || hasSuperAdminRole)
        .map((app) => app.id),
    ),
    [user, hasAdminRole, hasSuperAdminRole],
  );

  const runSearch = useCallback(async (q) => {
    if (!q.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const hits = await searchAll(q, accessibleIds);
    setResults(hits);
    setLoading(false);
  }, [accessibleIds]);

  useEffect(() => {
    if (initialQuery) runSearch(initialQuery);
  }, [initialQuery, runSearch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const q = query.trim();
    setSearchParams(q ? { q } : {});
    runSearch(q);
  };

  const grouped = useMemo(() => groupResults(results), [results]);

  const handleResultClick = (path) => navigate(path);

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-3xl mx-auto p-6 lg:p-8">
        <h1 className="text-display font-bold text-text-base mb-6">Search</h1>

        {/* Search input */}
        <form onSubmit={handleSubmit} className="relative mb-8">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-subtle pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, forms, campaigns…"
            autoFocus
            className="w-full pl-12 pr-4 py-3 min-h-[48px] text-base bg-surface border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-body placeholder:text-subtle transition-colors"
            aria-label="Search query"
          />
        </form>

        {/* Results */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-surface border border-border rounded-card p-4">
                <div className="skeleton skeleton-line" style={{ width: '40%' }} />
                <div className="skeleton skeleton-line mt-2" style={{ width: '20%' }} />
              </div>
            ))}
          </div>
        ) : results.length === 0 ? (
          initialQuery ? (
            <div className="text-center py-16">
              <SearchIcon className="w-10 h-10 text-subtle mx-auto mb-3" />
              <p className="text-muted">No results found for "{initialQuery}"</p>
              <p className="text-sm text-subtle mt-1">Try a different search term.</p>
            </div>
          ) : (
            <div className="text-center py-16">
              <SearchIcon className="w-10 h-10 text-subtle mx-auto mb-3" />
              <p className="text-muted">Start typing to search across your apps</p>
            </div>
          )
        ) : (
          <div className="space-y-6">
            <p className="text-sm text-muted">
              {results.length} result{results.length !== 1 ? 's' : ''} for "{initialQuery}"
            </p>
            {grouped.map((group) => (
              <div key={group.appId}>
                <h2 className="text-sm font-semibold text-subtle uppercase tracking-wider mb-2">
                  {group.label} ({group.items.length})
                </h2>
                <div className="bg-surface border border-border rounded-card shadow-card overflow-hidden">
                  {group.items.map((item, i) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleResultClick(item.path)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-raised ${
                        i > 0 ? 'border-t border-border-soft' : ''
                      }`}
                    >
                      <item.Icon className="h-5 w-5 flex-shrink-0 text-subtle" />
                      <span className="flex-1 min-w-0">
                        <span className="block truncate font-medium text-text-base">{item.title}</span>
                        {item.subtitle && (
                          <span className="block truncate text-xs text-subtle">{item.subtitle}</span>
                        )}
                      </span>
                      <ArrowRight className="h-4 w-4 flex-shrink-0 text-subtle" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
