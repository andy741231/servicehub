import { useState } from 'react';
import { Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import api from '../../utils/api';

export default function TestEmail() {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('ServiceHub Test Email');
  const [html, setHtml] = useState('<p>This is a test email from ServiceHub.</p>');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!to.trim()) return;

    setSending(true);
    setResult(null);

    try {
      const response = await api.post('/email/test', { to, subject, html });
      setResult({ type: 'success', message: response.data.message || `Test email sent to ${to}` });
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to send test email';
      setResult({ type: 'error', message: msg });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-base">Send Test Email</h1>
        <p className="text-small text-muted mt-1">
          Send a quick test email via Azure Communication Services to verify email delivery is working.
        </p>
      </div>

      <form onSubmit={handleSend} className="space-y-5">
        <div>
          <label htmlFor="to" className="block text-small font-medium text-base mb-1.5">
            Recipient Email *
          </label>
          <input
            id="to"
            type="email"
            required
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="someone@example.com"
            className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-muted min-h-[44px]"
          />
        </div>

        <div>
          <label htmlFor="subject" className="block text-small font-medium text-base mb-1.5">
            Subject
          </label>
          <input
            id="subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject line"
            className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-muted min-h-[44px]"
          />
        </div>

        <div>
          <label htmlFor="html" className="block text-small font-medium text-base mb-1.5">
            HTML Body
          </label>
          <textarea
            id="html"
            rows={8}
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            placeholder="<p>Your email content here...</p>"
            className="w-full px-3 py-2 bg-background border border-border rounded-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 text-body placeholder:text-muted font-mono text-small"
          />
        </div>

        <button
          type="submit"
          disabled={sending || !to.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-base hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 min-h-[44px] transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-body">Sending...</span>
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              <span className="text-body">Send Test Email</span>
            </>
          )}
        </button>
      </form>

      {result && (
        <div
          className={`mt-6 flex items-start gap-3 p-4 rounded-base border ${
            result.type === 'success'
              ? 'bg-success-light border-success/30 text-success'
              : 'bg-danger-light border-danger/30 text-danger'
          }`}
        >
          {result.type === 'success' ? (
            <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="text-body font-medium">
              {result.type === 'success' ? 'Email sent' : 'Send failed'}
            </p>
            <p className="text-small mt-0.5 opacity-90">{result.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
