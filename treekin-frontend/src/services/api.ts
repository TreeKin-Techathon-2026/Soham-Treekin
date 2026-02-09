import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

// Create axios instance
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('treekin_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('treekin_token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    register: (data: { email: string; username: string; password: string; display_name?: string }) =>
        api.post('/auth/register', data),

    login: (email: string, password: string) => {
        const params = new URLSearchParams();
        params.append('username', email);
        params.append('password', password);
        return api.post('/auth/login', params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
    },

    getMe: () => api.get('/auth/me'),
};

// Users API
export const usersAPI = {
    getUser: (id: number) => api.get(`/users/${id}`),
    updateProfile: (data: any) => api.put('/users/me', data),
    getStats: (id: number) => api.get(`/users/${id}/stats`),
};

// Trees API
export const treesAPI = {
    list: (params?: { status?: string; event_type?: string }) =>
        api.get('/trees', { params }),
    getMyTrees: () => api.get('/trees/my'),
    get: (id: number) => api.get(`/trees/${id}`),
    create: (data: any) => api.post('/trees', data),
    update: (id: number, data: any) => api.put(`/trees/${id}`, data),
    adopt: (treeId: number) => api.post('/trees/adopt', { tree_id: treeId }),
    getNearby: (lat: number, lng: number, radius?: number) =>
        api.get('/trees/nearby', { params: { lat, lng, radius_km: radius || 5 } }),
};

// Posts API
export const postsAPI = {
    list: (params?: { tree_id?: number; user_id?: number }) =>
        api.get('/posts', { params }),
    get: (id: number) => api.get(`/posts/${id}`),
    create: (data: { content: string; tree_id: number; media_urls?: string[] }) =>
        api.post('/posts', data),
    like: (id: number) => api.post(`/posts/${id}/like`),
    getComments: (id: number) => api.get(`/posts/${id}/comments`),
    addComment: (postId: number, content: string) =>
        api.post(`/posts/${postId}/comments`, { content, post_id: postId }),
    verify: (postId: number, isVerified: boolean) =>
        api.post(`/posts/${postId}/verify`, { post_id: postId, is_verified: isVerified }),
};

// Carbon API
export const carbonAPI = {
    estimate: (treeId: number) => api.get(`/carbon/estimate?tree_id=${treeId}`),
    claim: (treeId: number) => api.post(`/carbon/claim/${treeId}`),
    getWallet: () => api.get('/carbon/wallet'),
    getHistory: () => api.get('/carbon/history'),
};

// Chat API
export const chatAPI = {
    getRooms: () => api.get('/chat/rooms'),
    sendMessage: (receiverId: number, content: string) =>
        api.post('/chat/send', { receiver_id: receiverId, content }),
    getChat: (userId: number) => api.get(`/chat/room/${userId}`),
    markRead: (roomId: number) => api.post(`/chat/read/${roomId}`),
};

// Reports API
export const reportsAPI = {
    list: (params?: { report_type?: string; status?: string }) =>
        api.get('/reports', { params }),
    get: (id: number) => api.get(`/reports/${id}`),
    create: (data: any) => api.post('/reports', data),
    vote: (reportId: number, isUpvote: boolean) =>
        api.post(`/reports/${reportId}/vote`, { report_id: reportId, is_upvote: isUpvote }),
    getNearby: (lat: number, lng: number) =>
        api.get('/reports/nearby', { params: { lat, lng } }),
};

// Leaderboard API
export const leaderboardAPI = {
    getTopPlanters: (limit?: number) => api.get('/leaderboard/top-planters', { params: { limit } }),
    getTopAdopters: (limit?: number) => api.get('/leaderboard/top-adopters', { params: { limit } }),
    getTopCarbon: (limit?: number) => api.get('/leaderboard/top-carbon', { params: { limit } }),
    getTopTredits: (limit?: number) => api.get('/leaderboard/top-tredits', { params: { limit } }),
    getStats: () => api.get('/leaderboard/stats'),
};

export default api;
