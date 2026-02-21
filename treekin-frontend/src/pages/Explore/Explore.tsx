import React, { useState, useMemo } from 'react';
import {
    Search, MapPin, Calendar, Users, Flame, Sparkles, Compass,
    TreeDeciduous, Droplets, Recycle, Waves, ChevronRight, CheckCircle,
    Clock, Award, TrendingUp
} from 'lucide-react';
import './Explore.css';

// ---- Types ----
interface Campaign {
    id: number;
    title: string;
    description: string;
    image: string;
    location: string;
    date: string;
    participants: number;
    tag: 'Tree' | 'Waste' | 'Water' | 'Recycling';
    trending?: boolean;
    topImpact?: boolean;
    recommended?: boolean;
    nearYou?: boolean;
    startsInDays?: number;
}

// ---- Mock Data ----
const CAMPAIGNS: Campaign[] = [
    {
        id: 1,
        title: '1000 Trees for Pune',
        description: 'Join us in transforming Pune\'s urban landscape by planting 1000 native trees across parks and schools.',
        image: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=600&q=80',
        location: 'Pune, MH',
        date: '2026-03-15',
        participants: 342,
        tag: 'Tree',
        trending: true,
        topImpact: true,
        recommended: true,
        startsInDays: 21,
    },
    {
        id: 2,
        title: 'River Mula Cleanup Drive',
        description: 'Help clean 5km of the Mula river bank. Equipment and refreshments provided.',
        image: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=600&q=80',
        location: 'Aundh, Pune',
        date: '2026-03-08',
        participants: 189,
        tag: 'Water',
        trending: true,
        nearYou: true,
        startsInDays: 14,
    },
    {
        id: 3,
        title: 'Zero Waste Workshop',
        description: 'Learn practical zero-waste living techniques from sustainability experts.',
        image: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=600&q=80',
        location: 'Koregaon Park, Pune',
        date: '2026-03-01',
        participants: 67,
        tag: 'Waste',
        recommended: true,
        nearYou: true,
        startsInDays: 7,
    },
    {
        id: 4,
        title: 'E-Waste Collection Drive',
        description: 'Drop off your old electronics for responsible recycling. Free data wiping included.',
        image: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=600&q=80',
        location: 'Hinjewadi, Pune',
        date: '2026-03-20',
        participants: 234,
        tag: 'Recycling',
        trending: true,
        recommended: true,
        startsInDays: 26,
    },
    {
        id: 5,
        title: 'Mangrove Restoration',
        description: 'Plant mangroves along the coast to protect against erosion and support biodiversity.',
        image: 'https://images.unsplash.com/photo-1569163139394-de4e5f43999d?auto=format&fit=crop&w=600&q=80',
        location: 'Mumbai, MH',
        date: '2026-04-05',
        participants: 456,
        tag: 'Tree',
        trending: true,
        topImpact: true,
        startsInDays: 42,
    },
    {
        id: 6,
        title: 'Lake Rejuvenation Project',
        description: 'Community-led initiative to restore Pashan Lake ecosystem and biodiversity.',
        image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=600&q=80',
        location: 'Pashan, Pune',
        date: '2026-03-22',
        participants: 112,
        tag: 'Water',
        nearYou: true,
        recommended: true,
        startsInDays: 28,
    },
    {
        id: 7,
        title: 'Campus Green Challenge',
        description: 'Inter-college sustainability challenge — compete to plant the most trees on campus.',
        image: 'https://images.unsplash.com/photo-1497250681960-ef046c08a56e?auto=format&fit=crop&w=600&q=80',
        location: 'Pune University',
        date: '2026-03-10',
        participants: 789,
        tag: 'Tree',
        trending: true,
        recommended: true,
        topImpact: true,
        startsInDays: 16,
    },
    {
        id: 8,
        title: 'Plastic-Free Market Day',
        description: 'Shop from 40+ vendors committed to zero-plastic packaging. Bring your own bags!',
        image: 'https://images.unsplash.com/photo-1604187351574-c75ca79f5807?auto=format&fit=crop&w=600&q=80',
        location: 'FC Road, Pune',
        date: '2026-03-05',
        participants: 156,
        tag: 'Recycling',
        nearYou: true,
        startsInDays: 11,
    },
    {
        id: 9,
        title: 'Rainwater Harvesting Workshop',
        description: 'Hands-on workshop to install rainwater harvesting systems in residential buildings.',
        image: 'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?auto=format&fit=crop&w=600&q=80',
        location: 'Kothrud, Pune',
        date: '2026-03-18',
        participants: 43,
        tag: 'Water',
        recommended: true,
        startsInDays: 24,
    },
    {
        id: 10,
        title: 'Urban Forest Initiative',
        description: 'Create a Miyawaki forest in just 200 sqft. Learn the technique and plant 300 trees.',
        image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=600&q=80',
        location: 'Baner, Pune',
        date: '2026-04-01',
        participants: 98,
        tag: 'Tree',
        nearYou: true,
        startsInDays: 38,
    },
];

const TAG_CONFIG = {
    Tree: { color: '#16a34a', bg: '#dcfce7', icon: TreeDeciduous },
    Waste: { color: '#2563eb', bg: '#dbeafe', icon: Recycle },
    Water: { color: '#0891b2', bg: '#cffafe', icon: Waves },
    Recycling: { color: '#7c3aed', bg: '#ede9fe', icon: Recycle },
};

// ---- Helper Components ----
const TagPill: React.FC<{ tag: Campaign['tag'] }> = ({ tag }) => {
    const conf = TAG_CONFIG[tag];
    const Icon = conf.icon;
    return (
        <span className="tag-pill" style={{ background: conf.bg, color: conf.color }}>
            <Icon size={12} /> {tag}
        </span>
    );
};

const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

// ---- Campaign Card ----
const CampaignCard: React.FC<{
    campaign: Campaign;
    registered: boolean;
    onRegister: (id: number) => void;
    variant?: 'default' | 'trending';
}> = ({ campaign, registered, onRegister, variant = 'default' }) => (
    <div className={`campaign-card ${variant === 'trending' ? 'campaign-card--trending' : ''}`}>
        <div className="campaign-card__image">
            <img src={campaign.image} alt={campaign.title} loading="lazy" />
            <div className="campaign-card__badges">
                {campaign.trending && (
                    <span className="badge badge--trending"><Flame size={11} /> Trending</span>
                )}
                {campaign.topImpact && (
                    <span className="badge badge--impact"><Award size={11} /> Top Impact</span>
                )}
            </div>
            {campaign.startsInDays !== undefined && campaign.startsInDays <= 14 && (
                <span className="campaign-card__countdown">
                    <Clock size={11} /> Starts in {campaign.startsInDays}d
                </span>
            )}
        </div>

        <div className="campaign-card__body">
            <TagPill tag={campaign.tag} />
            <h3 className="campaign-card__title">{campaign.title}</h3>
            <p className="campaign-card__desc">{campaign.description}</p>

            <div className="campaign-card__meta">
                <span><MapPin size={13} /> {campaign.location}</span>
                <span><Calendar size={13} /> {formatDate(campaign.date)}</span>
            </div>

            <div className="campaign-card__footer">
                <span className="campaign-card__participants">
                    <Users size={14} /> {campaign.participants} joined
                </span>
                <button
                    className={`register-btn ${registered ? 'register-btn--done' : ''}`}
                    onClick={(e) => { e.stopPropagation(); onRegister(campaign.id); }}
                >
                    {registered ? <><CheckCircle size={14} /> Registered</> : 'Register'}
                </button>
            </div>
        </div>
    </div>
);

// ---- Section Header ----
const SectionHeader: React.FC<{ icon: React.ReactNode; title: string; subtitle?: string }> = ({ icon, title, subtitle }) => (
    <div className="section-header">
        <div className="section-header__left">
            <span className="section-header__icon">{icon}</span>
            <div>
                <h2 className="section-header__title">{title}</h2>
                {subtitle && <p className="section-header__subtitle">{subtitle}</p>}
            </div>
        </div>
        <button className="section-header__see-all">
            See all <ChevronRight size={16} />
        </button>
    </div>
);

// ---- Main Page ----
export const ExplorePage: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [registeredIds, setRegisteredIds] = useState<Set<number>>(new Set());

    const handleRegister = (id: number) => {
        setRegisteredIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Filter by search
    const filtered = useMemo(() => {
        if (!searchQuery.trim()) return CAMPAIGNS;
        const q = searchQuery.toLowerCase();
        return CAMPAIGNS.filter(
            c => c.title.toLowerCase().includes(q) ||
                c.location.toLowerCase().includes(q) ||
                c.tag.toLowerCase().includes(q)
        );
    }, [searchQuery]);

    const trending = filtered.filter(c => c.trending);
    const recommended = filtered.filter(c => c.recommended);
    const nearYou = filtered.filter(c => c.nearYou);

    return (
        <div className="explore-page">
            {/* ===== Hero Search ===== */}
            <div className="explore-hero">
                <div className="explore-hero__content">
                    <h1 className="explore-hero__title">
                        Discover <span className="text-green">Campaigns</span>
                    </h1>
                    <p className="explore-hero__subtitle">
                        Find environmental initiatives near you and make a real impact
                    </p>
                </div>

                <div className="explore-search-bar">
                    <Search size={20} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search campaigns, locations..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                    <div className="explore-location-badge">
                        <MapPin size={14} /> Pune
                    </div>
                </div>

                {/* Quick Filter Tags */}
                <div className="explore-quick-tags">
                    {(['Tree', 'Water', 'Waste', 'Recycling'] as const).map(tag => {
                        const conf = TAG_CONFIG[tag];
                        const Icon = conf.icon;
                        return (
                            <button
                                key={tag}
                                className="quick-tag"
                                style={{ '--tag-color': conf.color, '--tag-bg': conf.bg } as React.CSSProperties}
                                onClick={() => setSearchQuery(prev => prev === tag ? '' : tag)}
                            >
                                <Icon size={14} /> {tag}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ===== Trending Campaigns ===== */}
            {trending.length > 0 && (
                <section className="explore-section">
                    <SectionHeader
                        icon={<Flame size={20} />}
                        title="Trending Campaigns"
                        subtitle="Most popular this month"
                    />
                    <div className="trending-scroll">
                        {trending.map(c => (
                            <CampaignCard
                                key={c.id}
                                campaign={c}
                                registered={registeredIds.has(c.id)}
                                onRegister={handleRegister}
                                variant="trending"
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* ===== Recommended For You ===== */}
            {recommended.length > 0 && (
                <section className="explore-section">
                    <SectionHeader
                        icon={<Sparkles size={20} />}
                        title="Recommended For You"
                        subtitle="Based on your interests"
                    />
                    <div className="campaign-grid">
                        {recommended.map(c => (
                            <CampaignCard
                                key={c.id}
                                campaign={c}
                                registered={registeredIds.has(c.id)}
                                onRegister={handleRegister}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* ===== Near You ===== */}
            {nearYou.length > 0 && (
                <section className="explore-section">
                    <SectionHeader
                        icon={<Compass size={20} />}
                        title="Near You"
                        subtitle="Campaigns in your area"
                    />
                    <div className="campaign-grid">
                        {nearYou.map(c => (
                            <CampaignCard
                                key={c.id}
                                campaign={c}
                                registered={registeredIds.has(c.id)}
                                onRegister={handleRegister}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* ===== All Campaigns ===== */}
            <section className="explore-section">
                <SectionHeader
                    icon={<TrendingUp size={20} />}
                    title="All Campaigns"
                    subtitle={`${filtered.length} campaigns available`}
                />
                <div className="campaign-grid campaign-grid--full">
                    {filtered.map(c => (
                        <CampaignCard
                            key={c.id}
                            campaign={c}
                            registered={registeredIds.has(c.id)}
                            onRegister={handleRegister}
                        />
                    ))}
                </div>
            </section>
        </div>
    );
};
