import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, OverlayView } from '@react-google-maps/api';
import { treesAPI } from '../../services/api';
import { ArrowLeft, Trees, Loader, MapPin, Leaf, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './GoGreenMap.css';

interface MapTree {
    id: number;
    name: string;
    species: string | null;
    lat: number;
    lng: number;
    owner_name: string;
    status: string;
    health_status: string;
    planted_date: string | null;
    main_image_url: string | null;
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Dark nature-inspired map style (Snapchat-like)
const darkMapStyles: google.maps.MapTypeStyle[] = [
    { elementType: 'geometry', stylers: [{ color: '#0a1f0a' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#0a1f0a' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#6fbf73' }] },
    { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#1a3a1a' }] },
    { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#4a8c4a' }] },
    { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#0d2b0d' }] },
    { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#112811' }] },
    { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#5ea85e' }] },
    { featureType: 'poi.park', elementType: 'geometry.fill', stylers: [{ color: '#143514' }] },
    { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#7cc47c' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#152f15' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1a3a1a' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#1c3d1c' }] },
    { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#254925' }] },
    { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#112811' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#071a07' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3d7a3d' }] },
];

const defaultCenter = { lat: 20.5937, lng: 78.9629 }; // India center

const GoGreenMapPage: React.FC = () => {
    const navigate = useNavigate();
    const [trees, setTrees] = useState<MapTree[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTree, setSelectedTree] = useState<MapTree | null>(null);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [mapCenter, setMapCenter] = useState(defaultCenter);
    const [mapZoom, setMapZoom] = useState(5);
    const mapRef = useRef<google.maps.Map | null>(null);

    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    });

    // Fetch trees for the map
    const fetchTrees = useCallback(async () => {
        try {
            setLoading(true);
            const response = await treesAPI.getMapTrees();
            setTrees(response.data);
        } catch (error) {
            console.error('Failed to fetch map trees:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTrees();
    }, [fetchTrees]);

    // Get user location
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                    setUserLocation(loc);
                    setMapCenter(loc);
                    setMapZoom(12);
                },
                () => {
                    // Use default center if location denied
                    console.log('Location access denied, using default center');
                }
            );
        }
    }, []);

    const onMapLoad = useCallback((map: google.maps.Map) => {
        mapRef.current = map;
    }, []);

    const handleMarkerClick = (tree: MapTree) => {
        setSelectedTree(tree);
        if (mapRef.current) {
            mapRef.current.panTo({ lat: tree.lat, lng: tree.lng });
            mapRef.current.setZoom(15);
        }
    };

    const getHealthColor = (health: string) => {
        switch (health) {
            case 'excellent': return '#22c55e';
            case 'good': return '#4ade80';
            case 'fair': return '#facc15';
            case 'poor': return '#ef4444';
            default: return '#22c55e';
        }
    };

    const getStatusEmoji = (status: string) => {
        switch (status) {
            case 'planted': return '🌱';
            case 'adopted': return '🤝';
            case 'verified': return '✅';
            case 'memorial': return '🕊️';
            default: return '🌳';
        }
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'Unknown';
        try {
            return new Date(dateStr).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric'
            });
        } catch { return 'Unknown'; }
    };

    // Error state
    if (loadError) {
        return (
            <div className="gogreen-map-page">
                <div className="map-error">
                    <MapPin size={48} />
                    <h2>Map couldn't load</h2>
                    <p>Please check your Google Maps API key configuration.</p>
                    <button className="map-back-btn" onClick={() => navigate(-1)}>
                        <ArrowLeft size={20} /> Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="gogreen-map-page">
            {/* Header overlay */}
            <div className="map-header-overlay">
                <button className="map-back-btn" onClick={() => navigate(-1)}>
                    <ArrowLeft size={20} />
                </button>
                <div className="map-title-area">
                    <h1 className="map-title">
                        <Leaf size={22} className="title-leaf" />
                        Go Green Map
                    </h1>
                    <p className="map-subtitle">Every dot is a tree planted 🌍</p>
                </div>
            </div>

            {/* Tree count badge */}
            <div className="tree-count-badge">
                <Trees size={18} />
                <span>{trees.length}</span>
                <small>trees planted</small>
            </div>

            {/* Motivational banner */}
            <div className="gogreen-banner">
                <span className="banner-emoji">🌿</span>
                <span className="banner-text">Plant a tree. Watch the world go green.</span>
            </div>

            {/* Loading overlay */}
            {(loading || !isLoaded) && (
                <div className="map-loading-overlay">
                    <div className="map-loader">
                        <Loader size={36} className="spin" />
                        <p>Loading the green world...</p>
                    </div>
                </div>
            )}

            {/* Google Map */}
            {isLoaded && (
                <GoogleMap
                    mapContainerClassName="gogreen-map-container"
                    center={mapCenter}
                    zoom={mapZoom}
                    onLoad={onMapLoad}
                    onClick={() => setSelectedTree(null)}
                    options={{
                        styles: darkMapStyles,
                        disableDefaultUI: true,
                        zoomControl: true,
                        zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_CENTER },
                        mapTypeControl: false,
                        streetViewControl: false,
                        fullscreenControl: false,
                        gestureHandling: 'greedy',
                        minZoom: 3,
                        maxZoom: 20,
                    }}
                >
                    {/* Tree markers as glowing green dots */}
                    {trees.map((tree) => (
                        <OverlayView
                            key={tree.id}
                            position={{ lat: tree.lat, lng: tree.lng }}
                            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                        >
                            <div
                                className={`tree-dot-marker ${selectedTree?.id === tree.id ? 'selected' : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkerClick(tree);
                                }}
                                style={{ '--dot-color': getHealthColor(tree.health_status) } as React.CSSProperties}
                                title={tree.name}
                            >
                                <div className="dot-core" />
                                <div className="dot-pulse" />
                                <div className="dot-ripple" />
                            </div>
                        </OverlayView>
                    ))}

                    {/* User location marker */}
                    {userLocation && (
                        <OverlayView
                            position={userLocation}
                            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                        >
                            <div className="user-location-marker">
                                <div className="user-dot" />
                                <div className="user-pulse" />
                            </div>
                        </OverlayView>
                    )}
                </GoogleMap>
            )}

            {/* Selected tree info card */}
            {selectedTree && (
                <div className="tree-info-card">
                    <button className="card-close" onClick={() => setSelectedTree(null)}>
                        <X size={18} />
                    </button>
                    <div className="card-header">
                        {selectedTree.main_image_url ? (
                            <img src={selectedTree.main_image_url} alt={selectedTree.name} className="card-tree-img" />
                        ) : (
                            <div className="card-tree-placeholder">
                                <span>🌳</span>
                            </div>
                        )}
                        <div className="card-header-text">
                            <h3>{selectedTree.name}</h3>
                            <p className="card-species">{selectedTree.species || 'Unknown Species'}</p>
                        </div>
                        <span className="card-status-emoji">{getStatusEmoji(selectedTree.status)}</span>
                    </div>
                    <div className="card-details">
                        <div className="card-detail-row">
                            <span className="detail-label">Planted by</span>
                            <span className="detail-value">{selectedTree.owner_name}</span>
                        </div>
                        <div className="card-detail-row">
                            <span className="detail-label">Date</span>
                            <span className="detail-value">{formatDate(selectedTree.planted_date)}</span>
                        </div>
                        <div className="card-detail-row">
                            <span className="detail-label">Health</span>
                            <span className="detail-value health-badge" style={{ color: getHealthColor(selectedTree.health_status) }}>
                                ● {selectedTree.health_status}
                            </span>
                        </div>
                        <div className="card-detail-row">
                            <span className="detail-label">Status</span>
                            <span className="detail-value">{selectedTree.status}</span>
                        </div>
                    </div>
                    <div className="card-coordinates">
                        <MapPin size={14} />
                        <span>{selectedTree.lat.toFixed(4)}, {selectedTree.lng.toFixed(4)}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GoGreenMapPage;
