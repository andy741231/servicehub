import { create } from 'zustand';
import api from '../../../utils/api';

const useEmailStore = create((set, get) => ({
  campaigns: [],
  mailingLists: [],
  currentCampaign: null,
  loading: false,
  error: null,

  // Campaign actions
  fetchCampaigns: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/email/campaigns');
      set({ campaigns: response.data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  fetchCampaignById: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await api.get(`/email/campaigns/${id}`);
      set({ currentCampaign: response.data, loading: false });
      return response.data;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  createCampaign: async (campaignData) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/email/campaigns', campaignData);
      set((state) => ({
        campaigns: [response.data, ...state.campaigns],
        loading: false
      }));
      return response.data;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateCampaign: async (id, campaignData) => {
    set({ loading: true, error: null });
    try {
      const response = await api.put(`/email/campaigns/${id}`, campaignData);
      set((state) => ({
        campaigns: state.campaigns.map(c => c.id === id ? response.data : c),
        currentCampaign: response.data,
        loading: false
      }));
      return response.data;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  deleteCampaign: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/email/campaigns/${id}`);
      set((state) => ({
        campaigns: state.campaigns.filter(c => c.id !== id),
        loading: false
      }));
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  sendCampaign: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post(`/email/campaigns/${id}/send`);
      set((state) => ({
        campaigns: state.campaigns.map(c => c.id === id ? response.data : c),
        loading: false
      }));
      return response.data;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Mailing list actions
  fetchMailingLists: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/email/lists');
      set({ mailingLists: response.data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  createMailingList: async (listData) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/email/lists', listData);
      set((state) => ({
        mailingLists: [{ ...response.data, count: 0 }, ...state.mailingLists],
        loading: false
      }));
      return response.data;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateMailingList: async (id, listData) => {
    set({ loading: true, error: null });
    try {
      const response = await api.put(`/email/lists/${id}`, listData);
      set((state) => ({
        mailingLists: state.mailingLists.map(l => l.id === id ? response.data : l),
        loading: false
      }));
      return response.data;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  deleteMailingList: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/email/lists/${id}`);
      set((state) => ({
        mailingLists: state.mailingLists.filter(l => l.id !== id),
        loading: false
      }));
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  importRecipients: async (listId, recipients) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post(`/email/lists/${listId}/import`, { recipients });
      set({ loading: false });
      return response.data;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  createRecipient: async (listId, recipientData) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post(`/email/lists/${listId}/recipients`, recipientData);
      set({ loading: false });
      return response.data;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null })
}));

export default useEmailStore;
