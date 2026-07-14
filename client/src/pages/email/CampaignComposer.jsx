import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, Eye, Send, Clock, ArrowLeft } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import BuilderHistoryControls from '../../components/builder/BuilderHistoryControls';
import BuilderPreviewControls from '../../components/builder/BuilderPreviewControls';
import BuilderSaveStatus from '../../components/builder/BuilderSaveStatus';
import BuilderToolbar from '../../components/builder/BuilderToolbar';
import useDocumentHistory from '../../components/builder/useDocumentHistory';
import useEmailStore from './store/emailStore';
import api from '../../utils/api';
import { useAlert } from '../../components/Dialog';

export default function CampaignComposer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  
  const { mailingLists, fetchMailingLists, fetchCampaignById, createCampaign, updateCampaign, sendCampaign, loading } = useEmailStore();
  const { alertDialog, AlertDialogMount } = useAlert();
  const { value: campaign, commit: setCampaign, reset, undo, redo, canUndo, canRedo } = useDocumentHistory({
    name: '',
    subject: '',
    bodyHtml: '',
    mailingListId: '',
    status: 'draft'
  });

  const [showPreview, setShowPreview] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [previewDevice, setPreviewDevice] = useState('desktop');
  const [saveStatus, setSaveStatus] = useState('idle');
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    fetchMailingLists();
    api.get('/email/templates').then(({ data }) => setTemplates(data)).catch(() => setTemplates([]));
    if (!isEditing || !id) return;
    fetchCampaignById(id)
      .then((loadedCampaign) => reset({
        name: loadedCampaign.name || '',
        subject: loadedCampaign.subject || '',
        bodyHtml: loadedCampaign.bodyHtml || '',
        mailingListId: loadedCampaign.mailingListId || '',
        status: loadedCampaign.status || 'draft'
      }))
      .catch((error) => console.error('Failed to load campaign:', error));
  }, [fetchCampaignById, fetchMailingLists, id, isEditing, reset]);

  const handleSave = async () => {
    // Validate required fields
    if (!campaign.name || !campaign.subject || !campaign.bodyHtml) {
      await alertDialog({
        title: 'Missing Information',
        message: 'Please fill in campaign name, subject, and content.',
        variant: 'warning',
      });
      return;
    }

    setSaveStatus('saving');
    try {
      if (isEditing && id) {
        await updateCampaign(id, campaign);
      } else {
        await createCampaign(campaign);
        navigate('/hub-admin/email');
      }
      setSaveStatus('saved');
    } catch (error) {
      console.error('Failed to save campaign:', error);
      setSaveStatus('error');
      await alertDialog({
        title: 'Save Failed',
        message: 'Failed to save campaign. Please try again.',
        variant: 'danger',
      });
    }
  };

  const handleSend = async () => {
    // Validate required fields
    if (!campaign.name || !campaign.subject || !campaign.bodyHtml || !campaign.mailingListId) {
      await alertDialog({
        title: 'Missing Information',
        message: 'Please fill in all required fields: campaign name, subject, content, and recipient list.',
        variant: 'warning',
      });
      return;
    }

    try {
      if (isEditing && id) {
        await sendCampaign(id);
        navigate('/hub-admin/email');
      } else {
        // First create the campaign, then send it
        const created = await createCampaign(campaign);
        await sendCampaign(created.id);
        navigate('/hub-admin/email');
      }
    } catch (error) {
      console.error('Failed to send campaign:', error);
      await alertDialog({
        title: 'Send Failed',
        message: 'Failed to send campaign. Please try again.',
        variant: 'danger',
      });
    }
  };

  const handleSchedule = async () => {
    if (scheduledDate) {
      try {
        const campaignData = { ...campaign, scheduledAt: scheduledDate, status: 'scheduled' };
        if (isEditing && id) {
          await updateCampaign(id, campaignData);
        } else {
          await createCampaign(campaignData);
        }
        setShowSchedule(false);
        navigate('/hub-admin/email');
      } catch (error) {
        console.error('Failed to schedule campaign:', error);
      }
    }
  };

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'color': [] }, { 'background': [] }],
      ['link', 'image'],
      ['clean']
    ]
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      const isInputTarget = ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName) || event.target.isContentEditable;
      if (isInputTarget) return;
      const modifier = event.ctrlKey || event.metaKey;
      if (modifier && event.key.toLowerCase() === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if (modifier && (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey))) {
        event.preventDefault();
        redo();
      } else if (modifier && event.key.toLowerCase() === 's') {
        event.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, redo, undo]);

  if (showPreview) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-display font-bold text-base">Preview</h2>
            <button
              onClick={() => setShowPreview(false)}
              className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-border rounded-base hover:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] font-medium transition-colors duration-150"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-body">Back to Editor</span>
            </button>
          </div>
          <div className={`${previewDevice === 'mobile' ? 'mx-auto max-w-sm' : previewDevice === 'tablet' ? 'mx-auto max-w-xl' : ''} bg-surface border border-border rounded-card shadow-card p-8`}>
            <h1 className="text-heading font-semibold text-base mb-4">{campaign.subject || 'Subject Line'}</h1>
            <div 
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: campaign.bodyHtml || '<p>Email content will appear here...</p>' }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <BuilderToolbar
          title={isEditing ? 'Edit Campaign' : 'New Campaign'}
          description="Email campaign draft"
          onBack={() => navigate('/hub-admin/email')}
          status={<BuilderSaveStatus status={saveStatus} />}
        >
          <BuilderHistoryControls onUndo={undo} onRedo={redo} canUndo={canUndo} canRedo={canRedo} />
          <BuilderPreviewControls value={previewDevice} onChange={setPreviewDevice} />
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="flex min-h-[40px] items-center gap-2 rounded-base border border-border bg-surface-raised px-3 py-2 text-body font-medium transition-colors hover:bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
            title="Preview campaign"
          >
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">Preview</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="flex min-h-[40px] items-center gap-2 rounded-base border border-border bg-surface-raised px-3 py-2 text-body font-medium transition-colors hover:bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
            title="Save as draft"
          >
            <Save className="h-4 w-4" />
            <span className="hidden sm:inline">Save Draft</span>
          </button>
          <button
            type="button"
            onClick={() => setShowSchedule(true)}
            className="flex min-h-[40px] items-center gap-2 rounded-base border border-border bg-surface-raised px-3 py-2 text-body font-medium transition-colors hover:bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
            title="Schedule campaign"
          >
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Schedule</span>
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={loading}
            className="flex min-h-[40px] items-center gap-2 rounded-base bg-primary px-3 py-2 text-body font-medium text-inverse transition-colors hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
            title="Send immediately"
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Send Now</span>
          </button>
        </BuilderToolbar>

        {/* Editor Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-surface border border-border rounded-card shadow-card p-6 mb-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-label text-muted mb-2">Campaign Name</label>
                  <input
                    type="text"
                    value={campaign.name}
                    onChange={(e) => setCampaign((current) => ({ ...current, name: e.target.value }))}
                    placeholder="e.g., Summer Newsletter"
                    className="w-full h-11 px-3 border border-border-strong rounded-base bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-subtle"
                  />
                </div>
                <div>
                  <label className="block text-label text-muted mb-2">Start from a template</label>
                  <select
                    defaultValue=""
                    onChange={(event) => {
                      const template = templates.find((item) => item.id === event.target.value);
                      if (!template) return;
                      setCampaign((current) => ({ ...current, subject: template.subject || current.subject, bodyHtml: template.bodyHtml }));
                    }}
                    className="w-full h-11 px-3 border border-border-strong rounded-base bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body"
                  >
                    <option value="">Choose a saved template…</option>
                    {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-label text-muted mb-2">Subject Line</label>
                  <input
                    type="text"
                    value={campaign.subject}
                    onChange={(e) => setCampaign((current) => ({ ...current, subject: e.target.value }))}
                    placeholder="e.g., Your Summer Updates Are Here"
                    className="w-full h-11 px-3 border border-border-strong rounded-base bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-subtle"
                  />
                </div>
                <div>
                  <label className="block text-label text-muted mb-2">Recipient List</label>
                  <select
                    value={campaign.mailingListId}
                    onChange={(e) => setCampaign((current) => ({ ...current, mailingListId: e.target.value }))}
                    className="w-full h-11 px-3 border border-border-strong rounded-base bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body"
                  >
                    <option value="">Select a list...</option>
                    {mailingLists.map((list) => (
                      <option key={list.id} value={list.id}>
                        {list.name} ({list.count ? list.count.toLocaleString() : '0'} subscribers)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-surface border border-border rounded-card shadow-card p-6">
              <div className="mb-4">
                <label className="block text-label text-muted mb-2">Email Content</label>
                <p className="text-small text-muted mb-4">
                  Use <code className="bg-surface-raised px-1.5 py-0.5 rounded text-code">{`{{name}}`}</code> for mail-merge placeholders
                </p>
              </div>
              <div className="min-h-[400px]">
                <ReactQuill
                  theme="snow"
                  value={campaign.bodyHtml}
                  onChange={(content) => setCampaign((current) => ({ ...current, bodyHtml: content }))}
                  modules={quillModules}
                  placeholder="Write your email content here..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Modal */}
      {showSchedule && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
          onMouseDown={e => { if (e.target === e.currentTarget) setShowSchedule(false); }}
          onKeyDown={e => { if (e.key === 'Escape') setShowSchedule(false); }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 overflow-hidden animate-[fadeInScale_0.15s_ease-out]"
            onMouseDown={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="schedule-campaign-title"
          >
            <h3 id="schedule-campaign-title" className="text-heading font-semibold text-base mb-4">Schedule Campaign</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-label text-muted mb-2">Send Date & Time</label>
                <input
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full h-11 px-3 border border-border-strong rounded-base bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  onClick={() => setShowSchedule(false)}
                  className="px-4 py-2.5 bg-surface border border-border rounded-base hover:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] font-medium transition-colors duration-150"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSchedule}
                  disabled={!scheduledDate}
                  className="px-4 py-2.5 bg-primary text-inverse rounded-base hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Alert Dialog Mount */}
      <AlertDialogMount />
    </div>
  );
}
