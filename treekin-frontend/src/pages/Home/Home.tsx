import React, { useEffect, useState } from 'react';
import { Heart, MessageCircle, CheckCircle, Share2, MoreHorizontal } from 'lucide-react';
import { Card, Button } from '../../components/common';
import { postsAPI, leaderboardAPI } from '../../services/api';
import { formatDistanceToNow } from 'date-fns';
import './Home.css';

interface Post {
    id: number;
    content: string;
    tree_id: number;
    user_id: number;
    user?: { id: number; username: string; display_name?: string; avatar_url?: string };
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
}

export const HomePage: React.FC = () => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [postsRes, statsRes] = await Promise.all([
                postsAPI.list(),
                leaderboardAPI.getStats(),
            ]);
            setPosts(postsRes.data);
            setStats(statsRes.data);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLike = async (postId: number) => {
        try {
            const res = await postsAPI.like(postId);
            setPosts(posts.map(p =>
                p.id === postId
                    ? { ...p, likes_count: res.data.likes_count, is_liked: res.data.action === 'liked' }
                    : p
            ));
        } catch (error) {
            console.error('Failed to like:', error);
        }
    };

    if (loading) {
        return (
            <div className="home-loading">
                <div className="loading-spinner" />
                <p>Loading your feed...</p>
            </div>
        );
    }

    return (
        <div className="home-page">
            {/* Stats Banner */}
            {stats && (
                <div className="stats-banner">
                    <div className="stat-item">
                        <span className="stat-value">{stats.total_trees.toLocaleString()}</span>
                        <span className="stat-label">Trees</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-value">{stats.total_users.toLocaleString()}</span>
                        <span className="stat-label">Members</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-value">{(stats.total_carbon_saved_kg / 1000).toFixed(1)}t</span>
                        <span className="stat-label">CO₂ Saved</span>
                    </div>
                </div>
            )}

            {/* Quick Actions */}
            <div className="quick-actions">
                <Button variant="secondary" size="sm" onClick={() => window.location.href = '/plant'}>
                    🌱 Plant Tree
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.location.href = '/explore'}>
                    🔍 Adopt Tree
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.location.href = '/leaderboard'}>
                    🏆 Leaderboard
                </Button>
            </div>

            {/* Feed */}
            <div className="feed-section">
                <h2 className="section-title">Recent Activity</h2>

                {posts.length === 0 ? (
                    <Card className="empty-feed">
                        <p>No posts yet. Be the first to share!</p>
                        <Button onClick={() => window.location.href = '/plant'}>
                            Plant Your First Tree
                        </Button>
                    </Card>
                ) : (
                    <div className="feed-list">
                        {posts.map((post) => (
                            <Card key={post.id} className="post-card">
                                <div className="post-header">
                                    <div className="post-user">
                                        <div className="user-avatar">
                                            {post.user?.avatar_url ? (
                                                <img src={post.user.avatar_url} alt="" />
                                            ) : (
                                                <span>{(post.user?.display_name || post.user?.username || 'U')[0].toUpperCase()}</span>
                                            )}
                                        </div>
                                        <div className="user-info">
                                            <span className="user-name">
                                                {post.user?.display_name || post.user?.username || 'Anonymous'}
                                                {post.is_verified && <CheckCircle size={14} className="verified-badge" />}
                                            </span>
                                            <span className="post-time">
                                                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                                            </span>
                                        </div>
                                    </div>
                                    <button className="post-menu">
                                        <MoreHorizontal size={18} />
                                    </button>
                                </div>

                                <p className="post-content">{post.content}</p>

                                {post.media_urls?.length > 0 && (
                                    <div className="post-media">
                                        <img src={post.media_urls[0]} alt="Post media" />
                                    </div>
                                )}

                                <div className="post-actions">
                                    <button
                                        className={`action-btn ${post.is_liked ? 'liked' : ''}`}
                                        onClick={() => handleLike(post.id)}
                                    >
                                        <Heart size={18} fill={post.is_liked ? '#ef4444' : 'none'} />
                                        <span>{post.likes_count}</span>
                                    </button>
                                    <button className="action-btn">
                                        <MessageCircle size={18} />
                                        <span>{post.comments_count}</span>
                                    </button>
                                    <button className="action-btn">
                                        <Share2 size={18} />
                                    </button>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
