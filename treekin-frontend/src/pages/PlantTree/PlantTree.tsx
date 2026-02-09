import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, TreeDeciduous, Heart, Gift, Star } from 'lucide-react';
import { Button, Input, Textarea, Card } from '../../components/common';
import { treesAPI } from '../../services/api';
import './PlantTree.css';

const EVENT_TYPES = [
    { id: 'none', label: 'Regular Tree', icon: '🌳', description: 'A simple tree plantation' },
    { id: 'couple', label: 'Couple Tree', icon: '💑', description: 'Plant together with your loved one' },
    { id: 'newborn', label: 'Newborn Tree', icon: '👶', description: 'Celebrate a new life' },
    { id: 'memorial', label: 'Memorial Tree', icon: '🕊️', description: 'In loving memory' },
    { id: 'achievement', label: 'Achievement Tree', icon: '🏆', description: 'Celebrate a milestone' },
    { id: 'custom', label: 'Custom Event', icon: '🎉', description: 'Create your own event' },
];

export const PlantTreePage: React.FC = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        species: '',
        description: '',
        event_type: 'none',
        event_data: {} as any,
        geo_lat: 28.6139,
        geo_lng: 77.2090,
        address: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleEventSelect = (eventId: string) => {
        setFormData({ ...formData, event_type: eventId });
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await treesAPI.create(formData);
            navigate('/');
        } catch (error) {
            console.error('Failed to create tree:', error);
            alert('Failed to plant tree. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="plant-page">
            <div className="plant-header">
                <h1>🌱 Plant a Tree</h1>
                <p>Start your green journey</p>
            </div>

            {/* Progress Steps */}
            <div className="progress-steps">
                <div className={`step ${step >= 1 ? 'active' : ''}`}>1</div>
                <div className="step-line" />
                <div className={`step ${step >= 2 ? 'active' : ''}`}>2</div>
                <div className="step-line" />
                <div className={`step ${step >= 3 ? 'active' : ''}`}>3</div>
            </div>

            {/* Step 1: Event Type */}
            {step === 1 && (
                <div className="step-content">
                    <h2>What's the occasion?</h2>
                    <div className="event-grid">
                        {EVENT_TYPES.map((event) => (
                            <Card
                                key={event.id}
                                className={`event-card ${formData.event_type === event.id ? 'selected' : ''}`}
                                onClick={() => handleEventSelect(event.id)}
                                hoverable
                            >
                                <span className="event-icon">{event.icon}</span>
                                <span className="event-label">{event.label}</span>
                                <span className="event-desc">{event.description}</span>
                            </Card>
                        ))}
                    </div>
                    <Button onClick={() => setStep(2)} className="next-btn">Continue</Button>
                </div>
            )}

            {/* Step 2: Tree Details */}
            {step === 2 && (
                <div className="step-content">
                    <h2>Tree Details</h2>
                    <Input
                        name="name"
                        label="Tree Name"
                        placeholder="Give your tree a name"
                        value={formData.name}
                        onChange={handleChange}
                        icon={<TreeDeciduous size={18} />}
                        required
                    />
                    <Input
                        name="species"
                        label="Species (optional)"
                        placeholder="e.g., Neem, Banyan, Mango"
                        value={formData.species}
                        onChange={handleChange}
                    />
                    <Textarea
                        name="description"
                        label="Description"
                        placeholder="Tell us about this tree..."
                        value={formData.description}
                        onChange={handleChange}
                    />
                    <div className="btn-group">
                        <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                        <Button onClick={() => setStep(3)}>Continue</Button>
                    </div>
                </div>
            )}

            {/* Step 3: Location */}
            {step === 3 && (
                <div className="step-content">
                    <h2>Location</h2>
                    <Input
                        name="address"
                        label="Address"
                        placeholder="Where is this tree located?"
                        value={formData.address}
                        onChange={handleChange}
                        icon={<MapPin size={18} />}
                    />
                    <div className="location-mock">
                        <MapPin size={40} />
                        <p>Map integration coming soon!</p>
                        <small>Default location: New Delhi</small>
                    </div>
                    <div className="btn-group">
                        <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                        <Button onClick={handleSubmit} isLoading={loading}>🌳 Plant Tree</Button>
                    </div>
                </div>
            )}
        </div>
    );
};
