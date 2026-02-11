import React, { useEffect, useState } from 'react';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, CheckCircle } from 'lucide-react';
import { postsAPI, leaderboardAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
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

// Mock stories data
const MOCK_STORIES = [
    { id: 'yours', name: 'Your Story', emoji: '➕', isOwn: true },
    { id: 's1', name: 'TreeLover', emoji: '🌳', color: '#059669' },
    { id: 's2', name: 'GreenHeart', emoji: '💚', color: '#10b981' },
    { id: 's3', name: 'EcoWarrior', emoji: '🌿', color: '#047857' },
    { id: 's4', name: 'NatureFan', emoji: '🌱', color: '#34d399' },
    { id: 's5', name: 'PlantPal', emoji: '🪴', color: '#065f46' },
    { id: 's6', name: 'ForestKid', emoji: '🌲', color: '#059669' },
    { id: 's7', name: 'LeafyLife', emoji: '🍃', color: '#10b981' },
];

// Mock posts for when the API returns empty
const MOCK_POSTS: Post[] = [
    {
        id: 901,
        content: 'Just planted my first oak tree at the community garden! 🌳 Feeling amazing knowing this tree will grow for generations. #TreeKin #PlantATree',
        tree_id: 1,
        user_id: 1,
        user: { id: 1, username: 'eco_warrior', display_name: 'Eco Warrior' },
        media_urls: [],
        likes_count: 42,
        comments_count: 8,
        is_verified: true,
        is_liked: false,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: 902,
        content: 'My little maple sapling is showing new leaves! 🍁 Three months in and it\'s growing strong. Nature is incredible.',
        tree_id: 2,
        user_id: 2,
        user: { id: 2, username: 'green_thumb', display_name: 'Green Thumb' },
        media_urls: [],
        likes_count: 128,
        comments_count: 23,
        is_verified: true,
        is_liked: true,
        created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: 903,
        content: 'Adopted a 5-year-old cherry blossom tree today! 🌸 Can\'t wait to see it bloom this spring. Every tree matters!',
        tree_id: 3,
        user_id: 3,
        user: { id: 3, username: 'nature_lover', display_name: 'Nature Lover' },
        media_urls: [],
        likes_count: 95,
        comments_count: 15,
        is_verified: false,
        is_liked: false,
        created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: 904,
        content: 'Our school planted 50 trees today as part of the TreeKin community drive! 🎉 So proud of these kids. The future is green! 💚',
        tree_id: 4,
        user_id: 4,
        user: { id: 4, username: 'school_green', display_name: 'Green School Initiative' },
        media_urls: [],
        likes_count: 312,
        comments_count: 47,
        is_verified: true,
        is_liked: false,
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
];

function timeAgo(dateStr: string): string {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    const weeks = Math.floor(days / 7);
    return `${weeks}w`;
}

export const HomePage: React.FC = () => {
    const { user } = useAuthStore();
    const [posts, setPosts] = useState<Post[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set());
    const [savedPosts, setSavedPosts] = useState<Set<number>>(new Set());

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [postsRes, statsRes] = await Promise.all([
                postsAPI.list(),
                leaderboardAPI.getStats(),
            ]);
            const apiPosts = postsRes.data;
            setPosts(apiPosts.length > 0 ? apiPosts : MOCK_POSTS);
            setStats(statsRes.data);

            // Track initially liked posts
            const liked = new Set<number>();
            apiPosts.forEach((p: Post) => { if (p.is_liked) liked.add(p.id); });
            setLikedPosts(liked);
        } catch (error) {
            console.error('Failed to load data:', error);
            setPosts(MOCK_POSTS);
        } finally {
            setLoading(false);
        }
    };

    const handleLike = async (postId: number) => {
        // Optimistic toggle
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
        } catch (error) {
            // Revert on failure
            setLikedPosts(likedPosts);
        }
    };

    const handleSave = (postId: number) => {
        const newSaved = new Set(savedPosts);
        if (newSaved.has(postId)) {
            newSaved.delete(postId);
        } else {
            newSaved.add(postId);
        }
        setSavedPosts(newSaved);
    };

    const handleDoubleClick = (postId: number) => {
        if (!likedPosts.has(postId)) {
            handleLike(postId);
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
            {/* Stories Row */}
            <div className="stories-row">
                <div className="stories-scroll">
                    {MOCK_STORIES.map(story => (
                        <button key={story.id} className="story-item">
                            <div className={`story-ring ${story.isOwn ? 'own' : ''}`}>
                                <div className="story-avatar" style={story.color ? { background: story.color } : {}}>
                                    <span>{story.emoji}</span>
                                </div>
                            </div>
                            <span className="story-name">
                                {story.isOwn ? 'Your Story' : story.name.length > 9 ? story.name.slice(0, 8) + '…' : story.name}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Feed */}
            <div className="feed">
                {posts.map(post => {
                    const displayName = post.user?.display_name || post.user?.username || 'Anonymous';
                    const initial = displayName[0].toUpperCase();
                    const isLiked = likedPosts.has(post.id);
                    const isSaved = savedPosts.has(post.id);

                    return (
                        <article key={post.id} className="post">
                            {/* Post Header */}
                            <div className="post-header">
                                <div className="post-user-info">
                                    <div className="post-avatar">
                                        {post.user?.avatar_url ? (
                                            <img src={post.user.avatar_url} alt="" />
                                        ) : (
                                            <span>{initial}</span>
                                        )}
                                    </div>
                                    <div className="post-user-text">
                                        <span className="post-username">
                                            {post.user?.username || 'anonymous'}
                                            {post.is_verified && <CheckCircle size={13} className="verified-icon" />}
                                        </span>
                                    </div>
                                </div>
                                <button className="post-more-btn">
                                    <MoreHorizontal size={20} />
                                </button>
                            </div>

                            {/* Post Image (placeholder if no media) */}
                            <div
                                className="post-image-area"
                                onDoubleClick={() => handleDoubleClick(post.id)}
                            >
                                {post.media_urls?.length > 0 ? (
                                    <img src={post.media_urls[0]} alt="Post" className="post-image" />
                                ) : (
                                    <div className="post-image-placeholder">
                                        <span className="placeholder-emoji">🌳</span>
                                        <span className="placeholder-text">{post.content.slice(0, 60)}</span>
                                    </div>
                                )}
                            </div>

                            {/* Action Bar */}
                            <div className="post-actions-bar">
                                <div className="post-actions-left">
                                    <button
                                        className={`post-action-btn ${isLiked ? 'liked' : ''}`}
                                        onClick={() => handleLike(post.id)}
                                    >
                                        <Heart
                                            size={24}
                                            fill={isLiked ? '#ed4956' : 'none'}
                                            stroke={isLiked ? '#ed4956' : 'currentColor'}
                                        />
                                    </button>
                                    <button className="post-action-btn">
                                        <MessageCircle size={24} />
                                    </button>
                                    <button className="post-action-btn">
                                        <Send size={22} />
                                    </button>
                                </div>
                                <button
                                    className={`post-action-btn ${isSaved ? 'saved' : ''}`}
                                    onClick={() => handleSave(post.id)}
                                >
                                    <Bookmark
                                        size={24}
                                        fill={isSaved ? '#262626' : 'none'}
                                    />
                                </button>
                            </div>

                            {/* Likes count */}
                            <div className="post-likes">
                                {post.likes_count.toLocaleString()} likes
                            </div>

                            {/* Caption */}
                            <div className="post-caption">
                                <span className="caption-username">{post.user?.username || 'anonymous'}</span>
                                {' '}{post.content}
                            </div>

                            {/* Comments link */}
                            {post.comments_count > 0 && (
                                <button className="post-view-comments">
                                    View all {post.comments_count} comments
                                </button>
                            )}

                            {/* Timestamp */}
                            <div className="post-timestamp">
                                {timeAgo(post.created_at)}
                            </div>
                        </article>
                    );
                })}
            </div>
        </div>
    );
};
