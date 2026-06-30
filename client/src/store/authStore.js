import { create } from 'zustand';
import api from '../utils/api';

// Load persisted state from localStorage
const loadPersistedState = () => {
  try {
    const saved = localStorage.getItem('auth-storage');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load auth state:', e);
  }
  return { wasLoggedIn: false, showLoggedOutMessage: false };
};

// Save state to localStorage
const savePersistedState = (state) => {
  try {
    const toSave = { wasLoggedIn: state.wasLoggedIn, showLoggedOutMessage: state.showLoggedOutMessage };
    localStorage.setItem('auth-storage', JSON.stringify(toSave));
  } catch (e) {
    console.error('Failed to save auth state:', e);
  }
};

const persistedState = loadPersistedState();

const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  wasLoggedIn: persistedState.wasLoggedIn || false,
  showLoggedOutMessage: persistedState.showLoggedOutMessage || false,
  
  checkAuth: async () => {
    try {
      const res = await api.get('/auth/me');
      set({ user: res.data.user, isAuthenticated: true, isLoading: false, wasLoggedIn: true, showLoggedOutMessage: false });
      savePersistedState(get());
    } catch (error) {
      const currentState = get();
      set({ 
        user: null, 
        isAuthenticated: false, 
        isLoading: false, 
        showLoggedOutMessage: currentState.wasLoggedIn 
      });
      savePersistedState(get());
    }
  },
  
  login: async (username, password, rememberMe = false) => {
    const res = await api.post('/auth/login', { username, password, rememberMe });
    set({ user: res.data.user, isAuthenticated: true, wasLoggedIn: true, showLoggedOutMessage: false });
    savePersistedState(get());
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Server may reject an expired access token; still clear local state.
    }
    set({ user: null, isAuthenticated: false, wasLoggedIn: true, showLoggedOutMessage: true });
    savePersistedState(get());
  },

  
  dismissLoggedOutMessage: () => {
    set({ showLoggedOutMessage: false, wasLoggedIn: false });
    savePersistedState(get());
  },
  
  // Helper method to set state from outside (used by API interceptor)
  setState: (newState) => {
    set(newState);
    savePersistedState(get());
  },
}));

// Listen for storage events to sync state across tabs
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'auth-storage' && e.newValue) {
      try {
        const newState = JSON.parse(e.newValue);
        useAuthStore.setState({
          wasLoggedIn: newState.wasLoggedIn,
          showLoggedOutMessage: newState.showLoggedOutMessage
        });
      } catch (err) {
        console.error('Failed to parse auth state from storage event:', err);
      }
    }
  });
}

export default useAuthStore;
