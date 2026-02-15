import React, { useEffect, useState } from 'react';
import {
    TreeDeciduous, Leaf, Award, Settings, ChevronRight, MapPin, Calendar,
    Link2, Heart, MessageCircle, Share2, Droplets, Bug, Edit2,
    CheckCircle, Shield, Star, Trophy, Target, Zap
} from 'lucide-react';
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
    event_type?: string;
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

interface TreeUpdateData {
    image_url: string;
    caption: string;
    uploaded_at: string;
}

// Mock data for sections not available via API
const MOCK_ACHIEVEMENTS = [
    { id: 1, name: 'First Roots', desc: 'Planted your first tree', date: 'Mar 2023', icon: '🌱', color: 'green', unlocked: true },
    { id: 2, name: 'Forest Guardian', desc: 'Planted 10+ trees', date: 'Jan 2024', icon: '🛡️', color: 'red', unlocked: true },
    { id: 3, name: 'Carbon Champion', desc: 'Offset 500kg CO2', date: 'Nov 2023', icon: '🏅', color: 'amber', unlocked: true },
    { id: 4, name: 'Storyteller', desc: 'Share 5 tree stories', date: 'Dec 2023', icon: '⭐', color: 'purple', unlocked: true },
    { id: 5, name: 'Legacy Builder', desc: 'Plant 25 trees', icon: '🏆', color: 'teal', unlocked: false, progress: 48 },
    { id: 6, name: 'Eco Warrior', desc: 'Offset 1 ton CO2', icon: '🌍', color: 'blue', unlocked: false, progress: 85 },
];

const MOCK_ACTIVITY = [
    { id: 1, type: 'planted', text: 'Planted a new tree', sub: "Ethan's Birth Birch", time: '2 days ago', iconColor: 'green' },
    { id: 2, type: 'liked', text: 'Emily Chen Liked your tree', sub: "Luna's Birth Oak", time: '3 days ago', iconColor: 'red', avatar: '👩' },
    { id: 3, type: 'commented', text: 'James Wilson Commented on your tree', sub: 'Beautiful story!', time: '4 days ago', iconColor: 'blue', avatar: '👨' },
    { id: 4, type: 'achievement', text: 'Earned achievement', sub: 'Forest Guardian', time: '1 week ago', iconColor: 'amber' },
    { id: 5, type: 'follow', text: 'Maria Garcia Started following you', sub: '', time: '1 week ago', iconColor: 'purple', avatar: '👩‍🦰' },
];

export const ProfilePage: React.FC = () => {
    const { user, logout } = useAuthStore();
    const [wallet, setWallet] = useState<WalletData | null>(null);
    const [myTrees, setMyTrees] = useState<TreeData[]>([]);
    const [myPosts, setMyPosts] = useState<PostData[]>([]);
    const [selectedTreeId, setSelectedTreeId] = useState<number | null>(null);
    const [treeUpdates, setTreeUpdates] = useState<TreeUpdateData[]>([]);
    const [updatesLoading, setUpdatesLoading] = useState(false);
    const [fadeKey, setFadeKey] = useState(0);

    // ... existing loadProfileData ...

    // Auto-select first tree when trees are loaded
    useEffect(() => {
        if (myTrees.length > 0 && selectedTreeId === null) {
            setSelectedTreeId(myTrees[0].id);
        }
    }, [myTrees]);

    // Fetch updates when selected tree changes
    useEffect(() => {
        if (selectedTreeId) {
            fetchUpdates(selectedTreeId);
        }
    }, [selectedTreeId]);

    const fetchUpdates = async (treeId: number) => {
        setUpdatesLoading(true);
        try {
            const res = await treesAPI.getTreeUpdates(treeId);
            setTreeUpdates(res.data);
        } catch (err) {
            console.error('Failed to fetch tree updates:', err);
            setTreeUpdates([]);
        } finally {
            setUpdatesLoading(false);
        }
    };

    const handleTreeSelect = (treeId: number) => {
        if (treeId === selectedTreeId) return;
        setFadeKey(prev => prev + 1);
        setSelectedTreeId(treeId);
    };

    const formatUpdateDate = (dateStr: string) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    };

    // ... existing formatDate ...

    // ... existing helper variables ...

    const unlockedAchievements = MOCK_ACHIEVEMENTS.filter(a => a.unlocked).length;

    // Derived state
    const treesCount = myTrees.length || user?.trees_planted || 0;
    const co2Saved = user?.total_carbon_saved || 0;
    const joinedDate = (user as any)?.created_at ? new Date((user as any).created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '2023';
    const displayName = user?.display_name || user?.username || 'Eco Warrior';

    return (
        <div className="profile-page-wrapper">
            <div className="profile-page">
                <div className="profile-header">
                    <div className="profile-cover">
                        <img src="https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&q=80&w=1200" alt="Cover" />
                    </div>
                    <div className="profile-header-content">
                        <div className="profile-avatar-container">
                            <div className="profile-avatar">
                                {user?.avatar_url ? (
                                    <img src={user.avatar_url} alt={displayName} />
                                ) : (
                                    <div className="avatar-placeholder">{displayName[0]}</div>
                                )}
                            </div>
                            <button className="edit-profile-btn">
                                <Edit2 size={16} />
                            </button>
                        </div>

                        <div className="profile-info">
                            <div className="profile-name-row">
                                <h1>{displayName}</h1>
                                {(user as any)?.is_verified && <CheckCircle size={18} className="verified-badge" />}
                            </div>
                            <p className="profile-bio">{(user as any)?.bio || 'Nature lover & Tree custodian 🌳'}</p>

                            <div className="profile-stats-row">
                                <div className="profile-stat">
                                    <span className="stat-value">{treesCount}</span>
                                    <span className="stat-label">Trees</span>
                                </div>
                                <div className="profile-stat">
                                    <span className="stat-value">{myPosts.length}</span>
                                    <span className="stat-label">Posts</span>
                                </div>
                                <div className="profile-stat">
                                    <span className="stat-value">124</span>
                                    <span className="stat-label">Following</span>
                                </div>
                                <div className="profile-stat">
                                    <span className="stat-value">8.5k</span>
                                    <span className="stat-label">Followers</span>
                                </div>
                            </div>

                            <div className="profile-meta-row">
                                <div className="profile-meta-item">
                                    <MapPin size={14} />
                                    <span>{(user as any)?.location || 'Portland, OR'}</span>
                                </div>
                                <div className="profile-meta-item">
                                    <Calendar size={14} />
                                    <span>Joined {joinedDate}</span>
                                </div>
                                <div className="profile-meta-item">
                                    <Link2 size={14} />
                                    <a href="#">treekin.com/{user?.username}</a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stacked Content - Single Column */}
                <div className="profile-content">
                    {/* Environmental Impact - Full Width */}
                    <div className="profile-section-card">
                        <h2>Environmental Impact</h2>
                        <div className="impact-grid">
                            {/* ... Impact cards ... */}
                            <div className="impact-card">
                                <div className="impact-card-icon green">
                                    <TreeDeciduous size={20} />
                                </div>
                                <div className="impact-card-value green">{treesCount}</div>
                                <div className="impact-card-label">Trees Planted</div>
                                <div className="impact-card-sub">+2 this month</div>
                            </div>
                            <div className="impact-card">
                                <div className="impact-card-icon amber">
                                    <Zap size={20} />
                                </div>
                                <div className="impact-card-value amber">{co2Saved > 0 ? `${co2Saved.toFixed(0)}kg` : '847kg'}</div>
                                <div className="impact-card-label">CO2 Absorbed</div>
                                <div className="impact-card-sub">+124kg this year</div>
                            </div>
                            <div className="impact-card">
                                <div className="impact-card-icon blue">
                                    <Droplets size={20} />
                                </div>
                                <div className="impact-card-value blue">12.4k</div>
                                <div className="impact-card-label">Water Filtered</div>
                                <div className="impact-card-sub">Liters annually</div>
                            </div>
                            <div className="impact-card">
                                <div className="impact-card-icon purple">
                                    <Bug size={20} />
                                </div>
                                <div className="impact-card-value purple">6</div>
                                <div className="impact-card-label">Species Supported</div>
                                <div className="impact-card-sub">Tree varieties</div>
                            </div>
                        </div>
                    </div>

                    {/* My Tree Collection - Tree Timeline */}
                    <div className="profile-section-card">
                        <div className="tree-collection-header">
                            <h2>My Tree Journey</h2>
                            <span className="tree-collection-count">{treesCount} planted</span>
                        </div>

                        {myTrees.length > 0 ? (
                            <>
                                {/* Tree Selector Pills */}
                                <div className="tree-selector-pills">
                                    {myTrees.map(tree => (
                                        <button
                                            key={tree.id}
                                            className={`tree-pill ${selectedTreeId === tree.id ? 'active' : ''}`}
                                            onClick={() => handleTreeSelect(tree.id)}
                                        >
                                            🌳 {tree.name}
                                        </button>
                                    ))}
                                </div>

                                {/* Tree Updates Grid */}
                                <div className="tree-updates-section" key={fadeKey}>
                                    {updatesLoading ? (
                                        <div className="tree-updates-loading">
                                            <div className="loading-spinner-small" /> Loading updates...
                                        </div>
                                    ) : treeUpdates.length > 0 ? (
                                        <div className="tree-updates-grid">
                                            {treeUpdates.map((update, idx) => (
                                                <div key={idx} className="tree-update-card">
                                                    <div className="tree-update-image">
                                                        <img src={update.image_url} alt={update.caption} />
                                                    </div>
                                                    <div className="tree-update-info">
                                                        <p className="tree-update-caption">{update.caption}</p>
                                                        <span className="tree-update-date">
                                                            <Calendar size={12} /> {formatUpdateDate(update.uploaded_at)}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="tree-updates-empty">
                                            <p>No growth updates yet 🌱</p>
                                            <span>Start documenting your tree's journey!</span>
                                            <button
                                                className="plant-btn small"
                                                onClick={() => window.location.href = `/tree/${selectedTreeId}`}
                                            >
                                                Add Update
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="empty-state">
                                <TreeDeciduous size={48} />
                                <p>You haven't planted any trees yet.</p>
                                <button className="plant-btn" onClick={() => window.location.href = '/plant'}>
                                    Plant Your First Tree
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Bottom Row: Achievements + Connected + Activity */}
                    <div className="profile-bottom-row">
                        {/* Achievements */}
                        <div className="profile-section-card">
                            <div className="achievements-header">
                                <h2>Achievements</h2>
                                <span className="achievements-count">{unlockedAchievements}/{MOCK_ACHIEVEMENTS.length}</span>
                            </div>

                            {MOCK_ACHIEVEMENTS.map(ach => (
                                <div key={ach.id} className="achievement-item">
                                    <div className={`achievement-icon ${ach.color}`}>
                                        {ach.icon}
                                    </div>
                                    <div className="achievement-info">
                                        <div className="achievement-name">{ach.name}</div>
                                        <div className="achievement-desc">{ach.desc}</div>
                                    </div>
                                    {ach.unlocked ? (
                                        <span className="achievement-date">{ach.date}</span>
                                    ) : (
                                        <div className="achievement-progress">
                                            <div className="achievement-progress-bar">
                                                <div
                                                    className={`achievement-progress-fill ${ach.color}`}
                                                    style={{ width: `${ach.progress}%` }}
                                                />
                                            </div>
                                            <span className="achievement-progress-pct">{ach.progress}%</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Right sub-column: Connected + Activity */}
                        <div className="profile-bottom-right">
                            {/* Connected Accounts */}
                            <div className="profile-section-card">
                                <div className="connected-header">
                                    <h2>Connected Accounts</h2>
                                    <span className="connected-count">3 of 5 connected</span>
                                </div>
                                <div className="connected-grid">
                                    <div className="connected-icon instagram">
                                        📷
                                        <span className="connected-check">✓</span>
                                    </div>
                                    <div className="connected-icon twitter">
                                        𝕏
                                        <span className="connected-check">✓</span>
                                    </div>
                                    <div className="connected-icon facebook">
                                        f
                                    </div>
                                    <div className="connected-icon linkedin">
                                        in
                                    </div>
                                    <div className="connected-icon google">
                                        G
                                        <span className="connected-check">✓</span>
                                    </div>
                                    <div className="connected-icon link">
                                        🔗
                                    </div>
                                </div>
                            </div>

                            {/* Recent Activity */}
                            <div className="profile-section-card">
                                <h2>Recent Activity</h2>
                                <div className="activity-list">
                                    {MOCK_ACTIVITY.map(activity => (
                                        <div key={activity.id} className="activity-item">
                                            <div className={`activity-avatar ${activity.iconColor}`}>
                                                {activity.avatar ? (
                                                    <span>{activity.avatar}</span>
                                                ) : activity.type === 'planted' ? (
                                                    <TreeDeciduous size={16} />
                                                ) : activity.type === 'achievement' ? (
                                                    <Award size={16} />
                                                ) : (
                                                    <Star size={16} />
                                                )}
                                            </div>
                                            <div className="activity-content">
                                                <div className="activity-text">
                                                    <strong>{activity.text}</strong>
                                                </div>
                                                {activity.sub && (
                                                    <div className="activity-sub">{activity.sub}</div>
                                                )}
                                                <div className="activity-time">{activity.time}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Settings / Logout */}
                <div className="profile-settings">
                    <button className="settings-item danger" onClick={logout}>
                        <Settings size={18} />
                        <span>Logout</span>
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};
