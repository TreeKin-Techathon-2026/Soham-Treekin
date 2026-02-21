import React, { useState, useEffect } from 'react';
import { usersAPI, carbonAPI } from '../../services/api';
import {
    Heart,
    Leaf,
    Globe,
    TrendingUp,
    Award,
    CheckCircle,
    Clock,
    Camera,
    Users,
    MapPin
} from 'lucide-react';
import './CarbonCredits.css';

interface NGO {
    id: number;
    username: string;
    display_name: string;
    avatar_url: string;
    location?: string;
}

interface Sponsorship {
    id: number;
    ngo_id: number;
    tree_species: string;
    amount_paid: number;
    status: string;
    tree_id?: number;
    created_at: string;
    ngo?: NGO;
}

const CarbonCredits: React.FC = () => {
    const [ngos, setNgos] = useState<NGO[]>([]);
    const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSponsoring, setIsSponsoring] = useState(false);
    const [selectedNGO, setSelectedNGO] = useState<NGO | null>(null);
    const [species, setSpecies] = useState('Banyan');
    const [amount, setAmount] = useState(500);

    const SPECIES_OPTIONS = [
        { name: 'Banyan', price: 1000, co2: '35kg/year' },
        { name: 'Neem', price: 500, co2: '25kg/year' },
        { name: 'Mango', price: 750, co2: '25kg/year' },
        { name: 'Peepal', price: 800, co2: '30kg/year' },
        { name: 'Coconut', price: 400, co2: '20kg/year' },
    ];

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [ngosRes, sponsorshipsRes] = await Promise.all([
                    usersAPI.getNGOs(),
                    carbonAPI.getSponsoredTrees()
                ]);
                setNgos(ngosRes.data);
                setSponsorships(sponsorshipsRes.data);
            } catch (err) {
                console.error('Failed to fetch Carbon Credits data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleSponsor = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedNGO) return;

        setIsSponsoring(true);
        try {
            await carbonAPI.sponsorTree({
                ngo_id: selectedNGO.id,
                tree_species: species,
                amount_paid: amount
            });

            // Refresh sponsorships
            const res = await carbonAPI.getSponsoredTrees();
            setSponsorships(res.data);
            setSelectedNGO(null);
            alert('Congratulations! Your tree sponsorship contract has been created. The NGO will plant it soon.');
        } catch (err: any) {
            alert(err?.response?.data?.detail || 'Failed to create sponsorship');
        } finally {
            setIsSponsoring(false);
        }
    };

    if (loading) {
        return <div className="loading-state">Healing the planet...</div>;
    }

    return (
        <div className="carbon-credits-container">
            {/* Hero Section */}
            <div className="carbon-hero">
                <div className="hero-content">
                    <h1>Carbon Credits Platform</h1>
                    <p>Directly fund verified NGOs to plant trees on your behalf. Turn your contribution into real-world impact.</p>
                    <div className="hero-stats">
                        <div className="h-stat">
                            <span className="h-val">{ngos.length}</span>
                            <span className="h-label">Partner NGOs</span>
                        </div>
                        <div className="h-stat">
                            <span className="h-val">{sponsorships.length}</span>
                            <span className="h-label">Trees Sponsored</span>
                        </div>
                    </div>
                </div>
                <div className="hero-visual">
                    <div className="impact-circle">
                        <Globe size={120} />
                        <div className="floating-badge"><Heart fill="#ef4444" color="#ef4444" /></div>
                    </div>
                </div>
            </div>

            <div className="carbon-grid">
                {/* Left Column: NGOs and Sponsorship */}
                <div className="carbon-main">
                    <section className="ngo-showcase">
                        <div className="section-header">
                            <h2><Users size={24} /> Verified NGOs</h2>
                            <p>Select an organization to start your planting contract</p>
                        </div>

                        <div className="ngo-list">
                            {ngos.length > 0 ? ngos.map(ngo => (
                                <div
                                    key={ngo.id}
                                    className={`ngo-card ${selectedNGO?.id === ngo.id ? 'selected' : ''}`}
                                    onClick={() => setSelectedNGO(ngo)}
                                >
                                    <div className="ngo-card-top">
                                        <img src={ngo.avatar_url || 'https://via.placeholder.com/60'} alt={ngo.display_name} />
                                        <div className="ngo-info">
                                            <h3>{ngo.display_name}</h3>
                                            <span className="ngo-loc"><MapPin size={12} /> {ngo.location || 'Pan India'}</span>
                                        </div>
                                        <Award className="verified-badge" size={20} />
                                    </div>
                                    <button className="select-ngo-btn">
                                        {selectedNGO?.id === ngo.id ? 'Selected' : 'Select NGO'}
                                    </button>
                                </div>
                            )) : (
                                <div className="empty-ngos">No NGOs connected yet. Coming soon!</div>
                            )}
                        </div>
                    </section>

                    {selectedNGO && (
                        <section className="sponsorship-form-section">
                            <div className="form-card">
                                <h3>Planting Contract with {selectedNGO.display_name}</h3>
                                <form onSubmit={handleSponsor}>
                                    <div className="form-group">
                                        <label>Select Tree Species</label>
                                        <div className="species-grid">
                                            {SPECIES_OPTIONS.map(opt => (
                                                <div
                                                    key={opt.name}
                                                    className={`species-opt ${species === opt.name ? 'active' : ''}`}
                                                    onClick={() => {
                                                        setSpecies(opt.name);
                                                        setAmount(opt.price);
                                                    }}
                                                >
                                                    <span className="s-name">{opt.name}</span>
                                                    <span className="s-co2">{opt.co2}</span>
                                                    <span className="s-price">₹{opt.price}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="payment-summary">
                                        <div className="p-row">
                                            <span>Sponsorship Amount</span>
                                            <span>₹{amount}</span>
                                        </div>
                                        <div className="p-row total">
                                            <span>Total Impact Funding</span>
                                            <span>₹{amount}</span>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        className="pay-btn"
                                        disabled={isSponsoring}
                                    >
                                        {isSponsoring ? 'Processing...' : `Fund This Tree (₹${amount})`}
                                    </button>
                                    <p className="form-note">By funding, you enter a contract where the NGO commits to planting and maintaining this tree for 3 years.</p>
                                </form>
                            </div>
                        </section>
                    )}
                </div>

                {/* Right Column: User's Sponsored Impact */}
                <aside className="carbon-sidebar">
                    <div className="impact-card">
                        <h3>Your Sponsored Impact</h3>
                        <div className="sponsorship-list">
                            {sponsorships.length > 0 ? sponsorships.map(s => (
                                <div key={s.id} className="sponsorship-item">
                                    <div className="si-header">
                                        <span className={`status-pill ${s.status}`}>
                                            {s.status === 'pending' && <Clock size={12} />}
                                            {s.status === 'planted' && <Leaf size={12} />}
                                            {s.status === 'verified' && <CheckCircle size={12} />}
                                            {s.status}
                                        </span>
                                        <span className="si-date">{new Date(s.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <div className="si-body">
                                        <h4>{s.tree_species}</h4>
                                        <p>via {s.ngo?.display_name || 'NGO'}</p>
                                    </div>
                                    {s.status === 'pending' ? (
                                        <div className="si-footer waiting">
                                            NGO is preparing for planting...
                                        </div>
                                    ) : (
                                        <button className="view-tree-btn">
                                            <Camera size={14} /> View Growth Updates
                                        </button>
                                    )}
                                </div>
                            )) : (
                                <div className="empty-impact">
                                    <TrendingUp size={40} />
                                    <p>You haven't sponsored any trees yet. Your funded trees and their growth updates will appear here.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="promo-card">
                        <h3>Why Sponsor?</h3>
                        <ul>
                            <li><CheckCircle size={16} /> Verified planting by experts</li>
                            <li><CheckCircle size={16} /> Regular photo & GPS updates</li>
                            <li><CheckCircle size={16} /> Earn Tredits for ESG impact</li>
                            <li><CheckCircle size={16} /> Direct link to rural farmers</li>
                        </ul>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default CarbonCredits;
