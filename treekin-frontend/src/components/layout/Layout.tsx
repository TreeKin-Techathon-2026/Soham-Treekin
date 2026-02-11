import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Home, Compass, Plus, Trophy, User, Bell } from 'lucide-react';
import './Layout.css';

export const MainLayout: React.FC = () => {
    return (
        <div className="app-layout">
            {/* Header */}
            <header className="app-header">
                <div className="header-inner">
                    <div className="logo-area">
                        <span className="logo-emoji">🌳</span>
                        <h1 className="logo-title">TreeKin</h1>
                    </div>
                    <div className="header-actions">
                        <button className="header-btn" title="Notifications">
                            <Bell size={22} />
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
                <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <Home size={24} />
                    <span>Home</span>
                </NavLink>
                <NavLink to="/explore" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <Compass size={24} />
                    <span>Explore</span>
                </NavLink>
                <NavLink to="/plant" className={({ isActive }) => `nav-item nav-plant ${isActive ? 'active' : ''}`}>
                    <div className="plant-fab">
                        <Plus size={26} strokeWidth={2.5} />
                    </div>
                </NavLink>
                <NavLink to="/leaderboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <Trophy size={24} />
                    <span>Ranks</span>
                </NavLink>
                <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <User size={24} />
                    <span>Profile</span>
                </NavLink>
            </nav>
        </div>
    );
};
