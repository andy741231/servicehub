import { useEffect, useState } from 'react';
import { Plus, Upload, Download, Trash2, Edit, Users, Search, MoreVertical, UserPlus } from 'lucide-react';
import Papa from 'papaparse';
import useEmailStore from './store/emailStore';
import { useConfirm } from '../../components/Dialog';

export default function MailingLists() {
  const { mailingLists, loading, error, fetchMailingLists, createMailingList, deleteMailingList, importRecipients, createRecipient } = useEmailStore();
  const { confirmDialog, ConfirmDialogMount } = useConfirm();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddRecipientModal, setShowAddRecipientModal] = useState(false);
  const [selectedList, setSelectedList] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [newList, setNewList] = useState({ name: '', description: '' });
  const [csvFile, setCsvFile] = useState(null);
  const [importPreview, setImportPreview] = useState([]);
  const [newRecipient, setNewRecipient] = useState({ email: '', firstName: '', lastName: '' });

  useEffect(() => {
    fetchMailingLists();
  }, [fetchMailingLists]);

  const handleCreateList = async () => {
    if (newList.name) {
      try {
        await createMailingList(newList);
        setNewList({ name: '', description: '' });
        setShowCreateModal(false);
      } catch (error) {
        console.error('Failed to create list:', error);
      }
    }
  };

  const handleDeleteList = async (listId) => {
    const ok = await confirmDialog({
      title: 'Delete this list?',
      message: 'This action cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (ok) {
      try {
        await deleteMailingList(listId);
      } catch (error) {
        console.error('Failed to delete list:', error);
      }
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCsvFile(file);
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        preview: 5,
        complete: (results) => {
          setImportPreview(results.data || []);
        }
      });
    }
  };

  const handleImport = async () => {
    if (csvFile && selectedList) {
      try {
        Papa.parse(csvFile, {
          header: true,
          skipEmptyLines: true,
          complete: async (results) => {
            try {
              await importRecipients(selectedList, results.data);
              setShowImportModal(false);
              setCsvFile(null);
              setImportPreview([]);
              setSelectedList(null);
              await fetchMailingLists(); // Refresh lists to show updated counts
            } catch (error) {
              console.error('Failed to import recipients:', error);
            }
          }
        });
      } catch (error) {
        console.error('Failed to parse CSV:', error);
      }
    }
  };

  const handleAddRecipient = async () => {
    if (newRecipient.email && selectedList) {
      try {
        await createRecipient(selectedList, newRecipient);
        setNewRecipient({ email: '', firstName: '', lastName: '' });
        setShowAddRecipientModal(false);
        setSelectedList(null);
        await fetchMailingLists(); // Refresh lists to show updated counts
      } catch (error) {
        console.error('Failed to add recipient:', error);
      }
    }
  };

  const handleExportList = (list) => {
    // TODO: Implement actual export logic
    console.log('Exporting list:', list.name);
  };

  const filteredLists = mailingLists.filter(list =>
    list.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    list.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (error) {
    return <div className="p-8 text-danger">Error: {error}</div>;
  }

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-display font-bold text-base mb-2">Mailing Lists</h1>
        <p className="text-body text-muted">Manage your contact lists and import subscribers</p>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle" />
            <input
              type="text"
              placeholder="Search lists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 border border-border-strong rounded-base bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-subtle"
            />
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAddRecipientModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-border rounded-base hover:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] font-medium transition-colors duration-150"
          >
            <UserPlus className="h-4 w-4" />
            <span className="text-body">Add Email</span>
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-border rounded-base hover:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] font-medium transition-colors duration-150"
          >
            <Upload className="h-4 w-4" />
            <span className="text-body">Import CSV</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-text-inverse rounded-base hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] font-medium transition-colors duration-150"
          >
            <Plus className="h-4 w-4" />
            <span className="text-body">New List</span>
          </button>
        </div>
      </div>

      {/* Lists Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredLists.map((list) => (
          <div key={list.id} className="bg-surface border border-border rounded-card shadow-card p-6 hover:shadow-dropdown transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-light rounded-base">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-heading font-semibold text-base">{list.name}</h3>
                  <p className="text-small text-muted">{list.description}</p>
                </div>
              </div>
              <button className="p-1 min-h-[32px] min-w-[32px] text-subtle hover:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 transition-colors">
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div>
                <p className="text-label text-muted">Subscribers</p>
                <p className="text-heading font-semibold text-base">{(list.count || 0).toLocaleString()}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExportList(list)}
                  className="p-2 min-h-[36px] min-w-[36px] text-subtle hover:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 transition-colors"
                  title="Export list"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteList(list.id)}
                  className="p-2 min-h-[36px] min-w-[36px] text-subtle hover:text-danger focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 transition-colors"
                  title="Delete list"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create List Modal */}
      {showCreateModal && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
          onMouseDown={e => { if (e.target === e.currentTarget) setShowCreateModal(false); }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 overflow-hidden"
            onMouseDown={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-list-title"
          >
            <h3 id="create-list-title" className="text-heading font-semibold text-base mb-4">Create New List</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-label text-muted mb-2">List Name</label>
                <input
                  type="text"
                  value={newList.name}
                  onChange={(e) => setNewList({ ...newList, name: e.target.value })}
                  placeholder="e.g., Newsletter Subscribers"
                  className="w-full h-11 px-3 border border-border-strong rounded-base bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-subtle"
                />
              </div>
              <div>
                <label className="block text-label text-muted mb-2">Description (optional)</label>
                <textarea
                  value={newList.description}
                  onChange={(e) => setNewList({ ...newList, description: e.target.value })}
                  placeholder="Describe the purpose of this list"
                  rows={3}
                  className="w-full px-3 py-2 border border-border-strong rounded-base bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-subtle resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 bg-surface border border-border rounded-base hover:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] font-medium transition-colors duration-150"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateList}
                  disabled={!newList.name}
                  className="px-4 py-2.5 bg-primary text-text-inverse rounded-base hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create List
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {showImportModal && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
          onMouseDown={e => { if (e.target === e.currentTarget) setShowImportModal(false); }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full mx-4 overflow-hidden"
            onMouseDown={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-csv-title"
          >
            <h3 id="import-csv-title" className="text-heading font-semibold text-base mb-4">Import Contacts</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-label text-muted mb-2">Select List</label>
                <select
                  value={selectedList || ''}
                  onChange={(e) => setSelectedList(e.target.value)}
                  className="w-full h-11 px-3 border border-border-strong rounded-base bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body"
                >
                  <option value="">Choose a list...</option>
                  {lists.map((list) => (
                    <option key={list.id} value={list.id}>
                      {list.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-label text-muted mb-2">Upload CSV File</label>
                <div className="border-2 border-dashed border-border rounded-base p-6 text-center hover:border-primary transition-colors">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label
                    htmlFor="csv-upload"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <Upload className="h-8 w-8 text-subtle" />
                    <p className="text-body text-muted">
                      {csvFile ? csvFile.name : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-small text-subtle">CSV files only</p>
                  </label>
                </div>
              </div>
              {importPreview.length > 0 && (
                <div>
                  <label className="block text-label text-muted mb-2">Preview (first 5 rows)</label>
                  <div className="bg-surface-raised border border-border rounded-base overflow-hidden max-h-40 overflow-y-auto">
                    <table className="w-full text-small">
                      <thead>
                        <tr className="border-b border-border">
                          {Object.keys(importPreview[0]).map((key) => (
                            <th key={key} className="px-3 py-2 text-left text-label text-muted font-medium">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.map((row, idx) => (
                          <tr key={idx} className="border-t border-border">
                            {Object.values(row).map((value, cellIdx) => (
                              <td key={cellIdx} className="px-3 py-2 text-body">
                                {value}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-4">
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setCsvFile(null);
                    setImportPreview([]);
                    setSelectedList(null);
                  }}
                  className="px-4 py-2.5 bg-surface border border-border rounded-base hover:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] font-medium transition-colors duration-150"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={!csvFile || !selectedList}
                  className="px-4 py-2.5 bg-primary text-text-inverse rounded-base hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Import
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Recipient Modal */}
      {showAddRecipientModal && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
          onMouseDown={e => { if (e.target === e.currentTarget) setShowAddRecipientModal(false); }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 overflow-hidden"
            onMouseDown={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-recipient-title"
          >
            <h3 id="add-recipient-title" className="text-heading font-semibold text-base mb-4">Add Email to List</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-label text-muted mb-2">Select List</label>
                <select
                  value={selectedList || ''}
                  onChange={(e) => setSelectedList(e.target.value)}
                  className="w-full h-11 px-3 border border-border-strong rounded-base bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body"
                >
                  <option value="">Choose a list...</option>
                  {mailingLists.map((list) => (
                    <option key={list.id} value={list.id}>
                      {list.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-label text-muted mb-2">Email *</label>
                <input
                  type="email"
                  value={newRecipient.email}
                  onChange={(e) => setNewRecipient({ ...newRecipient, email: e.target.value })}
                  placeholder="email@example.com"
                  className="w-full h-11 px-3 border border-border-strong rounded-base bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-subtle"
                />
              </div>
              <div>
                <label className="block text-label text-muted mb-2">First Name</label>
                <input
                  type="text"
                  value={newRecipient.firstName}
                  onChange={(e) => setNewRecipient({ ...newRecipient, firstName: e.target.value })}
                  placeholder="John"
                  className="w-full h-11 px-3 border border-border-strong rounded-base bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-subtle"
                />
              </div>
              <div>
                <label className="block text-label text-muted mb-2">Last Name</label>
                <input
                  type="text"
                  value={newRecipient.lastName}
                  onChange={(e) => setNewRecipient({ ...newRecipient, lastName: e.target.value })}
                  placeholder="Doe"
                  className="w-full h-11 px-3 border border-border-strong rounded-base bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-subtle"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  onClick={() => {
                    setShowAddRecipientModal(false);
                    setNewRecipient({ email: '', firstName: '', lastName: '' });
                    setSelectedList(null);
                  }}
                  className="px-4 py-2.5 bg-surface border border-border rounded-base hover:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] font-medium transition-colors duration-150"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddRecipient}
                  disabled={!newRecipient.email || !selectedList}
                  className="px-4 py-2.5 bg-primary text-text-inverse rounded-base hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Confirm Dialog Mount */}
      {ConfirmDialogMount}
    </div>
  );
}
