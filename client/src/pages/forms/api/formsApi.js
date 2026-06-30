import axios from 'axios';
import api from '../../../utils/api';

const PUBLIC_API = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

export const fetchForms = () => api.get('/forms').then((res) => res.data.forms);

export const fetchForm = (id) => PUBLIC_API.get(`/forms/public/${id}`).then((res) => res.data.form);

export const createForm = (form) => {
  console.log('[createForm] Input form:', form);
  const payload = {
    title: form.title,
    schema: form.schema || form,
  };
  console.log('[createForm] Payload:', payload);
  return api.post('/forms', payload).then((res) => res.data.form);
};

export const updateForm = (id, form) => {
  console.log('[updateForm] Input form:', form);
  const payload = {
    title: form.title,
    schema: form.schema || form,
  };
  console.log('[updateForm] Payload:', payload);
  return api.put(`/forms/${id}`, payload).then((res) => res.data.form);
};

export const deleteForm = (id) => api.delete(`/forms/${id}`).then((res) => res.data);

export const fetchSubmissions = (formId) => api.get(`/forms/${formId}/submissions`).then((res) => res.data.submissions);

export const submitForm = (formId, data) => PUBLIC_API.post(`/forms/public/${formId}/submissions`, {
  data,
}).then((res) => res.data.submission);

export const uploadFile = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return PUBLIC_API.post('/forms/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((res) => res.data);
};

export const fetchVersions = (formId) =>
  api.get(`/forms/${formId}/versions`).then((res) => res.data.versions);

export const restoreVersion = (formId, versionId) =>
  api.post(`/forms/${formId}/versions/${versionId}/restore`).then((res) => res.data.form);
