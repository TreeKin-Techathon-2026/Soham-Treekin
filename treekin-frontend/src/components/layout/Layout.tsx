import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, Search, Plus, MessageCircle, User, Bell, LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import './Layout.css';

export const MainLayout: React.FC = () => {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="app-layout">
            {/* Header */}
            <header className="app-header">
                <div className="header-inner">
                    <div className="logo-area">
                        <span className="logo-emoji">🌳</span>
                        <div className="logo-text">
                            <h1>TreeKin</h1>
                            <span className="tagline">Plant • Adopt • Connect</span>
                        </div>
                    </div>
                    <div className="header-actions">
                        <button className="header-btn" title="Notifications">
                            <Bell size={20} />
                        </button>
                        <button className="header-btn" onClick={handleLogout} title="Logout">
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="app-main">
                <Outlet />
            </main>

            {/* Bottom Navigation */}
            <nav className="bottom-nav">
                <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <Home size={22} />
                    <span>Home</span>
                </NavLink>
                <NavLink to="/explore" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <Search size={22} />
                    <span>Explore</span>
                </NavLink>
                <NavLink to="/plant" className="nav-item add-btn">
                    <Plus size={24} />
                </NavLink>
                <NavLink to="/chat" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <MessageCircle size={22} />
                    <span>Chat</span>
                </NavLink>
                <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <User size={22} />
                    <span>Profile</span>
                </NavLink>
            </nav>
        </div>
    );
};
