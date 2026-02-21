import React, { useEffect, useState } from 'react';
import { Heart, MessageCircle, Share2, Leaf, Users, TreePine, TrendingUp } from 'lucide-react';
import { postsAPI, leaderboardAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import './Home.css';

interface TreeInfo {
    id: number;
    name: string;
    event_type?: string;
    status?: string;
    carbon_credits: number;
    main_image_url?: string;
}

interface Post {
    id: number;
    content: string;
    tree_id: number;
    user_id: number;
    user?: { id: number; username: string; display_name?: string; avatar_url?: string };
    tree?: TreeInfo;
    media_urls: string[];
    likes_count: number;
    comments_count: number;
    is_verified: boolean;
    is_liked?: boolean;
    created_at: string;
}

interface Stats {
    total_users: number;
    total_trees: number;
    total_carbon_saved_kg: number;
    trees_by_event_type?: Record<string, number>;
}

// Mock posts matching the new design
const MOCK_POSTS: Post[] = [
    {
        id: 901,
        content: 'Planted this beautiful oak to celebrate our daughter Luna\'s arrival! This tree will grow alongside her, a living memory of her first breath.',
        tree_id: 1,
        user_id: 1,
        user: { id: 1, username: 'sarah_mitchell', display_name: 'Sarah Mitchell' },
        tree: { id: 1, name: "Luna's Birth Oak", event_type: 'newborn', status: 'planted', carbon_credits: 124, main_image_url: '' },
        media_urls: [],
        likes_count: 1200,
        comments_count: 156,
        is_verified: true,
        is_liked: false,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: 902,
        content: 'Our forever tree — planted on our anniversary to symbolize our roots growing deeper. This maple will watch over our love story. 💚',
        tree_id: 2,
        user_id: 2,
        user: { id: 2, username: 'james_emily', display_name: 'James & Emily' },
        tree: { id: 2, name: 'Forever Together Maple', event_type: 'couple', status: 'adopted', carbon_credits: 89, main_image_url: '' },
        media_urls: [],
        likes_count: 890,
        comments_count: 124,
        is_verified: true,
        is_liked: true,
        created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: 903,
        content: 'In loving memory of Grandma Rose. This cherry blossom will bloom every spring, just like her smile brightened our days. 🌸',
        tree_id: 3,
        user_id: 3,
        user: { id: 3, username: 'david_chen', display_name: 'David Chen' },
        tree: { id: 3, name: "Grandma Rose's Cherry Blossom", event_type: 'memorial', status: 'planted', carbon_credits: 67, main_image_url: '' },
        media_urls: [],
        likes_count: 2100,
        comments_count: 289,
        is_verified: true,
        is_liked: false,
        created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: 904,
        content: 'Graduated with honors and planted a tree to mark the milestone! 🎓 This birch represents growth, new beginnings, and reaching for the sky.',
        tree_id: 4,
        user_id: 4,
        user: { id: 4, username: 'maya_patel', display_name: 'Maya Patel' },
        tree: { id: 4, name: 'Achievement Birch', event_type: 'achievement', status: 'planted', carbon_credits: 45, main_image_url: '' },
        media_urls: [],
        likes_count: 567,
        comments_count: 78,
        is_verified: false,
        is_liked: false,
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
];

const TRENDING_STORIES = [
    { name: 'Memorial Trees', emoji: '🌲', interactions: '2.4k' },
    { name: 'Baby Birth Celebrations', emoji: '👶', interactions: '1.8k' },
    { name: 'Couple Milestones', emoji: '❤️', interactions: '1.5k' },
    { name: 'Achievement Plants', emoji: '🏆', interactions: '1.2k' },
];

const EVENT_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
    newborn: { label: 'Birth', color: '#059669' },
    couple: { label: 'Couple', color: '#7c3aed' },
    memorial: { label: 'Memorial', color: '#6b7280' },
    achievement: { label: 'Achievement', color: '#d97706' },
    custom: { label: 'Custom', color: '#2563eb' },
    none: { label: 'Tree', color: '#059669' },
};

function formatNumber(num: number): string {
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
    return num.toString();
}

function timeAgo(dateStr: string): string {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} days ago`;
    const weeks = Math.floor(days / 7);
    return `${weeks}w ago`;
}

export const HomePage: React.FC = () => {
    const { user } = useAuthStore();
    const [posts, setPosts] = useState<Post[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set());

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const postsRes = await postsAPI.list();
            const apiPosts = postsRes.data;
            setPosts(apiPosts.length > 0 ? apiPosts : MOCK_POSTS);
            const liked = new Set<number>();
            if (apiPosts.length > 0) {
                apiPosts.forEach((p: Post) => { if (p.is_liked) liked.add(p.id); });
            }
            setLikedPosts(liked);
        } catch {
            setPosts(MOCK_POSTS);
        }

        try {
            const statsRes = await leaderboardAPI.getStats();
            setStats(statsRes.data);
        } catch {
            // Use defaults
        }

        setLoading(false);
    };

    const handleLike = async (postId: number) => {
        const isCurrentlyLiked = likedPosts.has(postId);
        const newLiked = new Set(likedPosts);
        if (isCurrentlyLiked) {
            newLiked.delete(postId);
        } else {
            newLiked.add(postId);
        }
        setLikedPosts(newLiked);
        setPosts(posts.map(p =>
            p.id === postId
                ? { ...p, likes_count: p.likes_count + (isCurrentlyLiked ? -1 : 1) }
                : p
        ));
        try {
            await postsAPI.like(postId);
        } catch {
            setLikedPosts(likedPosts);
        }
    };

    const heroStats = [
        { icon: <Heart size={18} />, value: stats?.trees_by_event_type ? Object.keys(stats.trees_by_event_type).length : 4, label: 'Adoption Types' },
        { icon: <Users size={18} />, value: formatNumber(stats?.total_users || 2500), label: 'Members' },
        { icon: <TreePine size={18} />, value: formatNumber(stats?.total_trees || 8300), label: 'Trees Planted' },
        { icon: <TrendingUp size={18} />, value: formatNumber(Math.round((stats?.total_carbon_saved_kg || 1200000) / 1000)), label: <>Tons CO<sub>2</sub> Offset</> },
    ];

    if (loading) {
        return (
            <div className="home-loading">
                <div className="loading-spinner" />
                <p>Loading your green feed...</p>
            </div>
        );
    }

    return (
        <div className="home-page">
            {/* ──── Hero Section ──── */}
            <section className="hero-section">
                <div className="hero-content">
                    <div className="hero-badge">
                        <Leaf size={16} />
                        <span>WELCOME TO TREEKIN</span>
                    </div>
                    <h1 className="hero-title">Your Stories, Rooted in Nature</h1>
                    <p className="hero-description">
                        TreeKin connects your life's most meaningful moments with nature. Share your stories,
                        celebrate milestones, and plant trees that grow alongside your memories. Whether it's a
                        birth, a memorial, an achievement, or a special bond—every story deserves a living legacy.
                    </p>
                    <div className="hero-stats">
                        {heroStats.map((stat, i) => (
                            <div key={i} className="hero-stat-card">
                                <span className="hero-stat-icon">{stat.icon}</span>
                                <span className="hero-stat-value">{stat.value}</span>
                                <span className="hero-stat-label">{stat.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ──── Main Content: Feed + Sidebar ──── */}
            <section className="main-content">
                {/* Left: Feed */}
                <div className="feed-column">
                    <h2 className="feed-heading">Your Feed</h2>
                    <div className="feed">
                        {posts.map(post => {
                            const displayName = post.user?.display_name || post.user?.username || 'Anonymous';
                            const initial = displayName[0].toUpperCase();
                            const isLiked = likedPosts.has(post.id);
                            const eventType = post.tree?.event_type || 'none';
                            const badge = EVENT_TYPE_CONFIG[eventType] || EVENT_TYPE_CONFIG.none;
                            const treeName = post.tree?.name || 'Unnamed Tree';
                            const treeStatus = post.tree?.status || 'Planted';
                            const carbonCredits = post.tree?.carbon_credits || 0;
                            const treeImage = post.tree?.main_image_url || (post.media_urls?.length > 0 ? post.media_urls[0] : '');

                            return (
                                <article key={post.id} className="post-card">
                                    {/* Card Header */}
                                    <div className="card-header">
                                        <div className="card-user-info">
                                            <div className="card-avatar">
                                                {post.user?.avatar_url ? (
                                                    <img src={post.user.avatar_url} alt="" />
                                                ) : (
                                                    <span>{initial}</span>
                                                )}
                                            </div>
                                            <div className="card-user-text">
                                                <span className="card-username">{displayName}</span>
                                                <span className="card-time">{timeAgo(post.created_at)}</span>
                                            </div>
                                        </div>
                                        <span className="card-badge" style={{ backgroundColor: badge.color }}>
                                            {badge.label}
                                        </span>
                                    </div>

                                    {/* Tree Image or Placeholder */}
                                    <div className="card-image-area" onDoubleClick={() => !isLiked && handleLike(post.id)}>
                                        {treeImage ? (
                                            <img src={treeImage} alt={treeName} className="card-image" />
                                        ) : (
                                            <div className="card-image-placeholder">
                                                <span className="placeholder-tree-emoji">🌳</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Tree Info */}
                                    <div className="card-body">
                                        <h3 className="card-tree-name">{treeName}</h3>
                                        <span className="card-status">{treeStatus.charAt(0).toUpperCase() + treeStatus.slice(1)}</span>

                                        {/* CO₂ Chip */}
                                        {carbonCredits > 0 && (
                                            <div className="card-co2-chip">
                                                <span className="co2-value">{carbonCredits} <span className="co2-unit">CO₂</span></span>
                                                <span className="co2-divider" />
                                                <span className="co2-label">Offset in progress</span>
                                            </div>
                                        )}

                                        {/* Action Stats */}
                                        <div className="card-actions">
                                            <button
                                                className={`card-action-btn ${isLiked ? 'liked' : ''}`}
                                                onClick={() => handleLike(post.id)}
                                            >
                                                <Heart
                                                    size={18}
                                                    fill={isLiked ? '#ef4444' : 'none'}
                                                    stroke={isLiked ? '#ef4444' : 'currentColor'}
                                                />
                                                <span>{formatNumber(post.likes_count)}</span>
                                            </button>
                                            <button className="card-action-btn">
                                                <MessageCircle size={18} />
                                                <span>{formatNumber(post.comments_count)}</span>
                                            </button>
                                            <button className="card-action-btn">
                                                <Share2 size={18} />
                                                <span>{formatNumber(Math.floor(post.likes_count * 0.1))}</span>
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </div>

                {/* Right: Sidebar */}
                <aside className="sidebar">
                    {/* Community Impact */}
                    <div className="sidebar-card">
                        <h3 className="sidebar-card-title">Community Impact</h3>
                        <div className="impact-list">
                            <div className="impact-item">
                                <span className="impact-icon trees"><TreePine size={20} /></span>
                                <div className="impact-text">
                                    <span className="impact-label">Trees Planted</span>
                                    <span className="impact-value">{(stats?.total_trees || 2847).toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="impact-item">
                                <span className="impact-icon carbon"><TrendingUp size={20} /></span>
                                <div className="impact-text">
                                    <span className="impact-label">CO₂ Offset (tons)</span>
                                    <span className="impact-value">{formatNumber(Math.round((stats?.total_carbon_saved_kg || 18500000) / 1000))}</span>
                                </div>
                            </div>
                            <div className="impact-item">
                                <span className="impact-icon members"><Users size={20} /></span>
                                <div className="impact-text">
                                    <span className="impact-label">Community Members</span>
                                    <span className="impact-value">{formatNumber(stats?.total_users || 12300)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Trending Stories */}
                    <div className="sidebar-card">
                        <h3 className="sidebar-card-title">Trending Stories</h3>
                        <div className="trending-list">
                            {TRENDING_STORIES.map((story, i) => (
                                <div key={i} className="trending-item">
                                    <div className="trending-info">
                                        <span className="trending-name">{story.name} {story.emoji}</span>
                                        <span className="trending-interactions">{story.interactions} interactions</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>
            </section>

            <div style={{ height: 80 }} /> {/* Spacer for bottom nav */}
        </div>
    );
};
