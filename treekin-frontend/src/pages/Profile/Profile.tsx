import React, { useEffect, useState } from 'react';
import { TreeDeciduous, Leaf, Award, Settings, ChevronRight, Users, UserPlus, MapPin, Calendar } from 'lucide-react';
import { Card, Button } from '../../components/common';
import { useAuthStore } from '../../store/authStore';
import { treesAPI, carbonAPI, postsAPI } from '../../services/api';
import './Profile.css';

// Backend URL for images
const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://127.0.0.1:8000';

interface WalletData {
    balance: number;
    total_earned: number;
    total_spent: number;
}

interface TreeData {
    id: number;
    name: string;
    species: string;
    main_image_url: string | null;
    status: string;
    geo_lat: number;
    geo_lng: number;
    created_at: string;
}

interface PostData {
    id: number;
    content: string;
    image_url: string | null;
    tree_id: number;
    tree_name: string;
    likes_count: number;
    comments_count: number;
    created_at: string;
}

export const ProfilePage: React.FC = () => {
    const { user, logout } = useAuthStore();
    const [wallet, setWallet] = useState<WalletData | null>(null);
    const [myTrees, setMyTrees] = useState<TreeData[]>([]);
    const [myPosts, setMyPosts] = useState<PostData[]>([]);
    const [activeTab, setActiveTab] = useState<'trees' | 'posts'>('trees');

    useEffect(() => {
        loadProfileData();
    }, []);

    const loadProfileData = async () => {
        try {
            const [walletRes, treesRes, postsRes] = await Promise.all([
                carbonAPI.getWallet(),
                treesAPI.getMyTrees(),
                postsAPI.list({ limit: 20 }),
            ]);
            setWallet(walletRes.data);
            setMyTrees(treesRes.data);
            // Filter posts by current user
            const userPosts = postsRes.data.filter((p: any) => p.user_id === user?.id);
            setMyPosts(userPosts);
        } catch (error) {
            console.error('Failed to load profile data:', error);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };

    return (
        <div className="profile-page">
            {/* Profile Header - Instagram Style */}
            <div className="profile-header-card">
                <div className="profile-avatar">
                    {user?.avatar_url ? (
                        <img src={user.avatar_url} alt="" />
                    ) : (
                        <span>{(user?.display_name || user?.username || 'U')[0].toUpperCase()}</span>
                    )}
                </div>

                <div className="profile-info">
                    <h1 className="profile-name">{user?.display_name || user?.username}</h1>
                    <p className="profile-username">@{user?.username}</p>
                    {user?.bio && <p className="profile-bio">{user.bio}</p>}
                </div>

                {/* Followers / Following - Social Stats */}
                <div className="social-stats">
                    <div className="social-stat">
                        <span className="social-number">{user?.followers_count || 0}</span>
                        <span className="social-label">Followers</span>
                    </div>
                    <div className="social-stat">
                        <span className="social-number">{user?.following_count || 0}</span>
                        <span className="social-label">Following</span>
                    </div>
                    <div className="social-stat">
                        <span className="social-number">{myTrees.length}</span>
                        <span className="social-label">Trees</span>
                    </div>
                </div>
            </div>

            {/* Impact Stats - Green Cards */}
            <div className="impact-section">
                <h3>🌍 Your Impact</h3>
                <div className="impact-grid">
                    <div className="impact-card green">
                        <TreeDeciduous size={28} />
                        <div className="impact-data">
                            <span className="impact-number">{user?.trees_planted || 0}</span>
                            <span className="impact-label">Trees Planted</span>
                        </div>
                    </div>
                    <div className="impact-card teal">
                        <Leaf size={28} />
                        <div className="impact-data">
                            <span className="impact-number">{user?.trees_adopted || 0}</span>
                            <span className="impact-label">Trees Adopted</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Credits Section */}
            <div className="credits-section">
                {/* TREDITS Wallet */}
                <div className="credit-card tredits">
                    <div className="credit-icon">💰</div>
                    <div className="credit-info">
                        <span className="credit-amount">{wallet?.balance?.toFixed(2) || '0.00'}</span>
                        <span className="credit-label">TREDITS Earned</span>
                    </div>
                </div>

                {/* Carbon Credits */}
                <div className="credit-card carbon">
                    <div className="credit-icon">🌿</div>
                    <div className="credit-info">
                        <span className="credit-amount">{(user?.total_carbon_saved || 0).toFixed(1)} kg</span>
                        <span className="credit-label">CO₂ Saved</span>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="profile-tabs">
                <button
                    className={`tab-btn ${activeTab === 'trees' ? 'active' : ''}`}
                    onClick={() => setActiveTab('trees')}
                >
                    <TreeDeciduous size={20} />
                    My Trees
                </button>
                <button
                    className={`tab-btn ${activeTab === 'posts' ? 'active' : ''}`}
                    onClick={() => setActiveTab('posts')}
                >
                    <Award size={20} />
                    Posts
                </button>
            </div>

            {/* Trees Grid */}
            {activeTab === 'trees' && (
                <div className="trees-grid-section">
                    {myTrees.length === 0 ? (
                        <div className="empty-state">
                            <TreeDeciduous size={48} />
                            <p>No trees yet</p>
                            <Button onClick={() => window.location.href = '/plant'}>
                                Plant Your First Tree
                            </Button>
                        </div>
                    ) : (
                        <div className="trees-grid">
                            {myTrees.map((tree) => (
                                <div key={tree.id} className="tree-card">
                                    <div className="tree-image">
                                        {tree.main_image_url ? (
                                            <img src={`${API_BASE}${tree.main_image_url}`} alt={tree.name} />
                                        ) : (
                                            <div className="tree-placeholder">🌳</div>
                                        )}
                                        <span className={`tree-status-badge ${tree.status}`}>
                                            {tree.status}
                                        </span>
                                    </div>
                                    <div className="tree-details">
                                        <h4>{tree.name}</h4>
                                        <p className="tree-species">{tree.species || 'Unknown species'}</p>
                                        <div className="tree-meta">
                                            {tree.geo_lat && (
                                                <span><MapPin size={12} /> Located</span>
                                            )}
                                            <span><Calendar size={12} /> {formatDate(tree.created_at)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Posts Grid */}
            {activeTab === 'posts' && (
                <div className="posts-grid-section">
                    {myPosts.length === 0 ? (
                        <div className="empty-state">
                            <Award size={48} />
                            <p>No posts yet</p>
                            <p className="empty-hint">Share updates about your trees!</p>
                        </div>
                    ) : (
                        <div className="posts-grid">
                            {myPosts.map((post) => (
                                <div key={post.id} className="post-card">
                                    {post.image_url && (
                                        <img src={`${API_BASE}${post.image_url}`} alt="" className="post-image" />
                                    )}
                                    <p className="post-content">{post.content}</p>
                                    <div className="post-stats">
                                        <span>❤️ {post.likes_count}</span>
                                        <span>💬 {post.comments_count}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Settings */}
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
