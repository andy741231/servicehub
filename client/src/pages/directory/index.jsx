import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search, Mail, Phone, MapPin, User, HeartHandshake, Users,
  UserPlus, RefreshCw, LayoutGrid, Table as TableIcon,
} from 'lucide-react';
import { useDebounce } from 'use-debounce';
import { fetchMembers } from './api/directoryApi';
import useDirectoryStore from './store/directoryStore';
import MemberDetailDialog from './MemberDetailDialog';
import MemberFormDialog from './MemberFormDialog';
import MembersTable from './Members';
import Skeleton from '../../components/Skeleton';
import { fullName, initials, spouseName, roleLabel, statusLabel, statusChipCls } from './utils/memberUtils';

const STAFF = ['helper', 'approver', 'admin'];
const CARD_PAGE_SIZE = 60;
const TABLE_PAGE_SIZE = 50;

// Merged Browse + Members page: card grid for everyone; helpers/approvers/admins
// get a Cards/Table toggle — the table view carries the management actions.
export default function Directory() {
  const { meta, loadMeta } = useDirectoryStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchInput, setSearchInput] = useState('');
  const [q] = useDebounce(searchInput, 300);
  const [selectedDistricts, setSelectedDistricts] = useState([]); // empty = all
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [initial, setInitial] = useState('');                    // A–Z surname jump
  const [members, setMembers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [selected, setSelected] = useState(null);   // member id for detail dialog
  const [editing, setEditing] = useState(null);     // member | 'new' | null

  const myRole = meta?.myRole;
  const isStaff = STAFF.includes(myRole);

  // Staff default to the management table; saints always see cards.
  // ?view=cards|table persists the choice in the URL for shareable links.
  const view = isStaff ? (searchParams.get('view') || 'table') : 'cards';
  const setView = (v) => {
    const next = new URLSearchParams(searchParams);
    next.set('view', v);
    setSearchParams(next, { replace: true });
  };
  const pageSize = view === 'table' ? TABLE_PAGE_SIZE : CARD_PAGE_SIZE;

  useEffect(() => { loadMeta(); }, [loadMeta]);

  // "?add=1" opens the add dialog (from dashboard quick action)
  useEffect(() => {
    if (searchParams.get('add') === '1' && isStaff) {
      setEditing('new');
      searchParams.delete('add');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, isStaff]);

  // Any filter change restarts pagination from page 1.
  const resetList = () => { setPage(1); setMembers([]); };
  useEffect(resetList, [q, selectedDistricts, status, initial, view]);

  useEffect(() => {
    let cancelled = false;
    if (page === 1) { setLoading(true); } else { setLoadingMore(true); }
    setError(null);
    fetchMembers({
      ...(q ? { q } : {}),
      ...(selectedDistricts.length ? { district: selectedDistricts } : {}),
      ...(isStaff && status ? { status } : {}),
      ...(initial ? { initial } : {}),
      page,
      pageSize,
    })
      .then((data) => {
        if (cancelled) return;
        setMembers((prev) => (page > 1 && view === 'cards' ? [...prev, ...data.members] : data.members));
        setTotal(data.total);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.response?.data?.error || 'Failed to load directory');
        setMembers([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
        setLoadingMore(false);
      });
    return () => { cancelled = true; };
  }, [q, selectedDistricts, status, initial, page, pageSize, view, refreshKey, isStaff]);

  const districts = useMemo(() => meta?.districts ?? [], [meta]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const toggleDistrict = (d) =>
    setSelectedDistricts((sel) => (sel.includes(d) ? sel.filter((x) => x !== d) : [...sel, d]));
  const refresh = () => { setPage(1); setMembers([]); setRefreshKey((k) => k + 1); };

  // Whole-card click without nesting <a> inside <button>: a focusable div
  // with role="button" keeps keyboard/screen-reader semantics legal.
  const cardKeyDown = (e, id) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(id); }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-lg font-bold text-text-base mb-4">Church Directory</h1>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle" aria-hidden="true" />
          <input
            type="search"
            aria-label="Search the directory by name, email, or phone"
            placeholder="Search by name, email, or phone…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm min-h-[44px]"
          />
        </div>

        {!isStaff && (
          <select
            value={initial}
            onChange={(e) => setInitial(e.target.value)}
            aria-label="Jump to last name initial"
            className="px-3 py-2 bg-surface border border-border rounded-base text-sm min-h-[44px]"
          >
            <option value="">Last name A–Z</option>
            {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        )}

        {isStaff && (
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by status"
            className="px-3 py-2 bg-surface border border-border rounded-base text-sm min-h-[44px]"
          >
            <option value="">All statuses</option>
            {(meta?.statuses ?? []).map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
          </select>
        )}

        {isStaff && (
          <div className="flex rounded-base border border-border overflow-hidden" role="group" aria-label="View">
            {[['cards', LayoutGrid, 'Cards'], ['table', TableIcon, 'Table']].map(([v, Icon, label]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                aria-pressed={view === v}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors min-h-[44px] ${
                  view === v ? 'bg-primary text-primary-foreground' : 'bg-surface text-muted hover:text-text-base'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" /> {label}
              </button>
            ))}
          </div>
        )}

        {isStaff && (
          <>
            <button
              onClick={refresh}
              className="inline-flex items-center gap-2 px-4 py-2 border border-border bg-surface rounded-base hover:border-border-dark min-h-[44px] text-sm font-medium text-text-base"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh
            </button>
            <button
              onClick={() => setEditing('new')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-base hover:bg-primary-hover min-h-[44px] text-sm font-medium"
            >
              <UserPlus className="h-4 w-4" aria-hidden="true" /> Add Member
            </button>
          </>
        )}
      </div>

      {/* District chips — multi-select; none selected = all districts */}
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter by district">
        <button
          onClick={() => setSelectedDistricts([])}
          aria-pressed={selectedDistricts.length === 0}
          className={`px-3.5 py-2 min-h-[40px] rounded-full text-sm transition-colors duration-150 ${
            selectedDistricts.length === 0
              ? 'bg-primary text-primary-foreground'
              : 'bg-surface border border-border hover:border-primary text-muted'
          }`}
        >
          All
        </button>
        {districts.map((d) => (
          <button
            key={d}
            onClick={() => toggleDistrict(d)}
            aria-pressed={selectedDistricts.includes(d)}
            className={`px-3.5 py-2 min-h-[40px] rounded-full text-sm transition-colors duration-150 ${
              selectedDistricts.includes(d)
                ? 'bg-primary text-primary-foreground'
                : 'bg-surface border border-border hover:border-primary text-muted'
              }`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Results count */}
      <div className="mb-3 text-small text-muted" aria-live="polite">
        {loading
          ? 'Loading…'
          : isStaff
            ? `${total} member${total === 1 ? '' : 's'}`
            : `Showing ${members.length} of ${total} saints`}
        {isStaff && myRole !== 'admin' && meta?.myDistrict && (
          <span> · management scoped to <span className="font-medium text-text-base">{meta.myDistrict}</span></span>
        )}
      </div>

      {error && (
        <div role="alert" className="mb-4 p-4 rounded-base bg-danger-light text-danger text-sm">{error}</div>
      )}

      {/* Table view (staff) */}
      {view === 'table' && isStaff ? (
        <>
          <MembersTable
            members={members}
            loading={loading}
            myRole={myRole}
            onRefresh={refresh}
            onView={setSelected}
            onEdit={setEditing}
            onError={setError}
          />
          {totalPages > 1 && (
            <nav className="mt-4 flex items-center justify-between" aria-label="Member pages">
              <p className="text-small text-muted">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || loading}
                  className="px-4 py-2 min-h-[44px] border border-border bg-surface rounded-base text-sm font-medium text-text-base disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || loading}
                  className="px-4 py-2 min-h-[44px] border border-border bg-surface rounded-base text-sm font-medium text-text-base disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </nav>
          )}
        </>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-lg" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-12">
          <User className="h-12 w-12 text-subtle mx-auto mb-3" aria-hidden="true" />
          <p className="text-body text-muted">No saints found</p>
          <p className="text-small text-muted mt-1">Try adjusting your search or district filter</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {members.map((person) => (
              <div
                key={person.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelected(person.id)}
                onKeyDown={(e) => cardKeyDown(e, person.id)}
                aria-label={`View ${fullName(person)}`}
                className="bg-surface-raised border border-border rounded-lg p-6 hover:border-primary transition-colors duration-150 text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {/* Avatar + name */}
                <div className="flex items-start gap-4 mb-4">
                  {person.photoUrl ? (
                    <img
                      src={person.photoUrl}
                      alt=""
                      loading="lazy"
                      className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-body font-bold flex-shrink-0" aria-hidden="true">
                      {initials(person)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-body font-bold text-base truncate">{fullName(person)}</h3>
                    <p className="text-small text-muted truncate">
                      {person.district}
                      {person.smallGroup ? ` · ${person.smallGroup}` : ''}
                    </p>
                    {person.role && person.role !== 'saint' && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-light text-primary">
                        {roleLabel(person.role)}
                      </span>
                    )}
                    {isStaff && person.status !== 'active' && (
                      <span className={`inline-block mt-1 ml-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusChipCls(person.status)}`}>
                        {statusLabel(person.status)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Contact info — fields absent when hidden by privacy settings */}
                <div className="space-y-2">
                  {person.email && (
                    <a
                      href={`mailto:${person.email}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-2 text-small text-muted hover:text-primary transition-colors duration-150"
                    >
                      <Mail className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                      <span className="truncate">{person.email}</span>
                    </a>
                  )}
                  {person.phone1 && (
                    <a
                      href={`tel:${person.phone1}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-2 text-small text-muted hover:text-primary transition-colors duration-150"
                    >
                      <Phone className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                      <span>{person.phone1}{person.phone2 ? ` · ${person.phone2}` : ''}</span>
                    </a>
                  )}
                  {person.city && (
                    <div className="flex items-center gap-2 text-small text-muted">
                      <MapPin className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                      <span>{[person.city, person.state].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                  {spouseName(person) && (
                    <div className="flex items-center gap-2 text-small text-muted">
                      <HeartHandshake className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                      <span className="truncate">Married to {spouseName(person)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Load more — incremental browsing for the card grid */}
          {members.length < total && (
            <div className="mt-6 text-center">
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={loadingMore}
                className="px-6 py-2.5 min-h-[44px] border border-border bg-surface rounded-base text-sm font-medium text-text-base hover:border-primary disabled:opacity-50"
              >
                {loadingMore ? 'Loading…' : `Load more (${total - members.length} remaining)`}
              </button>
            </div>
          )}
        </>
      )}

      {/* Helper contact hint (spec: help should be readily available) */}
      {meta?.myDistrict && (
        <div className="mt-8 p-4 rounded-xl bg-surface border border-border-soft text-sm text-muted flex items-center gap-2">
          <Users className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span>
            Need help updating your info? Contact a helper or approver in your district ({meta.myDistrict})
            — they show a badge on their card.
          </span>
        </div>
      )}

      {selected && (
        <MemberDetailDialog
          memberId={selected}
          onClose={() => setSelected(null)}
          onEdit={(m) => { setSelected(null); setEditing(m); }}
        />
      )}
      {editing && (
        <MemberFormDialog
          member={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
