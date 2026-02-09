import React, { useEffect, useState } from 'react';
import { Trophy, TreeDeciduous, Leaf, Zap } from 'lucide-react';
import { Card } from '../../components/common';
import { leaderboardAPI } from '../../services/api';
import './Leaderboard.css';

interface LeaderboardUser {
    id: number;
    username: string;
    display_name?: string;
    avatar_url?: string;
    count?: number;
    carbon_saved?: number;
    tredits?: number;
}

type Category = 'planters' | 'adopters' | 'carbon' | 'tredits';

export const LeaderboardPage: React.FC = () => {
    const [category, setCategory] = useState<Category>('planters');
    const [users, setUsers] = useState<LeaderboardUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadLeaderboard();
    }, [category]);

    const loadLeaderboard = async () => {
        setLoading(true);
        try {
            let res;
            switch (category) {
                case 'planters':
                    res = await leaderboardAPI.getTopPlanters(10);
                    break;
                case 'adopters':
                    res = await leaderboardAPI.getTopAdopters(10);
                    break;
                case 'carbon':
                    res = await leaderboardAPI.getTopCarbon(10);
                    break;
                case 'tredits':
                    res = await leaderboardAPI.getTopTredits(10);
                    break;
            }
            setUsers(res.data);
        } catch (error) {
            console.error('Failed to load leaderboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const getCategoryIcon = () => {
        switch (category) {
            case 'planters': return <TreeDeciduous size={16} />;
            case 'adopters': return <Leaf size={16} />;
            case 'carbon': return '🌿';
            case 'tredits': return <Zap size={16} />;
        }
    };

    const getValueLabel = (user: LeaderboardUser) => {
        switch (category) {
            case 'planters':
            case 'adopters':
                return `${user.count || 0} trees`;
            case 'carbon':
                return `${(user.carbon_saved || 0).toFixed(1)} kg`;
            case 'tredits':
                return `${(user.tredits || 0).toFixed(0)} TREDITS`;
        }
    };

    return (
        <div className="leaderboard-page">
            <div className="leaderboard-header">
                <Trophy size={32} className="trophy-icon" />
                <h1>Leaderboard</h1>
            </div>

            {/* Category Tabs */}
            <div className="category-tabs">
                <button
                    className={`cat-tab ${category === 'planters' ? 'active' : ''}`}
                    onClick={() => setCategory('planters')}
                >
                    <TreeDeciduous size={16} /> Planters
                </button>
                <button
                    className={`cat-tab ${category === 'adopters' ? 'active' : ''}`}
                    onClick={() => setCategory('adopters')}
                >
                    <Leaf size={16} /> Adopters
                </button>
                <button
                    className={`cat-tab ${category === 'carbon' ? 'active' : ''}`}
                    onClick={() => setCategory('carbon')}
                >
                    🌿 Carbon
                </button>
                <button
                    className={`cat-tab ${category === 'tredits' ? 'active' : ''}`}
                    onClick={() => setCategory('tredits')}
                >
                    <Zap size={16} /> TREDITS
                </button>
            </div>

            {/* Leaderboard List */}
            {loading ? (
                <div className="loading">
                    <div className="loading-spinner" />
                </div>
            ) : users.length === 0 ? (
                <Card className="empty-leaderboard">
                    <p>No data yet. Be the first!</p>
                </Card>
            ) : (
                <div className="leaderboard-list">
                    {users.map((user, index) => (
                        <Card key={user.id} className={`rank-card rank-${index + 1}`}>
                            <span className="rank-number">
                                {index < 3 ? ['🥇', '🥈', '🥉'][index] : `#${index + 1}`}
                            </span>
                            <div className="rank-avatar">
                                {user.avatar_url ? (
                                    <img src={user.avatar_url} alt="" />
                                ) : (
                                    <span>{(user.display_name || user.username)[0].toUpperCase()}</span>
                                )}
                            </div>
                            <div className="rank-info">
                                <span className="rank-name">{user.display_name || user.username}</span>
                                <span className="rank-username">@{user.username}</span>
                            </div>
                            <div className="rank-value">
                                {getCategoryIcon()}
                                <span>{getValueLabel(user)}</span>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};
