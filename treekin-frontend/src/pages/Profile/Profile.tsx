import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
    TreeDeciduous, Leaf, Award, Settings, ChevronRight, MapPin, Calendar,
    Link2, Heart, MessageCircle, Share2, Droplets, Bug, Edit2,
    CheckCircle, Shield, Star, Trophy, Target, Zap, Plus, X, Upload, Image,
    Coins, TrendingUp, Sparkles, Trash2
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { treesAPI, carbonAPI, postsAPI } from '../../services/api';
import {
    calculateTredits,
    formatTredits,
    TREDITS_PER_TREE,
    TREDITS_PER_10KG_CO2,
    CO2_KG_PER_UNIT,
    TREDITS_PER_10KG_WATER,
    WATER_KG_PER_UNIT,
    type TreditsBreakdown
} from '../../lib/tredits';
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
    { id: 3, name: 'Carbon Champion', desc: 'Offset 0.1kg CO2', date: 'Nov 2023', icon: '🏅', color: 'amber', unlocked: true },
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

// Animated counter hook
function useAnimatedCounter(target: number, duration: number = 1200) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (target === 0) { setCount(0); return; }
        let start = 0;
        const increment = target / (duration / 16);
        const timer = setInterval(() => {
            start += increment;
            if (start >= target) {
                setCount(target);
                clearInterval(timer);
            } else {
                setCount(Math.floor(start));
            }
        }, 16);
        return () => clearInterval(timer);
    }, [target, duration]);
    return count;
}

export const ProfilePage: React.FC = () => {
    const { user, logout } = useAuthStore();
    const [wallet, setWallet] = useState<WalletData | null>(null);
    const [myTrees, setMyTrees] = useState<TreeData[]>([]);
    const [myPosts, setMyPosts] = useState<PostData[]>([]);
    const [selectedTreeId, setSelectedTreeId] = useState<number | null>(null);
    const [treeUpdates, setTreeUpdates] = useState<TreeUpdateData[]>([]);
    const [updatesLoading, setUpdatesLoading] = useState(false);
    const [fadeKey, setFadeKey] = useState(0);

    // Add Growth Update modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [uploadCaption, setUploadCaption] = useState('');
    const [uploadDate, setUploadDate] = useState(new Date().toISOString().split('T')[0]);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Delete tree state
    const [deleteConfirmTree, setDeleteConfirmTree] = useState<TreeData | null>(null);
    const [deleting, setDeleting] = useState(false);

    const loadProfileData = async () => {
        if (!user) return;
        try {
            const [treesRes, postsRes, walletRes] = await Promise.all([
                treesAPI.getMyTrees(),
                postsAPI.list({ user_id: (user as any).id }),
                carbonAPI.getWallet(),
            ]);
            setMyTrees(treesRes.data);
            setMyPosts(postsRes.data);
            setWallet(walletRes.data);
        } catch (err) {
            console.error('Failed to load profile data:', err);
        }
    };

    useEffect(() => {
        loadProfileData();
    }, [user]);

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

    // --- Add Growth Update handlers ---
    const resetModal = () => {
        setUploadFile(null);
        setImagePreview(null);
        setUploadCaption('');
        setUploadDate(new Date().toISOString().split('T')[0]);
        setUploadError('');
        setUploading(false);
    };

    const handleOpenModal = () => {
        resetModal();
        setShowAddModal(true);
    };

    const handleCloseModal = () => {
        if (uploading) return;
        setShowAddModal(false);
        resetModal();
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setUploadError('Please select an image file');
            return;
        }
        setUploadFile(file);
        setUploadError('');
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleSubmitUpdate = async () => {
        if (!uploadFile) {
            setUploadError('Please select an image');
            return;
        }
        const today = new Date().toISOString().split('T')[0];
        if (uploadDate > today) {
            setUploadError('Date cannot be in the future');
            return;
        }
        if (!selectedTreeId) return;

        setUploading(true);
        setUploadError('');
        try {
            await treesAPI.addTreeUpdate(selectedTreeId, uploadFile, uploadCaption || undefined, uploadDate);
            setShowAddModal(false);
            resetModal();
            await fetchUpdates(selectedTreeId);
            setFadeKey(prev => prev + 1);
            setToastMessage('Growth update added 🌱');
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        } catch (err: any) {
            setUploadError(err.response?.data?.detail || 'Failed to upload update');
        } finally {
            setUploading(false);
        }
    };

    // --- Delete tree handler ---
    const handleDeleteTree = async () => {
        if (!deleteConfirmTree) return;
        setDeleting(true);
        try {
            await treesAPI.delete(deleteConfirmTree.id);
            setDeleteConfirmTree(null);
            // If the deleted tree was selected, clear selection
            if (selectedTreeId === deleteConfirmTree.id) {
                setSelectedTreeId(null);
                setTreeUpdates([]);
            }
            // Refresh all profile data
            await loadProfileData();
            setToastMessage(`Tree '${deleteConfirmTree.name}' deleted`);
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        } catch (err: any) {
            alert(err.response?.data?.detail || 'Failed to delete tree');
        } finally {
            setDeleting(false);
        }
    };

    const todayStr = new Date().toISOString().split('T')[0];

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    };

    const unlockedAchievements = MOCK_ACHIEVEMENTS.filter(a => a.unlocked).length;

    // Derived state
    const treesCount = myTrees.length;
    const joinedDate = (user as any)?.created_at ? new Date((user as any).created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '2023';
    const displayName = user?.display_name || user?.username || 'Eco Warrior';

    // Collect all tree planted dates for CO2/Water/O2 calculation
    const treeDates = useMemo(() => myTrees.map(t => t.created_at), [myTrees]);

    // ============================================
    // TREDITS CALCULATION
    // Uses tree planted dates to calculate CO2 absorbed, water filtered, O2 released
    // Each tree: 1kg CO2/Water/O2 per 7 days of age
    // ============================================
    const treditsBreakdown: TreditsBreakdown = useMemo(
        () => calculateTredits(treesCount, treeDates),
        [treesCount, treeDates]
    );

    // Animated counter for total tredits
    const animatedTotal = useAnimatedCounter(treditsBreakdown.total);

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

                    {/* ============================================
                        TREDITS CARD - NEW FEATURE
                        ============================================ */}
                    <div className="tredits-card">
                        <div className="tredits-card-header">
                            <div className="tredits-header-left">
                                <div className="tredits-icon-badge">
                                    <Coins size={22} />
                                </div>
                                <div>
                                    <h2>Your Tredits</h2>
                                    <p className="tredits-subtitle">Earn rewards for your eco impact</p>
                                </div>
                            </div>
                            <div className="tredits-total">
                                <span className="tredits-total-number">{formatTredits(animatedTotal)}</span>
                                <span className="tredits-total-label">Total Tredits</span>
                            </div>
                        </div>

                        {/* Progress bar showing breakdown */}
                        <div className="tredits-progress-section">
                            <div className="tredits-progress-bar">
                                {treditsBreakdown.total > 0 && (
                                    <>
                                        <div
                                            className="tredits-progress-fill trees"
                                            style={{ width: `${(treditsBreakdown.fromTrees / treditsBreakdown.total) * 100}%` }}
                                        />
                                        <div
                                            className="tredits-progress-fill co2"
                                            style={{ width: `${(treditsBreakdown.fromCO2 / treditsBreakdown.total) * 100}%` }}
                                        />
                                        <div
                                            className="tredits-progress-fill water"
                                            style={{ width: `${(treditsBreakdown.fromWater / treditsBreakdown.total) * 100}%` }}
                                        />
                                    </>
                                )}
                            </div>
                            <div className="tredits-legend">
                                <span className="tredits-legend-item">
                                    <span className="tredits-dot trees" />Trees
                                </span>
                                <span className="tredits-legend-item">
                                    <span className="tredits-dot co2" />CO2
                                </span>
                                <span className="tredits-legend-item">
                                    <span className="tredits-dot water" />Water
                                </span>
                                <span className="tredits-legend-item">
                                    <span className="tredits-dot o2" />O2
                                </span>
                            </div>
                        </div>

                        {/* Breakdown cards */}
                        <div className="tredits-breakdown">
                            <div className="tredits-source-card">
                                <div className="tredits-source-icon trees">
                                    <TreeDeciduous size={18} />
                                </div>
                                <div className="tredits-source-info">
                                    <span className="tredits-source-label">Trees Planted</span>
                                    <span className="tredits-source-detail">{treditsBreakdown.treesPlanted} trees x {TREDITS_PER_TREE} tredits</span>
                                </div>
                                <span className="tredits-source-value trees">+{formatTredits(treditsBreakdown.fromTrees)}</span>
                            </div>
                            <div className="tredits-source-card">
                                <div className="tredits-source-icon co2">
                                    <Zap size={18} />
                                </div>
                                <div className="tredits-source-info">
                                    <span className="tredits-source-label">CO2 Absorbed</span>
                                    <span className="tredits-source-detail">{treditsBreakdown.co2AbsorbedKg}kg total (1kg/tree/7days) &middot; {Math.floor(treditsBreakdown.co2AbsorbedKg / CO2_KG_PER_UNIT)} x {CO2_KG_PER_UNIT}kg = {TREDITS_PER_10KG_CO2} tredits each</span>
                                </div>
                                <span className="tredits-source-value co2">+{formatTredits(treditsBreakdown.fromCO2)}</span>
                            </div>
                            <div className="tredits-source-card">
                                <div className="tredits-source-icon water">
                                    <Droplets size={18} />
                                </div>
                                <div className="tredits-source-info">
                                    <span className="tredits-source-label">Water Filtered</span>
                                    <span className="tredits-source-detail">{treditsBreakdown.waterFilteredKg}kg total (1kg/tree/7days) &middot; {Math.floor(treditsBreakdown.waterFilteredKg / WATER_KG_PER_UNIT)} x {WATER_KG_PER_UNIT}kg = {TREDITS_PER_10KG_WATER} tredits each</span>
                                </div>
                                <span className="tredits-source-value water">+{formatTredits(treditsBreakdown.fromWater)}</span>
                            </div>
                            <div className="tredits-source-card">
                                <div className="tredits-source-icon o2">
                                    <Leaf size={18} />
                                </div>
                                <div className="tredits-source-info">
                                    <span className="tredits-source-label">O2 Released</span>
                                    <span className="tredits-source-detail">{treditsBreakdown.o2ReleasedKg}kg total (1kg/tree/7days) &middot; Tracked impact</span>
                                </div>
                                <span className="tredits-source-value o2">{treditsBreakdown.o2ReleasedKg}kg</span>
                            </div>
                        </div>

                        <div className="tredits-card-footer">
                            <Sparkles size={14} />
                            <span>Keep planting & caring for nature to earn more Tredits!</span>
                        </div>
                    </div>

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
                                <div className="impact-card-value amber">{treditsBreakdown.co2AbsorbedKg}kg</div>
                                <div className="impact-card-label">CO2 Absorbed</div>
                                <div className="impact-card-sub">1kg per tree every 7 days</div>
                            </div>
                            <div className="impact-card">
                                <div className="impact-card-icon blue">
                                    <Droplets size={20} />
                                </div>
                                <div className="impact-card-value blue">{treditsBreakdown.waterFilteredKg}kg</div>
                                <div className="impact-card-label">Water Filtered</div>
                                <div className="impact-card-sub">1kg per tree every 7 days</div>
                            </div>
                            <div className="impact-card">
                                <div className="impact-card-icon purple">
                                    <Leaf size={20} />
                                </div>
                                <div className="impact-card-value purple">{treditsBreakdown.o2ReleasedKg}kg</div>
                                <div className="impact-card-label">O2 Released</div>
                                <div className="impact-card-sub">1kg per tree every 7 days</div>
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
                                        <div key={tree.id} className="tree-pill-wrapper">
                                            <button
                                                className={`tree-pill ${selectedTreeId === tree.id ? 'active' : ''}`}
                                                onClick={() => handleTreeSelect(tree.id)}
                                            >
                                                🌳 {tree.name}
                                            </button>
                                            <button
                                                className="tree-pill-delete"
                                                onClick={(e) => { e.stopPropagation(); setDeleteConfirmTree(tree); }}
                                                title={`Delete ${tree.name}`}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
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
                                                        <img src={update.image_url} alt={update.caption} loading="lazy" />
                                                    </div>
                                                    <div className="tree-update-info">
                                                        <p className="tree-update-caption">{update.caption}</p>
                                                        <span className="tree-update-date">
                                                            <Calendar size={12} /> {formatUpdateDate(update.uploaded_at)}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                            {/* Add update card - always last in grid */}
                                            <div
                                                className="tree-update-card add-update-grid-card"
                                                onClick={handleOpenModal}
                                                title="Add Growth Update"
                                            >
                                                <div className="add-update-grid-content">
                                                    <div className="add-update-grid-icon">
                                                        <Plus size={28} />
                                                    </div>
                                                    <p>Add Update</p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="tree-updates-empty">
                                            <p>No growth updates yet 🌱</p>
                                            <span>Start documenting your tree journey!</span>
                                            <button
                                                className="add-update-btn-empty"
                                                onClick={handleOpenModal}
                                            >
                                                <Plus size={18} /> Add Growth Update
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

            {/* Add Growth Update Modal */}
            {showAddModal && (
                <div className="growth-modal-overlay" onClick={handleCloseModal}>
                    <div className="growth-modal" onClick={e => e.stopPropagation()}>
                        <div className="growth-modal-header">
                            <h3>Add Growth Update</h3>
                            <button className="growth-modal-close" onClick={handleCloseModal}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="growth-modal-body">
                            {/* Image Upload */}
                            <div
                                className={`growth-modal-upload-area ${imagePreview ? 'has-preview' : ''}`}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Preview" className="growth-modal-preview" />
                                ) : (
                                    <div className="growth-modal-upload-placeholder">
                                        <Image size={36} />
                                        <p>Click to upload photo</p>
                                        <span>JPG, PNG, WebP or GIF</span>
                                    </div>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                    style={{ display: 'none' }}
                                />
                            </div>

                            {/* Caption */}
                            <div className="growth-modal-field">
                                <label>Caption (optional)</label>
                                <textarea
                                    value={uploadCaption}
                                    onChange={e => setUploadCaption(e.target.value)}
                                    placeholder="Describe this growth update..."
                                    rows={3}
                                    maxLength={500}
                                />
                            </div>

                            {/* Date */}
                            <div className="growth-modal-field">
                                <label>Date</label>
                                <input
                                    type="date"
                                    value={uploadDate}
                                    onChange={e => setUploadDate(e.target.value)}
                                    max={todayStr}
                                />
                            </div>

                            {/* Error */}
                            {uploadError && (
                                <div className="growth-modal-error">{uploadError}</div>
                            )}
                        </div>

                        <div className="growth-modal-footer">
                            <button className="growth-modal-cancel" onClick={handleCloseModal} disabled={uploading}>
                                Cancel
                            </button>
                            <button
                                className="growth-modal-submit"
                                onClick={handleSubmitUpdate}
                                disabled={uploading || !uploadFile}
                            >
                                {uploading ? (
                                    <><div className="loading-spinner-small" /> Uploading...</>
                                ) : (
                                    <><Upload size={16} /> Add Update</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmTree && (
                <div className="growth-modal-overlay" onClick={() => !deleting && setDeleteConfirmTree(null)}>
                    <div className="growth-modal delete-confirm-modal" onClick={e => e.stopPropagation()}>
                        <div className="growth-modal-header">
                            <h3>Delete Tree</h3>
                            <button className="growth-modal-close" onClick={() => setDeleteConfirmTree(null)} disabled={deleting}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="growth-modal-body delete-confirm-body">
                            <div className="delete-confirm-icon">
                                <Trash2 size={40} />
                            </div>
                            <p>Are you sure you want to permanently delete <strong>{deleteConfirmTree.name}</strong>?</p>
                            <p className="delete-confirm-warning">This will remove all growth updates, posts, carbon credits, and deduct Tredits associated with this tree. This action cannot be undone.</p>
                        </div>
                        <div className="growth-modal-footer">
                            <button className="growth-modal-cancel" onClick={() => setDeleteConfirmTree(null)} disabled={deleting}>
                                Cancel
                            </button>
                            <button
                                className="growth-modal-submit delete-confirm-btn"
                                onClick={handleDeleteTree}
                                disabled={deleting}
                            >
                                {deleting ? (
                                    <><div className="loading-spinner-small" /> Deleting...</>
                                ) : (
                                    <><Trash2 size={16} /> Delete Permanently</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Toast */}
            {showToast && (
                <div className="growth-toast">
                    {toastMessage || 'Growth update added 🌱'}
                </div>
            )}
        </div>
    );
};
