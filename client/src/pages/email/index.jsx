import { Routes, Route, Navigate } from 'react-router-dom';
import EmailDashboard from './EmailDashboard';
import CampaignComposer from './CampaignComposer';
import MailingLists from './MailingLists';
import CampaignAnalytics from './CampaignAnalytics';

export default function EmailIndex() {
  return (
    <Routes>
      <Route index element={<EmailDashboard />} />
      <Route path="campaigns/new" element={<CampaignComposer />} />
      <Route path="campaigns/:id/edit" element={<CampaignComposer />} />
      <Route path="campaigns/:id/analytics" element={<CampaignAnalytics />} />
      <Route path="lists" element={<MailingLists />} />
      <Route path="*" element={<Navigate to="/hub-admin/email" replace />} />
    </Routes>
  );
}
