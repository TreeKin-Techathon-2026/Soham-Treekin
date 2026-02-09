import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Camera, Image, TreeDeciduous, X, Loader2 } from 'lucide-react';
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
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [gettingLocation, setGettingLocation] = useState(false);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        species: '',
        description: '',
        event_type: 'none',
        event_data: {} as any,
        geo_lat: 0,
        geo_lng: 0,
        address: '',
    });

    // Get user's location on mount
    useEffect(() => {
        getCurrentLocation();
    }, []);

    const getCurrentLocation = () => {
        setGettingLocation(true);
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setFormData(prev => ({
                        ...prev,
                        geo_lat: position.coords.latitude,
                        geo_lng: position.coords.longitude
                    }));
                    setGettingLocation(false);
                },
                (error) => {
                    console.error('Location error:', error);
                    setGettingLocation(false);
                    // Default to Delhi if location denied
                    setFormData(prev => ({
                        ...prev,
                        geo_lat: 28.6139,
                        geo_lng: 77.2090
                    }));
                }
            );
        } else {
            setGettingLocation(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleEventSelect = (eventId: string) => {
        setFormData({ ...formData, event_type: eventId });
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setSelectedImage(null);
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async () => {
        if (!formData.name) {
            alert('Please enter a tree name');
            return;
        }

        setLoading(true);
        try {
            // Step 1: Create the tree
            const treeResponse = await treesAPI.create({
                ...formData,
                latitude: formData.geo_lat,
                longitude: formData.geo_lng,
            });
            const treeId = treeResponse.data.id;

            // Step 2: Upload image if selected
            if (selectedImage && treeId) {
                await treesAPI.uploadImage(
                    treeId,
                    selectedImage,
                    formData.geo_lat,
                    formData.geo_lng
                );
            }

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
                <div className="step-line" />
                <div className={`step ${step >= 4 ? 'active' : ''}`}>4</div>
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

            {/* Step 3: Photo Upload */}
            {step === 3 && (
                <div className="step-content">
                    <h2>📷 Add a Photo</h2>
                    <p className="step-desc">Take a photo of your tree or upload from gallery</p>

                    <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        capture="environment"
                        onChange={handleImageSelect}
                        style={{ display: 'none' }}
                    />

                    {!imagePreview ? (
                        <div className="photo-options">
                            <Button
                                variant="outline"
                                className="photo-btn"
                                onClick={() => {
                                    if (fileInputRef.current) {
                                        fileInputRef.current.capture = 'environment';
                                        fileInputRef.current.click();
                                    }
                                }}
                            >
                                <Camera size={24} />
                                <span>Take Photo</span>
                            </Button>
                            <Button
                                variant="outline"
                                className="photo-btn"
                                onClick={() => {
                                    if (fileInputRef.current) {
                                        fileInputRef.current.removeAttribute('capture');
                                        fileInputRef.current.click();
                                    }
                                }}
                            >
                                <Image size={24} />
                                <span>Choose from Gallery</span>
                            </Button>
                        </div>
                    ) : (
                        <div className="image-preview-container">
                            <img src={imagePreview} alt="Tree preview" className="image-preview" />
                            <button className="remove-image-btn" onClick={removeImage}>
                                <X size={20} />
                            </button>
                        </div>
                    )}

                    <div className="btn-group">
                        <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                        <Button onClick={() => setStep(4)}>
                            {imagePreview ? 'Continue' : 'Skip Photo'}
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 4: Location & Submit */}
            {step === 4 && (
                <div className="step-content">
                    <h2>📍 Location</h2>

                    <div className="location-info">
                        {gettingLocation ? (
                            <div className="location-loading">
                                <Loader2 size={24} className="spin" />
                                <span>Getting your location...</span>
                            </div>
                        ) : formData.geo_lat !== 0 ? (
                            <div className="location-found">
                                <MapPin size={24} className="location-icon" />
                                <div>
                                    <p className="coords">
                                        {formData.geo_lat.toFixed(6)}, {formData.geo_lng.toFixed(6)}
                                    </p>
                                    <button className="refresh-location" onClick={getCurrentLocation}>
                                        Refresh Location
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="location-not-found">
                                <MapPin size={24} />
                                <p>Location not available</p>
                                <button onClick={getCurrentLocation}>Try Again</button>
                            </div>
                        )}
                    </div>

                    <Input
                        name="address"
                        label="Address (optional)"
                        placeholder="Where is this tree located?"
                        value={formData.address}
                        onChange={handleChange}
                        icon={<MapPin size={18} />}
                    />

                    {/* Summary */}
                    <div className="plant-summary">
                        <h3>Summary</h3>
                        <div className="summary-item">
                            <span>Tree Name:</span>
                            <strong>{formData.name || 'Not set'}</strong>
                        </div>
                        <div className="summary-item">
                            <span>Species:</span>
                            <strong>{formData.species || 'Unknown'}</strong>
                        </div>
                        <div className="summary-item">
                            <span>Event:</span>
                            <strong>{EVENT_TYPES.find(e => e.id === formData.event_type)?.label}</strong>
                        </div>
                        <div className="summary-item">
                            <span>Photo:</span>
                            <strong>{selectedImage ? '✅ Added' : '❌ None'}</strong>
                        </div>
                    </div>

                    <div className="btn-group">
                        <Button variant="outline" onClick={() => setStep(3)}>Back</Button>
                        <Button onClick={handleSubmit} isLoading={loading}>🌳 Plant Tree</Button>
                    </div>
                </div>
            )}
        </div>
    );
};
