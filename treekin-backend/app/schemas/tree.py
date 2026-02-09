from pydantic import BaseModel, field_validator, model_validator
from typing import Optional, List, Any
from datetime import datetime


class TreeBase(BaseModel):
    name: str
    species: Optional[str] = None
    description: Optional[str] = None
    geo_lat: Optional[float] = None
    geo_lng: Optional[float] = None
    address: Optional[str] = None


class TreeCreate(BaseModel):
    name: str
    species: Optional[str] = None
    description: Optional[str] = None
    geo_lat: Optional[float] = None
    geo_lng: Optional[float] = None
    latitude: Optional[float] = None  # Alias for geo_lat (frontend uses this)
    longitude: Optional[float] = None  # Alias for geo_lng (frontend uses this)
    address: Optional[str] = None
    event_type: Optional[str] = "none"
    event_data: Optional[dict] = None
    event_description: Optional[str] = None
    planted_date: Optional[datetime] = None
    height_cm: Optional[float] = None
    
    @model_validator(mode='after')
    def normalize_coordinates(self):
        # Use latitude/longitude if geo_lat/geo_lng not provided
        if self.geo_lat is None and self.latitude is not None:
            self.geo_lat = self.latitude
        if self.geo_lng is None and self.longitude is not None:
            self.geo_lng = self.longitude
        return self


class TreeUpdate(BaseModel):
    name: Optional[str] = None
    species: Optional[str] = None
    description: Optional[str] = None
    geo_lat: Optional[float] = None
    geo_lng: Optional[float] = None
    address: Optional[str] = None
    height_cm: Optional[float] = None
    health_status: Optional[str] = None
    main_image_url: Optional[str] = None


class TreeResponse(TreeBase):
    id: int
    owner_id: int
    adopter_id: Optional[int] = None
    sponsor_id: Optional[int] = None
    status: str
    health_status: str
    event_type: str
    event_data: Optional[dict] = None
    height_cm: Optional[float] = None
    age_months: Optional[int] = None
    planted_date: Optional[datetime] = None
    carbon_credits: float = 0.0
    total_tredits_earned: float = 0.0
    main_image_url: Optional[str] = None
    images: List[str] = []
    created_at: datetime

    class Config:
        from_attributes = True


class TreeAdoptRequest(BaseModel):
    tree_id: int


class TreeSponsorRequest(BaseModel):
    tree_id: int
    sponsorship_amount: Optional[float] = None


class TreeEventCreate(BaseModel):
    tree_id: int
    event_name: str
    event_description: Optional[str] = None
    event_date: Optional[datetime] = None
    event_data: Optional[dict] = None


class TreeEventResponse(BaseModel):
    id: int
    tree_id: int
    event_name: str
    event_description: Optional[str] = None
    event_date: Optional[datetime] = None
    event_data: Optional[dict] = None
    created_at: datetime

    class Config:
        from_attributes = True
