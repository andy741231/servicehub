import { Routes, Route, Navigate } from 'react-router-dom';
import EmailDashboard from './EmailDashboard';
import CampaignComposer from './CampaignComposer';
import CampaignAnalytics from './CampaignAnalytics';

// Mounted at /hub-admin/email/campaigns/* by App.jsx.
export default function EmailIndex() {
  return (
    <Routes>
      <Route index element={<EmailDashboard />} />
      <Route path="new" element={<CampaignComposer />} />
      <Route path=":id/edit" element={<CampaignComposer />} />
      <Route path=":id/analytics" element={<CampaignAnalytics />} />
      <Route path="*" element={<Navigate to="/hub-admin/email/campaigns" replace />} />
    </Routes>
  );
}
