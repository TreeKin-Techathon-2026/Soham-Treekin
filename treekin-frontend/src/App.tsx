import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Layout
import { MainLayout } from './components/layout';

// Pages
import { LoginPage, RegisterPage } from './pages/Auth';
import { HomePage } from './pages/Home';
import { ProfilePage } from './pages/Profile';
import { PlantTreePage } from './pages/PlantTree';
import { ExplorePage } from './pages/Explore';
import { ChatPage } from './pages/Chat';
import { LeaderboardPage } from './pages/Leaderboard';
import CarbonCredits from './pages/CarbonCredits/CarbonCredits';
import { GoGreenMapPage } from './pages/GoGreenMap';

// Store
import { useAuthStore } from './store/authStore';

// Styles
import './App.css';

// Create Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AppContent() {
  const { token, isInitialized, initialize } = useAuthStore();

  // Initialize auth on mount
  useEffect(() => {
    initialize();
  }, []);

  // Show loading while initializing
  if (!isInitialized) {
    return (
      <div className="app-loading">
        <div className="loading-spinner" />
        <p>Loading TreeKin...</p>
      </div>
    );
  }

  // Not logged in - show auth pages
  if (!token) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Logged in - show main app
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/plant" element={<PlantTreePage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/carbon-credits" element={<CarbonCredits />} />
        <Route path="/go-green-map" element={<GoGreenMapPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
