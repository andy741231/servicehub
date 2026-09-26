import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  MoreVertical, Pencil, Trash2, UserCheck, Eye,
} from 'lucide-react';
import Skeleton from '../../components/Skeleton';
import { useConfirm } from '../../components/Dialog';
import { updateMemberStatus, updateMemberRole, deleteMember } from './api/directoryApi';
import { fullName, initials, statusLabel, statusChipCls, roleLabel, formatDate } from './utils/memberUtils';

const APPROVER_UP = ['approver', 'admin'];

// Mirror of the server-side matrix (server still enforces authoritatively).
// `pending` is only a starting state — staff never set a member TO pending
// (admins can, to send an accidentally-activated record back for review).
const STATUS_OPTIONS = {
  helper: ['inactive', 'moved'],
  approver: ['active', 'inactive', 'moved', 'deceased', 'negative', 'duplicate'],
  admin: ['active', 'pending', 'inactive', 'moved', 'deceased', 'negative', 'duplicate', 'delete'],
};
const ROLE_OPTIONS = {
  helper: ['saint'],
  approver: ['saint', 'helper', 'approver'],
  admin: ['saint', 'helper', 'approver', 'admin'],
};

// Staff management table — rendered inside the merged Directory page
// (index.jsx) for helper/approver/admin viewers.
export default function MembersTable({ members, loading, myRole, onRefresh, onView, onEdit, onError }) {
  const { confirmDialog, ConfirmDialogMount } = useConfirm();
  // { member, rect, trigger } — rect anchors the portaled menu outside the
  // table's overflow-x-auto container; trigger lets close restore focus.
  const [menu, setMenu] = useState(null);
  const closeMenu = () => {
    menu?.trigger?.focus();
    setMenu(null);
  };

  const canActivate = APPROVER_UP.includes(myRole);

  const handleStatus = async (member, newStatus) => {
    setMenu(null);
    const label = statusLabel(newStatus);
    const ok = await confirmDialog({
      title: `Set ${fullName(member)} to ${label}?`,
      message: newStatus === 'active'
        ? 'Activating makes this saint visible to everyone in the directory. Verify there is no duplicate record first.'
        : `This changes their phone list status to ${label}.`,
      confirmLabel: `Set ${label}`,
      variant: newStatus === 'active' ? 'default' : 'warning',
    });
    if (!ok) return;
    try {
      await updateMemberStatus(member.id, newStatus);
      onRefresh();
    } catch (err) {
      onError(err.response?.data?.error || 'Failed to update status');
    }
  };

  const handleRole = async (member, newRole) => {
    setMenu(null);
    const ok = await confirmDialog({
      title: `Change ${fullName(member)} to ${roleLabel(newRole)}?`,
      message: 'Role changes affect what this person can see and manage in the directory.',
      confirmLabel: `Set ${roleLabel(newRole)}`,
    });
    if (!ok) return;
    try {
      await updateMemberRole(member.id, newRole);
      onRefresh();
    } catch (err) {
      onError(err.response?.data?.error || 'Failed to update role');
    }
  };

  const handleDelete = async (member) => {
    setMenu(null);
    const ok = await confirmDialog({
      title: `Permanently delete ${fullName(member)}?`,
      message: 'Only duplicate records may be physically deleted. This cannot be undone.',
      confirmLabel: 'Delete permanently',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await deleteMember(member.id);
      onRefresh();
    } catch (err) {
      onError(err.response?.data?.error || 'Failed to delete member');
    }
  };

  return (
    <div className="bg-surface border border-border rounded-lg overflow-x-auto">
      <table className="min-w-full divide-y divide-border">
        <thead>
          <tr>
            {['Name', 'District', 'Status', 'Role', 'Phone', 'Email', 'Added'].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
            ))}
            <th className="px-4 py-3 w-px" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border-soft">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}><td colSpan={8} className="px-4 py-2"><Skeleton className="h-10 rounded" /></td></tr>
            ))
          ) : members.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-12 text-center text-muted">No members found.</td>
            </tr>
          ) : (
            members.map((m) => (
              <tr key={m.id} className="hover:bg-surface-raised/50 group">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    {m.photoUrl ? (
                      <img src={m.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                        {initials(m)}
                      </div>
                    )}
                    <button onClick={() => onView(m.id)} className="text-sm font-medium text-text-base hover:text-primary text-left">
                      {fullName(m)}
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-text-base whitespace-nowrap">{m.district}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusChipCls(m.status)}`}>
                    {statusLabel(m.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-muted whitespace-nowrap">{roleLabel(m.role)}</td>
                <td className="px-4 py-3 text-sm text-muted whitespace-nowrap">{m.phone1 || '—'}</td>
                <td className="px-4 py-3 text-sm text-muted whitespace-nowrap">{m.email || '—'}</td>
                <td className="px-4 py-3 text-sm text-muted whitespace-nowrap">{formatDate(m.addedAt)}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1 justify-end">
                    {canActivate && (m.status === 'pending' || m.status === 'inactive') && (
                      <button
                        onClick={() => handleStatus(m, 'active')}
                        title="Activate"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] text-xs font-medium rounded-base bg-success-light text-success hover:bg-success hover:text-primary-foreground transition-colors"
                      >
                        <UserCheck className="w-3.5 h-3.5" aria-hidden="true" /> Activate
                      </button>
                    )}
                    <button
                      onClick={(e) =>
                        setMenu(menu?.member.id === m.id
                          ? null
                          : { member: m, rect: e.currentTarget.getBoundingClientRect(), trigger: e.currentTarget })
                      }
                      className="w-10 h-10 flex items-center justify-center rounded-base text-muted hover:bg-surface-tertiary hover:text-text-base"
                      aria-label={`Actions for ${fullName(m)}`}
                      aria-haspopup="menu"
                      aria-expanded={menu?.member.id === m.id}
                    >
                      <MoreVertical className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {menu && (
        <RowMenu
          member={menu.member}
          rect={menu.rect}
          myRole={myRole}
          onClose={closeMenu}
          onView={() => { setMenu(null); onView(menu.member.id); }}
          onEdit={() => { setMenu(null); onEdit(menu.member); }}
          onStatus={(s) => handleStatus(menu.member, s)}
          onRole={(r) => handleRole(menu.member, r)}
          onDelete={() => handleDelete(menu.member)}
        />
      )}

      {ConfirmDialogMount}
    </div>
  );
}

// Portaled dropdown — positioned from the trigger button's viewport rect so it
// escapes the table's overflow-x-auto clipping. Flips upward near the bottom.
const MENU_MAX_H = 360;

function RowMenu({ member: m, rect, myRole, onClose, onView, onEdit, onStatus, onRole, onDelete }) {
  const menuRef = useRef(null);
  // Menu is viewport-fixed; if the table scrolls under it, the anchor is stale.
  // Ignore scrolls inside the menu's own overflow-y-auto (capture phase sees them).
  useEffect(() => {
    const onScroll = (e) => {
      if (menuRef.current?.contains(e.target)) return;
      onClose();
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
      // Arrow-key navigation between menu items
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const items = [...menuRef.current.querySelectorAll('[role="menuitem"]')];
        const idx = items.indexOf(document.activeElement);
        const next = e.key === 'ArrowDown'
          ? items[(idx + 1) % items.length]
          : items[(idx - 1 + items.length) % items.length];
        next?.focus();
      }
    };
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onClose);
    window.addEventListener('keydown', onKeyDown);
    // Move focus into the menu on open
    menuRef.current?.querySelector('[role="menuitem"]')?.focus();
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onClose);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  const flipUp = rect.bottom + MENU_MAX_H > window.innerHeight;
  const style = flipUp
    ? { bottom: window.innerHeight - rect.top + 4, right: window.innerWidth - rect.right }
    : { top: rect.bottom + 4, right: window.innerWidth - rect.right };

  return createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />
      <div
        ref={menuRef}
        role="menu"
        aria-label={`Actions for ${fullName(m)}`}
        style={style}
        className="fixed z-50 w-52 max-h-[360px] overflow-y-auto rounded-lg border border-border bg-surface shadow-modal py-1"
      >
        <MenuItem icon={Eye} label="View details" onClick={onView} />
        <MenuItem icon={Pencil} label="Edit" onClick={onEdit} />
        <div className="my-1 border-t border-border-soft" />
        <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-subtle" role="presentation">Set status</div>
        {(STATUS_OPTIONS[myRole] ?? []).filter((s) => s !== m.status).map((s) => (
          <MenuItem key={s} label={statusLabel(s)} onClick={() => onStatus(s)} />
        ))}
        <div className="my-1 border-t border-border-soft" />
        <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-subtle" role="presentation">Set role</div>
        {(ROLE_OPTIONS[myRole] ?? []).filter((r) => r !== m.role).map((r) => (
          <MenuItem key={r} label={roleLabel(r)} onClick={() => onRole(r)} />
        ))}
        {m.status === 'duplicate' && APPROVER_UP.includes(myRole) && (
          <>
            <div className="my-1 border-t border-border-soft" />
            <MenuItem icon={Trash2} label="Delete permanently" danger onClick={onDelete} />
          </>
        )}
      </div>
    </>,
    document.body,
  );
}

function MenuItem({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
        danger ? 'text-danger hover:bg-danger-light' : 'text-text-base hover:bg-surface-raised'
      }`}
    >
      {Icon && <Icon className="w-4 h-4" aria-hidden="true" />}
      {label}
    </button>
  );
}
