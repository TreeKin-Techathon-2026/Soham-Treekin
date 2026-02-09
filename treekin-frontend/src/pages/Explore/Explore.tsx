import React, { useEffect, useState } from 'react';
import { Search, MapPin, Filter, TreeDeciduous } from 'lucide-react';
import { Card, Button, Input } from '../../components/common';
import { treesAPI } from '../../services/api';
import './Explore.css';

interface Tree {
    id: number;
    name: string;
    species?: string;
    status: string;
    event_type: string;
    main_image_url?: string;
    address?: string;
    estimated_carbon_kg?: number;
}

export const ExplorePage: React.FC = () => {
    const [trees, setTrees] = useState<Tree[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        loadTrees();
    }, [filter]);

    const loadTrees = async () => {
        try {
            const params: any = {};
            if (filter !== 'all') params.status = filter;
            const res = await treesAPI.list(params);
            setTrees(res.data);
        } catch (error) {
            console.error('Failed to load trees:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdopt = async (treeId: number) => {
        try {
            await treesAPI.adopt(treeId);
            loadTrees();
        } catch (error) {
            console.error('Failed to adopt tree:', error);
        }
    };

    const filteredTrees = trees.filter(tree =>
        tree.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tree.species?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="explore-page">
            <h1 className="page-title">🔍 Explore Trees</h1>

            {/* Search */}
            <div className="search-section">
                <Input
                    placeholder="Search trees by name or species..."
                    icon={<Search size={18} />}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Filters */}
            <div className="filter-tabs">
                <button
                    className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                    onClick={() => setFilter('all')}
                >
                    All Trees
                </button>
                <button
                    className={`filter-tab ${filter === 'planted' ? 'active' : ''}`}
                    onClick={() => setFilter('planted')}
                >
                    Available
                </button>
                <button
                    className={`filter-tab ${filter === 'adopted' ? 'active' : ''}`}
                    onClick={() => setFilter('adopted')}
                >
                    Adopted
                </button>
            </div>

            {/* Trees Grid */}
            {loading ? (
                <div className="loading">
                    <div className="loading-spinner" />
                    <p>Loading trees...</p>
                </div>
            ) : filteredTrees.length === 0 ? (
                <Card className="empty-state">
                    <TreeDeciduous size={48} />
                    <p>No trees found</p>
                    <Button onClick={() => window.location.href = '/plant'}>Plant the First Tree</Button>
                </Card>
            ) : (
                <div className="trees-grid">
                    {filteredTrees.map((tree) => (
                        <Card key={tree.id} className="tree-card" hoverable>
                            <div className="tree-image">
                                {tree.main_image_url ? (
                                    <img src={tree.main_image_url} alt={tree.name} />
                                ) : (
                                    <div className="tree-placeholder">🌳</div>
                                )}
                                <span className={`tree-badge status-${tree.status}`}>
                                    {tree.status}
                                </span>
                            </div>
                            <div className="tree-info">
                                <h3 className="tree-name">{tree.name}</h3>
                                {tree.species && <span className="tree-species">{tree.species}</span>}
                                {tree.address && (
                                    <span className="tree-location">
                                        <MapPin size={12} /> {tree.address}
                                    </span>
                                )}
                                <div className="tree-carbon">
                                    <span>🌿 {(tree.estimated_carbon_kg || 0).toFixed(1)} kg CO₂</span>
                                </div>
                            </div>
                            {tree.status === 'planted' && (
                                <Button
                                    size="sm"
                                    className="adopt-btn"
                                    onClick={() => handleAdopt(tree.id)}
                                >
                                    Adopt This Tree
                                </Button>
                            )}
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};
