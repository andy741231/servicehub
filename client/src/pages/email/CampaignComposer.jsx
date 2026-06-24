import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, Eye, Send, Clock, ArrowLeft, Upload, Users, Plus } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import useEmailStore from './store/emailStore';
import { useAlert } from '../../components/Dialog';

export default function CampaignComposer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  
  const { mailingLists, fetchMailingLists, createCampaign, updateCampaign, sendCampaign, loading } = useEmailStore();
  const { alertDialog, AlertDialogMount } = useAlert();

  const [campaign, setCampaign] = useState({
    name: '',
    subject: '',
    bodyHtml: '',
    mailingListId: '',
    status: 'draft'
  });

  const [showPreview, setShowPreview] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');

  useEffect(() => {
    fetchMailingLists();
    if (isEditing && id) {
      // TODO: Fetch existing campaign data
    }
  }, [isEditing, id, fetchMailingLists]);

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

    try {
      if (isEditing && id) {
        await updateCampaign(id, campaign);
      } else {
        await createCampaign(campaign);
        navigate('/hub-admin/email');
      }
    } catch (error) {
      console.error('Failed to save campaign:', error);
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
          <div className="bg-surface border border-border rounded-card shadow-card p-8">
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
        {/* Top Toolbar */}
        <div className="h-14 bg-surface border-b border-border flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/hub-admin/email')}
              className="p-2 min-h-[44px] min-w-[44px] text-subtle hover:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 transition-colors"
              title="Back to Dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="h-6 w-px bg-border" />
            <h1 className="text-heading font-semibold text-base">
              {isEditing ? 'Edit Campaign' : 'New Campaign'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-2 px-3 py-2 bg-surface-raised border border-border rounded-base hover:bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] font-medium transition-colors duration-150"
              title="Preview campaign"
            >
              <Eye className="h-4 w-4" />
              <span className="text-body">Preview</span>
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-3 py-2 bg-surface-raised border border-border rounded-base hover:bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] font-medium transition-colors duration-150"
              title="Save as draft"
            >
              <Save className="h-4 w-4" />
              <span className="text-body">Save Draft</span>
            </button>
            <button
              onClick={() => setShowSchedule(true)}
              className="flex items-center gap-2 px-3 py-2 bg-surface-raised border border-border rounded-base hover:bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] font-medium transition-colors duration-150"
              title="Schedule campaign"
            >
              <Clock className="h-4 w-4" />
              <span className="text-body">Schedule</span>
            </button>
            <button
              onClick={handleSend}
              className="flex items-center gap-2 px-3 py-2 bg-primary text-text-inverse rounded-base hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] font-medium transition-colors duration-150"
              title="Send immediately"
            >
              <Send className="h-4 w-4" />
              <span className="text-body">Send Now</span>
            </button>
          </div>
        </div>

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
                    onChange={(e) => setCampaign({ ...campaign, name: e.target.value })}
                    placeholder="e.g., Summer Newsletter"
                    className="w-full h-11 px-3 border border-border-strong rounded-base bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-subtle"
                  />
                </div>
                <div>
                  <label className="block text-label text-muted mb-2">Subject Line</label>
                  <input
                    type="text"
                    value={campaign.subject}
                    onChange={(e) => setCampaign({ ...campaign, subject: e.target.value })}
                    placeholder="e.g., Your Summer Updates Are Here"
                    className="w-full h-11 px-3 border border-border-strong rounded-base bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-subtle"
                  />
                </div>
                <div>
                  <label className="block text-label text-muted mb-2">Recipient List</label>
                  <select
                    value={campaign.mailingListId}
                    onChange={(e) => setCampaign({ ...campaign, mailingListId: e.target.value })}
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
                  onChange={(content) => setCampaign({ ...campaign, bodyHtml: content })}
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
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 overflow-hidden"
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
                  className="px-4 py-2.5 bg-primary text-text-inverse rounded-base hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
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
