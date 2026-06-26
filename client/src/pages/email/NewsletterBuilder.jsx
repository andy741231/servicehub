import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Eye, Send, Plus, Trash2 } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export default function NewsletterBuilder() {
  const navigate = useNavigate();
  const [subject, setSubject] = useState('');
  const [fromName, setFromName] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link', 'image'],
      ['clean']
    ],
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'link', 'image'
  ];

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsSaving(false);
    navigate('/hub-admin/email');
  };

  const handlePreview = () => {
    // Preview functionality
    console.log('Preview newsletter');
  };

  const handleSend = () => {
    // Send functionality
    console.log('Send newsletter');
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-background">
      {/* Header */}
      <div className="bg-surface border-b border-border px-8 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/hub-admin/email')}
            className="p-2 text-subtle hover:text-muted hover:bg-surface-raised rounded focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-w-[36px] min-h-[36px] transition-colors duration-150"
            title="Back to campaigns"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-base">New Newsletter Campaign</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePreview}
            className="flex items-center gap-2 px-4 py-2 bg-surface-raised border border-border rounded-base hover:bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] transition-colors duration-150"
          >
            <Eye className="h-4 w-4" />
            <span className="text-body">Preview</span>
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-base hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            <span className="text-body">{isSaving ? 'Saving...' : 'Save Draft'}</span>
          </button>
          <button
            onClick={handleSend}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-base hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-1 min-h-[44px] transition-colors duration-150"
          >
            <Send className="h-4 w-4" />
            <span className="text-body">Send</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Campaign Details */}
          <div className="bg-surface-raised border border-border rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-bold text-base">Campaign Details</h2>
            
            <div>
              <label htmlFor="subject" className="block text-small font-medium text-base mb-1.5">
                Subject Line *
              </label>
              <input
                id="subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter email subject line"
                className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-muted min-h-[44px]"
              />
            </div>

            <div>
              <label htmlFor="fromName" className="block text-small font-medium text-base mb-1.5">
                From Name *
              </label>
              <input
                id="fromName"
                type="text"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="e.g., Service Hub Team"
                className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-muted min-h-[44px]"
              />
            </div>

            <div>
              <label htmlFor="previewText" className="block text-small font-medium text-base mb-1.5">
                Preview Text
              </label>
              <input
                id="previewText"
                type="text"
                value={previewText}
                onChange={(e) => setPreviewText(e.target.value)}
                placeholder="Text shown in inbox preview"
                className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-muted min-h-[44px]"
              />
            </div>
          </div>

          {/* Content Editor */}
          <div className="bg-surface-raised border border-border rounded-lg p-6">
            <h2 className="text-lg font-bold text-base mb-4">Newsletter Content</h2>
            <div className="bg-background border border-border rounded-base">
              <ReactQuill
                theme="snow"
                value={content}
                onChange={setContent}
                modules={modules}
                formats={formats}
                placeholder="Write your newsletter content here..."
                className="min-h-[400px]"
              />
            </div>
          </div>

          {/* Recipients */}
          <div className="bg-surface-raised border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-base">Recipients</h2>
              <button className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-base hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] transition-colors duration-150">
                <Plus className="h-4 w-4" />
                <span className="text-body">Add List</span>
              </button>
            </div>
            <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
              <p className="text-body text-muted">No mailing lists selected</p>
              <p className="text-small text-muted mt-1">Add a mailing list to send this campaign to subscribers</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
