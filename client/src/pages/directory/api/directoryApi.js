import api from '../../../utils/api';

// ── Metadata + stats ──
export const fetchDirectoryMeta = () => api.get('/directory/meta').then((res) => res.data);
export const fetchDirectoryStats = () => api.get('/directory/stats').then((res) => res.data);

// ── Members ──
export const fetchMembers = (params = {}) =>
  api.get('/directory/members', { params }).then((res) => res.data);

export const fetchMember = (id) =>
  api.get(`/directory/members/${id}`).then((res) => res.data.member);

export const createMember = (data) =>
  api.post('/directory/members', data).then((res) => res.data.member);

export const updateMember = (id, data) =>
  api.put(`/directory/members/${id}`, data).then((res) => res.data.member);

export const updateMemberStatus = (id, status) =>
  api.patch(`/directory/members/${id}/status`, { status }).then((res) => res.data.member);

export const updateMemberRole = (id, role) =>
  api.patch(`/directory/members/${id}/role`, { role }).then((res) => res.data.member);

export const deleteMember = (id) =>
  api.delete(`/directory/members/${id}`).then((res) => res.data);

export const fetchMemberHistory = (id) =>
  api.get(`/directory/members/${id}/history`).then((res) => res.data.logs);

export const checkDuplicates = (q) =>
  api.get('/directory/check-duplicates', { params: { q } }).then((res) => res.data.matches);

export const uploadMemberPhoto = (id, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(`/directory/members/${id}/photo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((res) => res.data.member);
};

// ── Self-service (My Profile) ──
// /me returns { member, household } — household is the mutual, active linked
// spouse ([] when there isn't one).
export const fetchMyProfile = () => api.get('/directory/me').then((res) => res.data);
export const updateMyProfile = (data) => api.put('/directory/me', data).then((res) => res.data.member);
export const updateHouseholdMember = (id, data) =>
  api.put(`/directory/me/household/${id}`, data).then((res) => res.data.member);
