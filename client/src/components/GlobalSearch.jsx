import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { APPS } from '../layouts/AppShell';
import { searchAll, groupResults } from '../search/registry';

export default function GlobalSearch() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  const hasSuperAdminRole = user?.roles?.includes('super_admin');
  const hasAdminRole = user?.roles?.includes('admin');

  const accessibleIds = useMemo(
    () => new Set(
      APPS.filter((app) => user?.permissions?.includes(app.id) || hasAdminRole || hasSuperAdminRole)
        .map((app) => app.id),
    ),
    [user, hasAdminRole, hasSuperAdminRole],
  );

  // Debounced search — 200ms after last keystroke.
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
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => runSearch(query), 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, runSearch]);

  // Close dropdown on outside click.
  useEffect(() => {
    const onClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const flatResults = useMemo(() => results, [results]);
  const grouped = useMemo(() => groupResults(results), [results]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && flatResults[activeIndex]) {
        navigate(flatResults[activeIndex].path);
        setOpen(false);
        setQuery('');
      } else {
        navigate(`/hub-admin/search?q=${encodeURIComponent(query)}`);
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleResultClick = (path) => {
    navigate(path);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className="relative flex-1 max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setActiveIndex(-1); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search pages, forms, campaigns…"
          className="w-full pl-9 pr-4 py-2 min-h-[36px] text-sm bg-surface-raised border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-body placeholder:text-subtle transition-colors"
          aria-label="Global search"
          aria-expanded={open}
          aria-controls="search-dropdown"
        />
      </div>

      {open && (query.trim() || loading) && (
        <div
          id="search-dropdown"
          role="listbox"
          className="absolute top-full left-0 right-0 mt-1 z-50 bg-surface border border-border rounded-base shadow-dropdown max-h-[400px] overflow-y-auto"
        >
          {loading ? (
            <div className="px-4 py-3 text-sm text-subtle">Searching…</div>
          ) : flatResults.length === 0 ? (
            <div className="px-4 py-3 text-sm text-subtle">No results for "{query}"</div>
          ) : (
            <>
              {grouped.map((group) => (
                <div key={group.appId}>
                  <div className="px-3 py-1.5 text-xs font-medium text-subtle uppercase tracking-wider border-b border-border-soft sticky top-0 bg-surface">
                    {group.label}
                  </div>
                  {group.items.map((item) => {
                    const idx = flatResults.indexOf(item);
                    const isActive = idx === activeIndex;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleResultClick(item.path)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                          isActive ? 'bg-primary-light text-primary' : 'text-text-base hover:bg-surface-raised'
                        }`}
                      >
                        <item.Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-primary' : 'text-subtle'}`} />
                        <span className="flex-1 min-w-0">
                          <span className="block truncate font-medium">{item.title}</span>
                          {item.subtitle && (
                            <span className={`block truncate text-xs ${isActive ? 'text-primary' : 'text-subtle'}`}>
                              {item.subtitle}
                            </span>
                          )}
                        </span>
                        <ArrowRight className={`h-3.5 w-3.5 flex-shrink-0 ${isActive ? 'text-primary' : 'text-subtle'}`} />
                      </button>
                    );
                  })}
                </div>
              ))}
              <div className="border-t border-border-soft px-3 py-2 text-xs text-subtle">
                Press <kbd className="font-mono">Enter</kbd> for all results
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
