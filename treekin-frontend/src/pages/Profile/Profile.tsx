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

const TREE_CATEGORIES = ['All', 'Birth', 'Memorial', 'Achievement', 'Couple'];

// Tree card mock data to supplement real data
const MOCK_TREE_CARDS = [
    { category: 'birth', name: "Luna's Birth Oak", species: 'Oak', date: 'March 2023', desc: "Planted the day Luna was born. Watching them grow together has been the most beautiful...", likes: 84, comments: 12, co2: 124 },
    { category: 'couple', name: 'Forever Together Maple', species: 'Maple', date: 'June 2023', desc: 'Our anniversary tree. Five years of love, growing stronger each season.', likes: 156, comments: 28, co2: 89 },
    { category: 'achievement', name: 'Dream Achieved Cedar', species: 'Cedar', date: 'September 2023', desc: 'Celebrating getting my dream job. This cedar represents growth and resilience.', likes: 234, comments: 45, co2: 156 },
    { category: 'memorial', name: 'Remembrance Willow', species: 'Willow', date: 'November 2023', desc: 'In loving memory of Grandma Rose. Her spirit lives on through this willow.', likes: 567, comments: 89, co2: 201 },
];

export const ProfilePage: React.FC = () => {
    const { user, logout } = useAuthStore();
    const [wallet, setWallet] = useState<WalletData | null>(null);
    const [myTrees, setMyTrees] = useState<TreeData[]>([]);
    const [myPosts, setMyPosts] = useState<PostData[]>([]);
    const [activeCategory, setActiveCategory] = useState('All');

    useEffect(() => {
        loadProfileData();
    }, []);

    const loadProfileData = async () => {
        try {
            const [walletRes, treesRes, postsRes] = await Promise.all([
                carbonAPI.getWallet(),
                treesAPI.getMyTrees(),
                postsAPI.list({ limit: 20 } as any),
            ]);
            setWallet(walletRes.data);
            setMyTrees(treesRes.data);
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

    const joinedDate = user?.id ? 'March 2023' : '';
    const displayName = user?.display_name || user?.username || 'TreeKin User';
    const treesCount = myTrees.length || user?.trees_planted || 0;
    const co2Saved = user?.total_carbon_saved || 0;

    const filteredMockTrees = activeCategory === 'All'
        ? MOCK_TREE_CARDS
        : MOCK_TREE_CARDS.filter(t => t.category.toLowerCase() === activeCategory.toLowerCase());

    const unlockedAchievements = MOCK_ACHIEVEMENTS.filter(a => a.unlocked).length;

    return (
        <div className="profile-page-wrapper">
            <div className="profile-page">
                {/* Cover Photo */}
                <div className="profile-cover">
                    <div className="profile-cover-gradient" />
                </div>

                {/* Profile Header */}
                <div className="profile-header-section">
                    <div className="profile-header-top">
                        <div className="profile-avatar">
                            {user?.avatar_url ? (
                                <img src={user.avatar_url} alt="" />
                            ) : (
                                <span className="avatar-initial">
                                    {displayName[0].toUpperCase()}
                                </span>
                            )}
                        </div>
                        <div>
                            <div className="profile-name-row">
                                <h1>{displayName}</h1>
                                {user?.is_verified && (
                                    <span className="verified-badge">
                                        <CheckCircle /> Verified Planter
                                    </span>
                                )}
                            </div>
                            <p className="profile-username">@{user?.username}</p>
                        </div>
                    </div>

                    <button className="profile-edit-btn">
                        <Edit2 size={15} />
                        Edit Profile
                    </button>

                    {user?.bio && <p className="profile-bio">{user.bio}</p>}
                    {!user?.bio && (
                        <p className="profile-bio">
                            Environmental advocate and tree lover. Growing my legacy one tree at a time. 🌳
                        </p>
                    )}

                    <div className="profile-meta-row">
                        <span className="profile-meta-item">
                            <MapPin /> Portland, Oregon
                        </span>
                        <span className="profile-meta-item">
                            <Calendar /> Joined {joinedDate}
                        </span>
                        <span className="profile-meta-item">
                            <Link2 />
                            <a href="#">{user?.username || 'treekin'}.eco</a>
                        </span>
                    </div>

                    <div className="profile-stats-row">
                        <div className="profile-stat">
                            <span className="stat-number">{treesCount}</span>
                            <span className="stat-label">trees</span>
                        </div>
                        <div className="profile-stat">
                            <span className="stat-number">847</span>
                            <span className="stat-label">followers</span>
                        </div>
                        <div className="profile-stat">
                            <span className="stat-number">234</span>
                            <span className="stat-label">following</span>
                        </div>
                    </div>
                </div>

                {/* Stacked Content - Single Column */}
                <div className="profile-content">
                    {/* Environmental Impact - Full Width */}
                    <div className="profile-section-card">
                        <h2>Environmental Impact</h2>
                        <div className="impact-grid">
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

                    {/* My Tree Collection - Instagram-style Grid */}
                    <div className="profile-section-card">
                        <div className="tree-collection-header">
                            <h2>My Tree Collection</h2>
                            <span className="tree-collection-count">{treesCount || MOCK_TREE_CARDS.length} trees</span>
                        </div>

                        <div className="tree-tabs">
                            {TREE_CATEGORIES.map(cat => (
                                <button
                                    key={cat}
                                    className={`tree-tab ${activeCategory === cat ? 'active' : ''}`}
                                    onClick={() => setActiveCategory(cat)}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        {/* Show real trees if available, otherwise mock */}
                        {myTrees.length > 0 ? (
                            <div className="trees-grid">
                                {myTrees.map((tree) => (
                                    <div key={tree.id} className="tree-card">
                                        <div className="tree-card-image">
                                            {tree.main_image_url ? (
                                                <img src={tree.main_image_url} alt={tree.name} />
                                            ) : (
                                                <div className={`tree-card-placeholder ${tree.event_type || 'other'}`}>
                                                    🌳
                                                </div>
                                            )}
                                            <span className={`tree-card-badge ${tree.event_type || 'birth'}`}>
                                                {tree.event_type || tree.status}
                                            </span>
                                        </div>
                                        <div className="tree-card-body">
                                            <h3 className="tree-card-title">{tree.name}</h3>
                                            <p className="tree-card-species">{tree.species || 'Unknown'} · {formatDate(tree.created_at)}</p>
                                            <div className="tree-card-footer">
                                                <div className="tree-card-actions">
                                                    <button className="tree-card-action"><Heart size={16} /> 0</button>
                                                    <button className="tree-card-action"><MessageCircle size={16} /> 0</button>
                                                    <button className="tree-card-action"><Share2 size={16} /></button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : filteredMockTrees.length > 0 ? (
                            <div className="trees-grid">
                                {filteredMockTrees.map((tree, i) => (
                                    <div key={i} className="tree-card">
                                        <div className="tree-card-image">
                                            <div className={`tree-card-placeholder ${tree.category}`}>
                                                🌳
                                            </div>
                                            <span className={`tree-card-badge ${tree.category}`}>
                                                {tree.category}
                                            </span>
                                        </div>
                                        <div className="tree-card-body">
                                            <h3 className="tree-card-title">{tree.name}</h3>
                                            <p className="tree-card-species">{tree.species} · {tree.date}</p>
                                            <p className="tree-card-desc">{tree.desc}</p>
                                            <div className="tree-card-footer">
                                                <div className="tree-card-actions">
                                                    <button className="tree-card-action"><Heart size={16} /> {tree.likes}</button>
                                                    <button className="tree-card-action"><MessageCircle size={16} /> {tree.comments}</button>
                                                    <button className="tree-card-action"><Share2 size={16} /></button>
                                                </div>
                                                <span className="tree-card-co2">{tree.co2} kg CO2</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state">
                                <TreeDeciduous size={48} />
                                <p>No trees in this category yet</p>
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
