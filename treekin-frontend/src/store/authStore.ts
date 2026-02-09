import { create } from 'zustand';
import { authAPI } from '../services/api';

interface User {
    id: number;
    email: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
    bio?: string;
    tredits_balance: number;
    total_carbon_saved: number;
    trees_planted: number;
    trees_adopted: number;
    is_verified: boolean;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    error: string | null;
    isInitialized: boolean;

    initialize: () => Promise<void>;
    login: (email: string, password: string) => Promise<boolean>;
    register: (email: string, username: string, password: string, displayName?: string) => Promise<boolean>;
    logout: () => void;
    clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    token: null,
    isLoading: false,
    error: null,
    isInitialized: false,

    initialize: async () => {
        const savedToken = localStorage.getItem('treekin_token');
        if (savedToken) {
            set({ token: savedToken });
            try {
                const response = await authAPI.getMe();
                set({ user: response.data, isInitialized: true });
            } catch {
                // Token invalid, clear it
                localStorage.removeItem('treekin_token');
                set({ token: null, user: null, isInitialized: true });
            }
        } else {
            set({ isInitialized: true });
        }
    },

    login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
            console.log('[Auth] Attempting login for:', email);
            const response = await authAPI.login(email, password);
            console.log('[Auth] Login response:', response.data);
            const { access_token } = response.data;

            localStorage.setItem('treekin_token', access_token);
            set({ token: access_token });
            console.log('[Auth] Token saved, fetching user...');

            // Fetch user data
            const userResponse = await authAPI.getMe();
            console.log('[Auth] User data:', userResponse.data);
            set({ user: userResponse.data, isLoading: false });

            return true;
        } catch (error: any) {
            console.error('[Auth] Login error:', error);
            console.error('[Auth] Error response:', error.response?.data);
            set({
                error: error.response?.data?.detail || 'Login failed',
                isLoading: false
            });
            return false;
        }
    },

    register: async (email: string, username: string, password: string, displayName?: string) => {
        set({ isLoading: true, error: null });
        try {
            await authAPI.register({ email, username, password, display_name: displayName });
            // Auto-login after registration
            return await get().login(email, password);
        } catch (error: any) {
            set({
                error: error.response?.data?.detail || 'Registration failed',
                isLoading: false
            });
            return false;
        }
    },

    logout: () => {
        localStorage.removeItem('treekin_token');
        set({ user: null, token: null, isLoading: false, error: null });
    },

    clearError: () => set({ error: null }),
}));
