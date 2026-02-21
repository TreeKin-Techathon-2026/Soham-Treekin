import React, { useEffect, useState } from 'react';
import { Trophy, TreeDeciduous, Leaf, Zap } from 'lucide-react';
import { Card } from '../../components/common';
import { leaderboardAPI } from '../../services/api';
import './Leaderboard.css';

interface LeaderboardUser {
    user_id: number;
    username: string;
    display_name?: string;
    avatar_url?: string;
    rank: number;
    // Planters fields
    total_trees_planted?: number;
    total_growth_updates?: number;
    // Adopters fields
    total_trees_adopted?: number;
    total_credits_spent?: number;
    adoption_score?: number;
    // Carbon fields
    total_carbon_offset?: number;
    total_trees?: number;
    // Tredits fields
    tredits_balance?: number;
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
                return `${user.total_trees_planted || 0} trees`;
            case 'adopters':
                return `Score: ${user.adoption_score || 0}`;
            case 'carbon':
                return `${(user.total_carbon_offset || 0).toFixed(1)} kg CO₂`;
            case 'tredits':
                return `${(user.tredits_balance || 0).toFixed(0)} TREDITS`;
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
                    {users.map((user) => (
                        <Card key={user.user_id ?? user.username} className={`rank-card rank-${user.rank}`}>
                            <span className="rank-number">
                                {user.rank <= 3 ? ['🥇', '🥈', '🥉'][user.rank - 1] : `#${user.rank}`}
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
