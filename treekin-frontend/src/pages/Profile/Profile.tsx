import React, { useEffect, useState } from 'react';
import { TreeDeciduous, Leaf, Award, Settings, ChevronRight } from 'lucide-react';
import { Card, Button } from '../../components/common';
import { useAuthStore } from '../../store/authStore';
import { treesAPI, carbonAPI } from '../../services/api';
import './Profile.css';

interface WalletData {
    balance: number;
    total_earned: number;
    total_spent: number;
}

export const ProfilePage: React.FC = () => {
    const { user, logout } = useAuthStore();
    const [wallet, setWallet] = useState<WalletData | null>(null);
    const [myTrees, setMyTrees] = useState<any[]>([]);

    useEffect(() => {
        loadProfileData();
    }, []);

    const loadProfileData = async () => {
        try {
            const [walletRes, treesRes] = await Promise.all([
                carbonAPI.getWallet(),
                treesAPI.getMyTrees(),
            ]);
            setWallet(walletRes.data);
            setMyTrees(treesRes.data);
        } catch (error) {
            console.error('Failed to load profile data:', error);
        }
    };

    return (
        <div className="profile-page">
            {/* Profile Header */}
            <div className="profile-header">
                <div className="profile-avatar">
                    {user?.avatar_url ? (
                        <img src={user.avatar_url} alt="" />
                    ) : (
                        <span>{(user?.display_name || user?.username || 'U')[0].toUpperCase()}</span>
                    )}
                </div>
                <h1 className="profile-name">{user?.display_name || user?.username}</h1>
                <p className="profile-username">@{user?.username}</p>
                {user?.bio && <p className="profile-bio">{user.bio}</p>}
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                <div className="stat-card">
                    <TreeDeciduous size={24} className="stat-icon green" />
                    <span className="stat-number">{user?.trees_planted || 0}</span>
                    <span className="stat-name">Planted</span>
                </div>
                <div className="stat-card">
                    <Leaf size={24} className="stat-icon teal" />
                    <span className="stat-number">{user?.trees_adopted || 0}</span>
                    <span className="stat-name">Adopted</span>
                </div>
                <div className="stat-card">
                    <Award size={24} className="stat-icon yellow" />
                    <span className="stat-number">{(user?.total_carbon_saved || 0).toFixed(1)}</span>
                    <span className="stat-name">kg CO₂</span>
                </div>
            </div>

            {/* TREDITS Wallet */}
            <Card className="wallet-card">
                <div className="wallet-header">
                    <span className="wallet-label">TREDITS Balance</span>
                    <span className="wallet-balance">{wallet?.balance?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="wallet-stats">
                    <div className="wallet-stat">
                        <span className="ws-label">Earned</span>
                        <span className="ws-value green">+{wallet?.total_earned?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="wallet-stat">
                        <span className="ws-label">Spent</span>
                        <span className="ws-value red">-{wallet?.total_spent?.toFixed(2) || '0.00'}</span>
                    </div>
                </div>
            </Card>

            {/* My Trees Preview */}
            <div className="trees-section">
                <div className="section-header">
                    <h2>My Trees</h2>
                    <button className="see-all">See all <ChevronRight size={16} /></button>
                </div>

                {myTrees.length === 0 ? (
                    <Card className="empty-trees">
                        <p>You haven't planted or adopted any trees yet</p>
                        <Button onClick={() => window.location.href = '/plant'}>Plant Your First Tree</Button>
                    </Card>
                ) : (
                    <div className="trees-scroll">
                        {myTrees.slice(0, 5).map((tree) => (
                            <Card key={tree.id} className="tree-mini-card" hoverable>
                                <div className="tree-mini-image">
                                    {tree.main_image_url ? (
                                        <img src={tree.main_image_url} alt={tree.name} />
                                    ) : (
                                        <span>🌳</span>
                                    )}
                                </div>
                                <span className="tree-mini-name">{tree.name}</span>
                                <span className="tree-mini-status">{tree.status}</span>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Settings Menu */}
            <div className="settings-section">
                <button className="settings-item">
                    <Settings size={20} />
                    <span>Edit Profile</span>
                    <ChevronRight size={18} />
                </button>
                <button className="settings-item danger" onClick={logout}>
                    <span>Logout</span>
                    <ChevronRight size={18} />
                </button>
            </div>
        </div>
    );
};
