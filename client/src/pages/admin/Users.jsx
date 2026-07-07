import { useEffect, useState } from 'react';
import api from '../../utils/api';
import { APPS } from '../../layouts/AppShell';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Shield, 
  User, 
  Mail, 
  Lock, 
  Check, 
  AlertCircle 
} from 'lucide-react';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    email: '',
    password: '',
    isActive: true,
    roles: [],
    permissions: []
  });

  const availableRoles = ['super_admin', 'admin', 'editor', 'viewer'];

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Error fetching users', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openCreateModal = () => {
    setSelectedUser(null);
    setFormData({
      username: '',
      name: '',
      email: '',
      password: '',
      isActive: true,
      roles: ['viewer'],
      permissions: ['home']
    });
    setError('');
    setIsFormOpen(true);
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      name: user.name,
      email: user.email,
      password: '', // Password is not modified on edit
      isActive: user.isActive !== undefined ? user.isActive : true,
      roles: user.roles || [],
      permissions: user.permissions || []
    });
    setError('');
    setIsFormOpen(true);
  };

  const openDeleteModal = (user) => {
    setSelectedUser(user);
    setError('');
    setIsDeleteOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleRoleToggle = (role) => {
    setFormData(prev => {
      const roles = prev.roles.includes(role)
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role];
      return { ...prev, roles };
    });
  };

  const handlePermissionToggle = (appId) => {
    setFormData(prev => {
      const permissions = prev.permissions.includes(appId)
        ? prev.permissions.filter(p => p !== appId)
        : [...prev.permissions, appId];
      return { ...prev, permissions };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (selectedUser) {
        // Update user
        await api.put(`/users/${selectedUser.id}`, {
          name: formData.name,
          isActive: formData.isActive,
          roles: formData.roles,
          permissions: formData.permissions
        });
        setSuccess('User updated successfully!');
      } else {
        // Create user
        if (!formData.password) {
          setError('Password is required for new users');
          return;
        }
        await api.post('/users', formData);
        setSuccess('User created successfully!');
      }
      setIsFormOpen(false);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Operation failed');
    }
  };

  const handleDelete = async () => {
    setError('');
    setSuccess('');
    try {
      await api.delete(`/users/${selectedUser.id}`);
      setSuccess('User deleted successfully!');
      setIsDeleteOpen(false);
      fetchUsers();
    } catch (err) {
      setError('Failed to delete user');
    }
  };

  const togglePermissionInTable = async (userId, appId, currentPermissions) => {
    const hasPerm = currentPermissions.includes(appId);
    const newPerms = hasPerm ? currentPermissions.filter(p => p !== appId) : [...currentPermissions, appId];
    
    try {
      await api.put(`/users/${userId}`, { permissions: newPerms });
      setUsers(users.map(u => u.id === userId ? { ...u, permissions: newPerms } : u));
    } catch (err) {
      console.error('Failed to update permission', err);
      setError('Failed to update permission');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text-base tracking-tight">Users &amp; Roles</h1>
          <p className="text-sm text-muted mt-1">Manage platform accounts, administrator roles, and application permissions.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary-hover active:bg-primary-hover active:scale-95 transition-transform focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
        >
          <Plus className="h-5 w-5 mr-1.5" />
          Add User
        </button>
      </div>

      {/* Notifications */}
      {success && (
        <div className="mb-6 p-4 bg-success-light border border-success/20 rounded-lg flex items-center text-success text-sm">
          <Check className="h-5 w-5 mr-2 flex-shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div role="alert" aria-live="polite" className="mb-6 p-4 bg-danger-light border border-danger/20 rounded-lg flex items-center text-danger text-sm">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Table Container */}
      <div className="bg-surface shadow-sm ring-1 ring-black/5 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-surface-raised">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-muted uppercase tracking-wider">User</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-muted uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-muted uppercase tracking-wider">Roles</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-muted uppercase tracking-wider">App Permissions</th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-muted uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-border-soft">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-surface-raised/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-primary-light flex items-center justify-center text-primary font-semibold text-sm">
                        {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-semibold text-text-base">{user.name}</div>
                        <div className="text-sm text-muted">@{user.username}</div>
                        <div className="text-xs text-subtle">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 inline-flex text-xs font-semibold rounded-full ${
                      user.isActive !== false 
                        ? 'bg-success-light text-success' 
                        : 'bg-surface-raised text-text-base'
                    }`}>
                      {user.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-1.5 flex-wrap">
                      {user.roles.map(role => (
                        <span key={role} className={`px-2.5 py-0.5 inline-flex items-center text-xs font-semibold rounded border ${
                          role === 'super_admin'
                            ? 'bg-primary-light text-primary border-primary/20'
                            : 'bg-primary-light text-primary border-primary'
                        }`}>
                          <Shield className={`h-3.5 w-3.5 mr-1 ${role === 'super_admin' ? 'text-primary' : 'text-primary'}`} />
                          {role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5 max-w-[200px]">
                      {APPS.map(app => {
                        const hasPerm = user.permissions.includes(app.id);
                        const isSuperAdmin = user.roles.includes('super_admin');
                        const isAdmin = user.roles.includes('admin');
                        return (
                          <label key={app.id} className={`flex items-center space-x-2 text-sm ${isSuperAdmin || isAdmin ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}>
                            <input
                              type="checkbox"
                              checked={hasPerm || isSuperAdmin || isAdmin}
                              disabled={isSuperAdmin || isAdmin}
                              onChange={() => togglePermissionInTable(user.id, app.id, user.permissions)}
                              className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                            />
                            <span className="text-text-base">{app.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => openEditModal(user)}
                        className="text-primary hover:text-primary flex items-center gap-1 transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => openDeleteModal(user)}
                        className="text-danger hover:text-danger flex items-center gap-1 transition-colors"
                        disabled={user.username === 'admin'}
                      >
                        <Trash2 className={`h-4 w-4 ${user.username === 'admin' ? 'opacity-30' : ''}`} />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Create / Edit Modal */}
      {isFormOpen && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setIsFormOpen(false); }}
          onKeyDown={(e) => { if (e.key === 'Escape') setIsFormOpen(false); }}
        >
          <div 
            className="bg-surface rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-border-soft animate-[fadeInScale_0.15s_ease-out]"
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-form-title"
          >
            <div className="flex justify-between items-center px-6 py-4 border-b border-border-soft">
              <h3 id="user-form-title" className="text-lg font-bold text-text-base">
                {selectedUser ? 'Edit User Details' : 'Create New User'}
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="text-subtle hover:text-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Username */}
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">Username</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-subtle" />
                    <input
                      type="text"
                      name="username"
                      required
                      disabled={!!selectedUser}
                      value={formData.username}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-surface-raised disabled:text-muted"
                      placeholder="jane_doe"
                    />
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-subtle" />
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="Jane Doe"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-subtle" />
                    <input
                      type="email"
                      name="email"
                      required
                      disabled={!!selectedUser}
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-surface-raised disabled:text-muted"
                      placeholder="jane@example.com"
                    />
                  </div>
                </div>

                {/* Password (only on Create) */}
                {!selectedUser && (
                  <div>
                    <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-subtle" />
                      <input
                        type="password"
                        name="password"
                        required
                        value={formData.password}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                )}

                {/* Status Toggle (on Edit) */}
                {selectedUser && (
                  <div className="flex items-center justify-between p-3 bg-surface-raised rounded-lg">
                    <div>
                      <div className="text-sm font-semibold text-text-base">Active Status</div>
                      <div className="text-xs text-muted">Enable or disable this user account</div>
                    </div>
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleInputChange}
                      className="w-10 h-5 bg-surface-tertiary rounded-full appearance-none checked:bg-primary transition-colors relative cursor-pointer before:content-[''] before:absolute before:w-4 before:h-4 before:bg-surface before:rounded-full before:top-0.5 before:left-0.5 checked:before:left-5.5 before:transition-all"
                    />
                  </div>
                )}

                {/* Roles Selector */}
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">Roles Assignment</label>
                  <div className="grid grid-cols-3 gap-2">
                    {availableRoles.map(role => {
                      const isChecked = formData.roles.includes(role);
                      const isSuperAdmin = role === 'super_admin';
                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() => handleRoleToggle(role)}
                          className={`flex items-center justify-center py-2 px-3 border rounded-lg text-sm font-semibold transition-all ${
                            isChecked
                              ? isSuperAdmin
                                ? 'bg-primary-light border-primary text-primary shadow-sm'
                                : 'bg-primary-light border-primary text-primary shadow-sm'
                              : 'bg-surface border-border text-muted hover:bg-surface-raised'
                          }`}
                        >
                          {isChecked && <Check className={`h-4 w-4 mr-1.5 ${isSuperAdmin ? 'text-primary' : 'text-primary'}`} />}
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Permissions Selector */}
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">Application Access Permissions</label>
                  <div className="space-y-2">
                    {APPS.map(app => {
                      const isChecked = formData.permissions.includes(app.id);
                      const isSuperAdminSelected = formData.roles.includes('super_admin');
                      const isAdminSelected = formData.roles.includes('admin');
                      return (
                        <button
                          key={app.id}
                          type="button"
                          disabled={isSuperAdminSelected || isAdminSelected}
                          onClick={() => handlePermissionToggle(app.id)}
                          className={`w-full flex items-center justify-between p-3 border rounded-lg text-left transition-all ${
                            isSuperAdminSelected || isAdminSelected
                              ? 'bg-surface-raised border-border text-subtle cursor-not-allowed'
                              : isChecked
                                ? 'bg-primary-light/50 border-primary text-primary font-semibold'
                                : 'bg-surface border-border text-text-base hover:bg-surface-raised'
                          }`}
                        >
                          <span className="text-sm">{app.label}</span>
                          <input
                            type="checkbox"
                            checked={isChecked || isSuperAdminSelected || isAdminSelected}
                            disabled={isSuperAdminSelected || isAdminSelected}
                            readOnly
                            className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="px-6 py-4 bg-surface-raised border-t border-border-soft flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-border rounded-lg text-sm font-semibold text-text-base bg-surface hover:bg-surface-raised focus:outline-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  {selectedUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteOpen && selectedUser && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setIsDeleteOpen(false); }}
          onKeyDown={(e) => { if (e.key === 'Escape') setIsDeleteOpen(false); }}
        >
          <div 
            className="bg-surface rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-border-soft animate-[fadeInScale_0.15s_ease-out]"
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-user-title"
          >
            <div className="p-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-danger-light text-danger mb-4">
                <Trash2 className="h-6 w-6" />
              </div>
              <h3 id="delete-user-title" className="text-lg font-bold text-text-base text-center">Delete User Account</h3>
              <p className="text-sm text-muted text-center mt-2">
                Are you sure you want to permanently delete <strong>{selectedUser.name}</strong> ({selectedUser.email})? This action cannot be undone.
              </p>
            </div>
            <div className="px-6 py-4 bg-surface-raised border-t border-border-soft flex justify-end gap-3">
              <button
                onClick={() => setIsDeleteOpen(false)}
                className="px-4 py-2 border border-border rounded-lg text-sm font-semibold text-text-base bg-surface hover:bg-surface-raised"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-primary-foreground bg-danger hover:bg-danger focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-danger"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

