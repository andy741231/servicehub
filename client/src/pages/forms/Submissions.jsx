import { useState } from 'react';
import { Download, Search, Filter, Calendar, ChevronDown, Eye, Trash2 } from 'lucide-react';
import Papa from 'papaparse';
import { useConfirm } from '../../components/Dialog';

export default function Submissions() {
  const { confirmDialog, ConfirmDialogMount } = useConfirm();
  const [submissions, setSubmissions] = useState([
    {
      id: 1,
      submittedAt: '2024-06-24T10:30:00Z',
      data: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        message: 'This is a test submission',
      },
    },
    {
      id: 2,
      submittedAt: '2024-06-24T11:45:00Z',
      data: {
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+9876543210',
        message: 'Another test submission',
      },
    },
  ]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('submittedAt');
  const [sortOrder, setSortOrder] = useState('desc');

  const handleExportCSV = () => {
    if (submissions.length === 0) return;

    const csvData = submissions.map((sub) => ({
      ID: sub.id,
      'Submitted At': new Date(sub.submittedAt).toLocaleString(),
      ...sub.data,
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'form-submissions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteSubmission = async (id) => {
    const ok = await confirmDialog({
      title: 'Delete this submission?',
      message: 'This action cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (ok) {
      setSubmissions(submissions.filter((sub) => sub.id !== id));
      if (selectedSubmission?.id === id) {
        setSelectedSubmission(null);
      }
    }
  };

  const filteredSubmissions = submissions.filter((sub) => {
    const searchLower = searchQuery.toLowerCase();
    return Object.values(sub.data).some(
      (value) => value && value.toString().toLowerCase().includes(searchLower)
    );
  });

  const sortedSubmissions = [...filteredSubmissions].sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'submittedAt') {
      comparison = new Date(a.submittedAt) - new Date(b.submittedAt);
    } else {
      comparison = String(a.data[sortBy] || '').localeCompare(String(b.data[sortBy] || ''));
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const allFields = submissions.length > 0 ? Object.keys(submissions[0].data) : [];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-base">Form Submissions</h1>
          <p className="text-body text-muted mt-1">
            View and manage form submissions
          </p>
        </div>

        {/* Toolbar */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle" />
            <input
              type="text"
              placeholder="Search submissions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-muted min-h-[44px]"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={submissions.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-surface-raised border border-border rounded-base hover:bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export to CSV"
            >
              <Download className="h-4 w-4" />
              <span className="text-body">Export CSV</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="bg-surface-raised border border-border rounded-base p-4">
            <div className="text-small text-muted">Total Submissions</div>
            <div className="text-2xl font-bold text-base mt-1">{submissions.length}</div>
          </div>
          <div className="bg-surface-raised border border-border rounded-base p-4">
            <div className="text-small text-muted">Today</div>
            <div className="text-2xl font-bold text-base mt-1">
              {submissions.filter(
                (sub) =>
                  new Date(sub.submittedAt).toDateString() === new Date().toDateString()
              ).length}
            </div>
          </div>
          <div className="bg-surface-raised border border-border rounded-base p-4">
            <div className="text-small text-muted">This Week</div>
            <div className="text-2xl font-bold text-base mt-1">
              {submissions.filter((sub) => {
                const subDate = new Date(sub.submittedAt);
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return subDate >= weekAgo;
              }).length}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-surface-raised border border-border rounded-base overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-small font-medium text-base">
                    <button
                      onClick={() => {
                        if (sortBy === 'submittedAt') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortBy('submittedAt');
                          setSortOrder('desc');
                        }
                      }}
                      className="flex items-center gap-1 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded"
                    >
                      Submitted
                      <ChevronDown className={`h-4 w-4 ${sortBy === 'submittedAt' && sortOrder === 'desc' ? 'rotate-180' : ''}`} />
                    </button>
                  </th>
                  {allFields.map((field) => (
                    <th
                      key={field}
                      className="px-4 py-3 text-left text-small font-medium text-base"
                    >
                      <button
                        onClick={() => {
                          if (sortBy === field) {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortBy(field);
                            setSortOrder('asc');
                          }
                        }}
                        className="flex items-center gap-1 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded capitalize"
                      >
                        {field}
                        <ChevronDown className={`h-4 w-4 ${sortBy === field && sortOrder === 'desc' ? 'rotate-180' : ''}`} />
                      </button>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right text-small font-medium text-base">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={allFields.length + 2} className="px-4 py-8 text-center text-body text-muted">
                      {searchQuery ? 'No submissions match your search' : 'No submissions yet'}
                    </td>
                  </tr>
                ) : (
                  sortedSubmissions.map((submission) => (
                    <tr
                      key={submission.id}
                      className="hover:bg-surface transition-colors duration-150"
                    >
                      <td className="px-4 py-3 text-small text-base">
                        {new Date(submission.submittedAt).toLocaleString()}
                      </td>
                      {allFields.map((field) => (
                        <td key={field} className="px-4 py-3 text-small text-base">
                          {submission.data[field] || '-'}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedSubmission(submission)}
                            className="p-2 text-subtle hover:text-muted hover:bg-surface-raised rounded focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-w-[36px] min-h-[36px] transition-colors duration-150"
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSubmission(submission.id)}
                            className="p-2 text-subtle hover:text-red-500 hover:bg-red-50 rounded focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 min-w-[36px] min-h-[36px] transition-colors duration-150"
                            title="Delete submission"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Modal */}
        {selectedSubmission && (
          <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]"
            onMouseDown={e => { if (e.target === e.currentTarget) setSelectedSubmission(null); }}
          >
            <div 
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
              onMouseDown={e => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="submission-details-title"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 id="submission-details-title" className="text-lg font-bold text-base">Submission Details</h2>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="p-2 text-subtle hover:text-muted hover:bg-surface-raised rounded focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-w-[36px] min-h-[36px] transition-colors duration-150"
                >
                  ×
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="mb-4">
                  <div className="text-small text-muted">Submitted At</div>
                  <div className="text-body text-base">
                    {new Date(selectedSubmission.submittedAt).toLocaleString()}
                  </div>
                </div>
                <div className="space-y-4">
                  {Object.entries(selectedSubmission.data).map(([key, value]) => (
                    <div key={key}>
                      <div className="text-small font-medium text-base capitalize">{key}</div>
                      <div className="text-body text-base mt-1">{value || '-'}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 p-4 border-t border-border">
                <button
                  onClick={() => handleDeleteSubmission(selectedSubmission.id)}
                  className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-base hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 min-h-[44px] transition-colors duration-150"
                >
                  Delete
                </button>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="px-4 py-2 bg-surface-raised border border-border rounded-base hover:bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] transition-colors duration-150"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Confirm Dialog Mount */}
        {ConfirmDialogMount}
      </div>
    </div>
  );
}